/* Offline measurement only. Decodes shipped audio in headless Chromium and prints levels. */
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require(process.env.TEST_PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..');
const files=process.argv.slice(2);
const server=http.createServer((req,res)=>{
 const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404);res.end();return;}
 if(fs.statSync(file).isDirectory()){res.setHeader("Content-Type","text/html");res.end("<!doctype html><title>m</title>");return;}
 res.setHeader('Content-Type',path.extname(file)==='.wav'?'audio/wav':'audio/mpeg');
 res.end(fs.readFileSync(file));
});
const db=v=>v>0?(20*Math.log10(v)).toFixed(2):'-Infinity';
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch();
 try{
  const page=await browser.newPage();
  await page.goto('http://127.0.0.1:'+server.address().port+'/Asset/audio/');
  for(const rel of files){
   const m=await page.evaluate(async url=>{
    const bytes=await (await fetch(url)).arrayBuffer();
    const buf=await new OfflineAudioContext(1,1,48000).decodeAudioData(bytes);
    let peak=0,sq=0,dc=0,clip=0,step=0,n=0,head=0,tail=0;
    for(let ch=0;ch<buf.numberOfChannels;ch++){
     const d=buf.getChannelData(ch);n=d.length;
     for(let i=0;i<d.length;i++){const v=d[i],a=Math.abs(v);
      if(a>peak)peak=a; sq+=v*v; dc+=v; if(a>=1)clip++;
      if(i)step=Math.max(step,Math.abs(v-d[i-1]));}
     head=Math.max(head,Math.abs(d[0]));tail=Math.max(tail,Math.abs(d[d.length-1]));
    }
    const total=n*buf.numberOfChannels;
    return {sr:buf.sampleRate,ch:buf.numberOfChannels,dur:buf.duration,peak,rms:Math.sqrt(sq/total),dc:dc/total,clip,step,head,tail};
   },"/"+rel.split(String.fromCharCode(92)).join("/"));
   console.log(JSON.stringify({file:rel,sampleRate:m.sr,channels:m.ch,duration:+m.dur.toFixed(3),
    peak:+m.peak.toFixed(5),peakDb:+db(m.peak),rmsDb:+db(m.rms),clippedSamples:m.clip,
    dcOffset:+m.dc.toFixed(6),maxStep:+m.step.toFixed(5),firstSample:+m.head.toFixed(5),lastSample:+m.tail.toFixed(5)}));
  }
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
