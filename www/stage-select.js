/* Stage select: the stages as cards on a horizontally scrolling map, grouped by
   world. Each card shows a small scene of its world with the stage's gimmick,
   the stage number, the gimmick's name and the best result; the next stage to
   play glows and is scrolled into view. Unlocking and starting a stage are the
   game's own (unlocked, best, bestRank, selectStage). */
(() => {
  'use strict';
  const ACCENT = { dash: '#5fe8ff', rescue: '#ff8fc0', cannon: '#ffd76a', roll: '#ff7fb4', sudoku: '#f0a040',
    catch: '#ffe08a', mogu: '#8fd84f', match: '#c79bff', arcade: '#ff4fd8' };
  const LABEL = { pad: 'ジャンプ台', jelly: 'クラゲ', ring: '浮き輪くぐり', cake: '飛んでくるケーキ', cannon: '大砲', ball: 'トゲトゲ隕石',
    stairs: '組み上がる階段', prize: '落ちてくる景品', arm: 'アーム', mogu: 'パクパク', match: '乗ってそろえる', dark: '停電' };
  const ICON_ORDER = ['pad', 'ring', 'cannon', 'ball', 'stairs', 'arm', 'prize', 'mogu', 'match', 'dark', 'jelly', 'cake'];
  const worldOf = i => window.stageGimmicks?.PLAN?.[i + 1]?.world || 'dash';
  const gimmicks = i => Object.keys(STAGES[i].gimmick || {}).filter(k => LABEL[k]);
  const TW = 160, TH = 96;
  // Rhythm Dash cards show a crop of the stage's own neon background.
  const neon = new Map();
  function neonImage(file, onload) {
    let im = neon.get(file);
    if (!im) { im = new Image(); im.src = 'Asset/world/' + file; neon.set(file, im); }
    if (!im.complete) im.addEventListener('load', onload, { once: true });
    return im;
  }

  function thumbCanvas(i, locked) {
    const c = document.createElement('canvas'), dpr = Math.min(3, window.devicePixelRatio || 1);
    c.width = TW * dpr; c.height = TH * dpr; c.className = 'wm-thumb';
    const g = c.getContext('2d'); g.scale(dpr, dpr);
    const paint = () => {
      g.clearRect(0, 0, TW, TH);
      const theme = worldOf(i) === 'dash' && window.cosmiiWorld?.themeFor?.(i);
      const im = theme && neonImage(theme.file, paint);
      if (im && im.naturalWidth) {
        // Crop around the floor line so the floor sits where the game draws it.
        const sh = im.naturalHeight * 0.42, sw = sh * TW / TH, sy = im.naturalHeight * theme.floor - sh * 0.78, sx = (im.naturalWidth - sw) / 2;
        g.save(); g.filter = `hue-rotate(${theme.hue}deg)`; g.drawImage(im, sx, sy, sw, sh, 0, 0, TW, TH); g.restore();
      } else {
        const t = window.worldSkins?.thumb(worldOf(i), TW, TH, STAGES[i].hue);
        if (t) g.drawImage(t, 0, 0, TW, TH);
      }
      decorate();
    };
    const decorate = () => {
    const key = ICON_ORDER.find(k => gimmicks(i).includes(k));
    if (key && window.stageGimmicks?.icon) {
      g.save(); g.fillStyle = 'rgba(255,255,255,.88)'; g.strokeStyle = '#4a2a3a'; g.lineWidth = 2;
      g.beginPath(); g.arc(30, 32, 22, 0, 6.283); g.fill(); g.stroke(); g.restore();
      window.stageGimmicks.icon(g, key, 30, 32, 30);
    }
    if (locked) {
      g.fillStyle = 'rgba(16,13,52,.66)'; g.fillRect(0, 0, TW, TH);
      g.font = '28px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('🔒', TW / 2, TH / 2);
    }
    };
    paint();
    return c;
  }

  function render(grid) {
    grid.innerHTML = ''; grid.className = 'world-map';
    const next = Array.from({ length: NSTAGE }, (_, i) => i).find(i => unlocked(i) && best(i) < 100);
    let group = null, groupWorld = null, nextCard = null;
    for (let i = 0; i < NSTAGE; i++) {
      const w = worldOf(i), open = unlocked(i), done = best(i) >= 100;
      if (w !== groupWorld || i === NSTAGE - 1) {
        groupWorld = w;
        group = document.createElement('section'); group.className = 'wm-group'; group.style.setProperty('--wc', ACCENT[w] || '#5fe8ff');
        const h = document.createElement('h3');
        h.textContent = i === NSTAGE - 1 ? 'オーラス' : (STAGES[i].world || 'Rhythm Dash');
        const cards = document.createElement('div'); cards.className = 'wm-cards';
        group.append(h, cards); grid.append(group);
      }
      const b = document.createElement('button');
      b.className = 'wm-card' + (open ? '' : ' lock') + (done ? ' done' : '') + (i === next ? ' next' : '');
      b.setAttribute('aria-label', `ステージ${i + 1}${open ? '' : '（未解放）'}`);
      b.append(thumbCanvas(i, !open));
      const info = document.createElement('div'); info.className = 'wm-info';
      const g = gimmicks(i).map(k => LABEL[k]);
      info.innerHTML = `<span class="wm-no">${i + 1}</span><span class="wm-g">${STAGES[i].title || g.join('・')}</span>` +
        `<span class="wm-best">${open ? (done ? '★ ' : '') + (best(i) ? best(i) + '%' + (bestRank(i) ? ' ' + bestRank(i) : '') : 'NEW') : '未解放'}</span>`;
      b.append(info);
      if (i === next) { const tag = document.createElement('span'); tag.className = 'wm-next'; tag.textContent = 'NEXT'; b.append(tag); nextCard = b; }
      b.onclick = open ? () => { window.fromStageSelect = true; selectStage(i); } : () => toast('前のステージを60%進めると解放');
      group.querySelector('.wm-cards').append(b);
    }
    // Bring the next stage into view when the screen opens.
    if (nextCard) requestAnimationFrame(() => { const r = nextCard.offsetLeft - grid.clientWidth / 2 + nextCard.clientWidth / 2; grid.scrollLeft = Math.max(0, r); });
  }
  window.stageSelectView = { render };
})();
