/* Diagnostic only. Compares the media operations the old and new effect paths
   perform on the frame a coin is collected.

   The reported symptom is judder when the coin effect fires. The shipped
   (old) path does muted -> pause() -> currentTime=0 -> play() on one shared
   element per sound, so a coin taken while the previous one is still sounding
   forces a restart on that frame. The new path holds a pool and aims to call
   play() only.

   Both run the identical firing schedule against the real WAV files, in one
   page, so the comparison is not affected by gameplay differences. Operation
   counts are the transferable result: desktop absorbs a media restart that a
   WebView does not, so frame timings here are a weak signal and are reported
   only for completeness.

   The schedule matches what the level generator actually produces: coin pairs
   0.18s apart and beat coins gated at 0.30s, all wider than the 100ms retrigger
   guard, so both paths sound every request and neither is flattered. */
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require(process.env.TEST_PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..');
const seconds=Number(process.argv[2]||12);
const server=http.createServer((req,res)=>{
 const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 if(name==='/'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><title>sfx path</title>');return;}
 const file=path.resolve(root,'.'+name);
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404);res.end();return;}
 res.setHeader('Content-Type','audio/wav');res.end(fs.readFileSync(file));
});
const pct=(a,p)=>a.length?a.slice().sort((x,y)=>x-y)[Math.min(a.length-1,Math.floor(a.length*p))]:0;
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
 try{
  const page=await browser.newPage();
  page.setDefaultTimeout(0);
  page.on('crash',()=>console.error('PAGE CRASHED'));
  page.on('pageerror',e=>console.error('PAGE ERROR:',e.message));
  page.on('console',m=>{if(m.type()==='error')console.error('console:',m.text().slice(0,200));});
  await page.goto('http://127.0.0.1:'+server.address().port+'/');
  const out=await page.evaluate(async ms=>{
   const NAMES=['death','clear','coin','orb','fever'];
   const GAIN={death:.45,clear:.5,coin:.4,orb:.45,fever:.5};
   const POOL={death:2,clear:2,coin:3,orb:2,fever:2};
   const MAX=3, RETRIG=100;

   // Counts media operations actually issued on the firing frame.
   // currentTime and muted live on HTMLMediaElement.prototype, not on the
   // element's immediate prototype, so walk the chain.
   function desc(obj,prop){
    for(let o=obj;o;o=Object.getPrototypeOf(o)){
     const d=Object.getOwnPropertyDescriptor(o,prop);
     if(d&&d.set)return d;
    }
    throw new Error('no accessor for '+prop);
   }
   function instrument(el,counts){
    const clock=desc(el,'currentTime');
    const muted=desc(el,'muted');
    const pause=el.pause.bind(el), play=el.play.bind(el);
    el.pause=()=>{counts.pause++;return pause();};
    el.play=()=>{counts.play++;return play();};
    Object.defineProperty(el,'currentTime',{configurable:true,
     get:()=>clock.get.call(el),set:v=>{counts.seek++;clock.set.call(el,v);}});
    Object.defineProperty(el,'muted',{configurable:true,
     get:()=>muted.get.call(el),set:v=>{counts.muted++;muted.set.call(el,v);}});
    return el;
   }
   async function warm(els){
    for(const el of els){el.muted=true;try{await el.play();el.pause();el.currentTime=0;}catch(e){}el.muted=false;}
   }

   // ---- old: one element per sound, restart on every hit ----
   const oldCounts={pause:0,seek:0,play:0,muted:0,steals:0};
   const oldFx={};
   for(const n of NAMES){
    const a=new Audio('/Asset/audio/'+n+'.wav');a.preload='auto';a.volume=GAIN[n];
    oldFx[n]={audio:a,at:0};
   }
   await warm(NAMES.map(n=>oldFx[n].audio));
   for(const n of NAMES)instrument(oldFx[n].audio,oldCounts);
   function playOld(name){
    const entry=oldFx[name];
    const playing=Object.values(oldFx).filter(e=>e!==entry&&!e.audio.paused).sort((a,b)=>a.at-b.at);
    while(playing.length>=MAX){const o=playing.shift();oldCounts.steals++;o.audio.pause();}
    entry.at=performance.now();const a=entry.audio;a.muted=false;a.pause();
    try{a.currentTime=0;const r=a.play();if(r&&r.catch)r.catch(()=>{});}catch(e){}
   }

   // ---- new: pooled voices, play() only on the firing frame ----
   const newCounts={pause:0,seek:0,play:0,muted:0,steals:0};
   const newFx={};
   for(const n of NAMES){
    const voices=[];
    for(let i=0;i<POOL[n];i++){
     const a=new Audio('/Asset/audio/'+n+'.wav');a.preload='auto';a.volume=GAIN[n];
     const v={audio:a,busy:false,startedAt:0};
     a.addEventListener('ended',()=>{v.busy=false;try{a.currentTime=0;}catch(e){}});
     voices.push(v);
    }
    newFx[n]={voices,lastStart:-Infinity};
   }
   await warm(NAMES.flatMap(n=>newFx[n].voices.map(v=>v.audio)));
   for(const n of NAMES)for(const v of newFx[n].voices)instrument(v.audio,newCounts);
   function release(v){v.busy=false;v.audio.pause();try{v.audio.currentTime=0;}catch(e){}}
   function playNew(name){
    const entry=newFx[name],now=performance.now();
    if(now-entry.lastStart<RETRIG)return;
    const active=[];
    for(const n of NAMES)for(const v of newFx[n].voices)if(v.busy)active.push(v);
    active.sort((a,b)=>a.startedAt-b.startedAt);
    while(active.length>=MAX){newCounts.steals++;release(active.shift());}
    let v=entry.voices.find(x=>!x.busy);
    if(!v){v=entry.voices.reduce((a,b)=>a.startedAt<=b.startedAt?a:b);newCounts.steals++;release(v);}
    entry.lastStart=now;v.startedAt=now;v.busy=true;
    if(v.audio.muted)v.audio.muted=false;
    try{const r=v.audio.play();if(r&&r.catch)r.catch(()=>{});}catch(e){v.busy=false;}
   }

   // ---- identical schedule for both ----
   // Counts are snapshotted around the synchronous fire() call, so only work
   // done on the firing frame is attributed to it. Rewinding in the 'ended'
   // handler happens between frames and must not be counted here.
   async function run(fire,counts){
    for(const k of Object.keys(counts))counts[k]=0;
    const firing={pause:0,seek:0,play:0,muted:0,steals:0};
    const iv=[],fireIv=[];
    let prev=0,next=performance.now(),gapFlip=0,fires=0;
    await new Promise(done=>{
     const stop=performance.now()+ms;
     const tick=()=>{
      const t=performance.now();
      if(prev){iv.push(t-prev);}
      let firedThisFrame=false;
      while(t>=next){
       const before={...counts};
       fire('coin');fires++;firedThisFrame=true;
       for(const k of Object.keys(firing))firing[k]+=counts[k]-before[k];
       next+= (gapFlip++%3===0)?300:180;   // beat coin, then a pair
      }
      if(firedThisFrame&&prev)fireIv.push(t-prev);
      prev=t;
      t<stop?requestAnimationFrame(tick):done();
     };
     requestAnimationFrame(tick);
    });
    return {iv,fireIv,fires,counts:firing,total:{...counts}};
   }
   const oldRun=await run(playOld,oldCounts);
   await new Promise(r=>setTimeout(r,500));
   const newRun=await run(playNew,newCounts);
   return {oldRun,newRun};
  },seconds*1000);

  const show=(label,r)=>{
   const c=r.counts,f=r.fires||1;
   console.log(label);
   console.log('   coins fired: '+r.fires+'   media ops ON THE FIRING FRAME (off-frame rewinds excluded):');
   console.log('     pause()        '+String(c.pause).padStart(5)+'   ('+(c.pause/f).toFixed(2)+' per coin)');
   console.log('     currentTime=   '+String(c.seek).padStart(5)+'   ('+(c.seek/f).toFixed(2)+' per coin)');
   console.log('     play()         '+String(c.play).padStart(5)+'   ('+(c.play/f).toFixed(2)+' per coin)');
   console.log('     muted=         '+String(c.muted).padStart(5)+'   ('+(c.muted/f).toFixed(2)+' per coin)');
   console.log('     voice steals   '+String(c.steals).padStart(5)+'   ('+(c.steals/f).toFixed(2)+' per coin)');
   console.log('   rewinds done off-frame (ended handler): '+(r.total.seek-c.seek));
   console.log('   frame interval   all p50='+pct(r.iv,.5).toFixed(2)+' p95='+pct(r.iv,.95).toFixed(2)+
     '  on coin frames p50='+pct(r.fireIv,.5).toFixed(2)+' p95='+pct(r.fireIv,.95).toFixed(2)+' max='+pct(r.fireIv,1).toFixed(2)+'ms');
  };
  console.log('Identical coin schedule, real WAV files, same page.\n');
  show('SHIPPED (old, one element per sound)',out.oldRun);
  console.log('');
  show('NEW (pooled voices)',out.newRun);
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
