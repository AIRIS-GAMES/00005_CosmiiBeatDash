// Visual effects layered on top of the core game (index.html):
//  - death bursts that depend on what Cosmii hit (bomb -> explosion, jelly ->
//    electric zap, spike -> shards, block/roller -> squashed flat, hole -> fall,
//    MOGU -> eaten)
//  - the PERFECT streak: a rainbow tail from 5 in a row, a gold aura from 10,
//    gold screen edges on the beat from 20. Visual only - no sound, so the
//    music is never covered.
// Everything is drawn into the game canvas in its logical coordinates (W x DH).
(function () {
  'use strict';
  const TAU = Math.PI * 2;
  const now = () => performance.now() / 1000;

  // ---------- Death ----------
  // Which burst fits the thing that was hit.
  function deathKind(opts, ob, part) {
    if (opts.kind) return opts.kind;
    if (opts.fall || part === 'pit') return 'fall';
    const t = ob?.type || '';
    if (t === 'jelly' || t === 'ring') return 'zap';
    if (t === 'ball' || t === 'bigball' || t === 'prize' || t === 'cake' || t === 'door' || t === 'tile') return 'squash';
    if (part === 'block') return 'squash';
    const world = window.worldSkins?.current?.(true);
    if (part === 'spike' && (world === 'match' || world === 'roll')) return 'boom';   // bombs and meteors
    return 'shatter';
  }

  let fx = null;   // the running death effect
  function startDeath(kind, x, y, gdir, sprite) {
    const t0 = now(), r = Math.random;
    fx = { kind, x, y, gdir: gdir || 1, sprite, t0, bits: [] };
    const add = (n, f) => { for (let i = 0; i < n; i++) fx.bits.push(f(i)); };
    if (kind === 'boom') {
      add(10, () => ({ a: r() * TAU, v: 40 + r() * 70, s: 10 + r() * 14, d: 0.1 + r() * 0.25 }));   // smoke puffs
      add(18, () => { const a = r() * TAU, v = 160 + r() * 260; return { vx: Math.cos(a) * v, vy: Math.sin(a) * v - 140, s: 3 + r() * 4, hue: 20 + r() * 30 }; });
    } else if (kind === 'zap') {
      add(14, () => { const a = r() * TAU, v = 60 + r() * 160; return { vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, s: 2 + r() * 3 }; });
    } else if (kind === 'shatter') {
      add(4, i => ({ q: i, vx: (i % 2 ? 1 : -1) * (90 + r() * 80), vy: (i < 2 ? -1 : 0.2) * (150 + r() * 90), spin: (r() - 0.5) * 14 }));
      add(10, () => { const a = r() * TAU, v = 80 + r() * 200; return { star: true, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 80, s: 4 + r() * 4 }; });
    }
    return fx;
  }

  function star(g, x, y, r, rot) {
    g.beginPath();
    for (let i = 0; i < 10; i++) { const a = rot + i * Math.PI / 5 - Math.PI / 2, rad = i % 2 ? r * 0.45 : r; g.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad); }
    g.closePath(); g.fill();
  }
  function sprite(g, im, size) {
    if (im) g.drawImage(im, -size / 2, -size / 2, size, size);
    else { g.fillStyle = '#ff8fc8'; g.beginPath(); g.arc(0, 0, size * 0.36, 0, TAU); g.fill(); }
  }
  // The sprite with a colour laid over its pixels only (soot, electric white).
  const tints = new Map();
  function tinted(im, color) {
    if (!im || !(im.naturalWidth || im.width)) return null;
    const key = color, hit = tints.get(key);
    if (hit && hit.im === im) return hit.c;
    const c = document.createElement('canvas'); c.width = c.height = 96;
    const g = c.getContext('2d'); g.drawImage(im, 0, 0, 96, 96);
    g.globalCompositeOperation = 'source-atop'; g.fillStyle = color; g.fillRect(0, 0, 96, 96);
    tints.set(key, { im, c }); return c;
  }
  // A flame tongue: round at the bottom, a point at the top.
  function tongue(g, x, y, w, h) {
    g.beginPath(); g.moveTo(x, y - h);
    g.quadraticCurveTo(x + w * 1.1, y - h * 0.35, x + w, y);
    g.arc(x, y, w, 0, Math.PI);
    g.quadraticCurveTo(x - w * 1.1, y - h * 0.35, x, y - h); g.fill();
  }
  function bolt(g, x0, y0, x1, y1) {
    g.beginPath(); g.moveTo(x0, y0);
    for (let i = 1; i < 5; i++) { const k = i / 5; g.lineTo(x0 + (x1 - x0) * k + (Math.random() - 0.5) * 12, y0 + (y1 - y0) * k + (Math.random() - 0.5) * 12); }
    g.lineTo(x1, y1); g.stroke();
  }

  function drawDeath(g, B) {
    if (!fx) return false;
    const t = now() - fx.t0, { x, y, bits } = fx, size = B * 1.35;
    if (t > 2.2 || t < 0) { fx = null; return false; }   // done (or the clock jumped)
    g.save();
    switch (fx.kind) {
      case 'boom': {
        // white flash -> fireball -> smoke, Cosmii flung up spinning and sooty
        if (t < 0.08) { g.globalAlpha = 1 - t / 0.08; g.fillStyle = '#fff'; g.beginPath(); g.arc(x, y, B * 2.4, 0, TAU); g.fill(); }
        const fb = Math.min(1, t / 0.18), fa = Math.max(0, 1 - t / 0.55);
        if (fa > 0) {
          g.globalAlpha = fa;
          const R = B * (0.6 + 1.3 * fb);
          const gr = g.createRadialGradient(x, y, 0, x, y, R);
          gr.addColorStop(0, '#fffbe0'); gr.addColorStop(0.35, '#ffd24a'); gr.addColorStop(0.7, '#ff6a2a'); gr.addColorStop(1, 'rgba(255,60,30,0)');
          g.fillStyle = gr; g.beginPath(); g.arc(x, y, R, 0, TAU); g.fill();
        }
        for (const b of bits) {
          if (b.d !== undefined) {
            const k = t - b.d; if (k < 0 || k > 1.3) continue;
            g.globalAlpha = Math.max(0, 0.55 * (1 - k / 1.3));
            g.fillStyle = '#5a5068';
            g.beginPath(); g.arc(x + Math.cos(b.a) * b.v * k, y + Math.sin(b.a) * b.v * k * 0.6 - 30 * k, b.s * (1 + k * 1.4), 0, TAU); g.fill();
          } else if (t < 1) {
            g.globalAlpha = 1 - t; g.fillStyle = `hsl(${b.hue},100%,60%)`;
            g.fillRect(x + b.vx * t - b.s / 2, y + b.vy * t + 400 * t * t - b.s / 2, b.s, b.s);
          }
        }
        if (t < 1.4) {
          g.globalAlpha = Math.max(0, 1 - t / 1.4);
          g.translate(x + 60 * t, y - 260 * t + 420 * t * t); g.rotate(t * 9);
          sprite(g, fx.sprite, size * (1 - t * 0.35));
          const soot = tinted(fx.sprite, 'rgba(30,20,30,0.55)');   // sooty from the blast
          if (soot) { const z = size * (1 - t * 0.35); g.drawImage(soot, -z / 2, -z / 2, z, z); }
        }
        break;
      }
      case 'zap': {
        // flickers white and blue in place with bolts around, then pops into sparks
        if (t < 0.75) {
          const on = Math.floor(t * 22) % 2 === 0;
          g.save(); g.translate(x, y); g.scale(1 + 0.06 * Math.sin(t * 60), 1 + 0.06 * Math.cos(t * 55));
          sprite(g, fx.sprite, size);
          const lit = on && tinted(fx.sprite, 'rgba(255,255,180,0.85)');
          if (lit) g.drawImage(lit, -size / 2, -size / 2, size, size);
          g.restore();
          g.strokeStyle = on ? '#fff36b' : '#8fe8ff'; g.lineWidth = 2.5; g.lineJoin = 'round';
          for (let i = 0; i < 3; i++) { const a = Math.random() * TAU; bolt(g, x + Math.cos(a) * B * 0.3, y + Math.sin(a) * B * 0.3, x + Math.cos(a) * B * 1.25, y + Math.sin(a) * B * 1.25); }
        } else {
          const k = t - 0.75;
          if (k < 0.15) { g.globalAlpha = 1 - k / 0.15; g.fillStyle = '#fff9c0'; g.beginPath(); g.arc(x, y, B * (0.5 + k * 6), 0, TAU); g.fill(); }
          for (const b of bits) {
            if (k > 1) break;
            g.globalAlpha = 1 - k; g.fillStyle = Math.random() < 0.5 ? '#fff36b' : '#8fe8ff';
            g.fillRect(x + b.vx * k - b.s / 2, y + b.vy * k + 300 * k * k - b.s / 2, b.s, b.s);
          }
        }
        break;
      }
      case 'shatter': {
        // "pachin": the sprite breaks into four quarters that fly apart, with star bits
        if (t < 0.1) { g.globalAlpha = 1 - t / 0.1; g.strokeStyle = '#fff'; g.lineWidth = 3; g.beginPath(); g.arc(x, y, B * (0.6 + t * 8), 0, TAU); g.stroke(); }
        for (const b of bits) {
          const k = Math.min(t, 1.2);
          if (b.star) {
            if (t > 0.9) continue;
            g.globalAlpha = 1 - t / 0.9; g.fillStyle = '#ffe27a';
            star(g, x + b.vx * k, y + b.vy * k + 380 * k * k, b.s, t * 6);
          } else if (fx.sprite && t < 1.2) {
            const qx = b.q % 2, qy = b.q >> 1, iw = fx.sprite.naturalWidth || fx.sprite.width, ih = fx.sprite.naturalHeight || fx.sprite.height;
            g.save(); g.globalAlpha = Math.max(0, 1 - t / 1.2);
            g.translate(x + (qx - 0.5) * size / 2 + b.vx * k, y + (qy - 0.5) * size / 2 + b.vy * k + 520 * k * k);
            g.rotate(b.spin * k);
            g.drawImage(fx.sprite, qx * iw / 2, qy * ih / 2, iw / 2, ih / 2, -size / 4, -size / 4, size / 2, size / 2);
            g.restore();
          }
        }
        break;
      }
      case 'squash': {
        // "pecha": flattened against the floor (or ceiling) with stars circling overhead
        const k = Math.min(1, t / 0.12), wob = t < 0.5 ? Math.sin(t * 40) * 0.08 * (1 - t / 0.5) : 0;
        const sx = 1 + 0.7 * k + wob, sy = 1 - 0.72 * k - wob;
        const foot = fx.gdir === 1 ? y + B / 2 : y - B / 2;
        g.globalAlpha = t > 1.6 ? Math.max(0, 1 - (t - 1.6) / 0.5) : 1;
        g.save(); g.translate(x, foot - fx.gdir * size * sy / 2); g.scale(sx, sy * fx.gdir); sprite(g, fx.sprite, size); g.restore();
        if (t > 0.1) {
          g.fillStyle = '#ffe27a';
          const cy = foot - fx.gdir * (size * 0.28 + 16);
          for (let i = 0; i < 3; i++) { const a = t * 5 + i * TAU / 3; star(g, x + Math.cos(a) * 22, cy + Math.sin(a) * 6, 6, t * 4); }
        }
        break;
      }
      case 'fall': {
        // drops away spinning and shrinking, then a twinkle where it vanished
        const dy = 520 * t * t * fx.gdir, sc = Math.max(0, 1 - t * 0.9);
        if (sc > 0) { g.save(); g.translate(x, y + dy); g.rotate(t * 5); sprite(g, fx.sprite, size * sc); g.restore(); }
        if (t > 0.7 && t < 1.3) {
          const k = (t - 0.7) / 0.6, ty = Math.min(y + 520 * 0.49 * fx.gdir, fx.gdir === 1 ? 340 : 20);
          g.globalAlpha = Math.sin(k * Math.PI); g.fillStyle = '#fff6b0'; star(g, x, ty, 6 + 10 * Math.sin(k * Math.PI), k * 3);
        }
        break;
      }
      case 'eaten': {
        // pulled into MOGU's mouth (it sits behind on the left), then crumbs and "mogu mogu"
        const k = Math.min(1, t / 0.22), sc = 1 - k;
        if (sc > 0) { g.save(); g.translate(x - B * 1.5 * k * k, y + 4 * k); g.rotate(-k * 2); sprite(g, fx.sprite, size * sc); g.restore(); }
        if (t > 0.25 && t < 1.6) {
          const m = t - 0.25;
          g.globalAlpha = Math.min(1, (1.35 - m) * 2);
          g.font = '900 16px "M PLUS 1p", sans-serif'; g.textAlign = 'center';
          g.lineWidth = 3; g.strokeStyle = '#fff'; g.fillStyle = '#5bb04a';
          const bob = Math.abs(Math.sin(m * 9)) * 5;
          g.strokeText('モグモグ…', x - B * 1.5, y - B - bob); g.fillText('モグモグ…', x - B * 1.5, y - B - bob);
          g.fillStyle = '#ffd6a0';
          for (let i = 0; i < 6; i++) { const a = i * 1.3 + 0.4; g.fillRect(x - B * 1.5 + Math.cos(a) * (14 + m * 40), y + Math.sin(a) * 8 + m * m * 160, 3, 3); }
          g.textAlign = 'left';
        }
        break;
      }
    }
    g.restore();
    return true;
  }

  // ---------- PERFECT streak ----------
  // 5 in a row: rainbow tail. 10: ON FIRE - gold flames rise off Cosmii, a gold
  // ring on every beat, the tail turns into a comet and speed lines stream by.
  // 20: METEOR - blue flames, a longer comet, stronger lines, glowing edges.
  // 30: SUPERNOVA - rainbow flames and comet, stars raining across the screen.
  const trail = [];   // recent player centres {t, y}
  const flames = [], sparks = [], lines = [], beatRings = [], stars = [];
  let tierShown = 0, lastPos = null, lastPulse = 0, lastRun = 0;
  const edgeBakes = new Map();
  function edge(W, DH, rgb) {
    const sc = typeof SC === 'number' && SC > 0 ? SC : 1, w = Math.ceil(W), key = sc + ':' + w + ':' + rgb;
    const hit = edgeBakes.get(key); if (hit) return hit;
    const c = document.createElement('canvas'); c.width = Math.ceil(w * sc / 2); c.height = Math.ceil(DH * sc / 2);
    const g = c.getContext('2d'); g.scale(c.width / w, c.height / DH);
    const grd = g.createRadialGradient(w / 2, DH / 2, DH * 0.5, w / 2, DH / 2, Math.hypot(w, DH) / 2);
    grd.addColorStop(0, `rgba(${rgb},0)`); grd.addColorStop(1, `rgba(${rgb},0.75)`);
    g.fillStyle = grd; g.fillRect(0, 0, w, DH);
    edgeBakes.set(key, c); return c;
  }
  let auraBake = null;
  function aura(B) {
    if (auraBake && auraBake.B === B) return auraBake.c;
    const r = B * 1.1, c = document.createElement('canvas'); c.width = c.height = Math.ceil(r * 4);
    const g = c.getContext('2d'); g.scale(2, 2);
    const grd = g.createRadialGradient(r, r, 0, r, r, r);
    grd.addColorStop(0, 'rgba(255,255,255,0.42)'); grd.addColorStop(0.55, 'rgba(255,255,255,0.14)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd; g.beginPath(); g.arc(r, r, r, 0, TAU); g.fill();
    auraBake = { B, c }; return c;
  }
  const tierOf = n => n >= 30 ? 4 : n >= 20 ? 3 : n >= 10 ? 2 : n >= 5 ? 1 : 0;
  const TIER_WORD = ['', '', 'ON FIRE!', 'METEOR!', 'SUPERNOVA!'];
  // flame colours per tier: [outer, inner]
  // The fire changes colour little by little with the streak: gold at 10,
  // through orange, red and magenta to blue at 20, then rainbow from 30.
  const STREAK_HUES = [[10, 45], [13, 28], [16, 350], [18, 290], [20, 205], [29, 175]];
  function streakHue(run) {
    if (run <= STREAK_HUES[0][0]) return STREAK_HUES[0][1];
    for (let i = 1; i < STREAK_HUES.length; i++) {
      const [r1, h1] = STREAK_HUES[i], [r0, h0] = STREAK_HUES[i - 1];
      if (run <= r1) { let d = h1 - h0; if (d > 180) d -= 360; if (d < -180) d += 360; return (h0 + d * (run - r0) / (r1 - r0) + 360) % 360; }
    }
    return STREAK_HUES[STREAK_HUES.length - 1][1];
  }
  const flameHue = (tier, t, i, run) => tier >= 4 ? (t * 300 + i * 47) % 360 : streakHue(run);

  // Called every frame before the player is drawn.
  function drawStreak(g, s) {
    const tier = s.state === 'play' ? tierOf(s.run) : 0;
    const dt = lastPos === null ? 0 : Math.max(0, Math.min(0.05, s.songPos - lastPos)); lastPos = s.songPos;
    const beat = s.pulse > 0.95 && lastPulse <= 0.95; lastPulse = s.pulse;
    if (s.state === 'play') { trail.push({ t: s.songPos, y: s.y }); while (trail.length && trail[0].t < s.songPos - (tier >= 3 ? 0.42 : tier >= 2 ? 0.32 : 0.22)) trail.shift(); }
    else trail.length = 0;
    // the streak broke after 10+: the flames go out in a puff
    if (s.state === 'play' && s.run === 0 && lastRun >= 10) for (let i = 0; i < 8; i++) sparks.push({ x: s.x, y: s.y, vx: (Math.random() - 0.5) * 90, vy: -40 - Math.random() * 60, l: 0.6, smoke: true, s: 6 + Math.random() * 6 });
    lastRun = s.run;
    if (tier < tierShown || s.run === 0) tierShown = 0;
    if (tier > tierShown) {   // a word when a new level is reached
      tierShown = tier;
      const word = tier >= 2 ? `${TIER_WORD[tier]} ×${s.run}` : `${s.run}連続 PERFECT!`, color = tier >= 4 ? '#ffffff' : tier === 3 ? '#8fe8ff' : '#ffd94a';
      if (!window.cosmiiImpact?.streak(word, color)) s.floats.push({ text: word, x: s.x, y: s.y - s.B * 1.4, l: 1.4, c: color });   // else it rides under the PERFECT pop
      if (tier >= 2) { beatRings.push({ x: s.x, y: s.y, l: 1, big: true }); for (let i = 0; i < 14; i++) { const a = i * TAU / 14; sparks.push({ x: s.x, y: s.y, vx: Math.cos(a) * 220, vy: Math.sin(a) * 220, l: 0.6, s: 4 }); } }
    }
    // spawn
    if (tier >= 2 && dt > 0) {
      const n = tier >= 3 ? 3 : 2;
      for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI; flames.push({ x: s.x - Math.cos(a) * s.B * 0.62, y: s.y + s.B * 0.1 - Math.sin(a) * s.B * 0.5, vy: -(120 + Math.random() * 90), l: 1, s: s.B * (0.24 + Math.random() * 0.14), hue: flameHue(tier, s.songPos, flames.length, s.run) }); }   // licking up around the body
      if (Math.random() < (tier >= 3 ? 0.7 : 0.45)) {   // in the sky band and under the floor only: never across the course
        const top = Math.random() < 0.7;
        lines.push({ y: top ? 8 + Math.random() * s.DH * 0.18 : s.DH * 0.86 + Math.random() * s.DH * 0.12, x: s.W + 20, len: 40 + Math.random() * 80, v: 900 + Math.random() * 500 });
      }
      if (Math.random() < 0.5) sparks.push({ x: s.x - s.B * 0.6, y: s.y + (Math.random() - 0.5) * s.B * 0.6, vx: -(s.speed * 0.6 + Math.random() * 80), vy: (Math.random() - 0.5) * 50, l: 0.5, s: 3, star: true });
      if (beat) beatRings.push({ x: s.x, y: s.y, l: 1 });
      if (tier >= 4 && Math.random() < 0.25) stars.push({ x: Math.random() * s.W * 1.2, y: -10, l: 0.7, s: 3 + Math.random() * 3 });   // fade out before they reach the course
    }
    // update
    for (const f of flames) { f.y += f.vy * dt; f.x -= s.speed * 0.08 * dt; f.l -= dt * 3.2; }   // short-lived: the fire hugs the body
    for (const p of sparks) { p.x += p.vx * dt; p.y += p.vy * dt; p.l -= dt * (p.smoke ? 1.2 : 1.8); if (p.smoke) p.s += dt * 20; }
    for (const ln of lines) ln.x -= ln.v * dt;
    for (const r of beatRings) r.l -= dt * (r.big ? 1.6 : 2.6);
    for (const st of stars) { st.x -= 260 * dt; st.y += 220 * dt; st.l -= dt * 0.8; }
    const keep = a => { let k = 0; for (const o of a) if ((o.l === undefined ? o.x > -200 : o.l > 0)) a[k++] = o; a.length = k; };
    keep(flames); keep(sparks); keep(beatRings); keep(stars);
    { let k = 0; for (const ln of lines) if (ln.x + ln.len > 0) lines[k++] = ln; lines.length = k; }
    if (flames.length > 80) flames.splice(0, flames.length - 80);
    if (!tier && !sparks.length && !flames.length && !lines.length && !beatRings.length && !stars.length) return;

    g.save();
    if (tier >= 3) {   // glowing edges on the beat (blue, then rainbow)
      const rgb = tier >= 4 ? ['255,120,220', '120,220,255', '255,220,90'][((Math.floor(s.songPos * 2) % 3) + 3) % 3] : '120,210,255';
      g.globalAlpha = 0.2 + 0.5 * Math.min(1, s.pulse);
      g.drawImage(edge(s.W, s.DH, rgb), 0, 0, s.W, s.DH);
    }
    // speed lines
    g.lineCap = 'round';
    for (const ln of lines) { g.globalAlpha = tier >= 3 ? 0.45 : 0.3; g.strokeStyle = '#ffffff'; g.lineWidth = tier >= 3 ? 2.5 : 1.8; g.beginPath(); g.moveTo(ln.x, ln.y); g.lineTo(ln.x + ln.len, ln.y); g.stroke(); }
    // falling stars (supernova)
    g.fillStyle = '#fff6b0';
    for (const st of stars) { g.globalAlpha = Math.min(0.8, st.l * 1.4); star(g, st.x, st.y, st.s, st.l * 4); }
    // the tail: rainbow ribbon, a comet from 10
    if (trail.length > 2) {
      for (let i = 1; i < trail.length; i++) {
        const a = trail[i - 1], b = trail[i], k = i / trail.length;
        const x0 = s.x - (s.songPos - a.t) * s.speed - s.B * 0.3, x1 = s.x - (s.songPos - b.t) * s.speed - s.B * 0.3;
        g.globalAlpha = k * 0.85;
        g.strokeStyle = tier === 2 || tier === 3 ? `hsl(${streakHue(s.run) + 10 * k},100%,${55 + 22 * k}%)` : `hsl(${(i * 26 + s.songPos * 240) % 360},95%,66%)`;
        g.lineWidth = s.B * (tier >= 2 ? 0.2 + 0.75 * k : 0.15 + 0.4 * k);
        g.beginPath(); g.moveTo(x0, a.y); g.lineTo(x1, b.y); g.stroke();
        if (tier >= 2) {   // white-hot core
          g.globalAlpha = k * 0.9; g.strokeStyle = '#ffffff'; g.lineWidth = s.B * 0.25 * k;
          g.beginPath(); g.moveTo(x0, a.y); g.lineTo(x1, b.y); g.stroke();
        }
      }
    }
    // beat rings
    for (const r of beatRings) {
      g.globalAlpha = Math.max(0, r.l) * 0.7; g.strokeStyle = tier >= 4 ? `hsl(${(s.songPos * 300) % 360},100%,70%)` : `hsl(${streakHue(s.run)},100%,70%)`;
      g.lineWidth = r.big ? 5 : 3; g.beginPath(); g.arc(s.x, s.y, s.B * (0.7 + (1 - r.l) * (r.big ? 3.5 : 1.6)), 0, TAU); g.stroke();
    }
    // aura (tinted by tier) and flames
    if (tier >= 2) {
      const c = aura(s.B), k = 1 + 0.15 * Math.min(1, s.pulse), d = c.width / 2 * k;
      g.globalAlpha = 0.9; g.drawImage(c, s.x - d / 2, s.y - d / 2, d, d);
    }
    // flame tongues: teardrops pointing up, added together so they glow where they overlap
    g.globalCompositeOperation = 'lighter';
    for (const f of flames) {
      const a = Math.max(0, f.l), w = f.s * (0.35 + 0.45 * a), h = f.s * (1 + 0.8 * (1 - a));
      g.globalAlpha = a * 0.45; g.fillStyle = `hsl(${f.hue},100%,52%)`; tongue(g, f.x, f.y, w, h);
      g.globalAlpha = a * 0.6; g.fillStyle = `hsl(${f.hue + 12},100%,80%)`; tongue(g, f.x, f.y + w * 0.15, w * 0.45, h * 0.55);
    }
    g.globalCompositeOperation = 'source-over';
    for (const p of sparks) {
      g.globalAlpha = Math.max(0, p.l) * (p.smoke ? 0.5 : 1);
      if (p.smoke) { g.fillStyle = '#c8c0d8'; g.beginPath(); g.arc(p.x, p.y, p.s, 0, TAU); g.fill(); }
      else if (p.star) { g.fillStyle = '#fff6b0'; star(g, p.x, p.y, p.s + 1, p.l * 8); }
      else { g.fillStyle = '#ffffff'; g.fillRect(p.x - p.s / 2, p.y - p.s / 2, p.s, p.s); }
    }
    g.restore();
  }

  // ---------- Goal run ----------
  // After the goal: two little hops (ぴょんぴょん), a big banzai jump with a
  // spin, a sliding stop into a pose lit from below, then fireworks.
  // ...then a reaction for the rank (S: all five line up, A: grooving,
  // B: deadpan clap, C: slumped "…セーフ"), and every rank ends on the same
  // weird octopus dance with a derpy face (googly eyes, tongue out): the meme.
  const GOAL_T = { hops: 0.8, jump: 0.75, land: 0.18, brake: 0.55, react: 1.35, dance: 1.9 };
  const GREEN = 3;
  let goalRankNow = 'A', goalSkin = 0;
  const reactAt = () => GOAL_T.hops + GOAL_T.jump + GOAL_T.land;
  const danceAt = () => reactAt() + GOAL_T.react;
  // seconds from the goal to the result card
  const goalLength = () => danceAt() + GOAL_T.dance;
  // S rank: green trips near the end of the line-up, lies flat, gets up for the dance
  // S rank: green trips at the very end of the weird dance and stays down (the punchline)
  const tripAt = () => danceAt() + GOAL_T.dance - 0.75;
  const tripCurve = t => t < tripAt() ? 0 : smooth((t - tripAt()) / 0.22);
  // The weird dance: a lopsided wiggle with a hiccup on every other beat.
  // Each one dances its own way: red bounces high, blue sways its hips
  // slowly, pink shimmies fast, green wobbles half a beat late, purple jerks
  // like a robot.
  function weirdDance(u, seed = 0, idx = 0) {
    const P = [0.38, 0.6, 0.26, 0.5, 0.42][idx] || 0.42, t = u / P + seed, ph = t * Math.PI * 2, hic = Math.floor(t) % 2;
    if (idx === 0) return { rot: 0.25 * Math.sin(ph), lift: 22 * Math.abs(Math.sin(ph)), sx: 1 + 0.16 * Math.cos(ph * 2), sy: 1 - 0.16 * Math.cos(ph * 2), dx: 3 * Math.sin(ph / 2) };
    if (idx === 1) return { rot: 0.18 * Math.sin(ph), lift: 3 * Math.abs(Math.sin(ph)), sx: 1 + 0.05 * Math.sin(ph * 2), sy: 1 - 0.05 * Math.sin(ph * 2), dx: 12 * Math.sin(ph) };
    if (idx === 2) return { rot: 0.32 * Math.sin(ph), lift: 6 * Math.abs(Math.sin(ph * 2)), sx: 1 + 0.1 * Math.sin(ph * 2), sy: 1 - 0.1 * Math.sin(ph * 2), dx: 5 * Math.sin(ph * 2) };
    if (idx === 3) { const l = ph - 0.9; return { rot: 0.5 * Math.sin(l) * (0.7 + 0.3 * Math.sin(l / 3)), lift: 5 * Math.abs(Math.sin(l)), sx: 1 + 0.18 * Math.sin(l * 2 + 1), sy: 1 - 0.18 * Math.sin(l * 2 + 1), dx: 6 * Math.sin(l / 2) }; }
    if (idx === 4) { const step = Math.round(Math.sin(ph) * 2) / 2; return { rot: 0.4 * step, lift: hic ? 8 : 0, sx: 1, sy: 1, dx: 8 * step }; }
    return {
      rot: 0.42 * Math.sin(ph) + (hic ? 0.12 * Math.sin(ph * 3) : 0),
      lift: 10 * Math.abs(Math.sin(ph)) + (hic ? 6 : 0) * Math.max(0, Math.sin(ph * 2)),
      sx: 1 + 0.14 * Math.sin(ph * 2 + 1), sy: 1 - 0.14 * Math.sin(ph * 2 + 1),
      dx: 7 * Math.sin(ph / 2),
    };
  }
  const smooth = u => { u = Math.max(0, Math.min(1, u)); return u * u * (3 - 2 * u); };
  const mix = (a, b, k) => a + (b - a) * k;
  function goalPose(t) {
    const H = GOAL_T, j0 = H.hops, j1 = j0 + H.jump, l1 = j1 + H.land;
    let lift = 0, rot = 0, sx = 1, sy = 1, speed = 1, phase = 'hop', dx = 0;
    // cheer: 0 = side-on running art, 1 = arms-up art facing us (cross-faded)
    const cheer = smooth((t - j0 + 0.02) / 0.14);
    if (t < j0) {   // hop, hop: squashed on the ground, stretched in the air
      const u = (t % (j0 / 2)) / (j0 / 2), c = Math.cos(2 * Math.PI * u) * smooth(t / 0.1);   // eased in from the normal run
      lift = 24 * Math.sin(Math.PI * u);
      sx = 1 + 0.08 * c; sy = 1 - 0.08 * c;
    } else if (t < j1) {   // banzai: up, a full spin, down
      const u = (t - j0) / H.jump, k = smooth(u / 0.25);
      lift = 92 * Math.sin(Math.PI * u);
      rot = -Math.PI * 2 * smooth((u - 0.1) / 0.8);
      sx = mix(1.08, 0.93, k); sy = mix(0.92, 1.08, k);
      if (u > 0.8) { const e = smooth((u - 0.8) / 0.2); sx = mix(sx, 1.12, e); sy = mix(sy, 0.88, e); }   // bracing for the landing
    } else if (t < l1) {   // landing squash and recovery
      const u = (t - j1) / H.land, e = Math.sin(Math.PI * Math.min(1, u * 1.4));
      sx = mix(1.12, 1, smooth(u)) + 0.14 * e; sy = mix(0.88, 1, smooth(u)) - 0.14 * e; phase = 'land';
    } else if (t < danceAt()) {   // slide to a stop, then the rank's reaction
      const u = t - l1, b = Math.min(1, u / H.brake);
      speed = 1 - smooth(b); phase = 'react';
      rot = 0.16 * Math.sin(Math.PI * b) * (1 - b);
      const q = u > H.brake * 0.6 ? u - H.brake * 0.6 : 0, in1 = smooth(q / 0.15);
      if (goalRankNow === 'S') { lift = 12 * Math.abs(Math.sin(q * 9)) * in1; sx = 1 - 0.05 * Math.sin(q * 18) * in1; sy = 2 - sx; }
      else if (goalRankNow === 'A') { rot += 0.22 * Math.sin(q * 8) * in1; lift = 8 * Math.abs(Math.sin(q * 8)) * in1; }
      else if (goalRankNow === 'B') { const c = Math.max(0, Math.sin(q * 6)) ** 6; sx = 1 - 0.1 * c * in1; sy = 1 + 0.04 * c * in1; }
      else { sx = 1 + 0.12 * in1; sy = 1 - 0.16 * in1; rot = -0.08 * in1; }   // C: slumped
    } else {   // everyone: the weird dance
      const u = t - danceAt(), d = weirdDance(u, 0, goalSkin), e = smooth(u / 0.15);
      speed = 0; phase = 'dance';
      rot = d.rot * e; lift = d.lift * e; sx = mix(1, d.sx, e); sy = mix(1, d.sy, e); dx = d.dx * e;
    }
    // S as green: you are the one who trips
    if (goalRankNow === 'S' && goalSkin === GREEN) { const k = tripCurve(t); if (k > 0) { rot = mix(rot, 1.45, k); lift *= 1 - k; } }
    return { lift, rot, sx, sy, speed, phase, cheer, dx, weird: t >= danceAt() };
  }
  const fireworks = [], goalBits = [];
  let goalT0 = -1, lastHop = -1, landed = false, nextFw = 0;
  function goalRank(rank, skin) { goalRankNow = rank; goalSkin = skin; }
  function goalStart() { goalRankNow = 'A'; goalT0 = 0; lastHop = -1; landed = false; nextFw = 0; fireworks.length = 0; goalBits.length = 0; }
  // Effects for the goal run (drawn over the world, behind the result card).
  function drawGoal(g, t, s) {
    const H = GOAL_T, j1 = H.hops + H.jump, footY = s.footY;
    // a note or star at each hop take-off
    const hop = Math.floor(t / (H.hops / 2));
    if (t < H.hops && hop !== lastHop) { lastHop = hop; goalBits.push({ x: s.x, y: footY - 20, at: t, ch: hop ? '★' : '♪' }); }
    if (!landed && t >= j1) {   // banzai landing: a ring of stars
      landed = true;
      for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5; goalBits.push({ x: s.x, y: footY - 6, at: t, vx: Math.cos(a) * 160, vy: Math.sin(a) * 90 - 60, star: true }); }
    }
    if ((goalRankNow === 'S' || goalRankNow === 'A') && t >= j1 + H.land && t >= nextFw) {   // fireworks, one after another
      nextFw = (nextFw || t) + 0.32 + Math.random() * 0.2;
      const hue = Math.floor(Math.random() * 360), x = s.W * (0.15 + Math.random() * 0.7), y = s.DH * (0.12 + Math.random() * 0.3);
      fireworks.push({ x, y, at: t, hue, n: 26 });
    }
    g.save();
    // light from below while posing
    if (t > j1 + H.land) {
      const a = Math.min(1, (t - j1 - H.land) / 0.3);
      const gr = g.createRadialGradient(s.x, footY, 4, s.x, footY, s.B * 2.2);
      gr.addColorStop(0, `rgba(255,236,150,${0.55 * a})`); gr.addColorStop(1, 'rgba(255,236,150,0)');
      g.fillStyle = gr; g.fillRect(s.x - s.B * 2.2, footY - s.B * 2.2, s.B * 4.4, s.B * 2.6);
    }
    for (const f of fireworks) {
      const k = t - f.at; if (k > 1.2) continue;
      if (k < 0.08) { g.globalAlpha = 1; g.fillStyle = '#fff'; g.beginPath(); g.arc(f.x, f.y, 6 + k * 60, 0, TAU); g.fill(); }
      g.globalAlpha = Math.max(0, 1 - k / 1.2);
      for (let i = 0; i < f.n; i++) {   // each spark with a short tail
        const a = i * TAU / f.n, d = 95 * (1 - Math.exp(-k * 4)), d2 = 95 * (1 - Math.exp(-Math.max(0, k - 0.07) * 4));
        const x = f.x + Math.cos(a) * d, y = f.y + Math.sin(a) * d + 34 * k * k;
        g.strokeStyle = `hsl(${f.hue},95%,62%)`; g.lineWidth = 3;
        g.beginPath(); g.moveTo(f.x + Math.cos(a) * d2, f.y + Math.sin(a) * d2 + 34 * k * k); g.lineTo(x, y); g.stroke();
        g.fillStyle = i % 3 ? `hsl(${f.hue},100%,80%)` : '#ffffff'; g.fillRect(x - 2.5, y - 2.5, 5, 5);
      }
    }
    for (const b of goalBits) {
      const k = t - b.at; if (k > 0.9) continue;
      g.globalAlpha = 1 - k / 0.9; g.fillStyle = '#ffe27a';
      if (b.star) star(g, b.x + b.vx * k, b.y + b.vy * k + 200 * k * k, 6, k * 6);
      else { g.font = '900 18px "M PLUS 1p", sans-serif'; g.textAlign = 'center'; g.fillText(b.ch, b.x - 14 - k * 30, b.y - k * 40); g.textAlign = 'left'; }
    }
    g.restore();
    drawGoalCast(g, t, s);
    while (fireworks.length && t - fireworks[0].at > 1.3) fireworks.shift();
  }

  // ---------- Derpy face ----------
  // The face patch is measured from each front ("hands") art when first baked.
  const derpBakes = new Map();
  // Each Cosmii's own derpy face, drawn only inside its face outline:
  //  red    – curious: huge star-sparkle eyes, wide "wahh" mouth
  //  blue   – stylish, my-pace: smug half-lid eyes with lashes, a "3" kiss
  //  pink   – cat: squeezed >< eyes, ω mouth with a tongue tip
  //  green  – sleepy: one eye still asleep, the other wide open, drooling
  //  purple – mischief: spiral eyes, a jagged grin with a fang
  function derpArt(idx, frame) {
    const src = window.cosmiiCharacterMotion?.poses?.[idx];
    if (!src) return null;
    const key = idx + ':' + frame, hit = derpBakes.get(key);
    if (hit && hit.src === src) return hit.c;
    const S = src.width, c = document.createElement('canvas'); c.width = c.height = S;
    const g = c.getContext('2d'); g.drawImage(src, 0, 0);
    // Find the face in the art itself (skin-coloured pixels; percentiles so the
    // eyes and blush inside and stray highlights outside do not matter), and
    // take its own skin colour.
    const px = g.getImageData(0, 0, S, S).data, xs = [], ys = [], cr = [], cg = [], cb = [];
    for (let y = 0; y < S; y += 2) for (let x = 0; x < S; x += 2) {
      const i = (y * S + x) * 4, r = px[i], gg = px[i + 1], bl = px[i + 2];
      if (px[i + 3] > 200 && r > 225 && gg > 200 && bl > 170 && bl < 240 && r - bl > 12 && gg - bl > 8 && r - gg < 30) { xs.push(x); ys.push(y); cr.push(r); cg.push(gg); cb.push(bl); }
    }
    if (xs.length < 50) return null;
    const med = a => a.slice().sort((p, q) => p - q)[a.length >> 1];
    xs.sort((p, q) => p - q); ys.sort((p, q) => p - q);
    const pc = (a, q) => a[Math.floor(a.length * q)];
    const x0 = pc(xs, .015), x1 = pc(xs, .985), y0 = pc(ys, .015), y1 = pc(ys, .985);
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, rx = (x1 - x0) / 2, ry = (y1 - y0) / 2;
    const skin = `rgb(${med(cr)},${med(cg)},${med(cb)})`;
    g.save();
    // everything from here stays inside the face
    g.beginPath(); g.ellipse(cx, cy, rx * 0.97, ry * 0.95, 0, 0, TAU); g.clip();
    g.fillStyle = skin; g.fillRect(cx - rx, cy - ry, rx * 2, ry * 2);   // the old eyes and mouth go
    const ink = '#3a1a22', lw = Math.max(2, rx * 0.06);
    g.lineCap = 'round'; g.lineJoin = 'round';
    const blush = (a = .45) => { g.fillStyle = `rgba(255,130,150,${a})`; for (const sx of [-1, 1]) { g.beginPath(); g.ellipse(cx + sx * rx * 0.62, cy + ry * 0.3, rx * 0.16, ry * 0.11, 0, 0, TAU); g.fill(); } };
    const dot = (x, y, r, col) => { g.fillStyle = col; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); };
    const line = (pts, w = lw, col = ink) => { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); pts.forEach(([x, y], k) => k ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke(); };
    const starShape = (x, y, r, rot) => { g.beginPath(); for (let k = 0; k < 10; k++) { const a = rot + k * Math.PI / 5 - Math.PI / 2, rr = k % 2 ? r * 0.45 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.closePath(); };
    const ex = rx * 0.38, ey = cy - ry * 0.12, my = cy + ry * 0.4;
    if (idx === 0) {   // red: star-sparkle eyes, wide open mouth
      blush(.55);
      for (const sx of [-1, 1]) {
        dot(cx + sx * ex, ey, rx * 0.26, ink);
        g.fillStyle = '#ffe14a'; starShape(cx + sx * ex, ey, rx * (frame ? 0.2 : 0.17), frame ? 0.3 : 0); g.fill();
        dot(cx + sx * ex - rx * 0.08, ey - ry * 0.12, rx * 0.05, '#fff');
      }
      g.fillStyle = '#7a1f2e'; g.strokeStyle = ink; g.lineWidth = lw;
      g.beginPath(); g.ellipse(cx, my, rx * 0.26, ry * (frame ? 0.26 : 0.2), 0, 0, TAU); g.fill(); g.stroke();
      g.fillStyle = '#ff7f9a'; g.beginPath(); g.ellipse(cx, my + ry * 0.12, rx * 0.15, ry * 0.09, 0, 0, TAU); g.fill();
    } else if (idx === 1) {   // blue: smug half-lids, one brow up, kiss lips
      blush(.4);
      for (const sx of [-1, 1]) {
        const x = cx + sx * ex, y = ey + ry * 0.04;
        g.fillStyle = '#fff'; g.beginPath(); g.ellipse(x, y, rx * 0.2, ry * 0.15, 0, 0, Math.PI); g.fill();
        dot(x + rx * (frame ? 0.08 : -0.06), y + ry * 0.05, rx * 0.08, ink);
        line([[x - rx * 0.22, y], [x + rx * 0.22, y]], lw * 1.3);                                   // heavy lid
        line([[x + rx * 0.2, y], [x + rx * 0.3, y - ry * 0.08]], lw * 0.8);                         // lash
        const up = sx === (frame ? 1 : -1) ? ry * 0.12 : 0;                                          // one brow up, switching
        line([[x - rx * 0.18, y - ry * 0.22 - up], [x + rx * 0.16, y - ry * 0.28 - up]], lw * 0.9);
      }
      g.fillStyle = '#ff6f8f'; g.strokeStyle = ink; g.lineWidth = lw * 0.9;                         // "3" kiss
      const kx = cx + rx * (frame ? 0.08 : 0.02);
      g.beginPath(); g.arc(kx - rx * 0.05, my - ry * 0.06, rx * 0.08, -Math.PI / 2, Math.PI / 2); g.arc(kx - rx * 0.05, my + ry * 0.1, rx * 0.08, -Math.PI / 2, Math.PI / 2); g.fill(); g.stroke();
      if (frame) { g.fillStyle = '#ff6f8f'; g.font = `900 ${Math.round(rx * 0.3)}px sans-serif`; g.fillText('♥', cx + rx * 0.35, my - ry * 0.05); }
    } else if (idx === 2) {   // pink: >< eyes, ω mouth, tongue tip
      blush(.6);
      for (const sx of [-1, 1]) {
        const x = cx + sx * ex, y = ey, d = rx * 0.15;
        line(sx < 0 ? [[x - d, y - d], [x + d * 0.8, y], [x - d, y + d]] : [[x + d, y - d], [x - d * 0.8, y], [x + d, y + d]], lw * 1.2);
      }
      const w = rx * 0.14;
      line([[cx - w * 2, my - ry * 0.05], [cx - w, my + ry * 0.07], [cx, my - ry * 0.03], [cx + w, my + ry * 0.07], [cx + w * 2, my - ry * 0.05]], lw);
      g.fillStyle = '#ff7f9a'; g.strokeStyle = ink; g.lineWidth = lw * 0.8;
      g.beginPath(); g.ellipse(cx + (frame ? w * 0.9 : -w * 0.9), my + ry * 0.12, rx * 0.07, ry * 0.08, 0, 0, TAU); g.fill(); g.stroke();
      if (frame) { g.fillStyle = '#ff9ccf'; starShape(cx + rx * 0.62, cy - ry * 0.45, rx * 0.1, 0); g.fill(); }
    } else if (idx === 3) {   // green: one eye asleep, one wide open; drool
      blush(.35);
      const sleepy = frame ? 1 : -1;
      line([[cx + sleepy * ex - rx * 0.17, ey], [cx + sleepy * ex + rx * 0.17, ey]], lw * 1.2);         // still asleep
      const ox = cx - sleepy * ex;
      dot(ox, ey, rx * 0.25, ink); dot(ox, ey, rx * 0.21, '#fff');
      dot(ox + rx * 0.04 * -sleepy, ey + ry * 0.03, rx * 0.06, ink);                                  // a tiny shocked pupil
      g.fillStyle = '#7a1f2e'; g.strokeStyle = ink; g.lineWidth = lw;
      g.beginPath(); g.ellipse(cx + rx * 0.05, my, rx * 0.12, ry * 0.14, 0.2, 0, TAU); g.fill(); g.stroke();
      g.fillStyle = '#9fe6ff'; g.strokeStyle = 'rgba(58,26,34,.4)'; g.lineWidth = lw * 0.5;              // drool
      g.beginPath(); g.ellipse(cx + rx * 0.16, my + ry * (frame ? 0.3 : 0.24), rx * 0.05, ry * (frame ? 0.12 : 0.08), 0, 0, TAU); g.fill(); g.stroke();
    } else {   // purple: spiral eyes, jagged grin with a fang
      blush(.35);
      for (const sx of [-1, 1]) {
        const x = cx + sx * ex, y = ey; g.strokeStyle = ink; g.lineWidth = lw * 0.9; g.beginPath();
        for (let a = 0; a < Math.PI * 5; a += 0.25) { const r = rx * 0.025 * a * 0.85, aa = a * sx + (frame ? 1.5 : 0); g.lineTo(x + Math.cos(aa) * r, y + Math.sin(aa) * r); }
        g.stroke();
      }
      const w = rx * 0.4, pts = [];
      for (let k = 0; k <= 6; k++) pts.push([cx - w + k * w / 3, my + (k % 2 ? ry * 0.1 : -ry * 0.02) + (frame ? ry * 0.03 * Math.sin(k) : 0)]);
      g.fillStyle = '#7a1f2e'; g.beginPath(); g.moveTo(cx - w, my - ry * 0.06); g.quadraticCurveTo(cx, my + ry * 0.4, cx + w, my - ry * 0.06); g.closePath(); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.moveTo(cx + w * 0.3, my - ry * 0.02); g.lineTo(cx + w * 0.45, my + ry * 0.14); g.lineTo(cx + w * 0.6, my - ry * 0.03); g.fill();   // fang
      line([[cx - w, my - ry * 0.06], ...pts.slice(1, 6), [cx + w, my - ry * 0.06]], lw * 0.9);
      g.strokeStyle = ink; g.lineWidth = lw; g.beginPath(); g.moveTo(cx - w, my - ry * 0.06); g.quadraticCurveTo(cx, my + ry * 0.4, cx + w, my - ry * 0.06); g.stroke();
    }
    g.restore();
    derpBakes.set(key, { src, c }); return c;
  }

  // ---------- The other four Cosmii (S rank) and the background extras ----------
  const CAST_COLOR = ['#ff5f7a', '#4fc3ff', '#ff8fc8', '#8fdc5a', '#b07cff'];
  function drawCast(g, idx, x, foot, size, o) {
    const motion = window.cosmiiCharacterMotion, art = o.side ? motion?.runs?.[idx]?.[o.frame || 0] : (o.derp ? derpArt(idx, o.frame || 0) : motion?.poses?.[idx]);
    g.save(); g.translate(x + (o.dx || 0), foot - (o.lift || 0)); g.rotate(o.rot || 0); g.scale((o.flip ? -1 : 1) * (o.sx || 1), o.sy || 1);
    if (art) g.drawImage(art, -size / 2, -size, size, size);
    else { g.fillStyle = CAST_COLOR[idx]; g.beginPath(); g.arc(0, -size * 0.4, size * 0.35, 0, TAU); g.fill(); }
    g.restore();
  }
  function drawGoalCast(g, t, s) {
    const R = reactAt(), D = danceAt(), foot = s.footY, size = s.B * 1.35 * 1.25, gap = s.B * 1.75;
    if (t < R) return;
    g.save();
    if (goalRankNow === 'S') {
      // the other four run in from both sides and line up with you
      const others = [0, 1, 2, 3, 4].filter(i => i !== goalSkin), slots = [-2, -1, 1, 2];
      others.forEach((idx, n) => {
        const slot = slots[n], home = s.x + slot * gap, from = slot < 0 ? -s.B * 2 : s.W + s.B * 2;
        const arrive = R + 0.55 + n * 0.05, u = Math.min(1, Math.max(0, (t - R - n * 0.05) / (arrive - R - n * 0.05)));
        const x = mix(from, home, smooth(u));
        if (u < 1) { drawCast(g, idx, x, foot, size * 0.9, { side: true, frame: Math.floor(t * 12) % 4, flip: slot > 0 }); return; }
        const q = t - arrive, o = { lift: 10 * Math.abs(Math.sin(q * 9)) };
        if (t >= D) Object.assign(o, weirdDance(t - D, n * 0.37, idx), { derp: true, frame: Math.floor((t - D) / 0.21) % 2 });
        if (idx === GREEN) { const k = tripCurve(t); if (k > 0) { o.rot = mix(o.rot || 0, 1.45, k); o.lift = (o.lift || 0) * (1 - k); } }
        drawCast(g, idx, home, foot, size, o);
        if (idx === GREEN && t > tripAt() + 0.1) {   // "zukoh!"
          g.font = '900 15px "M PLUS 1p", sans-serif'; g.textAlign = 'center'; g.lineWidth = 4; g.strokeStyle = '#2a1650'; g.fillStyle = '#c5ff82';
          g.strokeText('ずこっ', home + s.B * 0.4, foot - size * 0.95); g.fillText('ずこっ', home + s.B * 0.4, foot - size * 0.95);
        }
      });
    } else if (goalRankNow === 'B' && t < D) {   // a small Cosmii wanders past behind, deadpan
      const idx = (goalSkin + 2) % 5, u = (t - R) / GOAL_T.react;
      g.globalAlpha = 0.85; drawCast(g, idx, mix(s.W + s.B, s.x + s.B * 3.5, u), foot - s.B * 0.1, size * 0.55, { side: true, frame: Math.floor(t * 6) % 4, flip: true });
    }
    g.restore();
  }
  // captions over the scene
  function caption(g, text, x, y, col, size, wob) {
    g.save(); g.translate(x, y); if (wob) g.rotate(wob);
    g.font = `900 ${size}px "M PLUS 1p", sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineJoin = 'round'; g.lineWidth = 5; g.strokeStyle = '#2a1650'; g.strokeText(text, 0, 0); g.fillStyle = col; g.fillText(text, 0, 0);
    g.restore();
  }
  // Captions: no words for the rank reaction (just the cold sweat on C); in the
  // weird dance, クネクネ pops up all around, wobbling. S: ずこっ over green.
  const KUNE = [[-0.16, 0.14, 21], [0.2, 0.2, 17], [-0.3, 0.32, 15], [0.33, 0.1, 19], [0.02, 0.05, 24], [-0.05, 0.4, 14], [0.42, 0.34, 16], [-0.42, 0.18, 18]];
  function drawGoalCaptions(g, t, s) {
    const R = reactAt(), D = danceAt();
    if (goalRankNow === 'C' && t >= R + 0.3 && t < D) {   // cold sweat
      const k = ((t - R) % 0.7) / 0.7;
      g.save(); g.globalAlpha = 1 - k; g.fillStyle = '#8fe8ff';
      g.beginPath(); g.ellipse(s.x + s.B * 0.55, s.footY - s.B * 1.35 + k * 18, 4, 6, 0, 0, TAU); g.fill(); g.restore();
    }
    if (goalRankNow === 'S' && goalSkin === GREEN && t > tripAt() + 0.1) caption(g, 'ずこっ', s.x + s.B * 0.4, s.footY - s.B * 2, '#c5ff82', 15, 0);
    if (t < D) return;
    const u = t - D, cols = ['#ffb3f0', '#8fe8ff', '#ffe27a', '#c5ff82'];
    KUNE.forEach(([fx, fy, size], i) => {
      const at = i * 0.17; if (u < at) return;
      const k = u - at, pop = k < 0.15 ? 0.5 + smooth(k / 0.15) * 0.5 : 1;
      const x = s.x + fx * s.W * 0.55 + 6 * Math.sin(t * 6 + i), y = s.footY - s.B * 1.9 - fy * s.DH + 5 * Math.sin(t * 13 + i * 2);
      g.save(); g.globalAlpha = Math.min(1, k / 0.1);
      g.translate(x, y); g.scale(pop, pop);
      caption(g, i % 3 === 2 ? 'クネ〜' : 'クネクネ', 0, 0, cols[i % 4], size, 0.18 * Math.sin(t * 7.5 + i));
      g.restore();
    });
  }

  function prewarm(W, DH, B, im) { edge(W, DH, '120,210,255'); aura(B); tinted(im, 'rgba(30,20,30,0.55)'); tinted(im, 'rgba(255,255,180,0.85)'); }
  function reset() { fx = null; trail.length = 0; tierShown = 0; flames.length = sparks.length = lines.length = beatRings.length = stars.length = 0; lastPos = null; lastRun = 0; }

  window.cosmiiFx = { goalPose, goalStart, goalRank, goalLength, drawGoal, drawGoalCaptions, derpArt, GOAL_T, deathKind, startDeath, drawDeath, drawStreak, prewarm, reset, active: () => !!fx, kind: () => fx?.kind || null };
})();
