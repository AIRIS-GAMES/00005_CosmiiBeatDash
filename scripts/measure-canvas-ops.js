/* Diagnostic only. Counts the canvas operations that are cheap on a desktop GPU
   and expensive on a mobile one, per rendered frame, during real gameplay with
   fever active.

   ctx.filter and shadowBlur are the two that matter: both can drop canvas2d off
   the fast path on iOS, and neither shows up in desktop frame times. Counting
   them is not the same as proving they cause judder on device - it establishes
   how much work is being asked for. */
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require(process.env.TEST_PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..');
const seconds=Number(process.argv[2]||6);
const server=http.createServer((req,res)=>{
 const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/\/$/,'/index.html'));
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404);res.end();return;}
 res.setHeader('Content-Type',({'.html':'text/html','.js':'application/javascript','.css':'text/css','.wav':'audio/wav','.mp3':'audio/mpeg'})[path.extname(file)]||'application/octet-stream');
 require('./serve-file')(req,res,file);
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch();
 try{
  const context=await browser.newContext({serviceWorkers:'block',viewport:{width:844,height:390},deviceScaleFactor:3,isMobile:true,hasTouch:true});
  await context.route('https://**',r=>r.abort());
  const page=await context.newPage();
  await page.goto('http://127.0.0.1:'+server.address().port);
  await page.waitForFunction(()=>window.gameAudio&&bootDone&&getComputedStyle($('splash')).display==='none');
  await page.evaluate(()=>$('loginov').style.display='none');
  await page.evaluate(()=>selectStage(0));
  await page.waitForFunction(()=>state==='ready'&&musicEl.readyState>=2);
  await page.locator('#cv').click({position:{x:200,y:150}});
  await page.waitForFunction(()=>state==='play');
  const r=await page.evaluate(async ms=>{
   const proto=Object.getPrototypeOf(ctx);
   const n={filter:0,shadowBlur:0,linearGradient:0,radialGradient:0,save:0,drawImage:0,frames:0};
   for(const prop of ['filter','shadowBlur']){
    const d=Object.getOwnPropertyDescriptor(proto,prop);
    if(!d||!d.set)continue;
    Object.defineProperty(ctx,prop,{configurable:true,
     get(){return d.get.call(ctx);},
     set(v){n[prop]++;d.set.call(ctx,v);}});
   }
   const wrap=(name,key)=>{const f=ctx[name].bind(ctx);ctx[name]=(...a)=>{n[key]++;return f(...a);};return f;};
   wrap('createLinearGradient','linearGradient');
   wrap('createRadialGradient','radialGradient');
   wrap('save','save');
   wrap('drawImage','drawImage');
   const realDraw=window.draw;
   const times=[];
   window.draw=function(){const s=performance.now();realDraw.apply(this,arguments);times.push(performance.now()-s);n.frames++;};
   // Fever is where the per-trail ctx.filter path runs.
   activateFever(60);
   await new Promise(d=>setTimeout(d,ms));
   window.draw=realDraw;
   times.sort((a,b)=>a-b);
   return {n,p50:times[Math.floor(times.length*0.5)],p95:times[Math.floor(times.length*0.95)],max:times[times.length-1],
    trail:trail.length,particles:particles.length};
  },seconds*1000);
  const f=r.n.frames||1;
  console.log('frames measured: '+f+'   draw() p50='+r.p50.toFixed(2)+'ms p95='+r.p95.toFixed(2)+'ms max='+r.max.toFixed(2)+'ms');
  console.log('per frame, during fever:');
  for(const [k,label] of [['filter','ctx.filter assignments'],['shadowBlur','ctx.shadowBlur assignments'],
   ['linearGradient','createLinearGradient'],['radialGradient','createRadialGradient'],
   ['save','ctx.save'],['drawImage','drawImage']]){
   const per=r.n[k]/f;
   console.log('  '+label.padEnd(28)+per.toFixed(1).padStart(7)+' /frame   ('+r.n[k]+' total)'+
    (k==='filter'&&per>0?'   <- forces a slow path on mobile canvas2d':'')+
    (k==='shadowBlur'&&per>0?'   <- blur is the most expensive canvas2d op':''));
  }
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
