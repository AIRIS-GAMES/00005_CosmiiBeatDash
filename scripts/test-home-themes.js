const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright'),root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{let file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(req.url.split('?')[0].endsWith('/'))file=path.join(file,'index.html');if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',({'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.mp3':'audio/mpeg'})[path.extname(file)]||'application/octet-stream');require('./serve-file')(req,res,file);});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch();try{
 const context=await browser.newContext({viewport:{width:960,height:480},serviceWorkers:'block'});await context.route('https://**',r=>r.abort());await context.addInitScript(()=>localStorage.setItem('cosmii_dash_story_v1',JSON.stringify({intro:true,opening:true})));
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));const base='http://127.0.0.1:'+server.address().port;
 await page.addInitScript(()=>localStorage.setItem('cosmii_tutorial_v1','done'));await page.goto(base);await page.waitForFunction(()=>bootDone&&window.cosmiiWorld&&document.querySelector('.home-title-art')?.naturalWidth>0);await page.evaluate(()=>$('loginov').style.display='none');
 await page.click('#missions-open');assert(await page.locator('#ui-panel').isVisible());await page.click('#panel-close');
 await page.click('#help-open');assert(await page.locator('#live-tutorial').isVisible());await page.click('#tutorial-skip');
 await page.click('#world-album-open');assert(await page.locator('.world-album').isVisible());await page.click('#world-close');
 await page.click('#world-profiles-open');assert.equal(await page.locator('[data-character]').count(),5);await page.click('#world-close');
 await page.click('#avatar-btn .avatar-swap');assert(await page.locator('#ui-panel').isVisible());await page.click('#panel-close');
 await page.evaluate(()=>{refreshMenu();refreshMenu();});assert.equal(await page.locator('#missions-open .home-menu-icon').count(),1);assert.equal(await page.locator('#dailybtn .home-menu-icon').count(),1);
 fs.mkdirSync(path.join(root,'test-results'),{recursive:true});await page.screenshot({path:path.join(root,'test-results/home-redesign.png')});
 await page.evaluate(()=>selectStage(0));await page.waitForFunction(()=>state==='ready');
 const variants=new Set();
 for(let i=0;i<20;i++){
   const skin=await page.evaluate(i=>{stageIdx=i;songPos=4;flipZones=[];draw();return window.worldSkins.current(true);},i);
   // Stages of another world paint their own scenery: the neon layers stay hidden.
   if(skin){assert(await page.evaluate(()=>document.querySelector('#world-backdrop').hidden),`stage ${i+1} (${skin}) hides the neon backdrop`);variants.add('skin:'+skin);if(i<5)await page.screenshot({path:path.join(root,`test-results/stage-theme-${i+1}.png`)});continue;}
   await page.waitForFunction(()=>{const im=document.querySelector('#world-backdrop');return im.complete&&im.naturalWidth>0&&!im.hidden;});
   const result=await page.evaluate(()=>{
     const im=document.querySelector('#world-backdrop'),t=cosmiiWorld.themeFor(stageIdx);
     return {src:im.src,filter:im.style.filter,floor:parseFloat(im.style.top)/100+parseFloat(im.style.height)/100*t.floor};
   });
   assert(Math.abs(result.floor-5/6)<0.0001,'Generated floor must align within 0.04 game pixels');variants.add(result.src+result.filter);
   if(i<5)await page.screenshot({path:path.join(root,`test-results/stage-theme-${i+1}.png`)});
 }
 const skins=[...variants].filter(v=>v.startsWith('skin:')).length,dash=await page.evaluate(()=>Object.values(stageGimmicks.PLAN).filter(p=>p.world==='dash').length);
 assert.equal(variants.size-skins,dash,'Every Rhythm Dash stage has a distinct theme/palette combination');
 assert.equal(skins,await page.evaluate(()=>new Set(Object.values(stageGimmicks.PLAN).map(p=>p.world).filter(w=>w!=='dash')).size),'Each other world has its own skin');
 await page.waitForFunction(()=>{stageIdx=0;flipZones=[{start:0,end:20}];draw();return !document.querySelector('#world-ceiling').hidden;});assert(await page.locator('#world-ceiling').isVisible());
 // Failed theme requests use the original generated background.
 await context.route('**/theme-sea.jpg',r=>r.abort());await page.evaluate(()=>{stageIdx=1;draw();});await page.waitForFunction(()=>document.querySelector('#world-backdrop').src.endsWith('/rhythm-neon.jpg'));await context.unroute('**/theme-sea.jpg');
 await page.addInitScript(()=>localStorage.setItem('cosmii_tutorial_v1','done'));await page.goto(base+'/www/');await page.waitForFunction(()=>bootDone&&document.querySelector('.home-title-art')?.naturalWidth>0);
 assert.deepEqual(errors,[]);console.log('Home/themes: title, icon actions, character selector, no duplicate icons, distinct Rhythm Dash palettes, a skin per world, floor alignment and fallback PASS');
}finally{await browser.close();server.close();}})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
