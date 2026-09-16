/* Measures each shipped BGM file in headless Chromium and writes its peak and
   playback gain into Asset/audio/tracks.js, so every stage plays at the same
   effective peak. Use this when ffmpeg is unavailable; a full
   generate-audio-assets.js run writes the same fields itself. */
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require(process.env.TEST_PLAYWRIGHT_MODULE||'playwright');
const LEVELS=require('./audio-levels.js');
const root=path.resolve(__dirname,'..');
const tracksFile=path.join(root,'Asset','audio','tracks.js');
const sandbox={};require('node:vm').runInNewContext(fs.readFileSync(tracksFile,'utf8'),sandbox);
const tracks=sandbox.AUDIO_TRACKS;
const server=http.createServer((req,res)=>{
 const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404);res.end();return;}
 if(fs.statSync(file).isDirectory()){res.setHeader('Content-Type','text/html');res.end('<!doctype html><title>m</title>');return;}
 res.setHeader('Content-Type','audio/mpeg');res.end(fs.readFileSync(file));
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch();
 try{
  const page=await browser.newPage();
  await page.goto('http://127.0.0.1:'+server.address().port+'/Asset/audio/');
  for(const [key,track] of Object.entries(tracks)){
   const peak=await page.evaluate(async url=>{
    const bytes=await (await fetch(url)).arrayBuffer();
    const buf=await new OfflineAudioContext(1,1,48000).decodeAudioData(bytes);
    let max=0;
    for(let ch=0;ch<buf.numberOfChannels;ch++){const d=buf.getChannelData(ch);for(let i=0;i<d.length;i++){const v=Math.abs(d[i]);if(v>max)max=v;}}
    return max;
   },'/'+track.playback);
   track.peak=+peak.toFixed(5);
   track.gain=+Math.min(1,LEVELS.BGM_TARGET_PEAK/peak).toFixed(5);
   console.log(key.padEnd(20)+' peak '+track.peak.toFixed(5)+' ('+LEVELS.dbfs(peak).toFixed(2)+' dBFS)  gain '+track.gain.toFixed(5)+'  -> '+LEVELS.dbfs(peak*track.gain).toFixed(2)+' dBFS effective');
  }
 }finally{await browser.close();server.close();}
 fs.writeFileSync(tracksFile,'globalThis.AUDIO_TRACKS = '+JSON.stringify(tracks)+';\n');
 console.log('Updated '+path.relative(root,tracksFile)+' for '+Object.keys(tracks).length+' tracks.');
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
