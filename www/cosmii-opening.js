/* Generated still illustrations, DOM captions and optional camera movement. */
(() => {
  const base='Asset/world/opening/';
  const scenes=[
    ['01-after-hours.png','ここは、とある街のゲームセンター。',[1.35,.05,.40],[1.25,.25,.40]],
    ['01-after-hours.png','お客さんが帰ったあと。\nここには、まだ遊びたい子たちがいます。',[1.25,.55,.45],[1.45,.92,.45]],
    ['02-friends.png','この子たちは、コスミー。\n遊んだり、お茶を飲んだり、いたずらしたり。',[1.4,.08,.45],[1.4,.48,.45]],
    ['02-friends.png','のんびりしたい夜も、\nなぜか、にぎやかになります。',[1.35,.75,.45],[1,.5,.5]],
    ['03-discovery.png','今夜、赤が見つけたのは、\n楽しそうな音のするゲーム。',[1.3,.12,.40],[1.25,.55,.45]],
    ['03-discovery.png','おもしろそう、と思ったら。\n赤は、もう黄緑を誘っています。',[1.4,.88,.45],[1.05,.5,.5]],
    ['04-one-more-song.png','見ているだけのつもりでも。\n音が鳴ると、なんだか足がむずむず。',[1.35,.10,.48],[1.35,.90,.48]],
    ['04-one-more-song.png','今夜は、どんな思い出ができるかな。',[1.15,.6,.5],[1,.5,.5]]
  ];
  const transform=([z,x,y])=>`translate(${(0.5-x)*(z-1)*100}%,${(0.5-y)*(z-1)*100}%) scale(${z})`;
  window.cosmiiOpening={mount(host,finish){
    host.innerHTML=`<div class="opening-scene" tabindex="-1">
      <img class="opening-image" alt=""><div class="opening-shade"></div>
      <header class="opening-header"><h2 id="world-title">閉店後の、もう一曲。</h2><button id="world-skip">スキップ</button></header>
      <div class="opening-caption"><p id="opening-text" aria-live="polite"></p><small id="opening-status" role="status"></small></div>
      <footer class="opening-controls"><button id="world-back">前へ</button><span id="opening-count"></span><button id="opening-auto" aria-pressed="true">自動送り ON</button><button id="opening-next">次へ ›</button><button id="world-start" hidden>あそぶ</button></footer>
    </div>`;
    let index=0,auto=true,timer=null,camera=null,request=0,disposed=false,loaded=false,lines=[],visibleLines=0;
    const q=id=>host.querySelector(id),img=q('.opening-image');
    const reduced=matchMedia('(prefers-reduced-motion: reduce)');
    function stop(){clearTimeout(timer);timer=null;}
    function renderLines(){
      q('#opening-text').textContent=lines.slice(0,visibleLines).join('\n');
      q('#opening-status').textContent=visibleLines<lines.length?'タップで次の行へ':index===scenes.length-1?'「あそぶ」でゲームへ':'タップで次の場面へ';
    }
    function schedule(){
      stop();if(!auto||!loaded||disposed||document.hidden)return;
      const more=visibleLines<lines.length;
      if(!more&&index===scenes.length-1)return;
      const reading=Math.max(more?1800:3000,(lines[visibleLines-1]?.length||0)*90);
      timer=setTimeout(advance,reading);
    }
    function motion(){camera?.cancel();const scene=scenes[index];img.style.transform=transform(scene[3]);
      if(!reduced.matches&&!window.reducedEffects){camera=img.animate([{transform:transform(scene[2])},{transform:transform(scene[3])}],{duration:4200,easing:'ease-in-out',fill:'forwards'});if(document.hidden)camera.pause();}}
    function show(n){
      stop();camera?.cancel();index=Math.max(0,Math.min(scenes.length-1,n));loaded=false;const token=++request,scene=scenes[index];
      lines=scene[1].split('\n');visibleLines=0;q('#opening-text').textContent='';q('#opening-count').textContent=`${index+1} / ${scenes.length}`;
      q('#world-back').disabled=index===0;q('#opening-next').hidden=index===scenes.length-1;q('#world-start').hidden=index!==scenes.length-1;
      if(index===scenes.length-1&&document.activeElement===q('#opening-next'))q('#world-start').focus();
      img.alt=['閉店後のゲームセンターと景品棚の赤・黄緑','お茶会をする5体のコスミー','リズム筐体を見つけ、黄緑を誘う赤','リズム筐体の前に集まった5体'][Math.floor(index/2)];
      q('#opening-status').textContent='画像を読み込み中…';
      const ready=()=>{if(disposed||token!==request||loaded)return;loaded=true;visibleLines=1;renderLines();motion();schedule();};
      img.onload=ready;img.onerror=()=>{if(disposed||token!==request)return;visibleLines=lines.length;q('#opening-text').textContent=lines.join('\n');q('#opening-status').textContent='画像を読み込めませんでした。「次へ」で続けられます。';};
      const src=new URL(base+scene[0],document.baseURI).href;
      if(img.src===src&&img.complete&&img.naturalWidth)ready();else img.src=src;
    }
    function advance(){
      if(disposed)return;
      stop();
      if(loaded&&visibleLines<lines.length){visibleLines++;renderLines();schedule();}
      else if(index<scenes.length-1)show(index+1);
    }
    const visibility=()=>{if(document.hidden){stop();camera?.pause();}else{camera?.play();schedule();}};
    const keys=e=>{if(e.key==='ArrowRight'){e.preventDefault();advance();}if(e.key==='ArrowLeft'){e.preventDefault();show(index-1);}};
    q('#opening-next').onclick=advance;q('#world-back').onclick=()=>show(index-1);
    q('#world-skip').onclick=()=>finish('skip');q('#world-start').onclick=()=>finish('play');
    q('.opening-scene').onclick=e=>{if(!e.target.closest('button')){q('.opening-scene').focus({preventScroll:true});advance();}};
    q('#opening-auto').onclick=()=>{auto=!auto;q('#opening-auto').textContent=`自動送り ${auto?'ON':'OFF'}`;q('#opening-auto').setAttribute('aria-pressed',String(auto));schedule();};
    document.addEventListener('visibilitychange',visibility);host.addEventListener('keydown',keys);reduced.addEventListener('change',motion);
    window.addEventListener('cosmii-effects-change',motion);
    show(0);q('#opening-next').focus();
    return ()=>{disposed=true;request++;stop();camera?.cancel();img.onload=img.onerror=null;document.removeEventListener('visibilitychange',visibility);host.removeEventListener('keydown',keys);reduced.removeEventListener('change',motion);window.removeEventListener('cosmii-effects-change',motion);};
  }};
})();
