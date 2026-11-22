// "The game this stage comes from": the world stages are built on other AIRIS
// games (PROMO_GAMES in index.html). Three entry points:
//  1. result card: a banner under the result after every clear of a world stage
//  2. world clear: a one-time card the first time a world's last stage is
//     cleared (once per world, at most once per session)
//  3. stage select: an "App Store ↗" link beside each world heading
// Never shown in practice or daily runs, during play, or after a miss.
(function () {
  'use strict';
  const SOURCE = {   // stage world -> PROMO_GAMES id
    rescue: '6811575619', cannon: '6809099787', roll: '6829253493', sudoku: '6797260932',
    mogu: '6789935783', match: '6784988703', arcade: '6790154239',
  };
  const ART = {
    rescue: 'Asset/worlds/rescue/sunset-background.jpg', cannon: 'Asset/worlds/cannon/background.jpg',
    roll: 'Asset/worlds/roll/background.jpg', sudoku: 'Asset/worlds/sudoku/background.jpg',
    mogu: 'Asset/worlds/mogu/background.jpg', match: 'Asset/worlds/match/background.jpg',
    arcade: 'Asset/worlds/arcade/background.jpg',
  };
  const SEEN_KEY = 'rdash_source_popup';
  const plan = i => window.stageGimmicks?.PLAN?.[i + 1];
  const worldOf = i => (i >= 0 && i < NSTAGE - 1) ? plan(i)?.world : null;   // the finale mixes everything
  function gameFor(i) {
    const id = SOURCE[worldOf(i)];
    return id ? PROMO_GAMES.find(g => g.id === id) || null : null;
  }
  function stagesOf(world) {
    const list = [];
    for (let i = 0; i < NSTAGE - 1; i++) if (worldOf(i) === world) list.push(i);
    return list;
  }
  const seen = () => { try { return JSON.parse(localStorage.getItem(SEEN_KEY) || '[]'); } catch { return []; } };
  function markSeen(world) { try { localStorage.setItem(SEEN_KEY, JSON.stringify([...new Set([...seen(), world])])); } catch {} }
  const offRun = () => practice || (typeof dailyMode === 'function' && dailyMode());
  function link(a, g, where) {
    a.href = g.url; a.target = '_blank'; a.rel = 'noopener noreferrer';
    a.addEventListener('click', e => { e.stopPropagation(); gaDesign('Promo:Click:' + g.key + ':' + where, 1); });
  }

  // ---------- 1. result card ----------
  let banner = null;
  function resultBanner(g) {
    if (!banner) {
      banner = document.createElement('a'); banner.className = 'src-banner';
      banner.innerHTML = '<img alt=""><span><small>このステージのゲームはこちら</small><b></b><em></em></span><i>App Store ↗</i>';
    }
    const fresh = banner.cloneNode(true);   // a fresh node replays the entrance and drops old handlers
    fresh.querySelector('img').src = `Asset/promo/${g.id}.jpg`;
    fresh.querySelector('b').textContent = g.title;
    fresh.querySelector('em').textContent = g.sub;
    fresh.setAttribute('aria-label', `${g.title}をApp Storeで見る`);
    link(fresh, g, 'result');
    banner.replaceWith?.(fresh); banner = fresh;
    const row = $('clearov').querySelector('.btnrow');
    if (banner.nextElementSibling !== row) row.before(banner);
    banner.hidden = false;
    gaDesign('Promo:Impression:' + g.key + ':result', 1);
  }

  // ---------- 2. world clear card ----------
  let sessionShown = false, dialog = null, lastFocus = null;
  function closeDialog() {
    if (!dialog) return;
    dialog.remove(); dialog = null;
    removeEventListener('keydown', onKey, true);
    lastFocus?.focus?.();
  }
  function onKey(e) { if (e.key === 'Escape') { e.preventDefault(); closeDialog(); } }
  function worldCard(i, g) {
    const world = worldOf(i), stages = stagesOf(world), first = stages[0], last = stages[stages.length - 1];
    const range = first === last ? `ステージ${first + 1}` : `ステージ${first + 1}〜${last + 1}`;
    const name = STAGES[first].title || STAGES[first].name;
    dialog = document.createElement('div'); dialog.className = 'src-modal';
    dialog.innerHTML = `<div class="src-card" role="dialog" aria-modal="true" aria-labelledby="src-title">
      <div class="src-art"><span class="tag">WORLD CLEAR</span><img class="icon" alt=""><img class="cosmii" alt=""></div>
      <div class="src-body"><small></small><h3 id="src-title"></h3><p></p>
        <div class="src-actions"><a class="src-go">App Storeで見る ↗</a><button type="button" class="src-later">あとで</button></div></div></div>`;
    dialog.querySelector('.src-art').style.backgroundImage = `url("${ART[world]}")`;
    dialog.querySelector('.icon').src = `Asset/promo/${g.id}.jpg`;
    const face = typeof skinImageUrl === 'function' ? skinImageUrl(skinIdx) : '';
    const cosmii = dialog.querySelector('.cosmii'); if (face) cosmii.src = face; else cosmii.remove();
    dialog.querySelector('small').textContent = `「${name}」ワールドのもとになったゲーム`;
    dialog.querySelector('h3').textContent = g.title;
    dialog.querySelector('p').textContent = `${g.sub}。${range}の世界を、本編でもっと遊べます。`;
    const go = dialog.querySelector('.src-go'); link(go, g, 'world_clear'); go.addEventListener('click', closeDialog);
    dialog.querySelector('.src-later').onclick = closeDialog;
    dialog.addEventListener('click', e => { if (e.target === dialog) closeDialog(); });
    lastFocus = document.activeElement;
    $('app').append(dialog);
    addEventListener('keydown', onKey, true);
    dialog.querySelector('.src-later').focus({ preventScroll: true });
    markSeen(world); sessionShown = true;
    gaDesign('Promo:Impression:' + g.key + ':world_clear', 1);
  }

  // Called once the result card is on screen (index.html clearStage).
  function onClear() {
    if (banner) banner.hidden = true;
    if (offRun() || stageIdx >= NSTAGE) return;
    const g = gameFor(stageIdx); if (!g) return;
    resultBanner(g);
    const world = worldOf(stageIdx), stages = stagesOf(world);
    if (stageIdx !== stages[stages.length - 1] || seen().includes(world) || sessionShown) return;
    const token = clearToken;
    setTimeout(() => { if (token === clearToken && state === 'clear' && !dialog) worldCard(stageIdx, g); }, 1500);
  }

  // ---------- 3. stage select ----------
  function decorate(grid) {
    for (const group of grid.querySelectorAll('.wm-group')) {
      const h = group.querySelector('h3'), no = group.querySelector('.wm-no');
      if (!h || !no || h.querySelector('.wm-src')) continue;
      const g = gameFor(Number(no.textContent) - 1); if (!g) continue;
      const a = document.createElement('a'); a.className = 'wm-src';
      a.innerHTML = `<img src="Asset/promo/${g.id}.jpg" alt="">App Store ↗`;
      a.setAttribute('aria-label', `${g.title}をApp Storeで見る`);
      link(a, g, 'stage_select');
      h.append(a);
    }
  }
  const view = window.stageSelectView;
  if (view?.render) {
    const render = view.render;
    view.render = grid => { render(grid); decorate(grid); };
    const grid = $('grid'); if (grid?.children.length) decorate(grid);
  }

  window.cosmiiSource = { onClear, gameFor, close: closeDialog };
})();
