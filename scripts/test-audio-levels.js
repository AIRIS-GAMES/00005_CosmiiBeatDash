/* Guards the output-level design. Measures the files that actually ship, then
   checks the runtime gains in html-audio.js against scripts/audio-levels.js.
   Both directions are guarded: too quiet degrades screen-recording quality just
   as surely as too loud clips, and only a test catches the quiet direction. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),http=require('node:http');
const {chromium}=require(process.env.TEST_PLAYWRIGHT_MODULE||'playwright');
const L=require('./audio-levels.js');
const root=path.resolve(__dirname,'..');
const sfxNames=Object.keys(L.SFX_GAIN);

function readWav(file){
 const b=fs.readFileSync(file);
 let off=12,dataOff=0,dataLen=0,fmt=null;
 while(off+8<=b.length){
  const id=b.toString('ascii',off,off+4),size=b.readUInt32LE(off+4);
  if(id==='fmt ')fmt={channels:b.readUInt16LE(off+10),sampleRate:b.readUInt32LE(off+12),bits:b.readUInt16LE(off+22)};
  if(id==='data'){dataOff=off+8;dataLen=size;break;}
  off+=8+size+(size&1);
 }
 assert.ok(fmt&&dataOff,'unreadable WAV: '+file);
 assert.equal(fmt.bits,16,'expected 16-bit PCM: '+file);
 const n=dataLen/2;let peak=0,clipped=0,dc=0;
 for(let i=0;i<n;i++){
  const v=b.readInt16LE(dataOff+i*2)/32768,a=Math.abs(v);
  if(a>peak)peak=a;if(a>=32767/32768)clipped++;dc+=v;
 }
 return {peak,clipped,dc:dc/n,first:b.readInt16LE(dataOff),last:b.readInt16LE(dataOff+(n-1)*2),...fmt};
}

// Runs html-audio.js as written, so the test reads the real runtime constants.
function loadRuntimeAudio(){
 const sandbox={console,performance:{now:()=>0},localStorage:{getItem:()=>null,setItem(){}},
  document:{hidden:false,addEventListener(){}},
  location:{href:'http://127.0.0.1/',search:''},URL,URLSearchParams,
  addEventListener(){},
  Audio:class{constructor(src){this.src=src||'';this.preload='';this.volume=1;this.muted=false;this.paused=true;this.currentTime=0;this.attrs={};}
   addEventListener(){}setAttribute(k,v){this.attrs[k]=v;}play(){this.paused=false;return Promise.resolve();}pause(){this.paused=true;}load(){}}};
 sandbox.window=sandbox;sandbox.globalThis=sandbox;
 vm.runInNewContext(fs.readFileSync(path.join(root,'html-audio.js'),'utf8'),sandbox,{filename:'html-audio.js'});
 return sandbox;
}

// Only code lines count, so the word may still appear in comments that explain
// why the session is left alone.
function nativeAudioSessionLines(){
 const hits=[];
 const walk=dir=>{
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
   const full=path.join(dir,entry.name);
   if(entry.isDirectory()){if(entry.name!=='Pods'&&entry.name!=='public')walk(full);continue;}
   if(!['.swift','.m','.mm','.h'].includes(path.extname(entry.name)))continue;
   fs.readFileSync(full,'utf8').split('\n').forEach((line,i)=>{
    const code=line.split('//')[0];
    if(code.includes('AVAudioSession')||code.includes('mixWithOthers'))hits.push(path.relative(root,full)+':'+(i+1));
   });
  }
 };
 walk(path.join(root,'ios'));
 return hits;
}

(async()=>{
 const runtime=loadRuntimeAudio();
 // Plain copy: objects built inside the vm realm are not deepStrictEqual to host objects.
 const levels=JSON.parse(JSON.stringify(runtime.gameAudio.levels()));
 const voices=runtime.gameAudio.inspect().sfx;

 // 1. Runtime constants must match the shared budget.
 assert.deepEqual(levels.gain,L.SFX_GAIN,'html-audio.js SFX gains drifted from scripts/audio-levels.js');
 assert.deepEqual(levels.pool,L.POOL_SIZE,'html-audio.js pool sizes drifted from scripts/audio-levels.js');
 assert.equal(levels.maxConcurrent,L.MAX_CONCURRENT_SFX);
 assert.equal(levels.retriggerMs,L.RETRIGGER_MS);

 // 2. Pool construction: depth, per-voice gain and staged preload.
 for(const name of sfxNames){
  assert.equal(voices[name].length,L.POOL_SIZE[name],name+' pool depth');
  for(const el of voices[name]){
   assert.equal(el.volume,L.SFX_GAIN[name],name+' voice gain');
   assert.equal(el.preload,L.EAGER_PRELOAD.includes(name)?'auto':'none',name+' preload staging');
  }
 }

 // 3. Effect files: one shared peak, no clipping, no DC, silent edges.
 const filePeaks={};
 for(const name of sfxNames){
  const m=readWav(path.join(root,'Asset','audio',name+'.wav'));
  filePeaks[name]=m.peak;
  assert.equal(m.clipped,0,name+'.wav has clipped samples');
  assert.equal(m.first,0,name+'.wav does not start at zero');
  assert.equal(m.last,0,name+'.wav does not end at zero');
  assert.ok(Math.abs(m.dc)<0.001,name+'.wav DC offset '+m.dc.toFixed(5));
  assert.ok(Math.abs(m.peak-L.SFX_FILE_PEAK)<=L.SFX_FILE_PEAK_TOLERANCE,
   name+'.wav peak '+m.peak.toFixed(4)+' is not the shared '+L.SFX_FILE_PEAK+
   ' (regenerate with: node scripts/generate-audio-assets.js --sfx-only)');
 }

 // 4. Effective SFX peaks stay inside the recording-quality band.
 const effective=sfxNames.map(n=>({name:n,peak:filePeaks[n]*L.SFX_GAIN[n]}));
 const loudest=effective.reduce((a,b)=>a.peak>=b.peak?a:b);
 const quietest=effective.reduce((a,b)=>a.peak<=b.peak?a:b);
 assert.ok(loudest.peak<=L.SFX_PEAK_MAX,'loudest effect '+loudest.name+' is above the -9 dBFS ceiling');
 assert.ok(loudest.peak>=L.SFX_LOUDEST_MIN,'loudest effect '+loudest.name+' is only '+
  L.dbfs(loudest.peak).toFixed(2)+' dBFS; too quiet to survive screen recording');
 assert.ok(quietest.peak>=L.SFX_PEAK_MIN,'quietest effect '+quietest.name+' is below -18 dBFS');

 // 5. BGM: every track measured, gained to one effective peak inside -18..-14 dBFS.
 const sandbox={};
 vm.runInNewContext(fs.readFileSync(path.join(root,'Asset','audio','tracks.js'),'utf8'),sandbox);
 const tracks=sandbox.AUDIO_TRACKS;
 const server=http.createServer((req,res)=>{
  const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404);res.end();return;}
  if(fs.statSync(file).isDirectory()){res.setHeader('Content-Type','text/html');res.end('<!doctype html><title>m</title>');return;}
  res.setHeader('Content-Type','audio/mpeg');res.end(fs.readFileSync(file));
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch();
 let loudestTrack=0;
 try{
  const page=await browser.newPage();
  await page.goto('http://127.0.0.1:'+server.address().port+'/Asset/audio/');
  for(const [key,track] of Object.entries(tracks)){
   assert.equal(typeof track.gain,'number',key+' has no playback gain; run scripts/update-track-gain.js');
   const peak=await page.evaluate(async url=>{
    const bytes=await (await fetch(url)).arrayBuffer();
    const buf=await new OfflineAudioContext(1,1,48000).decodeAudioData(bytes);
    let max=0;
    for(let ch=0;ch<buf.numberOfChannels;ch++){
     const d=buf.getChannelData(ch);
     for(let i=0;i<d.length;i++){const v=Math.abs(d[i]);if(v>max)max=v;}
    }
    return max;
   },'/'+track.playback);
   const eff=peak*track.gain;
   if(eff>loudestTrack)loudestTrack=eff;
   assert.ok(Math.abs(peak-track.peak)<0.005,key+' peak drifted from tracks.js; run scripts/update-track-gain.js');
   assert.ok(eff<=L.BGM_PEAK_MAX,key+' plays at '+L.dbfs(eff).toFixed(2)+' dBFS, above the -14 dBFS ceiling');
   assert.ok(eff>=L.BGM_PEAK_MIN,key+' plays at '+L.dbfs(eff).toFixed(2)+' dBFS, below the -18 dBFS floor');
  }
 }finally{await browser.close();server.close();}

 // 6. Worst case from measured files: BGM plus the concurrency limit of effects.
 const top=effective.map(e=>e.peak).sort((a,b)=>b-a).slice(0,L.MAX_CONCURRENT_SFX);
 const worst=loudestTrack+top.reduce((a,b)=>a+b,0);
 assert.ok(worst<=L.MIX_CEILING,'worst-case sum '+worst.toFixed(4)+' exceeds the '+L.MIX_CEILING+' ceiling');

 // 7. The native audio session is deliberately left to WebKit (AUDIO_MIGRATION.md).
 const nativeHits=nativeAudioSessionLines();
 assert.deepEqual(nativeHits,[],'native code configures an audio session at '+nativeHits.join(', ')+
  '; AUDIO_MIGRATION.md records that WebKit owns it');

 console.log('PASS: audio levels. SFX files at '+L.SFX_FILE_PEAK+' peak, effective '+
  L.dbfs(quietest.peak).toFixed(2)+'..'+L.dbfs(loudest.peak).toFixed(2)+' dBFS; BGM '+
  L.dbfs(loudestTrack).toFixed(2)+' dBFS; worst case '+worst.toFixed(4)+' <= '+L.MIX_CEILING+
  '; no native audio session.');
})().catch(e=>{console.error(e);process.exitCode=1;});
