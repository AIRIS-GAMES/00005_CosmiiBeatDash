/* Provided PNGs are displayed whole and unmodified. No character dialogue. */
(() => {
  'use strict';
  const config = globalThis.COLLAB || { enabled: false, id: 'ohsun_2026' };
  const collaborationImages = config.enabled === true ? ['07','08','09','10','11','12','13'].map(n => {
    const image = new Image(); image.decoding = 'async';
    image.src = config.assetRoot + 'ohsun_' + n + '.png';
    return image;
  }) : [];
  const collaborationPreload = Promise.all(collaborationImages.map(image => {
    const decoded = image.decode ? image.decode().catch(() => {}) : Promise.resolve();
    return Promise.race([decoded, new Promise(resolve => setTimeout(resolve, 1500))]);
  }));
  const key = 'rdash_collab_' + config.id + '_progress';
  let progress, progressDirty = false;
  try { progress = JSON.parse(localStorage.getItem(key) || '{}') || {}; } catch { progress = {}; }
  let playing = false, lastCheck = 0;
  const active = () => {
    const now = Date.now();
    const start = config.startsAt === null ? -Infinity : Date.parse(config.startsAt);
    const end = config.endsAt === null ? Infinity : Date.parse(config.endsAt);
    return config.enabled === true && now >= start && now < end;
  };
  const save = () => localStorage.setItem(key, JSON.stringify(progress));
  const card = (id) => `<div class="collab-card"${id ? ` id="${id}"` : ''}><img alt="おっ！サン"><small>© SUN-TV</small></div>`;
  const showImage = (element, n) => {
    const img = element.querySelector('img');
    img.onerror = () => { img.hidden = true; };
    img.hidden = false;
    img.src = config.assetRoot + 'ohsun_' + n + '.png';
  };
  const banner = document.createElement('button');
  banner.id = 'collab-banner'; banner.hidden = true;
  banner.innerHTML = '<img class="collab-banner-art" alt="おっ！サン（© SUN-TV）"><b>おっ！さんコラボ開催中</b>';
  $('stagecol').insertBefore(banner, $('dailybtn'));
  const homeArt=document.createElement('div');homeArt.id='collab-home-art';homeArt.hidden=true;
  homeArt.innerHTML='<img alt="おっ！サンと犬の応援（© SUN-TV）">';
  $('stagecol').prepend(homeArt);
  const lobby = document.createElement('section');
  lobby.id = 'collab-lobby'; lobby.className = 'overlay'; lobby.hidden = true;
  lobby.innerHTML = card('') + '<div class="collab-info"><h2>おっ！サン<span>45秒チャレンジ</span></h2><p id="collab-bonus">限定ボーナス<span>最大200コイン</span></p><button id="collab-start">あそぶ</button><div class="collab-secondary"><button id="collab-rewards-open">報酬を見る</button><button id="collab-back">戻る</button></div></div>';
  app.appendChild(lobby);
  const rewards=document.createElement('section');rewards.id='collab-rewards';rewards.hidden=true;
  rewards.setAttribute('role','dialog');rewards.setAttribute('aria-modal','true');
  rewards.setAttribute('aria-labelledby','collab-rewards-title');
  rewards.innerHTML='<div class="rewards-sheet"><header><h2 id="collab-rewards-title" tabindex="-1">チャレンジ報酬</h2><button id="collab-rewards-close">閉じる</button></header><div class="rewards-scroll"><div id="collab-goals"></div><p>各報酬はイベント中1回。<br>獲得コインは終了後も残ります。</p><p id="collab-period"></p></div></div>';
  app.appendChild(rewards);
  let rewardBackground=[];
  function closeRewards(){
    rewards.hidden=true;for(const [element,inert] of rewardBackground)element.inert=inert;rewardBackground=[];
    if(!lobby.hidden)$('collab-rewards-open').focus({preventScroll:true});
  }
  $('collab-rewards-close').onclick=closeRewards;
  rewards.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();closeRewards();}if(event.key==='Tab'){event.preventDefault();$('collab-rewards-close').focus();}});
  const result = document.createElement('div');
  result.id = 'collab-result-wrap';
  result.innerHTML = card('collab-result'); result.hidden = true;
  $('clearov').insertBefore(result, $('cleartitle'));
  const goals = [
    { id: 'coins', text: '1プレイでコイン30枚', reward: 50 },
    { id: 'combo', text: '15 COMBO達成', reward: 50 },
    { id: 'clear', text: 'イベントステージクリア', reward: 100 }
  ];
  const renderGoals = () => {
    $('collab-goals').innerHTML = goals.map(g => `<div class="collab-goal"><span>${g.text}</span><b>＋${g.reward}コイン</b>${progress[g.id]?'<span class="collab-claimed">獲得済み</span>':''}</div>`).join('');
  };
  function claim(id) {
    if (progress[id]) return;
    const goal = goals.find(g => g.id === id);
    progress[id] = true; progressDirty = true;
    addCoins(goal.reward);
    gaCoins('Source', goal.reward, 'Mission', config.id + '_' + id);
    toast('EVENT BONUS +' + goal.reward);
  }
  function setPlaying(value) {
    playing = value && active();
    app.classList.toggle('collab-playing', playing);
    window.sunRhythm?.reset();
    result.hidden = true;
    $('clearov').classList.remove('collab-clear');
    $('clearchar').hidden = false;
    resize();
  }
  function refresh() {
    const enabled = active();
    banner.hidden = !enabled;
    homeArt.hidden = !enabled;
    $('menu').classList.toggle('collab-home', enabled);
    if (!enabled) {
      lobby.hidden = true;
      if(!rewards.hidden)closeRewards();
      if (playing) backToMenu();
      for (const img of app.querySelectorAll('.collab-card img')) img.removeAttribute('src');
      homeArt.querySelector('img').removeAttribute('src');
      banner.querySelector('img').removeAttribute('src');
    } else if (!homeArt.querySelector('img').hasAttribute('src')) {
      showImage(homeArt, '10');
    }
    if(enabled&&!banner.querySelector('img').hasAttribute('src'))showImage(banner,'08');
  }
  banner.onclick = () => {
    if (!active()) { refresh(); return; }
    renderGoals();
    showImage(lobby, String(7 + Math.floor(Date.now() / 86400000) % 7).padStart(2, '0'));
    $('collab-period').textContent = config.endsAt
      ? '開催終了：' + new Date(config.endsAt).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }) + '（日本時間）'
      : '期間限定開催中';
    lobby.hidden = false;
  };
  $('collab-back').onclick = () => { lobby.hidden = true; };
  $('collab-rewards-open').onclick=()=>{
    if(!active()){refresh();return;}renderGoals();
    rewardBackground=[...app.children].filter(element=>element!==rewards).map(element=>[element,element.inert]);
    for(const [element] of rewardBackground)element.inert=true;
    rewards.hidden=false;rewards.querySelector('.rewards-scroll').scrollTop=0;$('collab-rewards-title').focus({preventScroll:true});
  };
  $('collab-start').onclick = async () => {
    if (!active()) { refresh(); return; }
    await collaborationPreload;
    await window.sunRhythm?.preload?.();
    lobby.hidden = true;
    STAGES[EVENT_IDX] = { name: 'SUN RHYTHM CHALLENGE', file: SONGS[0], hue: 52, speed: 370, diff: 0.35, seed: 3307, duration: 45 };
    await selectStage(EVENT_IDX);
  };
  function tick() {
    if (Date.now() - lastCheck > 1000) { lastCheck = Date.now(); refresh(); }
    if (playing && !active()) refresh();
    if (playing || state === 'play' || state === 'ready' || state === 'dead') window.sunRhythm?.tick();
    if (playing && state === 'play') {
      if (coinRun >= 30) claim('coins');
      if (maxCombo >= 15) claim('combo');
    }
  }
  function resetRun() { window.sunRhythm?.reset(); }
  function complete(extra) {
    if (!active()) return;
    if (coinRun >= 30) claim('coins');
    if (maxCombo >= 15) claim('combo');
    claim('clear');
    const isNewBest=score>(Number(progress.bestV2)||0);
    progress.bestV2 = Math.max(Number(progress.bestV2) || 0, score); progressDirty = true; flush();
    extra.push('イベント自己ベスト: ' + progress.bestV2);
    const stats=window.sunRhythm?.inspect();
    if(stats?.feverCount)extra.push(`FEVER ${stats.feverCount}回・${stats.feverSeconds.toFixed(1)}秒`);
    showImage(result, '13'); result.hidden = false;
    $('clearov').classList.add('collab-clear');
    $('clearchar').hidden = true;
    return isNewBest;
  }
  function flush() { if (progressDirty) { progressDirty = false; save(); } }
  window.collaboration = { active, setPlaying, tick, complete, resetRun, flush };
  document.addEventListener('visibilitychange', refresh);
  refresh();
})();
