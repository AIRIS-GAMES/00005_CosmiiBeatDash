// Scripted simulation starts after GO; real countdown is covered by test-html-audio.js.
// The goal must always be reached, even when the music stops early.
// A media element can stop a few frames short of its reported length (or
// stall); the run must still finish. Freezing in front of the goal is never OK.
const assert=require('assert'),fs=require('fs'),path=require('path'),http=require('http');const {chromium}=require('playwright');const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{let file=path.resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]));if(file===root)file=path.join(root,'index.html');fs.readFile(file,(e,d)=>{if(e){res.writeHead(404);res.end();return;}const t={'.js':'application/javascript','.html':'text/html'}[path.extname(file)];if(t)res.setHeader('Content-Type',t);res.end(d);});});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch();try{
 const page=await browser.newPage({serviceWorkers:'block'});await page.route('https://**',r=>r.abort());
 await page.addInitScript(()=>localStorage.setItem('cosmii_dash_story_v1',JSON.stringify({intro:true,opening:true})));
 await page.goto('http://127.0.0.1:'+server.address().port+'/?analytics=off');await page.waitForFunction(()=>bootDone&&window.stageGimmicks);
 // Every stage's goal is before the end of its audio file, with room to spare.
 const ends=await page.evaluate(()=>STAGES.slice(0,20).map((s,i)=>{const bts=RHYTHM_BEATS[s.file].beats;return {n:i+1,end:stageEnd(s,bts,AUDIO_TRACKS[s.file].duration),audio:AUDIO_TRACKS[s.file].duration};}));
 for(const e of ends)assert(e.end<=e.audio-0.55,`stage ${e.n}: goal ${e.end}s is too close to the audio end ${e.audio}s`);
 // The music position stops 0.4s short of the goal (and reports ended): the run still clears.
 for(const stall of ['ended','stalled']){
  const r=await page.evaluate(stall=>{const i=0,cfg=STAGES[i];setupRun(i,{duration:AUDIO_TRACKS[cfg.file].duration},[]);practice=true;startAttempt(0);countdown=null;state='play';
   die=()=>{};let t=-LEAD;const stopAt=duration-0.4;window.musicPosition=()=>Math.min(t,stopAt);window.musicEnded=()=>stall==='ended'&&t>=stopAt;
   for(let k=0;k<60*60&&state==='play';k++){t+=1/60;update(1/60);}return {state,songPos,duration};},stall);
  assert.equal(r.state,'clear',`music ${r.state==='play'?'froze':'ended'} before the goal (${stall}): ${JSON.stringify(r)}`);
 }
 console.log('Goal: every stage ends 0.55s+ before its audio; a stopped or ended track still reaches the goal PASS');
}finally{await browser.close();server.close();}})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
