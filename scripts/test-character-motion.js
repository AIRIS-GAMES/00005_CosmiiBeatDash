const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright'),root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{let file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(req.url.split('?')[0].endsWith('/'))file=path.join(file,'index.html');if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',({'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.mp3':'audio/mpeg'})[path.extname(file)]||'application/octet-stream');require('./serve-file')(req,res,file);});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch();try{
 const page=await browser.newPage({viewport:{width:960,height:480},serviceWorkers:'block'});await page.route('https://**',r=>r.abort());await page.addInitScript(()=>localStorage.setItem('cosmii_dash_story_v1',JSON.stringify({intro:true,opening:true})));const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>localStorage.setItem('cosmii_tutorial_v1','done'));await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>bootDone&&cosmiiCharacterMotion.poses.filter(Boolean).length===5&&cosmiiCharacterMotion.runs.filter(Boolean).length===5);await page.evaluate(()=>$('loginov').style.display='none');await page.evaluate(()=>selectStage(0));await page.waitForFunction(()=>state==='ready');
 const result=await page.evaluate(()=>{
  const m=cosmiiCharacterMotion, report=[];
  for(let i=0;i<5;i++){
   skinIdx=i;m.reset();player.grounded=false;player.vy=-250;lastGdir=1;m.emit('jump');
   const before={y:player.y,vy:player.vy,score,holdJump};m.emit(['judge','judge','coin','hold','shield'][i]);const p=m.pose();
   report.push({reaction:p.reacting,pose:p.image===m.runs[i][1],tilt:p.tilt,unchanged:JSON.stringify(before)===JSON.stringify({y:player.y,vy:player.vy,score,holdJump})});
  }
  m.reset();const reset=!m.pose().reacting;
  // Actual physics path: identical with visual hooks enabled and absent.
  function simulate(enabled){window.cosmiiCharacterMotion=enabled?m:null;state='play';skinIdx=0;level=[];beats=[];coinsLive=[];orbsLive=[];flipZones=[];duration=100;player.y=GROUND-B;player.vy=0;player.rot=0;player.grounded=true;lastGdir=1;isDown=true;tapAt=-9;holdJump=0;songPos=0;const rows=[];for(let i=0;i<35;i++){if(i===7)isDown=false;update(.01,i*.01);rows.push([player.y,player.vy,player.grounded,player.rot]);}return rows;}
  const a=simulate(true),b=simulate(false);window.cosmiiCharacterMotion=m;
  // Trigger the real one-use shield path.
  state='play';skinIdx=4;shieldReady=true;invulnUntil=0;feverOn=false;feverGraceUntil=0;m.reset();die();const shield=state==='play'&&!shieldReady&&m.pose().reacting;
  state='ready';return {report,reset,same:JSON.stringify(a)===JSON.stringify(b),noSpin:a.every(r=>r[3]===0),shield};
 });
 assert(result.report.every(r=>r.reaction&&r.pose&&r.unchanged&&Math.abs(r.tilt)<.2));assert(result.reset&&result.same&&result.noSpin&&result.shield,JSON.stringify(result));
 const running=await page.evaluate(()=>{
  const m=cosmiiCharacterMotion;state='play';player.grounded=true;SPEED=400;reducedEffects=false;
  const rows=[];
  for(let i=0;i<5;i++){
   skinIdx=i;const frames=[];
   for(const t of [0,.1,.2,.3]){songPos=t;frames.push(m.pose().frame);}
   state='paused';const frozen=m.pose().image===m.pose(performance.now()/1000+10).image;
   player.grounded=false;const jump=m.pose().image===m.runs[i][1];player.grounded=true;
   reducedEffects=true;const quiet=m.pose().frame===1;reducedEffects=false;
   const distinct=new Set(m.runs[i].map(c=>c.toDataURL())).size;
   const saved=m.runs[i];m.runs[i]=null;const fallback=!!m.pose().image;m.runs[i]=saved;
   rows.push({frames,frozen,jump,quiet,distinct,fallback});state='play';
  }
  state='ready';return rows;
 });
 for(const row of running){assert.deepEqual(row.frames,[0,1,2,3]);assert(row.frozen&&row.jump&&row.quiet&&row.fallback);assert.equal(row.distinct,4);}
 // Show every generated character in the real stage renderer, including inverted gravity.
 for(let i=0;i<5;i++){
  await page.evaluate(i=>{state='paused';skinIdx=i;player.grounded=true;player.y=GROUND-B;lastGdir=1;landAt=-9;songPos=.2;level=[];draw();},i);
  await page.screenshot({path:`test-results/run-game-${i}.png`});
 }
 await page.evaluate(()=>{lastGdir=-1;player.y=CEIL;draw();});
 await page.screenshot({path:'test-results/run-game-inverted.png'});
 await page.evaluate(()=>{state='ready';skinIdx=1;player.grounded=false;player.y=GROUND-B*2;invulnUntil=0;cosmiiCharacterMotion.emit('jump');cosmiiCharacterMotion.emit('judge');draw();});await page.screenshot({path:'test-results/character-motion-blue.png'});
 assert.deepEqual(errors,[]);console.log('Character motion: five poses, correct reactions, reset, unchanged physics, no rotation, real shield PASS');
 }finally{await browser.close();server.close();}})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
