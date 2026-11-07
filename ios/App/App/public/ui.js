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
  const missionIntro=document.createElement('p');missionIntro.className='mission-intro';missionIntro.textContent='今日の3つのお題です。達成するとコインを自動でもらえます。お題と進み具合は毎日リセットされます。';sections.missions.prepend(missionIntro);
  const missionPopup=document.createElement('aside');missionPopup.id='mission-popup';missionPopup.hidden=true;missionPopup.setAttribute('role','status');missionPopup.setAttribute('aria-live','polite');missionPopup.setAttribute('aria-atomic','true');app.append(missionPopup);
  const missionQueue=[];let missionShowing=false;
  function showNextMission(){
    if(!missionQueue.length){missionShowing=false;missionPopup.hidden=true;return;}
    missionShowing=true;const m=missionQueue.shift();missionPopup.replaceChildren();
    const label=document.createElement('strong');label.textContent='✓ ミッション達成！';
    const description=document.createElement('span');description.textContent=m.desc;
    const reward=document.createElement('small');reward.textContent=`＋${m.reward}コインを獲得`;missionPopup.append(label,description,reward);missionPopup.hidden=false;
    setTimeout(showNextMission,3600);
  }
  function notifyMission(m){missionQueue.push(m);if(!missionShowing)showNextMission();}
  const help=document.createElement('p');help.className='help-text';
  help.textContent='操作：画面タップ／スペースキーでジャンプ。長押しで高く跳べます。';
  for(const key of ['help','social','games']){const s=document.createElement('div');s.className='panel-section';s.hidden=true;$('panel-content').append(s);sections[key]=s;}
  sections.help.append(help);$('promobanner').hidden=true;
  const addLinks=(section,items)=>{const list=document.createElement('div');list.className='home-link-list';for(const [label,url] of items){const a=document.createElement('a');a.textContent=label+' ↗';a.href=url;a.target='_blank';a.rel='noopener noreferrer';list.append(a);}section.append(list);};
  sections.social.classList.add('social-section');
  sections.social.innerHTML=`<p class="social-intro">ゲームの外でも、コスミーといっしょに。<span>お気に入りの場所で、また会おう。</span></p><div class="social-layout"><section class="social-official"><h3>公式SNS</h3><div class="social-cards"></div></section><section class="social-stamps"><h3>LINEスタンプ</h3><p>いつもの気持ちを、コスミーで。</p><div class="social-stamp-art"><img src="Asset/social/LINE.png" alt="ありがとうを伝えるピンク、ハートを抱える黄緑、了解する紫のスタンプ見本"></div><small>スタンプのイメージ</small><div class="social-line-pending"><span>LINEスタンプ</span><b>準備中</b></div><small>公開されたら、ここからご案内します。</small></section></div><p class="social-note">SNSのリンクは外部サイトで開きます。</p>`;
  for(const [id,label,icon,url,caption] of [
    ['tiktok','TikTok','TikTok.png','https://www.tiktok.com/@airis_games_official','コスミーに会いにいこう'],
    ['instagram','Instagram','instagram.png','https://www.instagram.com/airis_games_official','お気に入りの一枚を見つけよう'],
    ['x','X','X.png','https://x.com/airis_games','最新のお知らせをチェック']
  ]){
    const a=document.createElement('a');a.className='social-card social-'+id;a.href=url;a.target='_blank';a.rel='noopener noreferrer';
    a.innerHTML=`<img src="Asset/social/${icon}" alt=""><span><strong>${label}をチェック</strong><small>${caption}</small></span><span class="social-arrow" aria-hidden="true">↗</span>`;
    a.onclick=()=>{gaDesign('Social:Click:'+id,1);window.beatPSF?.external(id,'social');};sections.social.querySelector('.social-cards').append(a);
  }
  const gamesList=document.createElement('div');gamesList.className='game-bar-list';
  for(const g of PROMO_GAMES){
    const a=document.createElement('a');a.className='game-bar';a.href=g.url;a.target='_blank';a.rel='noopener noreferrer';
    const icon=document.createElement('img');icon.src=`Asset/promo/${g.id}.jpg`;icon.alt='';icon.width=56;icon.height=56;
    const text=document.createElement('span');text.className='game-bar-copy';
    const title=document.createElement('strong');title.textContent=g.title;
    const sub=document.createElement('small');sub.textContent=g.sub;text.append(title,sub);
    const cta=document.createElement('span');cta.className='game-bar-cta';cta.textContent='App Store ↗';
    a.append(icon,text,cta);a.onclick=()=>gaDesign('Promo:Click:'+g.key,1);gamesList.append(a);
  }
  sections.games.append(gamesList);
  let opener=null;
  const audioSettings=document.createElement('div');audioSettings.className='audio-settings';
  for(const [key,label,enabled] of [['musicVolume','BGMの音量','music'],['soundVolume','効果音の音量','sound']]){
    const row=document.createElement('div');row.className='volume-setting';
    const heading=document.createElement('label');heading.htmlFor=key;heading.textContent=label;
    const value=document.createElement('output');value.htmlFor=key;
    const input=document.createElement('input');input.type='range';input.id=key;input.min='0';input.max='100';input.step='1';
    const prefs=gameAudio.settings();input.value=Math.round((prefs[enabled]?prefs[key]:0)*100);value.textContent=input.value+'%';
    input.oninput=()=>{value.textContent=input.value+'%';gameAudio.setSettings({[key]:Number(input.value)/100,[enabled]:Number(input.value)>0});};
    row.append(heading,value,input);audioSettings.append(row);
  }
  const audioNote=document.createElement('p');audioNote.className='settings-note';audioNote.textContent='0%で消音。音量は自動保存されます。iPhone・iPadで音量が変わらない場合は、本体の音量ボタンで調整してください。';audioSettings.append(audioNote);sections.more.append(audioSettings);
  const privacy=document.createElement('a');privacy.id='privacy-policy';privacy.className='settings-link';privacy.textContent='プライバシーポリシー ↗';privacy.href='https://airis-games.com/privacy-policy/';privacy.target='_blank';privacy.rel='noopener noreferrer';sections.more.append(privacy);
  window.reducedEffects=localStorage.getItem('rdash_reduced_effects')==='1'||(localStorage.getItem('rdash_reduced_effects')===null&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  const effectsButton=document.createElement('button');effectsButton.id='effects-setting';
  const renderEffects=()=>{effectsButton.textContent='演出を控えめに：'+(window.reducedEffects?'ON':'OFF');effectsButton.setAttribute('aria-pressed',String(window.reducedEffects));};
  effectsButton.onclick=()=>{window.reducedEffects=!window.reducedEffects;localStorage.setItem('rdash_reduced_effects',window.reducedEffects?'1':'0');renderEffects();window.dispatchEvent(new Event('cosmii-effects-change'));};renderEffects();sections.more.prepend(effectsButton);
  function openPanel(key,title,from){opener=from;panel.dataset.section=key;panel.classList.toggle('social-panel',key==='social');$('panel-title').textContent=key==='social'?'SNS・LINEスタンプ':title;for(const [k,s] of Object.entries(sections))s.hidden=k!==key;panel.hidden=false;panel.querySelector('.panel-shell').scrollTop=0;$('panel-close').focus();}
  function closePanel(){panel.hidden=true;opener?.focus();}
  $('panel-close').onclick=closePanel;
  panel.addEventListener('keydown',e=>{if(e.key==='Escape')closePanel();if(e.key==='Tab'){const buttons=[...panel.querySelectorAll('button,a[href],input')].filter(b=>b.getClientRects().length);const first=buttons[0],last=buttons[buttons.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});
  avatar.onclick=()=>openPanel('skins','キャラクター',avatar);
  $('missions-open').onclick=()=>openPanel('missions','今日のミッション',$('missions-open'));
  $('more-open').onclick=()=>openPanel('more','設定',$('more-open'));
  for(const [id,key,label] of [['help-open','help','遊び方'],['social-open','social','SNS'],['games-open','games','ほかのゲーム']]){const button=document.createElement('button');button.id=id;button.textContent=label;button.onclick=()=>openPanel(key,label,button);footer.append(button);}
  const effects=Object.fromEntries(SKINS.map(s=>[s.effect,s.desc]));
  function refresh(){
    help.textContent='画面タップ／スペースキーでジャンプ。長押しで高く跳べます。光るタイミングに合わせて跳び、空中のオーブはタップで追加ジャンプ。FLIP区間では天井を走ります。Ⅱボタン／Escで一時停止。';
    let last=Number(localStorage.getItem('rdash_last_stage'));
    if(!Number.isInteger(last)||last<0||last>=NSTAGE||!unlocked(last))last=0;
    if(best(last)>=100&&last+1<NSTAGE&&unlocked(last+1))last++;
    continueButton.innerHTML='<small>CONTINUE · STAGE '+(last+1)+'</small><b>'+(best(last)||clearedCount()?'つづきから':'はじめる')+'</b><span>▶</span>';
    continueButton.onclick=()=>selectStage(last);
    $('skineffect').textContent=effects[currentSkin().effect]||currentSkin().desc;
    $('cleared').textContent=clearedCount()+' / '+NSTAGE+' ステージクリア';
    $('dailybtn').innerHTML='デイリー <small>残り '+dailyTriesLeft()+' / 3</small>';
    for(const [i,b] of [...$('skins').children].entries()){
      const names=['赤','水色','ピンク','黄緑','紫'];
      const hints=['PERFECT判定の得点が10%アップ。高得点を狙いたい人に。','ジャンプのタイミング判定が少しやさしくなります。初めての人にも。','近くのコインを引き寄せます。コインを集めたい人に。','長押ししたとき、より高くジャンプできます。高い場所のコイン集めに。','1回のプレイにつき、ぶつかったミスを1回だけ防ぎます。クリアを目指す人に。'];
      const available=skinUnlocked(i),selected=i===skinIdx;
      b.setAttribute('aria-label',names[i]+'コスミー：'+SKINS[i].desc+(selected?'・選択中':''));
      b.setAttribute('aria-pressed',String(selected));
      b.title=b.getAttribute('aria-label');
      b.replaceChildren();
      const image=document.createElement('img');image.src=skinImageUrl(i);image.alt='';b.append(image);
      const copy=document.createElement('span');copy.className='skin-copy';
      const name=document.createElement('strong');name.textContent=names[i]+'コスミー';
      const effect=document.createElement('span');effect.className='skin-ability';effect.textContent=SKINS[i].desc;
      const hint=document.createElement('small');hint.className='skin-hint';hint.textContent=hints[i];
      const status=document.createElement('span');status.className='skin-status';status.textContent=selected?'✓ 選択中':available?'タップで選ぶ':`🔒 異なる${SKINS[i].need}ステージをクリア / ${skinPrice(i)}コインで解放`;
      copy.append(name,effect,hint,status);b.append(copy);
    }
  }
  let previousCombo=0,milestone=0,milestoneUntil=0;
  function drawHUD(g){
    const now=performance.now()/1000;
    if(combo>previousCombo&&Math.floor(combo/10)>Math.floor(previousCombo/10)){milestone=Math.floor(combo/10)*10;milestoneUntil=now+0.8;}previousCombo=combo;
    const percent=Math.max(0,Math.min(100,songPos/duration*100)),width=Math.min(W*0.32,230);
    if(!window.cosmiiUIArt?.panel(g,W/2-width/2-12,10,width+24,35)){g.fillStyle='#101b32e8';roundRect(W/2-width/2-12,10,width+24,35,10);g.fill();}
    if(!window.cosmiiUIArt?.progress(g,W/2-width/2,17,width,12,percent/100)){
    g.fillStyle='#34415b';roundRect(W/2-width/2,21,width,5,2.5);g.fill();
    if(percent>0){g.fillStyle='#82def2';roundRect(W/2-width/2,21,width*percent/100,5,2.5);g.fill();}
    }
    g.font='600 10px "Exo 2", "M PLUS 1p", sans-serif';g.fillStyle='#d7e2f1';g.textAlign='center';g.fillText(Math.floor(percent)+'%  ·  GOAL',W/2,39);
    // Use layout coordinates before #app's portrait rotation. Measuring the
    // visible button also includes safe-area insets, borders and later styles.
    const pauseButton=$('backbtn'),appWidth=$('app').clientWidth;
    const scoreRight=pauseButton.offsetWidth&&appWidth
      ? (pauseButton.offsetLeft-12)*W/appWidth
      : W-72*DH/Math.min(innerWidth,innerHeight);
    const scoreLeft=Math.max(scoreRight-141,W/2+width/2+24);
    if(!window.cosmiiUIArt?.panel(g,scoreLeft,10,scoreRight-scoreLeft,41)){g.fillStyle='#101b32e8';roundRect(scoreLeft,10,scoreRight-scoreLeft,41,10);g.fill();}
    g.textAlign='right';g.fillStyle='#91a5c1';g.font='600 9px "Exo 2", "M PLUS 1p", sans-serif';g.fillText('SCORE',scoreRight-12,24);
    g.fillStyle='#fff';g.font='italic 800 18px "Exo 2", "M PLUS 1p", sans-serif';g.fillText(score.toLocaleString(),scoreRight-12,43,scoreRight-scoreLeft-24);
    if(now<milestoneUntil&&state==='play'){g.textAlign='center';g.font='italic 800 19px "Exo 2", "M PLUS 1p", sans-serif';g.fillStyle='#ffe58a';g.fillText(milestone+' COMBO',W/2,76);}
    if(state==='ready'){
      if(!window.cosmiiUIArt?.panel(g,W/2-175,92,350,113)){g.fillStyle='#101b32ee';roundRect(W/2-175,92,350,113,16);g.fill();}
      g.textAlign='center';g.fillStyle='#94afca';g.font='600 12px "Exo 2", "M PLUS 1p", sans-serif';g.fillText(STAGES[stageIdx].name,W/2,115);
      g.fillStyle='#fff';g.font='900 23px "Exo 2", "M PLUS 1p", sans-serif';if(!window.cosmiiUIArt?.japanese(g,W/2-135,125,270,32))g.fillText('タップしてスタート',W/2,146);
      g.font='12px "Exo 2", "M PLUS 1p", sans-serif';g.fillStyle='#c6d5e6';g.fillText(effects[currentSkin().effect]||currentSkin().desc,W/2,171);
      g.fillText('タップでジャンプ · 長押しで高く',W/2,190);
    }
    g.textAlign='left';
  }
  window.gameUI={refresh,drawHUD,notifyMission,openPanel,addSection(key,section){section.classList.add('panel-section');section.hidden=true;sections[key]=section;$('panel-content').append(section);}};refresh();
})();
