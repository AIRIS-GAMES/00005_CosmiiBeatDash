const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright'),root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{
  let file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
  if(req.url.split('?')[0].endsWith('/'))file=path.join(file,'index.html');
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404);res.end();return;}
  res.setHeader('Content-Type',({'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.mp3':'audio/mpeg'})[path.extname(file)]||'application/octet-stream');require('./serve-file')(req,res,file);
});
(async()=>{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch();
  try{
    const page=await browser.newPage({viewport:{width:667,height:375},serviceWorkers:'block'}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));await page.route('https://**',r=>r.abort());
    await page.addInitScript(()=>{localStorage.setItem('cosmii_dash_story_v1',JSON.stringify({intro:true,opening:true}));localStorage.setItem('cosmii_tutorial_v1','done');});
    const url='http://127.0.0.1:'+server.address().port;
    await page.goto(url);await page.waitForFunction(()=>bootDone&&cosmiiRides.sheets.bike.filter(Boolean).length===5&&cosmiiRides.sheets.skate.filter(Boolean).length===5);
    await page.evaluate(()=>{$('loginov').style.display='none';localStorage.setItem('rdash_coins','0');});
    assert.equal(await page.evaluate(()=>cosmiiRides.selected()),'run');
    assert.equal(await page.evaluate(()=>cosmiiRides.select('bike')),false);
    assert.equal(await page.evaluate(()=>cosmiiRides.buy('bike')),false);
    await page.evaluate(()=>{localStorage.setItem('rdash_coins','1000');cosmiiRides.refresh();});
    await page.click('#rides-open');await page.click('[data-ride="skate"]');await page.click('#ride-cancel');
    assert.equal(await page.evaluate(()=>totalCoins()),1000);
    const rollback=await page.evaluate(()=>{
      const original=Storage.prototype.setItem;let fail=true;
      Storage.prototype.setItem=function(k,v){if(k==='cosmii_rides_v1'&&fail){fail=false;throw new Error('quota fixture');}return original.call(this,k,v);};
      try{return {ok:cosmiiRides.buy('skate'),coins:totalCoins(),selected:cosmiiRides.selected(),journal:localStorage.getItem('cosmii_rides_pending_v1')};}finally{Storage.prototype.setItem=original;}
    });
    assert.deepEqual(rollback,{ok:false,coins:1000,selected:'run',journal:null});
    await page.click('[data-ride="skate"]');
    fs.mkdirSync(path.join(root,'test-results'),{recursive:true});
    await page.screenshot({path:'test-results/rides-shop-confirm.png'});
    assert.equal(await page.locator('#ui-panel .panel-shell').evaluate(e=>e.scrollHeight-e.clientHeight),0);
    await page.click('#ride-confirm-buy');
    assert.equal(await page.evaluate(()=>totalCoins()),700);
    assert.equal(await page.evaluate(()=>cosmiiRides.selected()),'skate');
    await page.evaluate(()=>cosmiiRides.buy('skate'));assert.equal(await page.evaluate(()=>totalCoins()),700);
    await page.click('[data-ride="bike"]');await page.click('#ride-confirm-buy');
    assert.equal(await page.evaluate(()=>totalCoins()),100);
    await page.reload();await page.waitForFunction(()=>bootDone&&cosmiiRides.sheets.bike.filter(Boolean).length===5);
    assert.equal(await page.evaluate(()=>cosmiiRides.selected()),'bike');
    assert.equal(await page.evaluate(()=>totalCoins()),100);
    await page.evaluate(()=>{$('loginov').style.display='none';});await page.click('#rides-open');
    await page.screenshot({path:'test-results/rides-shop-owned.png'});await page.click('#panel-close');
    await page.evaluate(()=>selectStage(0));await page.waitForFunction(()=>state==='ready');
    for(const type of ['skate','bike'])for(let i=0;i<5;i++){
      const result=await page.evaluate(({type,i})=>{
        state='menu';cosmiiRides.select(type);skinIdx=i;state='paused';player.grounded=true;player.y=GROUND-B;lastGdir=1;landAt=-9;songPos=.2;level=[];invulnUntil=0;
        const before=[B,player.x,player.y,player.vy,SPEED],pose=cosmiiCharacterMotion.pose(),after=[B,player.x,player.y,player.vy,SPEED];draw();
        return {correct:pose.image===cosmiiRides.sheets[type][i][pose.frame],before,after,distinct:new Set(cosmiiRides.sheets[type][i].map(c=>c.toDataURL())).size};
      },{type,i});
      assert(result.correct);assert.deepEqual(result.before,result.after);assert.equal(result.distinct,4);
      if(i===1)await page.screenshot({path:`test-results/rides-play-${type}.png`});
    }
    const airborne=await page.evaluate(()=>{player.grounded=false;lastGdir=-1;player.y=CEIL;const pose=cosmiiCharacterMotion.pose();draw();return pose.image===cosmiiRides.sheets.bike[skinIdx][1]});assert(airborne);
    assert.equal(await page.evaluate(()=>cosmiiRides.buy('skate')),false,'Cannot change loadout during a run');
    await page.evaluate(()=>{state='menu';cosmiiRides.select('run');});
    assert.equal(await page.evaluate(()=>cosmiiRides.selected()),'run');
    // Recover an interrupted debit before showing the menu.
    await page.evaluate(()=>{localStorage.setItem('cosmii_rides_pending_v1',JSON.stringify({coins:'400',rides:null}));localStorage.setItem('rdash_coins','100');});
    await page.reload();await page.waitForFunction(()=>bootDone&&window.cosmiiRides);
    assert.equal(await page.evaluate(()=>totalCoins()),400);assert.equal(await page.evaluate(()=>cosmiiRides.selected()),'run');
    assert.deepEqual(errors,[]);
    console.log('Rides: insufficient funds, cancel, rollback/recovery, one-time debit, shared unlocks, persistence, all 10 sheets, air/flip, unchanged physics and landscape fit PASS');
  }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
