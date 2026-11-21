/* Per-frame drawing must stay cheap, and protected collisions must not stall
   the rest of the step. Regression coverage for:
   - no ctx.filter while drawing a frame (it renders an offscreen layer per call;
     the HUD panel used it 18 times per frame)
   - no large source images (>640px) drawn per frame; sheets are cut at load
   - HUD does not read layout every frame
   - a shielded/invulnerable overlap still collects coins and keeps updating
   - a judged note never swallows an early jump for the next note
   - walking off a tall block onto a lower one starts a fall */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright'),root=path.resolve(__dirname,'..');
const types={'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.mp3':'audio/mpeg','.wav':'audio/wav','.woff2':'font/woff2'};
const server=http.createServer((req,res)=>{let file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(req.url.split('?')[0].endsWith('/'))file=path.join(file,'index.html');if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');require('./serve-file')(req,res,file);});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch();try{
 const page=await browser.newPage({viewport:{width:844,height:390},deviceScaleFactor:2,serviceWorkers:'block'});
 await page.route('https://**',r=>r.abort());const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{localStorage.setItem('cosmii_dash_story_v1',JSON.stringify({intro:true,opening:true}));localStorage.setItem('cosmii_tutorial_v2','done');localStorage.setItem('rdash_best_0','100');if(!localStorage.getItem('rdash_ghosts_cleared'))localStorage.setItem('rdash_v3beat_normal_ghost_3','[1,2]');localStorage.setItem('rdash_v2_normal_hs_3','999');});
 await page.goto('http://127.0.0.1:'+server.address().port+'/?analytics=off');
 await page.waitForFunction(()=>bootDone&&getComputedStyle($('splash')).display==='none'&&['panel','progress','words','japanese'].every(k=>document.documentElement.classList.contains('art-'+k+'-ready')));
 await page.evaluate(()=>$('loginov').style.display='none');
 await page.evaluate(()=>selectStage(10));await page.waitForFunction(()=>state==='ready'&&musicEl.readyState>=2);
 await page.locator('#cv').click({position:{x:400,y:200}});await page.waitForFunction(()=>state==='play'&&songPos>1);

 const frame=await page.evaluate(async()=>{
  window.die=()=>{};floats.push({text:'PERFECT!',x:300,y:200,l:1,c:'#fff'},{text:'NEAR!',x:300,y:180,l:1,c:'#fff'});
  skinIdx=0;cosmiiCharacterMotion.emit('judge');
  const proto=CanvasRenderingContext2D.prototype,desc=Object.getOwnPropertyDescriptor(proto,'filter'),drawImage=proto.drawImage;
  let inDraw=false,filters=0,bigSources=new Set(),layoutReads=0;
  if(desc)Object.defineProperty(proto,'filter',{configurable:true,get(){return desc.get.call(this);},set(v){if(inDraw&&v&&v!=='none')filters++;desc.set.call(this,v);}});
  proto.drawImage=function(src){if(inDraw&&src instanceof HTMLImageElement&&Math.max(src.naturalWidth,src.naturalHeight)>640)bigSources.add(src.src.split('/').pop());return drawImage.apply(this,arguments);};
  const off=Object.getOwnPropertyDescriptor(HTMLElement.prototype,'offsetLeft');
  Object.defineProperty(HTMLElement.prototype,'offsetLeft',{configurable:true,get(){if(inDraw)layoutReads++;return off.get.call(this);}});
  const realDraw=window.draw;window.draw=function(){inDraw=true;try{return realDraw.apply(this,arguments);}finally{inDraw=false;}};
  await new Promise(r=>{let n=0;(function f(){if(++n<40)requestAnimationFrame(f);else r();})();});
  window.draw=realDraw;proto.drawImage=drawImage;if(desc)Object.defineProperty(proto,'filter',desc);Object.defineProperty(HTMLElement.prototype,'offsetLeft',off);
  return {filters,bigSources:[...bigSources],layoutReads};
 });
 assert.equal(frame.filters,0,'no ctx.filter while drawing frames');
 assert.deepEqual(frame.bigSources,[],'no large source images drawn per frame');
 assert.ok(frame.layoutReads<=1,'HUD layout is read once, not every frame (got '+frame.layoutReads+')');

 const logic=await page.evaluate(()=>{
  window.musicPosition=()=>songPos;   // freeze the loop on the current position
  const base=songPos,out={};
  // 1) protected overlap: coin collected, run continues
  level=[{t:base,type:'block'}];flipZones=[];orbsLive=[];player.x=W*.3;player.y=GROUND-B;player.vy=0;player.grounded=true;lastGdir=1;
  coinsLive=[{t:base+.01,y:GROUND-B/2,got:false}];const coins0=coinRun;invulnUntil=performance.now()/1000+5;
  update(1/60,base+.005);out.protectedCoin=coinsLive[0].got&&coinRun>coins0;out.protectedState=state;
  invulnUntil=0;
  // 2) judged note does not swallow the next one
  level=[{t:base+1},{t:base+1.3}].map(o=>({...o,type:'spike'}));judgedNotes.clear();judgedNotes.add(0);noteJudgeIdx=1;
  songPos=base+1-TAP_OFFSET+.13;skinIdx=0;judge();out.nextJudged=judgedNotes.has(1);
  // 3) ledge: stand on a tall block above a lower one, then fall
  level=[{t:base+3,type:'block'}];coinsLive=[];noteJudgeIdx=level.length;nearIdx=level.length;
  player.y=GROUND-B*1.65-B;player.vy=0;player.grounded=true;
  update(1/60,base+3);out.ledgeFalls=!player.grounded;
  return out;
 });
 assert.equal(logic.protectedCoin,true,'protected overlap still collects coins');
 assert.equal(logic.protectedState,'play');
 assert.equal(logic.nextJudged,true,'early jump for the next note is judged');
 assert.equal(logic.ledgeFalls,true,'walking off a ledge onto a lower block falls');
 // A retry judges from its own start, not from where the last run ended.
 const retry=await page.evaluate(()=>{window.playTrack=()=>{};window.stopMusic=()=>{};setupRun(0,{duration:AUDIO_TRACKS[STAGES[0].file].duration},[]);practice=true;noteJudgeIdx=level.length;startAttempt(0);const first=noteJudgeIdx;noteJudgeIdx=level.length;const mid=level[Math.floor(level.length/2)].t;startAttempt(mid);return {first,expect:level.findIndex(o=>o.t-TAP_OFFSET>=-0.3),mid:level[noteJudgeIdx]&&level[noteJudgeIdx].t-TAP_OFFSET>=mid-0.3-1e-9&&(noteJudgeIdx===0||level[noteJudgeIdx-1].t-TAP_OFFSET<mid-0.3)};});
 assert.equal(retry.first,retry.expect,'a retry from the start judges from the first note');
 assert.equal(retry.mid,true,'a resumed run judges from its resume point');
 const stored=await page.evaluate(()=>({ghost:localStorage.getItem('rdash_v3beat_normal_ghost_3'),hs:localStorage.getItem('rdash_v2_normal_hs_3')}));
 assert.deepEqual(stored,{ghost:null,hs:'999'},'stored ghosts are removed once; other records stay');
 assert.deepEqual(errors,[]);
 console.log('Frame cost: no canvas filters, no large per-frame sources, cached HUD layout; protected-overlap coins, next-note judge, retry judge reset, ledge fall, ghost cleanup PASS');
}finally{await browser.close();server.close();}})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
