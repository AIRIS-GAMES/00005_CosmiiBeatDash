/* Collaboration information and normal-stage SUN FEVER. No event rewards. */
(() => {
  'use strict';
  const config = globalThis.COLLAB || { enabled: false };
  let lastCheck = 0;
  const active = () => {
    const now = Date.now();
    const start = config.startsAt === null ? -Infinity : Date.parse(config.startsAt);
    const end = config.endsAt === null ? Infinity : Date.parse(config.endsAt);
    return config.enabled === true && now >= start && now < end;
  };
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
  const homeArt = document.createElement('div');
  homeArt.id = 'collab-home-art'; homeArt.hidden = true;
  homeArt.innerHTML = '<img alt="おっ！サンと犬の応援（© SUN-TV）">';
  $('stagecol').prepend(homeArt);
  const lobby = document.createElement('section');
  lobby.id = 'collab-lobby'; lobby.className = 'overlay'; lobby.hidden = true;
  lobby.setAttribute('role', 'dialog');
  lobby.setAttribute('aria-modal', 'true');
  lobby.setAttribute('aria-labelledby', 'collab-title');
  lobby.innerHTML = '<div class="collab-card"><img alt="おっ！サン"><small>© SUN-TV</small></div><div class="collab-info"><h2 id="collab-title">おっ！サン コラボ</h2><p id="collab-intro">いつものステージに、おっ！サンが登場！</p><div id="collab-howto"><strong>SUN POWER 100%で自動発動！</strong><p>PERFECT ＋14% ／ GREAT ＋9% ／ GOOD ＋5%<br>1回のSUN FEVERは10秒間。終了後は再びためられます。</p><small>コイン取得では増えません。<br>デイリー・練習モードは対象外です。</small></div><button id="collab-back">閉じる</button></div>';
  app.appendChild(lobby);
  let background = [];
  function close() {
    lobby.hidden = true;
    for (const [element, inert] of background) element.inert = inert;
    background = [];
    if (!banner.hidden) banner.focus({ preventScroll: true });
  }
  function refresh() {
    const enabled = active();
    banner.hidden = !enabled; homeArt.hidden = !enabled;
    $('menu').classList.toggle('collab-home', enabled);
    if (!enabled) {
      if (!lobby.hidden) close();
      for (const element of [lobby, homeArt, banner]) element.querySelector('img').removeAttribute('src');
    } else {
      if (!homeArt.querySelector('img').hasAttribute('src')) showImage(homeArt, '10');
      if (!banner.querySelector('img').hasAttribute('src')) showImage(banner, '08');
    }
  }
  banner.onclick = () => {
    if (!active()) { refresh(); return; }
    showImage(lobby, '10');
    background = [...app.children].filter(element => element !== lobby).map(element => [element, element.inert]);
    for (const [element] of background) element.inert = true;
    lobby.hidden = false;
    $('collab-back').focus({ preventScroll: true });
  };
  $('collab-back').onclick = close;
  lobby.addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); close(); }
    if (event.key === 'Tab') { event.preventDefault(); $('collab-back').focus(); }
  });
  function tick() {
    if (Date.now() - lastCheck > 1000) { lastCheck = Date.now(); refresh(); }
    window.sunRhythm?.tick();
  }
  function resetRun() { window.sunRhythm?.reset(); }
  window.collaboration = { active, tick, resetRun };
  document.addEventListener('visibilitychange', refresh);
  refresh();
})();
