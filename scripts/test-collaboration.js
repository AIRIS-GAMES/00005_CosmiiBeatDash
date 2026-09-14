// TEST_PLAYWRIGHT_MODULE may point to an existing Playwright installation.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const os = require('node:os');
const { chromium } = require(process.env.TEST_PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(__dirname, '..');
const server = http.createServer((req,res) => {
  const pathname = decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const file = path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return;}
  const types={'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.mp3':'audio/mpeg'};
  res.setHeader('Content-Type',types[path.extname(file).toLowerCase()]||'application/octet-stream');require('./serve-file')(req,res,file);
});
(async()=>{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:844,height:390},serviceWorkers:'block'});
  await context.route('https://**',r=>r.abort());
  const page=await context.newPage(), errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const config=fs.readFileSync(path.join(root,'collaboration-config.js'),'utf8');
  await page.route('**/collaboration-config.js',r=>r.fulfill({contentType:'application/javascript',body:config.replace('endsAt: null',"endsAt: '2099-01-01T00:00:00+09:00'")}));
  const url='http://127.0.0.1:'+server.address().port;
  const shots=fs.mkdtempSync(path.join(os.tmpdir(),'sun-rhythm-qa-'));
  async function openEvent(){
    await page.goto(url);await page.waitForFunction(()=>bootDone&&window.sunRhythm&&getComputedStyle($('splash')).display==='none');
    assert.ok(await page.evaluate(async()=>{
      await document.fonts.load('700 16px "M PLUS Rounded 1c"','あいうSUN');
      await document.fonts.ready;
      return document.fonts.check('700 16px "M PLUS Rounded 1c"','あいうSUN') && getComputedStyle(document.body).fontFamily.includes('M PLUS Rounded 1c');
    }),'Bundled Google Font must load even when external network requests are blocked');
    await page.evaluate(()=>{$('loginov').style.display='none';localStorage.setItem('rdash_best_0','73');localStorage.setItem('rdash_skin','1');skinIdx=1;refreshMenu();});
    await page.screenshot({path:path.join(shots,'home.png')});
    await page.waitForFunction(()=>$('collab-home-art').querySelector('img').naturalWidth>0);
    assert.equal(await page.locator('#collab-banner img').count(),1);
    await page.waitForFunction(()=>$('collab-banner').querySelector('img').naturalWidth>0);
    const normalViewport=page.viewportSize();
    for(const size of [{width:1104,height:773},{width:568,height:320}]){
      await page.setViewportSize(size);
      assert.ok(await page.evaluate(()=>{const a=$('collab-home-art').getBoundingClientRect(),b=$('collab-banner').getBoundingClientRect(),c=$('continue-btn').getBoundingClientRect();return a.bottom<=b.top&&b.bottom<=c.top&&a.top>=0;}));
      await page.screenshot({path:path.join(shots,'home-'+size.width+'.png')});
    }
    await page.setViewportSize(normalViewport);
    await page.locator('#avatar-btn').click();
    assert.equal(await page.locator('#skins').isVisible(),true);
    await page.screenshot({path:path.join(shots,'characters.png')});
    await page.locator('#panel-close').click();
    await page.locator('#missions-open').click();
    assert.equal(await page.locator('#missions').isVisible(),true);
    await page.locator('#panel-close').click();
    await page.locator('#collab-banner').click();
    await page.screenshot({path:path.join(shots,'collab-lobby.png')});
    assert.equal(await page.locator('#collab-banner').textContent(),'おっ！さんコラボ開催中');
    assert.equal(await page.locator('#collab-start').textContent(),'あそぶ');
    assert.equal(await page.locator('#collab-goals').isVisible(),false);
    await page.locator('#collab-rewards-open').click();
    assert.equal(await page.locator('#collab-goals').isVisible(),true);
    assert.equal(await page.locator('.collab-goal').count(),3);
    await page.screenshot({path:path.join(shots,'collab-rewards.png')});
    await page.setViewportSize({width:390,height:844});
    assert.ok(await page.locator('#collab-rewards').evaluate(el=>el.parentElement.id==='app'&&el.offsetWidth>el.offsetHeight));
    await page.screenshot({path:path.join(shots,'collab-rewards-portrait.png')});
    await page.setViewportSize({width:844,height:390});
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#collab-rewards').isVisible(),false);
    await page.locator('#collab-rewards-open').click();
    await page.locator('#collab-rewards button').click();
    assert.equal(await page.locator('#collab-goals').isVisible(),false);
    assert.ok(await page.locator('#collab-lobby').evaluate(el=>getComputedStyle(el).backgroundImage.includes('8, 15, 39')));
    await page.locator('#collab-start').click();
    await page.waitForFunction(()=>state==='ready');
    await page.screenshot({path:path.join(shots,'ready.png')});
    await page.locator('#cv').click({position:{x:200,y:150}});
    await page.waitForFunction(()=>state==='play');
  }
  try {
    await openEvent();
    const before=await page.evaluate(()=>{
      level=[];coinsLive=[];orbsLive=[];flipZones=[];
      musicEl.currentTime=3.9;songPos=3;
      sunRhythm.charge('PERFECT',0);sunRhythm.charge('PERFECT',0);
      const single=sunRhythm.inspect().power;
      sunRhythm.charge('GREAT',1);sunRhythm.charge('GOOD',2);sunRhythm.charge('MISS',3);
      const total=sunRhythm.inspect().power;
      for(let i=4;i<10;i++)sunRhythm.charge('PERFECT',i);
      const track=musicEl,clock=musicEl.currentTime,tries=attempts;
      collaboration.tick();
      return {single,total,sameTrack:track===musicEl,sameClock:clock===musicEl.currentTime,tries,state,feverLength,protected:feverProtected()};
    });
    assert.equal(before.single,14);assert.equal(before.total,28);
    assert.equal(before.sameTrack,true);assert.equal(before.sameClock,true);
    assert.equal(before.state,'play');assert.equal(before.feverLength,10);assert.equal(before.protected,true);
    assert.equal(await page.locator('#sun-pads').count(),0);
    const paused=await page.evaluate(()=>{gameSafety.pause();return {position:songPos,score,attempts,feverEnd};});
    await page.waitForTimeout(150);
    assert.deepEqual(await page.evaluate(()=>({position:songPos,score,attempts,feverEnd})),paused);
    assert.equal(await page.evaluate(()=>state),'paused');
    await page.screenshot({path:path.join(shots,'pause.png')});
    await page.locator('#resume-game').click();await page.waitForFunction(()=>state==='play');
    assert.equal(await page.evaluate(()=>attempts),paused.attempts);
    assert.equal(await page.evaluate(()=>feverOn),true);
    await page.waitForTimeout(300);
    assert.ok(await page.evaluate(()=>songPos)>3.1,JSON.stringify(await page.evaluate(()=>({songPos,state,time:musicEl.currentTime,paused:musicEl.paused,seeking:musicEl.seeking,ready:musicEl.readyState,error:musicEl.error?.message,source:musicEl.src}))));
    const protectedHit=await page.evaluate(()=>{
      combo=9;shieldReady=true;const previous=score;die();
      return {state,combo,shieldReady,sameScore:score===previous};
    });
    assert.deepEqual(protectedHit,{state:'play',combo:9,shieldReady:true,sameScore:true});
    await page.keyboard.press('Space');
    await page.waitForTimeout(80);
    assert.equal(await page.evaluate(()=>player.grounded),false);
    await page.screenshot({path:path.join(shots,'continuous-fever.png')});
    const coinGain=await page.evaluate(()=>{
      const previous=coinRun;
      coinsLive=[{t:musicPosition(),y:player.y+B/2,got:false}];update(0);
      return coinRun-previous;
    });
    assert.equal(coinGain,2);
    const expiry=await page.evaluate(()=>{
      feverEnd=songPos-0.1;update(0);collaboration.tick();
      return {state,feverOn,protected:feverProtected(),power:sunRhythm.inspect().power};
    });
    assert.deepEqual(expiry,{state:'play',feverOn:false,protected:true,power:0});
    await page.evaluate(()=>{sunRhythm.charge('GREAT',100);});
    assert.equal(await page.evaluate(()=>sunRhythm.inspect().power),9);
    assert.equal(await page.evaluate(()=>attempts),before.tries);
    const seenArt=['10'];
    for(let appearance=1;appearance<=7;appearance++){
      await page.evaluate(n=>{
        for(let i=0;i<8;i++)sunRhythm.charge('PERFECT',1000+n*10+i);
        collaboration.tick();
      },appearance);
      await page.waitForFunction(()=>sunRhythm.inspect().artReady);
      seenArt.push(await page.evaluate(()=>sunRhythm.inspect().artwork));
      await page.screenshot({path:path.join(shots,'fever-art-'+seenArt.at(-1)+'.png')});
      await page.evaluate(()=>{feverEnd=songPos-0.1;update(0);collaboration.tick();});
    }
    assert.deepEqual(seenArt,['10','07','08','09','11','12','13','10']);
    await page.evaluate(()=>clearStage());
    await page.waitForTimeout(200);
    await page.screenshot({path:path.join(shots,'clear.png')});
    assert.ok(await page.locator('#clearov').evaluate(el=>getComputedStyle(el).backgroundImage.includes('8, 15, 39')));
    assert.equal(await page.locator('#nextbtn').textContent(),'もう一度あそぶ');
    await page.locator('#nextbtn').click();
    await page.waitForFunction(()=>state==='ready');
    await page.evaluate(()=>{backToMenu();});
    assert.equal(await page.locator('#sun-power').isVisible(),false);
    assert.equal(await page.evaluate(()=>best(0)),73);
    await page.locator('#continue-btn').click();
    await page.waitForFunction(()=>state==='ready');
    assert.equal(await page.evaluate(()=>stageIdx),0);
    await page.evaluate(()=>{state='play';score=4493;coinRun=79;attempts=3;maxCombo=7;runStats={p:5,g:5,o:5};clearStage();});
    await page.screenshot({path:path.join(shots,'clear-normal.png')});
    assert.equal(await page.locator('#result-details').isVisible(),false);
    await page.locator('#result-details-open').click();
    assert.equal(await page.locator('#result-details').isVisible(),true);
    await page.screenshot({path:path.join(shots,'clear-details.png')});
    await page.setViewportSize({width:390,height:844});
    assert.equal(await page.locator('#result-details').evaluate(el=>el.parentElement.id==='app'&&el.offsetWidth>el.offsetHeight),true);
    await page.screenshot({path:path.join(shots,'portrait-clear-details.png')});
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#result-details').isVisible(),false);
    assert.equal(await page.locator('#clearov').evaluate(el=>el.inert),false);
    await page.locator('#result-details-open').click();
    await page.locator('#result-details button').click();
    assert.equal(await page.locator('#result-details').isVisible(),false);
    await page.evaluate(()=>backToMenu());
    await page.setViewportSize({width:390,height:844});
    await page.screenshot({path:path.join(shots,'portrait-home.png')});
    await page.locator('#stageSelectBtn').click();
    await page.screenshot({path:path.join(shots,'portrait-stages.png')});
    const off=await context.newPage();off.on('pageerror',e=>errors.push(e.message));
    let requested=0;off.on('request',r=>{if(r.url().includes('/Asset/collaborations/'))requested++;});
    await off.route('**/collaboration-config.js',r=>r.fulfill({contentType:'application/javascript',body:config.replace('enabled: true','enabled: false')}));
    await off.goto(url);await off.waitForFunction(()=>window.sunRhythm);
    assert.equal(await off.locator('#collab-banner').isVisible(),false);
    assert.equal(await off.locator('#collab-home-art').isVisible(),false);
    assert.equal(requested,0);
    const classic=await off.evaluate(()=>{
      stageIdx=0;state='play';level=[];coinsLive=[];orbsLive=[];musicPosition=()=>2;
      fever=1;sfxFever=()=>{};duration=45;update(0);
      return {feverOn,feverLength,protected:feverProtected()};
    });
    assert.deepEqual(classic,{feverOn:true,feverLength:7,protected:false});
    const regression=await off.evaluate(()=>{
      stopMusic=()=>{};playTrack=()=>{};sfxCoin=()=>{};sfxDeath=()=>{};sfxClear=()=>{};
      stageIdx=0;practice=false;state='play';duration=45;songPos=10;shieldReady=false;invulnUntil=0;feverOn=false;feverGraceUntil=0;score=0;coinRun=12;settledCoins=0;revivesUsed=0;localStorage.setItem('rdash_coins','100');
      mission=()=>{};die();const afterDeath=totalCoins();$('revivebtn').click();const afterRevive=totalCoins();clearStage();const afterClear=totalCoins();clearStage();const afterDuplicateClear=totalCoins();
      state='play';level=[{t:10.25,type:'spike'}];songPos=10;noteJudgeIdx=0;combo=0;score=0;runStats={p:0,g:0,o:0};judgedNotes.clear();judge();const first=score;judge();const second=score;
      localStorage.removeItem(recordKey('hs',0,'normal'));localStorage.removeItem(recordKey('hs',0,'sun'));
      runRecordMode='normal';setHiScore(0,123);runRecordMode='sun';setHiScore(0,456);
      return {afterDeath,afterRevive,afterClear,afterDuplicateClear,first,second,p:runStats.p,normal:hiScore(0,'normal'),sun:hiScore(0,'sun')};
    });
    assert.equal(regression.afterDeath,112);assert.equal(regression.afterRevive,62);assert.equal(regression.afterClear,62);assert.equal(regression.afterDuplicateClear,62);
    assert.equal(regression.first,regression.second);assert.equal(regression.p,1);assert.equal(regression.normal,123);assert.equal(regression.sun,456);
    assert.equal(await off.evaluate(()=>{
      state='play';musicPosition=()=>11;attemptOffset=0;duration=45;
      combo=10;noteJudgeIdx=0;judgedNotes.clear();level=[{t:10.25,type:'spike'}];coinsLive=[];orbsLive=[];flipZones=[];update(0);return combo;
    }),0,'Expired notes must break the combo');
    assert.deepEqual(errors,[]);
    console.log('PASS: continuous music/gameplay, SUN gauge, no alternate input, jump controls, invincibility, double coins, expiration/recharge, normal saves and disabled edition. Screenshots: '+shots);
  }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
