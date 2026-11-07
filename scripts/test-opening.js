const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright'),root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{let file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(req.url.split('?')[0].endsWith('/'))file=path.join(file,'index.html');if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',({'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.mp3':'audio/mpeg'})[path.extname(file)]||'application/octet-stream');require('./serve-file')(req,res,file);});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch();try{
 const context=await browser.newContext({viewport:{width:960,height:480},serviceWorkers:'block'});await context.route('https://**',r=>r.abort());
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));const base='http://127.0.0.1:'+server.address().port;
 await page.addInitScript(()=>localStorage.setItem('cosmii_tutorial_v1','done'));await page.goto(base);await page.waitForSelector('#opening-next');assert.equal(await page.locator('#opening-count').innerText(),'1 / 8');
 assert(await page.locator('#world-back').isDisabled());
 assert.equal(await page.locator('#opening-auto').getAttribute('aria-pressed'),'true');await page.click('#opening-auto');
 fs.mkdirSync(path.join(root,'test-results'),{recursive:true});
 for(let i=0;i<8;i++){
   await page.waitForFunction(()=>{const im=document.querySelector('.opening-image');return im.complete&&im.naturalWidth>0;});
   await page.evaluate(()=>document.querySelector('.opening-image').getAnimations().forEach(a=>a.finish()));
   await page.screenshot({path:path.join(root,`test-results/opening-${i+1}.png`)});
   if(i<7){while(await page.locator('#opening-count').innerText()===`${i+1} / 8`)await page.click('#opening-next');}
 }
 assert(await page.locator('#world-start').isVisible());await page.click('#world-back');assert.equal(await page.locator('#opening-count').innerText(),'7 / 8');
 await page.click('#world-skip');assert(await page.locator('#world-dialog').isHidden());assert(await page.evaluate(()=>JSON.parse(localStorage.getItem('cosmii_dash_story_v1')).opening));
 await page.reload();await page.waitForFunction(()=>bootDone&&window.cosmiiWorld);await page.waitForTimeout(650);assert(await page.locator('#world-dialog').isHidden());
 await page.evaluate(()=>$('loginov').style.display='none');await page.click('#world-album-open');await page.click('#world-replay');
 await page.waitForFunction(()=>document.querySelector('#opening-count').textContent==='2 / 8',{},{timeout:8000});await page.click('#opening-auto');
 const firstLine=await page.locator('#opening-text').innerText();assert(!firstLine.includes('\n'));await page.locator('.opening-scene').click({position:{x:480,y:230}});assert.equal(await page.locator('#opening-count').innerText(),'2 / 8');assert((await page.locator('#opening-text').innerText()).includes('\n'));
 await page.emulateMedia({reducedMotion:'reduce'});await page.keyboard.press('ArrowRight');assert.equal(await page.locator('.opening-image').evaluate(im=>im.getAnimations().length),0);
 await page.setViewportSize({width:568,height:320});await page.screenshot({path:path.join(root,'test-results/opening-small.png')});
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(root,'test-results/opening-portrait.png')});
 await page.keyboard.press('Escape');assert(await page.locator('#world-dialog').isHidden());
 // A missing illustration must not trap the user or start an automatic timer.
 await context.route('**/opening/*.png',r=>r.abort());await page.evaluate(()=>cosmiiWorld.replayOpening());await page.waitForFunction(()=>document.querySelector('#opening-status').textContent.includes('読み込めません'));
 await page.click('#world-skip');await context.unroute('**/opening/*.png');
 await page.setViewportSize({width:960,height:480});await page.evaluate(()=>cosmiiWorld.replayOpening());while(await page.locator('#opening-count').innerText()!=='8 / 8')await page.click('#opening-next');await page.click('#world-start');await page.waitForFunction(()=>state==='ready');assert(await page.locator('#world-dialog').isHidden());
 await page.addInitScript(()=>localStorage.setItem('cosmii_tutorial_v1','done'));await page.goto(base+'/www/');await page.waitForFunction(()=>bootDone&&window.cosmiiWorld);await page.evaluate(()=>cosmiiWorld.replayOpening());await page.waitForFunction(()=>document.querySelector('.opening-image').naturalWidth>0);
 assert.deepEqual(errors,[]);console.log('Opening: first launch, 8 images/cuts, skip/save/replay, auto, reduced motion, small screens, missing image and gameplay/bundle PASS');
}finally{await browser.close();server.close();}})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
