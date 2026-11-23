/* Compose cosmetic art when assets or equipment change, outside the draw loop. */
(() => {
  'use strict';
  const colors = ['red', 'blue', 'pink', 'green', 'purple'];
  const anchors = window.COSMII_WARDROBE_ANCHORS;
  const root = 'Asset/world/capsule/items/';
  const ids = ['phones','cap','glasses','star','bow','shades','crown','halo'];
  const art = Object.fromEntries(ids.map(id => [id, {}]));
  const wornPhones = {};
  const capFit = new WeakMap();
  const orderedSlots = ['face', 'head'];
  const frames = colors.map(() => ({}));
  const equipment = colors.map(() => ({}));
  const portraits = new WeakMap();
  const colorSprites = new WeakMap();
  const size = 288, inset = 32, full = size + inset * 2;
  const treatment = {
    phones: [1.32,0,.082], star: [.32,-.32,.04], bow: [.68,0,-.06],
    crown: [.66,0,-.10], halo: [.86,0,-.16], glasses: [1,0,0], shades: [1,0,0],
  };

  function source(i, pose) {
    if (pose === 'front') return typeof skinImage === 'function' ? skinImage(i) : null;
    if (pose === 'hands') return window.cosmiiCharacterMotion?.poses[i];
    const type = pose.slice(0, -1), frame = +pose.slice(-1);
    return type === 'run' ? window.cosmiiCharacterMotion?.runs[i]?.[frame] : window.cosmiiRides?.sheets[type]?.[i]?.[frame];
  }
  function tinted(base, color) {
    if (!color) return base;
    let variants = colorSprites.get(base);
    if (!variants) { variants = {}; colorSprites.set(base, variants); }
    if (variants[color]) return variants[color];
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const g = canvas.getContext('2d', { willReadFrequently: true });
    g.drawImage(base,0,0,size,size);
    const pixel = g.getImageData(0, 0, size, size), data = pixel.data;
    for (let p = 0; p < data.length; p += 4) {
      if (!data[p+3]) continue;
      const r = data[p], green = data[p+1], b = data[p+2];
      const max = Math.max(r,green,b), min = Math.min(r,green,b);
      if (max - min < 19 || max < 36 || (r > 223 && green > 177 && b > 114 && r-green < 64)) continue;
      if (color === 'gold') {
        data[p] = max; data[p+1] = min * .29 + max * .69; data[p+2] = min * .66 + max * .12;
      } else if (color === 'night') {
        data[p] = r * .38 + b * .36; data[p+1] = green * .4 + min * .32; data[p+2] = max * .89;
      } else {
        data[p] = r * 1.14 + 12; data[p+1] = green * 1.08 + 10; data[p+2] = b * 1.18 + 17;
      }
    }
    g.putImageData(pixel,0,0);
    variants[color] = canvas;
    return canvas;
  }
  function capBrimY(base, face, direction) {
    const key = face.x + '|' + face.y + '|' + direction;
    const cached = capFit.get(base);
    if (cached?.key === key) return cached.y;
    const c = document.createElement('canvas'), side = 112;
    c.width = c.height = side;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(base, 0, 0, side, side);
    const { data } = g.getImageData(0, 0, side, side);
    const candidates = [];
    for (let dx=-3;dx<=3;dx++) {
      const x = Math.round(face.x*side)+dx;
      for (let y=Math.max(0,Math.round((face.y-.27)*side));y<Math.round(face.y*side);y++) {
        const p=(y*side+x)*4, r=data[p], green=data[p+1], b=data[p+2];
        if (data[p+3]>180 && r>205 && green>153 && b>100 &&
            r-green>=7 && r-green<=67 && green-b>=11 && green-b<=86) {
          candidates.push(y/side);
          break;
        }
      }
    }
    candidates.sort((a,b)=>a-b);
    const y = candidates[Math.floor(candidates.length/2)] ?? face.y-(direction==='front'?.19:.16);
    capFit.set(base,{key,y});
    return y;
  }
  function paint(g, base, placement, outfit, direction, at = inset, span = size, portraitColor) {
    // The integrated headset keeps the ear cups outside the face. Use the
    // cut-out version when recoloring, combining with eyewear or animating.
    const dressed = outfit.head==='phones' && !outfit.face && !outfit.color && wornPhones[portraitColor];
    g.drawImage(dressed || tinted(base,outfit.color), at, at, span, span);
    for (const slot of orderedSlots) {
      const id = outfit[slot], im = art[id]?.[direction], anchor = placement[slot];
      if (!im || !anchor) continue;
      if (dressed && slot==='head') continue;
      if (id==='cap') {
        const face=placement.face, front=direction==='front';
        const w=span*(front?face.scale*1.17:anchor.scale*1.25), h=w*im.height/im.width;
        g.save();
        g.translate(at+span*face.x,at+span*(capBrimY(base,face,direction)-.012));
        g.rotate(face.rot);
        // Register the lower brim's apex on the forehead. The side hat's
        // broad back and pompom extend over the hood, away from the eyes.
        g.drawImage(im,-w*(front?.37:.76),-h*(front?.82:.45),w,h);
        g.restore();
        continue;
      }
      const [scale, dx, dy] = id==='phones'&&direction==='side' ? [1.01,-.075,.055] : treatment[id];
      const w = span * anchor.scale * scale, h = w * im.height / im.width;
      g.save();
      g.translate(at + span*(anchor.x + dx*anchor.scale), at + span*(anchor.y + dy));
      g.rotate(anchor.rot);
      g.drawImage(im, -w/2, -h/2, w, h);
      g.restore();
    }
  }
  function bake(i) {
    const outfit = equipment[i], dressed = Object.values(outfit).some(Boolean);
    const next = {};
    if (dressed) {
      for (const [pose, placement] of Object.entries(anchors[colors[i]])) {
        const base = source(i, pose);
        if (!base) continue;
        const c = document.createElement('canvas');
        c.width = c.height = full;
        paint(c.getContext('2d'), base, placement, outfit, /^(front|hands)$/.test(pose) ? 'front' : 'side',
          inset, size, pose==='front'?colors[i]:undefined);
        next[pose] = { base, canvas: c };
      }
    }
    frames[i] = next;
    for (const el of document.querySelectorAll('[data-wardrobe-portrait]')) {
      const binding = portraits.get(el);
      if (binding?.i === i) renderPortrait(el, binding);
    }
  }
  function setOutfit(i, next) { equipment[i] = { ...next }; bake(i); }
  function draw(g, i, pose, base, x, y, w, h) {
    const frame = frames[i]?.[pose];
    if (frame?.base === base) {
      const pad = inset / size;
      g.drawImage(frame.canvas, x-w*pad, y-h*pad, w*(1+2*pad), h*(1+2*pad));
    } else g.drawImage(base,x,y,w,h);
  }
  function portrait(i, pose = 'front') {
    const frame = frames[i]?.[pose];
    return frame ? (frame.url ||= frame.canvas.toDataURL()) : '';
  }
  function renderPortrait(el, binding) {
    const dressed = portrait(binding.i, binding.pose);
    el.dataset.wardrobeDressed = String(!!dressed);
    const url = dressed || binding.fallback;
    if (el.getAttribute('src') !== url) el.src = url;
  }
  function setPortrait(el, i, pose, fallback) {
    const binding = { i, pose, fallback };
    portraits.set(el, binding);
    el.dataset.wardrobePortrait = '';
    renderPortrait(el, binding);
  }
  for (const id of ids) for (const direction of ['front','side']) {
    const im = new Image();
    im.onload = () => {
      const c = document.createElement('canvas');
      c.width = im.naturalWidth; c.height = im.naturalHeight;
      const g = c.getContext('2d', { willReadFrequently: true });
      g.drawImage(im,0,0);
      const { data } = g.getImageData(0,0,c.width,c.height);
      let l=c.width,t=c.height,r=-1,b=-1;
      for(let y=0;y<c.height;y++) for(let x=0;x<c.width;x++) {
        if(data[(y*c.width+x)*4+3]<24)continue;
        l=Math.min(l,x);t=Math.min(t,y);r=Math.max(r,x);b=Math.max(b,y);
      }
      if(r<l)return;
      const sprite=document.createElement('canvas'), sw=r-l+1, sh=b-t+1;
      const fit=Math.min(1,160/Math.max(sw,sh));
      sprite.width=Math.max(1,Math.round(sw*fit));sprite.height=Math.max(1,Math.round(sh*fit));
      sprite.getContext('2d').drawImage(c,l,t,sw,sh,0,0,sprite.width,sprite.height);
      art[id][direction] = sprite;
      for (let i=0;i<colors.length;i++) if (Object.values(equipment[i]).includes(id)) bake(i);
    };
    im.src = root + id + '-' + direction + '.png';
  }
  for (const [i,color] of colors.entries()) {
    const im = new Image();
    im.onload = () => {
      wornPhones[color] = im;
      if (equipment[i].head==='phones') bake(i);
    };
    im.src = root + 'phones-worn-' + color + '.png';
  }
  window.cosmiiWardrobe = { setOutfit, bake, draw, portrait, setPortrait, source, paint, anchors };
})();
