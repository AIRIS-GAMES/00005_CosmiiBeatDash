// Moment-to-moment impact effects layered on the core game (index.html):
//  - judgement pop: big springy PERFECT / GREAT / GOOD (+ combo or streak word)
//  - PERFECT burst: shock ring, radial sparks and a flash at the character
//  - combo milestone: sunburst + "20 COMBO!" (replaces the HUD's small text)
//  - speed lines in the sky band and under the floor (never across the course)
//  - landing dust and a take-off ring
//  - FEVER: a diagonal cut-in with the character, then corner glows + a
//    pulsing rainbow frame
//  - stage start: a title band over the 3-2-1, and a gold GO!
// Visual only: no sound, no effect on judging or score. "演出を控えめに"
// (window.reducedEffects) turns all of it off and the original texts return.
(function () {
  'use strict';
  const TAU = Math.PI * 2;
  const now = () => performance.now() / 1000;
  const FONT = '"Exo 2", "M PLUS 1p", sans-serif';
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const easeOut = k => 1 - Math.pow(1 - clamp(k), 3);
  const backOut = k => { k = clamp(k); const s = 1.9; return 1 + (s + 1) * Math.pow(k - 1, 3) + s * Math.pow(k - 1, 2); };
  const active = () => !window.reducedEffects;

  let pops = [], bursts = [], dusts = [], kicks = [], miles = [], lines = [];
  let feverAt = -9, lastFrame = 0, wasGrounded = true;

  function reset() {
    pops = []; bursts = []; dusts = []; kicks = []; miles = []; lines = [];
    feverAt = -9; wasGrounded = true;
  }

  // ---------- events from the game ----------
  // Returns true when the effect replaces the game's own float text.
  function judge(kind, x, y, combo) {
    if (!active()) return false;
    const t = now();
    pops.push({ kind, x, y, at: t, combo, flip: lastGdir === -1 });
    if (kind === 'perfect') bursts.push({ x, y: player.y + B / 2, at: t, seed: Math.random() * TAU });
    return true;
  }
  // The PERFECT streak word (cosmii-fx.js) rides under this frame's PERFECT.
  function streak(text, color) {
    if (!active()) return false;
    const p = pops[pops.length - 1];
    if (!p || p.kind !== 'perfect' || now() - p.at > 0.1) return false;
    p.sub = text; p.subColor = color; p.life = 1.1;
    return true;
  }
  function milestone(n) {
    if (!active()) return false;
    miles = [{ n, at: now() }];
    return true;
  }
  function fever() {
    if (!active()) return false;
    feverAt = now();
    return true;
  }

  // ---------- cached layers ----------
  const bakes = {};
  function bake(key, w, h, paint) {
    const id = key + ':' + w + ':' + SC, hit = bakes[key];
    if (hit && hit.id === id) return hit.c;
    const c = document.createElement('canvas');
    c.width = Math.ceil(w * SC); c.height = Math.ceil(h * SC);
    const g = c.getContext('2d'); g.scale(SC, SC); paint(g, w, h);
    bakes[key] = { id, c }; return c;
  }
  const feverGlow = () => bake('fever', W, DH, (g, w, h) => {
    for (const [x, y, c] of [[0, 0, '255,90,210'], [w, 0, '90,230,255'], [0, h, '255,190,90'], [w, h, '170,120,255']]) {
      const r = g.createRadialGradient(x, y, 0, x, y, h * 0.75);
      r.addColorStop(0, `rgba(${c},0.34)`); r.addColorStop(1, `rgba(${c},0)`);
      g.fillStyle = r; g.fillRect(0, 0, w, h);
    }
  });

  // ---------- helpers ----------
  function outlined(g, text, x, y, size, fill, stroke = '#261238', width = 6, weight = 900) {
    g.font = `italic ${weight} ${size}px ${FONT}`;
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
    g.lineWidth = width; g.strokeStyle = stroke; g.strokeText(text, x, y);
    g.fillStyle = fill; g.fillText(text, x, y);
  }
  function gold(g, size) {
    const f = g.createLinearGradient(0, -size / 2, 0, size / 2);
    f.addColorStop(0, '#fffbe0'); f.addColorStop(0.45, '#ffe066'); f.addColorStop(1, '#ff9d2e');
    return f;
  }
  const hue = () => STAGES[stageIdx]?.hue ?? 200;
  // Daylight worlds: additive light washes out on a bright sky, so bursts use warm paint instead.
  const BRIGHT = new Set(['rescue', 'catch', 'sudoku', 'mogu', 'match']);
  const brightWorld = () => BRIGHT.has(window.worldSkins?.current?.(true));
  function star4(g, x, y, r) {
    g.beginPath();
    g.moveTo(x, y - r); g.quadraticCurveTo(x, y, x + r, y); g.quadraticCurveTo(x, y, x, y + r);
    g.quadraticCurveTo(x, y, x - r, y); g.quadraticCurveTo(x, y, x, y - r); g.fill();
  }

  // ---------- behind the course ----------
  function drawBack(g) {
    if (!active() || (state !== 'play' && state !== 'paused')) return;
    const t = now(), dt = clamp(t - lastFrame, 0, 0.05); lastFrame = t;
    // speed lines: sky band and under the floor only
    const target = feverOn ? 14 : Math.min(10, 2 + Math.floor(combo / 5));
    const spawn = () => { const top = Math.random() < 0.6; return { x: W + Math.random() * W * 0.6, y: top ? 54 + Math.random() * 46 : GROUND + 10 + Math.random() * (DH - GROUND - 18), len: 40 + Math.random() * 100, v: 1.4 + Math.random() * 1.2, h: Math.random() * 360 }; };
    while (lines.length < target) lines.push(spawn());
    if (lines.length > target) lines.length = target;
    g.save(); g.lineCap = 'round';
    for (const l of lines) {
      if (state === 'play') l.x -= SPEED * l.v * dt;
      if (l.x + l.len < 0) Object.assign(l, spawn(), { x: W + Math.random() * 60 });
      g.globalAlpha = feverOn ? 0.55 : 0.22;
      g.strokeStyle = feverOn ? `hsl(${(l.h + t * 120) % 360},100%,72%)` : '#ffffff';
      g.lineWidth = feverOn ? 2 : 1.3;
      g.beginPath(); g.moveTo(l.x, l.y); g.lineTo(l.x + l.len, l.y); g.stroke();
    }
    g.restore();
  }

  // ---------- over the course, under the HUD ----------
  function drawDust(g, t) {
    dusts = dusts.filter(d => t - d.at < 0.42);
    kicks = kicks.filter(d => t - d.at < 0.3);
    for (const d of dusts) {
      const k = (t - d.at) / 0.42, e = easeOut(k);
      g.globalAlpha = 0.75 * (1 - k);
      for (let i = 0; i < 8; i++) {
        const side = i < 4 ? -1 : 1, j = i % 4;
        g.fillStyle = j % 2 ? '#ffffff' : '#e4e9ff';
        g.beginPath(); g.arc(d.x + side * (8 + 26 * e * (0.6 + j * 0.25)), d.y - d.dir * (3 + 7 * e * (j % 2 + 0.5)), 2.5 + 5 * e * (1 - j * 0.15), 0, TAU); g.fill();
      }
    }
    g.strokeStyle = '#ffffff'; g.lineWidth = 2;
    for (const d of kicks) {
      const k = (t - d.at) / 0.3;
      g.globalAlpha = 0.7 * (1 - k);
      g.beginPath(); g.ellipse(d.x, d.y, 10 + 26 * easeOut(k), 3 + 3 * k, 0, 0, TAU); g.stroke();
    }
    g.globalAlpha = 1;
  }
  function drawBursts(g, t) {
    bursts = bursts.filter(b => t - b.at < 0.45);
    if (!bursts.length) return;
    const bright = brightWorld(), ring = bright ? '#ff8a2a' : '#ffe9a6', sparkA = bright ? '#ff5fb8' : '#ffd35a', sparkB = bright ? '#ffb000' : '#ffffff';
    g.save(); g.globalCompositeOperation = bright ? 'source-over' : 'lighter'; g.lineCap = 'round';
    for (const b of bursts) {
      const k = (t - b.at) / 0.45, e = easeOut(k);
      g.globalAlpha = (1 - k) * 0.9;
      g.strokeStyle = ring; g.lineWidth = 4 * (1 - k) + 1;
      g.beginPath(); g.arc(b.x, b.y, 16 + 44 * e, 0, TAU); g.stroke();
      g.lineWidth = 2.5;
      for (let i = 0; i < 10; i++) {
        const a = b.seed + i * TAU / 10, r0 = 18 + 30 * e, r1 = r0 + 14 * (1 - k);
        g.strokeStyle = i % 2 ? sparkA : sparkB;
        g.beginPath(); g.moveTo(b.x + Math.cos(a) * r0, b.y + Math.sin(a) * r0); g.lineTo(b.x + Math.cos(a) * r1, b.y + Math.sin(a) * r1); g.stroke();
      }
      g.fillStyle = bright ? '#ffc93a' : '#fff6c8';
      for (let i = 0; i < 4; i++) { const a = b.seed * 2 + i * 1.7, r = 26 + 26 * e; star4(g, b.x + Math.cos(a) * r, b.y + Math.sin(a) * r, 6 * (1 - k) + 1); }
      if (k < 0.18 && !bright) {
        g.globalAlpha = (1 - k / 0.18) * 0.65;
        const f = g.createRadialGradient(b.x, b.y, 0, b.x, b.y, 34);
        f.addColorStop(0, '#ffffff'); f.addColorStop(1, 'rgba(255,217,106,0)');
        g.fillStyle = f; g.beginPath(); g.arc(b.x, b.y, 34, 0, TAU); g.fill();
      }
    }
    g.restore();
  }
  function drawPops(g, t) {
    pops = pops.filter(p => t - p.at < (p.life || 0.7));
    for (const p of pops) {
      const life = p.life || 0.7, k = (t - p.at) / life, size = p.kind === 'perfect' ? 30 : p.kind === 'great' ? 24 : 19;
      const s = k < 0.22 * 0.7 / life ? backOut(k / (0.22 * 0.7 / life)) : 1;
      // Rides just above Cosmii through the jump (below on the ceiling), so it never covers the character.
      if (state === 'play') p.y = p.flip ? player.y + B : player.y;
      const y = p.flip ? Math.min(DH - 30, p.y + 34 + 12 * easeOut(k)) : Math.max(72, p.y - 34 - 12 * easeOut(k));
      g.save();
      g.globalAlpha = k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1;
      g.translate(p.x, y); g.scale(s, s); g.rotate(-0.06);
      if (p.kind === 'perfect') {
        outlined(g, 'PERFECT', 0, 0, size, gold(g, size), '#2a1038', 7);
        if (p.sub) outlined(g, p.sub, 2, size * 0.74, 13, p.subColor || '#ffffff', '#2a1038', 4, 800);
        else if (p.combo > 1) outlined(g, p.combo + ' COMBO', 2, size * 0.72, 12, '#ffffff', '#2a1038', 4, 800);
      } else if (p.kind === 'great') outlined(g, 'GREAT', 0, 0, size, '#8ff0ff', '#0f2a44', 6);
      else outlined(g, 'GOOD', 0, 0, size, '#cfe2ff', '#1c2a44', 5, 800);
      g.restore();
    }
  }
  function drawMiles(g, t) {
    miles = miles.filter(m => t - m.at < 1.0);
    for (const m of miles) {
      const k = (t - m.at) / 1.0, cy = lastGdir === -1 ? GROUND - 40 : 78;
      g.save();
      g.globalAlpha = k > 0.75 ? 1 - (k - 0.75) / 0.25 : 1;
      g.translate(W / 2, cy);
      g.save(); g.rotate(k * 0.6); g.globalCompositeOperation = 'lighter';
      const R = 40 + 60 * easeOut(k / 0.4);
      for (let i = 0; i < 14; i++) {
        const a = i * TAU / 14;
        g.fillStyle = i % 2 ? 'rgba(255,207,106,0.25)' : 'rgba(255,138,224,0.25)';
        g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, R, a, a + Math.PI / 14); g.closePath(); g.fill();
      }
      g.restore();
      g.fillStyle = 'rgba(26,15,44,0.8)';
      g.beginPath(); g.roundRect(-100, -27, 200, 54, 27); g.fill();
      const s = k < 0.25 ? backOut(k / 0.25) : 1;
      g.scale(s, s);
      outlined(g, m.n + ' COMBO!', 0, 1, 34, gold(g, 34), '#2a1038', 7);
      g.restore();
    }
  }
  function drawFever(g, t) {
    if (feverOn && state === 'play') {
      g.save(); g.globalCompositeOperation = 'lighter';
      g.globalAlpha = 0.75 + 0.25 * Math.sin(t * 6);
      g.drawImage(feverGlow(), 0, 0, W, DH);
      g.globalAlpha = 1;
      const edge = 10 + 4 * Math.sin(t * 8), col = `hsla(${(t * 140) % 360},100%,70%,0.85)`;
      for (const [x0, y0, x1, y1, x, y, w, h] of [[0, 0, 0, edge, 0, 0, W, edge], [0, DH, 0, DH - edge, 0, DH - edge, W, edge], [0, 0, edge, 0, 0, 0, edge, DH], [W, 0, W - edge, 0, W - edge, 0, edge, DH]]) {
        const f = g.createLinearGradient(x0, y0, x1, y1);
        f.addColorStop(0, col); f.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = f; g.fillRect(x, y, w, h);
      }
      g.restore();
    }
    const since = t - feverAt;
    if (since < 0 || since >= 1.15) return;
    g.save();
    if (since < 0.14) { g.globalAlpha = 0.55 * (1 - since / 0.14); g.fillStyle = '#ffffff'; g.fillRect(0, 0, W, DH); g.globalAlpha = 1; }
    const inK = easeOut(since / 0.2), outK = since > 0.85 ? easeOut((since - 0.85) / 0.3) : 0;
    // On the ceiling the band crosses the lower half instead, clear of the course above.
    g.translate(W / 2 + (1 - inK) * W * 1.2 - outK * W * 1.2, lastGdir === -1 ? DH - 150 : 150); g.rotate(-0.12);
    const bw = W * 1.4, bh = 78, f = g.createLinearGradient(-bw / 2, 0, bw / 2, 0);
    f.addColorStop(0, '#ff4fc6'); f.addColorStop(0.45, '#ffb84a'); f.addColorStop(1, '#4fe6ff');
    g.fillStyle = '#1a0b2a'; g.fillRect(-bw / 2, -bh / 2 - 6, bw, bh + 12);
    g.fillStyle = f; g.fillRect(-bw / 2, -bh / 2, bw, bh);
    g.save(); g.globalAlpha = 0.18; g.fillStyle = '#ffffff';
    for (let x = -bw / 2 + ((since * 600) % 40); x < bw / 2; x += 40) { g.beginPath(); g.moveTo(x, -bh / 2); g.lineTo(x + 16, -bh / 2); g.lineTo(x - 4, bh / 2); g.lineTo(x - 20, bh / 2); g.fill(); }
    g.restore();
    const art = skinImage(skinIdx);
    if (art) { g.save(); g.rotate(0.12); g.drawImage(art, -W * 0.36 - 50, -62, 112, 112); g.restore(); }
    outlined(g, 'FEVER TIME!', 30, -6, 46, '#ffffff', '#2a0b3a', 9);
    outlined(g, 'SCORE ×2', 40, 28, 15, '#fff4b8', '#2a0b3a', 5, 800);
    g.restore();
  }
  // Stage title band above the 3-2-1 (fresh starts only, like the countdown).
  function drawIntro(g) {
    if (state !== 'play' || attemptOffset !== 0) return;
    const left = -LEAD - songPos;
    if (left <= 0 || left > COUNT_SEC + 0.01) return;
    const k = 1 - left / COUNT_SEC, inK = easeOut(k / 0.15), outK = k > 0.88 ? easeOut((k - 0.88) / 0.12) : 0;
    const cy = 74, h = 40 * inK, info = STAGES[stageIdx];
    g.save(); g.globalAlpha = 1 - outK;
    g.fillStyle = 'rgba(18,10,34,0.88)'; g.fillRect(0, cy - h / 2, W, h);
    g.fillStyle = `hsl(${hue()},100%,66%)`; g.fillRect(0, cy - h / 2, W * inK, 2); g.fillRect(W * (1 - inK), cy + h / 2 - 2, W * inK, 2);
    g.translate((1 - inK) * -60, 0);
    outlined(g, info.name.replace(/(\d+)$/, n => n.padStart(2, '0')), W / 2, cy - 4, 22, '#ffffff', '#120a22', 5);
    g.font = `700 10px ${FONT}`; g.fillStyle = `hsl(${hue()},90%,80%)`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText((info.title ? info.title + '  ·  ' : '') + (info.world || 'RHYTHM DASH'), W / 2, cy + 12);
    g.restore();
  }

  function drawFront(g) {
    if (!active() || (state !== 'play' && state !== 'paused')) return;
    const t = now();
    if (state === 'play') {   // landing / take-off from the physics state
      const foot = lastGdir === 1 ? player.y + B : player.y, x = player.x + B / 2;
      if (player.grounded && !wasGrounded) dusts.push({ x, y: foot, dir: lastGdir, at: t });
      else if (!player.grounded && wasGrounded && songPos > -LEAD) kicks.push({ x, y: foot, at: t });
      wasGrounded = player.grounded;
    }
    drawFever(g, t);
    drawDust(g, t);
    drawBursts(g, t);
    drawMiles(g, t);
    drawPops(g, t);
    drawIntro(g);
  }
  // Fill for the countdown's GO!: gold instead of green.
  function goFill(g, size) { return active() ? gold(g, size) : null; }

  window.addEventListener('cosmii-effects-change', reset);
  window.cosmiiImpact = { judge, streak, milestone, fever, reset, drawBack, drawFront, goFill, active };
})();
