/* World skins: each stage world (stage-gimmicks.js PLAN) gets its own sky,
   scenery, floor and obstacle art, drawn in the style of that Cosmii game.
   Rhythm Dash stays the base: the same layout, the neon floor line and the
   grid, only recoloured; Rhythm Dash stages themselves keep the original art.

   Everything is baked once per (world, size, SC) into small canvases, so a frame
   only copies a sky, two scenery strips and a few floor tiles. Collision and
   physics are untouched: obstacles keep their boxes, only the picture changes. */
(() => {
  'use strict';
  const CAST = 'Asset/world/cast-neon/';
  const cast = {};
  for (const id of ['red', 'blue', 'pink', 'green', 'purple']) {
    const im = new Image(); im.onload = () => { bakeKey = ''; mini.clear?.(); }; im.src = CAST + id + '.png'; cast[id] = im;
  }
  const OUT = '#4a2a3a';   // sticker outline used across the Cosmii games
  const scale = () => (typeof SC === 'number' && SC > 0 ? SC : 1);
  function mk(w, h, fn) {
    const s = scale(), c = document.createElement('canvas');
    c.width = Math.max(1, Math.ceil(w * s)); c.height = Math.max(1, Math.ceil(h * s));
    const g = c.getContext('2d'); g.scale(s, s); fn(g, w, h); return c;
  }
  const rr = (g, x, y, w, h, r) => { g.beginPath(); g.roundRect(x, y, w, h, r); };
  const star = (g, x, y, r, c) => {
    g.fillStyle = c; g.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rad = i % 2 ? r * 0.45 : r; g.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad); }
    g.closePath(); g.fill();
  };
  const sparkle = (g, x, y, r, c) => {
    g.fillStyle = c; g.beginPath(); g.moveTo(x, y - r); g.quadraticCurveTo(x, y, x + r, y); g.quadraticCurveTo(x, y, x, y + r);
    g.quadraticCurveTo(x, y, x - r, y); g.quadraticCurveTo(x, y, x, y - r); g.fill();
  };
  const cloud = (g, x, y, s, c) => {
    g.fillStyle = c; g.beginPath();
    g.arc(x, y, 22 * s, 0, 7); g.arc(x + 26 * s, y - 8 * s, 28 * s, 0, 7); g.arc(x + 56 * s, y, 22 * s, 0, 7); g.rect(x, y, 56 * s, 22 * s); g.fill();
  };
  const sprite = (g, id, x, y, h, alpha = 1) => {
    const im = cast[id]; if (!im?.naturalWidth) return;
    g.save(); g.globalAlpha = alpha; g.drawImage(im, x - h / 2, y - h / 2, h * im.naturalWidth / im.naturalHeight, h); g.restore();
  };
  // Draws an element of a periodic strip, wrapping around its seam.
  const wrap = (P, x, fn) => { fn(x); if (x < 80) fn(x + P); if (x > P - 80) fn(x - P); };
  const P = 720, FT = 144;   // scenery period and floor tile width (4 blocks)

  const SKINS = {
    rescue: {
      sky: ['#7fd6f0', '#b8ecfb', '#e3f8ff'], line: '#ff8fc0', grid: 'rgba(255,143,192,.18)',
      far(g) {
        g.lineWidth = 12; g.lineCap = 'round';
        [['#ffd3ec', 0], ['#fff4a8', 14], ['#c9f3d6', 28]].forEach(([c, o]) => {
          g.strokeStyle = c; g.beginPath(); g.moveTo(-20, 190 + o); g.quadraticCurveTo(P * 0.45, 40 + o, P + 20, 150 + o); g.stroke();
        });
        g.lineCap = 'butt';
        for (const [x, y, s] of [[40, 70, 1], [300, 120, 1.3], [520, 60, 0.9], [640, 180, 1.1], [160, 210, 1.4], [430, 230, 1.2]])
          wrap(P, x, xx => cloud(g, xx, y, s, 'rgba(255,255,255,.9)'));
        for (let i = 0; i < 18; i++) wrap(P, (i * 137) % P, xx => sparkle(g, xx, 30 + (i * 53) % 200, 4 + (i % 3) * 2, i % 2 ? '#ffffffcc' : '#ffe6f4'));
        for (let i = 0; i < 10; i++) { g.fillStyle = ['#ffd0ec', '#d8f5c4', '#fff3a8', '#cfe3ff'][i % 4]; g.beginPath(); g.arc((i * 211) % P, 40 + (i * 71) % 190, 4, 0, 7); g.fill(); }
        // A few friends waiting to be rescued, far away.
        [['pink', 210, 100], ['blue', 560, 140], ['purple', 380, 70]].forEach(([id, x, y]) => wrap(P, x, xx => sprite(g, id, xx, y, 26, 0.75)));
      },
      floor(g, w, h) {
        g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
        g.fillStyle = '#e9f7ff'; for (let x = 0; x < w; x += 36) { g.beginPath(); g.arc(x + 18, 8, 18, Math.PI, 0); g.fill(); }
        g.fillStyle = '#d6efff'; g.fillRect(0, h - 14, w, 14);
        sparkle(g, 40, 30, 5, '#ffd3ec'); sparkle(g, 110, 40, 4, '#c9f3d6');
      },
      spike(g, w, h) {   // a candy cone in pink and white
        g.beginPath(); g.moveTo(w * 0.1, h); g.lineTo(w / 2, h * 0.08); g.lineTo(w * 0.9, h); g.closePath();
        g.fillStyle = '#ff8fc0'; g.fill();
        g.save(); g.clip(); g.fillStyle = '#ffffff';
        for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(0, h * (0.25 + k * 0.22)); g.lineTo(w, h * (0.05 + k * 0.22)); g.lineTo(w, h * (0.14 + k * 0.22)); g.lineTo(0, h * (0.34 + k * 0.22)); g.fill(); }
        g.restore(); g.strokeStyle = OUT; g.lineWidth = 2.5; g.lineJoin = 'round';
        g.beginPath(); g.moveTo(w * 0.1, h); g.lineTo(w / 2, h * 0.08); g.lineTo(w * 0.9, h); g.closePath(); g.stroke();
      },
      block(g, w, h) {   // a cake block: sponge, cream and a strawberry
        rr(g, 1.5, 1.5, w - 3, h - 3, 6); g.fillStyle = '#ffe2b0'; g.fill();
        g.fillStyle = '#ffffff'; rr(g, 1.5, 1.5, w - 3, h * 0.34, 6); g.fill();
        g.fillStyle = '#ffb3cc'; g.fillRect(3, h * 0.62, w - 6, h * 0.1);
        g.fillStyle = '#ffffff'; for (let x = 6; x < w - 4; x += 8) { g.beginPath(); g.arc(x, h * 0.34, 4, 0, Math.PI); g.fill(); }
        g.fillStyle = '#ff4f6a'; g.beginPath(); g.arc(w / 2, h * 0.2, 5, 0, 7); g.fill();
        rr(g, 1.5, 1.5, w - 3, h - 3, 6); g.strokeStyle = OUT; g.lineWidth = 2.5; g.stroke();
      },
    },
    cannon: {
      sky: ['#9fe3ff', '#a99be8', '#8a7fd6'], line: '#ffd76a', grid: 'rgba(255,215,106,.18)',
      far(g) {
        g.fillStyle = '#9fe3ff'; g.fillRect(0, 0, P, 64);
        g.fillStyle = '#ffffff66'; for (let x = 0; x < P; x += 120) g.fillRect(x, 64, 4, GROUND - 64);
        // Towers of face blocks on pedestals, as in Cosmii Cannon.
        const cols = [['#7fd8e8', 'blue'], ['#f6a6c8', 'pink'], ['#e8e070', 'green']];
        for (const [x, n, m] of [[90, 3, 2], [330, 2, 3], [560, 4, 2]]) wrap(P, x, xx => {
          g.fillStyle = '#c7b8f2'; rr(g, xx - 12, GROUND - 60, n * 26 + 24, 9, 4); g.fill(); g.fillRect(xx + n * 13 - 6, GROUND - 52, 12, 52);
          for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) {
            const [c, id] = cols[(i + j) % 3], bx = xx + i * 26, by = GROUND - 86 - j * 26;
            rr(g, bx, by, 24, 24, 4); g.fillStyle = c; g.fill(); sprite(g, id, bx + 12, by + 13, 18, 0.95);
          }
        });
        for (let i = 0; i < 12; i++) sparkle(g, (i * 157) % P, 20 + (i * 37) % 40, 4, '#ffffff');
      },
      floor(g, w, h) {
        g.fillStyle = '#e4e9f7'; g.fillRect(0, 0, w, h);
        g.strokeStyle = '#c9d1ea'; g.lineWidth = 2; for (let x = 0; x < w; x += 48) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
        g.fillStyle = '#d3dbf0'; g.fillRect(0, 0, w, 6);
      },
      spike(g, w, h) {   // a lavender cone with a gold tip
        g.beginPath(); g.moveTo(w * 0.12, h); g.lineTo(w / 2, h * 0.08); g.lineTo(w * 0.88, h); g.closePath();
        g.fillStyle = '#9b84e8'; g.fill();
        g.fillStyle = '#ffffff55'; g.beginPath(); g.moveTo(w / 2, h * 0.1); g.lineTo(w * 0.36, h); g.lineTo(w * 0.24, h); g.closePath(); g.fill();
        g.fillStyle = '#ffd76a'; g.beginPath(); g.moveTo(w * 0.38, h * 0.38); g.lineTo(w / 2, h * 0.08); g.lineTo(w * 0.62, h * 0.38); g.closePath(); g.fill();
        g.strokeStyle = OUT; g.lineWidth = 2.5; g.lineJoin = 'round';
        g.beginPath(); g.moveTo(w * 0.12, h); g.lineTo(w / 2, h * 0.08); g.lineTo(w * 0.88, h); g.closePath(); g.stroke();
      },
      block(g, w, h) {   // a face block
        rr(g, 1.5, 1.5, w - 3, h - 3, 6); g.fillStyle = '#7fd8e8'; g.fill();
        g.fillStyle = '#ffffff55'; rr(g, 4, 4, w - 8, h * 0.3, 4); g.fill();
        sprite(g, 'blue', w / 2, h * 0.56, h * 0.74);
        rr(g, 1.5, 1.5, w - 3, h - 3, 6); g.strokeStyle = OUT; g.lineWidth = 2.5; g.stroke();
      },
    },
    roll: {
      sky: ['#bfa9ff', '#dccfff', '#f3ecff'], line: '#ff7fb4', grid: 'rgba(255,127,180,.18)',
      far(g) {
        for (let i = 0; i < 26; i++) sparkle(g, (i * 97) % P, 14 + (i * 41) % 220, 3 + (i % 3) * 2, i % 3 ? '#ffffff' : '#ffe6a8');
        for (const [x, y, r, c] of [[120, 80, 26, '#ffd0e6'], [470, 60, 18, '#c8f0ff'], [620, 150, 34, '#fff1b8']]) wrap(P, x, xx => {
          g.fillStyle = c; g.beginPath(); g.arc(xx, y, r, 0, 7); g.fill();
          g.strokeStyle = '#ffffffaa'; g.lineWidth = 3; g.beginPath(); g.ellipse(xx, y, r * 1.6, r * 0.4, -0.3, 0, 7); g.stroke();
        });
        for (const [x, y] of [[260, 170], [380, 120], [560, 220], [30, 200]]) wrap(P, x, xx => {   // crystals
          g.fillStyle = '#9fe8ff'; g.beginPath(); g.moveTo(xx, y - 10); g.lineTo(xx + 7, y); g.lineTo(xx, y + 10); g.lineTo(xx - 7, y); g.fill();
          g.fillStyle = '#ffffffaa'; g.beginPath(); g.moveTo(xx, y - 10); g.lineTo(xx + 3, y); g.lineTo(xx, y); g.fill();
        });
        g.fillStyle = '#ffc6dcaa'; for (const x of [0, 260, 500]) wrap(P, x, xx => { rr(g, xx, GROUND - 36, 150, 14, 7); g.fill(); });
      },
      floor(g, w, h) {
        g.fillStyle = '#ffc6dc'; g.fillRect(0, 0, w, h);
        g.fillStyle = '#ff9ec4'; g.fillRect(0, 0, w, 7);
        g.fillStyle = '#ffdce9'; for (let x = 12; x < w; x += 36) { g.beginPath(); g.arc(x, 26, 3, 0, 7); g.fill(); }
        g.fillStyle = '#f7aacb'; g.fillRect(0, h - 10, w, 10);
      },
      spike(g, w, h) {   // a spiky meteor
        const cx = w / 2, cy = h * 0.62, r = w * 0.26;
        g.fillStyle = '#7d6496'; g.beginPath();
        for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8, rad = i % 2 ? r : r * 1.65; g.lineTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad); }
        g.closePath(); g.fill(); g.strokeStyle = OUT; g.lineWidth = 2; g.lineJoin = 'round'; g.stroke();
        g.fillStyle = '#a58cc0'; g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill();
        g.fillStyle = '#5c4874'; g.beginPath(); g.arc(cx - r * 0.3, cy - r * 0.2, r * 0.25, 0, 7); g.arc(cx + r * 0.35, cy + r * 0.25, r * 0.18, 0, 7); g.fill();
      },
      block(g, w, h) {   // a moon-surface block
        rr(g, 1.5, 1.5, w - 3, h - 3, 7); g.fillStyle = '#fbe7a6'; g.fill();
        g.fillStyle = '#efd27f'; for (const [x, y, r] of [[0.3, 0.35, 0.12], [0.68, 0.6, 0.09], [0.4, 0.75, 0.07]]) { g.beginPath(); g.arc(w * x, h * y, w * r, 0, 7); g.fill(); }
        rr(g, 1.5, 1.5, w - 3, h - 3, 7); g.strokeStyle = OUT; g.lineWidth = 2.5; g.stroke();
      },
    },
    sudoku: {
      sky: ['#fbf3e6', '#f6ecdc', '#efe2cc'], line: '#f0a040', grid: 'rgba(240,160,64,.2)',
      far(g) {
        const cols = ['#2f4bb8', '#2ec8bb', '#e04436', '#b3c81a'];
        for (const [x, y, n, k] of [[60, 60, 4, 0], [330, 110, 3, 1], [540, 40, 4, 2]]) wrap(P, x, xx => {
          g.save(); g.globalAlpha = 0.22; g.fillStyle = '#ffffff'; rr(g, xx - 6, y - 6, n * 26 + 10, n * 26 + 10, 10); g.fill();
          for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { rr(g, xx + i * 26, y + j * 26, 23, 23, 5); g.fillStyle = cols[(i * 3 + j + k + (i > j ? 1 : 0)) % 4]; g.fill(); }
          g.restore();
        });
        [['red', 140, 200], ['green', 470, 230], ['pink', 650, 190]].forEach(([id, x, y]) => wrap(P, x, xx => sprite(g, id, xx, y, 28, 0.6)));
      },
      floor(g, w, h) {
        g.fillStyle = '#efe0c8'; g.fillRect(0, 0, w, h);
        for (let x = 0; x < w; x += 36) { rr(g, x + 3, 6, 30, 30, 6); g.fillStyle = '#f7ead3'; g.fill(); }
      },
      spike(g, w, h) {   // a rounded red tile point with a star
        g.beginPath(); g.moveTo(w * 0.12, h - 2); g.quadraticCurveTo(w / 2, -h * 0.05, w * 0.88, h - 2); g.closePath();
        g.fillStyle = '#e04436'; g.fill(); g.strokeStyle = OUT; g.lineWidth = 2.5; g.stroke();
        star(g, w / 2, h * 0.64, w * 0.15, '#ffffff');
      },
      block(g, w, h) {   // a star-region tile
        rr(g, 1.5, 1.5, w - 3, h - 3, 8); g.fillStyle = '#2f4bb8'; g.fill();
        g.fillStyle = '#ffffff33'; rr(g, 4, 4, w - 8, h * 0.3, 5); g.fill();
        star(g, w / 2, h / 2 + 1, w * 0.2, '#ffd94a');
        rr(g, 1.5, 1.5, w - 3, h - 3, 8); g.strokeStyle = OUT; g.lineWidth = 2; g.stroke();
      },
    },
    catch: {
      sky: ['#151a46', '#2a2f6e', '#4a4f96'], line: '#ffe08a', grid: 'rgba(255,224,138,.16)',
      far(g) {
        for (let i = 0; i < 40; i++) { g.fillStyle = i % 5 ? '#ffffffcc' : '#ffe9a8'; g.fillRect((i * 89) % P, (i * 47) % 200, 2, 2); }
        wrap(P, 520, xx => {
          g.fillStyle = '#fff3c0'; g.beginPath(); g.arc(xx, 70, 34, 0, 7); g.fill();
          g.fillStyle = '#f2e3a0'; g.beginPath(); g.arc(xx - 10, 62, 6, 0, 7); g.arc(xx + 12, 80, 4, 0, 7); g.fill();
        });
        g.fillStyle = '#23405a'; g.beginPath(); g.moveTo(0, GROUND);
        for (let x = 0; x <= P; x += 60) g.quadraticCurveTo(x + 30, GROUND - 46 - (x % 180 ? 0 : 20), x + 60, GROUND - 18);
        g.lineTo(P, GROUND); g.closePath(); g.fill();
        for (let i = 0; i < 8; i++) sparkle(g, (i * 113 + 40) % P, 120 + (i * 29) % 80, 5, '#ffe9a8');
      },
      floor(g, w, h) {
        g.fillStyle = '#2f5a3a'; g.fillRect(0, 0, w, h);
        g.fillStyle = '#3f7a4a'; for (let x = 0; x < w; x += 18) { g.beginPath(); g.moveTo(x, 4); g.lineTo(x + 4, -4); g.lineTo(x + 8, 4); g.fill(); }
        g.fillStyle = '#ffffff33'; for (const [x, y] of [[30, 30], [100, 44]]) star(g, x, y, 4, '#fff3c0');
      },
      spike(g, w, h) {   // a blue crystal
        g.beginPath(); g.moveTo(w * 0.2, h); g.lineTo(w * 0.32, h * 0.3); g.lineTo(w / 2, h * 0.05); g.lineTo(w * 0.68, h * 0.3); g.lineTo(w * 0.8, h); g.closePath();
        g.fillStyle = '#8fb8ff'; g.fill();
        g.fillStyle = '#ffffff77'; g.beginPath(); g.moveTo(w / 2, h * 0.08); g.lineTo(w * 0.42, h); g.lineTo(w * 0.3, h); g.lineTo(w * 0.34, h * 0.32); g.fill();
        g.strokeStyle = OUT; g.lineWidth = 2.5; g.lineJoin = 'round';
        g.beginPath(); g.moveTo(w * 0.2, h); g.lineTo(w * 0.32, h * 0.3); g.lineTo(w / 2, h * 0.05); g.lineTo(w * 0.68, h * 0.3); g.lineTo(w * 0.8, h); g.closePath(); g.stroke();
      },
      block(g, w, h) {   // a woven basket
        rr(g, 1.5, 3, w - 3, h - 4.5, 6); g.fillStyle = '#d99a5a'; g.fill();
        g.strokeStyle = '#b57636'; g.lineWidth = 2;
        for (let y = 10; y < h - 3; y += 7) { g.beginPath(); g.moveTo(3, y); g.lineTo(w - 3, y); g.stroke(); }
        for (let x = 8; x < w - 3; x += 8) { g.beginPath(); g.moveTo(x, 6); g.lineTo(x, h - 3); g.stroke(); }
        g.fillStyle = '#e8b072'; rr(g, 0, 0, w, 7, 3); g.fill();
        rr(g, 1.5, 3, w - 3, h - 4.5, 6); g.strokeStyle = OUT; g.lineWidth = 2.5; g.stroke();
      },
    },
    mogu: {
      sky: ['#bfe8ff', '#dff4ff', '#eefaff'], line: '#ff6f91', grid: 'rgba(255,111,145,.16)',
      far(g) {
        const cols = ['#a8d8f0', '#f4c6d8', '#f6e3a8', '#c9c2f0', '#bfe8b0'];
        for (let k = 0; k < 6; k++) {
          const x = k * 120 + 10, hgt = 110 + (k * 37) % 70;
          wrap(P, x, xx => {
            rr(g, xx, GROUND - 24 - hgt, 84, hgt, 8); g.fillStyle = cols[k % 5]; g.fill();
            g.fillStyle = '#ffffffb0'; for (let j = 0; j < Math.floor(hgt / 30); j++) for (let i = 0; i < 2; i++) { rr(g, xx + 12 + i * 34, GROUND - hgt - 10 + j * 30, 26, 16, 4); g.fill(); }
            g.strokeStyle = '#ffffff'; g.lineWidth = 2; rr(g, xx, GROUND - 24 - hgt, 84, hgt, 8); g.stroke();
          });
        }
        g.fillStyle = '#9ad883'; g.fillRect(0, GROUND - 24, P, 24);
        for (let x = 30; x < P; x += 150) wrap(P, x, xx => { g.fillStyle = '#7cc66a'; g.beginPath(); g.arc(xx, GROUND - 40, 20, 0, 7); g.fill(); g.fillStyle = '#9b6a3a'; g.fillRect(xx - 3, GROUND - 24, 6, 14); });
      },
      floor(g, w, h) {
        g.fillStyle = '#8f97a3'; g.fillRect(0, 0, w, h);
        g.fillStyle = '#b8bec8'; g.fillRect(0, 0, w, 6);
        g.fillStyle = '#ffffff'; g.fillRect(8, h / 2 - 2, 56, 4); g.fillRect(80, h / 2 - 2, 56, 4);
      },
      spike(g, w, h) {   // a traffic cone
        g.fillStyle = '#ff8a3a'; g.beginPath(); g.moveTo(w * 0.22, h * 0.9); g.lineTo(w * 0.42, h * 0.1); g.lineTo(w * 0.58, h * 0.1); g.lineTo(w * 0.78, h * 0.9); g.closePath(); g.fill();
        g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(w * 0.32, h * 0.5); g.lineTo(w * 0.68, h * 0.5); g.lineTo(w * 0.72, h * 0.66); g.lineTo(w * 0.28, h * 0.66); g.closePath(); g.fill();
        g.strokeStyle = OUT; g.lineWidth = 2.5; g.lineJoin = 'round';
        g.beginPath(); g.moveTo(w * 0.22, h * 0.9); g.lineTo(w * 0.42, h * 0.1); g.lineTo(w * 0.58, h * 0.1); g.lineTo(w * 0.78, h * 0.9); g.closePath(); g.stroke();
        rr(g, w * 0.1, h * 0.86, w * 0.8, h * 0.12, 3); g.fillStyle = '#ff8a3a'; g.fill(); g.stroke();
      },
      block(g, w, h) {   // a wooden crate
        g.fillStyle = '#d0904c'; g.fillRect(1.5, 1.5, w - 3, h - 3);
        g.strokeStyle = '#9a6030'; g.lineWidth = 3;
        g.strokeRect(5, 5, w - 10, h - 10); g.beginPath(); g.moveTo(5, 5); g.lineTo(w - 5, h - 5); g.stroke();
        g.strokeStyle = OUT; g.lineWidth = 2.5; g.strokeRect(1.5, 1.5, w - 3, h - 3);
      },
    },
    match: {
      sky: ['#ffd3ea', '#e6dcff', '#cdf2e0'], line: '#ff8fc0', grid: 'rgba(255,143,192,.18)',
      far(g) {
        // A big white puzzle board far away, Cosmii face tiles on it, clouds and sparkles.
        const faces = ['pink', 'blue', 'green', 'red', 'purple'];
        wrap(P, 300, xx => {
          g.fillStyle = 'rgba(255,255,255,.55)'; rr(g, xx, 40, 250, 200, 18); g.fill();
          for (let i = 0; i < 5; i++) for (let j = 0; j < 4; j++) {
            rr(g, xx + 12 + i * 47, 52 + j * 46, 42, 42, 9); g.fillStyle = 'rgba(255,255,255,.75)'; g.fill();
            sprite(g, faces[(i * 2 + j * 3) % 5], xx + 33 + i * 47, 74 + j * 46, 30, 0.55);
          }
        });
        for (const [x, y, sc] of [[40, 60, 0.8], [620, 110, 1], [150, 200, 0.7]]) wrap(P, x, xx => cloud(g, xx, y, sc, 'rgba(255,255,255,.85)'));
        for (let i = 0; i < 16; i++) sparkle(g, (i * 131) % P, 20 + (i * 59) % 230, 4 + (i % 3), i % 2 ? '#ffffff' : '#ffe08a');
      },
      floor(g, w, h) {
        g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
        for (let x = 0; x < w; x += 36) { rr(g, x + 3, 6, 30, 30, 8); g.fillStyle = '#fbeefa'; g.fill(); }
        g.fillStyle = '#f1e4ff'; g.fillRect(0, h - 12, w, 12);
      },
      spike(g, w, h) {   // a candy-pink crystal
        g.beginPath(); g.moveTo(w * 0.16, h); g.lineTo(w / 2, h * 0.08); g.lineTo(w * 0.84, h); g.closePath();
        const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#ffd0ea'); gr.addColorStop(1, '#c79bff');
        g.fillStyle = gr; g.fill();
        g.fillStyle = '#ffffffaa'; g.beginPath(); g.moveTo(w / 2, h * 0.12); g.lineTo(w * 0.38, h); g.lineTo(w * 0.28, h); g.closePath(); g.fill();
        g.strokeStyle = OUT; g.lineWidth = 2.5; g.lineJoin = 'round';
        g.beginPath(); g.moveTo(w * 0.16, h); g.lineTo(w / 2, h * 0.08); g.lineTo(w * 0.84, h); g.closePath(); g.stroke();
      },
      block(g, w, h) {   // a puzzle tile with a face
        rr(g, 1.5, 1.5, w - 3, h - 3, 8); g.fillStyle = '#ffffff'; g.fill();
        g.strokeStyle = '#d9b8ff'; g.lineWidth = 2.5; g.stroke();
        sprite(g, 'purple', w / 2, h / 2 + 1, h * 0.8);
      },
    },
    arcade: {
      sky: ['#1e0b40', '#2f1460', '#4a1f80'], line: '#5fe8ff', grid: 'rgba(95,232,255,.2)',
      far(g) {
        for (let k = 0; k < 6; k++) wrap(P, k * 120 + 20, xx => {
          rr(g, xx, GROUND - 170, 84, 170, 8); g.fillStyle = '#3e1c70'; g.fill();
          g.fillStyle = ['#5fe8ff55', '#ff4fd855', '#ffe96a55'][k % 3]; rr(g, xx + 10, GROUND - 156, 64, 46, 4); g.fill();
          g.fillStyle = '#ff4fd8'; g.beginPath(); g.arc(xx + 30, GROUND - 90, 5, 0, 7); g.fill();
          g.fillStyle = '#5fe8ff'; g.beginPath(); g.arc(xx + 54, GROUND - 90, 5, 0, 7); g.fill();
          g.strokeStyle = '#ff9df0'; g.lineWidth = 2; rr(g, xx, GROUND - 170, 84, 170, 8); g.stroke();
        });
        for (let i = 0; i < 20; i++) { g.fillStyle = i % 2 ? '#ff9df0aa' : '#9fe8ffaa'; g.fillRect((i * 79) % P, 10 + (i * 31) % 80, 3, 3); }
      },
      floor(g, w, h) {
        for (let x = 0; x < w; x += 36) for (let r = 0; r < 2; r++) { g.fillStyle = ((x / 36 + r) % 2) ? '#ff7fd0' : '#7a4fd0'; g.fillRect(x, r * 24, 36, 24); }
        g.fillStyle = '#2a1050'; g.fillRect(0, 48, w, h - 48);
      },
      spike(g, w, h) {   // a pixel invader
        const px = [[0, 0, 1, 0, 0, 0, 1, 0, 0], [0, 0, 0, 1, 1, 1, 0, 0, 0], [0, 0, 1, 1, 1, 1, 1, 0, 0], [0, 1, 1, 0, 1, 0, 1, 1, 0], [1, 1, 1, 1, 1, 1, 1, 1, 1], [1, 0, 1, 1, 1, 1, 1, 0, 1], [1, 0, 1, 0, 0, 0, 1, 0, 1], [0, 0, 0, 1, 0, 1, 0, 0, 0]];
        const c = w / 10, y0 = h - 8 * c;
        g.fillStyle = OUT; px.forEach((row, j) => row.forEach((v, i) => { if (v) g.fillRect(c * 0.5 + i * c - 1, y0 + j * c - 1, c + 2, c + 2); }));
        g.fillStyle = '#9fff6a'; px.forEach((row, j) => row.forEach((v, i) => { if (v) g.fillRect(c * 0.5 + i * c, y0 + j * c, c, c); }));
      },
      block(g, w, h) {   // a pixel brick
        g.fillStyle = '#ff4fd8'; g.fillRect(1, 1, w - 2, h - 2);
        g.fillStyle = '#ffb0ee'; g.fillRect(1, 1, w - 2, 4); g.fillRect(1, 1, 4, h - 2);
        g.fillStyle = '#b02a98'; g.fillRect(1, h - 5, w - 2, 4); g.fillRect(w - 5, 1, 4, h - 2);
        g.fillStyle = '#ffffff'; g.fillRect(w / 2 - 3, h / 2 - 3, 6, 6);
        g.strokeStyle = OUT; g.lineWidth = 2; g.strokeRect(1, 1, w - 2, h - 2);
      },
    },
  };

  let bakeKey = '', baked = null;
  function bake(id) {
    const s = SKINS[id], key = id + '|' + W.toFixed(1) + '|' + scale().toFixed(3);
    if (bakeKey === key && baked) return baked;
    bakeKey = key;
    baked = {
      id, s,
      sky: mk(W, DH, (g, w, h) => {
        const gr = g.createLinearGradient(0, 0, 0, GROUND);
        s.sky.forEach((c, i) => gr.addColorStop(i / (s.sky.length - 1), c));
        g.fillStyle = gr; g.fillRect(0, 0, w, h);
      }),
      far: mk(P, GROUND, g => s.far(g)),
      floor: mk(FT, DH - GROUND, (g, w, h) => s.floor(g, w, h)),
      spike: mk(B, B, (g, w, h) => s.spike(g, w, h)),
      block: mk(B, B, (g, w, h) => s.block(g, w, h)),
    };
    return baked;
  }

  // The skin of the stage being played, or null for Rhythm Dash stages, the
  // tutorial and the menus (they keep the original artwork).
  function current(inGame) {
    if (!inGame || typeof stageIdx !== 'number' || stageIdx >= NSTAGE) return null;
    const plan = window.stageGimmicks?.PLAN?.[stageIdx + 1];
    return plan && SKINS[plan.world] ? plan.world : null;
  }
  // The sky and the scenery are DOM layers behind the game canvas: the sky
  // never changes and the scenery strip only moves (a compositor transform),
  // so a frame does not repaint the whole screen. The canvas draws the floor.
  const layer = document.createElement('div'); layer.id = 'skin-backdrop'; layer.hidden = true;
  layer.style.cssText = 'position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:0;';
  // The sky is a CSS gradient; the scenery is an <img> (like the neon scenery),
  // three periods wide, moved with a transform.
  const farEl = document.createElement('img'); farEl.alt = ''; farEl.decoding = 'async';
  farEl.style.cssText = 'position:absolute;left:0;top:0;will-change:transform;max-width:none;';
  layer.append(farEl);
  (document.getElementById('app') || document.body).prepend(layer);
  let layerKey = '', lastFarX = '', farUrl = '';
  function showLayer(b) {
    const key = b.id + '|' + W.toFixed(1) + '|' + scale().toFixed(3);
    if (layerKey !== key) {
      layerKey = key; lastFarX = '';
      const sky = b.s.sky, ground = GROUND / DH * 100;
      layer.style.background = `linear-gradient(${sky.map((c, i) => c + ' ' + (i / (sky.length - 1) * ground).toFixed(1) + '%').join(',')})`;
      const reps = Math.ceil(W / P) + 1, c = document.createElement('canvas');
      c.width = b.far.width * reps; c.height = b.far.height;
      const fg = c.getContext('2d'); for (let k = 0; k < reps; k++) fg.drawImage(b.far, k * b.far.width, 0);
      // Hide the old world's scenery until the new one has loaded.
      farEl.style.visibility = 'hidden';
      c.toBlob(blob => { if (!blob || layerKey !== key) return; if (farUrl) URL.revokeObjectURL(farUrl); farUrl = URL.createObjectURL(blob);
        farEl.onload = () => { if (layerKey === key) farEl.style.visibility = 'visible'; }; farEl.src = farUrl; }, 'image/png');
      farEl.style.width = (P * reps / W * 100) + '%'; farEl.style.height = (GROUND / DH * 100) + '%';
      farEl.dataset.reps = reps;
    }
    if (layer.hidden) layer.hidden = false;
  }
  function hideLayer() { if (!layer.hidden) layer.hidden = true; }
  let ceilA = 0;
  function drawBackground(g, id) {
    const b = bake(id), s = b.s, scroll = (songPos + LEAD) * SPEED;
    showLayer(b);
    const shift = ((((scroll * 0.25) % P) + P) % P) / (P * +farEl.dataset.reps) * 100;
    const fx = `translateX(${(-shift).toFixed(3)}%)`;
    if (fx !== lastFarX) { lastFarX = fx; farEl.style.transform = fx; }
    const tx = -((scroll % FT) + FT) % FT;
    for (let x = tx; x < W; x += FT) g.drawImage(b.floor, x, GROUND, FT, DH - GROUND);
    // Rhythm Dash base: the neon floor line and the beat grid, in the world's colour.
    let gx = -(scroll % B); if (gx < 0) gx += B;
    g.strokeStyle = s.grid; g.lineWidth = 1; g.beginPath();
    for (let x = gx - B; x < W; x += B) { g.moveTo(x, GROUND); g.lineTo(x, DH); }
    g.stroke();
    g.strokeStyle = s.line; g.lineWidth = 2.5; g.beginPath(); g.moveTo(0, GROUND); g.lineTo(W, GROUND); g.stroke();
    // Ceiling for gravity-flip zones: the floor mirrored, faded in near a zone.
    const v0 = songPos - (W * 0.4) / SPEED, v1 = songPos + (W * 0.8) / SPEED;
    const vis = flipZones.some(z => z.start - 0.6 < v1 && z.end + 0.6 > v0);
    ceilA += ((vis ? 1 : 0) - ceilA) * 0.08;
    if (ceilA > 0.02) {
      g.save(); g.globalAlpha = ceilA; g.translate(0, CEIL); g.scale(1, -1);
      for (let x = tx; x < W; x += FT) g.drawImage(b.floor, x, 0, FT, CEIL);
      g.restore();
      g.save(); g.globalAlpha = ceilA; g.strokeStyle = s.line; g.lineWidth = 2.5;
      g.beginPath(); g.moveTo(0, CEIL); g.lineTo(W, CEIL); g.stroke(); g.restore();
    }
  }
  // Spikes and blocks: the baked sprite, tiled for wide or tall blocks.
  function drawObstacle(g, kind, shape) {
    const id = current(true); if (!id) return false;
    const b = bake(id), img = b[kind]; if (!img) return false;
    g.save();
    if (shape.f) { g.translate(shape.x, shape.y + shape.h); g.scale(1, -1); } else g.translate(shape.x, shape.y);
    if (kind === 'block' && (shape.w > B * 1.1 || shape.h > B * 1.1)) {
      // Whole tiles only (a tall block of 1.65 is two tiles, each a bit taller), never a cut one.
      const nx = Math.max(1, Math.round(shape.w / B)), ny = Math.max(1, Math.round(shape.h / B)), tw = shape.w / nx, th = shape.h / ny;
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) g.drawImage(img, i * tw, j * th, tw, th);
    } else g.drawImage(img, 0, 0, shape.w, shape.h);
    g.restore(); return true;
  }
  // Characters for gimmick art drawn every frame: cut once to the drawn size
  // (the source images are 640px and must not be drawn per frame).
  const mini = new Map();
  function face(g, id, x, y, h, alpha = 1) {
    const im = cast[id]; if (!im?.naturalWidth) return;
    const key = id + '|' + h + '|' + scale().toFixed(3);
    let c = mini.get(key);
    if (!c) { const w = h * im.naturalWidth / im.naturalHeight; c = mk(w, h, gg => gg.drawImage(im, 0, 0, w, h)); c.cssW = w; mini.set(key, c); }
    if (alpha !== 1) { g.save(); g.globalAlpha = alpha; }
    g.drawImage(c, x - c.cssW / 2, y - h / 2, c.cssW, h);
    if (alpha !== 1) g.restore();
  }
  // Just the head of a cast drawing (hood circle and what sticks out on top),
  // for a chaser that is all face. d = the hood's diameter in px.
  const HEAD = { cx: 0.5, cy: 0.52, r: 0.29, top: [0.31, 0.05, 0.72, 0.31] };
  function head(g, id, x, y, d) {
    const im = cast[id]; if (!im?.naturalWidth) return;
    const key = 'head|' + id + '|' + d + '|' + scale().toFixed(3);
    let c = mini.get(key);
    if (!c) {
      const k = d / (2 * HEAD.r * im.naturalWidth), w = im.naturalWidth * k, h = im.naturalHeight * k;
      c = mk(w, h, gg => {
        const cx = HEAD.cx * w, cy = HEAD.cy * h, r = HEAD.r * w, [x0, y0, x1, y1] = HEAD.top;
        gg.save(); gg.beginPath(); gg.arc(cx, cy, r, 0, 7); gg.rect(x0 * w, y0 * h, (x1 - x0) * w, (y1 - y0) * h); gg.clip();
        gg.drawImage(im, 0, 0, w, h); gg.restore();
        gg.strokeStyle = '#3a1838'; gg.lineWidth = Math.max(2, d * 0.02);
        gg.beginPath(); gg.arc(cx, cy, r - gg.lineWidth / 2, Math.PI * 0.1, Math.PI * 0.9); gg.stroke();
      });
      c.cssW = w; c.cssH = h; c.ox = HEAD.cx * w; c.oy = HEAD.cy * h; mini.set(key, c);
    }
    g.drawImage(c, x - c.ox, y - c.oy, c.cssW, c.cssH);
  }
  // A small scene of a world for the stage select: sky, scenery, floor and its
  // spike and block. Rhythm Dash (no skin) gets the neon look in the stage's hue.
  const thumbs = new Map();
  function thumb(id, w, h, hue = 210) {
    const key = id + '|' + hue + '|' + w + 'x' + h + '|' + scale().toFixed(3) + '|' + (cast.red.naturalWidth ? 1 : 0);
    if (thumbs.has(key)) return thumbs.get(key);
    const fy = h * 0.74, k = h / DH * 1.35;
    const c = mk(w, h, g => {
      if (SKINS[id]) {
        const sk = SKINS[id], gr = g.createLinearGradient(0, 0, 0, fy);
        sk.sky.forEach((col, i) => gr.addColorStop(i / (sk.sky.length - 1), col)); g.fillStyle = gr; g.fillRect(0, 0, w, h);
        g.save(); g.translate(0, fy - GROUND * k); g.scale(k, k); sk.far(g); g.restore();
        g.save(); g.translate(0, fy); g.scale(k, k); for (let x = 0; x < w / k; x += FT) { g.save(); g.translate(x, 0); sk.floor(g, FT, DH - GROUND); g.restore(); } g.restore();
        g.strokeStyle = sk.line; g.lineWidth = 2; g.beginPath(); g.moveTo(0, fy); g.lineTo(w, fy); g.stroke();
        const sz = B * k * 1.1;
        g.save(); g.translate(w * 0.62, fy - sz); sk.spike(g, sz, sz); g.restore();
        g.save(); g.translate(w * 0.8, fy - sz); sk.block(g, sz, sz); g.restore();
      } else {
        const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, `hsl(${hue},60%,16%)`); gr.addColorStop(1, `hsl(${hue + 30},65%,30%)`);
        g.fillStyle = gr; g.fillRect(0, 0, w, h);
        g.fillStyle = 'rgba(255,255,255,.08)'; for (let i = 0; i < 4; i++) { g.save(); g.translate((i * 71) % w, 18 + (i * 29) % (fy - 30)); g.rotate(0.785); g.fillRect(-10, -10, 20, 20); g.restore(); }
        g.fillStyle = `hsl(${hue},45%,11%)`; g.fillRect(0, fy, w, h - fy);
        g.strokeStyle = `hsl(${hue},100%,65%)`; g.lineWidth = 2; g.beginPath(); g.moveTo(0, fy); g.lineTo(w, fy); g.stroke();
        const sz = B * k * 1.1;
        for (const x of [w * 0.62, w * 0.8]) { g.fillStyle = `hsl(${hue},40%,80%)`; g.beginPath(); g.moveTo(x - sz / 2, fy); g.lineTo(x, fy - sz); g.lineTo(x + sz / 2, fy); g.closePath(); g.fill(); g.strokeStyle = '#0a0a14'; g.lineWidth = 1.5; g.stroke(); }
      }
    });
    c.cssW = w; c.cssH = h; thumbs.set(key, c); return c;
  }
  window.worldSkins = { current, drawBackground, hideLayer, drawObstacle, face, head, thumb, SKINS, reset: () => { ceilA = 0; } };
})();
