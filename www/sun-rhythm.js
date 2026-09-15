/* SUN POWER drives a continuous-play FEVER. No alternate controls or music. */
(() => {
  'use strict';
  const artwork = ['10','07','08','09','11','12','13'];
  const artworkImages = COLLAB.enabled === true ? Object.fromEntries(artwork.map(n => {
    const image = new Image();
    image.decoding = 'async';
    image.src = COLLAB.assetRoot + 'ohsun_' + n + '.png';
    return [n, image];
  })) : {};
  const iosPerformance = !!window.rdIOSPerformance;
  function makeDrawCache(image) {
    if (!iosPerformance || !image.naturalWidth || image._rdDrawCache) return;
    const maxSide = 256;
    const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    canvas.getContext('2d', { alpha: true }).drawImage(image, 0, 0, canvas.width, canvas.height);
    image._rdDrawCache = canvas;
  }
  const preload = Promise.all(Object.values(artworkImages).map(image => {
    const decoded = image.decode ? image.decode().catch(() => {}) : Promise.resolve();
    return Promise.race([decoded, new Promise(resolve => setTimeout(resolve, 1500))])
      .then(() => makeDrawCache(image));
  }));
  const charged = new Set();
  let nextArtwork = 0, currentArtwork = null, currentImage = null;
  let power = 0, running = false, startedAt = 0;
  let feverCount=0,feverSeconds=0,lastSample=0;
  let meterLabel='', meterValue=-1, meterSeconds=-1, meterTextKey='', meterEnding=false;
  const enabled = () => !!window.collaboration?.active() && !dailyMode() && !practice;
  const meter = document.createElement('div');
  meter.id = 'sun-power'; meter.hidden = true;
  meter.innerHTML = '<span>SUN POWER</span><progress max="100" value="0" aria-label="SUN POWER"></progress><b>0%</b>';
  app.appendChild(meter);
  const meterLabelEl = meter.querySelector('span');
  const meterProgressEl = meter.querySelector('progress');
  const meterValueEl = meter.querySelector('b');
  let meterHidden = true;
  function charge(judgement, noteId) {
    if (!enabled() || state !== 'play' || feverOn || charged.has(noteId)) return;
    const amount = { PERFECT:14, GREAT:9, GOOD:5 }[judgement] || 0;
    if (!amount) return;
    charged.add(noteId); power = Math.min(100, power + amount);
  }
  function reset() {
    if (running) { feverOn = false; fever = 0; feverGraceUntil = 0; }
    power = 0; running = false; charged.clear();
    if (!meterHidden) { meter.hidden = true; meterHidden = true; }
    feverCount=0;feverSeconds=0;lastSample=0;
    currentArtwork = null; currentImage = null;
    meterLabel=''; meterValue=-1; meterSeconds=-1; meterTextKey=''; meterEnding=false;
  }
  function tick() {
    const hidden = !enabled() || !['ready','play','dead'].includes(state);
    if (hidden !== meterHidden) { meter.hidden = hidden; meterHidden = hidden; }
    if (!enabled()) { if (running) reset(); return; }
    if(!running && power>0) currentImage = artworkImages[artwork[nextArtwork]];
    if(running && state==='play')feverSeconds+=Math.max(0,Math.min(0.1,songPos-lastSample));
    lastSample=songPos;
    if (power >= 100 && state === 'play' && !feverOn) {
      power = 0; startedAt = songPos; running = true;
      feverCount++;
      currentArtwork = artwork[nextArtwork];
      nextArtwork = (nextArtwork + 1) % artwork.length;
      currentImage = artworkImages[currentArtwork];
      activateFever(10);
      gaDesign('SUN:Start', 1);
      if (window.__rdPerf) window.__rdPerf.sunStarts++;
    }
    if (running && !feverOn) {
      running = false;
      if (state === 'play') gaDesign('SUN:Complete', 1);
    }
    const active = running && feverOn;
    const ending = active && feverEnd-songPos <= 3;
    const seconds = active ? Math.max(0, feverEnd-songPos) : -1;
    const value = active ? Math.max(0, seconds*10) : power;
    const label = active ? 'SUN FEVER ×2' : 'SUN POWER';
    if (ending !== meterEnding) { meterEnding=ending; meter.classList.toggle('ending', ending); }
    if (label !== meterLabel) { meterLabel=label; meterLabelEl.textContent=label; }
    if (Math.abs(value-meterValue) >= 0.5) { meterValue=value; meterProgressEl.value=value; }
    const textKey = active ? String(Math.floor(seconds*(iosPerformance ? 2 : 10))) : String(Math.floor(power));
    if (textKey !== meterTextKey) {
      meterTextKey=textKey;
      meterValueEl.textContent=active ? seconds.toFixed(iosPerformance ? 0 : 1)+'s' : Math.floor(power)+'%';
    }
  }
  function drawBackground(g) {
    if (!enabled() || !running || !feverOn || state !== 'play') return;
    const elapsed = songPos-startedAt;
    g.save(); g.setTransform(SC,0,0,SC,0,0);
    if (elapsed < 0.22 && !window.reducedEffects) {
      g.globalAlpha = 0.35*Math.max(0,1-elapsed/0.22);
      g.fillStyle = '#ffe449'; g.fillRect(0,0,W,DH); g.globalAlpha = 1;
    }
    if (currentImage?.complete && currentImage.naturalWidth) {
      const source = currentImage._rdDrawCache || currentImage;
      const sourceWidth = source.width || currentImage.naturalWidth;
      const sourceHeight = source.height || currentImage.naturalHeight;
      const scale = Math.min(DH*0.60/sourceHeight,W*0.6/sourceWidth);
      const w=sourceWidth*scale,h=sourceHeight*scale;
      const entry=Math.min(1,Math.max(0,elapsed/0.7));
      const rise=iosPerformance ? 0 : (1-entry)*(1-entry)*34-Math.sin(entry*Math.PI)*8;
      // Whole source image, original colors/aspect ratio; gentle whole-image motion.
      g.translate(W/2,(GROUND-h)/2+25+h/2+rise);
      if(!iosPerformance && !window.reducedEffects)g.rotate(Math.sin(elapsed*3)*0.025);
      g.drawImage(source,-w/2,-h/2,w,h);
    }
    g.restore();
  }
  window.sunRhythm={charge,reset,tick,drawBackground,enabled,preload:()=>preload,
    inspect:()=>({power,running,artwork:currentArtwork,artReady:Object.values(artworkImages).every(image=>image.complete && image.naturalWidth>0),feverCount,feverSeconds})};
})();
