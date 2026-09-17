/* Shared presentation layer. Gameplay and save rules remain in index.html. */
(() => {
  window.openResultDetails=()=>{
    const dialog=$('result-details'),parent=dialog.parentElement,opener=$('result-details-open');
    app.appendChild(dialog);
    const background=[...app.children].filter(el=>el!==dialog).map(el=>[el,el.inert]);
    background.forEach(([el])=>el.inert=true);
    const close=()=>{
      dialog.hidden=true;background.forEach(([el,inert])=>el.inert=inert);
      parent.appendChild(dialog);opener.focus({preventScroll:true});
    };
    dialog.querySelector('button').onclick=close;
    dialog.onkeydown=e=>{
      if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();}
      if(e.key==='Tab'){e.preventDefault();dialog.querySelector('button').focus();}
    };
    dialog.hidden=false;dialog.querySelector('.result-scroll').scrollTop=0;
    dialog.querySelector('h2').focus({preventScroll:true});
  };
  const menu=$('menu'), stage=$('stagecol');
  const header=document.createElement('header');header.id='home-header';
  header.innerHTML='<div class="wordmark">COSMII <span>RHYTHM DASH</span></div>';
  header.appendChild($('coinsdisp'));menu.prepend(header);
  const continueButton=document.createElement('button');continueButton.id='continue-btn';
  stage.insertBefore(continueButton,stage.firstChild);
  if($('collab-banner'))stage.insertBefore($('collab-banner'),continueButton);
  const nav=document.createElement('div');nav.className='home-nav';
  nav.append($('stageSelectBtn'),$('dailybtn'));stage.appendChild(nav);
  const footer=document.createElement('footer');footer.id='home-footer';
  footer.innerHTML='<span>タップでジャンプ、長押しで高さを調整</span><button id="missions-open">ミッション</button><button id="more-open">その他</button>';
  menu.appendChild(footer);
  const avatar=document.createElement('button');avatar.id='avatar-btn';avatar.setAttribute('aria-label','キャラクターを選ぶ');
  $('charcol').prepend(avatar);avatar.appendChild($('charimg'));
  const avatarLabel=document.createElement('span');avatarLabel.textContent='キャラクターを変更';avatar.appendChild(avatarLabel);
  const panel=document.createElement('section');panel.id='ui-panel';panel.className='overlay';panel.hidden=true;
  panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-labelledby','panel-title');
  panel.innerHTML='<div class="panel-shell"><header><h2 id="panel-title"></h2><button id="panel-close">閉じる</button></header><div id="panel-content"></div></div>';
  app.appendChild(panel);
  const sections={};
  for(const [key,id] of [['skins','skins'],['missions','missions'],['more','promobanner']]){
    const section=document.createElement('div');section.className='panel-section';section.hidden=true;
    section.appendChild($(id));$('panel-content').appendChild(section);sections[key]=section;
  }
  const help=document.createElement('p');help.className='help-text';
  help.textContent='操作：画面タップ／スペースキーでジャンプ。長押しで高く跳べます。SUN POWERが満タンになると、いつもの操作のまま無敵・スコアとコイン2倍。';sections.more.prepend(help);
  let opener=null;
  window.reducedEffects=localStorage.getItem('rdash_reduced_effects')==='1'||(localStorage.getItem('rdash_reduced_effects')===null&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  const effectsButton=document.createElement('button');effectsButton.id='effects-setting';
  const renderEffects=()=>{effectsButton.textContent='演出を控えめに：'+(window.reducedEffects?'ON':'OFF');effectsButton.setAttribute('aria-pressed',String(window.reducedEffects));};
  effectsButton.onclick=()=>{window.reducedEffects=!window.reducedEffects;localStorage.setItem('rdash_reduced_effects',window.reducedEffects?'1':'0');renderEffects();};renderEffects();sections.more.prepend(effectsButton);
  function openPanel(key,title,from){opener=from;$('panel-title').textContent=title;for(const [k,s] of Object.entries(sections))s.hidden=k!==key;panel.hidden=false;$('panel-close').focus();}
  function closePanel(){panel.hidden=true;opener?.focus();}
  $('panel-close').onclick=closePanel;
  panel.addEventListener('keydown',e=>{if(e.key==='Escape')closePanel();if(e.key==='Tab'){const buttons=[...panel.querySelectorAll('button')].filter(b=>b.getClientRects().length);const first=buttons[0],last=buttons[buttons.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});
  avatar.onclick=()=>openPanel('skins','キャラクター',avatar);
  $('missions-open').onclick=()=>openPanel('missions','今日のミッション',$('missions-open'));
  $('more-open').onclick=()=>openPanel('more','遊び方・その他',$('more-open'));
  const effects={score:'PERFECTの得点 +10%',judge:'タイミング判定がやさしく',coin:'コインを引き寄せる',hold:'長押しジャンプを強化',shield:'ミスを1回ガード'};
  function refresh(){
    help.textContent='画面タップ／スペースキーでジャンプ。長押しで高く跳べます。光るタイミングに合わせて跳び、空中のオーブはタップで追加ジャンプ。FLIP区間では天井を走ります。'+(window.collaboration?.active()?'SUN POWER満タンで10秒間無敵・スコアとコイン2倍。':'POWER満タンで7秒間スコアとコイン2倍（無敵なし）。')+' Ⅱボタン／Escで一時停止。';
    let last=Number(localStorage.getItem('rdash_last_stage'));
    if(!Number.isInteger(last)||last<0||last>=NSTAGE||!unlocked(last))last=0;
    if(best(last)>=100&&last+1<NSTAGE&&unlocked(last+1))last++;
    continueButton.innerHTML='<small>CONTINUE · STAGE '+(last+1)+'</small><b>'+(best(last)||clearedCount()?'つづきから':'はじめる')+'</b><span>▶</span>';
    continueButton.onclick=()=>selectStage(last);
    $('skineffect').textContent=effects[currentSkin().effect]||currentSkin().desc;
    $('cleared').textContent=clearedCount()+' / '+NSTAGE+' ステージクリア';
    $('dailybtn').innerHTML='デイリー <small>残り '+dailyTriesLeft()+' / 3</small>';
    for(const [i,b] of [...$('skins').children].entries()){
      b.setAttribute('aria-label',SKINS[i].n+'：'+(effects[SKINS[i].effect]||SKINS[i].desc));
      b.title=b.getAttribute('aria-label');
      const name=document.createElement('span');name.textContent=SKINS[i].n;b.appendChild(name);
      if(!skinUnlocked(i)){const price=document.createElement('small');price.textContent=`${SKINS[i].need}クリア / ${skinPrice(i)}コイン`;b.appendChild(price);}
    }
  }
  let previousCombo=0,milestone=0,milestoneUntil=0;
  let pauseSpace=72;
  function measurePauseSpace(){
    const style=getComputedStyle($('backbtn'));
    pauseSpace=parseFloat(style.right)+parseFloat(style.width)+12;
  }
  addEventListener('resize',measurePauseSpace);measurePauseSpace();
  function drawHUD(g){
    const now=performance.now()/1000;
    if(combo>previousCombo&&Math.floor(combo/10)>Math.floor(previousCombo/10)){milestone=Math.floor(combo/10)*10;milestoneUntil=now+0.8;}previousCombo=combo;
    const percent=Math.max(0,Math.min(100,songPos/duration*100)),width=Math.min(W*0.32,230);
    g.fillStyle='#101b32e8';roundRect(W/2-width/2-12,10,width+24,35,10);g.fill();
    g.fillStyle='#34415b';roundRect(W/2-width/2,21,width,5,2.5);g.fill();
    if(percent>0){g.fillStyle='#82def2';roundRect(W/2-width/2,21,width*percent/100,5,2.5);g.fill();}
    g.font='600 10px "M PLUS Rounded 1c", sans-serif';g.fillStyle='#d7e2f1';g.textAlign='center';g.fillText(Math.floor(percent)+'%  ·  GOAL',W/2,39);
    const scoreRight=W-pauseSpace*DH/Math.min(innerWidth,innerHeight);
    const scoreLeft=Math.max(scoreRight-141,W/2+width/2+24);
    g.fillStyle='#101b32e8';roundRect(scoreLeft,10,scoreRight-scoreLeft,41,10);g.fill();
    g.textAlign='right';g.fillStyle='#91a5c1';g.font='600 9px "M PLUS Rounded 1c", sans-serif';g.fillText('SCORE',scoreRight-12,24);
    g.fillStyle='#fff';g.font='900 18px "M PLUS Rounded 1c", sans-serif';g.fillText(score.toLocaleString(),scoreRight-12,43,scoreRight-scoreLeft-24);
    if(now<milestoneUntil&&state==='play'){g.textAlign='center';g.font='900 19px "M PLUS Rounded 1c", sans-serif';g.fillStyle='#ffe58a';g.fillText(milestone+' COMBO',W/2,76);}
    if(!window.sunRhythm?.enabled()&&fever>0.02){
      const x=W/2-110,y=DH-42;g.fillStyle='#101b32ef';roundRect(x,y,220,30,10);g.fill();
      g.fillStyle='#ffe58a';g.font='bold 11px "M PLUS Rounded 1c", sans-serif';g.textAlign='left';g.fillText(feverOn?'FEVER':'POWER',x+12,y+19);
      g.fillStyle='#34415b';g.fillRect(x+77,y+12,80,6);g.fillStyle='#ffe58a';g.fillRect(x+77,y+12,80*fever,6);
      if(feverOn){g.textAlign='right';g.fillText(Math.max(0,feverEnd-songPos).toFixed(1)+'s',x+207,y+19);}
    }
    if(state==='ready'){
      g.fillStyle='#101b32ee';roundRect(W/2-175,92,350,113,16);g.fill();
      g.textAlign='center';g.fillStyle='#94afca';g.font='600 12px "M PLUS Rounded 1c", sans-serif';g.fillText(STAGES[stageIdx].name,W/2,115);
      g.fillStyle='#fff';g.font='900 23px "M PLUS Rounded 1c", sans-serif';g.fillText('タップしてスタート',W/2,146);
      g.font='12px "M PLUS Rounded 1c", sans-serif';g.fillStyle='#c6d5e6';g.fillText(effects[currentSkin().effect]||currentSkin().desc,W/2,171);
      g.fillText('タップでジャンプ · 長押しで高く',W/2,190);
    }
    g.textAlign='left';
  }
  window.gameUI={refresh,drawHUD};refresh();
})();
