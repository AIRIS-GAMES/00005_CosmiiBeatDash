const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright'),root=path.resolve(__dirname,'..');
const types={'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.mp3':'audio/mpeg','.wav':'audio/wav','.woff2':'font/woff2'};
const server=http.createServer((req,res)=>{let file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(req.url.split('?')[0].endsWith('/'))file=path.join(file,'index.html');if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');require('./serve-file')(req,res,file);});
/* First launch: straight into stage 1 (no home, no story), the first notes are
   guided and forgiven, the second launch opens on home, a new memory is
   announced once at the next launch. */
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch();try{
 const context=await browser.newContext({viewport:{width:844,height:390},serviceWorkers:'block'});await context.route('https://**',r=>r.abort());
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));const base='http://127.0.0.1:'+server.address().port+'/?analytics=off';
 await page.goto(base);await page.waitForFunction(()=>bootDone&&state==='ready'&&stageIdx===0);
 assert(await page.locator('#menu').isHidden());assert(await page.locator('#world-dialog').isHidden());assert(await page.locator('#loginov').isHidden());
 await page.mouse.click(420,200);await page.waitForFunction(()=>state==='play'&&!document.getElementById('play-guide').hidden);
 assert.equal(await page.locator('#play-guide strong').innerText(),'TAP!');
 // nobody taps: the first notes are "おしい！", not a game over
 await page.waitForFunction(()=>{const n=level.filter(o=>!isFreeNote(o));return songPos>n[1].t+0.3;});
 assert.equal(await page.evaluate(()=>state),'play');
 await page.waitForFunction(()=>localStorage.getItem('rdash_guide_tap')==='1',{},{timeout:20000});
 // second launch: home
 await page.reload();await page.waitForFunction(()=>bootDone&&getComputedStyle($('splash')).display==='none');
 assert.equal(await page.evaluate(()=>state),'menu');assert(await page.locator('#menu').isVisible());
 // a memory unlocked earlier is announced at the next launch, once
 await page.evaluate(()=>{setBest(0,100);const p=JSON.parse(localStorage.getItem('cosmii_dash_story_v1')||'{}');p.memories=[1];p.memSeen=[];localStorage.setItem('cosmii_dash_story_v1',JSON.stringify(p));localStorage.setItem('rdash_login_last',dateKey(new Date()));});
 await page.reload();await page.waitForSelector('.memory-notice');await page.click('#memory-later');
 await page.reload();await page.waitForFunction(()=>bootDone);await page.waitForTimeout(2500);assert.equal(await page.locator('.memory-notice').count(),0);
 assert.deepEqual(errors,[]);console.log('First launch into stage 1, guided first notes, home from the second launch, one memory notice PASS');
}finally{await browser.close();server.close();}})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
