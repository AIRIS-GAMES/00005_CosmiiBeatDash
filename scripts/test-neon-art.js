const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright'),root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);let file=path.resolve(root,'.'+pathname);if(pathname.endsWith('/'))file=path.join(file,'index.html');if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',({'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.mp3':'audio/mpeg'})[path.extname(file)]||'application/octet-stream');require('./serve-file')(req,res,file);});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch();try{
 const context=await browser.newContext({viewport:{width:960,height:480},serviceWorkers:'block'});await context.route('https://**',r=>r.abort());await context.addInitScript(()=>localStorage.setItem('cosmii_dash_story_v1','{"intro":true,"opening":true}'));
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));const base='http://127.0.0.1:'+server.address().port;
 await page.addInitScript(()=>localStorage.setItem('cosmii_tutorial_v1','done'));await page.goto(base);await page.waitForFunction(()=>window.cosmiiWorld&&bootDone);await page.evaluate(()=>$('loginov').style.display='none');await page.waitForTimeout(450);
 fs.mkdirSync(path.join(root,'test-results'),{recursive:true});await page.screenshot({path:path.join(root,'test-results/neon-home.png')});
 await page.evaluate(()=>selectStage(0));await page.waitForFunction(()=>state==='ready');
 await page.waitForFunction(()=>{const fake={save(){},restore(){},translate(){},scale(){},drawImage(){}};return cosmiiWorld.drawObstacle(fake,'spike',{x:0,y:0,w:36,h:36})&&cosmiiWorld.drawObstacle(fake,'block',{x:0,y:0,w:36,h:36});});
 const mapping=await page.evaluate(()=>{const calls=[];const c={save(){},restore(){},translate(...v){calls.push(['translate',...v]);},scale(...v){calls.push(['scale',...v]);},drawImage(im,...v){calls.push(['image',...v]);}};const shape={x:12,y:34,w:72,h:36,f:true};cosmiiWorld.drawObstacle(c,'block',shape);return {calls,shape};});
 assert.deepEqual(mapping.shape,{x:12,y:34,w:72,h:36,f:true});assert.deepEqual(mapping.calls,[['translate',12,70],['scale',1,-1],['image',3,8,121,117,0,0,72,36]]);
 // Fixed visual fixture only: test all hazard widths and gravity directions without modifying the live physics rules.
 await page.evaluate(()=>{songPos=4;level=[{t:4.3,type:'spike'},{t:4.6,type:'spike2'},{t:4.95,type:'block'},{t:5.15,type:'block2'}];coinsLive=[];orbsLive=[];draw();});
 await page.screenshot({path:path.join(root,'test-results/neon-obstacles.png')});
 const scrolling=await page.evaluate(()=>{
   const sample=()=>{cosmiiWorld.background();return document.getElementById('world-backdrop').parentElement.style.transform;};
   songPos=2;const first=sample();songPos=3;const second=sample();
   state='paused';const paused=sample(),pausedAgain=sample();
   songPos=2;const retry=sample();state='ready';
   return {first,second,paused,pausedAgain,retry};
 });
 assert.notEqual(scrolling.first,scrolling.second,'Scenery advances with the song');
 assert.equal(scrolling.paused,scrolling.pausedAgain,'Paused scenery remains still');
 assert.equal(scrolling.first,scrolling.retry,'Retry restores the matching scenery position');
 const boundaries=await page.evaluate(()=>{
   const saved=beats;
   const check=t=>{songPos=t;cosmiiWorld.background();return ['start','finish'].map(n=>!document.getElementById('world-gate-'+n).hidden);};
   const start=check(0),middle=check(duration/2),finish=check(duration);
   const speed=dt=>{beats=Array.from({length:30},(_,i)=>({t:i*dt,s:1}));songPos=.1;cosmiiWorld.background();return Math.abs(parseFloat(document.getElementById('world-backdrop').parentElement.style.transform.match(/translateX\(([-.0-9]+)/)[1]));};
   const slow=speed(.6),fast=speed(.4);beats=saved;songPos=4;cosmiiWorld.background();
   return {start,middle,finish,slow,fast};
 });
 assert.deepEqual(boundaries.start,[true,false]);assert.deepEqual(boundaries.middle,[false,false]);assert.deepEqual(boundaries.finish,[false,true]);
 assert(boundaries.fast>boundaries.slow,'Faster detected tempo must scroll faster');


 await page.evaluate(()=>{stageIdx=8;flipZones=[{start:3,end:9}];draw();});assert.equal(await page.locator('#world-ceiling').isVisible(),true);await page.screenshot({path:path.join(root,'test-results/neon-ceiling.png')});
 await page.evaluate(()=>{flipZones=[];draw();});assert.equal(await page.locator('#world-ceiling').isHidden(),true);
 for(const file of ['neon-spike.png','neon-block.png']){
  const pixels=await page.evaluate(async file=>{const im=new Image();im.src='Asset/world/'+file;await im.decode();const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const g=c.getContext('2d');g.drawImage(im,0,0);const d=g.getImageData(0,0,c.width,c.height).data;let opaque=0,transparent=0,magenta=0;for(let i=0;i<d.length;i+=4){if(d[i+3]===0)transparent++;if(d[i+3]>128){opaque++;if(d[i]>220&&d[i+1]<30&&d[i+2]>220)magenta++;}}return {opaque,transparent,magenta};},file);
  assert(pixels.opaque>1000);assert(pixels.transparent>500);assert.equal(pixels.magenta,0);
 }
 await page.addInitScript(()=>localStorage.setItem('cosmii_tutorial_v1','done'));await page.goto(base+'/www/');await page.waitForFunction(()=>window.cosmiiWorld&&bootDone);assert((await page.locator('#world-backdrop').getAttribute('src')).includes('rhythm-neon'));assert.deepEqual(errors,[]);
 console.log('Neon art: transparent sprite QC, exact destination sizes, flipped hazards, all-stage background and ceiling, built assets PASS');
}finally{await browser.close();server.close();}})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
