/* SUN POWER drives a continuous-play FEVER. No alternate controls or music. */
(() => {
  'use strict';
  const art = new Image(), charged = new Set();
  art.onerror=()=>{if(enabled()&&running)toast('画像を読み込めませんでした（ゲームは続行できます）');};
  // Cycle all approved originals, keeping the cheering pose as the first appearance.
  // Deliberately survive reset/retry so short runs also reveal different artwork.
  const artwork = ['10','07','08','09','11','12','13'];
  let nextArtwork = 0, currentArtwork = null;
  let power = 0, running = false, startedAt = 0;
  let feverCount=0,feverSeconds=0,lastSample=0;
  const enabled = () => !!window.collaboration?.active() && !dailyMode() && !practice;
  const meter = document.createElement('div');
  meter.id = 'sun-power'; meter.hidden = true;
  meter.innerHTML = '<span>SUN POWER</span><progress max="100" value="0" aria-label="SUN POWER"></progress><b>0%</b>';
  app.appendChild(meter);
  function charge(judgement, noteId) {
    if (!enabled() || state !== 'play' || feverOn || charged.has(noteId)) return;
    const amount = { PERFECT:14, GREAT:9, GOOD:5 }[judgement] || 0;
    if (!amount) return;
    charged.add(noteId); power = Math.min(100, power + amount);
  }
  function reset() {
    if (running) { feverOn = false; fever = 0; feverGraceUntil = 0; }
    power = 0; running = false; charged.clear(); meter.hidden = true;
    feverCount=0;feverSeconds=0;lastSample=0;
    art.removeAttribute('src');
    currentArtwork = null;
  }
  function tick() {
    meter.hidden = !enabled() || !['ready','play','dead'].includes(state);
    if (!enabled()) { if (running) reset(); return; }
    if(!running && power>0){const url=COLLAB.assetRoot+'ohsun_'+artwork[nextArtwork]+'.png';if(art.getAttribute('src')!==url)art.src=url;}
    if(running && state==='play')feverSeconds+=Math.max(0,Math.min(0.1,songPos-lastSample));
    lastSample=songPos;
    if (power >= 100 && state === 'play' && !feverOn) {
      power = 0; startedAt = songPos; running = true;
      feverCount++;
      currentArtwork = artwork[nextArtwork];
      nextArtwork = (nextArtwork + 1) % artwork.length;
      art.src = COLLAB.assetRoot + 'ohsun_' + currentArtwork + '.png';
      activateFever(10);
      gaDesign('SUN:Start', 1);
    }
    if (running && !feverOn) {
      running = false;
      if (state === 'play') gaDesign('SUN:Complete', 1);
    }
    const active = running && feverOn;
    meter.classList.toggle('ending', active && feverEnd-songPos <= 3);
    meter.querySelector('span').textContent = active ? 'SUN FEVER ×2' : 'SUN POWER';
    meter.querySelector('progress').value = active ? Math.max(0, (feverEnd-songPos)*10) : power;
    meter.querySelector('b').textContent = active ? Math.max(0,feverEnd-songPos).toFixed(1)+'s' : Math.floor(power)+'%';
  }
  function drawBackground(g) {
    if (!enabled() || !running || !feverOn || state !== 'play') return;
    const elapsed = songPos-startedAt;
    g.save(); g.setTransform(SC,0,0,SC,0,0);
    if (elapsed < 0.22 && !window.reducedEffects) {
      g.globalAlpha = 0.35*Math.max(0,1-elapsed/0.22);
      g.fillStyle = '#ffe449'; g.fillRect(0,0,W,DH); g.globalAlpha = 1;
    }
    g.restore();
  }
  function drawArtwork(g) {
    if (!enabled() || !running || !feverOn || state !== 'play') return;
    g.save(); g.setTransform(SC,0,0,SC,0,0);
    if (art.complete && art.naturalWidth) {
      // Inset from the phone's cutout edge and the top; use the space left of HUD.
      const left = W*0.12, top = 22;
      const maxWidth = Math.min(120,W*0.16);
      // Keep the same size throughout FEVER, including inverted course sections.
      const scale = Math.min(72/art.naturalHeight,maxWidth/art.naturalWidth);
      const w=art.naturalWidth*scale,h=art.naturalHeight*scale;
      // Keep the whole original image within the reserved space, without bobbing.
      g.translate(left+w/2,top+h/2);
      g.drawImage(art,-w/2,-h/2,w,h);
    }
    g.restore();
  }
  window.sunRhythm={charge,reset,tick,drawBackground,drawArtwork,enabled,
    inspect:()=>({power,running,artwork:currentArtwork,artReady:art.complete && art.naturalWidth>0,feverCount,feverSeconds})};
})();
