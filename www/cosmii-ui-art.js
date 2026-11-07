/* Raster chrome; text values and gameplay remain live and accessible. */
(() => {
  const images={};
  for(const key of ['panel','progress','words','japanese']){
    const im=images[key]=new Image();im.onload=()=>document.documentElement.classList.add('art-'+key+'-ready');im.src='Asset/world/ui-'+key+'.png';
  }
  const ready=im=>im.complete&&im.naturalWidth>0;
  function panel(g,x,y,w,h){
    const im=images.panel;if(!ready(im)||w<=0||h<=0)return false;
    const sw=im.naturalWidth,sh=im.naturalHeight,c=Math.min(10,w/3,h/3);
    g.save();g.filter='saturate(.55) brightness(.75)';
    const sx=[0,sw*.1,sw*.9,sw],sy=[0,sh*.1,sh*.9,sh],dx=[x,x+c,x+w-c,x+w],dy=[y,y+c,y+h-c,y+h];
    for(let row=0;row<3;row++)for(let col=0;col<3;col++)g.drawImage(im,sx[col],sy[row],sx[col+1]-sx[col],sy[row+1]-sy[row],dx[col],dy[row],dx[col+1]-dx[col],dy[row+1]-dy[row]);
    g.restore();
    return true;
  }
  function progress(g,x,y,w,h,value){
    const im=images.progress;if(!ready(im))return false;
    const sw=im.naturalWidth,sh=im.naturalHeight;
    g.drawImage(im,sw*.042,sh*.158,sw*.916,sh*.2,x,y,w,h);
    const p=Math.max(0,Math.min(1,Number.isFinite(value)?value:0));
    if(p){g.save();g.beginPath();g.rect(x,y,w*p,h);g.clip();g.drawImage(im,sw*.042,sh*.64,sw*.916,sh*.2,x,y,w,h);g.restore();}
    return true;
  }
  const words={'PERFECT!':0,PERFECT:0,GREAT:1,GOOD:2,MISS:3,'TAP!':4,'CLEAR!':5};
  function label(g,text,x,y,w,h){
    const n=words[text],im=images.words;if(n===undefined||!ready(im))return false;
    const cw=im.naturalWidth/3,ch=im.naturalHeight/2;
    g.drawImage(im,(n%3)*cw,Math.floor(n/3)*ch+ch*.36,cw,ch*.34,x-w/2,y-h*.8,w,h);return true;
  }
  function japanese(g,x,y,w,h){const im=images.japanese;if(!ready(im))return false;g.drawImage(im,55,765,1430,220,x,y,w,h);return true;}
  function homeLabel(){
    const b=document.querySelector('#continue-btn b');if(b)b.dataset.artStart=b.textContent==='はじめる'?'new':'continue';
  }
  const refresh=gameUI.refresh;gameUI.refresh=()=>{refresh();homeLabel();};homeLabel();
  window.cosmiiUIArt={panel,progress,label,japanese};
})();
