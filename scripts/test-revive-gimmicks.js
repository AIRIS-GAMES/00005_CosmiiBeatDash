// Scripted simulation starts after GO; real countdown is covered by test-html-audio.js.
// Revive inside a gimmick section: the run restarts just before the section and
// every gimmick in it works again (cannons visible and boardable, arms, blocks,
// middle roads, pads...), so the stage can still be cleared.
const assert=require('assert'),fs=require('fs'),path=require('path'),http=require('http');const {chromium}=require('playwright');const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{let file=path.resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]));if(file===root)file=path.join(root,'index.html');fs.readFile(file,(e,d)=>{if(e){res.writeHead(404);res.end();return;}const t={'.js':'application/javascript','.html':'text/html'}[path.extname(file)];if(t)res.setHeader('Content-Type',t);res.end(d);});});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch();try{
 const page=await browser.newPage({serviceWorkers:'block'});await page.route('https://**',r=>r.abort());
 await page.addInitScript(()=>localStorage.setItem('cosmii_dash_story_v1',JSON.stringify({intro:true,opening:true})));
 await page.goto('http://127.0.0.1:'+server.address().port+'/?analytics=off');await page.waitForFunction(()=>bootDone&&window.stageGimmicks);
 const checked=[];
 for(const n of [7,8,20,14,17,12,5,4]){
  const r=await page.evaluate(n=>{const i=n-1,cfg=STAGES[i];window.playTrack=()=>{};window.stopMusic=()=>{};
   setupRun(i,{duration:AUDIO_TRACKS[cfg.file].duration},[]);practice=false;startAttempt(0);countdown=null;state='play';
   const secs=stageGimmicks.inspect().sections;if(!secs.length)return {n,skip:true};
   const sec=secs[0],dieAt=Math.min(sec.to-0.2,sec.from+1.6);
   const plan=()=>[...level.filter(o=>!isFreeNote(o)||o.type==='arm').map(o=>o.type==='arm'?o.t:o.t-TAP_OFFSET),...stageGimmicks.inspect().biteTimes].sort((a,b)=>a-b);
   performance.now=()=>(songPos+1000)*1000;const step=1/240;
   const play=(until,taps)=>{while(state==='play'&&songPos<until){songPos+=step;while(taps.length&&taps[0]<=songPos){tapAt=songPos+1000;taps.shift();}isDown=false;update(step,songPos);}};
   // first try: play into the section, then die there
   let taps=plan();play(dieAt,taps);if(state!=='play')return {n,state,where:'before the section'};
   die();const diedAt=songPos;
   // revive from where it died
   startAttempt(Math.max(0,diedAt-1.5));countdown=null;state='play';songPos=attemptOffset-LEAD;const restart=attemptOffset;
   taps=plan().filter(t=>t>=songPos-0.02);play(duration+1,taps);
   return {n,kind:sec.kind,diedAt:+diedAt.toFixed(2),restart:+restart.toFixed(2),state};},n);
  if(r.skip)continue;
  assert.equal(r.state,'clear',`stage ${n}: after a revive inside its ${r.kind} section the run must still clear: ${JSON.stringify(r)}`);
  checked.push(n+':'+r.kind);
 }
 console.log('Revive inside a gimmick section ('+checked.join(', ')+'): the section works again and the stage clears PASS');
}finally{await browser.close();server.close();}})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
