const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const types = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.png':'image/png', '.jpg':'image/jpeg', '.mp3':'audio/mpeg', '.woff2':'font/woff2' };
const server = http.createServer((req,res) => {
  const pathname = decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const file = path.resolve(root,'.'+(pathname.endsWith('/')?pathname+'index.html':pathname));
  if (!file.startsWith(root+path.sep) || !fs.existsSync(file)) return res.writeHead(404).end();
  res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');
  require('./serve-file')(req,res,file);
});

async function main() {
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({viewport:{width:960,height:540}, serviceWorkers:'block', reducedMotion:'reduce'});
    const errors = [];
    page.on('pageerror',e=>errors.push(e.message));
    await page.route('https://**',r=>r.abort());
    await page.addInitScript(()=>{
      localStorage.setItem('cosmii_dash_story_v1',JSON.stringify({intro:true,opening:true}));
      localStorage.setItem('rdash_guide_tap','1');
      localStorage.setItem('rdash_login_last',new Date().toLocaleDateString('sv-SE'));
    });
    await page.goto('http://127.0.0.1:'+server.address().port+'/?analytics=off');
    await page.waitForFunction(()=>bootDone&&window.cosmiiCapsule&&getComputedStyle($('splash')).display==='none');
    const rules = await page.evaluate(()=>{
      state='menu';skinIdx=0;
      const api=cosmiiCapsule, originalRandom=Math.random;
      const events=[];window.__beatAnalyticsSink=(...event)=>events.push(event);
      const seq=(...values)=>{Math.random=()=>values.length?values.shift():0;};
      const localDate=Date;
      const moveDay=()=>{window.Date=class extends localDate{constructor(...args){super(...(args.length?args:[localDate.now()+86400000]));}};};
      try {
        localStorage.setItem('rdash_coins','1000');
        seq(0,0);
        const free=api.pull('free');
        const spentFree=api.pull('free')===null;
        moveDay(); const tomorrow=api.free();window.Date=localDate;
        seq(0,0);
        const duplicate=api.pull('coin');
        const paid=totalCoins(), xp=cosmiiBond._state().xp[0];
        for(let i=2;i<9;i++){seq(0,0);api.pull('coin');}
        seq(0,0); const tenth=api.pull('coin');
        const before={coins:totalCoins(),state:localStorage.getItem('cosmii_capsule_v1'),xp:cosmiiBond._state().xp[0]};
        const realSet=Storage.prototype.setItem;
        Storage.prototype.setItem=function(k,v){
          if(k==='rdash_bond_v1'){Storage.prototype.setItem=realSet;throw new Error('test quota');}
          return realSet.call(this,k,v);
        };
        seq(0,0);const rollback=api.pull('coin')===null;
        Storage.prototype.setItem=realSet;
        const restored=totalCoins()===before.coins && localStorage.getItem('cosmii_capsule_v1')===before.state && cosmiiBond._state().xp[0]===before.xp;
        localStorage.setItem('rdash_coins','99');
        const low=api.pull('coin')===null;
        return {free:free?.item.id,spentFree,tomorrow,duplicate:duplicate?.duplicate,paid,xp,tenth:tenth?.item.rarity,rollback,restored,low,
          resource:events.filter(e=>e[0]==='addResourceEvent'&&e[2]==='Coins'&&e[4]==='Capsule').length,
          pulls:events.filter(e=>e[0]==='addDesignEvent'&&e[1].startsWith('BeatPSF:v1:capsule_pull:')).length};
      } finally{Math.random=originalRandom;window.Date=localDate;}
    });
    assert.deepEqual(rules,{free:'phones',spentFree:true,tomorrow:true,duplicate:true,paid:900,xp:10,tenth:'sr',rollback:true,restored:true,low:true,resource:9,pulls:10});
    await page.evaluate(()=>{
      const key='cosmii_capsule_v1';
      const snapshot={rdash_coins:'700',[key]:localStorage.getItem(key),rdash_bond_v1:localStorage.getItem('rdash_bond_v1')};
      localStorage.setItem('cosmii_capsule_pending_v1',JSON.stringify(snapshot));
      localStorage.setItem('rdash_coins','600');
      localStorage.removeItem(key);
      localStorage.removeItem('rdash_bond_v1');
    });
    await page.reload();
    await page.waitForFunction(()=>window.cosmiiCapsule&&bootDone&&getComputedStyle($('splash')).display==='none');
    assert(await page.evaluate(()=>totalCoins()===700&&cosmiiCapsule.inspect().owned.includes('phones')&&cosmiiBond._state().xp[0]>10&&!localStorage.getItem('cosmii_capsule_pending_v1')));
    await page.evaluate(()=>{
      const key='cosmii_capsule_v1', stored=JSON.parse(localStorage.getItem(key));
      stored.owned.push('scarf');
      stored.outfits[0]={head:'phones',neck:'scarf'};
      stored.outfits[1]={neck:'bondscarf'};
      localStorage.setItem(key,JSON.stringify(stored));
    });
    await page.reload();
    await page.waitForFunction(()=>window.cosmiiCapsule&&bootDone&&getComputedStyle($('splash')).display==='none');
    const retired=await page.evaluate(()=>{
      const {owned,outfits}=cosmiiCapsule.inspect();
      return {owned,head:outfits[0].head,neck:outfits.some(outfit=>'neck' in outfit),
        candidates:cosmiiCapsule.items.map(item=>item.id),canEquip:cosmiiCapsule.equip(0,'scarf')};
    });
    assert.equal(retired.head,'phones');
    assert.equal(retired.neck,false);
    assert.equal(retired.canEquip,false);
    assert(!retired.owned.includes('scarf')&&!retired.candidates.some(id=>id.endsWith('scarf')));

    const output = path.join(root,'test-results','capsule');
    fs.mkdirSync(output,{recursive:true});
    await page.evaluate(()=>{state='menu';$('loginov').style.display='none';});
    await page.locator('.capsule-home-open').click();
    assert.equal(await page.locator('#capsule-shop .capsule-free').isDisabled(),true);
    await page.screenshot({path:path.join(output,'machine.jpg'),type:'jpeg'});
    await page.evaluate(()=>{window.testRandom=Math.random;Math.random=()=>.42;});
    await page.locator('#capsule-shop .capsule-pay').click();
    await page.locator('.capsule-reveal').waitFor({state:'visible'});
    await page.screenshot({path:path.join(output,'reveal.jpg'),type:'jpeg'});
    await page.locator('.capsule-reveal button').first().click();
    assert.equal(await page.locator('#ui-panel').getAttribute('data-section'),'closet');
    await page.screenshot({path:path.join(output,'closet.jpg'),type:'jpeg'});
    await page.evaluate(()=>{Math.random=window.testRandom;});
    await page.locator('#panel-close').click();

    for(let i=0;i<5;i++){
      const art = await page.evaluate(i=>{
        state='menu';$('menu').style.display='flex';$('clearov').style.display='none';$('loginov').style.display='none';
        skinIdx=i;
        for(let j=1;j<5;j++)localStorage.setItem('rdash_skinbuy_'+j,'1');
        window.cosmiiBond.gain(i,200);
        const value=cosmiiCapsule.inspect();
        value.owned=cosmiiCapsule.items.map(i=>i.id);
        localStorage.setItem('cosmii_capsule_v1',JSON.stringify(value));
        const items=[['phones','glasses','neon'],['cap','shades','night'],['bow','glasses','gold'],['star','glasses','neon'],['halo','shades','night']];
        if(!items[i].every(id=>cosmiiCapsule.equip(i,id,false)))throw Error('equip failed');
        refreshMenu();
        return cosmiiWardrobe.portrait(i);
      },i);
      assert(art.startsWith('data:image/png'));
      assert.equal(await page.locator('#charimg').getAttribute('src'),art);
      await page.screenshot({path:path.join(output,i+'-home.jpg'),type:'jpeg'});
      await page.evaluate(i=>cosmiiWorld.profiles(i),i);
      assert((await page.locator('.profile-stage img').getAttribute('src')).startsWith('data:image/png'));
      await page.screenshot({path:path.join(output,i+'-profile.jpg'),type:'jpeg'});
      await page.locator('#world-close').click();
      await page.evaluate(()=>{
        const track=AUDIO_TRACKS[STAGES[0].file];
        cosmiiRides.select('run');
        setupRun(0,{duration:track.duration},[]);
        $('menu').style.display='none';
        // Stop advancing the chart to hold the chosen frame for the visual check.
        state='paused';songPos=3;draw();
        if(!cosmiiCharacterMotion.pose(performance.now()/1000).wardrobePose.startsWith('run'))throw Error('run pose missing');
      });
      await page.screenshot({path:path.join(output,i+'-run.jpg'),type:'jpeg'});
      await page.evaluate(()=>{
        localStorage.setItem('cosmii_rides_v1',JSON.stringify({owned:['skate','bike'],selected:'skate'}));
        state='menu';cosmiiRides.select('skate');state='paused';draw();
        if(!cosmiiCharacterMotion.pose(performance.now()/1000).wardrobePose.startsWith('skate'))throw Error('skate pose missing');
      });
      await page.screenshot({path:path.join(output,i+'-skate.jpg'),type:'jpeg'});
      await page.evaluate(()=>{
        localStorage.setItem('cosmii_rides_v1',JSON.stringify({owned:['skate','bike'],selected:'bike'}));
        state='menu';cosmiiRides.select('bike');state='paused';draw();
        const art=cosmiiCharacterMotion.pose(performance.now()/1000);
        if(!art.wardrobePose.startsWith('bike'))throw Error('bike pose missing');
      });
      await page.screenshot({path:path.join(output,i+'-bike.jpg'),type:'jpeg'});
      await page.evaluate(()=>{
        state='play';practice=true;clearStage();
        if(!$('clearchar').src.startsWith('data:image/png'))throw Error('result is not dressed');
        $('clearov').style.display='flex';
      });
      await page.locator('#clearchar').waitFor({state:'visible'});
      await page.screenshot({path:path.join(output,i+'-result.jpg'),type:'jpeg'});
    }
    const sheet = await page.evaluate(async()=>{
      const colors=['red','blue','pink','green','purple'], poses=Object.keys(cosmiiWardrobe.anchors.red);
      const cell=120,c=document.createElement('canvas');
      c.width=poses.length*cell;c.height=colors.length*cell;
      const g=c.getContext('2d');
      g.fillStyle='#221c39';g.fillRect(0,0,c.width,c.height);
      for(const [i,color] of colors.entries())for(const [j,pose] of poses.entries()){
        const im=new Image();im.src=cosmiiWardrobe.portrait(i,pose);await im.decode();
        g.drawImage(im,j*cell,i*cell,cell,cell);
        g.fillStyle='#f7efff';g.font='11px system-ui';g.fillText(color+' '+pose,j*cell+5,(i+1)*cell-5);
      }
      return c.toDataURL().split(',')[1];
    });
    fs.writeFileSync(path.join(output,'all-anchors.png'), Buffer.from(sheet,'base64'));
    const revive = await page.evaluate(()=>{
      state='play';practice=false;shieldReady=false;invulnUntil=0;shake=0;
      songPos=5;revivesUsed=0;localStorage.setItem('rdash_coins','999');
      die({fall:true});
      return reviveOffered && $('rv-char').src===cosmiiWardrobe.portrait(skinIdx,'front');
    });
    assert.equal(revive,true,'the continue portrait wears the same outfit');
    await page.goto('http://127.0.0.1:'+server.address().port+'/prototypes/capsule-anchors.html');
    await page.locator('#character').selectOption('purple');
    await page.locator('#pose').selectOption('bike3');
    await page.locator('#export').click();
    const anchors=JSON.parse(await page.locator('#json').inputValue());
    assert.equal(Object.values(anchors).flatMap(Object.keys).length,70);
    assert.deepEqual(errors,[]);
    console.log('Capsule: daily allowance, purchase, pity, duplicate bond, rollback/recovery, 5 characters, UI and dressed poses PASS');
  } finally {
    await browser.close();
    server.close();
  }
}
main().catch(error=>{console.error(error);server.close();process.exitCode=1;});
