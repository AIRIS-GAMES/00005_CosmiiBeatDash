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
  // Top-right counters: cleared stages (★) and coins.
  const resources=document.createElement('div');resources.className='home-res';
  const stars=document.createElement('div');stars.id='starsdisp';
  resources.append(stars,$('coinsdisp'));header.appendChild(resources);menu.prepend(header);
  const continueButton=document.createElement('button');continueButton.id='continue-btn';
  stage.insertBefore(continueButton,stage.firstChild);
  const nav=document.createElement('div');nav.className='home-nav';
  nav.append($('stageSelectBtn'),$('dailybtn'));stage.appendChild(nav);
  const footer=document.createElement('footer');footer.id='home-footer';
  footer.innerHTML='<span>タップでジャンプ、長押しで高さを調整</span><button id="missions-open">ミッション</button><button id="more-open">その他</button>';
  menu.appendChild(footer);
  const avatar=document.createElement('button');avatar.id='avatar-btn';avatar.setAttribute('aria-label','キャラクターを選ぶ');
  $('charcol').prepend(avatar);avatar.appendChild($('charimg'));
  const avatarLabel=document.createElement('span');avatarLabel.className='avatar-swap';avatarLabel.setAttribute('aria-hidden','true');avatarLabel.textContent='⇄';avatar.appendChild(avatarLabel);
  const panel=document.createElement('section');panel.id='ui-panel';panel.className='overlay';panel.hidden=true;
  panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-labelledby','panel-title');
  panel.innerHTML='<div class="panel-shell"><header><span class="panel-icon" aria-hidden="true"></span><h2 id="panel-title"></h2><span id="panel-chip" hidden></span><button id="panel-close" aria-label="閉じる"><span class="panel-close-label">閉じる</span></button></header><div id="panel-content"></div></div>';
  app.appendChild(panel);
  const sections={};
  for(const [key,id] of [['skins','skins'],['missions','missions'],['more','promobanner']]){
    const section=document.createElement('div');section.className='panel-section';section.hidden=true;
    section.appendChild($(id));$('panel-content').appendChild(section);sections[key]=section;
  }
  const missionPopup=document.createElement('aside');missionPopup.id='mission-popup';missionPopup.hidden=true;missionPopup.setAttribute('role','status');missionPopup.setAttribute('aria-live','polite');missionPopup.setAttribute('aria-atomic','true');app.append(missionPopup);
  const missionQueue=[];let missionShowing=false;
  function showNextMission(){
    if(!missionQueue.length){missionShowing=false;missionPopup.hidden=true;return;}
    missionShowing=true;const m=missionQueue.shift();missionPopup.replaceChildren();
    // Toast: mission icon, MISSION CLEAR!, the short label and +coins (the full sentence stays for screen readers).
    const emblem=document.createElement('i');emblem.className='mission-emblem mi-'+m.icon;emblem.setAttribute('aria-hidden','true');emblem.innerHTML=MISSION_ICONS[m.icon]||'';
    const copy=document.createElement('div');copy.className='mission-popup-copy';
    const label=document.createElement('strong');label.textContent='MISSION CLEAR!';
    const description=document.createElement('span');description.innerHTML=m.label.replace(/\{(.+?)\}/g,'<b>$1</b>');description.setAttribute('aria-label','ミッション達成！'+m.desc);
    copy.append(label,description);
    const reward=document.createElement('small');reward.innerHTML=`<img src="Asset/cosmo-coin.png" alt="">+${m.reward}`;reward.setAttribute('aria-label',`${m.reward}コインを獲得`);
    missionPopup.append(emblem,copy,reward);missionPopup.hidden=false;
    missionPopup.classList.remove('pop');void missionPopup.offsetWidth;missionPopup.classList.add('pop');
    setTimeout(showNextMission,3600);
  }
  function notifyMission(m){missionQueue.push(m);if(!missionShowing)showNextMission();}
  const help=document.createElement('p');help.className='help-text';
  help.textContent='操作：画面タップ／スペースキーでジャンプ。長押しで高く跳べます。';
  for(const key of ['help','social','games']){const s=document.createElement('div');s.className='panel-section';s.hidden=true;$('panel-content').append(s);sections[key]=s;}
  sections.help.append(help);$('promobanner').hidden=true;
  const addLinks=(section,items)=>{const list=document.createElement('div');list.className='home-link-list';for(const [label,url] of items){const a=document.createElement('a');a.textContent=label+' ↗';a.href=url;a.target='_blank';a.rel='noopener noreferrer';list.append(a);}section.append(list);};
  sections.social.classList.add('social-section');
  // SNS: big logo tiles (↗ = opens outside) and the LINE stamp art with a COMING SOON ribbon.
  sections.social.innerHTML=`<div class="social-layout"><div class="social-cards"></div><section class="social-stamps" aria-label="LINEスタンプ（準備中）"><span class="social-ribbon" aria-hidden="true">COMING SOON</span><h3><i>LINE</i>スタンプ</h3><div class="social-stamp-art"><img src="Asset/social/LINE.png" alt="ありがとうを伝えるピンク、ハートを抱える黄緑、了解する紫のスタンプ見本"></div></section></div>`;
  for(const [id,label,icon,url] of [
    ['tiktok','TikTok','TikTok.png','https://www.tiktok.com/@airis_games_official'],
    ['instagram','Instagram','instagram.png','https://www.instagram.com/airis_games_official'],
    ['x','X','X.png','https://x.com/airis_games']
  ]){
    const a=document.createElement('a');a.className='social-card social-'+id;a.href=url;a.target='_blank';a.rel='noopener noreferrer';a.setAttribute('aria-label',label+'（外部サイトで開く）');
    a.innerHTML=`<span class="social-arrow" aria-hidden="true">↗</span><img src="Asset/social/${icon}" alt=""><strong>${label}</strong>`;
    a.onclick=()=>{gaDesign('Social:Click:'+id,1);window.beatPSF?.external(id,'social');};sections.social.querySelector('.social-cards').append(a);
  }
  const gamesList=document.createElement('div');gamesList.className='game-bar-list';
  for(const g of PROMO_GAMES){
    // Icon tile: app icon + title; ↗ marks the App Store link.
    const a=document.createElement('a');a.className='game-bar';a.href=g.url;a.target='_blank';a.rel='noopener noreferrer';a.setAttribute('aria-label',g.title+'（App Storeで開く）');
    const icon=document.createElement('img');icon.src=`Asset/promo/${g.id}.jpg`;icon.alt='';icon.width=64;icon.height=64;
    const title=document.createElement('strong');title.className='game-bar-title';title.textContent=g.title;
    const cta=document.createElement('span');cta.className='game-bar-cta';cta.setAttribute('aria-hidden','true');cta.textContent='↗';
    a.append(cta,icon,title);a.onclick=()=>gaDesign('Promo:Click:'+g.key,1);gamesList.append(a);
  }
  sections.games.append(gamesList);
  let opener=null;
  // Settings: sound on the left (tap the icon to mute), display switches on the right.
  const SETTING_ICONS={
    music:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 3v11.3A3.5 3.5 0 1 0 11 17.5V8h7V3z"/></svg>',
    sound:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/></svg>',
    muted:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M17 9l5 6M22 9l-5 6"/></svg>',
    effects:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.2 6.3L20.5 10l-6.3 2.2L12 18.5l-2.2-6.3L3.5 10l6.3-1.7z"/><path d="M19 15l1 2.6 2.5 1-2.5 1L19 22l-1-2.4-2.5-1 2.5-1z" opacity=".7"/></svg>',
    marks:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M3 19h18"/><path d="M5 17Q12 1 19 17" stroke-dasharray="2.5 3"/><path d="M12 16l2 3h-4z" fill="currentColor" stroke="none"/></svg>'
  };
  const settingsBody=document.createElement('div');settingsBody.className='settings-body';
  const audioSettings=document.createElement('div');audioSettings.className='audio-settings';
  for(const [key,label,enabled] of [['musicVolume','BGM','music'],['soundVolume','効果音','sound']]){
    const row=document.createElement('div');row.className='volume-setting';
    const mute=document.createElement('button');mute.type='button';mute.className='volume-mute';
    const main=document.createElement('div');main.className='volume-main';
    const heading=document.createElement('label');heading.htmlFor=key;heading.textContent=label;
    const value=document.createElement('output');value.htmlFor=key;
    const input=document.createElement('input');input.type='range';input.id=key;input.min='0';input.max='100';input.step='1';
    const prefs=gameAudio.settings();input.value=Math.round((prefs[enabled]?prefs[key]:0)*100);
    let restore=Number(input.value)||70;
    const render=()=>{const muted=Number(input.value)===0;value.textContent=input.value;input.style.setProperty('--fill',input.value+'%');mute.innerHTML=muted?SETTING_ICONS.muted:SETTING_ICONS[enabled];mute.classList.toggle('muted',muted);mute.setAttribute('aria-label',label+(muted?'の消音を解除':'を消音'));};
    const apply=()=>{if(Number(input.value)>0)restore=Number(input.value);gameAudio.setSettings({[key]:Number(input.value)/100,[enabled]:Number(input.value)>0});render();};
    input.oninput=apply;
    mute.onclick=()=>{input.value=Number(input.value)>0?0:restore;apply();};
    render();main.append(heading,input);row.append(mute,main,value);audioSettings.append(row);
  }
  const toggles=document.createElement('div');toggles.className='settings-toggles';
  const makeSwitch=(id,icon,label,sub,get,set)=>{
    const b=document.createElement('button');b.type='button';b.id=id;b.className='setting-switch';b.setAttribute('role','switch');
    b.innerHTML=`<span class="setting-icon" aria-hidden="true">${SETTING_ICONS[icon]}</span><span class="setting-copy"><b>${label}</b><small>${sub}</small></span><span class="switch-track" aria-hidden="true"><span class="on">ON</span><span class="off">OFF</span></span>`;
    const render=()=>b.setAttribute('aria-checked',String(get()));
    b.onclick=()=>{set(!get());render();};render();toggles.append(b);return b;
  };
  window.reducedEffects=localStorage.getItem('rdash_reduced_effects')==='1'||(localStorage.getItem('rdash_reduced_effects')===null&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  makeSwitch('effects-setting','effects','演出ひかえめ','光・ゆれを弱く',()=>window.reducedEffects,v=>{window.reducedEffects=v;localStorage.setItem('rdash_reduced_effects',v?'1':'0');window.dispatchEvent(new Event('cosmii-effects-change'));});
  // Jump marks on the floor (ON unless turned off).
  window.jumpMarks=localStorage.getItem('rdash_jump_marks')!=='0';
  makeSwitch('marks-setting','marks','ジャンプの目印','床にタイミング表示',()=>window.jumpMarks,v=>{window.jumpMarks=v;localStorage.setItem('rdash_jump_marks',v?'1':'0');});
  settingsBody.append(audioSettings,toggles);
  const settingsFoot=document.createElement('div');settingsFoot.className='settings-foot';
  const privacy=document.createElement('a');privacy.id='privacy-policy';privacy.className='settings-link';privacy.textContent='プライバシーポリシー ↗';privacy.href='https://airis-games.com/privacy-policy/';privacy.target='_blank';privacy.rel='noopener noreferrer';settingsFoot.append(privacy);
  sections.more.append(settingsBody,settingsFoot);
  // Missions and settings use the game-style header: icon, English logo, Japanese subtitle and a round close button.
  const GAME_HEADERS={missions:["TODAY'S MISSION",'今日のミッション'],more:['SETTINGS','設定'],social:['FOLLOW US','SNS・LINEスタンプ'],games:['MORE GAMES','ほかのゲーム'],skins:['CHARACTER','キャラクター'],rides:['RIDES','のりもの']};
  // Shops show the coin balance in the header chip (kept current by the menu refresh).
  const COIN_PANELS=['skins','rides'];
  function coinChip(){if(panel.hidden||!COIN_PANELS.includes(panel.dataset.section))return;chip.hidden=false;chip.innerHTML=`<img src="Asset/cosmo-coin.png" alt=""> <b>${totalCoins().toLocaleString()}</b>`;chip.setAttribute('aria-label','所持コイン '+totalCoins());}
  const chip=$('panel-chip');let chipTimer=0;
  const untilReset=()=>{const now=new Date(),next=new Date(now);next.setHours(24,0,0,0);return next-now;};
  const two=n=>String(n).padStart(2,'0');
  function tickChip(){
    const left=untilReset(),sec=Math.floor(left/1000);
    chip.innerHTML=`<span aria-hidden="true">⏱</span> リセットまで <b>${two(Math.floor(sec/3600))}:${two(Math.floor(sec/60)%60)}:${two(sec%60)}</b>`;
    if(sec<=0&&typeof refreshMenu==='function')refreshMenu();
  }
  function stopChip(){clearInterval(chipTimer);chipTimer=0;chip.hidden=true;}
  function openPanel(key,title,from){opener=from;panel.dataset.section=key;panel.classList.toggle('social-panel',key==='social');
    const game=GAME_HEADERS[key];panel.classList.toggle('game-panel',!!game);
    if(game)$('panel-title').innerHTML=`${game[0]}<small>${game[1]}</small>`;else $('panel-title').textContent=key==='social'?'SNS・LINEスタンプ':title;
    stopChip();chip.removeAttribute('aria-label');if(key==='missions'){chip.hidden=false;tickChip();chipTimer=setInterval(tickChip,1000);}
    for(const [k,s] of Object.entries(sections))s.hidden=k!==key;panel.hidden=false;coinChip();panel.querySelector('.panel-shell').scrollTop=0;$('panel-close').focus();}
  function closePanel(){stopChip();panel.hidden=true;opener?.focus();}
  $('panel-close').onclick=closePanel;
  panel.addEventListener('keydown',e=>{if(e.key==='Escape')closePanel();if(e.key==='Tab'){const buttons=[...panel.querySelectorAll('button,a[href],input')].filter(b=>b.getClientRects().length);const first=buttons[0],last=buttons[buttons.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});
  avatar.onclick=()=>openPanel('skins','キャラクター',avatar);
  $('missions-open').onclick=()=>openPanel('missions','今日のミッション',$('missions-open'));
  $('more-open').onclick=()=>openPanel('more','設定',$('more-open'));
  for(const [id,key,label,short] of [['help-open','help','遊び方','遊び方'],['social-open','social','SNS','SNS'],['games-open','games','ほかのゲーム','ゲーム']]){const button=document.createElement('button');button.id=id;button.textContent=short;if(short!==label)button.setAttribute('aria-label',label);button.onclick=()=>openPanel(key,label,button);footer.append(button);}
  const effects=Object.fromEntries(SKINS.map(s=>[s.effect,s.desc]));
  // Modules add to the menu refresh with gameUI.onRefresh(fn) instead of wrapping
  // gameUI.refresh; hooks run in registration (script) order after the base refresh.
  const refreshHooks=[];
  function refresh(){
    baseRefresh();
    for(const hook of refreshHooks)hook();
    coinChip();
  }
  function baseRefresh(){
    help.textContent='画面タップ／スペースキーでジャンプ。長押しで高く跳べます。光るタイミングに合わせて跳び、空中のオーブはタップで追加ジャンプ。FLIP区間では天井を走ります。Ⅱボタン／Escで一時停止。';
    let last=Number(localStorage.getItem('rdash_last_stage'));
    if(!Number.isInteger(last)||last<0||last>=NSTAGE||!unlocked(last))last=0;
    if(best(last)>=100&&last+1<NSTAGE&&unlocked(last+1))last++;
    continueButton.innerHTML='<small>CONTINUE · STAGE '+(last+1)+'</small><b>'+(best(last)||clearedCount()?'つづきから':'はじめる')+'</b><span>▶</span>';
    continueButton.onclick=()=>{window.fromStageSelect=false;selectStage(last);};
    $('skineffect').textContent=effects[currentSkin().effect]||currentSkin().desc;
    $('cleared').textContent=clearedCount()+' / '+NSTAGE+' ステージクリア';
    stars.innerHTML='<span aria-hidden="true">★</span> '+clearedCount()+'/'+NSTAGE;stars.setAttribute('aria-label',clearedCount()+' / '+NSTAGE+' ステージクリア');
    const tries=dailyTriesLeft();
    $('dailybtn').innerHTML='デイリー<span class="daily-pips" role="img" aria-label="残り '+tries+' / 3">'+[0,1,2].map(i=>'<i class="'+(i<tries?'on':'')+'"></i>').join('')+'</span>';
    for(const [i,b] of [...$('skins').children].entries()){
      const names=['赤','水色','ピンク','黄緑','紫'];
      const hints=['PERFECT判定の得点が10%アップ。高得点を狙いたい人に。','ジャンプのタイミング判定が少しやさしくなります。初めての人にも。','近くのコインを引き寄せます。コインを集めたい人に。','長押ししたとき、より高くジャンプできます。高い場所のコイン集めに。','1回のプレイにつき、ぶつかったミスを1回だけ防ぎます。クリアを目指す人に。'];
      const available=skinUnlocked(i),selected=i===skinIdx;
      b.setAttribute('aria-label',names[i]+'コスミー：'+SKINS[i].desc+'。'+hints[i]+(selected?'・選択中':available?'':`・未解放（ちがうステージを${SKINS[i].need}個クリア、または${skinPrice(i)}コインで解放）`));
      b.setAttribute('aria-pressed',String(selected));
      b.title=b.getAttribute('aria-label');
      b.replaceChildren();
      const image=document.createElement('img');image.src=skinImageUrl(i);image.alt='';b.append(image);
      const copy=document.createElement('span');copy.className='skin-copy';
      const name=document.createElement('strong');name.textContent=names[i]+'コスミー';
      const effect=document.createElement('span');effect.className='skin-ability';effect.textContent=SKINS[i].desc;
      const hint=document.createElement('small');hint.className='skin-hint';hint.textContent=hints[i];
      // Card status as badges: ✓ in use / pick / (🔒 ★ stages needed + coin price).
      const status=document.createElement('span');status.className='skin-status';
      status.innerHTML=selected?'<b class="badge-on">✓ 使用中</b>':available?'<b class="badge-pick">えらぶ</b>':`<b class="badge-lock">🔒 ★${SKINS[i].need}</b><b class="badge-coin"><img src="Asset/cosmo-coin.png" alt="">${skinPrice(i)}</b>`;
      copy.append(name,effect,hint,status);b.append(copy);
    }
  }
  // Before the start: a big STAGE logo, the stage name, a gimmick HINT badge (only when the stage has one)
  // and a blinking TAP TO START, drawn as HTML over the canvas. The skin's perk sits above Cosmii and
  // the controls are two small chips in the corner. Shown/filled only when something changes.
  const readyCard=document.createElement('div');readyCard.id='ready-card';readyCard.hidden=true;
  readyCard.innerHTML='<div class="ready-stage"><b id="ready-num"></b><span id="ready-world"></span></div><div id="ready-name"></div><div id="ready-hint" hidden><i>HINT</i><span></span></div><div class="ready-tap" aria-hidden="true">TAP TO START<small>タップでスタート</small></div>';
  const readyPerk=document.createElement('span');readyPerk.id='ready-perk';readyPerk.hidden=true;
  const readyCtrl=document.createElement('div');readyCtrl.id='ready-ctrl';readyCtrl.hidden=true;readyCtrl.setAttribute('aria-hidden','true');
  readyCtrl.innerHTML='<span><i></i>タップ＝ジャンプ</span><span><i class="hold"></i>長押し＝高く</span>';
  app.append(readyCard,readyPerk,readyCtrl);
  let readyKey='';
  function syncReady(){
    const show=state==='ready'&&!window.cosmiiTutorial?.active;
    const key=show?[stageIdx,skinIdx,Math.round(W),Math.round(player.x),Math.round(player.y)].join('|'):'';
    if(key===readyKey)return;readyKey=key;
    for(const el of [readyCard,readyPerk,readyCtrl])el.hidden=!show;
    if(!show)return;
    const s=STAGES[stageIdx];
    $('ready-num').textContent=String(s.name||'').toUpperCase();
    $('ready-world').textContent=s.world?String(s.world).toUpperCase():'';$('ready-world').hidden=!s.world;
    $('ready-name').textContent=s.title||'';$('ready-name').hidden=!s.title;
    $('ready-hint').hidden=!s.hint;$('ready-hint').querySelector('span').textContent=s.hint||'';
    readyCard.setAttribute('aria-label',`${s.name}${s.title?'「'+s.title+'」':''}。${s.hint?s.hint+'。':''}タップしてスタート`);
    readyPerk.textContent=effects[currentSkin().effect]||currentSkin().desc;
    readyPerk.style.left=((player.x+B/2)/W*100)+'%';readyPerk.style.top=((player.y-6)/DH*100)+'%';
  }
  (function watchReady(){syncReady();requestAnimationFrame(watchReady);})();
  let previousCombo=0,milestone=0,milestoneUntil=0;
  const hudLayout={key:'',scoreRight:null};
  const invalidateHud=()=>{hudLayout.key='';};
  addEventListener('resize',invalidateHud);addEventListener('orientationchange',()=>setTimeout(invalidateHud,150));
  document.fonts?.addEventListener?.('loadingdone',invalidateHud);
  let hudCeil=0;
  // HUD runner face: the skin picture cut once to a small circle (no large images drawn per frame).
  const hudFaces={};let hudScore=0,hudBumpAt=-9,hudGain=0;
  function hudFace(){const url=skinImageUrl(skinIdx);if(!url)return null;let f=hudFaces[url];if(!f){f=hudFaces[url]={c:null};const im=new Image();im.onload=()=>{const c=document.createElement('canvas');c.width=c.height=48;const x=c.getContext('2d');x.beginPath();x.arc(24,24,24,0,6.283);x.clip();const s=Math.min(im.naturalWidth,im.naturalHeight)*0.82;x.drawImage(im,(im.naturalWidth-s)/2,(im.naturalHeight-s)*0.2,s,s,0,0,48,48);f.c=c;};im.src=url;}return f.c;}
  function drawHUD(g){
    // On the ceiling (flip zone) the mission note moves down, off the ceiling's obstacles.
    const low=lastGdir===-1&&state==='play';if(missionPopup.classList.contains('low')!==low)missionPopup.classList.toggle('low',low);
    const now=performance.now()/1000;
    if(combo>previousCombo&&Math.floor(combo/10)>Math.floor(previousCombo/10)){milestone=Math.floor(combo/10)*10;milestoneUntil=window.cosmiiImpact?.milestone(milestone)?0:now+0.8;}previousCombo=combo;
    // Running on the ceiling: the top bars shrink up into the corner band and
    // fade, so the ceiling, its obstacles and its tap marks stay in plain view.
    hudCeil+=(((lastGdir===-1&&(state==='play'||state==='dead'))?1:0)-hudCeil)*0.12;const ceil=hudCeil;
    g.save();
    if(ceil>0.01){const k=1-0.3*ceil;g.globalAlpha=1-0.5*ceil;g.translate(W/2,4);g.scale(k,k);g.translate(-W/2,-4-6*ceil);}
    // Progress: Cosmii's face runs along a cyan→pink bar toward a checkered goal flag; the percent stays small.
    const percent=Math.max(0,Math.min(100,songPos/duration*100)),width=Math.min(W*0.32,230);
    const px=W/2-width/2-12,pw=width+24,tx=px+16,tw=pw-16-56,ty=24,p=percent/100;
    g.fillStyle='#14132de6';roundRect(px,10,pw,35,17.5);g.fill();g.strokeStyle='#4b4196';g.lineWidth=1;g.stroke();
    g.fillStyle='#0a0820';roundRect(tx,ty,tw,8,4);g.fill();
    if(p>0){const grad=g.createLinearGradient(tx,0,tx+tw,0);grad.addColorStop(0,'#4ed6ff');grad.addColorStop(1,'#ff5fc8');g.fillStyle=grad;roundRect(tx,ty,Math.max(8,tw*p),8,4);g.fill();}
    const fx=tx+tw+10;g.fillStyle='#e8ecff';g.fillRect(fx,19,1.5,16);for(let r=0;r<2;r++)for(let c=0;c<3;c++){g.fillStyle=(r+c)%2?'#2a2558':'#fff';g.fillRect(fx+1.5+c*4,19+r*4,4,4);}
    const face=hudFace(),rx=tx+tw*p;g.fillStyle='#fff';g.beginPath();g.arc(rx,ty+4,10.5,0,6.283);g.fill();if(face)g.drawImage(face,rx-9.5,ty+4-9.5,19,19);
    g.font='italic 800 10px "Exo 2", "M PLUS 1p", sans-serif';g.fillStyle='#a9b3d8';g.textAlign='right';g.fillText(Math.floor(percent)+'%',px+pw-12,31);
    // Use layout coordinates before #app's portrait rotation. Measuring the
    // visible button also includes safe-area insets, borders and later styles.
    // Layout reads are cached: reading offsetLeft every frame right after the
    // scenery transforms are written forces a synchronous style/layout pass.
    const pauseButton=$('backbtn'),layoutKey=pauseButton.style.display+'|'+W;
    if(hudLayout.key!==layoutKey){
      const appWidth=$('app').clientWidth;
      hudLayout.scoreRight=pauseButton.offsetWidth&&appWidth?(pauseButton.offsetLeft-12)/appWidth:null;
      if(hudLayout.scoreRight!==null)hudLayout.key=layoutKey;
    }
    const scoreRight=hudLayout.scoreRight!==null
      ? hudLayout.scoreRight*W
      : W-72*DH/Math.min(innerWidth,innerHeight);
    const scoreLeft=Math.max(scoreRight-141,W/2+width/2+24);
    // Score: purple pill; when points come in the number swells gold for a moment and +N floats under it.
    if(score<hudScore)hudGain=0;else if(score>hudScore){hudGain=(now-hudBumpAt<0.8?hudGain:0)+score-hudScore;hudBumpAt=now;}hudScore=score;
    g.fillStyle='#14132de6';roundRect(scoreLeft,10,scoreRight-scoreLeft,41,14);g.fill();g.strokeStyle='#4b4196';g.lineWidth=1;g.stroke();
    g.textAlign='right';g.fillStyle='#a9b3d8';g.font='italic 800 9px "Exo 2", "M PLUS 1p", sans-serif';g.fillText('SCORE',scoreRight-12,23);
    const bump=Math.min(1,(now-hudBumpAt)/0.35),sw=1+0.16*(1-bump);g.save();g.translate(scoreRight-12,43);g.scale(sw,sw);
    g.fillStyle=bump<1?'#ffd25a':'#fff';g.font='italic 900 19px "Exo 2", "M PLUS 1p", sans-serif';g.fillText(score.toLocaleString(),0,0,scoreRight-scoreLeft-24);g.restore();
    const since=now-hudBumpAt;if(hudGain>0&&since<0.8&&state==='play'){g.globalAlpha*=1-since/0.8;g.fillStyle='#ffd25a';g.font='italic 900 12px "Exo 2", "M PLUS 1p", sans-serif';g.fillText('+'+hudGain.toLocaleString(),scoreRight-12,64+since*10);g.globalAlpha=1-0.5*ceil;}
    g.restore();
    if(now<milestoneUntil&&state==='play'){g.textAlign='center';g.font='italic 800 19px "Exo 2", "M PLUS 1p", sans-serif';const cy=lastGdir===-1?GROUND-40:76;/* on the ceiling: keep the ceiling clear */g.lineJoin='round';g.lineWidth=4;g.strokeStyle='#2a1650';g.strokeText(milestone+' COMBO',W/2,cy);g.fillStyle='#ffe58a';g.fillText(milestone+' COMBO',W/2,cy);}
    g.textAlign='left';
  }
  window.gameUI={refresh,onRefresh(fn){refreshHooks.push(fn);},drawHUD,notifyMission,openPanel,addSection(key,section){section.classList.add('panel-section');section.hidden=true;sections[key]=section;$('panel-content').append(section);}};refresh();
})();
