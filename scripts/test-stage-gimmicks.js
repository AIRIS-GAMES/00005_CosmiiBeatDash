/* Stage gimmicks: every gimmick stage can be cleared by tapping on the beat with
   ordinary press lengths and every character, and the wrong choice fails.
   Runs the real update() with a scripted player (no audio). */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright'),root=path.resolve(__dirname,'..');
const types={'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.mp3':'audio/mpeg','.wav':'audio/wav','.woff2':'font/woff2'};
const server=http.createServer((req,res)=>{let file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(req.url.split('?')[0].endsWith('/'))file=path.join(file,'index.html');if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');require('./serve-file')(req,res,file);});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch();try{
 const page=await browser.newPage({viewport:{width:844,height:390},serviceWorkers:'block'});
 await page.route('https://**',r=>r.abort());const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{localStorage.setItem('cosmii_dash_story_v1',JSON.stringify({intro:true,opening:true}));localStorage.setItem('cosmii_tutorial_v2','done');});
 await page.goto('http://127.0.0.1:'+server.address().port+'/?analytics=off');
 await page.waitForFunction(()=>bootDone&&window.stageGimmicks);
 await page.evaluate(()=>{
  $('loginov').style.display='none';
  window.musicPosition=()=>songPos;window.playTrack=()=>{};window.stopMusic=()=>{};
  window.gaDesign=()=>{};window.gaProgress=()=>{};window.sfxDeath=()=>{};window.sfxClear=()=>{};
  // Play one stage with a scripted player. opts.wrong: make one deliberate mistake.
  window.__play=(i,opts={})=>{
   const cfg=STAGES[i],track=AUDIO_TRACKS[cfg.file],savedG=cfg.gimmick;
   if(opts.gimmick)cfg.gimmick=opts.gimmick;   // try a gimmick no stage uses at the moment
   skinIdx=opts.skin||0;setupRun(i,{duration:track.duration},[]);cfg.gimmick=savedG;practice=true;startAttempt(0);
   state='play';const press=opts.press??0.08,step=1/240;let died=null,mistake=null;
   const realDie=window.die;window.die=function(){const before=state;realDie();if(before==='play'&&state==='dead'&&!died)died={t:songPos,near:level.filter(o=>Math.abs(o.t-songPos)<.6).map(o=>o.type+(o.low===false?'(high)':''))};};
   const taps=[];for(const ob of level){if(ob.type==='arm'&&opts.wrong!=='arm')taps.push(ob.t);if(isFreeNote(ob))continue;taps.push(ob.t-TAP_OFFSET);}
   // MOGU bites: jump on every bite beat (a jump on a beat it skips is harmless).
   for(const b of stageGimmicks.inspect().biteTimes)taps.push(b);
   // No jump at the arm: it passes overhead, and the spike bed under it ends the run.
   if(opts.wrong==='arm'){const a=level.find(o=>o.type==='arm');const st=a&&level.find(o=>o.type==='step'&&Math.abs(o.t-TAP_OFFSET-(a.t-JUMP_T/2))<0.02);if(st){taps.splice(taps.indexOf(st.t-TAP_OFFSET),1);mistake=a.t;}}
   // Wrong-choice probes
   if(opts.wrong==='jelly'){const hi=level.find(o=>o.type==='jelly'&&!o.low);if(hi){taps.push(hi.t-TAP_OFFSET);mistake=hi.t;}}
   if(opts.wrong==='stairs'||opts.wrong==='lift'||opts.wrong==='match'){const st=level.find(o=>o.type==='step'&&o.k===2);if(st){const k=taps.indexOf(st.t-TAP_OFFSET);taps.splice(k,1);mistake=st.t;}}
   if(opts.wrong==='ring'){const r=level.find(o=>o.type==='ring');if(r){const k=taps.indexOf(r.t-TAP_OFFSET);taps[k]+=.17;mistake=r.t;}}
   if(opts.wrong==='ringEarly'){const r=level.find(o=>o.type==='ring');if(r){const k=taps.indexOf(r.t-TAP_OFFSET);taps[k]-=.19;mistake=r.t;}}
   if(opts.wrong==='matchLate'){const st=level.find(o=>o.type==='step'&&o.k===1&&level.some(t=>t.type==='tile'&&Math.abs(t.t-o.t)<1));if(st){const k=taps.indexOf(st.t-TAP_OFFSET);taps.splice(k,1);mistake=st.t;}}
   // Cannon relay: no tap on the first shot -> the cannon tips you out.
   if(opts.wrong==='cannon'){const sh=level.find(o=>o.type==='shot');if(sh){const k=taps.indexOf(sh.t-TAP_OFFSET);taps.splice(k,1);mistake=sh.t;}}
   if(opts.wrong==='pad'){const pd=level.find(o=>o.type==='pad');if(pd){taps.push(pd.t-0.08);mistake=pd.t;}}
   if(opts.wrong==='cake'){const c=level.find(o=>o.type==='cake'&&o.high);if(c){taps.push(c.t-TAP_OFFSET);mistake=c.t;}}
   taps.sort((a,b)=>a-b);
   let fired=new Set(),next=0,upper=false;
   // The game's clock is performance.now(); tie it to song time so a tap is
   // buffered for 0.1s exactly as a real pointerdown is.
   const realNow=performance.now;performance.now=()=>(songPos+1000)*1000;
   try{
   for(songPos=-LEAD;songPos<duration+.2&&state==='play';){
    songPos+=step;
    while(next<taps.length&&taps[next]<=songPos){tapAt=songPos+1000;next++;}
    isDown=taps.some(t=>songPos>=t&&songPos<t+press);
    update(step,songPos);
    if(player.grounded&&player.y+B<=GROUND-B*2.4+1&&level.some(o=>o.type==='ledge'&&songPos>o.from&&songPos<o.to))upper=true;
   }
   }finally{performance.now=realNow;}
   window.die=realDie;
   return {stage:i+1,state,died,matches:stageGimmicks.inspect().matches,groups:new Set(level.filter(o=>o.type==='tile').map(o=>o.group)).size,ringsIn:level.filter(o=>o.type==='ring'&&o.inAt!==undefined).length,rings:level.filter(o=>o.type==='ring').length,mistake,upper,end:duration,types:[...new Set(level.map(o=>o.type))],chase:stageGimmicks.inspect().chase};
  };
 });
 const stages=Object.entries(await page.evaluate(()=>stageGimmicks.PLAN)).filter(([,p])=>p.g).map(([n])=>Number(n));
 const results=[];
 for(const n of stages)for(const [skin,press] of [[0,.05],[0,.1],[3,.08],[1,.08]]){
  const r=await page.evaluate(([i,o])=>__play(i,o),[n-1,{skin,press}]);
  results.push(r);
  assert.equal(r.state,'clear',`stage ${n} (skin ${skin}, press ${press}s) should clear on the beat: died at ${JSON.stringify(r.died)}`);
 }
 // Every stage, gimmick or not, clears when tapping on the beat with short or long presses.
 for(let n=1;n<=20;n++)for(const press of [.05,.12]){
  const r=await page.evaluate(([i,o])=>__play(i,o),[n-1,{press}]);
  assert.equal(r.state,'clear',`stage ${n} (press ${press}s) should clear on the beat: died at ${JSON.stringify(r.died)}`);
 }
 const kinds=await page.evaluate(()=>Object.fromEntries(Object.entries(stageGimmicks.PLAN).map(([n,p])=>[n,Object.keys(p.g||{})])));
 // Each gimmick actually appears in its stages.
 const typeFor={jelly:'jelly',cannon:'cannon',ball:'ball',stairs:'stair',prize:'prize',arm:'arm',route:'ledge',lift:'lift',ring:'ring',cake:'cake',match:'tile',pad:'pad'};
 for(const r of results.filter((_,k)=>k%4===0))for(const g of kinds[r.stage])if(typeFor[g])assert(r.types.includes(typeFor[g]),`stage ${r.stage} has no ${g}`);
 // Wrong choices fail where they should.
 for(const [n,wrong] of [[4,'pad'],[5,'ring'],[6,'cake'],[3,'jelly'],[7,'cannon'],[8,'cannon'],[11,'stairs'],[14,'arm'],[17,'match'],[18,'lift']]){
  const r=await page.evaluate(([i,o])=>__play(i,o),[n-1,{wrong,gimmick:wrong==='lift'?{sabi:true,lift:2}:undefined}]);
  assert.equal(r.state,'dead',`stage ${n}: the wrong ${wrong} choice must fail (${JSON.stringify(r)})`);
  assert(r.mistake!==null&&Math.abs(r.died.t-r.mistake)<2.5,`stage ${n}: failed for the ${wrong} mistake, not elsewhere (${JSON.stringify(r)})`);
 }
 const early=await page.evaluate(()=>__play(4,{wrong:'ringEarly',press:.05}));
 assert(early.state==='dead'&&Math.abs(early.died.t-early.mistake)<1,'stage 5: an early jump falls into the sky under the ring');
 // 3Match: on the beat, every group of three tiles makes a MATCH.
 for(const [n,rows] of [[17,6],[18,8]]){const r=await page.evaluate(i=>__play(i,{press:.08}),n-1);assert(r.state==='clear'&&r.groups===rows&&r.matches===r.groups,`stage ${n}: ${r.matches}/${r.groups} matches`);}
 // Skipping a hop leaves a block unswitched: the door stays shut and stops you there.
 const late=await page.evaluate(()=>__play(16,{wrong:'matchLate'}));
 assert(late.state==='dead'&&late.died&&late.died.near.includes('door'),`stage 17: a skipped block must leave the door shut (${JSON.stringify(late)})`);
 // Rescue: every ring passed on the beat scores IN!.
 const rs=await page.evaluate(()=>__play(4,{press:.08}));
 assert(rs.rings>=3&&rs.ringsIn===rs.rings,`stage 5: all rings passed cleanly (${rs.ringsIn}/${rs.rings})`);
 // Gravity flip stays on every stage that has it: a section that covered a zone moves it.
 const flips=await page.evaluate(()=>{const o=[];for(let i=0;i<20;i++){const s=STAGES[i],b=RHYTHM_BEATS[s.file].beats,d=AUDIO_TRACKS[s.file].duration;o.push([i+1,buildLevel(b,d,i+1,s.diff,null).zones.length,buildLevel(b,d,i+1,s.diff,s.gimmick||null).zones.length]);}return o;});
 // (Stages 7-8 are ~25s and the cannon fills them: no room, so no flip there.)
 const asked=await page.evaluate(()=>STAGES.slice(0,20).map(s=>s.gimmick?.flip||0));
 for(const [n,raw,g] of flips)if(n!==7&&n!==8)assert.equal(g,Math.max(raw,asked[n-1]),`stage ${n}: ${raw} flip zone(s) in the core chart, ${g} after the gimmicks`);
 // Route split: a long press takes the upper road, a tap stays below; both clear.
 const RG={sabi:true,route:2};
 const hi=await page.evaluate(g=>__play(16,{press:.16,gimmick:g}),RG),lo=await page.evaluate(g=>__play(16,{press:.04,gimmick:g}),RG);
 assert.deepEqual([hi.state,hi.upper,lo.state,lo.upper],['clear',true,'clear',false],'route: long press = upper road, tap = lower road');
 // Chorus highlight on every stage, x2 inside it only.
 const sabi=await page.evaluate(()=>{const out=[];for(let i=0;i<20;i++){setupRun(i,{duration:AUDIO_TRACKS[STAGES[i].file].duration},[]);practice=false;state='play';const z=stageGimmicks.inspect().sabi;if(!z){out.push(i+1);continue;}
  songPos=(z.start+z.end)/2;const a=stageGimmicks.mult();songPos=z.start-1;const b=stageGimmicks.mult();if(a!==2||b!==1)out.push(i+1);}return out;});
 assert.deepEqual(sabi,[],'every stage has a chorus highlight that doubles only inside it');
 // Mogu: it creeps closer over time and catches you; coins push it back.
 const mogu=await page.evaluate(()=>{setupRun(14,{duration:AUDIO_TRACKS[STAGES[14].file].duration},[]);practice=true;startAttempt(0);state='play';songPos=5;
  for(let k=0;k<1200;k++)stageGimmicks.ownsPlayer(1/60,0);const near=stageGimmicks.inspect().chase;
  for(let k=0;k<10;k++)stageGimmicks.onCoin();const back=stageGimmicks.inspect().chase;
  for(let k=0;k<3600&&state==='play';k++)stageGimmicks.ownsPlayer(1/60,0);return {creeps:near>1,coinsHelp:back<near-0.5,state};});
 assert.deepEqual(mogu,{creeps:true,coinsHelp:true,state:'dead'});
 // Retry resumes before a section, never inside it.
 const resume=await page.evaluate(()=>{setupRun(6,{duration:AUDIO_TRACKS[STAGES[6].file].duration},[]);const s=stageGimmicks.inspect().sections[0];return {s,off:stageGimmicks.safeOffset((s.from+s.to)/2)};});
 assert(resume.off<=resume.s.from,'revive offset moves before the cannon section');
 // Charts are deterministic, and stages without a gimmick are unchanged.
 const det=await page.evaluate(()=>{const f=i=>{const s=STAGES[i];return JSON.stringify(buildLevel(RHYTHM_BEATS[s.file].beats,AUDIO_TRACKS[s.file].duration,i+1,s.diff,s.gimmick||null));};return {same:f(7)===f(7),plain:JSON.stringify(STAGES[0].gimmick)==='{"sabi":true}'&&STAGES[19].world==='Rhythm Dash'};});
 assert.deepEqual(det,{same:true,plain:true});
 // Screens for review.
 fs.mkdirSync(path.join(root,'test-results'),{recursive:true});
 for(const [n,frac,name] of [[5,.0,'ring'],[6,.0,'cake'],[3,.0,'jelly'],[4,.0,'pad'],[7,.0,'cannon'],[10,.0,'ball'],[11,.0,'stairs'],[13,.0,'prize'],[14,.0,'arm'],[15,.3,'mogu'],[17,.0,'match'],[17,.0,'matchpre'],[1,.0,'sabi'],[19,.0,'dark']]){
  await page.evaluate(([i,name])=>{setupRun(i,{duration:AUDIO_TRACKS[STAGES[i].file].duration},[]);practice=true;startAttempt(0);state='play';$('menu').style.display='none';$('clearov').style.display='none';window.die=()=>{};
   const g=stageGimmicks.inspect();let t=3;
   if(name==='jelly')t=level.find(o=>o.type==='jelly').t-1.0;
   if(name==='ring')t=level.find(o=>o.type==='ring').t-0.04;
   if(name==='cake')t=level.find(o=>o.type==='cake'&&o.high).t-0.35;
   if(name==='ball')t=level.find(o=>o.type==='ball').t-0.55;
   if(name==='cannon'){const c=level.find(o=>o.type==='cannon'&&o.idx===1);t=c.fire-0.15;}
   if(name==='stairs')t=level.find(o=>o.type==='step'&&o.k===3).t-TAP_OFFSET-0.05;
   if(name==='prize'){const pz=level.find(o=>o.type==='prize');t=pz.t-TAP_OFFSET-pz.p*1.1;}
   if(name==='arm')t=level.find(o=>o.type==='arm').release-0.35;
   if(name==='pad')t=level.find(o=>o.type==='pad').t-0.45;
   if(name==='matchpre')t=level.find(o=>o.type==='step'&&o.k===0).t-TAP_OFFSET-0.3;
   if(name==='match')t=level.find(o=>o.type==='step'&&o.k===2).t-TAP_OFFSET+0.62;
   if(name==='lift')t=level.find(o=>o.type==='step'&&o.k===3).t-TAP_OFFSET-0.2;
   if(name==='sabi'){const z=stageGimmicks.inspect().sabi;t=z.start+0.8;practice=false;}
   if(name==='dark')t=(window.__dark=1,duration*.3+1.2);
   if(name==='mogu'){stageGimmicks.onJudge('miss');stageGimmicks.onJudge('miss');t=duration*.3;}
   if(name==='racing'){for(let k=0;k<3;k++)stageGimmicks.onJudge('perfect');t=duration*.3;}
   window.__shotT=t;
   // Warm up into the moment, tapping on the notes (and the arm) like the bot.
   const taps=level.filter(o=>!isFreeNote(o)).map(o=>o.t-TAP_OFFSET).concat(level.filter(o=>o.type==='arm').map(o=>o.t));
   const press=name==='route'?.16:.06;
   const realNow=performance.now;performance.now=()=>(songPos+1000)*1000;
   const start=Math.max(0,t-(['arm','stairs','route','lift'].includes(name)?3.5:1.5));
   for(songPos=start;songPos<t;){songPos+=1/240;if(taps.some(x=>Math.abs(x-songPos)<1/480))tapAt=songPos+1000;isDown=taps.some(x=>songPos>=x&&songPos<x+press);update(1/240,songPos);if(state!=='play')state='play';}
   performance.now=realNow;isDown=false;landAt=-9;window.cosmiiCharacterMotion?.reset?.();   // the warm-up ran on a test clock
   window.musicPosition=()=>window.__shotT;
  },[n-1,name]);
  await page.waitForTimeout(250);await page.screenshot({path:path.join(root,`test-results/gimmick-${name}.png`)});
 }
 assert.deepEqual(errors,[]);
 console.log('Stage gimmicks: all 20 stages clear on the beat (short and long presses), '+stages.length+' gimmick stages with 4 skin/press combinations; wrong pad/ring/cake/jelly/cannon/stairs/arm/match/lift choices fail; 3Match rows all MATCH and open their doors, a skipped block keeps the door shut; rescue rings IN; flip zones kept; long press takes the upper road; chorus x2 on every stage; mogu catch, safe resume, deterministic charts PASS');
}finally{await browser.close();server.close();}})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
