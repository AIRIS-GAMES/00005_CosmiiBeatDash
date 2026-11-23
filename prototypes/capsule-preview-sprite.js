/* Preview-only loader for the game's portrait and sheet frames. */
window.capsulePreviewSprite = (() => {
  const cache = new Map();
  async function load(color, frame) {
    const key = color+frame;
    if (cache.has(key)) return cache.get(key);
    const im = new Image(), single = frame==='front'||frame==='hands';
    const motion = frame.slice(0,-1);
    im.src = single ? 'Asset/world/cast-neon/'+color+(frame==='hands'?'-hands':'')+'.png'
      : motion==='run' ? 'Asset/world/run/'+color+'.png' : 'Asset/world/rides/'+motion+'-'+color+'.png';
    await im.decode();
    const c = document.createElement('canvas'); c.width=c.height=256;
    const g=c.getContext('2d',{willReadFrequently:true});
    if(single){
      g.drawImage(im,0,0,256,256);
      const {data}=g.getImageData(0,0,256,256);
      let l=256,t=256,r=-1,b=-1;
      for(let y=0;y<256;y++)for(let x=0;x<256;x++){
        if(data[(y*256+x)*4+3]<9)continue;
        l=Math.min(l,x);t=Math.min(t,y);r=Math.max(r,x);b=Math.max(b,y);
      }
      if(r>=l){
        const w=r-l+1,h=b-t+1,f=232/Math.max(w,h);
        const clipped=document.createElement('canvas');clipped.width=clipped.height=256;
        clipped.getContext('2d').drawImage(c,l,t,w,h,(256-w*f)/2,(256-h*f)/2,w*f,h*f);
        cache.set(key,clipped);return clipped;
      }
    }else{
      const s=im.naturalWidth/2,n=Number(frame.slice(-1));
      g.drawImage(im,n%2*s,Math.floor(n/2)*s,s,s,0,0,256,256);
    }
    cache.set(key,c);return c;
  }
  return load;
})();
