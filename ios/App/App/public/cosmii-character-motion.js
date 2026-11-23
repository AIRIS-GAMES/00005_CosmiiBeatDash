// Visual-only character acting. Physics, judgement and ability values stay in the game.
(() => {
  const poses = [], runs = [], events = [], started = new Map();
  const clock = () => performance.now()/1000;
  const colors = ['#ffe16a','#81eaff','#ff92cc','#c5ff82','#d5a0ff'];
  const labels = ['リズム上手！','ナイスステップ','みーつけた！','ふわ〜り','いたずら回避！'];
  ['red','blue','pink','green','purple'].forEach((name,i)=>{
    const image=new Image();
    image.onload=()=>{poses[i]=trimSprite(image);window.cosmiiWardrobe?.bake(i);};
    image.src=`Asset/world/cast-neon/${name}-hands.png`;
    const run=new Image();
    run.onload=()=>{
      if(run.naturalWidth!==run.naturalHeight||run.naturalWidth%2)return;
      const size=run.naturalWidth/2;
      // Preserve the shared scale and foot anchor baked into the generated sheet.
      // Do not trim each frame separately: that would make the body pulse in size.
      runs[i]=Array.from({length:4},(_,frame)=>{
        const canvas=document.createElement('canvas');canvas.width=canvas.height=size;
        canvas.getContext('2d').drawImage(run,(frame%2)*size,Math.floor(frame/2)*size,size,size,0,0,size,size);
        return canvas;
      });
      window.cosmiiWardrobe?.bake(i);
    };
    run.src=`Asset/world/run/${name}.png`;
  });
  function emit(kind, x, y) {
    const now=clock();
    if(kind==='jump') { started.set('jump',now); return; }
    if(kind==='coin' && skinIdx!==2) return;
    if(kind==='hold' && (skinIdx!==3 || now-(started.get('hold')??-9)<0.8)) return;
    if(kind==='judge' && skinIdx!==0 && skinIdx!==1) return;
    started.set(kind,now); started.set('reaction',now);
    // Coalesce consecutive pickups; limit effects so they never hide the next obstacle.
    if(events.some(e=>e.kind===kind&&now-e.at<0.18)) return;
    events.push({kind,at:now,idx:skinIdx,x:x??player.x+B/2,y:y??player.y+B/2});
    if(events.length>8) events.shift();
  }
  function pose(now=clock()) {
    const jumpAge=now-(started.get('jump')??-9), landAge=now-landAt;
    const squash=[.2,.12,.24,.16,.18][skinIdx];
    let sx=1,sy=1,tilt=0;
    if(player.grounded) {
      const k=Math.exp(-Math.max(0,landAge)/.11);
      sx+=squash*k;sy-=squash*k;
      tilt=Math.sin(Math.max(0,landAge)*24)*k*[.08,.12,.08,.04,-.14][skinIdx];
    } else {
      // Anticipation is visual only: there is no input delay.
      const launch=Math.max(0,1-jumpAge/.09);
      sx=1+launch*.14;sy=1-launch*.12;
      const v=Math.tanh(player.vy/400)*lastGdir;
      tilt=[-.12,.16,-.1,.04,-.18][skinIdx]*v;
      sy+=(1-launch)*[.06,.03,.08,.02,.04][skinIdx];
    }
    const reacting=now-(started.get('reaction')??-9)<.65;
    const airborne=!player.grounded && (skinIdx!==4 || reacting);
    if(window.reducedEffects){sx=1;sy=1;tilt=0;}
    // Distance-driven stride stays in sync with scrolling, freezes on pause and
    // restarts deterministically on retry. A tucked-foot frame is used in the air.
    const frame=window.reducedEffects||!player.grounded||state==='ready'?1:
      Math.floor(Math.max(0,songPos)*SPEED/160*4)%4;
    const ride=window.cosmiiRides?.art(skinIdx,frame);
    const rideType=ride?cosmiiRides.selected():'run';
    if(ride){sx=1;sy=1;tilt*=.4;}
    const run=runs[skinIdx]?.[frame], hands=(reacting||airborne)&&poses[skinIdx];
    return {sx,sy,tilt,image:ride||run||hands||skinImage(skinIdx),reacting,frame,
      wardrobePose:ride?rideType+frame:run?'run'+frame:hands?'hands':'front',
      artScale:rideType==='bike'?1.9:rideType==='skate'?1.65:1.35};
  }
  // Stroked Japanese text is rasterised once per label and scale instead of
  // every frame for the 0.7s each reaction is shown (the default character
  // reacts on every PERFECT).
  const labelCache=new Map();
  const clearLabels=()=>labelCache.clear();
  addEventListener('resize',clearLabels);document.fonts?.addEventListener?.('loadingdone',clearLabels);
  function labelSprite(idx){
    const scale=typeof SC==='number'&&SC>0?SC:1,key=idx+'|'+scale.toFixed(3);
    let c=labelCache.get(key);if(c)return c;
    const font='700 10px "Exo 2", "M PLUS 1p", sans-serif',pad=3;
    const probe=document.createElement('canvas').getContext('2d');probe.font=font;
    const w=Math.ceil(probe.measureText(labels[idx]).width)+pad*2,h=16,base=12;
    c=document.createElement('canvas');c.width=Math.ceil(w*scale);c.height=Math.ceil(h*scale);
    const g=c.getContext('2d');g.scale(scale,scale);g.font=font;g.textAlign='center';
    g.lineWidth=3;g.strokeStyle='#15112c';g.fillStyle=colors[idx];
    g.strokeText(labels[idx],w/2,base);g.fillText(labels[idx],w/2,base);
    c.cssW=w;c.cssH=h;c.cssBase=base;labelCache.set(key,c);return c;
  }
  function drawEffects(ctx) {
    if(window.reducedEffects){events.length=0;return;}
    const now=clock();
    for(let i=events.length-1;i>=0;i--) {
      const e=events[i],age=now-e.at;if(age>0.7){events.splice(i,1);continue;}
      const k=age/.7,cx=player.x+B/2,cy=player.y+B/2;
      ctx.save();ctx.globalAlpha=(1-k)*.85;
      if(e.kind==='coin' && coinImg.complete && coinImg.naturalWidth) {
        const t=Math.min(1,k*2);ctx.drawImage(coinSprite,e.x+(cx-e.x)*t-6,e.y+(cy-e.y)*t-6,12,12);
      } else {
        // Image echoes convey floating, a proud pose, or a disappearing trick.
        const im=window.cosmiiRides?.art(e.idx,1)||runs[e.idx]?.[1]||poses[e.idx]||skinImage(e.idx);
        if(im){ctx.globalAlpha=(1-k)*.22;const s=B*(1+k*.65);ctx.drawImage(im,cx-s/2,cy-s/2,s,s);}
      }
      ctx.globalAlpha=1-k;
      const tag=labelSprite(e.idx);
      ctx.drawImage(tag,cx-tag.cssW/2,cy-B*.85-k*14-tag.cssBase,tag.cssW,tag.cssH);
      ctx.restore();
    }
  }
  window.cosmiiCharacterMotion={emit,pose,drawEffects,reset(){events.length=0;started.clear();},poses,runs};
})();
