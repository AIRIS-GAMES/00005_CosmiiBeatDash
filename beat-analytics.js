/* PSF v1: bounded event names, no user input/URLs/identifiers in payloads. */
(() => {
  const query=new URLSearchParams(location.search);
  const native=location.protocol==='capacitor:';
  const local=/^(localhost|127\.|192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(location.hostname);
  const enabled=!navigator.webdriver&&query.get('analytics')!=='off'&&!query.has('demo')&&(native||!local||query.get('analytics')==='on');
  const build=(native?'ios':'web')+'-psf-1.1.0';
  window.beatAnalytics={enabled,build};
  const capture=!enabled&&(navigator.webdriver||query.get('analytics')==='off');
  function send(method,...args){try{
    if(capture&&typeof window.__beatAnalyticsSink==='function')window.__beatAnalyticsSink(method,...args);
    if(enabled&&typeof window.GameAnalytics==='function')window.GameAnalytics(method,...args);
  }catch{}}
  window.beatAnalytics.send=send;
  const KEY='cosmii_beat_psf_v1';let saved;
  try{saved=JSON.parse(localStorage.getItem(KEY)||'null');}catch{}
  if(!saved){let legacy=false;try{legacy=Object.keys(localStorage).some(k=>/^rdash_(best_|v2_|skinbuy_|last_stage|dt_)/.test(k));}catch{}saved={version:1,legacy,attempts:0,completed:false};}
  const persist=()=>{try{localStorage.setItem(KEY,JSON.stringify(saved));}catch{}};persist();
  const colors=['red','blue','pink','green','purple'];
  const color=()=>colors[typeof skinIdx==='number'?skinIdx:0]||'red';
  const mode=()=>dailyMode()?'daily':'normal';
  const stage=()=>dailyMode()?'daily':`s${String(stageIdx+1).padStart(2,'0')}`;
  function event(action,a='all',b='all',value=1){
    if(!/^[a-z0-9_]+$/.test(action+a+b)||[action,a,b].some(s=>s.length>32)||!Number.isFinite(value))return;
    send('addDesignEvent',`BeatPSF:v1:${action}:${a}:${b}`,value);
  }
  let run=null;
  function start(offset=0,newAttempt=true){
    if(practice||window.cosmiiTutorial?.active)return;
    if(offset>0||!newAttempt){
      if(run&&!run.ended)return; // ordinary pause/resume is not a new attempt
      if(run){run={...run,ended:false,resumed:true};event('run_resume',run.track,run.character);}
      return;
    }
    const kind=saved.legacy?'legacy':saved.attempts===0?'first':'retry';
    saved.attempts++;persist();
    run={kind,track:mode()+'_'+stage(),character:color(),ended:false,resumed:false,skills:new Set()};
    event('run_start',run.track,kind+'_'+run.character);
    event('character_play',run.character,mode());
  }
  function end(outcome){
    if(!run||run.ended||practice||window.cosmiiTutorial?.active)return;
    run.ended=true;
    event('run_'+outcome,run.track,(run.resumed?'resumed':run.kind)+'_'+run.character);
    event('run_progress',run.track,outcome,Math.max(0,Math.min(100,songPos/duration*100)));
    if(outcome==='complete'){
      event('result_shown',run.track,run.character);
      if(!saved.completed){saved.completed=true;persist();if(!saved.legacy)event('first_complete',run.resumed?'resumed':run.kind,run.character,Math.max(0,songPos));}
    }
  }
  function skill(name){if(!run||run.ended||practice||window.cosmiiTutorial?.active||run.skills.has(name))return;run.skills.add(name);event('skill_experienced',name,run.character);}
  function legacy(id){
    if(id.startsWith('Run:FailPct:'))end('fail');
    if(id.startsWith('Run:CompleteScore:'))end('complete');
    if(id.startsWith('Run:Exit:'))end('exit');
    if(id.startsWith('Power:Shield:'))skill('shield');
    if(id.startsWith('Skin:Select:'))event('character_select',color(),'unlocked');
    if(id.startsWith('Skin:Buy:'))event('character_unlock',color(),'coins');
  }
  function profile(index,source,unlocked){
    const c=colors[index]||'red',s=['home','album','profile'].includes(source)?source:'home';
    event(unlocked?'profile_display':'profile_locked',s,c);
    if(unlocked)event('interest','profile',s+'_'+c);
  }
  function external(destination,source){if(['x','tiktok','instagram'].includes(destination)){event('external_click',source,destination);event('interest','sns',source+'_'+destination);}}
  // Entry impressions: once per visible visit, never from hidden menu refreshes.
  addEventListener('DOMContentLoaded',()=>{
    const ids={'world-profiles-open':'profile','social-open':'sns','world-album-open':'album'};
    let homeVisible=false;
    const checkHome=()=>{const menu=document.getElementById('menu');const on=!document.hidden&&menu?.getClientRects().length>0&&![...document.querySelectorAll('#app .overlay')].some(el=>el!==menu&&el.getClientRects().length>0);if(on&&!homeVisible)for(const [id,name] of Object.entries(ids)){if(document.getElementById(id)?.getClientRects().length)event('entry_shown','home',name);}homeVisible=on;};
    setInterval(checkHome,500);checkHome();
    document.addEventListener('click',e=>{
      const id=e.target.closest('button')?.id;
      if(id==='social-open')event('social_open','home');
      if(id==='nextbtn'&&!practice)event(stageIdx===NSTAGE-1||dailyMode()?'retry_click':'next_track','result',stage());
      if(id==='revivebtn'&&!practice)event('revive_click','game',stage());
    });
  });
  // The JS SDK starts its first session at initialize; resume needs an explicit session.
  let sessionOpen=true;
  const suspendSession=()=>{if(!sessionOpen)return;if(run&&!run.ended)event('run_background',run.track,run.character);send('endSession');sessionOpen=false;};
  const resumeSession=()=>{if(sessionOpen||document.hidden)return;send('startSession');sessionOpen=true;};
  document.addEventListener('visibilitychange',()=>document.hidden?suspendSession():resumeSession());
  addEventListener('pagehide',suspendSession);addEventListener('pageshow',resumeSession);
  addEventListener('DOMContentLoaded',()=>{if(document.hidden)suspendSession();});
  // Keep analytics failures out of game control flow, including storage restrictions.
  const safe=fn=>(...args)=>{try{return fn(...args);}catch{}};
  window.beatPSF=Object.fromEntries(Object.entries({event,start,end,skill,legacy,profile,external}).map(([k,v])=>[k,safe(v)]));
})();
