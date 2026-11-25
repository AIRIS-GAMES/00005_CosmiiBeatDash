/* Presentation and optional story only. Physics, charts, rewards and saves remain in the original game. */
(() => {
  'use strict';
  const ASSET='Asset/world/', KEY='cosmii_dash_story_v1';
  let progress={intro:false,album:false};
  try{progress={...progress,...JSON.parse(localStorage.getItem(KEY)||'{}')};}catch{}
  const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(progress));}catch{}};
  // Existing clears open the album silently; migration is not a new achievement.
  if(best(0)>=100&&!progress.album){progress.album=true;save();}
  const layer=document.createElement('img');layer.id='world-backdrop';layer.src=ASSET+'rhythm-neon.jpg';layer.alt='';layer.hidden=true;app.prepend(layer);
  const ceiling=layer.cloneNode();ceiling.id='world-ceiling';layer.after(ceiling);
  const scenery=[{floor:layer,ceiling}];
  for(let i=1;i<3;i++){
    const floor=layer.cloneNode(),top=ceiling.cloneNode();
    floor.removeAttribute('id');top.removeAttribute('id');
    floor.className='world-scroll-floor';top.className='world-scroll-ceiling';
    ceiling.after(floor,top);scenery.push({floor,ceiling:top});
  }
  // Crop only in the DOM: retain the generated image, but exclude its side pillars from repeating panels.
  scenery.forEach(panel=>{
    for(const image of [panel.floor,panel.ceiling]){
      const frame=document.createElement('div');frame.className='world-scenery-frame';
      image.before(frame);frame.append(image);
      image.style.width='125%';image.style.left='-12.5%';
      panel[image===panel.floor?'floorFrame':'ceilingFrame']=frame;
    }
  });
  const gates=['start','finish'].map(name=>{
    const layers=['back','front'].map(side=>{
      const layer=document.createElement('div');layer.hidden=true;
      layer.className=`world-boundary world-boundary-${name} world-boundary-${side}`;
      if(side==='back')layer.id='world-gate-'+name;
      const art=document.createElement('img');art.alt='';art.decoding='async';
      layer.append(art);
      // The start gate has a tape across it (in front of Cosmii) that snaps
      // open on GO!, two halves flying apart with a burst of sparkles.
      if(name==='start'&&side==='front'){
        const tape=document.createElement('div');tape.className='gate-tape';
        tape.innerHTML='<i class="gate-tape-l"></i><i class="gate-tape-r"></i><b class="gate-burst"></b>';
        layer.append(tape);
      }
      app.append(layer);
      return {layer,art};
    });
    return {name,layers,lastTransform:''};
  });
  const startGate=gates[0];
  const GATE_COLORS={dash:'#ffd94a',rescue:'#ff8fc8',cannon:'#ffcf4a',roll:'#c9a6ff',catch:'#ffb84a',sudoku:'#ff9a5a',mogu:'#7fd45a',match:'#ff6fb5',arcade:'#5ff0ff',finale:'#ff8fd0'};
  function setGate(open,animate){
    for(const {layer} of startGate.layers){
      layer.classList.toggle('gate-open',open);
      layer.classList.toggle('gate-animate',!!animate);
    }
  }
  let tempoBeats=null,tempoScale=1;
  const themes=[
    {file:'rhythm-neon.jpg',name:'スターアーケード',floor:5/6},
    {file:'theme-sea.jpg',name:'ネオンアクアリウム',floor:791/941},
    {file:'theme-garden.jpg',name:'ミッドナイトガーデン',floor:767/941},
    {file:'theme-sunset.jpg',name:'サンセットドリーム',floor:789/941},
    {file:'theme-aurora.jpg',name:'オーロラステージ',floor:798/941}
  ];
  const themeFor=i=>({...themes[((i%5)+5)%5],hue:[0,18,-18,35][Math.floor(Math.max(0,i)/5)%4]});
  let paintedStage=-1;
  function applyTheme(i){
    if(paintedStage===i)return;paintedStage=i;
    const theme=themeFor(i),filter=`hue-rotate(${theme.hue}deg)`;
    // Match each generated floor line to GROUND without changing collision geometry.
    const setImage=(image,isCeiling,file,floor)=>{
      const scale=Math.max((5/6)/floor,(1-5/6)/(1-floor));
      image.style.height=`${scale*100}%`;image.style.top=`${(5/6-scale*floor)*100}%`;
      image.style.filter=filter;image.style.transform='none';
      image.style.clipPath=isCeiling?`inset(${floor*100}% 0 0)`:'none';
      image.onerror=()=>{image.onerror=null;setImage(image,isCeiling,'rhythm-neon.jpg',5/6);};
      if(file==='rhythm-neon.jpg')image.onerror=null;
      image.src=ASSET+file;
    };
    scenery.forEach(panel=>{setImage(panel.floor,false,theme.file,theme.floor);setImage(panel.ceiling,true,theme.file,theme.floor);});
    const gateWorld=i===NSTAGE-1?'finale':(window.stageGimmicks?.PLAN?.[i+1]?.world||'dash');
    for(const {name,layers} of gates){
      const source=ASSET+`gates/${gateWorld}-${name}.png`;
      for(const {art} of layers)if(art.getAttribute('src')!==source)art.src=source;
    }
    app.style.setProperty('--gate-color',GATE_COLORS[gateWorld]||'#ffd94a');
    app.dataset.worldTheme=theme.name;
  }
  function scenerySpeed(){
    if(tempoBeats!==beats){
      tempoBeats=beats;
      const strengths=beats.map(b=>b.s||1).sort((a,b)=>a-b);
      const threshold=strengths[Math.floor(strengths.length*.65)]||0;
      const intervals=[];let previous=null;
      for(const b of beats){
        if((b.s||1)<threshold)continue;
        if(previous===null){previous=b.t;continue;}
        const dt=b.t-previous;if(dt<.28)continue;
        previous=b.t;if(dt<=1){let bpm=60/dt;while(bpm<90)bpm*=2;while(bpm>180)bpm/=2;intervals.push(bpm);}
      }
      intervals.sort((a,b)=>a-b);
      tempoScale=Math.max(.8,Math.min(1.35,(intervals[Math.floor(intervals.length/2)]||120)/120));
    }
    return SPEED*.62*tempoScale;
  }
  // Source rectangles come from deterministic sprite cleanup metadata; padding is not part of an obstacle.
  const obstacleArt={spike:{src:'neon-spike.png',crop:[3,17,121,108]},block:{src:'neon-block.png',crop:[3,8,121,117]}};
  for(const art of Object.values(obstacleArt)){art.image=new Image();art.image.src=ASSET+art.src;}
  function drawObstacle(context,kind,shape){
    const art=obstacleArt[kind];if(!art?.image.complete||!art.image.naturalWidth)return false;
    context.save();
    if(shape.f){context.translate(shape.x,shape.y+shape.h);context.scale(1,-1);}else context.translate(shape.x,shape.y);
    // Tile the original image for tall/wide platforms instead of stretching its star.
    if(kind==='block'&&(shape.w>B*1.1||shape.h>B*1.1)){
      // Whole tiles only (never a cut one): a 1.65-high tower is two tiles, each a little taller.
      const nx=Math.max(1,Math.round(shape.w/B)),ny=Math.max(1,Math.round(shape.h/B)),tw=shape.w/nx,th=shape.h/ny;
      for(let j=0;j<ny;j++)for(let i=0;i<nx;i++)context.drawImage(art.image,...art.crop,i*tw,j*th,tw,th);
    }else context.drawImage(art.image,...art.crop,0,0,shape.w,shape.h);
    context.restore();return true;
  }
  const names=['赤','水色','ピンク','黄緑','紫'], ids=['red','blue','pink','green','purple'];
  const summaries=[
    '好奇心いっぱいで、楽しいことには一直線。黄緑を気に入り、いつも一緒に遊ぼうと誘う。',
    'おしゃれが好きで、ちょっぴりマイペース。かわいいものに目がなく、センスのよいコーデが得意。',
    '好奇心が強く、少しマイペースな猫気質。きゅるんとした表情で、みんなを和ませるムードメーカー。',
    'のんびり屋で、いつも糸目のコスミー。感情を大きく表に出さないけれど、困っている仲間を放っておけない。',
    '水色の弟。いたずら好きで、周囲をよく見ている。姉の失敗を、陰でそっとフォローする。'
  ];
  const social=[['x','X','https://x.com/airis_games'],['tiktok','TikTok','https://www.tiktok.com/@airis_games_official'],['instagram','Instagram','https://www.instagram.com/airis_games_official']];
  const modal=document.createElement('section');modal.id='world-dialog';modal.className='overlay';modal.hidden=true;modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-labelledby','world-title');app.append(modal);
  let opener,background=[],pending=null,selectedProfile=0,disposeOpening=null;
  const emit=(action,detail='')=>{if(navigator.webdriver||new URLSearchParams(location.search).get('analytics')==='off')return;gaDesign('BeatWorld:v1:'+action+(detail?':'+detail:''),1);};
  function open(html){
    disposeOpening?.();disposeOpening=null;modal.classList.remove('opening-mode');
    if(modal.hidden){opener=document.activeElement;background=[...app.children].filter(el=>el!==modal).map(el=>[el,el.inert]);background.forEach(([el])=>el.inert=true);}
    modal.innerHTML=html;modal.hidden=false;modal.querySelector('button')?.focus();
  }
  function close(){disposeOpening?.();disposeOpening=null;modal.classList.remove('opening-mode');modal.hidden=true;background.forEach(([el,inert])=>el.inert=inert);background=[];opener?.focus?.();}
  function cancel(){close();if(pending){const resolve=pending;pending=null;resolve(false);}}
  modal.addEventListener('keydown',e=>{
    if(e.key==='Escape'){e.preventDefault();cancel();}
    if(e.key==='Tab'){const buttons=[...modal.querySelectorAll('button,a[href]')].filter(el=>!el.disabled&&el.getClientRects().length);if(!buttons.length)return;const first=buttons[0],last=buttons.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}
  });
  function intro(start){
    open('<div id="opening-host" style="width:100%;height:100%"></div>');
    modal.classList.add('opening-mode');
    disposeOpening=cosmiiOpening.mount(modal.querySelector('#opening-host'),action=>{
      window.beatPSF?.event(action==='skip'?'intro_skip':'intro_complete',start?'onboarding':'replay');
      progress.intro=true;progress.opening=true;save();emit('intro_'+(action==='skip'?'skip':'complete'),start==='boot'?'boot':'story');
      close();
      if(pending){const resolve=pending;pending=null;resolve(true);}
      else if(action==='play'){$('loginov').style.display='none';selectStage(0);}
    });
    window.beatPSF?.event('intro_start',start?'onboarding':'replay');
    emit('intro_shown',start==='boot'?'boot':start?'first':'replay');
  }
  const memories=[
    {stage:1,title:'もう一曲、あそぼう。',text:'曲が終わっても、赤はまだ跳ねている。いつもの顔の黄緑も、足だけは少し動いていた。'},
    {stage:5,title:'海のリズム',text:'赤「くらげも、いっしょに跳んでる！」\n黄緑「……ゆっくりだね。」'},
    {stage:10,title:'ひと休みの星クッキー',text:'ピンク「これ、星のかたち。」\n黄緑「……半分こ、しよう。」'},
    {stage:15,title:'夕焼けのコーデ',text:'水色「次の曲には、このリボン。」\n紫「ぼくのぶんも選んでよ。」'},
    {stage:20,title:'今夜のみんな',text:'赤「もう一曲！」\nみんなで顔を見合わせたら、また足が動きだした。'}
  ];
  const memoryUnlocked=m=>best(m.stage-1)>=100||(m.stage===1&&progress.album);
  if(!Array.isArray(progress.memories)){progress.memories=memories.filter(memoryUnlocked).map(m=>m.stage);save();}
  // Album and profiles share the game dialog header: icon, English logo, Japanese subtitle, a counter chip and ✕.
  const gameHead=(icon,title,sub,chip)=>`<header class="game-head"><span class="game-icon ${icon}" aria-hidden="true"></span><h2 id="world-title">${title}<small>${sub}</small></h2><span class="game-chip">${chip}</span><button id="world-close" class="game-x" aria-label="閉じる"></button></header>`;
  // The photo a memory shows (also used small in the list).
  const memoryArt=i=>i===0?`background-image:url('${ASSET}first-night.jpg')`:`background-image:url('${ASSET}memory-photos.jpg');background-size:200% 200%;background-position:${(i-1)%2*100}% ${Math.floor((i-1)/2)*100}%`;
  function album(index=0){
    if(!Number.isInteger(index))index=0;
    const m=memories[index]||memories[0],unlocked=memoryUnlocked(m);
    if(unlocked)markSeen(m.stage);   // opened here: no launch notice for it later
    const art=!unlocked?`<img class="album-locked" src="${ASSET}arcade-night.jpg" alt="未解放の思い出">`:index===0?`<img src="${ASSET}first-night.jpg" alt="赤と黄緑の最初の思い出">`:`<div class="memory-photo" role="img" aria-label="${m.title}" style="background-position:${(index-1)%2*100}% ${Math.floor((index-1)/2)*100}%"></div>`;
    const over=unlocked?`<div class="album-caption"><b>${m.title}</b><p style="white-space:pre-line">${m.text}</p></div>`:`<div class="album-lock"><span aria-hidden="true">🔒</span><b>★ STAGE ${m.stage} CLEAR で解放</b></div>`;
    const list=memories.map((entry,i)=>{const open=memoryUnlocked(entry);return `<button data-memory="${i}" aria-pressed="${i===index}" aria-label="STAGE ${entry.stage}の思い出${open?'':'・未解放'}"><span class="memory-thumb${open?'':' locked'}" style="${open?memoryArt(i):`background-image:url('${ASSET}arcade-night.jpg')`}"></span><span><b>STAGE ${entry.stage}</b><small>${open?'★ GET':'🔒 クリアで解放'}</small></span></button>`;}).join('');
    open(`<div class="world-album world-paper game-paper">${gameHead('book','ALBUM','思い出のアルバム',`<span aria-hidden="true">📷</span> <b>${memories.filter(memoryUnlocked).length} / 5</b>`)}<div class="world-album-body">${art}${over}<div class="album-side"><nav class="memory-tabs" aria-label="思い出を選ぶ">${list}</nav><div class="world-actions">${unlocked?'<button id="world-profile" aria-label="この子たちを知る">★ コスミー</button>':''}<button id="world-replay" class="secondary">▶ はじまりを見る</button></div></div></div></div>`);
    modal.querySelector('#world-close').onclick=close;modal.querySelector('#world-replay').onclick=()=>intro(false);modal.querySelector('#world-profile')?.addEventListener('click',()=>profiles(0,'album'));
    modal.querySelectorAll('[data-memory]').forEach(b=>b.onclick=()=>album(Number(b.dataset.memory)));emit('album_open',unlocked?'unlocked':'locked');window.beatPSF?.event('album_open',unlocked?'unlocked':'locked','stage_'+m.stage);
  }
  function profiles(index=skinIdx,source='home'){
    index=Number.isInteger(index)&&index>=0&&index<ids.length?index:0;
    selectedProfile=index;
    window.beatPSF?.profile(index,source,skinUnlocked(index));
    const unlocked=skinUnlocked(index),need=SKINS[index].need,count=Math.min(clearedCount(),need);
    const tagline=summaries[index].split('。')[0]+'。';
    const closet=window.cosmiiCapsule?'<button id="profile-closet" type="button">きせかえ</button>':'';
    const content=unlocked?`<p class="profile-tagline">${tagline}</p>${window.cosmiiBond?.profileHtml(index)||''}<div class="profile-perk"><span aria-hidden="true">★</span><span><small>ゲーム内の効果</small><b>${SKINS[index].desc}</b></span></div><div class="profile-row"><button id="profile-select">この子で遊ぶ ▶</button>${closet}`:
      `<div class="profile-locked"><strong>🔒 あと ${Math.max(0,need-count)} ステージ</strong><div class="profile-need" role="progressbar" aria-label="キャラクター解放までの進み具合" aria-valuemin="0" aria-valuemax="${need}" aria-valuenow="${count}"><i style="width:${count/need*100}%"></i><span>${count} / ${need}</span></div><small>ちがうステージをクリアすると数が増えます</small></div><div class="profile-row"><button id="profile-unlock"><img src="Asset/cosmo-coin.png" alt=""> ${skinPrice(index)} で解放</button>`;
    const links=`<nav class="profile-social" aria-label="公式SNS">${social.map(([id,label,url])=>`<a data-social="${id}" href="${url}" target="_blank" rel="noopener noreferrer" aria-label="公式${label}（外部サイトで開く）"><img src="Asset/social/${{x:'X',tiktok:'TikTok',instagram:'instagram'}[id]}.png" alt=""></a>`).join('')}</nav></div>`;
    open(`<div class="world-paper world-profiles game-paper">${gameHead('cast','CHARACTERS','コスミー紹介',`出会った <b>${ids.filter((_,i)=>skinUnlocked(i)).length} / ${ids.length}</b>`)}<div class="profile-layout"><div class="world-profile-tabs">${ids.map((id,i)=>`<button data-character="${i}" aria-label="${names[i]}の紹介${skinUnlocked(i)?'':'・未解放'}" aria-pressed="${i===index}" class="${skinUnlocked(i)?'':'locked'}"><img class="${skinUnlocked(i)?'':'profile-silhouette'}" src="${ASSET}cast-neon/${id}.png" alt=""></button>`).join('')}</div><div class="world-profile-body"><div class="profile-stage"><img class="${unlocked?'':'profile-silhouette'}" src="${ASSET}cast-neon/${ids[index]}.png" alt="${unlocked?names[index]:'未解放のコスミーのシルエット'}"></div><div class="profile-info"><h3 class="profile-name"><small>NO.0${index+1}</small>${unlocked?names[index]+'コスミー':'？？？'}</h3>${content}${links}</div></div></div></div>`);
    modal.querySelector('#world-close').onclick=close;
    if(unlocked){
      const portrait=modal.querySelector('.profile-stage img');
      window.cosmiiWardrobe?.setPortrait(portrait,index,'front',portrait.getAttribute('src'));
      modal.querySelector('#profile-closet')?.addEventListener('click',()=>{close();window.cosmiiCapsule.openCloset(index);});
    }
    modal.querySelector('#profile-select')?.addEventListener('click',()=>{if(!skinUnlocked(index))return;skinIdx=index;localStorage.setItem('rdash_skin',index);gaDesign('Skin:Select:'+SKINS[index].n,1);refreshMenu();close();});
    modal.querySelector('#profile-unlock')?.addEventListener('click',()=>{close();$('avatar-btn').click();});
    modal.querySelectorAll('[data-character]').forEach(b=>b.onclick=()=>profiles(Number(b.dataset.character),'profile'));modal.querySelectorAll('[data-social]').forEach(a=>a.onclick=()=>{emit('external_click',a.dataset.social);window.beatPSF?.external(a.dataset.social,'profile');});emit(unlocked?'profile_open':'profile_locked',source+'_'+ids[index]);
  }
  const albumButton=document.createElement('button');albumButton.id='world-album-open';albumButton.textContent='アルバム';albumButton.onclick=album;
  const albumBadge=document.createElement('span');albumBadge.className='home-badge';albumButton.append(albumBadge);
  const profileButton=document.createElement('button');profileButton.id='world-profiles-open';profileButton.textContent='コスミー';profileButton.setAttribute('aria-label','コスミー紹介');profileButton.onclick=()=>profiles(skinIdx);
  $('home-footer').append(albumButton,profileButton);
  $('more-open').textContent='設定';
  ['missions-open','more-open','help-open','world-album-open','world-profiles-open','social-open','games-open'].forEach(id=>$('home-footer').append($(id)));
  $('home-footer').querySelector('span').textContent='閉店後は、コスミーたちの時間。';
  $('home-header').querySelector('.wordmark').innerHTML='COSMII <span>RHYTHM DASH · よるのゲームセンター</span>';
  const plaque=document.createElement('p');plaque.className='world-plaque';plaque.textContent='今夜は、どの曲であそぶ？';$('stagecol').prepend(plaque);
  gameUI.onRefresh(()=>{$('charname').textContent=names[skinIdx]+'コスミー';const next=memories.find(m=>!memoryUnlocked(m));plaque.textContent=next?`ステージ${next.stage}クリアで、新しい思い出`:'5枚の思い出がそろいました';const got=memories.filter(memoryUnlocked).length;albumBadge.textContent=got+'/5';albumBadge.setAttribute('aria-label','思い出 '+got+' / 5');});gameUI.refresh();
  let resultBtn;
  function onClear(){
    if(resultBtn)resultBtn.hidden=true;
    if(practice||stageIdx>=NSTAGE)return;
    const index=memories.findIndex(m=>m.stage===stageIdx+1);if(index<0)return;
    const stage=stageIdx+1,fresh=!progress.memories.includes(stage);
    if(fresh){progress.memories.push(stage);emit('album_unlock','stage_'+stage);window.beatPSF?.event('story_unlock','album','stage_'+stage);}
    if(stage===1)progress.album=true;save();
    // The result card is rebuilt each clear: the memory badge goes (back) into its unlock row.
    if(!resultBtn){resultBtn=document.createElement('button');resultBtn.id='world-result-album';resultBtn.type='button';resultBtn.className='result-unlock result-memory';}
    ($('clear-unlocks')||$('clearov').querySelector('.btnrow')).prepend(resultBtn);
    resultBtn.onclick=()=>album(index);resultBtn.innerHTML='<i aria-hidden="true">📷</i>思い出'+(fresh?'<small>NEW</small>':'');resultBtn.setAttribute('aria-label',fresh?'新しい思い出が増えました！':'思い出の写真を見る');resultBtn.hidden=false;
  }
  // The picture story is no longer shown by itself (first launch goes straight
  // into stage 1, cosmii-guide.js); the album keeps it as a replay.
  // A memory unlocked since it was last looked at is announced once at the next
  // launch, on the home screen, after the daily bonus.
  if(!Array.isArray(progress.memSeen)){progress.memSeen=[...progress.memories];save();}
  const markSeen=stage=>{if(!progress.memSeen.includes(stage)){progress.memSeen.push(stage);save();}};
  function memoryNotice(){
    const index=memories.findIndex(m=>memoryUnlocked(m)&&!progress.memSeen.includes(m.stage));if(index<0)return false;
    const m=memories[index];markSeen(m.stage);
    open(`<div class="world-paper game-paper memory-notice">${gameHead('book','NEW MEMORY','新しい思い出が届きました',`<span aria-hidden="true">📷</span> <b>STAGE ${m.stage}</b>`)}<div class="memory-notice-body"><div class="memory-notice-photo" role="img" aria-label="${m.title}" style="${memoryArt(index)}"></div><div class="memory-notice-copy"><b>${m.title}</b><p>${m.text}</p><div class="world-actions"><button id="memory-open">アルバムで見る ▶</button><button id="memory-later" class="secondary">あとで</button></div></div></div></div>`);
    modal.querySelector('#world-close').onclick=close;modal.querySelector('#memory-later').onclick=close;modal.querySelector('#memory-open').onclick=()=>album(index);
    modal.querySelector('#memory-open').focus();emit('memory_notice','stage_'+m.stage);window.beatPSF?.event('story_notice','launch','stage_'+m.stage);
    return true;
  }
  if(!DEMO){
    const today=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
    let since=0;
    const launchNotice=setInterval(()=>{
      const home=bootDone&&state==='menu'&&getComputedStyle($('menu')).display!=='none'&&getComputedStyle($('splash')).display==='none'&&modal.hidden&&getComputedStyle($('loginov')).display==='none'&&localStorage.getItem('rdash_login_last')===today();
      if(!home){since=0;return;}
      if(!since){since=performance.now();return;}
      if(performance.now()-since<800)return;   // let the home screen settle first
      clearInterval(launchNotice);window.cosmiiWorld.launchNotice=memoryNotice()?'shown':'none';
    },200);
    setTimeout(()=>clearInterval(launchNotice),120000);   // only around launch
  }
  let lastActive=false;
  window.cosmiiWorld={
    beforeStage(){return Promise.resolve(true);},
    // suppressed: a stage world paints its own scenery, so the neon layers hide.
    background(suppressed=false){
      applyTheme(stageIdx);
      const active=!suppressed&&['ready','play','dead','paused','clear'].includes(state)&&layer.complete&&layer.naturalWidth>0;
      if(active!==lastActive){app.classList.toggle('world-stage',active);lastActive=active;}
      const showCeiling=active&&flipZones.some(z=>z.start-.6<songPos+W*.8/SPEED&&z.end+.6>songPos-W*.4/SPEED);
      // Song position freezes during pause/death and rewinds with retries/checkpoints.
      // Alternating mirrored panels meet at identical image edges without a hard wrap.
      // Counted from the start of the 3-2-1 run-up, so the scenery moves while counting.
      const runUp=typeof COUNT_SEC==="number"?LEAD+COUNT_SEC:0;
      const distance=Math.max(0,songPos+runUp)*scenerySpeed();
      const phase=((distance/W)%2)*100;
      // Write only what changed: the DOM is otherwise dirtied every frame even
      // while paused, dead or in the menu.
      scenery.forEach((panel,i)=>{
        const x=(i*100-phase).toFixed(3),flip=i%2?-1:1;
        if(panel.floor.hidden!==!active)panel.floor.hidden=!active;
        if(panel.ceiling.hidden!==!showCeiling)panel.ceiling.hidden=!showCeiling;
        if(!active)return;
        if(panel.lastX!==x){panel.lastX=x;panel.floorFrame.style.transform=`translateX(${x}%) scaleX(${flip})`;}
        if(showCeiling&&panel.ceilingX!==x){panel.ceilingX=x;panel.ceilingFrame.style.transform=`translateX(${x}%) scale(${flip},-1)`;}
      });
      // The opening passes over the player's centre. The near pillar is
      // drawn over the canvas while the rest of the gate sits behind it.
      const characterX=W*.3+B/2, speed=scenerySpeed();
      const time=state==='ready'?-runUp:songPos;
      const finishX=characterX+(duration-.18-time)*speed;
      // The start gate stands just ahead of Cosmii while it waits for GO!.
      const startTime=state==='ready'?-LEAD:songPos;
      // (just past Cosmii's nose: its left pillar starts at Cosmii's front; the img is min(34%,44cqh) wide)
      const startX=characterX+B*.85+.22*Math.min(W*.34/.44,DH)*.86+(-LEAD-startTime)*speed;
      // stageIdx <= NSTAGE: the daily stage (index NSTAGE) has its gates too
      const gatesOn=['ready','play','dead','paused','clear'].includes(state)&&stageIdx<=NSTAGE;
      gates.forEach(gate=>{
        const x=gate===startGate?startX:finishX;
        const hidden=!gatesOn||x<-W*.18||x>W*1.18;
        for(const {layer} of gate.layers)if(layer.hidden!==hidden)layer.hidden=hidden;
        if(hidden)return;
        const transform=`translateX(${(x/W*100).toFixed(3)}%)`;
        if(gate.lastTransform!==transform){
          gate.lastTransform=transform;
          for(const {layer} of gate.layers)layer.style.transform=transform;
        }
      });
      return active;
    },
    // GO!: the tape snaps; a new attempt from the top closes it again.
    openGate(){setGate(true,true);},
    closeGate(closed=true){setGate(!closed,false);},
    drawObstacle,onClear, album, profiles, themeFor, replayOpening:()=>intro(false)
  };
})();
