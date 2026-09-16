/* Diagnostic only. Measures judder as the player sees it: how often the drawn
   song position repeats from one rendered frame to the next.

   Sampling point matters. An independent requestAnimationFrame callback reads
   musicEl.currentTime at a different phase from the game loop, and Chromium
   refreshes currentTime once per frame at a fixed point, so an outside observer
   reports freezes that never reach the screen. This hooks musicPosition()
   instead, which is the single value the loop turns into songPos, so every
   sample is taken exactly where the game uses it.

   Desktop Chromium does not reproduce iOS WebView media behaviour. This
   establishes whether the clock stair-steps at all, not by how much on device. */
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require(process.env.TEST_PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..');
const seconds=Number(process.argv[2]||8);
const server=http.createServer((req,res)=>{
 const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/\/$/,'/index.html'));
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404);res.end();return;}
 res.setHeader('Content-Type',({'.html':'text/html','.js':'application/javascript','.css':'text/css','.wav':'audio/wav','.mp3':'audio/mpeg'})[path.extname(file)]||'application/octet-stream');
 require('./serve-file')(req,res,file);
});
const pct=(a,p)=>a.length?a.slice().sort((x,y)=>x-y)[Math.min(a.length-1,Math.floor(a.length*p))]:0;
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch();
 try{
  const context=await browser.newContext({serviceWorkers:'block'});
  await context.route('https://**',r=>r.abort());
  const page=await context.newPage();
  await page.goto('http://127.0.0.1:'+server.address().port);
  await page.waitForFunction(()=>window.gameAudio&&bootDone&&getComputedStyle($('splash')).display==='none');
  await page.evaluate(()=>$('loginov').style.display='none');
  await page.evaluate(()=>selectStage(0));
  await page.waitForFunction(()=>state==='ready'&&musicEl.readyState>=2);
  await page.locator('#cv').click({position:{x:200,y:150}});
  await page.waitForFunction(()=>state==='play'&&!musicEl.paused);
  await page.waitForTimeout(1200);   // past the lead-in
  const r=await page.evaluate(async ms=>{
   const wall=[],drawn=[],raw=[];
   const real=window.musicPosition;
   window.musicPosition=function(){
    const v=real.apply(this,arguments);
    wall.push(performance.now());drawn.push(v);raw.push(musicEl.currentTime);
    return v;
   };
   await new Promise(d=>setTimeout(d,ms));
   window.musicPosition=real;
   return {wall,drawn,raw};
  },seconds*1000);
  const frame=[],dDrawn=[],dRaw=[];
  for(let i=1;i<r.wall.length;i++){
   frame.push(r.wall[i]-r.wall[i-1]);
   dDrawn.push((r.drawn[i]-r.drawn[i-1])*1000);
   dRaw.push((r.raw[i]-r.raw[i-1])*1000);
  }
  const n=dDrawn.length;
  const frozenDrawn=dDrawn.filter(v=>v===0).length;
  const frozenRaw=dRaw.filter(v=>v===0).length;
  const back=dDrawn.filter(v=>v<0).length;
  const elapsed=(r.wall[r.wall.length-1]-r.wall[0])/1000;
  console.log('frames '+r.wall.length+' over '+elapsed.toFixed(2)+'s  ('+(r.wall.length/elapsed).toFixed(1)+' fps)');
  console.log('  frame interval        p50='+pct(frame,.5).toFixed(2)+'ms  p95='+pct(frame,.95).toFixed(2)+'ms  max='+pct(frame,1).toFixed(2)+'ms');
  console.log('  drawn position step   p50='+pct(dDrawn,.5).toFixed(2)+'ms  p95='+pct(dDrawn,.95).toFixed(2)+'ms');
  console.log('  raw currentTime frozen : '+frozenRaw+'/'+n+' ('+(100*frozenRaw/n).toFixed(1)+'%)');
  console.log('  DRAWN position frozen  : '+frozenDrawn+'/'+n+' ('+(100*frozenDrawn/n).toFixed(1)+'%)   <- the judder the player sees');
  console.log('  DRAWN position backward: '+back+'/'+n+(back?'   <- would scroll backwards':''));
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
