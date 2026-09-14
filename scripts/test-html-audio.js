const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require(process.env.TEST_PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{
 const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/\/$/,'/index.html'));
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404);res.end();return;}
 res.setHeader('Content-Type',({'.html':'text/html','.js':'application/javascript','.css':'text/css','.wav':'audio/wav','.mp3':'audio/mpeg'})[path.extname(file)]||'application/octet-stream');
 require('./serve-file')(req,res,file);
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch();
 try{
  const context=await browser.newContext({serviceWorkers:'block'});await context.route('https://**',r=>r.abort());
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));const url='http://127.0.0.1:'+server.address().port;
  await page.goto(url);await page.waitForFunction(()=>window.gameAudio&&bootDone&&getComputedStyle($('splash')).display==='none');
  await page.evaluate(()=>$('loginov').style.display='none');
  await page.evaluate(()=>selectStage(0));await page.waitForFunction(()=>state==='ready'&&musicEl.readyState>=2);
  await page.locator('#cv').click({position:{x:200,y:150}});await page.waitForFunction(()=>state==='play'&&!musicEl.paused);
  assert.ok(await page.evaluate(()=>songPos<0),'lead-in remains before first beat');
  await page.evaluate(()=>{level=[];coinsLive=[];orbsLive=[];flipZones=[];});
  await page.evaluate(()=>{window.dispatchEvent(new Event('blur'));const until=performance.now()+350;while(performance.now()<until){};});
  await page.waitForTimeout(100);
  assert.equal(await page.evaluate(()=>state),'play','Visible frame stalls and focus changes must not pause gameplay');
  assert.equal(await page.evaluate(()=>musicEl.paused),false);
  for(const prefs of [{music:true,sound:false},{music:false,sound:true},{music:true,sound:true}]){
   await page.evaluate(p=>{gameAudio.setSettings(p);sfxCoin();},prefs);
   assert.equal(await page.evaluate(()=>musicEl.muted),!prefs.music);
   assert.deepEqual(await page.evaluate(()=>gameAudio.settings()),prefs);
  }
  const checks=await page.evaluate(()=>{
   const original=musicEl;playTrack(12);const one=original===musicEl;
   const a=gameAudio.inspect().sfx.coin,calls=[],pause=a.pause.bind(a),play=a.play.bind(a);
   a.pause=()=>{calls.push('pause');pause();};a.play=()=>{calls.push('play:'+a.currentTime);return play();};
   sfxCoin();a.pause=pause;a.play=play;
   sfxOrb();sfxFever();sfxDeath();sfxClear();
   return {one,calls,volume:musicEl.volume,active:Object.values(gameAudio.inspect().sfx).filter(a=>!a.paused).length};
  });
  assert.equal(checks.one,true);assert.deepEqual(checks.calls,['pause','play:0']);assert.equal(checks.volume,.2);assert.ok(checks.active<=3);
  await page.waitForFunction(()=>!musicEl.seeking&&songPos>=12);assert.ok(await page.evaluate(()=>songPos)<13);
  await page.evaluate(()=>gameSafety.pause());const paused=await page.evaluate(()=>songPos);await page.waitForTimeout(250);
  assert.equal(await page.evaluate(()=>songPos),paused);assert.equal(await page.evaluate(()=>musicEl.paused),true);
  await page.locator('#resume-game').click();await page.waitForFunction(()=>state==='play'&&!musicEl.paused);assert.ok(await page.evaluate(()=>songPos)>=paused-.05);
  await page.evaluate(()=>{gameAudio.setSettings({music:false,sound:false});backToMenu();});await page.reload();await page.waitForFunction(()=>window.gameAudio);
  assert.deepEqual(await page.evaluate(()=>gameAudio.settings()),{music:false,sound:false});
  await page.waitForFunction(()=>bootDone&&getComputedStyle($('splash')).display==='none');
  await page.evaluate(()=>selectStage(0));await page.waitForFunction(()=>state==='ready'&&musicEl.readyState>=2);
  await page.evaluate(()=>{$('loginov').style.display='none';});await page.locator('#cv').click({position:{x:200,y:150}});
  await page.waitForFunction(()=>state==='play');
  await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));
  assert.equal(await page.evaluate(()=>state),'paused');assert.equal(await page.evaluate(()=>musicEl.paused),true);
  assert.ok(await page.evaluate(()=>Object.values(gameAudio.inspect().sfx).every(a=>a.paused)));
  assert.deepEqual(errors,[]);
  const offlineContext=await browser.newContext();await offlineContext.route('https://**',r=>r.abort());
  const offlinePage=await offlineContext.newPage();await offlinePage.goto(url);
  await offlinePage.evaluate(()=>Promise.race([navigator.serviceWorker.ready,new Promise((_,reject)=>setTimeout(()=>reject(new Error('Worker activation timed out')),15000))]));await offlinePage.reload();
  await offlinePage.waitForFunction(()=>!!navigator.serviceWorker.controller);
  await offlineContext.setOffline(true);
  const partial=await offlinePage.evaluate(async()=>{const r=await fetch('Asset/audio/bgm1.mp3',{headers:{Range:'bytes=100-199'}});return {status:r.status,size:(await r.arrayBuffer()).byteLength,range:r.headers.get('Content-Range')};});
  assert.equal(partial.status,206);assert.equal(partial.size,100);assert.ok(partial.range.startsWith('bytes 100-199/'));
  await offlineContext.close();
  console.log('PASS: HTML BGM/SFX, lead-in, seek, singleton BGM, bounded SFX, restart ordering, three recording settings, pause/resume and persisted OFF.');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
