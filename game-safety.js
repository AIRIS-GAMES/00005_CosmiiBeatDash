/* Pause without resetting an attempt or consuming a daily try. */
(() => {
  const panel=document.createElement('section');panel.className='overlay';panel.id='pause-panel';panel.hidden=true;
  // Game-style card: pause icon, PAUSE logo, ▶ つづける / ホーム. The 3-2-1 before resuming shows as one big number.
  panel.innerHTML='<div class="panel-shell pause-shell"><span class="pause-icon" aria-hidden="true"><i></i><i></i></span><h2 id="pause-title">PAUSE</h2><small class="pause-sub">一時停止</small><p id="pause-note" role="status"></p><div class="pause-actions"><button id="resume-game">▶ つづける</button><button id="leave-game" aria-label="ホームに戻る">⌂ ホーム</button></div></div>';
  panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-labelledby','pause-title');app.appendChild(panel);
  let token=0,remainingShield=0,remainingGrace=0;
  function pause(){
    if(window.cosmiiTutorial?.active){window.cosmiiTutorial.pause();return;}
    if(state!=='play'&&state!=='paused')return;
    token++;
    if(state==='play'){
      const now=performance.now()/1000;
      remainingShield=Math.max(0,invulnUntil-now);remainingGrace=Math.max(0,feverGraceUntil-now);
      stopMusic();state='paused';isDown=false;tapAt=-9;
    }
    panel.hidden=false;panel.classList.remove('counting');$('pause-title').textContent='PAUSE';$('pause-note').textContent='';$('resume-game').disabled=false;$('resume-game').focus();
  }
  async function resume(){
    const request=++token;$('resume-game').disabled=true;
    if(!await ensureAudio()){$('pause-note').textContent='音が出せませんでした。もう一度タップしてね';$('resume-game').disabled=false;return;}
    $('pause-note').textContent='';panel.classList.add('counting');
    for(let n=3;n>0;n--){if(request!==token||state!=='paused')return;const title=$('pause-title');title.textContent=String(n);title.classList.remove('pop');void title.offsetWidth;title.classList.add('pop');await new Promise(r=>setTimeout(r,700));}
    if(request!==token||state!=='paused'||document.hidden)return;
    const now=performance.now()/1000;invulnUntil=now+remainingShield;feverGraceUntil=now+remainingGrace;
    isDown=false;tapAt=-9;prevT=performance.now();state='play';if(!window.resumeCountdown?.())playTrack(Math.max(0,songPos));panel.hidden=true;
  }
  $('resume-game').onclick=resume;
  $('leave-game').onclick=()=>{token++;panel.hidden=true;backToMenu();};
  $('backbtn').textContent='Ⅱ';$('backbtn').setAttribute('aria-label','一時停止');
  $('backbtn').onclick=()=>state==='play'?pause():backToMenu();
  document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
  window.addEventListener('keydown',e=>{if(e.code==='Escape'&&state==='play'){e.preventDefault();pause();}});
  window.gameSafety={pause,dismiss:()=>{token++;panel.hidden=true;}};
})();
