/* Visual review: plays every stage from start to finish with an on-beat bot and
   saves a contact sheet per stage (8 moments, the last one at the goal), plus the
   home, stage select and rides screens, so a person can look through a whole run.
   Output: test-results/review/. Usage: node scripts/review-shots.js [stage...] */
const fs=require('fs'),path=require('path'),http=require('http');const {chromium}=require('playwright');const root=path.resolve(__dirname,'..');
const out=path.join(root,'test-results','review');fs.mkdirSync(out,{recursive:true});
const types={'.js':'application/javascript','.css':'text/css','.png':'image/png','.html':'text/html','.woff2':'font/woff2','.ttf':'font/ttf'};
const server=http.createServer((q,r)=>{let p=decodeURIComponent(q.url.split('?')[0]);if(p==='/')p='/index.html';fs.readFile(path.join(root,p),(e,d)=>{if(e){r.writeHead(404);r.end();return;}const ty=types[path.extname(p)];if(ty)r.setHeader('Content-Type',ty);r.end(d);});});
const only=process.argv.slice(2).map(Number).filter(Boolean);
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch();try{
 const page=await browser.newPage({viewport:{width:844,height:390},deviceScaleFactor:1,serviceWorkers:'block'});
 await page.addInitScript(()=>{localStorage.setItem('cosmii_dash_story_v1',JSON.stringify({intro:true,opening:true}));localStorage.setItem('cosmii_tutorial_v2','done');for(let i=0;i<6;i++)localStorage.setItem('rdash_best_'+i,'100');localStorage.setItem('cosmii_rides_v1',JSON.stringify({owned:['skate','bike'],selected:'run'}));});
 await page.goto('http://127.0.0.1:'+server.address().port+'/?analytics=off');await page.waitForFunction(()=>bootDone&&window.stageGimmicks);await page.waitForTimeout(1200);
 await page.evaluate(()=>{$('loginov').style.display='none';});
 if(!only.length){
  await page.screenshot({path:path.join(out,'ui-home.png')});
  await page.evaluate(()=>openStageSelect());await page.waitForTimeout(500);await page.screenshot({path:path.join(out,'ui-select.png')});
  await page.click('#stageback');await page.waitForTimeout(200);
  await page.evaluate(()=>$('rides-open').click());await page.waitForTimeout(400);await page.screenshot({path:path.join(out,'ui-rides.png')});
  await page.evaluate(()=>document.querySelector('#panel-close')?.click());
 }
 await page.evaluate(()=>{window.musicPosition=()=>songPos;window.playTrack=()=>{};window.stopMusic=()=>{};window.sfxDeath=()=>{};window.sfxClear=()=>{};window.gaDesign=()=>{};window.gaProgress=()=>{};
  const loop=window.requestAnimationFrame;window.__frozen=true;});
 for(let i=0;i<20;i++){if(only.length&&!only.includes(i+1))continue;
  const plan=await page.evaluate(i=>{const cfg=STAGES[i];setupRun(i,{duration:AUDIO_TRACKS[cfg.file].duration},[]);practice=true;startAttempt(0);state='play';$('menu').style.display='none';$('clearov').style.display='none';
   window.__taps=level.filter(o=>!isFreeNote(o)||o.type==='arm').map(o=>o.type==='arm'?o.t:o.t-TAP_OFFSET).sort((a,b)=>a-b);window.__died=null;const d0=window.die;window.die=function(o){const s0=state;d0(o);if(s0==='play'&&state==='dead'&&!window.__died)window.__died=songPos;state='play';};
   window.__realNow=performance.now;performance.now=()=>(songPos+1000)*1000;window.update0=window.update0||update;
   return {duration,title:cfg.title};},i);
  const marks=[...Array(7)].map((_,k)=>plan.duration*(k+0.6)/7.6).concat([plan.duration-0.6]);
  const files=[];
  for(const [k,t] of marks.entries()){
   await page.evaluate(t=>{const step=1/240;while(songPos<t&&state==='play'){songPos+=step;while(__taps.length&&__taps[0]<=songPos){tapAt=songPos+1000;__taps.shift();}isDown=false;update0(step,songPos);}
    const ride=stageGimmicks.inspect();if(ride.riding==='ride'){}draw();},t);
   const f=path.join(out,`s${String(i+1).padStart(2,'0')}-${k}.png`);await page.screenshot({path:f});files.push(f);
  }
  const died=await page.evaluate(()=>{performance.now=window.__realNow;return window.__died;});
  console.log(`stage ${i+1} 「${plan.title}」 ${died===null?'ran to the end':'hit something at '+died.toFixed(1)+'s'}`);
 }
}finally{await browser.close();server.close();}})();
