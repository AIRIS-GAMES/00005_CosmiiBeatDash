/* Pause without resetting an attempt or consuming a daily try. */
(() => {
  const panel=document.createElement('section');panel.className='overlay';panel.id='pause-panel';panel.hidden=true;
  panel.innerHTML='<div class="panel-shell"><h2 id="pause-title">一時停止</h2><p>音楽とゲームを停止しています</p><button id="resume-game">つづける</button><button id="leave-game">ホームに戻る</button></div>';
  panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-labelledby','pause-title');app.appendChild(panel);
  let token=0,remainingShield=0,remainingGrace=0;
  function pause(){
    if(state!=='play'&&state!=='paused')return;
    token++;
    if(state==='play'){
      const now=performance.now()/1000;
      remainingShield=Math.max(0,invulnUntil-now);remainingGrace=Math.max(0,feverGraceUntil-now);
      missionSave?.(); window.collaboration?.flush?.();
      flushPendingCoins?.(); flushAnalytics?.();
      stopMusic();state='paused';isDown=false;tapAt=-9;
    }
    panel.hidden=false;$('pause-title').textContent='一時停止';$('resume-game').disabled=false;$('resume-game').focus();
  }
  async function resume(){
    const request=++token;$('resume-game').disabled=true;
    if(!await ensureAudio()){$('pause-title').textContent='音声を再開できません。もう一度お試しください';$('resume-game').disabled=false;return;}
    for(let n=3;n>0;n--){if(request!==token||state!=='paused')return;$('pause-title').textContent=String(n);await new Promise(r=>setTimeout(r,700));}
    if(request!==token||state!=='paused'||document.hidden)return;
    if(runRecordMode==='sun'&&!window.collaboration?.active()){panel.hidden=true;backToMenu();return;}
    const now=performance.now()/1000;invulnUntil=now+remainingShield;feverGraceUntil=now+remainingGrace;
    isDown=false;tapAt=-9;prevT=performance.now();state='play';playTrack(Math.max(0,songPos));panel.hidden=true;
  }
  $('resume-game').onclick=resume;
  $('leave-game').onclick=()=>{token++;panel.hidden=true;backToMenu();};
  $('backbtn').textContent='Ⅱ';$('backbtn').setAttribute('aria-label','一時停止');
  $('backbtn').onclick=()=>state==='play'?pause():backToMenu();
  document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
  window.addEventListener('keydown',e=>{if(e.code==='Escape'&&state==='play'){e.preventDefault();pause();}});
  window.gameSafety={pause,dismiss:()=>{token++;panel.hidden=true;}};
})();
