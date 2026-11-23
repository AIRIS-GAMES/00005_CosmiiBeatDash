// First launch and first sightings, inside real play.
//  - First launch: no home screen and no story - once loaded, straight to the
//    stage 1 start screen. The daily bonus waits for the first return home.
//  - Stage 1, first play: a coach card walks the player through the first four
//    notes (TAP!); a hit there is "おしい！", not a miss. Then it is a normal run.
//  - The first tall block anywhere (HOLD!) and the first orb (AIR TAP!) get the
//    same card once, just before they arrive. The tall block is forgiven once.
// From the second launch the game opens on the home screen as usual.
(function () {
  'use strict';
  const FIRST = 'rdash_first_run', SEEN = { tap: 'rdash_guide_tap', hold: 'rdash_guide_hold', orb: 'rdash_guide_orb' };
  const HIGH = new Set(['tower', 'steps']);   // blocks taller than a plain jump clears comfortably
  const TAP_NOTES = 4;
  const get = k => { try { return localStorage.getItem(k); } catch { return '1'; } };
  const set = (k, v = '1') => { try { localStorage.setItem(k, v); } catch {} };
  const story = () => { try { return JSON.parse(localStorage.getItem('cosmii_dash_story_v1') || '{}'); } catch { return {}; } };

  // ---------- first launch ----------
  // A brand-new player: nothing played, no story or practice seen, no earlier first run.
  const isFirstRun = () => !DEMO && !get(FIRST) && best(0) === 0 && !story().opening && !get('cosmii_tutorial_v2') && !get('cosmii_tutorial_v1');
  let bonusLater = false;
  function startFirstRun() {
    set(FIRST); bonusLater = true;
    window.beatPSF?.event('first_run', 'stage_1');
    selectStage(0);
  }

  // ---------- the coach card ----------
  const card = document.createElement('section'); card.id = 'play-guide'; card.hidden = true; card.setAttribute('aria-live', 'polite');
  card.innerHTML = '<div class="pg-card"><span class="pg-hand" aria-hidden="true"></span><div class="pg-copy"><strong></strong><p></p><span class="pg-dots" aria-hidden="true"></span></div></div>';
  $('app').append(card);
  const word = card.querySelector('strong'), line = card.querySelector('p'), dotsEl = card.querySelector('.pg-dots');
  function show(kind, w, text, hand, dots) {
    card.hidden = false; card.dataset.hand = hand; card.classList.toggle('success', kind === 'nice');
    if (word.textContent !== w) word.textContent = w;
    if (line.textContent !== text) line.textContent = text;
    const html = dots ? Array.from({ length: dots[1] }, (_, i) => `<i class="${i < dots[0] ? 'on' : ''}"></i>`).join('') : '';
    if (dotsEl.innerHTML !== html) dotsEl.innerHTML = html;
  }
  const hide = () => { card.hidden = true; };

  // ---------- forgiving hits while guiding ----------
  let protect = false, missedAt = -9;
  const realDie = die;
  die = function () {
    if (protect && state === 'play') {
      const nowS = performance.now() / 1000;
      if (nowS < invulnUntil) return;
      invulnUntil = nowS + 0.9; combo = 0; perfectRun = 0; missedAt = nowS;
      floats.push({ text: 'おしい！', x: player.x + B / 2, y: player.y - 20, l: 1, c: '#ffb3c8' });
      return;
    }
    return realDie.apply(this, arguments);
  };

  // ---------- what to guide right now ----------
  let nice = null, holdTarget = null, orbTarget = null, attempt = null;
  const notes = () => level.filter(o => !isFreeNote(o));
  function frame() {
    requestAnimationFrame(frame);
    if (bonusLater && bootDone && state === 'menu' && getComputedStyle($('menu')).display !== 'none') { bonusLater = false; checkLoginBonus(); }
    const live = (state === 'play' || state === 'paused') && !window.cosmiiTutorial?.active && stageIdx < NSTAGE;
    if (!live) { protect = false; nice = null; holdTarget = orbTarget = null; attempt = null; hide(); return; }
    if (state === 'paused') return;
    const nowS = performance.now() / 1000, recent = nowS - missedAt < 1.2;
    // a fresh attempt restarts the stage-1 walk-through until it has been finished once
    if (attempt !== attempts) { attempt = attempts; nice = null; }
    if (nice) { if (nowS < nice.until) { show('nice', 'NICE!', nice.text, nice.hand); protect = false; return; } nice = null; }

    // 1. stage 1: the first notes
    if (stageIdx === 0 && !get(SEEN.tap)) {
      const passed = notes().filter(o => o.t - TAP_OFFSET < songPos - 0.21).length;
      if (passed < TAP_NOTES) {
        protect = true;
        show('tap', 'TAP!', recent ? 'おしい！ 輪が ♪ に重なる瞬間に' : '♪ に輪が重なったら、タップ', 'tap', [passed, TAP_NOTES]);
        return;
      }
      set(SEEN.tap); window.beatPSF?.event('guide_done', 'tap');
      nice = { until: nowS + 1.6, text: 'このまま、最後まで走ろう！', hand: 'tap' };
      protect = false; return;
    }
    // 2. the first tall block
    if (!get(SEEN.hold)) {
      if (!holdTarget) holdTarget = level.find(o => HIGH.has(o.type) && o.t - songPos > 0.2 && o.t - songPos < 2.2) || null;
      if (holdTarget) {
        if (songPos < holdTarget.t + 0.45) {
          protect = holdTarget.t - songPos < 0.9;   // forgiven this once
          show('hold', 'HOLD!', recent ? 'もう少し長く押してみよう' : '高いブロックは、押したままで高くジャンプ', 'hold');
          return;
        }
        set(SEEN.hold); window.beatPSF?.event('guide_done', 'hold'); holdTarget = null; protect = false;
        nice = { until: nowS + 1.2, text: '長押しで、高くとべる！', hand: 'hold' }; return;
      }
    }
    protect = false;
    // 3. the first orb (a bonus: nothing to forgive)
    if (!get(SEEN.orb)) {
      if (!orbTarget) orbTarget = orbsLive.find(o => !o.used && o.t - songPos > 0.2 && o.t - songPos < 1.8) || null;
      if (orbTarget) {
        if (songPos < orbTarget.t + 0.4 && !orbTarget.used) { show('orb', 'AIR TAP!', 'ジャンプ中、光る輪でもう一回タップ', 'tap'); return; }
        set(SEEN.orb); window.beatPSF?.event('guide_done', orbTarget.used ? 'orb' : 'orb_missed');
        nice = orbTarget.used ? { until: nowS + 1.2, text: '空中でもう一回とべた！', hand: 'tap' } : null; orbTarget = null; return;
      }
    }
    hide();
  }
  requestAnimationFrame(frame);

  window.cosmiiGuide = { isFirstRun, startFirstRun };
})();
