// Practice that plays like a real stage: the main renderer, player, input,
// update() physics and judge() run on a song, with real obstacles and tap marks
// placed on its beats. Three drills - tap over spikes, hold over towers, use an
// orb in the air - each moves on by itself once cleared enough times. A hit is
// never a death here: "おしい！" and Cosmii runs through. Reward-free: coins,
// records and missions are untouched.
(() => {
  const KEY = 'cosmii_tutorial_v2', TRACK = 'Asset/bgm1.mp3', LEAD_IN = 0.9;
  // word / title / hand animation / line once done, as on the coach card (cosmii-screens.css).
  const LESSONS = [
    { word: 'TAP!', title: 'タップでジャンプ', hand: 'tap', ok: 'ジャンプできた！', text: '♪ に輪が重なったら、短くタップ', need: 3, every: 4, type: 'spike' },
    { word: 'HOLD!', title: '長押しで高くジャンプ', hand: 'hold', ok: '高くとべた！', text: '高いブロックは、押したままで高く', need: 2, every: 6, type: 'tower' },
    { word: 'AIR TAP!', title: '空中の輪で、もう一回タップ', hand: 'tap', ok: '空中でもう一回とべた！', text: 'ジャンプ中、光る輪でもう一回タップ', need: 2, every: 6, type: 'spike', orb: true },
  ];
  let active = false, promise, resolveRun, step = 0, paused = false, entry = 'optional';
  let cleared = 0, phase = 'run', phaseAt = 0, nextBeat = 0, gen = -1, loopBase = 0, lastMT = 0, realDie = null, beatList = [];
  const guide = document.createElement('section'); guide.id = 'live-tutorial'; guide.hidden = true;
  // Coach card: moving hand, 3 step bars, a big word (TAP! / HOLD! / AIR TAP!), one short line and
  // the clears so far. PRACTICE badge = no rewards. No "next" button: a drill moves on once cleared.
  guide.innerHTML = `<span class="tutorial-badge">PRACTICE</span><div class="tutorial-instruction"><span class="tutorial-hand" aria-hidden="true"></span><div class="tutorial-copy"><span class="tutorial-pips" aria-hidden="true"><i></i><i></i><i></i></span><strong id="tutorial-title"></strong><p id="tutorial-message"></p><div class="tutorial-dots" id="tutorial-dots" aria-hidden="true"></div><small id="tutorial-feedback" role="status"></small></div></div>
    <div class="tutorial-done" id="tutorial-done" hidden></div>
    <div class="tutorial-actions"><button id="tutorial-skip">✕ 練習をおわる</button><button id="tutorial-resume" hidden>▶ 練習をつづける</button></div>`;
  app.append(guide); const q = id => guide.querySelector('#' + id);

  // ---- song clock: the music element when it plays, the frame clock otherwise ----
  const track = () => AUDIO_TRACKS[TRACK];
  function startMusic(at) {
    const t = track(); if (!t || typeof previewTrack !== 'function') return;
    const start = Math.max(0, at + LEAD_IN);
    loopBase = at + LEAD_IN - start; lastMT = start;
    gen = previewTrack(t, start, () => {}); waitUntil = performance.now() + WAIT;
  }
  const ours = () => typeof previewing !== 'undefined' && previewing?.generation === gen && gen === playbackGeneration && musicEl && !musicEl.paused;
  // The game follows the song; if they drift apart (a late start, a stall) the
  // song is moved to the game, never the course to the song. Until the song first
  // plays the course waits, at most WAIT ms, then runs on the frame clock.
  const WAIT = 2500; let waitUntil = 0;
  function clock(dt) {
    if (!ours()) {
      if (performance.now() < waitUntil) { q('tutorial-feedback').textContent = 'じゅんび中…'; return songPos; }
      return songPos + dt;
    }
    if (waitUntil) { waitUntil = 0; q('tutorial-feedback').textContent = ''; }
    const mt = musicEl.currentTime;
    if (mt < lastMT - 1) loopBase += lastMT - mt;   // the preview looped back
    lastMT = mt;
    const s = loopBase + mt - LEAD_IN;
    if (Math.abs(s - songPos - dt) > 0.12) {
      try { musicEl.currentTime = lastMT = Math.max(0, songPos + dt + LEAD_IN - loopBase); } catch {}
      return songPos + dt;
    }
    return s;
  }
  // Beats ahead of `from` on the practice song's grid (shifted by the loop base).
  function beatsFrom(from) {
    if (!beatList.length) { const b = globalThis.RHYTHM_BEATS?.[TRACK]; const P = 60 / (b?.bpm || 117.454), b0 = b?.beats?.[0]?.t ?? 0.1; beatList = b?.beats?.map(x => x.t) || Array.from({ length: 300 }, (_, i) => b0 + i * P); }
    const off = loopBase;
    return beatList.map(t => t + off).filter(t => t > from);
  }

  // ---- obstacles on the beat ----
  function spawn() {
    if (phase !== 'run') return;
    const L = LESSONS[step];
    while (level.filter(o => o.t > songPos).length < 2) {
      const ahead = beatsFrom(Math.max(songPos + 1.6, nextBeat + 0.01));
      const t = ahead[L.every - 1] ?? ahead[ahead.length - 1];
      if (t == null || t <= nextBeat) { nextBeat = songPos + 2; return; }
      level.push({ t, type: L.type, lesson: step });
      if (L.orb) orbsLive.push({ t: t + 0.08, y: GROUND - B * 2.4, used: false, lesson: step });   // just past the top of the jump over it
      nextBeat = t;
    }
  }
  function miss() {   // replaces die() while practising
    const nowS = performance.now() / 1000;
    if (nowS < invulnUntil) return;
    invulnUntil = nowS + 0.9; combo = 0; perfectRun = 0;
    const ob = level.filter(o => !o.done).sort((a, b) => Math.abs(a.t - songPos) - Math.abs(b.t - songPos))[0];
    if (ob) ob.failed = true;
    floats.push({ text: 'おしい！', x: player.x + B / 2, y: player.y - 20, l: 1, c: '#ffb3c8' });
    q('tutorial-feedback').textContent = LESSONS[step].type === 'tower' ? 'もう少し長く押してみよう。' : '輪が ♪ に重なる瞬間をねらおう。';
  }
  function dots() {
    const L = LESSONS[step];
    q('tutorial-dots').innerHTML = Array.from({ length: L.need }, (_, i) => `<i class="${i < cleared ? 'on' : ''}"></i>`).join('');
  }
  function coach(done) {
    const L = LESSONS[step];
    guide.dataset.hand = L.hand; guide.classList.toggle('success', done);
    [...guide.querySelectorAll('.tutorial-pips i')].forEach((pip, i) => pip.className = i < step || (done && i === step) ? 'done' : i === step ? 'on' : '');
    q('tutorial-title').textContent = done ? 'NICE!' : L.word; q('tutorial-message').textContent = done ? L.ok : L.text;
    q('tutorial-title').setAttribute('aria-label', done ? 'できた！' : `${step + 1} / 3 ${L.title}`);
  }
  function prepare() {
    const L = LESSONS[step];
    cleared = 0; phase = 'run'; isDown = false; tapAt = -9; holdJump = 0;
    // what the previous drill still had on its way does not roll into this one
    level = level.filter(o => o.t < songPos); orbsLive = orbsLive.filter(o => o.t < songPos);
    if (noteJudgeIdx > level.length) noteJudgeIdx = level.length;
    coach(false); q('tutorial-feedback').textContent = '';
    q('tutorial-done').hidden = true; dots();
    nextBeat = songPos + 0.6;
  }
  function succeed() {
    phase = 'done'; phaseAt = songPos;
    const last = step === LESSONS.length - 1;
    coach(true); q('tutorial-feedback').textContent = last ? '' : '次の練習へ ▶';
    // between drills the card says NICE!; the whole practice ends with a big banner
    const d = q('tutorial-done'); d.hidden = !last;
    if (last) d.innerHTML = `<b>練習クリア！</b><span>${entry === 'onboarding' ? 'ステージ1へ！' : 'いつでも、ここで練習できます。'}</span>`;
    window.beatPSF?.event('tutorial_step', entry, 'step_' + (step + 1));
  }

  function run(source = 'optional') {
    if (active) return promise;
    promise = new Promise(r => resolveRun = r); active = true; paused = false; step = 0;
    entry = source === 'onboarding' ? 'onboarding' : 'optional'; window.beatPSF?.event('tutorial_start', entry);
    $('ui-panel').hidden = true; $('menu').style.display = 'none'; $('stageSelect').style.display = 'none'; $('loginov').style.display = 'none';
    setupRun(0, { duration: AUDIO_TRACKS[STAGES[0].file].duration }, []); stopMusic();
    practice = true; duration = 1e6; level = []; beats = []; flipZones = []; coinDefs = []; coinsLive = []; orbDefs = []; orbsLive = [];
    score = 0; combo = 0; maxCombo = 0; coinRun = 0; songPos = -LEAD_IN; beatIdx = 0; noteJudgeIdx = 0; nearIdx = 0; state = 'play';
    player.y = GROUND - B; player.vy = 0; player.grounded = true; lastGdir = 1;
    floats.length = 0; rings.length = 0; particles.length = 0;
    realDie = die; die = miss;
    guide.hidden = false; q('tutorial-resume').hidden = true; $('backbtn').style.display = 'none';
    prepare(); startMusic(songPos);
    return promise;
  }
  function finish() {
    if (!active) return;
    window.beatPSF?.event(step === LESSONS.length - 1 && phase === 'done' ? 'tutorial_complete' : 'tutorial_exit', entry, 'step_' + (step + 1));
    localStorage.setItem(KEY, 'done'); active = false; guide.hidden = true; isDown = false; tapAt = -9;
    if (realDie) { die = realDie; realDie = null; }
    if (typeof stopPreview === 'function' && previewing?.generation === gen) stopPreview();
    state = 'menu'; coinRun = 0; level = []; orbsLive = []; backToMenu(); practice = false; resolveRun(true); $('help-open').focus();
  }
  function pause() {
    if (!active) return; paused = true; isDown = false; tapAt = -9;
    if (ours()) musicEl.pause();
    q('tutorial-resume').hidden = false; q('tutorial-feedback').textContent = '一時停止中';
  }
  function resume() {
    paused = false; q('tutorial-resume').hidden = true; q('tutorial-feedback').textContent = '';
    if (previewing?.generation === gen && musicEl?.paused) musicEl.play().catch(() => {}); else if (!ours()) startMusic(songPos);
  }
  function tick(dt) {
    if (paused || document.hidden) return;
    spawn();
    update(dt, clock(dt));
    // grade what has gone past
    for (const ob of level) {
      if (ob.done || ob.lesson !== step || songPos < ob.t + 0.35) continue;
      ob.done = true;
      if (phase !== 'run' || LESSONS[step].orb) continue;
      if (!ob.failed) { cleared++; dots(); q('tutorial-feedback').textContent = cleared < LESSONS[step].need ? 'いいね！ その調子。' : ''; }
    }
    if (LESSONS[step].orb && phase === 'run') {
      for (const o of orbsLive) if (o.used && !o.counted && o.lesson === step) { o.counted = true; cleared++; dots(); q('tutorial-feedback').textContent = 'ナイス！ 空中でもう一度跳べた。'; }
      for (const o of orbsLive) if (!o.used && !o.missed && o.lesson === step && songPos > o.t + 0.3) { o.missed = true; q('tutorial-feedback').textContent = 'ジャンプ中、輪に近づいたらもう一度タップ！'; }
    }
    if (phase === 'run' && cleared >= LESSONS[step].need) succeed();
    if (phase === 'done' && songPos - phaseAt > 1.6 && player.grounded) {
      if (step === LESSONS.length - 1) finish(); else { step++; prepare(); }
    }
  }
  q('tutorial-skip').onclick = finish;
  q('tutorial-resume').onclick = resume;
  $('help-open').onclick = () => run();
  window.cosmiiTutorial = { run, tick, pause, get active() { return active; }, get step() { return step; },
    // Stage 1 teaches itself on the first launch (cosmii-guide.js); this practice is from 遊び方 only.
    before: () => Promise.resolve(true) };
})();
