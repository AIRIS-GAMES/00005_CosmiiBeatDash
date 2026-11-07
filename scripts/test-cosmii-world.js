const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);let file=path.resolve(root,'.'+pathname);if(pathname.endsWith('/'))file=path.join(file,'index.html');if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',({'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.mp3':'audio/mpeg'})[path.extname(file)]||'application/octet-stream');require('./serve-file')(req,res,file);});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch();
 try{
 const context=await browser.newContext({viewport:{width:960,height:480},serviceWorkers:'block'});await context.route('https://**',r=>r.abort());await context.addInitScript(()=>{if(!localStorage.getItem('cosmii_dash_story_v1'))localStorage.setItem('cosmii_dash_story_v1',JSON.stringify({opening:true}));});const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const url='http://127.0.0.1:'+server.address().port;
 await page.addInitScript(()=>localStorage.setItem('cosmii_tutorial_v1','done'));await page.goto(url);await page.waitForFunction(()=>window.cosmiiWorld&&bootDone&&getComputedStyle($('splash')).display==='none');await page.evaluate(()=>$('loginov').style.display='none');
 await page.waitForFunction(()=>document.querySelector('#world-backdrop').complete);
 fs.mkdirSync(path.join(root,'test-results'),{recursive:true});
 await page.screenshot({path:path.join(root,'test-results/world-home.png')});
 await page.click('#continue-btn');await page.waitForSelector('#world-dialog:not([hidden])');await page.screenshot({path:path.join(root,'test-results/world-intro.png')});
 await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>state),'menu');
 await page.click('#continue-btn');for(let i=0;i<7;i++)await page.click('#opening-next');await page.click('#world-start');await page.waitForFunction(()=>state==='ready');
 assert(await page.evaluate(()=>beats===RHYTHM_BEATS[STAGES[stageIdx].file].beats),'Runtime must use the tracked beat grid');
 const chart=await page.evaluate(()=>({level,coins:coinDefs,zones:flipZones,orbs:orbDefs,speed:SPEED,constants:[V0,GRAV,HOLD_MAX,TAP_OFFSET]}));
 assert.equal(chart.speed,350);assert.equal(chart.constants[2],.18);assert.equal(chart.constants[3],.25);
 await page.screenshot({path:path.join(root,'test-results/world-ready.png')});
 await page.locator('#cv').click({position:{x:200,y:150}});await page.waitForFunction(()=>state==='play'&&!musicEl.paused);await page.waitForTimeout(700);
 await page.keyboard.down('Space');await page.waitForTimeout(160);await page.keyboard.up('Space');await page.screenshot({path:path.join(root,'test-results/world-play.png')});
 // Controlled completion checks reward idempotence and album lifecycle, not beginner success.
 await page.evaluate(()=>{coinRun=5;clearStage();});const balance=await page.evaluate(()=>totalCoins());
 assert.equal(await page.locator('#world-result-album').isVisible(),true);await page.waitForTimeout(600);await page.screenshot({path:path.join(root,'test-results/world-result.png')});
 await page.click('#world-result-album');await page.waitForFunction(()=>document.querySelector('.world-album-body>img').naturalWidth>0);await page.screenshot({path:path.join(root,'test-results/world-album.png')});await page.click('#world-profile');assert.equal(await page.locator('[data-social]').count(),3);await page.click('#world-close');
 await page.evaluate(()=>clearStage());assert.equal(await page.evaluate(()=>totalCoins()),balance);
 await page.evaluate(()=>backToMenu());await page.evaluate(()=>selectStage(0));await page.waitForFunction(()=>state==='ready');assert.equal(await page.locator('#world-dialog').isHidden(),true);
 assert.deepEqual(await page.evaluate(()=>({level,coins:coinDefs,zones:flipZones,orbs:orbDefs,speed:SPEED,constants:[V0,GRAV,HOLD_MAX,TAP_OFFSET]})),chart);
 await page.evaluate(()=>backToMenu());
 for(const size of [{width:568,height:320},{width:390,height:844}]){await page.setViewportSize(size);await page.waitForTimeout(100);await page.screenshot({path:path.join(root,`test-results/world-home-${size.width}.png`)});await page.click('#world-album-open');await page.waitForFunction(()=>document.querySelector('.world-album-body>img').naturalWidth>0);await page.screenshot({path:path.join(root,`test-results/world-album-${size.width}.png`)});await page.click('#world-close');}
 await page.addInitScript(()=>localStorage.setItem('cosmii_tutorial_v1','done'));await page.goto(url+'/www/');await page.waitForFunction(()=>window.cosmiiWorld&&bootDone);await page.evaluate(()=>$('loginov').style.display='none');await page.click('#world-album-open');assert(await page.locator('.world-album-body').innerText().then(t=>t.includes('曲が終わっても')));
 assert.deepEqual(errors,[]);console.log('World: intro/cancel/revisit, unchanged chart, real jump, album persistence, reward idempotence, responsive UI and built assets PASS');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
