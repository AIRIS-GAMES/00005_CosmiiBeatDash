const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright'),root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{let file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(req.url.split('?')[0].endsWith('/'))file=path.join(file,'index.html');if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',({'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.mp3':'audio/mpeg'})[path.extname(file)]||'application/octet-stream');require('./serve-file')(req,res,file);});
/* Live practice plays like a stage: obstacles and tap marks on the song's beats,
   three drills that move on by themselves (no "next" button), a hit is never a
   death, and coins / records / missions stay untouched. */
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch();try{
 const page=await browser.newPage({viewport:{width:844,height:390},serviceWorkers:'block'});await page.route('https://**',r=>r.abort());
 await page.addInitScript(()=>{localStorage.setItem('cosmii_dash_story_v1',JSON.stringify({intro:true,opening:true}));});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>bootDone);
 await page.evaluate(()=>{$('loginov').style.display='none';document.querySelector('.wf-root')?.remove();window.dieBeforeTutorial=die;});
 const before=await page.evaluate(()=>({coins:totalCoins(),best:best(0),missions:JSON.stringify(missionProg)}));
 await page.click('#help-open');
 assert.equal(await page.locator('#tutorial-next').count(),0,'no manual next button');
 await page.waitForFunction(()=>cosmiiTutorial.active&&level.length>0&&level[0].type==='spike','spikes on the beat');
 // A hit is never a death: nobody taps, the first spike passes through.
 await page.waitForFunction(()=>songPos>level[0].t+0.4);
 assert.equal(await page.evaluate(()=>state),'play');
 // Autoplay on the real input path: tap at the marks, hold for towers, tap again at orbs.
 const steps=await page.evaluate(()=>new Promise(resolve=>{
   const cv=document.getElementById('cv'),fire=t=>cv.dispatchEvent(new PointerEvent(t,{bubbles:true})),done=new Set(),orbs=new Set(),seen=[];
   const id=setInterval(()=>{
     if(!cosmiiTutorial.active){clearInterval(id);resolve(seen);return;}
     if(!seen.includes(cosmiiTutorial.step))seen.push(cosmiiTutorial.step);
     for(const o of level){if(done.has(o)||o.t<songPos)continue;if(o.t-TAP_OFFSET<=songPos+0.005){done.add(o);fire('pointerdown');setTimeout(()=>fire('pointerup'),o.type==='tower'?320:60);}}
     for(const o of orbsLive){if(orbs.has(o)||o.used)continue;if(!player.grounded&&Math.abs(o.t-songPos)<0.05){orbs.add(o);fire('pointerdown');setTimeout(()=>fire('pointerup'),60);}}
   },4);
 }));
 assert.deepEqual(steps,[0,1,2],'tap, hold and orb drills follow each other by themselves');
 assert.equal(await page.evaluate(()=>state),'menu');
 assert.equal(await page.evaluate(()=>die===window.dieBeforeTutorial),true,'the gameplay collision handler is restored');
 assert.deepEqual(await page.evaluate(()=>({coins:totalCoins(),best:best(0),missions:JSON.stringify(missionProg)})),before);
 // Pause freezes the course; resume and exit.
 await page.click('#help-open');await page.waitForFunction(()=>songPos>0.5);
 await page.keyboard.press('Escape');assert(await page.locator('#tutorial-resume').isVisible());
 const pos=await page.evaluate(()=>songPos);await page.waitForTimeout(200);assert.equal(await page.evaluate(()=>songPos),pos);
 await page.click('#tutorial-resume');await page.click('#tutorial-skip');assert.equal(await page.evaluate(()=>state),'menu');
 await page.screenshot({path:'test-results/live-tutorial.png'});
 assert.deepEqual(errors,[]);console.log('Live practice on the beat, auto-advancing drills, no death, pause, exit and no rewards/record changes PASS');
}finally{await browser.close();server.close();}})().catch(e=>{console.error(e);process.exitCode=1;server.close()});
