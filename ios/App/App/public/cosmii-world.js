/* Presentation and optional story only. Physics, charts, rewards and saves remain in the original game. */
(() => {
  'use strict';
  const ASSET='Asset/world/', KEY='cosmii_dash_story_v1';
  let progress={intro:false,album:false};
  try{progress={...progress,...JSON.parse(localStorage.getItem(KEY)||'{}')};}catch{}
  const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(progress));}catch{}};
  // Existing clears open the album silently; migration is not a new achievement.
  if(best(0)>=100&&!progress.album){progress.album=true;save();}
  const layer=document.createElement('img');layer.id='world-backdrop';layer.src=ASSET+'rhythm-neon.png';layer.alt='';layer.hidden=true;app.prepend(layer);
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
    const gate=document.createElement('div');gate.hidden=true;
    const speaker=document.createElement('img');speaker.src=ASSET+'neon-speaker.png';speaker.alt='';
    gate.append(speaker);
    gate.className='world-boundary';gate.id='world-gate-'+name;app.append(gate);return gate;
  });
  let tempoBeats=null,tempoScale=1;
  const themes=[
    {file:'rhythm-neon.png',name:'スターアーケード',floor:5/6},
    {file:'theme-sea.png',name:'ネオンアクアリウム',floor:791/941},
    {file:'theme-garden.png',name:'ミッドナイトガーデン',floor:767/941},
    {file:'theme-sunset.png',name:'サンセットドリーム',floor:789/941},
    {file:'theme-aurora.png',name:'オーロラステージ',floor:798/941}
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
      image.onerror=()=>{image.onerror=null;setImage(image,isCeiling,'rhythm-neon.png',5/6);};
      if(file==='rhythm-neon.png')image.onerror=null;
      image.src=ASSET+file;
    };
    scenery.forEach(panel=>{setImage(panel.floor,false,theme.file,theme.floor);setImage(panel.ceiling,true,theme.file,theme.floor);});
    gates.forEach(g=>g.style.filter=filter);
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
      context.beginPath();context.rect(0,0,shape.w,shape.h);context.clip();
      for(let y=shape.h-B;y>-B;y-=B)for(let x=0;x<shape.w;x+=B)context.drawImage(art.image,...art.crop,x,y,B,B);
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
  function album(index=0){
    if(!Number.isInteger(index))index=0;
    const m=memories[index]||memories[0],unlocked=memoryUnlocked(m);
    const art=!unlocked?`<img src="${ASSET}arcade-night.png" alt="未解放の思い出">`:index===0?`<img src="${ASSET}first-night.png" alt="赤と黄緑の最初の思い出">`:`<div class="memory-photo" role="img" aria-label="${m.title}" style="background-position:${(index-1)%2*100}% ${Math.floor((index-1)/2)*100}%"></div>`;
    open(`<div class="world-album world-paper"><header><div><small>閉店後のアルバム · ${memories.filter(memoryUnlocked).length} / 5</small><h2 id="world-title">${unlocked?m.title:'まだ見ぬ思い出'}</h2></div><button id="world-close" class="secondary">閉じる</button></header><nav class="memory-tabs" aria-label="思い出を選ぶ">${memories.map((entry,i)=>`<button data-memory="${i}" aria-pressed="${i===index}">${memoryUnlocked(entry)?'★':'🔒'} STAGE ${entry.stage}</button>`).join('')}</nav><div class="world-album-body">${art}<div><p style="white-space:pre-line">${unlocked?m.text:`ステージ${m.stage}をクリアすると、\n新しい写真と会話が開きます。`}</p><div class="world-actions">${unlocked?'<button id="world-profile">この子たちを知る</button>':''}<button id="world-replay" class="secondary">はじまりを見る</button></div></div></div></div>`);
    modal.querySelector('#world-close').onclick=close;modal.querySelector('#world-replay').onclick=()=>intro(false);modal.querySelector('#world-profile')?.addEventListener('click',()=>profiles(0,'album'));
    modal.querySelectorAll('[data-memory]').forEach(b=>b.onclick=()=>album(Number(b.dataset.memory)));emit('album_open',unlocked?'unlocked':'locked');window.beatPSF?.event('album_open',unlocked?'unlocked':'locked','stage_'+m.stage);
  }
  function profiles(index=skinIdx,source='home'){
    index=Number.isInteger(index)&&index>=0&&index<ids.length?index:0;
    selectedProfile=index;
    window.beatPSF?.profile(index,source,skinUnlocked(index));
    const unlocked=skinUnlocked(index),need=SKINS[index].need,count=clearedCount();
    const content=unlocked?`<p>${summaries[index]}</p><p class="world-instruction">ゲーム内の効果：${SKINS[index].desc}</p><button id="profile-select">この子を選んで遊ぶ</button>`:
      `<div class="profile-locked"><strong>🔒 まだ出会っていないコスミー</strong><p>異なるステージを${need}個クリアすると、<br>この子の紹介と操作キャラが解放されます。</p><progress value="${Math.min(count,need)}" max="${need}" aria-label="キャラクター解放までの進み具合"></progress><p>クリア済み：${count} / ${need}ステージ<br>あと${Math.max(0,need-count)}ステージで解放</p><small>同じステージを繰り返しクリアしても数は増えません。<br>キャラ選択で${skinPrice(index)}コインを使って解放することもできます。</small><button id="profile-unlock">キャラ選択で解放する</button></div>`;
    open(`<div class="world-paper world-profiles"><header><div><small>出会ったコスミー ${ids.filter((_,i)=>skinUnlocked(i)).length} / ${ids.length}</small><h2 id="world-title">${names[index]}コスミー</h2></div><button id="world-close" class="secondary">閉じる</button></header><div class="world-profile-tabs">${ids.map((id,i)=>`<button data-character="${i}" aria-label="${names[i]}の紹介${skinUnlocked(i)?'':'・未解放'}" aria-pressed="${i===index}"><img class="${skinUnlocked(i)?'':'profile-silhouette'}" src="${ASSET}cast-neon/${id}.png" alt=""><span>${skinUnlocked(i)?'':'🔒 '}${names[i]}</span></button>`).join('')}</div><div class="world-profile-body"><img class="${unlocked?'':'profile-silhouette'}" src="${ASSET}cast-neon/${ids[index]}.png" alt="${unlocked?names[index]:'未解放のコスミーのシルエット'}"><div>${content}<nav aria-label="公式SNS">${social.map(([id,label,url])=>`<a data-social="${id}" href="${url}" target="_blank" rel="noopener noreferrer">公式${label} ↗</a>`).join('')}</nav></div></div></div>`);
    modal.querySelector('#world-close').onclick=close;
    modal.querySelector('#profile-select')?.addEventListener('click',()=>{if(!skinUnlocked(index))return;skinIdx=index;localStorage.setItem('rdash_skin',index);gaDesign('Skin:Select:'+SKINS[index].n,1);refreshMenu();close();});
    modal.querySelector('#profile-unlock')?.addEventListener('click',()=>{close();$('avatar-btn').click();});
    modal.querySelectorAll('[data-character]').forEach(b=>b.onclick=()=>profiles(Number(b.dataset.character),'profile'));modal.querySelectorAll('[data-social]').forEach(a=>a.onclick=()=>{emit('external_click',a.dataset.social);window.beatPSF?.external(a.dataset.social,'profile');});emit(unlocked?'profile_open':'profile_locked',source+'_'+ids[index]);
  }
  const albumButton=document.createElement('button');albumButton.id='world-album-open';albumButton.textContent='アルバム';albumButton.onclick=album;
  const profileButton=document.createElement('button');profileButton.id='world-profiles-open';profileButton.textContent='コスミー紹介';profileButton.onclick=()=>profiles(skinIdx);
  $('home-footer').append(albumButton,profileButton);
  $('more-open').textContent='設定';
  ['missions-open','more-open','help-open','world-album-open','world-profiles-open','social-open','games-open'].forEach(id=>$('home-footer').append($(id)));
  $('home-footer').querySelector('span').textContent='閉店後は、コスミーたちの時間。';
  $('home-header').querySelector('.wordmark').innerHTML='COSMII <span>RHYTHM DASH · よるのゲームセンター</span>';
  const plaque=document.createElement('p');plaque.className='world-plaque';plaque.textContent='今夜は、どの曲であそぶ？';$('stagecol').prepend(plaque);
  const originalRefresh=gameUI.refresh;
  gameUI.refresh=()=>{originalRefresh();$('charname').textContent=names[skinIdx]+'コスミー';const next=memories.find(m=>!memoryUnlocked(m));plaque.textContent=next?`ステージ${next.stage}クリアで、新しい思い出`:'5枚の思い出がそろいました';};gameUI.refresh();
  let resultBtn;
  function onClear(){
    if(resultBtn)resultBtn.hidden=true;
    if(practice||stageIdx>=NSTAGE)return;
    const index=memories.findIndex(m=>m.stage===stageIdx+1);if(index<0)return;
    const stage=stageIdx+1,fresh=!progress.memories.includes(stage);
    if(fresh){progress.memories.push(stage);emit('album_unlock','stage_'+stage);window.beatPSF?.event('story_unlock','album','stage_'+stage);}
    if(stage===1)progress.album=true;save();
    if(!resultBtn){resultBtn=document.createElement('button');resultBtn.id='world-result-album';$('clearov').append(resultBtn);}
    resultBtn.onclick=()=>album(index);resultBtn.textContent=fresh?'新しい思い出が増えました！':'思い出の写真を見る';resultBtn.hidden=false;
  }
  // A new opening is shown once even if the previous one-page introduction was read.
  if(!DEMO&&!progress.opening){
    const bootOpening=setInterval(()=>{
      if(!bootDone||getComputedStyle($('splash')).display!=='none')return;
      clearInterval(bootOpening);
      if(state==='menu'&&modal.hidden)intro('boot');
    },100);
  }
  let lastActive=false;
  window.cosmiiWorld={
    beforeStage(i){if(i!==0||progress.intro||DEMO)return Promise.resolve(true);if(pending)return Promise.resolve(false);return new Promise(resolve=>{pending=resolve;intro(true);});},
    background(){
      applyTheme(stageIdx);
      const active=['ready','play','dead','paused','clear'].includes(state)&&layer.complete&&layer.naturalWidth>0;
      if(active!==lastActive){app.classList.toggle('world-stage',active);lastActive=active;}
      const showCeiling=active&&flipZones.some(z=>z.start-.6<songPos+W*.8/SPEED&&z.end+.6>songPos-W*.4/SPEED);
      // Song position freezes during pause/death and rewinds with retries/checkpoints.
      // Alternating mirrored panels meet at identical image edges without a hard wrap.
      const distance=Math.max(0,songPos)*scenerySpeed();
      const phase=((distance/W)%2)*100;
      scenery.forEach((panel,i)=>{
        const x=i*100-phase,flip=i%2?-1:1;
        panel.floor.hidden=!active;panel.ceiling.hidden=!showCeiling;
        panel.floorFrame.style.transform=`translateX(${x}%) scaleX(${flip})`;
        panel.ceilingFrame.style.transform=`translateX(${x}%) scale(${flip},-1)`;
      });
      const gatePositions=[-distance,Math.max(0,duration-songPos)*scenerySpeed()-W*.9+player.x];
      gates.forEach((gate,i)=>{
        const x=gatePositions[i];
        const visible=i===0?x>-W*.1:x<W*.1&&x>-W;
        gate.hidden=!active||!visible;
        gate.style.transform=`translateX(${x/W*100}%)`;
      });
      return active;
    },
    drawObstacle,onClear, album, profiles, themeFor, replayOpening:()=>intro(false)
  };
})();
