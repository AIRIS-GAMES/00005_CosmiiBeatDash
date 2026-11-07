// Uses the main renderer, player, input and update() physics in a reward-free practice scene.
(() => {
  const KEY='cosmii_tutorial_v2';let active=false,promise,resolveRun,step=0,peak=0,jumped=false,success=false,paused=false,entry='optional';
  const guide=document.createElement('section');guide.id='live-tutorial';guide.hidden=true;
  guide.innerHTML='<div class="tutorial-instruction"><strong id="tutorial-title"></strong><p id="tutorial-message"></p><small id="tutorial-feedback" role="status"></small></div><div class="tutorial-actions"><button id="tutorial-skip">練習をおわる</button><button id="tutorial-resume" hidden>練習をつづける</button><button id="tutorial-next" hidden>次へ</button></div>';
  app.append(guide);const q=id=>guide.querySelector('#'+id);
  const lessons=[['タップでジャンプ','画面を短くタップして、ジャンプしてみよう。'],['長押しで高くジャンプ','画面を押したままにして、高く跳んでみよう。'],['オーブで追加ジャンプ','ジャンプして光る輪に近づき、もう一度タップ！ 押したままでも使えるよ。']];
  function prepare(){
    peak=0;jumped=false;success=false;isDown=false;tapAt=-9;holdJump=0;
    player.y=GROUND-B;player.vy=0;player.grounded=true;lastGdir=1;
    orbsLive=step===2?[{t:songPos+.06,y:GROUND-90,used:false}]:[];
    floats.length=0;rings.length=0;particles.length=0;
    q('tutorial-title').textContent=`${step+1} / 3　${lessons[step][0]}`;q('tutorial-message').textContent=lessons[step][1];q('tutorial-feedback').textContent='コイン・記録は変わりません。何度でも試せます。';q('tutorial-next').hidden=true;
  }
  function run(source='optional'){
    if(active)return promise;
    promise=new Promise(r=>resolveRun=r);active=true;paused=false;step=0;
    entry=source==='onboarding'?'onboarding':'optional';window.beatPSF?.event('tutorial_start',entry);
    $('ui-panel').hidden=true;$('menu').style.display='none';$('stageSelect').style.display='none';$('loginov').style.display='none';
    const track=AUDIO_TRACKS[STAGES[0].file];setupRun(0,{duration:track.duration},[]);stopMusic();
    practice=true;duration=1e6;level=[];beats=[];flipZones=[];coinDefs=[];coinsLive=[];orbDefs=[];ghost=null;
    score=0;combo=0;maxCombo=0;coinRun=0;songPos=0;beatIdx=0;noteJudgeIdx=0;nearIdx=0;state='play';
    guide.hidden=false;q('tutorial-resume').hidden=true;$('backbtn').style.display='none';prepare();return promise;
  }
  function finish(){
    if(!active)return;window.beatPSF?.event(step===2&&success?'tutorial_complete':'tutorial_exit',entry,'step_'+(step+1));localStorage.setItem(KEY,'done');active=false;guide.hidden=true;isDown=false;tapAt=-9;
    state='menu';coinRun=0;backToMenu();practice=false;resolveRun(true);$('help-open').focus();
  }
  function pause(){if(!active)return;paused=true;isDown=false;tapAt=-9;q('tutorial-resume').hidden=false;q('tutorial-feedback').textContent='練習を一時停止しています。';}
  function tick(dt){
    if(paused||document.hidden)return;
    if(step===2&&!orbsLive[0]?.used)orbsLive[0].t=songPos+.06;
    update(dt,songPos+dt);
    peak=Math.max(peak,GROUND-B-player.y);if(!player.grounded)jumped=true;
    if(!success&&((step===0&&jumped&&player.grounded)||(step===1&&peak>=105&&player.grounded)||(step===2&&orbsLive[0]?.used))){
      success=true;window.beatPSF?.event('tutorial_step',entry,'step_'+(step+1));q('tutorial-feedback').textContent=step===2?'できた！空中でも、もう一度ジャンプできました。':'できた！ 次の練習へ進もう。';q('tutorial-next').textContent=step===2?'練習をおわる':'次の練習へ';q('tutorial-next').hidden=false;
    }else if(!success&&jumped&&player.grounded&&step===1){q('tutorial-feedback').textContent='もう少し長く押してみよう。';jumped=false;peak=0;}
  }
  q('tutorial-skip').onclick=finish;q('tutorial-next').onclick=()=>{if(step===2)finish();else{step++;prepare();}};
  q('tutorial-resume').onclick=()=>{paused=false;q('tutorial-resume').hidden=true;q('tutorial-feedback').textContent='続けて練習しよう。';};
  $('help-open').onclick=run;
  window.cosmiiTutorial={run,tick,pause,get active(){return active;},before:i=>i===0&&!DEMO&&!localStorage.getItem(KEY)&&!localStorage.getItem('cosmii_tutorial_v1')&&best(0)===0?run('onboarding'):Promise.resolve(true)};
})();
