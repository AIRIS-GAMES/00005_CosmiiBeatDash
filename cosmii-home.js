/* Home presentation only: keep existing buttons, handlers and accessible names. */
(() => {
  const asset='Asset/world/';
  const wordmark=document.querySelector('#home-header .wordmark');
  wordmark.innerHTML='<img class="home-title-art" src="'+asset+'title-arcade.png" alt="COSMII RHYTHM DASH">';
  const icon=(button,index)=>{
    if(!button||button.querySelector('.home-menu-icon'))return;
    const image=document.createElement('span');image.className='home-menu-icon';image.setAttribute('aria-hidden','true');
    image.style.backgroundPosition=`${index%3*50}% ${Math.floor(index/3)*100}%`;
    button.prepend(image);
  };
  function decorate(){
    const play=$('continue-btn').querySelector('span');
    if(play&&!play.querySelector('img'))play.innerHTML='<img src="'+asset+'play-icon.png" alt="">';
    icon($('missions-open'),0);icon($('more-open'),1);icon($('world-album-open'),2);
    ['help-open','social-open','games-open'].forEach((id,i)=>{
      const b=$(id);if(b.querySelector('.home-extra-icon'))return;
      const im=document.createElement('span');im.className='home-extra-icon';im.setAttribute('aria-hidden','true');im.style.backgroundPosition=`${i*50}% 50%`;b.prepend(im);
    });
    const profiles=$('world-profiles-open');
    if(!profiles.querySelector('img')){
      const img=document.createElement('img');img.className='home-profile-icon';img.src=asset+'cast-neon/red.png';img.alt='';profiles.prepend(img);
    }
    icon($('stageSelectBtn'),4);icon($('dailybtn'),5);
    document.querySelectorAll('#grid .tile').forEach((tile,i)=>{
      const theme=cosmiiWorld.themeFor(i);
      tile.title=`STAGE ${i+1} · ${theme.name}`;
      tile.style.backgroundImage=`linear-gradient(#080b3260,#080b32b0),url("${asset+theme.file}")`;
      tile.style.backgroundSize='cover';tile.style.backgroundPosition='center';
    });
  }
  gameUI.onRefresh(decorate);decorate();
})();
// Title screen: the stage worlds take turns. Each world's background cross-fades
// in with that world's own song (from its lively part, like the ♪ preview), a
// chip names the world and a dot row shows where we are. One shared music
// element (html-audio.js previewTrack): starting a stage or a ♪ preview takes
// it over, and back on the title the current world's song returns. Browsers
// allow sound only after a tap, so a refused autoplay waits for the first tap /
// key while the pictures keep turning. "演出を控えめに" / reduced motion holds the
// first world (its song still plays) and stops the logo, character and button motion.
(() => {
  const menu=$('menu');
  const WORLDS=[
    {img:'Asset/world/rhythm-neon.jpg',name:'スターアーケード',stages:'1–4',stage:0},
    {img:'Asset/worlds/rescue/sunset-background.jpg',name:'そらのレスキュー',stages:'5–6',stage:4},
    {img:'Asset/worlds/cannon/background.jpg',name:'ドッカン大砲',stages:'7–8',stage:6},
    {img:'Asset/worlds/roll/background.jpg',name:'ころころコスミー',stages:'9–10',stage:8},
    {img:'Asset/worlds/sudoku/background.jpg',name:'ドットの階段',stages:'11–12',stage:10},
    {img:'Asset/worlds/catch/background.jpg',name:'月夜のキャッチ',stages:'13–14',stage:12},
    {img:'Asset/worlds/mogu/background.jpg',name:'パクパク',stages:'15–16',stage:14},
    {img:'Asset/worlds/match/background.jpg',name:'ブロックマッチ',stages:'17–18',stage:16},
    {img:'Asset/worlds/arcade/background.jpg',name:'ブラックアウト',stages:'19',stage:18}
  ];
  const HOLD=10600,FADE=1400,MUSIC_OUT=500,MUSIC_IN=700;
  const trackOf=w=>AUDIO_TRACKS[STAGES[w.stage]?.file];

  // ---- pictures ----
  const backdrop=document.createElement('div');backdrop.className='home-bg';backdrop.setAttribute('aria-hidden','true');
  const layers=[0,1].map(()=>{const d=document.createElement('div');d.className='home-bg-layer';d.style.animationDuration=(HOLD+FADE*2)+'ms';backdrop.append(d);return d;});
  const shade=document.createElement('div');shade.className='home-bg-shade';backdrop.append(shade);
  const chip=document.createElement('div');chip.className='home-world-chip';
  const dots=document.createElement('div');dots.className='home-world-dots';dots.setAttribute('aria-hidden','true');
  WORLDS.forEach(()=>dots.append(document.createElement('i')));
  menu.prepend(backdrop);menu.append(chip,dots);menu.classList.add('home-bg-cycle');
  const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
  const calm=()=>!!window.reducedEffects||reducedMotion.matches;
  const shown=id=>getComputedStyle($(id)).display!=='none';
  const onHome=()=>state==='menu'&&shown('menu')&&!shown('stageSelect');
  const onTitle=()=>state==='menu'&&(shown('menu')||shown('stageSelect'));
  let index=-1,front=0,timer=null,chipTimer=null;
  function paint(i,instant){
    index=(i+WORLDS.length)%WORLDS.length;
    const next=layers[1-front],prev=layers[front],w=WORLDS[index];
    next.style.backgroundImage=`url("${w.img}")`;
    next.classList.remove('zoom');void next.offsetWidth;if(!calm())next.classList.add('zoom');else prev.classList.remove('zoom');
    if(instant)next.style.transition=prev.style.transition='none';
    next.classList.add('on');prev.classList.remove('on');
    if(instant)requestAnimationFrame(()=>{next.style.transition=prev.style.transition='';});
    front=1-front;
    clearTimeout(chipTimer);chip.classList.add('fade');
    chipTimer=setTimeout(()=>{chip.innerHTML=`<b>STAGE ${w.stages}</b>${w.name}`;chip.classList.remove('fade');},instant?0:FADE/2);
    [...dots.children].forEach((d,n)=>d.classList.toggle('on',n===index));
    const after=WORLDS[(index+1)%WORLDS.length];   // warm only the next world's picture and song
    new Image().src=after.img;
    const t=trackOf(after);if(t)fetch(t.playback).catch(()=>{});
  }

  // ---- music ----
  let gen=-1,blocked=false,fade=null;
  const ours=()=>previewing&&previewing.generation===gen&&gen===playbackGeneration;
  const level=()=>currentMusicGain*audioPrefs.musicVolume;
  function ramp(from,to,ms,done){
    clearInterval(fade);const el=musicEl,t0=performance.now();
    if(!el){done?.();return;}
    fade=setInterval(()=>{const k=Math.min(1,(performance.now()-t0)/ms);try{el.volume=from+(to-from)*k;}catch{}if(k>=1){clearInterval(fade);fade=null;done?.();}},40);
  }
  function play(){
    if(blocked||!onTitle()||document.hidden||(previewing&&!ours()))return;
    const track=trackOf(WORLDS[index]);if(!track)return;
    const start=0.9+Math.max(0,Math.round(track.duration*0.3));
    gen=previewTrack(track,start,()=>{if(onTitle()&&!document.hidden)blocked=true;});   // onEnd here = play() refused
    const target=level();try{musicEl.volume=0;}catch{}ramp(0,target,MUSIC_IN);
  }
  // Next world: fade the song out, then turn the picture and bring in the new song together.
  function advance(){
    if(!onHome())return;
    if(ours()&&!musicEl.paused){const v=musicEl.volume;ramp(v,0,MUSIC_OUT,()=>{paint(index+1);play();});}
    else{paint(index+1);play();}
  }
  function sync(){
    const still=calm();
    menu.classList.toggle('home-alive',!still);
    clearInterval(timer);timer=null;
    if(index<0)paint(0,true);
    if(still){if(index!==0){paint(0,true);if(ours())play();}else layers[front].classList.remove('zoom');}
    else timer=setInterval(advance,HOLD+FADE);
  }
  sync();
  addEventListener('cosmii-effects-change',sync);
  reducedMotion.addEventListener?.('change',sync);
  // Bubble phase, after the button's own handler: a tap that leaves the title starts no song.
  const gesture=()=>{if(typeof ensureAudio==='function')ensureAudio();blocked=false;if(!ours())play();};
  addEventListener('click',gesture);
  addEventListener('keydown',gesture);
  // Back on the title (after a stage, a ♪ preview or another app): the current world's song resumes.
  setInterval(()=>{if(!ours())play();},600);
})();
