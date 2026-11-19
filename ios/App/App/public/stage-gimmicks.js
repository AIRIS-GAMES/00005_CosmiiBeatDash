/* Stage gimmicks: per-world mechanics layered on the core runner.

   The player still only taps (jump) and taps in the air (orb). Every gimmick
   follows the beat and shows what it will do one beat ahead.

   - pad     (Rhythm Dash)      a jump pad before a wide row of spikes: just run onto
                                it (no tap) and it throws you over them, landing on
                                a beat; jumping over the pad lands in the spikes
   - jelly   (Rhythm Dash)      jellyfish swap low/high every beat: jump the low
                                ones, stay down under the high ones
   - cannon  (Cosmii Cannon)    ride a cannon; the barrel turns high/mid/low on
                                each beat; fire towards the safe tier (the
                                cannon's colour says which one)
   - ball    (ころがれ！Cosmii)  balls roll towards you one step per beat
   - stairs  (Cosmii Sudoku)    a staircase builds itself step by step on the beat;
                                hop up and down it, one step per beat (dots show
                                the step's height)
   - prize   (Cosmii Catch A)   the crane drops prizes; a shadow shows where one
                                lands a beat later; then jump it like any obstacle
   - arm     (Cosmii Catch B)   a crane arm hangs over a row of spikes; tap at the
                                top of the jump (or keep holding) to be carried
   - ring    (Cosmii Rescue)     a rescue ring floats over a hole in the floor (the
                                sky below): jump on the beat to pass cleanly
                                through it (IN! +100); off-beat jumps hit the rim
                                and bounce down into the sky
   - cake    (Cosmii Rescue)     cakes fly in fast: low ones are jumped, high ones
                                (a dashed line at head height) are stayed under
   - match   (Cosmii 3Match)     three "?" blocks float over the road; a jump on the
                                beat lands on one and switches it to its colour. All
                                three make a MATCH and open the door ahead; a block
                                missed (too early or late: you pass through it) leaves
                                the door shut, and running into it is out
   - flip    (every stage)       gravity-flip zones from the core chart; a gimmick
                                section that covers one moves it to a free stretch.
                                flip: n asks for at least n zones (early stages,
                                whose core chart has none)
   - mogu    (Mogu Mogu Panic)  a mouth chases you: each MISS brings it closer,
                                PERFECT/GREAT push it back, the third catch is out
   - dark    (Cosmii Arcade)    blackout: obstacles flash into view on the beat
   - route   (any world)         the road splits: a long-press jump lands on the
                                upper ledges (more coins), a tap stays below
   - lift    (any world)         platforms bob up and down with the rhythm over spikes
   - sabi    (every stage)       the loudest stretch of the song is the chorus
                                highlight: score and coins x2

   Charts stay deterministic: build() uses its own seeded rng, so a retry gets the
   same chart. Physics and judging live in index.html; this file adds obstacle
   rows to OBSTACLES and a few hooks (see the OBSTACLES comment there). */
(() => {
  'use strict';

  // ---------- Stage plan (1-based stage numbers) ----------
  // bgm: a track key from Asset/audio/tracks.js (prepared by
  // scripts/prepare-world-bgm.py, beat grids by scripts/generate-rhythm-beats.py).
  // Rhythm Dash stages keep their original songs; Arcade has no song yet.
  const WORLDS = {
    dash:   { name: 'Rhythm Dash',      bgm: null },
    cannon: { name: 'Cosmii Cannon',    bgm: 'Asset/world-bgm/cannon.mp3' },
    rescue: { name: 'Cosmii Rescue',    bgm: 'Asset/world-bgm/rescue.mp3' },
    roll:   { name: 'ころがれ！Cosmii',  bgm: 'Asset/world-bgm/roll.m4a' },
    sudoku: { name: 'Cosmii Sudoku',    bgm: 'Asset/world-bgm/sudoku.mp3' },
    catch:  { name: 'Cosmii Catch',     bgm: 'Asset/world-bgm/catch.mp3' },
    mogu:   { name: 'Mogu Mogu Panic',  bgm: 'Asset/world-bgm/mogu.mp3' },
    match:  { name: 'Cosmii 3Match',    bgm: 'Asset/world-bgm/match.mp3' },   // for the 3Match stages (not placed yet)
    arcade: { name: 'Cosmii Arcade',    bgm: null },
  };
  // title: the stage's name, one word.
  const PLAN = {
    1:  { world: 'dash',   title: 'スタートダッシュ' },
    2:  { world: 'dash',   title: 'ホップステップ',   g: { route: 2 }, hint: '長押しジャンプで上の道へ' },
    3:  { world: 'dash',   title: 'クラゲの夜',       g: { jelly: 0.8 } },
    4:  { world: 'dash',   title: 'ハイジャンプ',     g: { pad: 2, flip: 1 }, hint: 'ジャンプ台は跳ばずに乗ろう' },
    5:  { world: 'rescue', title: 'そらのレスキュー', g: { ring: 0.9 } },
    6:  { world: 'rescue', title: 'さかさまのそら',   g: { ring: 0.3, cake: 0.95, cakeHigh: true }, hint: '頭の高さのケーキはくぐろう' },
    7:  { world: 'cannon', title: 'ドッカン大砲',     g: { cannon: ['blue', 'gold'] } },
    8:  { world: 'cannon', title: '大砲リレー',       g: { cannon: [['blue', 'gold']] }, hint: '大砲から大砲へ！ 色の段で撃とう' },
    9:  { world: 'roll',   title: 'ころころコスミー', g: { ball: 0.9 } },
    10: { world: 'roll',   title: 'おおだまバウンド', g: { ball: 0.4, bigBall: 1 }, hint: '大きいコスミーはしっかり跳ぼう' },
    11: { world: 'sudoku', title: 'ドットの階段',     g: { stairs: 3 } },
    12: { world: 'sudoku', title: 'てっぺんへ',       g: { stairs: 3, stairsAt: [0.3, 0.55, 0.8], lift: 1, liftAt: [0.1] }, hint: '階段と上下する足場をリズムで' },
    13: { world: 'catch',  title: '月夜のキャッチ',   g: { prize: 0.9 } },
    14: { world: 'catch',  title: 'アームにつかまれ', g: { arm: 4, prize: 0.4 }, hint: 'アームをつかんでトゲを越えよう' },
    15: { world: 'mogu',   title: 'パクパク',         g: { mogu: true, route: 5 }, hint: 'コインで逃げろ・長押しで屋根の道へ' },
    16: { world: 'mogu',   title: 'もぐもぐパニック', g: { mogu: true, moguStart: 1, moguCreep: 0.14, cake: 0.7 }, hint: 'ケーキを跳び越え、コインで逃げ切れ' },
    17: { world: 'match',  title: 'ブロックマッチ',   g: { match: 6 } },
    18: { world: 'match',  title: 'トリプルマッチ',   g: { match: 8 } },
    19: { world: 'arcade', title: 'ブラックアウト',   g: { dark: 0.6, darkN: 5 } },
    20: { world: 'dash',   title: 'オーラス',         g: { cannon: ['gold'], cannonAt: [0.47], pad: 2, padAt: [0.07, 0.88], stairs: 2, stairsAt: [0.15, 0.6], match: 2, matchAt: [0.25, 0.7], arm: 2, armAt: [0.34, 0.78], ring: 0.35, ball: 0.35, jelly: 0.35, prize: 0.35, dark: 0.25, darkN: 3 }, hint: 'オーラス！ 全部のせ' },
  };

  const HINTS = {
    pad: 'ジャンプ台は跳ばずに乗ろう',
    jelly: '沈んだクラゲは跳ぶ・浮いたらくぐる',
    ring: '浮き輪の真ん中をくぐろう',
    cannon: '大砲と同じ色の段で撃とう',
    ball: 'コスミーが転がってきたら跳ぼう',
    stairs: '階段をリズムで登ろう',
    prize: '影の場所に景品が落ちる',
    arm: 'ジャンプの頂点でアームをつかもう',
    mogu: 'コインを取ってMOGUから逃げよう',
    match: '?ブロック3つで扉が開く',
    dark: '光った瞬間をよく見よう',
    route: '長押しジャンプで上の道へ',
    lift: '足場が下りたときに跳ぼう',
  };

  // Every stage gets the chorus highlight; PLAN adds the world and its gimmicks.
  for (let i = 0; i < NSTAGE; i++) STAGES[i].gimmick = { sabi: true };
  for (const [n, plan] of Object.entries(PLAN)) {
    const s = STAGES[+n - 1]; if (!s) continue;
    const w = WORLDS[plan.world];
    s.world = w.name; s.title = plan.title || '';
    if (w.bgm && window.AUDIO_TRACKS?.[w.bgm]) s.file = w.bgm;
    if (!plan.g) continue;
    s.gimmick = { sabi: true, ...plan.g };
    s.hint = plan.hint || HINTS[Object.keys(plan.g).find(k => HINTS[k])];
  }

  // ---------- Shared helpers ----------
  const CANNON_COLORS = { blue: { c: '#3a8bff', safe: 1, name: '青' }, red: { c: '#ff4f6a', safe: 0, name: '赤' }, gold: { c: '#ffc23a', safe: 2, name: '金' } };
  const TIER_TOP = [GROUND, GROUND - B * 2.2, GROUND - B * 4.3];   // ground, mid, high
  const AIM_ORDER = [2, 1, 0];                                      // barrel: high, mid, low
  const AIM_NAME = { 2: '上', 1: '中', 0: '下' };
  const ease = f => f <= 0 ? 0 : f >= 1 ? 1 : f * f * (3 - 2 * f);
  const xAt = time => player.x + B / 2 + (time - songPos) * SPEED;
  function periodOf(bts) {
    const d = [];
    for (let i = 1; i < bts.length; i++) { const v = bts[i].t - bts[i - 1].t; if (v > 0.25 && v < 1) d.push(v); }
    d.sort((a, b) => a - b);
    return d[Math.floor(d.length / 2)] || 0.5;
  }
  let run = { p: 0.5, dark: [], sections: [], g: {} };

  // ---------- Obstacle rows ----------
  // Jellyfish: bob between sunk (on the road) and floating (at jump height) on
  // the beat, and the hazard is where the jelly is. A sunk one (ob.low) is at
  // the bottom when the player reaches it: jump over it. A floating one is at
  // the top then, its tentacles hanging to jump height: stay down and run under.
  const JELLY_LOW = GROUND - B * 0.5, JELLY_HIGH = GROUND - B * 2.55;   // body centre
  // Like a real jellyfish, over two beats: it squeezes its bell and shoots up,
  // floats near the top, then opens wide and drifts slowly down. Low on its own
  // beat (jump it), high on the other (run under).
  // h: 0 = low .. 1 = high; mode: 'rise' | 'float' | 'sink' | 'rest'.
  function jellyPhase(ob, t) {
    const u = (t - ob.t) / ob.p + (ob.low ? 0 : 1), w = ((u % 2) + 2) % 2;
    const eo = f => 1 - (1 - f) * (1 - f), sm = f => f * f * (3 - 2 * f);
    if (w < 0.2) return { h: 0, mode: 'rest', k: w / 0.2 };
    if (w < 0.55) { const f = (w - 0.2) / 0.35; return { h: eo(f), mode: 'rise', k: f }; }
    if (w < 1.35) { const f = (w - 0.55) / 0.8; return { h: 1 - 0.04 * f, mode: 'float', k: f }; }
    const f = (w - 1.35) / 0.65; return { h: 0.96 * (1 - sm(f)), mode: 'sink', k: f };
  }
  const jellyY = (ob, t) => JELLY_LOW + (JELLY_HIGH - JELLY_LOW) * jellyPhase(ob, t).h;
  OBSTACLES.jelly = {
    free: false,
    parts(cx, gy, f, ob, d) {
      const y = jellyY(ob, ob.t - d), r = B * 0.45;
      // Body, and the tentacles under it (shorter while it sinks onto the road).
      const tent = Math.max(0, Math.min(B * 0.8, GROUND - (y + r) - 2));
      return { spikes: [], blocks: [], hazards: [{ x: cx - r * 0.8, y: y - r, w: r * 1.6, h: r * 1.6 + tent }], low: ob.low, y, tent };
    },
    draw(g, ob, parts) {
      const cx = parts.hazards[0].x + parts.hazards[0].w / 2, y = parts.y, r = B * 0.48;
      g.save();
      // Its lane: a faint guide of how far it bobs.
      g.globalAlpha = 0.3; g.strokeStyle = '#ff9df0'; g.setLineDash([3, 4]); g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(cx, JELLY_HIGH - r); g.lineTo(cx, GROUND - 2); g.stroke(); g.setLineDash([]);
      g.globalAlpha = 1;
      // Bell shape from the swim stroke: squeezed and tall going up, wide and
      // open drifting down; tentacles stream straight up-stroke, wave down-stroke.
      const ph = jellyPhase(ob, songPos);
      let sx = 1, sy = 1, wave = 0.5;
      if (ph.mode === 'rest') { const q = Math.sin(ph.k * Math.PI); sx = 1 + 0.12 * q; sy = 1 - 0.1 * q; }          // gathering
      else if (ph.mode === 'rise') { const q = 1 - ph.k; sx = 0.78 + 0.22 * ph.k; sy = 1.18 - 0.18 * ph.k; wave = 0.1 * q; }   // squeeze, shoot up
      else if (ph.mode === 'float') { const q = Math.sin(ph.k * Math.PI); sx = 1 + 0.06 * q; sy = 1 - 0.05 * q; wave = 0.6; }
      else { sx = 1.14; sy = 0.86; wave = 1; }                                                                   // open, drifting down
      const sw = Math.sin(songPos * 7 + ob.t * 3);
      g.strokeStyle = '#ffd0f6'; g.lineWidth = 2.5; g.lineCap = 'round';
      for (let i = -1.5; i <= 1.5; i += 1) {
        const x0 = cx + i * B * 0.17 * sx, len = r * 0.2 + parts.tent * (ph.mode === 'rise' ? 1.05 : 0.95), bend = (6 + 4 * Math.abs(i)) * wave;
        g.beginPath(); g.moveTo(x0, y + r * 0.2 * sy);
        g.bezierCurveTo(x0 + bend * sw, y + len * 0.35, x0 - bend * sw, y + len * 0.7, x0 + bend * 0.5 * sw + i * 3 * wave, y + len); g.stroke();
      }
      g.save(); g.translate(cx, y); g.scale(sx, sy);
      g.fillStyle = '#ff9df0e0'; g.strokeStyle = '#ffd0f6'; g.lineWidth = 2;
      g.beginPath(); g.arc(0, 0, r, Math.PI, 0); g.quadraticCurveTo(r, r * 0.35, 0, r * 0.3); g.quadraticCurveTo(-r, r * 0.35, -r, 0); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#ffffffaa'; g.beginPath(); g.ellipse(-r * 0.35, -r * 0.45, r * 0.22, r * 0.12, -0.4, 0, 6.283); g.fill();
      g.fillStyle = '#5a2a4a'; g.beginPath(); g.arc(-r * 0.25, -r * 0.1, 2.2, 0, 6.283); g.arc(r * 0.25, -r * 0.1, 2.2, 0, 6.283); g.fill();
      g.restore();
      g.restore();
    },
  };

  // Rolling ball: reaches the player exactly like a spike, but approaches in
  // beat-sized steps from further away. Steps never happen while it is near.
  const BALL_STEP = B * 0.9, BALL_MAX_STEPS = 4;
  const ballExtra = (ob, d) => {
    const u = (TAP_OFFSET - d) / ob.p, fl = Math.floor(u), st = fl + ease((u - fl) / 0.3);
    const u0 = TAP_OFFSET / ob.p, f0 = Math.floor(u0), s0 = f0 + ease((u0 - f0) / 0.3);
    return BALL_STEP * Math.max(-2, Math.min(BALL_MAX_STEPS, s0 - st));
  };
  // The rolling thing is a round Cosmii (the hood), turning as it rolls.
  // Big ones (stage 10) bounce forward on each step while still far away;
  // the last step before they reach you is a plain roll, on the ground.
  const BALL_COLORS = ['red', 'blue', 'pink', 'green', 'purple'];
  const ballLift = (ob, d) => {
    const u = (TAP_OFFSET - d) / ob.p, fl = Math.floor(u), q = (u - fl) / 0.3;
    const u0 = TAP_OFFSET / ob.p, f0 = Math.floor(u0), s0 = f0 + ease((u0 - f0) / 0.3);
    const left = s0 - fl;   // steps still to go after this one
    if (q <= 0 || q >= 1 || left <= 1.5 || left > BALL_MAX_STEPS + 1) return 0;
    return Math.sin(q * Math.PI);
  };
  // The heads drawn for ころがれ！Cosmii (Asset/world/roll/<colour>.png).
  const ROLL_ART = {};
  for (const c of BALL_COLORS) { const im = new Image(); im.src = `Asset/world/roll/${c}.png`; ROLL_ART[c] = im; }
  function drawRollCosmii(g, ob, cx, d, lift) {
    const cy = GROUND - d / 2 - lift, ang = -(cx / (d / 2)) % 6.283;
    g.save();
    g.fillStyle = 'rgba(40,20,60,.22)'; g.beginPath(); g.ellipse(cx, GROUND - 2, d * 0.42 * (1 - lift / (B * 4)), d * 0.1, 0, 0, 6.283); g.fill();
    // "Don't touch": a red glow and a ring of red spikes that turns with it.
    g.translate(cx, cy);
    g.fillStyle = 'rgba(255,60,90,.22)'; g.beginPath(); g.arc(0, 0, d * 0.62, 0, 6.283); g.fill();
    g.save(); g.rotate(ang);
    g.fillStyle = '#ff4d6d'; g.strokeStyle = '#3a1838'; g.lineWidth = 2; g.lineJoin = 'round';
    const n = 10, r0 = d * 0.42, r1 = d * 0.6;
    g.beginPath();
    for (let k = 0; k < n; k++) {
      const a = k * 6.283 / n, h = 6.283 / n * 0.32;
      g.moveTo(Math.cos(a - h) * r0, Math.sin(a - h) * r0); g.lineTo(Math.cos(a) * r1, Math.sin(a) * r1); g.lineTo(Math.cos(a + h) * r0, Math.sin(a + h) * r0);
    }
    g.fill(); g.stroke();
    // The head, rolling (never in the player's own colour: the player is a Cosmii too).
    let c = ob.c || 'blue'; const own = BALL_COLORS[typeof skinIdx === 'number' ? skinIdx : 0];
    if (c === own) c = BALL_COLORS[(BALL_COLORS.indexOf(c) + 2) % BALL_COLORS.length];
    const im = ROLL_ART[c];
    if (im?.naturalWidth) g.drawImage(im, -d * 0.55, -d * 0.55, d * 1.1, d * 1.1);
    else if (window.worldSkins?.head) window.worldSkins.head(g, c, 0, 0, d);
    g.restore();
    // A red "!" while it is on its way.
    const ahead = ob.t - songPos;
    if (ahead > 0.15 && ahead < 1.8) {
      const sy = -d * 0.62 - 20 - Math.abs(Math.sin(((songPos % run.p) / run.p) * Math.PI)) * 4;
      g.translate(0, sy); if (ob.mir) g.scale(1, -1);   // keep the sign upright on the ceiling
      g.fillStyle = '#ff3355'; g.strokeStyle = '#fff'; g.lineWidth = 2.5;
      g.beginPath(); g.arc(0, 0, 11, 0, 6.283); g.fill(); g.stroke();
      g.fillStyle = '#fff'; g.font = '900 15px "Exo 2", sans-serif'; g.textAlign = 'center'; g.fillText('!', 0, 5.5);
    }
    g.restore();
  }
  OBSTACLES.ball = {
    offset: (ob, d) => d * SPEED + ballExtra(ob, d),
    parts(cx, gy, f, ob, d) {
      return { spikes: [], blocks: [], hazards: [{ x: cx - B * 0.3, y: GROUND - B * 0.85, w: B * 0.6, h: B * 0.85 }], cx };
    },
    draw(g, ob, parts) { drawRollCosmii(g, ob, parts.cx, B * 1.2, 0); },
  };
  OBSTACLES.bigball = {
    offset: (ob, d) => d * SPEED + ballExtra(ob, d),
    parts(cx, gy, f, ob, d) {
      return { spikes: [], blocks: [], hazards: [{ x: cx - B * 0.45, y: GROUND - B * 1.3, w: B * 0.9, h: B * 1.3 }], cx, d };
    },
    draw(g, ob, parts) { drawRollCosmii(g, ob, parts.cx, B * 1.6, ballLift(ob, parts.d ?? 0) * B * 1.6); },
  };

  // Cannon: the cannon itself (until it is boarded) and the three tiers.
  OBSTACLES.cannon = {
    free: true,
    parts: () => ({ spikes: [], blocks: [] }),
    draw(g, ob) {
      if (rideState && rideState.sec === ob.sec) return;
      const x = xAt(ob.t), gy = ob.y || GROUND, col = CANNON_COLORS[ob.color].c;
      if (!usedCannons.has(ob.sec)) {
        // "Get in here": a glow on the floor and an IN tag bouncing on the beat.
        const ph = (songPos % run.p) / run.p, bob = Math.abs(Math.sin(ph * Math.PI)) * 6;
        g.save();
        g.fillStyle = col + '44'; g.beginPath(); g.ellipse(x, gy - 2, B * 0.95, B * 0.28, 0, 0, 6.283); g.fill();
        const ty = gy - B * 2.15 - bob;
        g.fillStyle = '#ffffff'; g.strokeStyle = col; g.lineWidth = 3;
        g.beginPath(); g.roundRect(x - 24, ty - 15, 48, 24, 12); g.fill(); g.stroke();
        g.fillStyle = col; g.font = '900 15px "Exo 2", "M PLUS 1p", sans-serif'; g.textAlign = 'center'; g.fillText('IN', x, ty + 3);
        g.beginPath(); g.moveTo(x - 8, ty + 13); g.lineTo(x + 8, ty + 13); g.lineTo(x, ty + 22); g.closePath(); g.fill();
        g.textAlign = 'left'; g.restore();
      }
      drawCannon(g, x, gy, col, -0.65);
    },
  };
  // A spike on a cannon rail (jumped on the beat like any spike).
  OBSTACLES.railspike = {
    nearMiss: true,
    parts: (cx, gy, f, ob) => ({ spikes: [{ x: cx - B / 2, y: TIER_TOP[ob.lvl] - B, w: B, h: B, f: false }], blocks: [] }),
  };
  OBSTACLES.tier = {
    free: true,
    parts(cx, gy, f, ob) {
      const x0 = xAt(ob.t - ob.span), x1 = xAt(ob.t + ob.span);
      if (ob.lvl === 0) return ob.safe ? { spikes: [], blocks: [] } : { spikes: [], blocks: [], pits: [{ x: x0, w: xAt(ob.t + ob.span - 0.3) - x0 }] };
      // Only the safe tier is there; a shot to another height falls into the hole below.
      if (!ob.safe) return { spikes: [], blocks: [] };
      return { spikes: [], blocks: [{ x: x0, y: TIER_TOP[ob.lvl], w: x1 - x0, h: 12, f: false }] };
    },
    draw(g, ob, parts, hue) {
      const x0 = xAt(ob.t - ob.span), x1 = xAt(ob.t + ob.span);
      const col = CANNON_COLORS[ob.color].c;
      if (ob.lvl === 0) {
        if (ob.safe) return;
        const pe = xAt(ob.t + ob.span - 0.3);
        g.fillStyle = '#2e2456'; g.fillRect(x0, GROUND - 1, pe - x0, DH - GROUND + 1);
        g.fillStyle = '#ffffff88'; for (let x = x0 + 20; x < pe; x += 46) g.fillRect(x, GROUND + 18 + (x % 3) * 9, 2, 2);
        g.strokeStyle = '#ff8fc088'; g.lineWidth = 2; g.setLineDash([6, 6]);
        g.beginPath(); g.moveTo(x0, GROUND + 6); g.lineTo(pe, GROUND + 6); g.stroke(); g.setLineDash([]);
        return;
      }
      if (!ob.safe) return;
      const top = TIER_TOP[ob.lvl];
      g.fillStyle = ob.safe ? col : '#b9add8'; g.beginPath(); g.roundRect(x0, top, x1 - x0, 12, 6); g.fill();
      g.fillStyle = '#ffffff66'; g.fillRect(x0 + 6, top + 2, x1 - x0 - 12, 3);
      g.strokeStyle = '#4a2a3a'; g.lineWidth = 2.5; g.beginPath(); g.roundRect(x0, top, x1 - x0, 12, 6); g.stroke();

    },
  };

  // Jump pad: a plate on the road, safe to touch (cyan glow, arrows flowing up).
  // Running onto it throws the player over the spikes after it.
  OBSTACLES.pad = {
    free: true,
    parts: (cx) => ({ spikes: [], blocks: [], cx }),
    draw(g, ob, parts) {
      const cx = parts.cx, w = B * 1.5, used = ob.usedAt !== undefined, squash = used ? Math.max(0, 1 - (songPos - ob.usedAt) / 0.2) : 0;
      g.save();
      // Arrows flowing up: "this throws you up", no words.
      if (!used || songPos - ob.usedAt < 0.4) {
        g.save(); g.beginPath(); g.rect(cx - w / 2, GROUND - B * 3, w, B * 3); g.clip();
        for (let k = 0; k < 4; k++) {
          const f = ((songPos * 1.6 + k / 4) % 1), y = GROUND - 10 - f * B * 2.8;
          g.globalAlpha = 0.85 * Math.sin(f * Math.PI);
          g.strokeStyle = '#5fe8ff'; g.lineWidth = 4; g.lineCap = 'round'; g.lineJoin = 'round';
          g.beginPath(); g.moveTo(cx - 11, y + 8); g.lineTo(cx, y - 2); g.lineTo(cx + 11, y + 8); g.stroke();
        }
        g.restore();
      }
      // The plate: a cyan glowing frame around a spring top.
      const top = GROUND - 9 + squash * 4;
      g.globalAlpha = 1;
      g.fillStyle = '#5fe8ff33'; g.beginPath(); g.roundRect(cx - w / 2 - 6, top - 6, w + 12, GROUND - top + 8, 10); g.fill();
      g.fillStyle = '#e9fbff'; g.beginPath(); g.roundRect(cx - w / 2, top, w, GROUND - top + 2, 6); g.fill();
      g.strokeStyle = '#5fe8ff'; g.lineWidth = 3; g.stroke();
      g.strokeStyle = '#2aa6c8'; g.lineWidth = 2;
      for (let x = cx - w / 2 + 8; x < cx + w / 2 - 4; x += 9) { g.beginPath(); g.moveTo(x, top + 3); g.lineTo(x + 4, GROUND - 1); g.stroke(); }
      g.restore();
    },
  };

  // Notes for jumps that have no obstacle of their own (stairs, arm).
  OBSTACLES.step = { free: false, parts: () => ({ spikes: [], blocks: [] }), draw() {} };

  // Stairs: long steps of 1-3 levels. Each rises out of the floor on its beat.
  const STEP_H = B * 0.8;
  OBSTACLES.stair = {
    free: true,
    parts(cx, gy, f, ob) {
      const x0 = xAt(ob.from), x1 = xAt(ob.to), h = ob.lvl * STEP_H;
      return { spikes: [], blocks: [{ x: x0, y: GROUND - h, w: x1 - x0, h, f: false }] };
    },
    draw(g, ob, parts) {
      const bl = parts.blocks[0], rise = ease((songPos - ob.appear) / 0.18);
      if (rise <= 0) return;
      const h = bl.h * rise, y = GROUND - h;
      g.fillStyle = ['#2ec8bb', '#2f4bb8', '#e04436'][ob.lvl - 1]; g.beginPath(); g.roundRect(bl.x, y, bl.w, h, 8); g.fill();
      g.fillStyle = '#ffffff33'; g.beginPath(); g.roundRect(bl.x + 4, y + 4, bl.w - 8, Math.min(10, h * 0.3), 4); g.fill();
      g.strokeStyle = '#4a2a3a'; g.lineWidth = 2.5; g.beginPath(); g.roundRect(bl.x, y, bl.w, h, 8); g.stroke();
      g.fillStyle = '#ffffff';
      for (let k = 0; k < ob.lvl; k++) { g.beginPath(); g.arc(bl.x + bl.w / 2 + (k - (ob.lvl - 1) / 2) * 12, y + 11, 4, 0, 6.283); g.fill(); }
    },
  };

  // Catch A: a prize the crane drops. It lands one beat before the player
  // reaches it (so it is on the floor well ahead), with a shadow a beat earlier.
  OBSTACLES.prize = {
    parts(cx) {
      return { spikes: [], blocks: [], hazards: [{ x: cx - B * 0.3, y: GROUND - B * 0.8, w: B * 0.6, h: B * 0.8 }], cx };
    },
    draw(g, ob, parts) {
      const cx = parts.cx, land = ob.t - TAP_OFFSET - ob.p, drop = 0.35;
      const k = ease((songPos - (land - drop)) / drop), y = 26 + (GROUND - B * 0.45 - 26) * k;
      if (songPos < land) {
        const near = Math.max(0, Math.min(1, 1 - (land - songPos) / (ob.p * 1.5)));
        g.fillStyle = `rgba(255,157,240,${0.15 + 0.55 * near})`;
        g.beginPath(); g.ellipse(cx, GROUND + 2, B * 0.55 * (0.5 + 0.5 * near), 5, 0, 0, 6.283); g.fill();
      }
      g.strokeStyle = '#c7d2e8'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(cx, 18); g.lineTo(cx, songPos < land ? y - B * 0.45 : 26); g.stroke();
      g.fillStyle = '#7df'; g.beginPath(); g.arc(cx, y, B * 0.45, 0, 6.283); g.fill();
      g.fillStyle = '#ff9df0'; g.beginPath(); g.arc(cx, y, B * 0.45, Math.PI, 0); g.fill();
      g.strokeStyle = '#4a2a3a'; g.lineWidth = 2.5; g.beginPath(); g.arc(cx, y, B * 0.45, 0, 6.283); g.stroke();
      g.beginPath(); g.moveTo(cx - B * 0.45, y); g.lineTo(cx + B * 0.45, y); g.stroke();
      g.fillStyle = '#ffffffaa'; g.beginPath(); g.arc(cx - 6, y - 7, 4, 0, 6.283); g.fill();
      g.fillStyle = '#ffd94a'; g.beginPath();
      for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rad = i % 2 ? 2.6 : 5.5; g.lineTo(cx + 4 + Math.cos(a) * rad, y + 8 + Math.sin(a) * rad); }
      g.closePath(); g.fill();
    },
  };

  // Catch B: the arm, and the spikes it carries you over.
  OBSTACLES.arm = {
    free: true,
    parts: () => ({ spikes: [], blocks: [] }),
    draw(g, ob) {
      if (carry && carry.ob === ob) return;
      const x = xAt(ob.t), y = ob.y;
      g.strokeStyle = '#c7d2e8'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, 18); g.lineTo(x, y - B * 0.7); g.stroke();
      drawArm(g, x, y, false);
      if (!ob.used) { g.strokeStyle = '#ffb14a'; g.lineWidth = 3; g.beginPath(); g.arc(x, y, B * 0.6, 0, 6.283); g.stroke(); }
    },
  };
  OBSTACLES.spikebed = {
    free: true,
    parts(cx, gy, f, ob) {
      const x0 = xAt(ob.from), x1 = xAt(ob.to);
      return { spikes: [], blocks: [], hazards: [{ x: x0, y: GROUND - B * 0.6, w: x1 - x0, h: B * 0.6 }], x0, x1 };
    },
    draw(g, ob, parts, hue) {
      const first = Math.max(parts.x0, -B * 2), last = Math.min(parts.x1 - B, W + B);
      for (let x = parts.x0 + Math.max(0, Math.ceil((first - parts.x0) / B)) * B; x <= last; x += B) drawSpike({ x, y: GROUND - B, w: B, h: B, f: false }, hue);
    },
  };
  // Route split: one-way ledges (jump up through them, land from above).
  const LEDGE_TOP = GROUND - B * 2.4;
  OBSTACLES.ledge = {
    free: true,
    parts(cx, gy, f, ob) {
      const x0 = xAt(ob.from), x1 = xAt(ob.to);
      return { spikes: [], blocks: [{ x: x0, y: LEDGE_TOP, w: x1 - x0, h: 10, f: false, oneWay: true }] };
    },
    draw(g, ob, parts) {
      const bl = parts.blocks[0];
      g.fillStyle = '#4ee6ffcc'; g.fillRect(bl.x, bl.y, bl.w, bl.h);
      g.strokeStyle = '#e9fbff'; g.lineWidth = 1.5; g.strokeRect(bl.x, bl.y, bl.w, bl.h);
      g.strokeStyle = '#4ee6ff55'; g.setLineDash([3, 5]);
      for (let x = bl.x + 12; x < bl.x + bl.w - 6; x += 24) { g.beginPath(); g.moveTo(x, bl.y + bl.h); g.lineTo(x, bl.y + bl.h + 14); g.stroke(); }
      g.setLineDash([]);
      if (ob.first) {
        g.fillStyle = '#e9fbff'; g.font = '700 11px "M PLUS 1p", sans-serif'; g.textAlign = 'left';
        g.fillText('↑ 長押しで上の道', bl.x, bl.y - 8);
      }
    },
  };
  // Lift: a platform bobbing on the beat, low at its jump-off beats.
  const LIFT_LOW = GROUND - B * 0.9, LIFT_AMP = B * 0.6;
  const liftTop = (ob, t) => LIFT_LOW - LIFT_AMP * (1 - Math.cos(2 * Math.PI * (t - ob.anchor) / ob.period)) / 2;
  OBSTACLES.lift = {
    free: true,
    parts(cx, gy, f, ob) {
      const x0 = xAt(ob.from), x1 = xAt(ob.to), y = liftTop(ob, songPos);
      return { spikes: [], blocks: [{ x: x0, y, w: x1 - x0, h: 12, f: false }] };
    },
    draw(g, ob, parts) {
      const bl = parts.blocks[0];
      g.strokeStyle = '#ffffff33'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(bl.x + bl.w / 2, bl.y + bl.h); g.lineTo(bl.x + bl.w / 2, GROUND); g.stroke();
      g.fillStyle = '#ffb14a'; g.fillRect(bl.x, bl.y, bl.w, bl.h);
      g.strokeStyle = '#fff3d6'; g.lineWidth = 1.5; g.strokeRect(bl.x, bl.y, bl.w, bl.h);
    },
  };

  // Rescue: a ring over a hole that shows the sky. The hole is as wide as a jump
  // tapped within GREAT allows (early taps land in it); the lower rim catches
  // late taps. The upper rim is out of reach of an ordinary (even held) jump.
  // Hole edges in seconds from the ring: a late GREAT take-off is still before it,
  // an early jump (airtime 0.55-0.67s) of about 0.15-0.2s lands inside it.
  const RING_HOLE = [0.11, 0.15], RING_RIM_W = B * 0.35;
  const RING_TOP = GROUND - B * 4.7, RING_LOW = GROUND - B * 1.28, RING_RIM = 10;
  const RING_CY = (RING_TOP + RING_LOW) / 2, RING_RY = (RING_LOW - RING_TOP) / 2 + RING_RIM / 2;
  const ringRims = cx => [
    { x: cx - RING_RIM_W / 2, y: RING_TOP - RING_RIM, w: RING_RIM_W, h: RING_RIM },
    { x: cx - RING_RIM_W / 2, y: RING_LOW, w: RING_RIM_W, h: RING_RIM },
  ];
  // The HOME ring from Cosmii Rescue: an oval float in pink, cream and green
  // with stars, outlined like the Cosmii stickers. Baked once per scale; the
  // lower arc is drawn again over the player so it looks like passing through.
  // Asset/worlds/rescue/home-ring.png, if present, replaces the drawing.
  const RING_T = 16, RING_ORY = RING_RY + RING_T / 2, RING_ORX = RING_ORY * 0.62;
  const ringImg = new Image(); ringImg.src = 'Asset/worlds/rescue/home-ring.png';
  let ringBake = null;
  function bakeRing() {
    const sc = typeof SC === 'number' && SC > 0 ? SC : 1;
    if (ringBake && ringBake.sc === sc && ringBake.img === !!ringImg.naturalWidth) return ringBake;
    const w = RING_ORX * 2 + 8, h = RING_ORY * 2 + 8, cx = w / 2, cy = h / 2;
    const make = front => {
      const c = document.createElement('canvas'); c.width = Math.ceil(w * sc); c.height = Math.ceil(h * sc);
      const g = c.getContext('2d'); g.scale(sc, sc);
      if (front) { g.beginPath(); g.rect(0, cy + RING_ORY * 0.55, w, h); g.clip(); }
      if (ringImg.naturalWidth) { g.drawImage(ringImg, 4, 4, w - 8, h - 8); return c; }
      const orx = RING_ORX, ory = RING_ORY, irx = orx - RING_T, iry = ory - RING_T;
      const seg = (a0, a1) => { g.beginPath(); g.ellipse(cx, cy, orx, ory, 0, a0, a1); g.ellipse(cx, cy, irx, iry, 0, a1, a0, true); g.closePath(); };
      const cols = ['#ff8fb8', '#fff4e6', '#ff8fb8', '#a8e07a', '#fff4e6', '#ff8fb8', '#a8e07a', '#fff4e6', '#ff8fb8', '#a8e07a'];
      const N = cols.length, st = Math.PI * 2 / N, base = -Math.PI / 2 - st / 2;
      for (let k = 0; k < N; k++) {
        seg(base + k * st, base + (k + 1) * st); g.fillStyle = cols[k]; g.fill();
        g.strokeStyle = 'rgba(90,48,64,.35)'; g.lineWidth = 1.2; g.stroke();
        if (k % 2 === 1 || cols[k] === '#a8e07a') {
          const a = base + (k + 0.5) * st, mx = cx + Math.cos(a) * (orx - RING_T / 2), my = cy + Math.sin(a) * (ory - RING_T / 2);
          g.fillStyle = k % 3 === 1 ? '#6fb8ff' : '#ffd94a'; g.beginPath();
          for (let i = 0; i < 10; i++) { const b = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 2.4 : 5.2; g.lineTo(mx + Math.cos(b) * r, my + Math.sin(b) * r); }
          g.closePath(); g.fill();
        }
      }
      g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 3; g.lineCap = 'round';
      g.beginPath(); g.ellipse(cx, cy, orx - 5, ory - 5, 0, Math.PI * 1.08, Math.PI * 1.4); g.stroke(); g.lineCap = 'butt';
      g.strokeStyle = '#5a3040'; g.lineWidth = 2.5;
      g.beginPath(); g.ellipse(cx, cy, orx, ory, 0, 0, 7); g.stroke();
      g.beginPath(); g.ellipse(cx, cy, irx, iry, 0, 0, 7); g.stroke();
      return c;
    };
    ringBake = { sc, img: !!ringImg.naturalWidth, w, h, back: make(false), front: make(true) };
    return ringBake;
  }
  function drawHomeRing(g, cx, front, lit) {
    const r = bakeRing();
    g.drawImage(front ? r.front : r.back, cx - r.w / 2, RING_CY - r.h / 2, r.w, r.h);
    if (lit && !front) {
      g.strokeStyle = '#ffd94a'; g.lineWidth = 4;
      g.beginPath(); g.ellipse(cx, RING_CY, RING_ORX + 5, RING_ORY + 5, 0, 0, 7); g.stroke();
    }
  }
  OBSTACLES.ring = {
    parts(cx) {
      // The hole is not a core pit: ringStep makes the player fall into it.
      const a = RING_HOLE[0] * SPEED, b = RING_HOLE[1] * SPEED;
      return { spikes: [], blocks: [], hole: { x: cx - a, w: a + b }, cx };
    },
    draw(g, ob, parts) {
      const pit = parts.hole, x0 = pit.x - B * 0.15, x1 = pit.x + pit.w + B * 0.15;
      const sky = g.createLinearGradient(0, GROUND, 0, DH);
      sky.addColorStop(0, '#bfeaff'); sky.addColorStop(1, '#5fb8f0');
      g.fillStyle = sky; g.fillRect(x0, GROUND - 1, x1 - x0, DH - GROUND + 1);
      g.fillStyle = '#ffffffd0';
      const cl = x0 + ((ob.t * 37) % 1) * (x1 - x0 - 30) + 10;
      g.beginPath(); g.arc(cl, GROUND + 30, 8, 0, 6.283); g.arc(cl + 10, GROUND + 26, 10, 0, 6.283); g.arc(cl + 21, GROUND + 31, 7, 0, 6.283); g.fill();
      g.strokeStyle = '#e9fbff'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(x0, GROUND); g.lineTo(x0, DH); g.moveTo(x1, GROUND); g.lineTo(x1, DH); g.stroke();
      drawHomeRing(g, parts.cx, false, ob.inAt !== undefined && songPos - ob.inAt < 0.5);
      // Jump guide: the PERFECT jump's path, from the floor mark through the
      // middle of the ring (with the jump marks setting; not in blackouts).
      const dt = ob.t - songPos;
      if (window.jumpMarks && ob.inAt === undefined && dt > -0.2 && dt < 1.4 && inDark() < 0.05) {
        const x0 = xAt(ob.t - TAP_OFFSET), span = JUMP_T * SPEED, near = Math.max(0, Math.min(1, (1.4 - dt) / 0.6));
        g.save(); g.globalAlpha = 0.75 * near; g.strokeStyle = '#ffd94a'; g.lineWidth = 2.5; g.setLineDash([5, 7]); g.lineCap = 'round';
        g.beginPath();
        for (let i = 0; i <= 24; i++) { const u = i / 24, x = x0 + u * span, y = GROUND - B / 2 - JUMP_H * 4 * u * (1 - u); i ? g.lineTo(x, y) : g.moveTo(x, y); }
        g.stroke(); g.setLineDash([]);
        const pulse = 4 + Math.abs(Math.sin(songPos * 6)) * 3;
        g.fillStyle = '#ffd94a'; g.beginPath();
        for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, r = i % 2 ? pulse * 0.4 : pulse * 1.6; g.lineTo(parts.cx + Math.cos(a) * r, RING_CY + Math.sin(a) * r); }
        g.closePath(); g.fill(); g.restore();
      }
    },
    drawFront(g, ob) { drawHomeRing(g, xAt(ob.t), true, false); },
  };

  // Rescue: cakes thrown at the player, flying faster than the scroll. A low cake
  // is jumped like a spike; a high one (free note) passes over a player who stays down.
  const CAKE_K = 1.7;
  OBSTACLES.cake = {
    offset: (ob, d) => d * SPEED * CAKE_K,
    parts(cx, gy, f, ob) {
      const hz = ob.high ? { x: cx - B * 0.35, y: GROUND - B * 2.9, w: B * 0.7, h: B * 1.3 }
                         : { x: cx - B * 0.3, y: GROUND - B * 0.75, w: B * 0.6, h: B * 0.6 };
      return { spikes: [], blocks: [], hazards: [hz], cx, cy: hz.y + hz.h / 2 };
    },
    draw(g, ob, parts) {
      const cx = parts.cx, cy = parts.cy, d = ob.t - songPos;
      // Its flight line, a little ahead of it: shows the height it comes at.
      if (d > -0.2 && d < 1.6) {
        g.save(); g.globalAlpha = Math.min(1, (1.6 - d) / 0.5) * 0.7;
        g.strokeStyle = '#ffd0a0'; g.lineWidth = 2; g.setLineDash([6, 6]);
        g.beginPath(); g.moveTo(Math.min(cx, W + 20), cy); g.lineTo(player.x - B, cy); g.stroke(); g.restore();
      }
      // Off screen to the right: a marker at the edge where it will come in.
      if (cx > W + B * 0.5) {
        if (cx < W * 1.6) { g.fillStyle = '#ffb14a'; g.beginPath(); g.moveTo(W - 6, cy); g.lineTo(W - 20, cy - 9); g.lineTo(W - 20, cy + 9); g.closePath(); g.fill(); }
        return;
      }
      const s = ob.high ? 1.15 : 1, w = B * 0.8 * s, h = B * 0.55 * s, x = cx - w / 2, y = cy - h / 2;
      g.strokeStyle = '#ffffff66'; g.lineWidth = 2;
      for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(x + w + 6, y + 4 + k * h / 3); g.lineTo(x + w + 22 + k * 4, y + 4 + k * h / 3); g.stroke(); }
      g.fillStyle = '#f7d9a8'; g.fillRect(x, y + h * 0.35, w, h * 0.65);
      g.fillStyle = '#ffffff'; g.fillRect(x, y + h * 0.15, w, h * 0.25);
      g.fillStyle = '#ff9db5'; g.fillRect(x, y + h * 0.6, w, h * 0.1);
      g.strokeStyle = '#5a3040'; g.lineWidth = 2; g.strokeRect(x, y + h * 0.15, w, h * 0.85);
      g.fillStyle = '#e8364a'; g.beginPath(); g.arc(cx, y + h * 0.08, h * 0.17, 0, 6.283); g.fill();
    },
  };

  // MOGU MOGU's green Cosmii seen from the side, facing right, in the cast art's
  // style (colours measured from cast-neon/green.png): lime body shading to deep
  // green, white gloss, cyan rim at the back and magenta at the front inside a
  // thick dark-purple outline, cream face with a brown edge, closed eyes, blush,
  // a yellow star and the sprout. The body is baked once per size and scale;
  // the feet, the reaching arm and the mouth move every frame.
  const MG = { out: '#370730', rimB: '#02e8ff', rimF: '#f72fcd', hi: '#c6fb3c', mid: '#98e814', lo: '#56aa02',
    face: '#fce9d4', faceLine: '#5c1f00', eye: '#471601', blush: '#fcb1c4', star: '#fdd602', starDeep: '#fdc204', starLine: '#5b2d11' };
  let moguBake = null;
  function bakeMoguBody(R) {
    const sc = typeof SC === 'number' && SC > 0 ? SC : 1;
    if (moguBake && moguBake.R === R && moguBake.sc === sc) return moguBake;
    const S = R * 3.4, c = document.createElement('canvas');
    c.width = Math.ceil(S * sc); c.height = Math.ceil(S * sc);
    const g = c.getContext('2d'); g.scale(sc, sc); g.translate(S / 2, S / 2 + R * 0.25);
    const lw = R * 0.075;
    const glossy = (fill) => { const gr = g.createRadialGradient(-R * 0.35, -R * 0.45, R * 0.1, 0, 0, R * 1.1); gr.addColorStop(0, MG.hi); gr.addColorStop(0.55, MG.mid); gr.addColorStop(1, MG.lo); return gr; };
    // Sprout: stem with an outline, two glossy leaves.
    g.lineCap = 'round';
    g.strokeStyle = MG.out; g.lineWidth = R * 0.16; g.beginPath(); g.moveTo(-R * 0.05, -R * 0.85); g.quadraticCurveTo(-R * 0.1, -R * 1.15, -R * 0.18, -R * 1.3); g.stroke();
    g.strokeStyle = MG.mid; g.lineWidth = R * 0.08; g.stroke();
    for (const [lx, ly, rot] of [[-R * 0.45, -R * 1.42, -0.45], [R * 0.05, -R * 1.47, 0.4]]) {
      g.save(); g.translate(lx, ly); g.rotate(rot);
      const lg = g.createLinearGradient(0, -R * 0.16, 0, R * 0.16); lg.addColorStop(0, MG.hi); lg.addColorStop(1, MG.mid);
      g.fillStyle = lg; g.beginPath(); g.ellipse(0, 0, R * 0.3, R * 0.17, 0, 0, 6.283); g.fill();
      g.strokeStyle = MG.out; g.lineWidth = lw * 0.8; g.stroke();
      g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(-R * 0.06, -R * 0.06, R * 0.13, R * 0.045, -0.15, 0, 6.283); g.fill();
      g.restore();
    }
    g.lineCap = 'butt';
    // Body with rim lights inside the outline.
    g.fillStyle = glossy(); g.beginPath(); g.ellipse(0, 0, R * 1.05, R, 0, 0, 6.283); g.fill();
    g.lineWidth = R * 0.08;
    g.strokeStyle = MG.rimB; g.beginPath(); g.ellipse(0, 0, R * 1.0, R * 0.95, 0, Math.PI * 0.55, Math.PI * 1.35); g.stroke();
    g.strokeStyle = MG.rimF; g.beginPath(); g.ellipse(0, 0, R * 1.0, R * 0.95, 0, -Math.PI * 0.05, Math.PI * 0.5); g.stroke();
    g.strokeStyle = MG.out; g.lineWidth = lw; g.beginPath(); g.ellipse(0, 0, R * 1.05, R, 0, 0, 6.283); g.stroke();
    // Gloss.
    g.fillStyle = '#ffffff';
    g.save(); g.translate(-R * 0.42, -R * 0.6); g.rotate(-0.55); g.beginPath(); g.ellipse(0, 0, R * 0.3, R * 0.12, 0, 0, 6.283); g.fill(); g.restore();
    g.beginPath(); g.arc(-R * 0.12, -R * 0.78, R * 0.06, 0, 6.283); g.fill();
    g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.ellipse(-R * 0.82, R * 0.05, R * 0.06, R * 0.22, 0.2, 0, 6.283); g.fill();
    // Star on the side of the hood.
    const sx = -R * 0.6, sy = -R * 0.32, sr = R * 0.26;
    const sp = () => { g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? sr * 0.48 : sr; g.lineTo(sx + Math.cos(a) * r, sy + Math.sin(a) * r); } g.closePath(); };
    const sg = g.createLinearGradient(0, sy - sr, 0, sy + sr); sg.addColorStop(0, '#fff27a'); sg.addColorStop(0.5, MG.star); sg.addColorStop(1, MG.starDeep);
    sp(); g.fillStyle = sg; g.fill(); g.strokeStyle = MG.starLine; g.lineWidth = R * 0.045; g.lineJoin = 'round'; g.stroke();
    g.fillStyle = '#ffffffcc'; g.beginPath(); g.ellipse(sx - sr * 0.15, sy - sr * 0.3, sr * 0.18, sr * 0.1, -0.5, 0, 6.283); g.fill();
    // Face turned to the front, with a soft pink shade at the bottom.
    const fx = R * 0.4, fy = R * 0.12, frx = R * 0.58, fry = R * 0.56;
    const fg = g.createLinearGradient(0, fy - fry, 0, fy + fry); fg.addColorStop(0, MG.face); fg.addColorStop(0.8, MG.face); fg.addColorStop(1, '#fad6c8');
    g.fillStyle = fg; g.beginPath(); g.ellipse(fx, fy, frx, fry, 0, 0, 6.283); g.fill();
    g.strokeStyle = MG.faceLine; g.lineWidth = R * 0.055; g.stroke();
    g.strokeStyle = MG.eye; g.lineWidth = R * 0.06; g.lineCap = 'round';
    g.beginPath(); g.moveTo(fx - frx * 0.44, fy - fry * 0.18); g.lineTo(fx - frx * 0.1, fy - fry * 0.18);
    g.moveTo(fx + frx * 0.3, fy - fry * 0.18); g.lineTo(fx + frx * 0.6, fy - fry * 0.2); g.stroke(); g.lineCap = 'butt';
    for (const [bx, bw] of [[fx - frx * 0.34, 0.2], [fx + frx * 0.56, 0.15]]) {
      const bg = g.createRadialGradient(bx, fy + fry * 0.2, 0, bx, fy + fry * 0.2, frx * bw);
      bg.addColorStop(0, MG.blush); bg.addColorStop(0.7, MG.blush + 'cc'); bg.addColorStop(1, MG.blush + '00');
      g.fillStyle = bg; g.beginPath(); g.ellipse(bx, fy + fry * 0.2, frx * bw, fry * 0.13, 0, 0, 6.283); g.fill();
    }
    // Foot and arm, baked too (they only move).
    const part = (w, h, draw) => { const pc = document.createElement('canvas'); pc.width = Math.ceil(w * sc); pc.height = Math.ceil(h * sc); const pg = pc.getContext('2d'); pg.scale(sc, sc); pg.translate(w / 2, h / 2); draw(pg); return pc; };
    const fw = R * 0.66, fh = R * 0.5, aw = R * 0.62, ah = R * 0.5;
    const foot = part(fw, fh, pg => {
      const fg = pg.createLinearGradient(0, -R * 0.16, 0, R * 0.16); fg.addColorStop(0, MG.mid); fg.addColorStop(1, MG.lo);
      pg.fillStyle = fg; pg.beginPath(); pg.ellipse(0, 0, R * 0.25, R * 0.17, 0, 0, 6.283); pg.fill();
      pg.strokeStyle = MG.out; pg.lineWidth = R * 0.07; pg.stroke();
      pg.fillStyle = '#ffffffaa'; pg.beginPath(); pg.ellipse(-R * 0.06, -R * 0.07, R * 0.08, R * 0.03, 0, 0, 6.283); pg.fill();
    });
    const arm = part(aw, ah, pg => {
      const ag = pg.createLinearGradient(0, -R * 0.15, 0, R * 0.15); ag.addColorStop(0, MG.hi); ag.addColorStop(1, MG.mid);
      pg.fillStyle = ag; pg.beginPath(); pg.ellipse(0, 0, R * 0.22, R * 0.15, -0.5, 0, 6.283); pg.fill();
      pg.strokeStyle = MG.out; pg.lineWidth = R * 0.07; pg.stroke();
      pg.fillStyle = '#ffffffb0'; pg.beginPath(); pg.ellipse(-R * 0.04, -R * 0.07, R * 0.07, R * 0.03, -0.5, 0, 6.283); pg.fill();
    });
    moguBake = { R, sc, c, S, oy: S / 2 + R * 0.25, fx, fy, frx, fry, foot, fw, fh, arm, aw, ah };
    return moguBake;
  }
  function drawMoguSide(g, cx, cy, R, lunge, o, t) {
    const b = bakeMoguBody(R);
    g.save(); g.translate(cx, cy);   // no tilt: a rotated big image costs a resample every frame
    // Feet running on the road (behind the body).
    const step = Math.sin(t * 18) * R * 0.12;
    for (const [fx, ph] of [[-0.35, 1], [0.25, -1]]) g.drawImage(b.foot, R * fx + step * ph - b.fw / 2, R * 0.92 - b.fh / 2, b.fw, b.fh);
    g.drawImage(b.c, -b.S / 2, -b.oy, b.S, b.S);
    // Mouth at the front: the nose dot when shut, wide open on the beat.
    const { fx, fy, frx, fry } = b, mx = fx + frx * 0.28, my = fy + fry * 0.32;
    if (o < 0.15) { g.fillStyle = '#642100'; g.beginPath(); g.ellipse(mx - frx * 0.08, my - fry * 0.12, R * 0.05, R * 0.04, 0, 0, 6.283); g.fill(); }
    else {
      const w = frx * (0.3 + 0.25 * o), h = fry * (0.12 + 0.5 * o);
      const mouth = () => { g.beginPath(); g.moveTo(mx - w, my - h * 0.25); g.quadraticCurveTo(mx, my - h * 0.45, mx + w, my - h * 0.3);
        g.quadraticCurveTo(mx + w * 0.9, my + h, mx, my + h); g.quadraticCurveTo(mx - w * 0.9, my + h, mx - w, my - h * 0.25); g.closePath(); };
      mouth(); g.fillStyle = '#7a1424'; g.fill();
      g.save(); g.clip(); g.fillStyle = '#ff8fa3'; g.beginPath(); g.ellipse(mx, my + h * 0.95, w * 0.6, h * 0.45, 0, 0, 6.283); g.fill();
      g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(mx + w * 0.2, my - h * 0.35); g.lineTo(mx + w * 0.42, my - h * 0.35); g.lineTo(mx + w * 0.31, my - h * 0.02); g.fill(); g.restore();
      mouth(); g.strokeStyle = MG.faceLine; g.lineWidth = R * 0.055; g.lineJoin = 'round'; g.stroke();
    }
    // A little arm reaching forward.
    g.drawImage(b.arm, R * 0.88 + lunge * R * 0.12 - b.aw / 2, R * 0.5 - b.ah / 2, b.aw, b.ah);
    g.restore();
  }

  // 3Match: "?" blocks floating over the road (one-way: you pass through them
  // from below and the sides, and land on them from above). Landing switches a
  // block to its colour (red, green, purple, pink or blue).
  const TILE_TOP = GROUND - B * 1.4, TILE_SQ = B * 2.6,  // big and low: easy to land on
  TILE_FACES = ['red', 'green', 'purple', 'pink', 'blue'];
  const TILE_COL = { red: ['#ff8c8c', '#e8364a'], green: ['#b6ef6a', '#5fbf1f'], purple: ['#cfb2ff', '#8f62e8'],
                     pink: ['#ffc0dc', '#f06aa8'], blue: ['#a8d6ff', '#3a8bff'] };
  const tileBakes = new Map();
  function tileBlock(kind) {   // one baked block: 'plain' or a colour
    const sc = typeof SC === 'number' && SC > 0 ? SC : 1, key = kind + '|' + sc;
    let c = tileBakes.get(key); if (c) return c;
    c = document.createElement('canvas'); c.width = c.height = Math.ceil(B * sc);
    const g = c.getContext('2d'); g.scale(sc, sc);
    const [hi, lo] = kind === 'plain' ? ['#f4efff', '#c9b8f0'] : TILE_COL[kind];
    const gr = g.createLinearGradient(0, 0, 0, B); gr.addColorStop(0, hi); gr.addColorStop(1, lo);
    g.beginPath(); g.roundRect(1.5, 1.5, B - 3, B - 3, 8); g.fillStyle = gr; g.fill();
    g.fillStyle = 'rgba(0,0,0,.12)'; g.beginPath(); g.roundRect(3, B - 9, B - 6, 6, 3); g.fill();          // bottom shade
    g.fillStyle = 'rgba(255,255,255,.75)'; g.beginPath(); g.roundRect(6, 5, B - 12, 6, 3); g.fill();      // top gloss
    g.beginPath(); g.arc(8, 15, 2.2, 0, 6.283); g.fill();
    g.strokeStyle = '#4a2a3a'; g.lineWidth = 2.5; g.beginPath(); g.roundRect(1.5, 1.5, B - 3, B - 3, 8); g.stroke();
    if (kind === 'plain') {
      g.fillStyle = '#ffffff'; g.font = '800 18px "M PLUS 1p", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('?', B / 2, B / 2 + 2);
    }
    tileBakes.set(key, c); return c;
  }
  // A square block. On an on-beat jump (PERFECT/GREAT) it slides under the
  // player to catch the landing (ob.shift); otherwise you pass through it.
  const tileX = ob => xAt(ob.t) + (ob.shift || 0);
  OBSTACLES.tile = {
    free: true,
    parts(cx, gy, f, ob) {
      const x = tileX(ob) - TILE_SQ / 2;
      return { spikes: [], blocks: [{ x, y: TILE_TOP, w: TILE_SQ, h: TILE_SQ * 0.5, f: false, oneWay: true }], x0: x, x1: x + TILE_SQ };
    },
    draw(g, ob) {
      const lit = ob.lit !== undefined, cx = tileX(ob);
      // The switch: a quick squash-and-stretch as the colour comes in.
      const sw = lit ? Math.min(1, (songPos - ob.lit) / 0.18) : 0, squash = lit && sw < 1 ? 1 - 0.25 * Math.sin(sw * Math.PI) : 1;
      const shake = ob.bad !== undefined && songPos - ob.bad < 0.3 ? Math.sin((songPos - ob.bad) * 60) * 3 : 0;
      const w = TILE_SQ * (2 - squash) * 0.5 + TILE_SQ * 0.5 * squash, h = TILE_SQ * squash;
      g.save(); if (ob.bad !== undefined) g.globalAlpha = 0.55;
      if (!lit && ob.bad === undefined) {   // "land here": a down arrow bouncing on the beat
        const hop = Math.abs(Math.sin(((songPos % run.p) / run.p) * Math.PI)) * 6, ay = TILE_TOP - 14 - hop;
        g.fillStyle = '#ff7fb0'; g.strokeStyle = '#4a2a3a'; g.lineWidth = 2; g.lineJoin = 'round';
        g.beginPath(); g.moveTo(cx - 9, ay - 10); g.lineTo(cx + 9, ay - 10); g.lineTo(cx, ay); g.closePath(); g.fill(); g.stroke();
      }
      g.drawImage(tileBlock(lit ? ob.face : 'plain'), cx - w / 2 + shake, TILE_TOP + (TILE_SQ - h), w, h);
      if (lit) window.worldSkins?.face(g, ob.face, cx + shake, TILE_TOP + TILE_SQ - h / 2, Math.round(TILE_SQ * 0.78));
      g.restore();
    },
  };
  // The door after a row: three lamps fill as its blocks switch; all three open it.
  const DOOR_H = B * 5.2;
  OBSTACLES.door = {
    free: true,
    parts(cx, gy, f, ob) {
      if (ob.openAt !== undefined) return { spikes: [], blocks: [], cx };
      return { spikes: [], blocks: [], hazards: [{ x: cx - B * 0.45, y: GROUND - DOOR_H, w: B * 0.9, h: DOOR_H }], cx };
    },
    draw(g, ob, parts) {
      const cx = parts.cx, lift = ob.openAt === undefined ? 0 : Math.min(1, (songPos - ob.openAt) / 0.35) * DOOR_H * 0.92;
      const x = cx - B * 0.6, w = B * 1.2, top = GROUND - DOOR_H;
      // Frame posts stay; the panel slides up when it opens.
      g.fillStyle = '#ffffff'; g.strokeStyle = '#4a2a3a'; g.lineWidth = 2.5;
      for (const px of [x - 8, x + w]) { g.beginPath(); g.roundRect(px, top - 10, 8, DOOR_H + 10, 3); g.fill(); g.stroke(); }
      g.beginPath(); g.roundRect(x - 10, top - 18, w + 20, 14, 6); g.fillStyle = '#ffb3d1'; g.fill(); g.stroke();
      g.save(); g.beginPath(); g.rect(x - 2, top - 4, w + 4, DOOR_H + 4); g.clip();
      const py = top - lift;
      const gr = g.createLinearGradient(0, py, 0, py + DOOR_H); gr.addColorStop(0, '#e6dcff'); gr.addColorStop(1, '#c9b8f0');
      g.beginPath(); g.roundRect(x, py, w, DOOR_H, 8); g.fillStyle = gr; g.fill(); g.stroke();
      g.fillStyle = 'rgba(255,255,255,.6)'; g.beginPath(); g.roundRect(x + 6, py + 8, 6, DOOR_H - 16, 3); g.fill();
      // Three lamps: lit in the row's colour as each block is landed on.
      const tiles = level.filter(o => o.type === 'tile' && o.group === ob.group);
      tiles.forEach((t, i) => {
        const ly = py + DOOR_H * 0.3 + i * B * 0.95;
        g.beginPath(); g.arc(cx, ly, B * 0.3, 0, 6.283);
        g.fillStyle = t.lit !== undefined ? TILE_COL[t.face][1] : '#ffffff'; g.fill(); g.stroke();
        if (t.lit === undefined) { g.fillStyle = '#c9b8f0'; g.font = '800 13px "M PLUS 1p", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('?', cx, ly + 1); }
        else { g.fillStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.arc(cx - 4, ly - 4, 3, 0, 6.283); g.fill(); }
      });
      g.restore();
    },
  };

  function drawArm(g, x, y, closed) {
    g.fillStyle = '#ff9dc4'; g.beginPath(); g.roundRect(x - B * 0.35, y - B * 0.75, B * 0.7, B * 0.4, 6); g.fill();
    g.strokeStyle = '#4a2a3a'; g.lineWidth = 2; g.stroke();
    g.fillStyle = '#ffd94a'; g.beginPath(); g.arc(x, y - B * 0.55, 3.5, 0, 6.283); g.fill();
    g.strokeStyle = '#fff4e6'; g.lineWidth = 4; g.lineCap = 'round';
    const o = closed ? 0.18 : 0.45;
    g.beginPath(); g.moveTo(x - B * 0.2, y - B * 0.35); g.lineTo(x - B * o, y + B * 0.05); g.lineTo(x - B * 0.15, y + B * 0.35);
    g.moveTo(x + B * 0.2, y - B * 0.35); g.lineTo(x + B * o, y + B * 0.05); g.lineTo(x + B * 0.15, y + B * 0.35); g.stroke();
    g.lineCap = 'butt';
  }

  function drawCannon(g, x, groundY, col, angle) {
    g.save(); g.translate(x, groundY - B * 0.45); g.rotate(angle);
    g.fillStyle = col; g.fillRect(-B * 0.2, -B * 0.38, B * 1.15, B * 0.76);
    g.fillStyle = '#ffffff55'; g.fillRect(-B * 0.1, -B * 0.3, B * 0.9, B * 0.16);
    g.strokeStyle = '#4a2a3a'; g.lineWidth = 2.5; g.strokeRect(-B * 0.2, -B * 0.38, B * 1.15, B * 0.76);
    g.fillStyle = '#e7c46a'; g.fillRect(B * 0.85, -B * 0.45, B * 0.22, B * 0.9); g.strokeRect(B * 0.85, -B * 0.45, B * 0.22, B * 0.9);
    g.restore();
    g.fillStyle = '#e7c46a'; g.beginPath(); g.arc(x, groundY - B * 0.25, B * 0.34, 0, 6.283); g.fill();
    g.strokeStyle = '#4a2a3a'; g.lineWidth = 2.5; g.stroke();
    g.fillStyle = '#8a6fd0'; g.beginPath(); g.arc(x, groundY - B * 0.25, B * 0.14, 0, 6.283); g.fill();
  }

  // ---------- Chart building ----------
  function build(built, ctx) {
    const gm = ctx.gimmick || {}, p = periodOf(ctx.beats), rng = mulberry32(ctx.seed * 7919 + 13);
    const taps = ctx.beats.map(b => b.t).filter(t => t > 2 && t < ctx.duration - 2);
    const inZone = t => built.zones.some(z => t >= z.start - 0.5 && t <= z.end + 0.5);
    const reserved = [];
    const isReserved = t => reserved.some(([a, b]) => t >= a && t <= b);
    const clear = (a, b) => {
      built.obs = built.obs.filter(o => o.t < a || o.t > b);
      built.coins = built.coins.filter(c => c.t < a || c.t > b);
      built.orbs = built.orbs.filter(o => o.t < a || o.t > b);
      for (const z of built.zones) {
        if (z.end < a - 0.5 || z.start > b + 0.5) continue;
        // Collectables in a removed flip zone were mirrored to the ceiling: put them back.
        for (const c of built.coins) if (c.t >= z.start && c.t < z.end) c.y = DH - c.y;
        for (const o of built.orbs) if (o.t >= z.start && o.t < z.end) o.y = DH - o.y;
      }
      built.zones = built.zones.filter(z => z.end < a - 0.5 || z.start > b + 0.5);
      reserved.push([a, b]);
    };
    const beatAfter = t => taps.find(x => x >= t);
    // Where n sections go: the hand-picked spots for a few, evenly over the
    // song for more (long songs get the gimmick all the way through).
    const spots = (n, preset) => n <= preset.length ? preset.slice(0, n)
      : Array.from({ length: n }, (_, i) => 0.1 + 0.8 * (i + 0.5) / n);
    const wantZones = Math.max(built.zones.length, gm.flip || 0);
    built.sections = [];
    // Sections first (they clear their stretch), then conversions, then darkness.
    if (gm.cannon) {
      // Each entry is a chain of cannons (a relay): the first sits on the road,
      // each next one sits on the rail the previous one fires you to. On the
      // last rail you run on and jump its spikes on the beat, then drop back to
      // a stretch of plain road (never straight onto spikes).
      const chains = gm.cannon.map(c => Array.isArray(c) ? c : [c]), n = chains.length;
      const FL = 2 * p;
      chains.forEach((chain, k) => {
        let e = beatAfter(ctx.duration * (gm.cannonAt ? gm.cannonAt[k] : n === 1 ? 0.3 : 0.2 + k * 0.42));
        if (e === undefined) return;
        const links = []; let ok = true, y = GROUND;
        for (let j = 0; j < chain.length; j++) {
          const i0 = taps.indexOf(e), aims = taps.slice(i0 + 1, i0 + 7);
          if (aims.length < 6) { ok = false; break; }
          const safe = CANNON_COLORS[chain[j]].safe, late = aims[5] + FL;   // latest landing (auto fire)
          let ze, next;
          if (j < chain.length - 1) { next = beatAfter(late + p * 0.9); if (next === undefined) { ok = false; break; } ze = next + 0.35; }
          else ze = late + 5 * p;
          links.push({ color: chain[j], e, y, aims, safe, zs: e + FL - 0.15, ze, late });
          y = TIER_TOP[safe]; e = next;
        }
        if (!ok || !links.length) return;
        const from = links[0].e - 0.9, to = links[links.length - 1].ze + 1.8;
        if (to > ctx.duration - 1.5 || reserved.some(([a, b]) => from < b && to > a)) return;
        clear(from, to);
        links.forEach((L, j) => {
          const sec = 'c' + k + '_' + j, last = j === links.length - 1;
          built.obs.push({ t: L.e, type: 'cannon', color: L.color, sec, aims: L.aims, fl: FL, y: L.y, relay: j > 0, free: true });
          for (let lvl = 0; lvl < 3; lvl++) built.obs.push({ t: (L.zs + L.ze) / 2, span: (L.ze - L.zs) / 2, type: 'tier', lvl, safe: lvl === L.safe, color: L.color, sec, free: true });
          // Spikes on the last rail, on the beat, after every possible landing.
          const spikes = [];
          if (last && L.safe > 0) {
            const beats = taps.filter(t => t > L.late + p * 0.8 && t < L.ze - 0.45);
            beats.forEach((t, i) => { if (i % 2 === 0) { spikes.push(t); built.obs.push({ t: t + TAP_OFFSET, type: 'railspike', lvl: L.safe, markY: TIER_TOP[L.safe] }); } });
          }
          for (let t = L.zs + 0.3; t < L.ze - 0.3; t += p) {
            const near = spikes.some(s => Math.abs(s + TAP_OFFSET - t) < 0.25);
            built.coins.push({ t, y: TIER_TOP[L.safe] - (near ? B * 1.9 : B / 2) });
          }
        });
        built.sections.push({ kind: 'cannon', sec: 'c' + k, from, to, color: chains[k][0] });
      });
    }
    // Airtime of a plain tap landing dh px higher (negative: lower).
    const air = dh => (V0 + Math.sqrt(Math.max(0, V0 * V0 - 2 * GRAV * dh))) / GRAV;
    if (gm.stairs) {
      // One step per beat only if a jump fits in a beat; otherwise every two beats.
      const m = p >= 0.6 ? 1 : 2, lv = [1, 2, 3, 2, 1], n = lv.length;
      const fracs = gm.stairsAt || spots(gm.stairs, [0.25, 0.5, 0.72]);
      for (const frac of fracs) {
        const b0 = beatAfter(ctx.duration * frac);
        if (b0 === undefined) continue;
        const i0 = taps.indexOf(b0), b = [];
        for (let k = 0; k <= n; k++) if (taps[i0 + k * m] !== undefined) b.push(taps[i0 + k * m]);
        if (b.length < n + 1) continue;
        const from = b[0] - 0.9, to = b[n] + JUMP_T + 0.9;
        if (to > ctx.duration - 1.5 || reserved.some(([a, c]) => from < c && to > a)) continue;
        clear(from, to);
        for (let k = 1; k <= n; k++) {
          const below = k === 1 ? 0 : lv[k - 2] * STEP_H, land = b[k - 1] + air(lv[k - 1] * STEP_H - below);
          const s0 = land - 0.12, s1 = b[k] + 0.22;
          built.obs.push({ t: (s0 + s1) / 2, span: (s1 - s0) / 2, type: 'stair', from: s0, to: s1, lvl: lv[k - 1], appear: b[k - 1] - p, free: true });
          built.coins.push({ t: (land + b[k]) / 2, y: GROUND - lv[k - 1] * STEP_H - B * 1.4 });
        }
        for (let k = 0; k <= n; k++) built.obs.push({ t: b[k] + TAP_OFFSET, type: 'step', k });
        built.sections.push({ kind: 'stairs', from, to });
      }
    }
    // A hop needs a jump (0.5s) per step: one step per beat only if that fits.
    const stepBeats = p >= 0.55 ? 1 : 2;
    const sectionBeats = (frac, n) => {
      const b0 = beatAfter(ctx.duration * frac);
      if (b0 === undefined) return null;
      const i0 = taps.indexOf(b0), b = [];
      for (let k = 0; k <= n; k++) if (taps[i0 + k * stepBeats] !== undefined) b.push(taps[i0 + k * stepBeats]);
      return b.length === n + 1 ? b : null;
    };
    const free = (from, to) => !(to > ctx.duration - 1.5 || reserved.some(([a, c]) => from < c && to > a));
    if (gm.route) {
      const n = 6;
      for (const frac of spots(gm.route, [0.3, 0.62]).map(f => gm.lift ? f + 0.12 : f)) {
        const b = sectionBeats(frac, n); if (!b) continue;
        const from = b[0] - 0.9, to = b[n] + TAP_OFFSET + 0.9;
        if (!free(from, to)) continue;
        clear(from, to);
        // Spikes on the floor on every beat (the notes for both roads); ledges between them.
        for (let k = 0; k <= n; k++) built.obs.push({ t: b[k] + TAP_OFFSET, type: 'spike' });
        for (let k = 1; k <= n; k++) {
          const s0 = b[k - 1] + TAP_OFFSET + 0.12, s1 = b[k] + TAP_OFFSET - 0.12;
          built.obs.push({ t: (s0 + s1) / 2, span: (s1 - s0) / 2, type: 'ledge', from: s0, to: s1, first: k === 1, free: true });
          built.coins.push({ t: s0 + (s1 - s0) * 0.3, y: LEDGE_TOP - B * 0.6 }, { t: s0 + (s1 - s0) * 0.7, y: LEDGE_TOP - B * 0.6 });
        }
        built.sections.push({ kind: 'route', from, to });
      }
    }
    if (gm.lift) {
      const n = 5;
      for (const frac of gm.liftAt || spots(gm.lift, [0.25, 0.6])) {
        const b = sectionBeats(frac, n); if (!b) continue;
        const from = b[0] - 0.9, to = b[n] + JUMP_T + 0.9;
        if (!free(from, to)) continue;
        clear(from, to);
        const period = stepBeats * p;
        for (let k = 1; k <= n; k++) {
          const land = b[k - 1] + air(k === 1 ? GROUND - LIFT_LOW : 0);
          const s0 = land - 0.14, s1 = b[k] + 0.22;
          built.obs.push({ t: (s0 + s1) / 2, span: (s1 - s0) / 2, type: 'lift', from: s0, to: s1, anchor: b[k], period, free: true });
          built.coins.push({ t: (land + b[k]) / 2, y: LIFT_LOW - LIFT_AMP - B * 0.9 });
        }
        for (let k = 0; k <= n; k++) built.obs.push({ t: b[k] + TAP_OFFSET, type: 'step', k });
        const s0 = b[0] + 0.2, s1 = b[n] + JUMP_T - 0.12;
        built.obs.push({ t: (s0 + s1) / 2, span: (s1 - s0) / 2, type: 'spikebed', from: s0, to: s1, free: true });
        built.sections.push({ kind: 'lift', from, to });
      }
    }
    if (gm.match) {
      // Rows of three square blocks, one hop per beat: up from the road onto the
      // first, then from block to block (you run off the end of a block just
      // before the next beat; COYOTE in index.html still lets that tap jump).
      // Fast songs hop every other beat. Then the door.
      const rows = gm.match, n = 3, every = p >= 0.55 ? 1 : 2;
      const rowBeats = frac => {
        const b0 = beatAfter(ctx.duration * frac); if (b0 === undefined) return null;
        const i0 = taps.indexOf(b0), b = [];
        for (let k = 0; k <= n + 1; k++) if (taps[i0 + k * every] !== undefined) b.push(taps[i0 + k * every]);
        return b.length === n + 2 ? b : null;
      };
      let row = 0;
      for (const frac of gm.matchAt || spots(rows, [0.25, 0.5, 0.75])) {
        const b = rowBeats(frac); if (!b) continue;
        const doorT = b[n] + TAP_OFFSET + p;
        const from = b[0] - 0.9, to = doorT + 0.9;
        if (!free(from, to)) continue;
        clear(from, to);
        const face = TILE_FACES[Math.floor(rng() * TILE_FACES.length)];
        for (let k = 0; k < n; k++) {
          const land = b[k] + air(k === 0 ? GROUND - TILE_TOP : 0);
          built.obs.push({ t: b[k] + TAP_OFFSET, type: 'step', k });
          built.obs.push({ t: land, span: TILE_SQ / 2 / 300, type: 'tile', face, group: row, free: true });
          built.coins.push({ t: land, y: TILE_TOP - B * 0.9 });
        }
        built.obs.push({ t: doorT, type: 'door', group: row, free: true });
        for (const dt of [0.1, 0.3, 0.5]) built.coins.push({ t: doorT + dt, y: GROUND - B / 2 });
        built.sections.push({ kind: 'match', from, to });
        row++;
      }
    }
    if (gm.pad) {
      // The pad sits on a beat; the throw lands a whole number of beats later
      // (at least ~1s, too far for a normal jump), the spikes fill the gap.
      const nb = Math.max(2, Math.ceil(1.0 / p));
      // With a flip zone on a short stage, pads go to the ends to leave it room.
      for (const frac of gm.padAt || spots(gm.pad, gm.flip ? [0.25, 0.8, 0.5] : [0.3, 0.68, 0.5])) {
        const b0 = beatAfter(ctx.duration * frac); if (b0 === undefined) continue;
        const i0 = taps.indexOf(b0), bl = taps[i0 + nb]; if (bl === undefined) continue;
        const L = b0 + TAP_OFFSET, A = bl - b0;
        const from = L - 1.0, to = L + A + 0.7;
        if (!free(from, to)) continue;
        clear(from, to);
        built.obs.push({ t: L, type: 'pad', air: A, free: true });
        const s0 = L + 0.15, s1 = L + A - 0.12;
        built.obs.push({ t: (s0 + s1) / 2, span: (s1 - s0) / 2, type: 'spikebed', from: s0, to: s1, free: true });
        for (let k = 1; k < 6; k++) { const u = k / 6; built.coins.push({ t: L + A * u, y: GROUND - B / 2 - PAD_H * 4 * u * (1 - u) }); }
        built.sections.push({ kind: 'pad', from, to });
      }
    }
    if (gm.arm) {
      const fracs = gm.armAt || spots(gm.arm, [0.35, 0.68]);
      for (const frac of fracs) {
        const b0 = beatAfter(ctx.duration * frac);
        if (b0 === undefined) continue;
        const i0 = taps.indexOf(b0), at = b0 + JUMP_T / 2;
        const rel = taps.find(t => t >= at + 0.8);
        if (rel === undefined) continue;
        const fall = Math.sqrt(2 * B * 1.6 / GRAV);
        const from = b0 - 0.9, to = rel + fall + 0.9;
        if (to > ctx.duration - 1.5 || reserved.some(([a, c]) => from < c && to > a)) continue;
        clear(from, to);
        built.obs.push({ t: b0 + TAP_OFFSET, type: 'step', k: 0 });
        built.obs.push({ t: at, type: 'arm', y: GROUND - B - JUMP_H + B * 0.1, release: rel, free: true, sec: 'a' + i0 });
        // Spikes from just after the arm to the release point: without the arm the
        // jump lands in them; after the release the fall lands past them.
        const s0 = at + 0.12, s1 = rel + 0.02;
        built.obs.push({ t: (s0 + s1) / 2, span: (s1 - s0) / 2, type: 'spikebed', from: s0, to: s1, free: true });
        for (let t = at + 0.3; t < rel; t += p) built.coins.push({ t, y: GROUND - JUMP_H - B * 0.2 });
        built.sections.push({ kind: 'arm', from, to });
      }
    }
    built.obs.sort((a, c) => a.t - c.t);
    // Gravity flip is a plain gimmick on every stage that has it: a zone a
    // section had to remove comes back in another stretch of plain obstacles.
    const PLAIN = new Set(['spike', 'spike2', 'block', 'block2', 'hold', 'tower', 'steps', 'spike3', 'bridge']);
    const tries = [];
    // Shorter zones too, so a stage packed with sections still keeps its flips.
    for (const len of [0.14, 0.1, 6 / ctx.duration, 4.5 / ctx.duration]) for (const f of [0.3, 0.5, 0.7, 0.2, 0.85, 0.4, 0.6, 0.75, 0.15, 0.55, 0.65, 0.8, 0.25, 0.45, 0.35]) tries.push([f, len]);
    for (const [f, len] of tries) {
      if (built.zones.length >= wantZones) break;
      const gaps = [];
      for (let i = 0; i + 1 < built.obs.length; i++)
        if (built.obs[i + 1].t - built.obs[i].t >= 0.9) gaps.push((built.obs[i].t + built.obs[i + 1].t) / 2);
      const near = tgt => gaps.reduce((b, x) => Math.abs(x - tgt) < Math.abs(b - tgt) ? x : b, Infinity);
      const s0 = near(ctx.duration * f), e0 = near(s0 + ctx.duration * len);
      if (!isFinite(s0) || !isFinite(e0) || e0 - s0 <= 3 || e0 - s0 > ctx.duration * 0.25) continue;
      if (s0 < 4 || e0 > ctx.duration - 3) continue;
      if (reserved.some(([a, b]) => s0 - 1.5 < b && e0 + 1.5 > a)) continue;
      if (built.zones.some(z => s0 < z.end + 2 && e0 > z.start - 2)) continue;
      if (built.obs.some(o => o.t > s0 - 1 && o.t < e0 + 1 && !PLAIN.has(o.type))) continue;
      // Same rules as the core chart: a run-up before and after each portal.
      const pts = [s0, e0], keep = o => pts.every(pt => o.t - pt > 0.75 || pt - o.t > 0.45);
      const gone = built.obs.filter(o => !keep(o));
      built.obs = built.obs.filter(keep);
      built.coins = built.coins.filter(c => !gone.some(o => Math.abs(c.t - o.t) < 0.2));
      built.orbs = built.orbs.filter(o => pts.every(pt => Math.abs(o.t - pt) > 0.5));
      for (const c of built.coins) if (c.t >= s0 && c.t < e0) c.y = DH - c.y;
      for (const o of built.orbs) if (o.t >= s0 && o.t < e0) o.y = DH - o.y;
      built.zones.push({ start: s0, end: e0 });
      built.zones.sort((a, c) => a.start - c.start);
    }
    // Inside a flip zone (away from its portals) a gimmick is mirrored onto the
    // ceiling (ob.mir); next to a portal it is left out.
    const zoneState = t => {
      for (const z of built.zones) {
        if (t >= z.start + 0.75 && t <= z.end - 0.6) return 1;
        if (t >= z.start - 0.5 && t <= z.end + 0.5) return -1;
      }
      return 0;
    };
    const mirY = (o, y) => o.mir ? DH - y : y;
    // One-jump obstacles a world gimmick can stand in for.
    const SMALL = new Set(['spike', 'block', 'spike2', 'block2', 'hold']);
    const neighbourGap = (i) => {
      const o = built.obs[i], prev = built.obs[i - 1], next = built.obs[i + 1];
      return { before: prev ? o.t - prev.t : 9, after: next ? next.t - o.t : 9 };
    };
    if (gm.jelly && p >= 0.38) {
      let made = 0;
      for (let i = 0; i < built.obs.length; i++) {
        const o = built.obs[i];
        if (!SMALL.has(o.type) || zoneState(o.t) < 0 || isReserved(o.t)) continue;
        const gap = neighbourGap(i);
        if (gap.before < 0.75 || gap.after < 0.6 || rng() >= gm.jelly) continue;
        const low = made === 0 ? true : made === 1 ? false : rng() < 0.5;
        o.type = 'jelly'; o.low = low; o.p = p; o.free = !low; o.mir = zoneState(o.t) === 1; made++;
        if (!low) {
          built.coins = built.coins.filter(c => Math.abs(c.t - o.t) > 0.22);
          built.coins.push({ t: o.t, y: mirY(o, GROUND - B / 2) });
          built.orbs = built.orbs.filter(b => b.t < o.t - 1.0 || b.t > o.t + 0.3);
        }
      }
    }
    if (gm.ring) {
      let made = 0;
      for (let i = 0; i < built.obs.length; i++) {
        const o = built.obs[i];
        if (!SMALL.has(o.type) || inZone(o.t) || isReserved(o.t)) continue;
        const gap = neighbourGap(i);
        if (gap.before < 0.75 || gap.after < 0.65 || (made > 0 && rng() >= gm.ring)) continue;
        o.type = 'ring'; made++;
        built.orbs = built.orbs.filter(b => Math.abs(b.t - o.t) > 0.8);
        built.coins = built.coins.filter(c => Math.abs(c.t - o.t) > 0.22);
        built.coins.push({ t: o.t, y: RING_CY });
      }
    }
    if (gm.cake) {
      let made = 0;
      for (let i = 0; i < built.obs.length; i++) {
        const o = built.obs[i];
        if (!SMALL.has(o.type) || zoneState(o.t) < 0 || isReserved(o.t)) continue;
        const gap = neighbourGap(i);
        if (gap.before < 0.75 || gap.after < 0.6 || rng() >= gm.cake) continue;
        // High cakes (stage 6): the second one, then about one in three.
        const high = !!gm.cakeHigh && (made === 1 || (made > 1 && rng() < 0.35));
        o.type = 'cake'; o.high = high; o.free = high; o.mir = zoneState(o.t) === 1; made++;
        if (high) {
          built.coins = built.coins.filter(c => Math.abs(c.t - o.t) > 0.22);
          built.coins.push({ t: o.t, y: mirY(o, GROUND - B / 2) });
          built.orbs = built.orbs.filter(b => b.t < o.t - 1.0 || b.t > o.t + 0.3);
        }
      }
    }
    if (gm.ball) {
      for (let i = 0; i < built.obs.length; i++) {
        const o = built.obs[i];
        if (!(gm.bigBall ? o.type === 'spike' || o.type === 'block' || o.type === 'spike2' : SMALL.has(o.type)) || zoneState(o.t) < 0 || isReserved(o.t)) continue;
        const gap = neighbourGap(i);
        if (gap.before < 0.6 || gap.after < 0.6 || rng() >= gm.ball) continue;
        o.type = 'ball'; o.p = p; o.mir = zoneState(o.t) === 1; o.c = BALL_COLORS[Math.floor(rng() * BALL_COLORS.length)];
      }
    }
    if (gm.bigBall) {
      // Big bouncing Cosmii in place of the tall and wide obstacles.
      const BIG = new Set(['tower', 'steps', 'block2', 'spike2', 'hold']);
      for (let i = 0; i < built.obs.length; i++) {
        const o = built.obs[i];
        if (!BIG.has(o.type) || zoneState(o.t) < 0 || isReserved(o.t)) continue;
        const gap = neighbourGap(i);
        if (gap.before < 0.6 || gap.after < 0.5 || rng() >= gm.bigBall) continue;
        o.type = 'bigball'; o.p = p; o.mir = zoneState(o.t) === 1; o.c = BALL_COLORS[Math.floor(rng() * BALL_COLORS.length)];
      }
    }
    if (gm.prize) {
      for (let i = 0; i < built.obs.length; i++) {
        const o = built.obs[i];
        if (!SMALL.has(o.type) || zoneState(o.t) < 0 || isReserved(o.t)) continue;
        const gap = neighbourGap(i);
        if (gap.before < 0.6 || rng() >= gm.prize) continue;
        o.type = 'prize'; o.p = p; o.mir = zoneState(o.t) === 1;
      }
    }
    built.dark = [];
    if (gm.dark) {
      const nd = gm.darkN || 2, len = ctx.duration * gm.dark / nd;
      for (const f of nd === 2 ? [0.3, 0.65] : Array.from({ length: nd }, (_, i) => 0.08 + 0.86 * i / nd)) {
        // Never over a gimmick section (blocks, stairs, cannons...): start after it.
        let a = ctx.duration * f, b = a + len, guard = 0;
        for (let hit; (hit = reserved.find(([x, y]) => a < y + 0.5 && b > x - 0.5)) && guard < 8; guard++) { a = hit[1] + 0.8; b = a + len; }
        const c = reserved.find(([x]) => x > a && x < b);
        if (c) b = c[0] - 0.8;   // and stop before the next one
        b = Math.min(ctx.duration - 2, b);
        if (b > a + 2 && !built.dark.some(d => a < d.end && b > d.start)) built.dark.push({ start: a, end: b });
      }
    }
    // Chorus highlight: the stretch of beats with the strongest average onset.
    built.sabi = null;
    if (gm.sabi) {
      const bts = ctx.beats, L = Math.max(8, Math.min(16, Math.round(bts.length * 0.12)));
      let best = -1, at = -1;
      for (let i = 0; i + L < bts.length; i++) {
        const a = bts[i].t, b = bts[i + L].t;
        if (a < ctx.duration * 0.15 || b > ctx.duration * 0.9) continue;
        let sum = 0; for (let k = i; k < i + L; k++) sum += bts[k].s || 0;
        if (sum > best) { best = sum; at = i; }
      }
      if (at >= 0) built.sabi = { start: bts[at].t, end: bts[at + L].t };
    }
    built.coins.sort((a, c) => a.t - c.t);
    built.p = p;
  }

  // ---------- Runtime state ----------
  let carry = null, bounce = null, matches = 0;
  let rideState = null, chase = 0, chaseShow = 0, usedCannons = new Set();
  function setup(built, cfg) {
    run = { p: built.p || 0.5, dark: built.dark || [], sabi: built.sabi || null, sections: built.sections || [], g: cfg.gimmick || {} };
    reset(0);
  }
  function reset(offset) {
    rideState = null; carry = null; bounce = null; padFlight = null; chase = run.g?.moguStart || 0; lastJudge = { kind: '', at: -9 }; if (!offset) matches = 0; chaseShow = 0; sabiShown = false;
    for (const o of level) {
      if (o.type === 'arm' && o.t > offset - 0.5) o.used = false;
      if (o.type === 'ring' && o.t > offset - 0.5) delete o.inAt;
      if (o.type === 'tile' && o.t > offset - 0.5) { delete o.lit; delete o.bad; delete o.shift; }
      if (o.type === 'door' && o.t > offset - 0.5) delete o.openAt;
      if (o.type === 'pad' && o.t > offset - 0.5) delete o.usedAt;
    }
    if (!offset) usedCannons = new Set();
  }
  function safeOffset(offset) {
    for (const s of run.sections) if (offset - LEAD < s.to && offset > s.from - 0.6) return Math.max(0, s.from - 0.3);
    return offset;
  }
  const active = () => STAGES[stageIdx]?.gimmick && stageIdx < NSTAGE;

  function grant(d, auto) {
    if (auto) { floats.push({ text: 'AUTO', x: player.x + B / 2, y: player.y - 20, l: 0.9, c: '#91a5c1' }); return; }
    const k = d <= 0.07 ? 'PERFECT!' : d <= 0.13 ? 'GREAT' : d <= 0.21 ? 'GOOD' : 'OK';
    combo++; maxCombo = Math.max(maxCombo, combo);
    score += d <= 0.07 ? 300 : d <= 0.13 ? 200 : 100;
    floats.push({ text: k === 'OK' ? 'FIRE!' : k, x: player.x + B / 2, y: player.y - 20, l: 1, c: '#ffd94a' });
  }

  // MOGU: creeps closer all the time (chase 0..3, 3 = eaten); each coin you
  // pick up pushes it back a little. Timing grades play no part.
  const MOGU_CREEP = 0.08, MOGU_COIN = 0.08;
  function moguStep(dt) {
    if (state !== 'play' || songPos < 2) return;
    chase += (run.g.moguCreep || MOGU_CREEP) * dt;
    if (chase >= 3) {
      floats.push({ text: 'パクッ！', x: player.x + B / 2, y: player.y - 30, l: 1.2, c: '#ff8f8f' });
      die();
      if (state === 'play') chase = 1.5;   // a shield saved the run
    }
  }
  function onCoin() {
    if (!active() || !run.g.mogu) return;
    chase = Math.max(0, chase - MOGU_COIN);
  }
  // Cannon ride and flight own the player; everything else uses normal physics.
  function ownsPlayer(dt, now) {
    if (!active()) return false;
    if (run.g.mogu) moguStep(dt);
    if (run.g.ring && ringStep(dt)) return true;
    if (run.g.match) matchStep();
    if (run.g.pad && padStep()) return true;
    if (run.g.arm && carryStep(now)) return true;
    if (!run.g.cannon) return false;
    if (!rideState) {
      if (lastGdir !== 1) return false;
      const ob = level.find(o => o.type === 'cannon' && !usedCannons.has(o.sec) && songPos >= o.t && songPos < o.t + 0.3);
      if (!ob) return false;
      usedCannons.add(ob.sec);
      rideState = { sec: ob.sec, ob, phase: 'ride', since: now };
      player.y = (ob.y || GROUND) - B; player.vy = 0; player.grounded = true; tapAt = -9;
      if (ob.relay) floats.push({ text: 'バトン！', x: player.x + B / 2, y: player.y - 24, l: 0.9, c: CANNON_COLORS[ob.color].c });
    }
    const r = rideState, ob = r.ob;
    if (r.phase === 'ride') {
      player.y = (ob.y || GROUND) - B; player.vy = 0; player.grounded = true;
      let k = 0, best = 9;
      ob.aims.forEach((a, i) => { const dd = Math.abs(songPos - a); if (dd < best) { best = dd; k = i; } });
      r.aim = AIM_ORDER[k % 3];
      const tapped = now - tapAt < 0.1 && tapAt > r.since;
      const auto = songPos > ob.aims[5] + 0.25;
      if (tapped || auto) {
        let lvl = r.aim, d = best;
        if (auto) { lvl = CANNON_COLORS[ob.color].safe; d = 0; }
        tapAt = -9;
        r.phase = 'fly'; r.from = songPos; r.lvl = lvl;
        r.y0 = (ob.y || GROUND) - B; r.y1 = TIER_TOP[lvl] - B; r.h = B * 1.4 + Math.max(0, r.y0 - r.y1) * 0.35 + (lvl === 2 ? B * 0.6 : 0);
        grant(d, auto);
        rings.push({ r: B, a: 0.7 }); shake = 4;
      }
      return true;
    }
    if (r.phase === 'miss') {
      // Shot to the wrong height: no platform there; fall into the hole below.
      player.vy += GRAV * dt; player.y += player.vy * dt; player.grounded = false;
      if (player.y > DH + B) { rideState = null; die({ fall: true }); if (state === 'play') { player.y = GROUND - B; player.vy = 0; player.grounded = true; } }
      return true;
    }
    if (r.phase === 'fly') {
      const s = (songPos - r.from) / ob.fl;
      if (s >= 1 && r.lvl !== CANNON_COLORS[ob.color].safe && !feverProtected() && performance.now() / 1000 >= invulnUntil) {
        r.phase = 'miss'; player.vy = 0;
        floats.push({ text: 'あっ…', x: player.x + B / 2, y: player.y - 16, l: 0.9, c: '#9a8fb8' });
        return true;
      }
      if (s >= 1) {
        player.y = r.y1; player.vy = 0; player.grounded = true; landAt = now;
        rideState = null;
        return false;   // normal collision now decides: safe tier, spikes or the pit
      }
      player.grounded = false;
      player.y = r.y0 + (r.y1 - r.y0) * s - 4 * r.h * s * (1 - s);
      return true;
    }
    return false;
  }
  // Rescue ring: a clean pass scores IN!; touching a rim bounces the player off
  // and down into the sky below (then the run ends).
  function ringStep(dt) {
    const pcx = player.x + B / 2;
    if (bounce) {
      // Falling into the sky through the hole (after a rim or a landing in it).
      player.vy += GRAV * dt; player.y += player.vy * dt; player.grounded = false;
      if (player.y > DH + B) {
        bounce = null;
        die({ fall: true });
        if (state === 'play') { player.y = GROUND - B; player.vy = 0; player.grounded = true; }   // a shield saved it
      }
      return true;
    }
    if (lastGdir !== 1) return false;
    // On the road over a hole: fall through it.
    if (player.grounded && Math.abs(player.y + B - GROUND) < 2 && !feverProtected() && performance.now() / 1000 >= invulnUntil) {
      for (const ob of level) {
        if (ob.type !== 'ring' || Math.abs(ob.t - songPos) > 0.5) continue;
        const h = OBSTACLES.ring.parts(xAt(ob.t)).hole;
        if (pcx > h.x && pcx < h.x + h.w) { bounce = { t: songPos }; player.vy = 0; player.grounded = false; return true; }
      }
    }
    const hx = player.x + B * 0.2, hy = player.y + B * 0.2, hw = B * 0.6, hh = B * 0.6;
    for (const ob of level) {
      if (ob.type !== 'ring' || Math.abs(ob.t - songPos) > 0.4) continue;
      const cx = xAt(ob.t);
      if (ob.inAt === undefined && cx < pcx && !player.grounded && songPos - ob.t < 0.15) {
        ob.inAt = songPos;
        const pts = Math.round(100 * gimmickMult());
        score += pts;
        floats.push({ text: `IN! +${pts}`, x: pcx, y: RING_TOP - 8, l: 1, c: '#ffd94a' });
        rings.push({ r: B * 0.8, a: 0.5 });
      }
      if (feverProtected() || performance.now() / 1000 < invulnUntil) continue;
      for (const z of ringRims(cx)) {
        if (hx < z.x + z.w && hx + hw > z.x && hy < z.y + z.h && hy + hh > z.y) {
          bounce = { t: songPos };
          player.vy = z.y < RING_CY ? 60 : -V0 * 0.3; player.grounded = false;
          floats.push({ text: 'ボヨン！', x: pcx, y: player.y - 16, l: 1, c: '#ff8f8f' });
          shake = 5;
          return true;
        }
      }
    }
    return false;
  }
  // 3Match: on an on-beat jump the block slides under the player to catch the
  // landing; landing on it switches its colour; the row's three open the door.
  let hopUp = false;   // this time in the air began with a jump (not a walk off an edge)
  function matchStep() {
    if (lastGdir !== 1) return;
    const pcx = player.x + B / 2, bottom = player.y + B;
    if (player.grounded) hopUp = false; else if (player.vy < 0) hopUp = true;
    // A block that went by without being stood on stays "?" (its lamp goes grey).
    for (const o of level) if (o.type === 'tile' && o.lit === undefined && o.bad === undefined && tileX(o) + TILE_SQ / 2 < pcx - B * 0.6) o.bad = songPos;
    if (hopUp && !player.grounded && player.vy > 0 && bottom > TILE_TOP - 26 && bottom <= TILE_TOP + 4) {
      const ob = level.find(o => o.type === 'tile' && o.lit === undefined && o.bad === undefined && o.shift === undefined &&
        Math.abs(tileX(o) - pcx) < Math.max(TILE_SQ / 2, 0.3 * SPEED));
      // Slide to where the player will be when the fall reaches the block top.
      const tl = (-player.vy + Math.sqrt(player.vy * player.vy + 2 * GRAV * Math.max(0, TILE_TOP - bottom))) / GRAV;
      // Land near the block's left edge, so the run across it lasts until the next beat.
      const lead = TILE_SQ / 2 - (B / 2 - 4) - 2;
      if (ob) ob.shift = pcx + lead - xAt(ob.t) + tl * SPEED;   // any jump near a block is caught
    }
    // Standing on a block switches it, whatever the timing.
    if (!player.grounded || Math.abs(bottom - TILE_TOP) > 3) return;
    const ob = level.find(o => o.type === 'tile' && o.lit === undefined && Math.abs(tileX(o) - pcx) <= TILE_SQ / 2 + B * 0.4);
    if (!ob) return;
    ob.bad = undefined;
    ob.lit = songPos;
    floats.push({ text: '★', x: pcx, y: TILE_TOP - 20, l: 0.6, c: TILE_COL[ob.face][1] });
    const group = level.filter(o => o.type === 'tile' && o.group === ob.group);
    if (group.every(o => o.lit !== undefined)) {
      matches++;
      const pts = Math.round(300 * gimmickMult());
      score += pts;
      floats.push({ text: `MATCH! +${pts}`, x: pcx, y: TILE_TOP - 46, l: 1.2, c: TILE_COL[ob.face][1] });
      rings.push({ r: B, a: 0.6 });
      const door = level.find(o => o.type === 'door' && o.group === ob.group);
      if (door) door.openAt = songPos;
    }
  }
  // Jump pad: reaching its centre on the road throws the player in a fixed arc
  // (PAD_H high) that lands exactly ob.air later, on a beat.
  const PAD_H = B * 3.2;
  let padFlight = null;
  function padStep() {
    if (padFlight) {
      const u = (songPos - padFlight.from) / padFlight.ob.air;
      if (u >= 1) { padFlight = null; player.y = GROUND - B; player.vy = 0; player.grounded = true; landAt = performance.now() / 1000; return false; }
      player.grounded = false; player.vy = u < 0.5 ? -1 : 1;
      player.y = GROUND - B - PAD_H * 4 * u * (1 - u);
      return true;
    }
    if (!player.grounded || lastGdir !== 1 || Math.abs(player.y + B - GROUND) > 2) return false;
    const ob = level.find(o => o.type === 'pad' && o.usedAt === undefined && songPos >= o.t - 0.005 && songPos - o.t < 0.08);
    if (!ob) return false;
    ob.usedAt = songPos; padFlight = { ob, from: songPos };
    holdJump = 0; tapAt = -9;
    score += Math.round(100 * gimmickMult());
    floats.push({ text: 'ぴょーん！', x: player.x + B / 2, y: player.y - 18, l: 1, c: '#5fe8ff' });
    rings.push({ r: B * 0.8, a: 0.6 });
    return true;
  }
  function drawFront(g) {
    if (!active() || !run.g.ring) return;
    for (const ob of level) {
      if (ob.type !== 'ring') continue;
      const x = xAt(ob.t); if (x < -B * 2 || x > W + B * 2) continue;
      OBSTACLES.ring.drawFront(g, ob);
    }
  }
  const hidesPlayer = () => !!(rideState && rideState.phase === 'ride');

  // Catch B: grab the arm like an orb (tap near it, or keep holding), hang
  // under it until the release beat, then fall past the spikes.
  function carryStep(now) {
    if (!carry) {
      if (player.grounded || lastGdir !== 1 || !(isDown || now - tapAt < 0.12)) return false;
      const pcx = player.x + B / 2, pcy = player.y + B / 2;
      const ob = level.find(o => o.type === 'arm' && !o.used && Math.abs(xAt(o.t) - pcx) <= 34 && Math.abs(pcy - o.y) <= 46);
      if (!ob) return false;
      ob.used = true; tapAt = -9; carry = { ob };
      combo++; maxCombo = Math.max(maxCombo, combo); score += 200;
      floats.push({ text: 'CATCH!', x: pcx, y: player.y - 16, l: 1, c: '#ffb14a' });
    }
    const ob = carry.ob;
    if (songPos >= ob.release) { carry = null; player.vy = 0; player.grounded = false; return false; }
    player.y = ob.y + B * 0.3; player.vy = 0; player.grounded = false;
    return true;
  }

  let lastJudge = { kind: '', at: -9 };
  function onJudge(kind) {
    if (!active()) return;
    lastJudge = { kind, at: songPos };
  }
  // A gimmick may add a result line and a bonus at the clear (none at the moment).
  function onClear() { return null; }

  const inSabi = () => !!(run.sabi && songPos >= run.sabi.start && songPos < run.sabi.end);
  const mult = () => (active() && state === 'play' && !practice && inSabi()) ? 2 : 1;
  let sabiShown = false;

  // ---------- Drawing ----------
  let darkBake = null;
  function darkLight() {
    const sc = typeof SC === 'number' && SC > 0 ? SC : 1;
    if (darkBake && darkBake.sc === sc) return darkBake.c;
    const c = document.createElement('canvas'), r = 150; c.width = c.height = Math.ceil(r * 2 * sc);
    const g = c.getContext('2d'); g.scale(sc, sc);
    const grd = g.createRadialGradient(r, r, 40, r, r, r);
    grd.addColorStop(0, 'rgba(0,0,0,0)'); grd.addColorStop(1, 'rgba(2,3,10,0.93)');
    g.fillStyle = grd; g.fillRect(0, 0, r * 2, r * 2);
    darkBake = { sc, c }; return c;
  }
  function inDark() {
    let a = 0;
    for (const z of run.dark) {
      if (songPos < z.start - 0.4 || songPos > z.end + 0.4) continue;
      a = Math.max(a, Math.min(1, (songPos - (z.start - 0.4)) / 0.4, ((z.end + 0.4) - songPos) / 0.4));
    }
    return a;
  }
  function drawOverlay(g) {
    if (!active() || !['play', 'dead', 'ready', 'paused'].includes(state)) return;
    const pcx = player.x + B / 2, pcy = player.y + B / 2;
    // Chorus highlight: warm light sweeping across, and the x2 label.
    if (run.sabi && state === 'play') {
      const z = run.sabi, k = Math.min(1, (songPos - z.start) / 0.3, (z.end - songPos) / 0.3);
      if (k > 0) {
        if (!sabiShown) { sabiShown = true; floats.push({ text: 'SCORE ×2', x: W / 2, y: 150, l: 1.4, c: '#ffd94a' }); }
        if (!window.reducedEffects) {
          g.save(); g.globalAlpha = 0.12 * k; g.fillStyle = '#ffd94a';
          for (let i = 0; i < 4; i++) {
            const x = ((i * 260 + songPos * 140) % (W + 260)) - 130;
            g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 70, 0); g.lineTo(x + 20, GROUND); g.lineTo(x - 50, GROUND); g.closePath(); g.fill();
          }
          g.restore();
        }
        g.globalAlpha = k; g.fillStyle = '#10132ce8'; g.strokeStyle = '#ffd94a'; g.lineWidth = 1.5;
        roundRect(W - 172, 62, 108, 28, 6); g.fill(); g.stroke();
        g.fillStyle = '#ffd94a'; g.font = 'italic 800 15px "Exo 2", "M PLUS 1p", sans-serif'; g.textAlign = 'center';
        g.fillText('×2', W - 118, 81); g.textAlign = 'left'; g.globalAlpha = 1;
      } else if (songPos < z.start) sabiShown = false;
    }
    // Darkness with a small light around the player; obstacles flash on the beat.
    const dark = inDark();
    if (dark > 0) {
      const lastBeat = beats[beatIdx - 1]?.t ?? -9, flash = Math.max(0, 1 - (songPos - lastBeat) / 0.35);
      // The light around the player is baked once; the rest is a plain fill.
      const v = darkLight(), r = 150;
      g.save(); g.globalAlpha = dark;
      g.drawImage(v, pcx - r, pcy - r, r * 2, r * 2);
      g.fillStyle = 'rgba(2,3,10,0.93)';
      g.fillRect(-20, -20, W + 40, pcy - r + 20);
      g.fillRect(-20, pcy + r, W + 40, DH - pcy - r + 20);
      g.fillRect(-20, pcy - r, pcx - r + 20, r * 2);
      g.fillRect(pcx + r, pcy - r, W - pcx - r + 20, r * 2);
      g.restore();
      g.save(); g.lineWidth = 2.5; g.strokeStyle = `rgba(255,226,196,${(0.08 + 0.9 * flash) * dark})`;
      for (const ob of level) {
        const dx = (ob.t - songPos) * SPEED; if (dx < -W * 0.4 || dx > W) continue;
        const parts = obstacleRects(ob);
        for (const s of parts.spikes) { g.beginPath(); g.moveTo(s.x, s.y + s.h); g.lineTo(s.x + s.w / 2, s.y); g.lineTo(s.x + s.w, s.y + s.h); g.closePath(); g.stroke(); }
        for (const bl of parts.blocks) g.strokeRect(bl.x, bl.y, bl.w, bl.h);
        for (const z of parts.hazards || []) g.strokeRect(z.x, z.y, z.w, z.h);
      }
      g.restore();
      g.globalAlpha = dark; g.fillStyle = '#ffd94a';
      g.globalAlpha = dark * (0.25 + 0.75 * flash); g.beginPath(); g.arc(W / 2, 64, 6, 0, 6.283); g.fill(); g.globalAlpha = 1;
    }
    // 3Match: from ~3s before a row, a banner and the hop path (road -> block
    // -> block -> block), so the row never comes as a surprise.
    if (run.g.match && state !== 'menu') {
      const first = level.find(o => o.type === 'tile' && o.lit === undefined && o.bad === undefined && o.t - songPos < 3.4 && o.t > songPos - 0.2);
      if (first) {
        const row = level.filter(o => o.type === 'tile' && o.group === first.group);
        const steps = level.filter(o => o.type === 'step' && o.t > row[0].t - 2 && o.t < row[row.length - 1].t + 0.1).slice(0, row.length);
        g.save(); g.setLineDash([6, 7]); g.lineWidth = 3; g.strokeStyle = '#ff7fb0'; g.lineCap = 'round';
        row.forEach((tl, k) => {
          if (tl.lit !== undefined || !steps[k]) return;
          const x0 = xAt(steps[k].t - TAP_OFFSET), y0 = k === 0 ? GROUND - 4 : TILE_TOP - 4, x1 = tileX(tl), y1 = TILE_TOP - 4;
          g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo((x0 + x1) / 2, Math.min(y0, y1) - JUMP_H * 1.4, x1, y1); g.stroke();
        });
        g.restore();
        const lead = row[0].t - songPos;
        if (lead > 0) {
          const pulse = 1 + 0.06 * Math.abs(Math.sin(((songPos % run.p) / run.p) * Math.PI));
          g.save(); g.translate(W / 2, 140); g.scale(pulse, pulse);
          g.fillStyle = '#ffffffee'; g.strokeStyle = '#ff7fb0'; g.lineWidth = 3;
          g.beginPath(); g.roundRect(-118, -19, 236, 38, 19); g.fill(); g.stroke();
          g.fillStyle = '#d4407f'; g.font = '900 17px "M PLUS 1p", sans-serif'; g.textAlign = 'center';
          g.fillText('▼ ブロックに3つ乗ろう！', 0, 6); g.restore();
        }
      }
    }
    // 3Match: while a row is on screen, the door's three lamps at the top.
    if (run.g.match && state !== 'menu') {
      const door = level.find(o => o.type === 'door' && o.t > songPos - 0.3 && o.t - songPos < 4.5);
      if (door) {
        const tiles = level.filter(o => o.type === 'tile' && o.group === door.group), x0 = W / 2 - 52, y = 104;
        g.save(); g.fillStyle = '#ffffffe0'; g.strokeStyle = '#4a2a3a'; g.lineWidth = 2;
        g.beginPath(); g.roundRect(x0 - 10, y - 16, 124, 32, 16); g.fill(); g.stroke();
        tiles.forEach((t, i) => {
          g.beginPath(); g.arc(x0 + 8 + i * 30, y, 10, 0, 6.283);
          g.fillStyle = t.lit !== undefined ? TILE_COL[t.face][1] : t.bad !== undefined ? '#c9c2d8' : '#f1ebff'; g.fill(); g.stroke();
        });
        // a little door icon: open once the three are lit
        g.fillStyle = door.openAt !== undefined ? '#c6ef8f' : '#e6dcff';
        g.beginPath(); g.roundRect(x0 + 92, y - 11, 14, 22, 3); g.fill(); g.stroke();
        g.restore();
      }
    }
    // Catch B: the arm holding the player.
    if (carry) {
      g.strokeStyle = '#c7d2e8'; g.lineWidth = 2; g.beginPath(); g.moveTo(pcx, 18); g.lineTo(pcx, carry.ob.y - B * 0.7); g.stroke();
      drawArm(g, pcx, carry.ob.y, true);
    }
    // Cannon ride: cannon under the player, barrel and the landing guide.
    if (rideState && rideState.phase === 'ride') {
      const ob = rideState.ob, col = CANNON_COLORS[ob.color].c, lvl = rideState.aim;
      const ang = { 2: -1.05, 1: -0.6, 0: -0.25 }[lvl];
      const lx = pcx + ob.fl * SPEED, ly = TIER_TOP[lvl] - B / 2;
      g.save(); g.strokeStyle = lvl === CANNON_COLORS[ob.color].safe ? '#ffd94a' : '#ffffff88'; g.lineWidth = 2; g.setLineDash([5, 6]);
      const by = ob.y || GROUND;
      g.beginPath(); g.moveTo(pcx, by - B * 0.6);
      g.quadraticCurveTo((pcx + lx) / 2, Math.min(by - B * 0.6, ly) - B * 2.2, lx, ly); g.stroke(); g.restore();
      drawCannon(g, pcx, by, col, ang);
      g.fillStyle = '#ffffff'; g.font = '800 13px "M PLUS 1p", sans-serif'; g.textAlign = 'center';
      g.lineWidth = 3; g.strokeStyle = '#2a1650'; const lbl = `${CANNON_COLORS[ob.color].name}の大砲 ・ 砲身：${AIM_NAME[lvl]}`;
      g.strokeText(lbl, pcx, by - B * 2.4); g.fillText(lbl, pcx, by - B * 2.4); g.textAlign = 'left';
    }
    // Mogu Mogu: the mouth behind the player.
    if (run.g.mogu) {
      chaseShow += (chase - chaseShow) * 0.1;
      const mx = player.x - B * 3.2 + chaseShow * B * 0.95, my = GROUND - B * 1.3;
      const beatPh = (songPos % run.p) / run.p, open = 0.35 + 0.35 * Math.abs(Math.sin(beatPh * Math.PI));
      g.save();
      if (lastGdir === -1) { g.translate(0, DH); g.scale(1, -1); }   // on the ceiling with the player in a flip zone
      // The green Cosmii in profile on the road behind the player, always after
      // it: each MISS brings it closer, and on every beat it lunges forward with
      // its mouth wide open ("あーん") and snaps shut.
      const R = B * 1.5, lunge = Math.abs(Math.sin(beatPh * Math.PI));
      const near = Math.min(1, chaseShow / 2.2), x0 = -R * 0.3, x1 = player.x - B * 0.5 - R * 1.15;
      const cx = x0 + (x1 - x0) * near + lunge * B * 0.55, cy = GROUND - R - lunge * B * 0.2;
      if (!window.reducedEffects) {   // speed lines behind it
        g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 3; g.lineCap = 'round';
        for (let k = 0; k < 3; k++) { const y = cy - R * 0.4 + k * R * 0.4, l = B * (0.5 + 0.5 * lunge); g.beginPath(); g.moveTo(cx - R * 1.1 - l, y); g.lineTo(cx - R * 1.1, y); g.stroke(); }
        g.lineCap = 'butt';
      }
      drawMoguSide(g, cx, cy, R, lunge, (open - 0.35) / 0.35, songPos);
      g.restore();
      // The rule, always on screen: a gauge of how close it is (3 = eaten).
      if (state === 'play' || state === 'ready' || state === 'paused') {
        const x0 = W / 2 - 92, y = lastGdir === -1 ? GROUND - 100 : 104, danger = chase >= 2.2;   // ceiling run: gauge on the free floor side
        g.save();
        g.fillStyle = danger ? '#ffe3e3f2' : '#ffffffe8'; g.strokeStyle = danger ? '#e0445a' : '#4a2a3a'; g.lineWidth = 2;
        g.beginPath(); g.roundRect(x0, y - 17, 184, 34, 17); g.fill(); g.stroke();
        drawMoguSide(g, x0 + 18, y + 2, 13, 0, 0.6, songPos);
        // How close it is: the bar fills towards the mouth mark on the right.
        const bx = x0 + 38, bw = 118, f = Math.min(1, chase / 3);
        g.fillStyle = '#f1ebff'; g.beginPath(); g.roundRect(bx, y - 7, bw, 14, 7); g.fill(); g.stroke();
        if (f > 0.02) { g.fillStyle = danger ? '#e0445a' : f > 0.4 ? '#ff9a4d' : '#7fd16b'; g.beginPath(); g.roundRect(bx + 1, y - 6, Math.max(12, (bw - 2) * f), 12, 6); g.fill(); }
        g.fillStyle = '#e0445a'; g.font = '900 12px sans-serif'; g.textAlign = 'center'; g.fillText('×', bx + bw + 14, y + 4);
        g.restore();
        g.textAlign = 'center'; g.font = '800 13px "M PLUS 1p", sans-serif'; g.lineWidth = 3; g.strokeStyle = '#2a1650';
        const msg = chase >= 2.2 ? 'コインを取って逃げて！' : songPos < 7 ? 'コインを取ると逃げられる' : '';
        if (msg) { const my = y + 34; g.fillStyle = chase >= 2 ? '#ff8f8f' : '#ffffff'; g.strokeText(msg, W / 2, my); g.fillText(msg, W / 2, my); }
        g.textAlign = 'left';
      }
    }
  }

  window.stageGimmicks = {
    build, setup, reset, safeOffset, ownsPlayer, hidesPlayer, onJudge, onCoin, onClear, drawOverlay, drawFront, mult,
    darkness: () => inDark(),
    // Small picture of a gimmick for the stage select (s = size in px).
    icon(g, key, x, y, sz) {
      const k = sz / B; g.save(); g.translate(x, y); g.scale(k, k); g.lineJoin = 'round';
      const OUTL = '#4a2a3a';
      if (key === 'pad') { g.fillStyle = '#e9fbff'; g.strokeStyle = '#5fe8ff'; g.lineWidth = 3; g.beginPath(); g.roundRect(-B * 0.6, B * 0.3, B * 1.2, B * 0.25, 5); g.fill(); g.stroke(); g.lineCap = 'round'; for (const y of [-B * 0.45, -B * 0.05]) { g.beginPath(); g.moveTo(-B * 0.3, y + B * 0.2); g.lineTo(0, y); g.lineTo(B * 0.3, y + B * 0.2); g.stroke(); } }
      else if (key === 'ring') { g.lineWidth = 9; for (let i = 0; i < 8; i++) { g.strokeStyle = ['#ff8fb8', '#fff4e6', '#a8e07a'][i % 3]; g.beginPath(); g.ellipse(0, 0, B * 0.42, B * 0.62, 0, i * Math.PI / 4, (i + 1) * Math.PI / 4 + 0.02); g.stroke(); } g.lineWidth = 2; g.strokeStyle = OUTL; g.beginPath(); g.ellipse(0, 0, B * 0.55, B * 0.75, 0, 0, 7); g.stroke(); g.beginPath(); g.ellipse(0, 0, B * 0.29, B * 0.49, 0, 0, 7); g.stroke(); }
      else if (key === 'cannon') drawCannon(g, 0, B * 0.45, '#8a6fd0', -0.6);
      else if (key === 'ball') { if (window.worldSkins?.head) window.worldSkins.head(g, 'pink', 0, B * 0.05, B * 1.1); }
      else if (key === 'stairs') { [['#2ec8bb', 1], ['#2f4bb8', 2], ['#e04436', 3]].forEach(([c, l], i) => { g.fillStyle = c; g.beginPath(); g.roundRect(-B * 0.6 + i * B * 0.4, B * 0.5 - l * B * 0.3, B * 0.38, l * B * 0.3, 4); g.fill(); g.strokeStyle = OUTL; g.lineWidth = 2; g.stroke(); }); }
      else if (key === 'prize' || key === 'arm') { g.fillStyle = '#7df'; g.beginPath(); g.arc(0, B * 0.1, B * 0.4, 0, 7); g.fill(); g.fillStyle = '#ff9df0'; g.beginPath(); g.arc(0, B * 0.1, B * 0.4, Math.PI, 0); g.fill(); g.strokeStyle = OUTL; g.lineWidth = 2; g.beginPath(); g.arc(0, B * 0.1, B * 0.4, 0, 7); g.stroke(); if (key === 'arm') drawArm(g, 0, -B * 0.55, true); }
      else if (key === 'mogu') { g.translate(-B * 0.05, 0); drawMoguSide(g, 0, 0, B * 0.5, 1, 1, 0); }
      else if (key === 'match') { g.drawImage(tileBlock('plain'), -B * 0.5, -B * 0.5, B, B); }
      else if (key === 'dark') { g.fillStyle = '#1e0b40'; g.beginPath(); g.roundRect(-B * 0.55, -B * 0.55, B * 1.1, B * 1.1, 8); g.fill(); g.strokeStyle = '#ffe2c4'; g.lineWidth = 2; g.beginPath(); g.moveTo(-B * 0.3, B * 0.3); g.lineTo(0, -B * 0.3); g.lineTo(B * 0.3, B * 0.3); g.closePath(); g.stroke(); }
      else if (key === 'jelly') { g.fillStyle = '#ff9df0'; g.beginPath(); g.arc(0, 0, B * 0.45, Math.PI, 0); g.closePath(); g.fill(); g.strokeStyle = '#ffd0f6'; g.lineWidth = 2; g.stroke(); for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(i * B * 0.2, 0); g.quadraticCurveTo(i * B * 0.2 + 4, B * 0.25, i * B * 0.2, B * 0.45); g.stroke(); } }
      else if (key === 'cake') { g.fillStyle = '#f7d9a8'; g.fillRect(-B * 0.4, -B * 0.05, B * 0.8, B * 0.35); g.fillStyle = '#fff'; g.fillRect(-B * 0.4, -B * 0.2, B * 0.8, B * 0.16); g.strokeStyle = OUTL; g.lineWidth = 2; g.strokeRect(-B * 0.4, -B * 0.2, B * 0.8, B * 0.5); g.fillStyle = '#e8364a'; g.beginPath(); g.arc(0, -B * 0.28, B * 0.1, 0, 7); g.fill(); }
      g.restore();
    },
    inspect: () => ({ sabi: run.sabi, inSabi: inSabi(), chase, carrying: !!carry, riding: rideState?.phase || null, bouncing: !!bounce, matches, aim: rideState?.aim ?? null, dark: inDark(), p: run.p, sections: run.sections.slice() }),
    WORLDS, PLAN,
  };
})();
