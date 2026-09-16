/* Device-readable frame diagnostics. Off by default, zero cost when off.

   Desktop Chromium renders this game at 60fps with draw() around 0.3ms, so
   judder reported from an iPhone cannot be reproduced or diagnosed here. This
   turns "it still stutters" into numbers taken on the device that stutters.

   Judder is intermittent, so the overlay accumulates a whole session as well as
   showing a live window: report() returns session percentiles and the worst
   frame seen since reset, not just the last two seconds.

   Turn on from Safari Web Inspector, or add ?perf=1 to the URL:
     perfHud.on()       // persists across reloads
     perfHud.off()
     perfHud.reset()    // start a fresh session, e.g. at the start of a run
     perfHud.report()   // session + last window, for copy-paste

   What the numbers mean:
     fps        draw() calls per second
     frame      interval between draw() calls
     draw       time inside draw() itself
     drop       intervals over 33ms, i.e. at least one missed 60Hz frame
     pos        frames where the drawn song position did not advance -
                clock judder, as opposed to slow rendering
     px         canvas backing store, and the devicePixelRatio cap in use

   Reading it:
     drop high, draw low  -> compositing or the audio pipeline, not game JS
     draw high            -> game JavaScript
     pos high, frame flat -> the media clock, not rendering

   Compare like with like: pos counts repeats of musicPosition(), so only
   compare runs over the same part of the same track. */
(function () {
  const KEY = 'rdash_perf_hud';
  const WINDOW = 120;      // frames per live window
  const MAX_SAMPLES = 30000;   // ~8 min at 60fps; counters stay exact past this
  let enabled = false;
  try {
    enabled = localStorage.getItem(KEY) === '1' || /[?&]perf=1(&|$)/.test(location.search);
  } catch (e) {}

  let box = null, prev = 0, lastWindow = null;
  const iv = [], dur = [];                 // live window
  let winDrops = 0, winFrozen = 0;
  let ses = null;

  function newSession() {
    return { t0: performance.now(), frames: 0, drops: 0, frozen: 0,
             worstFrame: 0, worstDraw: 0, iv: [], dur: [], capped: false };
  }
  ses = newSession();

  const pct = (a, p) => a.length ? a.slice().sort((x, y) => x - y)[Math.min(a.length - 1, Math.floor(a.length * p))] : 0;
  const r1 = v => Math.round(v * 10) / 10;
  const r2 = v => Math.round(v * 100) / 100;

  function ensureBox() {
    if (box) return box;
    box = document.createElement('div');
    box.id = 'perf-hud';
    box.style.cssText = 'position:fixed;left:6px;top:6px;z-index:99999;pointer-events:none;' +
      'font:11px/1.35 ui-monospace,Menlo,Consolas,monospace;color:#9fe;background:rgba(0,0,0,.62);' +
      'padding:5px 7px;border-radius:5px;white-space:pre;letter-spacing:.2px';
    document.body.appendChild(box);
    return box;
  }

  function env() {
    return {
      px: (typeof cv !== 'undefined' ? cv.width + 'x' + cv.height : '?'),
      dpr: window.devicePixelRatio || 1,
      cap: (typeof dprCap === 'function' ? dprCap() : '?'),
      smoothing: (window.gameAudio && gameAudio.clockSmoothing) ? gameAudio.clockSmoothing() : '?'
    };
  }

  function sessionStats() {
    const secs = (performance.now() - ses.t0) / 1000;
    return {
      seconds: r1(secs),
      frames: ses.frames,
      fps: ses.frames ? r1(ses.frames / secs) : 0,
      frameP50: r1(pct(ses.iv, .5)), frameP95: r1(pct(ses.iv, .95)), frameP99: r1(pct(ses.iv, .99)),
      frameWorst: r1(ses.worstFrame),
      drawP50: r2(pct(ses.dur, .5)), drawP95: r2(pct(ses.dur, .95)), drawP99: r2(pct(ses.dur, .99)),
      drawWorst: r2(ses.worstDraw),
      drops: ses.drops, dropsPerMin: secs > 0 ? r1(ses.drops / secs * 60) : 0,
      frozen: ses.frozen, frozenPct: ses.frames ? r1(100 * ses.frozen / ses.frames) : 0,
      percentileBasis: ses.iv.length, percentilesCapped: ses.capped
    };
  }

  function flush() {
    const s = sessionStats(), e = env();
    lastWindow = {
      fps: r1(1000 / (iv.reduce((a, b) => a + b, 0) / iv.length)),
      frameP50: r1(pct(iv, .5)), frameP95: r1(pct(iv, .95)), frameMax: r1(pct(iv, 1)),
      drawP50: r2(pct(dur, .5)), drawP95: r2(pct(dur, .95)), drawMax: r2(pct(dur, 1)),
      drops: winDrops, frozen: winFrozen, samples: iv.length
    };
    ensureBox().textContent =
      'fps   ' + lastWindow.fps + '   ses ' + s.fps + '\n' +
      'frame ' + lastWindow.frameP50 + ' / ' + lastWindow.frameP95 + ' / ' + lastWindow.frameMax + ' ms\n' +
      'draw  ' + lastWindow.drawP50 + ' / ' + lastWindow.drawP95 + ' / ' + lastWindow.drawMax + ' ms\n' +
      'drop  ' + lastWindow.drops + '/' + lastWindow.samples + '   ses ' + s.drops + '/' + s.frames + '\n' +
      'pos   ' + lastWindow.frozen + '/' + lastWindow.samples + '   ses ' + s.frozen + '/' + s.frames + '\n' +
      'worst frame ' + s.frameWorst + '  draw ' + s.drawWorst + '\n' +
      'px    ' + e.px + '  dpr' + e.dpr + ' cap' + e.cap + '\n' +
      'clock ' + (e.smoothing === true ? 'smoothed' : e.smoothing === false ? 'raw' : '?') +
      '  ' + s.seconds + 's';
    iv.length = 0; dur.length = 0; winDrops = 0; winFrozen = 0;
  }

  function install() {
    if (typeof window.draw !== 'function' || typeof window.musicPosition !== 'function') {
      return setTimeout(install, 250);
    }
    // Sampled where the game uses it, not from a separate animation frame: an
    // outside observer reads currentTime at a different phase and reports
    // freezes that never reach the screen.
    const realPos = window.musicPosition;
    let lastPos = null;
    window.musicPosition = function () {
      const v = realPos.apply(this, arguments);
      if (lastPos !== null && v === lastPos) { winFrozen++; ses.frozen++; }
      lastPos = v;
      return v;
    };
    const realDraw = window.draw;
    window.draw = function () {
      const t0 = performance.now();
      if (prev) {
        const d = t0 - prev;
        iv.push(d);
        if (ses.iv.length < MAX_SAMPLES) ses.iv.push(d); else ses.capped = true;
        if (d > ses.worstFrame) ses.worstFrame = d;
        if (d > 33.4) { winDrops++; ses.drops++; }
      }
      prev = t0;
      realDraw.apply(this, arguments);
      const took = performance.now() - t0;
      dur.push(took);
      if (ses.dur.length < MAX_SAMPLES) ses.dur.push(took);
      if (took > ses.worstDraw) ses.worstDraw = took;
      ses.frames++;
      if (iv.length >= WINDOW) flush();
    };
    ensureBox().textContent = 'perf hud: waiting for play';
  }

  window.perfHud = {
    on() { try { localStorage.setItem(KEY, '1'); } catch (e) {} location.reload(); },
    off() { try { localStorage.setItem(KEY, '0'); } catch (e) {} if (box) box.remove(); location.reload(); },
    reset() { ses = newSession(); iv.length = 0; dur.length = 0; winDrops = 0; winFrozen = 0; lastWindow = null; return 'session reset'; },
    report: () => ({ session: sessionStats(), window: lastWindow, env: env() })
  };
  if (enabled) install();
})();
