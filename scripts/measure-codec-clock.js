/* Diagnostic only. Does the container/codec change how finely a media element
   reports currentTime?

   A real game MP3 and a generated PCM WAV of the same sample rate and duration
   are played at the same time and sampled in the SAME animation frame, so any
   difference in step granularity is attributable to decoding, not to sampling
   phase, scheduling or machine load. Audio content is irrelevant here; only the
   clock is under test.

   An MP3 frame is 1152 samples: 24.00ms at 48kHz, against a 16.67ms display
   frame. If currentTime is reported per decoded frame, that non-integer ratio
   alone produces judder. WAV has no such frame structure. */
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),os=require('node:os');
const {chromium}=require(process.env.TEST_PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..');
const mp3=process.argv[2]||'Asset/audio/stage01.mp3';
const seconds=Number(process.argv[3]||10);

// Same sample rate as the shipped MP3s, so the only variable is the codec.
const SR=48000,CH=2,DUR=30;
function makeWav(){
 const frames=SR*DUR,bytes=Buffer.alloc(44+frames*CH*2);
 bytes.write('RIFF');bytes.writeUInt32LE(bytes.length-8,4);bytes.write('WAVEfmt ',8);
 bytes.writeUInt32LE(16,16);bytes.writeUInt16LE(1,20);bytes.writeUInt16LE(CH,22);
 bytes.writeUInt32LE(SR,24);bytes.writeUInt32LE(SR*CH*2,28);bytes.writeUInt16LE(CH*2,32);
 bytes.writeUInt16LE(16,34);bytes.write('data',36);bytes.writeUInt32LE(frames*CH*2,40);
 for(let i=0;i<frames;i++){
  const v=Math.round(Math.sin(2*Math.PI*220*i/SR)*0.1*32767);
  bytes.writeInt16LE(v,44+i*4);bytes.writeInt16LE(v,44+i*4+2);
 }
 return bytes;
}
const wavBuf=makeWav();

const server=http.createServer((req,res)=>{
 const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 if(name==='/_probe.wav'){res.setHeader('Content-Type','audio/wav');res.setHeader('Accept-Ranges','bytes');res.end(wavBuf);return;}
 if(name==='/'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><title>codec clock</title>');return;}
 const file=path.resolve(root,'.'+name);
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404);res.end();return;}
 res.setHeader('Content-Type','audio/mpeg');res.setHeader('Accept-Ranges','bytes');res.end(fs.readFileSync(file));
});
const pct=(a,p)=>a.length?a.slice().sort((x,y)=>x-y)[Math.min(a.length-1,Math.floor(a.length*p))]:0;
function report(label,steps){
 const n=steps.length,frozen=steps.filter(v=>v===0).length;
 const adv=steps.filter(v=>v>0);
 const uniq=[...new Set(steps.map(v=>v.toFixed(2)))].sort((a,b)=>a-b);
 console.log('  '+label.padEnd(10)+
  'frozen '+String(frozen+'/'+n).padEnd(9)+'('+(100*frozen/n).toFixed(1).padStart(4)+'%)  '+
  'advancing p50='+pct(adv,.5).toFixed(2)+'ms  max='+pct(adv,1).toFixed(2)+'ms  '+
  'distinct steps='+uniq.length);
 const top={};for(const s of steps){const k=s.toFixed(1);top[k]=(top[k]||0)+1;}
 const common=Object.entries(top).sort((a,b)=>b[1]-a[1]).slice(0,5)
  .map(([k,v])=>k+'ms x'+v).join('  ');
 console.log('             most common: '+common);
}
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch();
 try{
  const page=await browser.newPage();
  const base='http://127.0.0.1:'+server.address().port;
  await page.goto(base);
  const r=await page.evaluate(async ([mp3Url,ms])=>{
   const a=new Audio(mp3Url),b=new Audio('/_probe.wav');
   a.muted=true;b.muted=true;a.preload='auto';b.preload='auto';
   await Promise.all([a,b].map(el=>new Promise(res=>{
    if(el.readyState>=3)return res();
    el.addEventListener('canplay',res,{once:true});el.load();
   })));
   await Promise.all([a.play(),b.play()]);
   await new Promise(d=>setTimeout(d,400));   // let both settle
   const mp3=[],wav=[];
   await new Promise(done=>{
    const stop=performance.now()+ms;
    const tick=()=>{
     mp3.push(a.currentTime);wav.push(b.currentTime);
     performance.now()<stop?requestAnimationFrame(tick):done();
    };
    requestAnimationFrame(tick);
   });
   a.pause();b.pause();
   return {mp3,wav};
  },[ '/'+mp3.split(path.sep).join('/'), seconds*1000 ]);
  const step=arr=>{const o=[];for(let i=1;i<arr.length;i++)o.push((arr[i]-arr[i-1])*1000);return o;};
  console.log('Both elements played simultaneously, sampled in the same animation frame.');
  console.log('MP3 frame at 48kHz = 24.00ms; display frame = 16.67ms\n');
  report('MP3',step(r.mp3));
  report('WAV',step(r.wav));
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
