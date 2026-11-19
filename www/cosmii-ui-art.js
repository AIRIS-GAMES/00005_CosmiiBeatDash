/* Raster chrome; text values and gameplay remain live and accessible.

   Performance: the source sheets are large (up to 2172px). Drawing sub-rects of
   them every frame, and especially drawing the HUD panel through ctx.filter,
   was the single largest per-frame cost (each filtered drawImage renders an
   offscreen layer). Every piece the game draws is therefore cut out once at
   load into a small canvas, the panel colour grade is baked into its pixels,
   and finished panels are cached per size. Per frame this leaves a handful of
   plain drawImage calls from small canvases. */
(() => {
  const images={},baked={};
  const ready=key=>!!baked[key];
  function cut(im,sx,sy,sw,sh,maxW){
    const scale=Math.min(1,maxW/sw),c=document.createElement('canvas');
    c.width=Math.max(1,Math.round(sw*scale));c.height=Math.max(1,Math.round(sh*scale));
    const g=c.getContext('2d');g.imageSmoothingQuality='high';g.drawImage(im,sx,sy,sw,sh,0,0,c.width,c.height);
    return c;
  }
  // Same result as the former ctx.filter='saturate(.55) brightness(.75)', applied once.
  function grade(c,s=.55,b=.75){
    const g=c.getContext('2d'),id=g.getImageData(0,0,c.width,c.height),d=id.data;
    const m=[.213+.787*s,.715-.715*s,.072-.072*s,.213-.213*s,.715+.285*s,.072-.072*s,.213-.213*s,.715-.715*s,.072+.928*s];
    for(let i=0;i<d.length;i+=4){
      const r=d[i],gr=d[i+1],bl=d[i+2];
      d[i]=(m[0]*r+m[1]*gr+m[2]*bl)*b;d[i+1]=(m[3]*r+m[4]*gr+m[5]*bl)*b;d[i+2]=(m[6]*r+m[7]*gr+m[8]*bl)*b;
    }
    g.putImageData(id,0,0);return c;
  }
  // Cut sizes follow the backing-store scale (SC): 1.5x the largest drawn size
  // in device pixels, never more than the source. Re-cut when SC changes, so a
  // large screen (iPad) never draws an upscaled copy.
  const scale=()=>typeof SC==='number'&&SC>0?SC:1;
  const need=css=>Math.ceil(css*scale()*1.5);
  const bakers={
    panel:im=>({src:grade(cut(im,0,0,im.naturalWidth,im.naturalHeight,need(150)))}),   // 10% corner slice drawn at 10 css px
    progress:im=>{const sw=im.naturalWidth,sh=im.naturalHeight;return {empty:cut(im,sw*.042,sh*.158,sw*.916,sh*.2,need(230)),full:cut(im,sw*.042,sh*.64,sw*.916,sh*.2,need(230))};},
    words:im=>{const cw=im.naturalWidth/3,ch=im.naturalHeight/2;return Array.from({length:6},(_,n)=>cut(im,(n%3)*cw,Math.floor(n/3)*ch+ch*.36,cw,ch*.34,need(100)));},
    japanese:im=>({start:cut(im,55,765,1430,220,need(270))})
  };
  let bakedScale=0;
  function bake(key){
    const im=images[key];if(!im.complete||!im.naturalWidth)return;
    try{baked[key]=bakers[key](im);}catch(e){console.warn('ui art bake failed:',key,e);return;}
    document.documentElement.classList.add('art-'+key+'-ready');
  }
  for(const key of Object.keys(bakers)){
    const im=images[key]=new Image();
    im.onload=()=>bake(key);
    im.src='Asset/world/ui-'+key+'.png';
  }
  // Finished panels, keyed by size and backing-store scale. The HUD uses three sizes.
  const panels=new Map();
  function panel(g,x,y,w,h){
    if(!ready('panel')||w<=0||h<=0)return false;
    const scale=typeof SC==='number'&&SC>0?SC:1,key=w.toFixed(1)+'|'+h.toFixed(1)+'|'+scale.toFixed(3);
    let c=panels.get(key);
    if(!c){
      const src=baked.panel.src,sw=src.width,sh=src.height,k=Math.min(10,w/3,h/3)*scale;
      const W=Math.ceil(w*scale),H=Math.ceil(h*scale);
      c=document.createElement('canvas');c.width=W;c.height=H;const p=c.getContext('2d');
      const sx=[0,sw*.1,sw*.9,sw],sy=[0,sh*.1,sh*.9,sh],dx=[0,k,W-k,W],dy=[0,k,H-k,H];
      for(let row=0;row<3;row++)for(let col=0;col<3;col++)p.drawImage(src,sx[col],sy[row],sx[col+1]-sx[col],sy[row+1]-sy[row],dx[col],dy[row],dx[col+1]-dx[col],dy[row+1]-dy[row]);
      if(panels.size>=24)panels.delete(panels.keys().next().value);
      panels.set(key,c);
    }
    g.drawImage(c,x,y,w,h);
    return true;
  }
  function progress(g,x,y,w,h,value){
    if(!ready('progress'))return false;
    const {empty,full}=baked.progress;
    g.drawImage(empty,x,y,w,h);
    const p=Math.max(0,Math.min(1,Number.isFinite(value)?value:0));
    if(p)g.drawImage(full,0,0,full.width*p,full.height,x,y,w*p,h);
    return true;
  }
  const words={'PERFECT!':0,PERFECT:0,GREAT:1,GOOD:2,MISS:3,'TAP!':4,'CLEAR!':5};
  function label(g,text,x,y,w,h){
    const n=words[text];if(n===undefined||!ready('words'))return false;
    g.drawImage(baked.words[n],x-w/2,y-h*.8,w,h);return true;
  }
  function japanese(g,x,y,w,h){if(!ready('japanese'))return false;g.drawImage(baked.japanese.start,x,y,w,h);return true;}
  function homeLabel(){
    const b=document.querySelector('#continue-btn b');if(b)b.dataset.artStart=b.textContent==='はじめる'?'new':'continue';
  }
  addEventListener('resize',()=>{
    panels.clear();
    if(Math.abs(scale()-bakedScale)<.01)return;
    bakedScale=scale();for(const key of Object.keys(bakers))if(baked[key])bake(key);
  });
  bakedScale=scale();
  gameUI.onRefresh(homeLabel);homeLabel();
  window.cosmiiUIArt={panel,progress,label,japanese};
})();
