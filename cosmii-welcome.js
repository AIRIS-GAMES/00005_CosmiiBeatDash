// Attract mode: 30 s idle on the title plays a world tour of play scenes; any
// input ends it. (First launch goes straight into stage 1: cosmii-guide.js.)
(function () {
  'use strict';
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const easeOut = k => 1 - Math.pow(1 - clamp(k), 3);
  const backOut = k => { k = clamp(k); const s = 1.9; return 1 + (s + 1) * Math.pow(k - 1, 3) + s * Math.pow(k - 1, 2); };
  const make = (tag, cls, parent, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; parent?.append(e); return e; };
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const calm = () => !!window.reducedEffects || reducedMotion.matches;

  // ---------------- E: world tour when the title sits idle ----------------
  const IDLE = 30000;
  const TOUR = [['スターアーケード', 0], ['そらのレスキュー', 4], ['ドッカン大砲', 6], ['ころころコスミー', 8], ['ドットの階段', 10], ['月夜のキャッチ', 12], ['パクパク', 14], ['ブロックマッチ', 16], ['ブラックアウト', 18]];
  const STEP = 1.1, INTRO = 1.6, GRID = INTRO + TOUR.length * STEP, FINAL = GRID + 2.2, END = FINAL + 2.6;
  let lastInput = performance.now(), tour = null;
  function idleReady() {
    if (tour || calm() || document.hidden || state !== 'menu') return false;
    if (getComputedStyle($('menu')).display === 'none' || getComputedStyle($('stageSelect')).display !== 'none') return false;
    if (!document.getElementById('world-dialog')?.hidden || !($('ui-panel')?.hidden ?? true)) return false;
    if (getComputedStyle($('loginov')).display !== 'none' || getComputedStyle($('splash')).display !== 'none') return false;
    return true;
  }
  function startTour() {
    const root = make('section', 'we-root', $('app')); root.setAttribute('aria-label', 'ワールド紹介（画面に触れると戻ります）');
    const shot = make('img', 'we-shot', root); shot.alt = '';
    const label = make('div', 'we-label', root);
    const grid = make('div', 'we-grid', root);
    const cells = TOUR.map(([name, st]) => { const c = make('div', '', grid); c.style.backgroundImage = `url("Asset/world/tour/world-${st}.jpg")`; make('span', '', c, name); return c; });
    const intro = make('div', 'we-intro', root); intro.innerHTML = '<div>9 WORLDS<small>コスミーたちの、まだ知らないステージへ。</small></div>';
    const fin = make('div', 'we-final', root); fin.innerHTML = '<img src="Asset/world/title-arcade.png" alt="COSMII RHYTHM DASH"><span>画面をタップしてね</span>';
    const flash = make('div', 'we-flash', root);
    const hint = make('div', 'we-hint', root, 'DEMO · タップで戻る');
    for (const [, st] of TOUR) new Image().src = `Asset/world/tour/world-${st}.jpg`;
    const t0 = performance.now();
    tour = { root, raf: 0 };
    const frame = () => {
      if (!tour) return;
      const t = (performance.now() - t0) / 1000;
      if (t >= END) { stopTour(); return; }
      tour.raf = requestAnimationFrame(frame);
      const w = Math.floor((t - INTRO) / STEP), inTour = t >= INTRO && w < TOUR.length, local = (t - INTRO) - w * STEP;
      intro.style.opacity = t < INTRO ? 1 : 0;
      intro.firstChild.style.transform = `scale(${backOut(t / 0.6)})`;
      shot.style.opacity = label.style.opacity = inTour ? 1 : 0;
      if (inTour) {
        const src = `Asset/world/tour/world-${TOUR[w][1]}.jpg`; if (!shot.src.endsWith(src)) shot.src = src;
        shot.style.transform = `scale(${1.12 - 0.08 * easeOut(local / STEP)}) translateX(${(w % 2 ? 1 : -1) * 2 * easeOut(local / STEP)}%)`;
        label.innerHTML = `<b>WORLD ${w + 1}</b>${TOUR[w][0]}`; label.style.transform = `translateX(${-110 * (1 - easeOut(local / 0.35))}%)`;
      }
      flash.style.opacity = inTour && local < 0.18 ? 0.5 * (1 - local / 0.18) : 0;
      const g = t - GRID; grid.style.opacity = g >= 0 ? 1 : 0;
      cells.forEach((c, i) => c.classList.toggle('on', g >= 0 && (t >= FINAL ? i === 0 : g >= i * 0.2)));
      fin.hidden = t < FINAL; if (t >= FINAL) fin.firstChild.style.transform = `scale(${2 - backOut((t - FINAL) / 0.6)})`;
      root.style.opacity = t > END - 0.5 ? (END - t) / 0.5 : clamp(t / 0.4);
    };
    frame();
    window.beatPSF?.event('attract_start', 'title');
  }
  function stopTour() { if (!tour) return; cancelAnimationFrame(tour.raf); tour.root.remove(); tour = null; lastInput = performance.now(); }
  let swallowClick = false;
  const input = e => {
    lastInput = performance.now();
    if (tour) { e.preventDefault?.(); e.stopPropagation(); stopTour(); swallowClick = e.type === 'pointerdown'; }
  };
  for (const type of ['pointerdown', 'keydown', 'wheel', 'touchstart']) addEventListener(type, input, { capture: true, passive: false });
  addEventListener('click', e => { if (swallowClick) { swallowClick = false; e.preventDefault(); e.stopPropagation(); } }, true);
  document.addEventListener('visibilitychange', () => { lastInput = performance.now(); if (document.hidden) stopTour(); });
  setInterval(() => { if (!idleReady()) { if (tour && state !== 'menu') stopTour(); return; } if (performance.now() - lastInput > IDLE) startTour(); }, 1000);

  window.cosmiiWelcome = { startTour, stopTour };
})();
