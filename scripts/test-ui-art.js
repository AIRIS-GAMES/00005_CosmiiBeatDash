const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright'),root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{let file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(req.url.split('?')[0].endsWith('/'))file=path.join(file,'index.html');if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',({'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.mp3':'audio/mpeg'})[path.extname(file)]||'application/octet-stream');require('./serve-file')(req,res,file);});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch();try{
 const context=await browser.newContext({viewport:{width:960,height:480},serviceWorkers:'block'});await context.route('https://**',r=>r.abort());await context.addInitScript(()=>localStorage.setItem('cosmii_dash_story_v1',JSON.stringify({intro:true,opening:true})));
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));const base='http://127.0.0.1:'+server.address().port;
 await page.addInitScript(()=>localStorage.setItem('cosmii_tutorial_v1','done'));await page.goto(base);await page.waitForFunction(()=>bootDone&&['panel','progress','words','japanese'].every(k=>document.documentElement.classList.contains('art-'+k+'-ready')));await page.evaluate(()=>$('loginov').style.display='none');
 assert.equal(await page.locator('#continue-btn b').getAttribute('data-art-start'),'new');assert((await page.locator('#continue-btn').innerText()).includes('はじめる'));
 const samples=await page.evaluate(()=>{
   const c=document.createElement('canvas');c.width=240;c.height=20;const g=c.getContext('2d');
   const render=p=>{g.clearRect(0,0,240,20);cosmiiUIArt.progress(g,0,0,240,20,p);return [60,180].map(x=>Array.from(g.getImageData(x,10,1,1).data));};
   const before={score,coinRun,state},result={empty:render(0),half:render(.5),full:render(1),negative:render(-1),overflow:render(2)};
   return {...result,unchanged:JSON.stringify(before)===JSON.stringify({score,coinRun,state})};
 });
 assert.deepEqual(samples.empty,samples.negative);assert.deepEqual(samples.full,samples.overflow);assert(samples.unchanged);
 assert(samples.half[0][1]>samples.empty[0][1]+80);assert.deepEqual(samples.half[1],samples.empty[1]);assert(samples.full[1][1]>samples.empty[1][1]+80);
 fs.mkdirSync(path.join(root,'test-results'),{recursive:true});await page.screenshot({path:path.join(root,'test-results/ui-art-home.png')});
 await page.click('#more-open');await page.screenshot({path:path.join(root,'test-results/ui-art-settings.png')});await page.click('#panel-close');
 await page.click('#continue-btn');await page.waitForFunction(()=>state==='ready');await page.screenshot({path:path.join(root,'test-results/ui-art-ready.png')});
 await page.evaluate(()=>{state='play';clearStage();});assert.equal(await page.locator('#cleartitle').getAttribute('data-art-clear'),'true');await page.screenshot({path:path.join(root,'test-results/ui-art-clear.png')});
 await page.setViewportSize({width:568,height:320});await page.screenshot({path:path.join(root,'test-results/ui-art-clear-small.png')});
 await context.route('**/ui-*.png',r=>r.abort());await page.reload();await page.waitForFunction(()=>bootDone&&window.cosmiiUIArt);await page.evaluate(()=>$('loginov').style.display='none');
 assert.equal(await page.locator('html').evaluate(el=>el.classList.contains('art-japanese-ready')),false);
 assert.notEqual(await page.locator('#continue-btn b').evaluate(el=>getComputedStyle(el).fontSize),'0px');
 await page.evaluate(()=>selectStage(0));await page.waitForFunction(()=>state==='ready');assert.deepEqual(errors,[]);
 console.log('UI art: readable labels, 0/50/100% gauge pixels, clamping, unchanged values, panels/clear and missing-image fallback PASS');
}finally{await browser.close();server.close();}})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
