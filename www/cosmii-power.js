(() => {
  'use strict';
  const COINS_PER_ACTIVATION = 10;
  const FEVER_SECONDS = 10;
  const art = new Image();
  let power = 0;
  let running = false;
  let startedAt = 0;
  let lastSample = 0;
  let activationCount = 0;
  let activeSeconds = 0;
  let currentCharacter = null;

  const meter = document.createElement('div');
  meter.id = 'cosmii-power';
  meter.hidden = true;
  meter.innerHTML = '<span>POWER</span><progress max="100" value="0" aria-label="POWER"></progress><b>0%</b>';
  app.appendChild(meter);

  function collect(coins) {
    if (!Number.isFinite(coins) || coins <= 0) {
      throw new RangeError('Collected coin amount must be a positive number');
    }
    power = Math.min(100, power + coins * 100 / COINS_PER_ACTIVATION);
  }

  function reset() {
    if (running) {
      feverOn = false;
      fever = 0;
      feverGraceUntil = 0;
    }
    power = 0;
    running = false;
    startedAt = 0;
    lastSample = 0;
    activationCount = 0;
    activeSeconds = 0;
    currentCharacter = null;
    meter.hidden = true;
    meter.classList.remove('ending');
    art.removeAttribute('src');
  }

  function tick() {
    meter.hidden = !['ready', 'play', 'dead'].includes(state);

    if (running && feverOn && state === 'play') {
      activeSeconds += Math.max(0, Math.min(0.1, songPos - lastSample));
    }
    lastSample = songPos;

    if (power >= 100 && state === 'play' && !feverOn) {
      power = 0;
      startedAt = songPos;
      running = true;
      activationCount++;
      currentCharacter = SKINS[Math.floor(Math.random() * SKINS.length)];
      art.src = currentCharacter.src;
      activateFever(FEVER_SECONDS);
      gaDesign('Power:Start', 1);
    }

    if (running && !feverOn) {
      running = false;
      currentCharacter = null;
      if (state === 'play') gaDesign('Power:Complete', 1);
    }

    const active = running && feverOn;
    meter.classList.toggle('ending', active && feverEnd - songPos <= 3);
    meter.querySelector('span').textContent = active ? 'FEVER ×2' : 'POWER';
    meter.querySelector('progress').value = active
      ? Math.max(0, (feverEnd - songPos) * 100 / FEVER_SECONDS)
      : power;
    meter.querySelector('b').textContent = active
      ? Math.max(0, feverEnd - songPos).toFixed(1) + 's'
      : Math.floor(power) + '%';
  }

  function drawBackground(context) {
    if (!running || !feverOn || state !== 'play') return;
    const elapsed = songPos - startedAt;
    context.save();
    context.setTransform(SC, 0, 0, SC, 0, 0);
    if (elapsed < 0.22 && !window.reducedEffects) {
      context.globalAlpha = 0.35 * Math.max(0, 1 - elapsed / 0.22);
      context.fillStyle = '#ffe449';
      context.fillRect(0, 0, W, DH);
    }
    context.restore();
  }

  function drawArtwork(context) {
    if (!running || !feverOn || state !== 'play' || !art.complete || !art.naturalWidth) return;
    context.save();
    context.setTransform(SC, 0, 0, SC, 0, 0);
    const left = W * 0.12, top = 22;
    const maxWidth = Math.min(120, W * 0.16);
    const scale = Math.min(72 / art.naturalHeight, maxWidth / art.naturalWidth);
    const width = art.naturalWidth * scale, height = art.naturalHeight * scale;
    context.translate(left + width / 2, top + height / 2);
    context.drawImage(art, -width / 2, -height / 2, width, height);
    context.restore();
  }

  window.cosmiiPower = {
    collect,
    reset,
    tick,
    drawBackground,
    drawArtwork,
    inspect: () => ({
      power,
      running,
      character: currentCharacter?.n ?? null,
      artReady: art.complete && art.naturalWidth > 0,
      activationCount,
      activeSeconds
    })
  };
})();
