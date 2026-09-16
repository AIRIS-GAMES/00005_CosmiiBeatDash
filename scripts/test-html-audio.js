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
  await page.evaluate(()=>{level=[];orbsLive=[];orbsLive=[];flipZones=[];});
  await page.evaluate(()=>{window.dispatchEvent(new Event('blur'));const until=performance.now()+350;while(performance.now()<until){};});
  await page.waitForTimeout(100);
  assert.equal(await page.evaluate(()=>state),'play','Visible frame stalls and focus changes must not pause gameplay');
  assert.equal(await page.evaluate(()=>musicEl.paused),false);
  for(const prefs of [{music:true,sound:false},{music:false,sound:true},{music:true,sound:true}]){
   await page.evaluate(p=>{gameAudio.setSettings(p);sfxOrb();},prefs);
   assert.equal(await page.evaluate(()=>musicEl.muted),!prefs.music);
   assert.deepEqual(await page.evaluate(()=>gameAudio.settings()),prefs);
  }
  const silentCoins=await page.evaluate(async()=>{
   stopEffects();
   const calls=[],restore=Object.values(gameAudio.inspect().sfx).flat().map(a=>{
    const play=a.play.bind(a);a.play=()=>{calls.push(a.src);return play();};
    return ()=>{delete a.play;};
   });
   sfxCoin();sfxCoin();playSfx('coin');
   await new Promise(r=>setTimeout(r,250));
   restore.forEach(fn=>fn());
   return {calls,voices:gameAudio.inspect().sfx.coin.length};
  });
  assert.deepEqual(silentCoins,{calls:[],voices:0},'coin cues must create no voice and issue no playback, including delayed playback');
  // Start one effect immediately, without pause/seek or a deferred replay.
  const checks=await page.evaluate(async()=>{
   const original=musicEl;playTrack(12);const one=original===musicEl;
   stopEffects();
   const voices=gameAudio.inspect().sfx.orb,calls=[];
   // currentTime and muted live on HTMLMediaElement.prototype, not on the
   // element's immediate prototype, so walk the chain for the accessor.
   const desc=(obj,prop)=>{
    for(let o=obj;o;o=Object.getPrototypeOf(o)){
     const d=Object.getOwnPropertyDescriptor(o,prop);
     if(d&&d.set)return d;
    }
    throw new Error('no accessor for '+prop);
   };
   const clock=desc(voices[0],'currentTime'),mute=desc(voices[0],'muted');
   const restore=voices.map(a=>{
    const pause=a.pause.bind(a),play=a.play.bind(a);
    a.pause=()=>{calls.push('pause');pause();};
    a.play=()=>{calls.push('play');return play();};
    Object.defineProperty(a,'currentTime',{configurable:true,
     get:()=>clock.get.call(a),set:v=>{calls.push('seek');clock.set.call(a,v);}});
    Object.defineProperty(a,'muted',{configurable:true,
     get:()=>mute.get.call(a),set:v=>{calls.push('muted');mute.set.call(a,v);}});
    return ()=>{delete a.pause;delete a.play;delete a.currentTime;delete a.muted;};
   });
   sfxOrb();
   const firing=calls.slice();
   await new Promise(r=>setTimeout(r,0));
   const dispatched=calls.slice();
   stopEffects();calls.length=0;
   sfxOrb();stopEffects();calls.length=0;
   await new Promise(r=>setTimeout(r,0));
   const canceled=calls.slice();
   sfxOrb();gameAudio.setSettings({sound:false});calls.length=0;
   await new Promise(r=>setTimeout(r,0));
   const disabled=calls.slice();
   gameAudio.setSettings({sound:true});
   restore.forEach(fn=>fn());
   return {one,firing,dispatched,canceled,disabled,volume:musicEl.volume,gain:AUDIO_TRACKS[STAGES[stageIdx].file].gain,
    pool:voices.length,preload:gameAudio.inspect().sfx.orb.map(a=>a.preload)};
  });
  assert.equal(checks.one,true);
  assert.deepEqual(checks.firing,['play'],'collection starts one voice immediately without pause or seek');
  assert.deepEqual(checks.dispatched,['play'],'the next task must not start another sound');
  assert.deepEqual(checks.canceled,[],'stopping cancels pending sounds');
  assert.deepEqual(checks.disabled,[],'sound OFF cancels pending sounds');
  assert.equal(checks.volume,checks.gain,'BGM element must carry the per-track playback gain');
  assert.ok(checks.gain>0&&checks.gain<1,'per-track gain missing from tracks.js');
  assert.equal(checks.pool,1);assert.deepEqual(checks.preload,['auto']);
  const bounded=await page.evaluate(async()=>{
   stopEffects();
   const ops=[];
   const restore=Object.values(gameAudio.inspect().sfx).flat().map(a=>{
    const play=a.play.bind(a),pause=a.pause.bind(a);
    const clock=Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype,'currentTime');
    a.play=()=>{ops.push('play');return play();};
    a.pause=()=>{ops.push('pause');return pause();};
    Object.defineProperty(a,'currentTime',{configurable:true,
     get:()=>clock.get.call(a),set:v=>{ops.push('seek');clock.set.call(a,v);}});
    return ()=>{delete a.play;delete a.pause;delete a.currentTime;};
   });
   sfxOrb();sfxFever();sfxDeath();sfxClear();
   await new Promise(r=>setTimeout(r,0));
   const concurrent=Object.values(gameAudio.inspect().sfx).flat().filter(a=>!a.paused).length;
   const saturatedOps=ops.slice();
   // Rejected orb/fever/death/clear requests must not play when orb ends.
   await new Promise(r=>setTimeout(r,400));
   const playsAfterEnd=ops.filter(op=>op==='play').length;
   const idleAfterEnd=Object.values(gameAudio.inspect().sfx).flat().every(a=>a.paused);
   restore.forEach(fn=>fn());
   stopEffects();
   await new Promise(r=>setTimeout(r,150));
   sfxOrb();sfxOrb();await new Promise(r=>setTimeout(r,0));
   const first=gameAudio.inspect().sfx.orb.filter(a=>!a.paused).length;
   sfxOrb();await new Promise(r=>setTimeout(r,0));
   const repeat=gameAudio.inspect().sfx.orb.filter(a=>!a.paused).length;
   await new Promise(r=>setTimeout(r,150));
   sfxOrb();await new Promise(r=>setTimeout(r,0));
   const spaced=gameAudio.inspect().sfx.orb.filter(a=>!a.paused).length;
   await new Promise(r=>setTimeout(r,250));
   const ended=gameAudio.inspect().sfx.orb.every(a=>a.paused);
   sfxOrb();await new Promise(r=>setTimeout(r,0));
   const afterEnd=gameAudio.inspect().sfx.orb.filter(a=>!a.paused).length;
   stopEffects();
   // Death/clear explicitly stop existing effects before requesting their cue.
   sfxOrb();stopMusic();sfxDeath();await new Promise(r=>setTimeout(r,0));
   const death=gameAudio.inspect().sfx.death.filter(a=>!a.paused).length;
   const stoppedCoins=gameAudio.inspect().sfx.orb.every(a=>a.paused);
   stopMusic();sfxClear();await new Promise(r=>setTimeout(r,0));
   const clear=gameAudio.inspect().sfx.clear.filter(a=>!a.paused).length;
   stopEffects();playTrack(12);
   return {concurrent,saturatedOps,playsAfterEnd,idleAfterEnd,first,repeat,spaced,ended,afterEnd,death,clear,stoppedCoins};
  });
  assert.equal(bounded.concurrent,1,'four different effects must start only one voice');
  assert.deepEqual(bounded.saturatedOps,['play'],'saturation must not stop, seek, or restart active voices');
  assert.equal(bounded.playsAfterEnd,1,'dropped effects must never replay later');
  assert.equal(bounded.idleAfterEnd,true,'all effects must be idle after the first sound ends');
  assert.equal(bounded.first,1,'first orb must take one voice');
  assert.equal(bounded.repeat,1,'a repeat inside 100ms must be dropped, not given a second voice');
  assert.equal(bounded.spaced,1,'a orb after 150ms must not overlap the 180ms orb tail');
  assert.equal(bounded.ended,true,'orb must finish naturally');
  assert.equal(bounded.afterEnd,1,'a new pickup after the tail must sound again');
  assert.equal(bounded.death,1,'death cue must still sound after an explicit stop');
  assert.equal(bounded.clear,1,'clear cue must still sound after an explicit stop');
  assert.equal(bounded.stoppedCoins,true,'stopped orb requests must not leak into death');
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
  assert.ok(await page.evaluate(()=>Object.values(gameAudio.inspect().sfx).flat().every(a=>a.paused)));
  assert.deepEqual(errors,[]);
  const offlineContext=await browser.newContext();await offlineContext.route('https://**',r=>r.abort());
  const offlinePage=await offlineContext.newPage();await offlinePage.goto(url);
  await offlinePage.evaluate(()=>Promise.race([navigator.serviceWorker.ready,new Promise((_,reject)=>setTimeout(()=>reject(new Error('Worker activation timed out')),15000))]));await offlinePage.reload();
  await offlinePage.waitForFunction(()=>!!navigator.serviceWorker.controller);
  await offlineContext.setOffline(true);
  const partial=await offlinePage.evaluate(async()=>{const r=await fetch('Asset/audio/bgm1.mp3',{headers:{Range:'bytes=100-199'}});return {status:r.status,size:(await r.arrayBuffer()).byteLength,range:r.headers.get('Content-Range')};});
  assert.equal(partial.status,206);assert.equal(partial.size,100);assert.ok(partial.range.startsWith('bytes 100-199/'));
  await offlineContext.close();
  console.log('PASS: HTML BGM/SFX, lead-in, seek, singleton BGM, per-track gain, immediate single SFX, no overlap or delayed replay, retrigger guard, death/clear, three recording settings, pause/resume and persisted OFF.');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
