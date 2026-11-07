/* Coin-unlocked cosmetic rides. Shared across characters; physics stays unchanged. */
(() => {
  const KEY='cosmii_rides_v1', JOURNAL='cosmii_rides_pending_v1', COINS='rdash_coins';
  const names=['red','blue','pink','green','purple'];
  const catalog=[{id:'run',name:'走る',price:0,description:'いつもの軽快なステップ'},
    {id:'skate',name:'スケボー',price:300,description:'星のボードでスイスイ進もう'},
    {id:'bike',name:'自転車',price:600,description:'ペダルをこいで夜の街へ'}];
  const sheets={skate:[],bike:[]}, icons={skate:[],bike:[]};
  let pending=null, busy=false, storageOK=true;
  function restore(key,value){if(value===null)localStorage.removeItem(key);else localStorage.setItem(key,value);}
  // An interrupted purchase is rolled back before it can be retried.
  try{const raw=localStorage.getItem(JOURNAL);if(raw){const j=JSON.parse(raw);restore(COINS,j.coins);restore(KEY,j.rides);localStorage.removeItem(JOURNAL);}}catch{storageOK=false;}
  function read(){
    try{const s=JSON.parse(localStorage.getItem(KEY)||'{}'),owned=['run',...['skate','bike'].filter(id=>Array.isArray(s.owned)&&s.owned.includes(id))];return {owned,selected:owned.includes(s.selected)?s.selected:'run'};}
    catch{return {owned:['run'],selected:'run'};}
  }
  let saved=read();
  const selected=()=>saved.selected;
  function select(id){
    saved=read();
    if(busy||state!=='menu'||!saved.owned.includes(id))return false;
    const next={...saved,selected:id};
    try{localStorage.setItem(KEY,JSON.stringify(next));saved=next;}catch{toast('保存できませんでした。空き容量をご確認ください。');return false;}
    pending=null;refresh();window.beatPSF?.event('ride_select',id,names[skinIdx]);return true;
  }
  function buy(id){
    const item=catalog.find(c=>c.id===id);if(!item||!item.price||busy||state!=='menu'||!storageOK)return false;
    saved=read();if(saved.owned.includes(id))return select(id);
    const coins=totalCoins();if(!Number.isSafeInteger(coins)||coins<item.price){toast('コインが足りません。プレイやミッションで集めよう！');pending=null;refresh();return false;}
    busy=true;let before;
    try{
      before={coins:localStorage.getItem(COINS),rides:localStorage.getItem(KEY)};
      localStorage.setItem(JOURNAL,JSON.stringify(before));
      const next={owned:[...saved.owned,id],selected:id};
      localStorage.setItem(COINS,String(coins-item.price));localStorage.setItem(KEY,JSON.stringify(next));localStorage.removeItem(JOURNAL);saved=next;
    }catch{
      try{if(before){restore(COINS,before.coins);restore(KEY,before.rides);localStorage.removeItem(JOURNAL);}}catch{storageOK=false;}
      busy=false;pending=null;toast('保存できなかったため、解放を中止しました。');refresh();return false;
    }
    busy=false;pending=null;refreshMenu();refresh();toast(item.name+'を解放！ 全キャラで使えます');
    gaCoins('Sink',item.price,'Ride',id);window.beatPSF?.event('ride_unlock',id,names[skinIdx]);return true;
  }
  for(const type of ['skate','bike'])names.forEach((name,i)=>{
    const im=new Image();im.onload=()=>{
      if(im.naturalWidth!==im.naturalHeight||im.naturalWidth%2)return;
      const size=im.naturalWidth/2;
      sheets[type][i]=Array.from({length:4},(_,f)=>{const c=document.createElement('canvas');c.width=c.height=size;c.getContext('2d').drawImage(im,f%2*size,Math.floor(f/2)*size,size,size,0,0,size,size);return c;});
      icons[type][i]=sheets[type][i][0].toDataURL();refresh();
    };im.src=`Asset/world/rides/${type}-${name}.png`;
  });
  const section=document.createElement('div');section.id='ride-shop';
  section.innerHTML='<p class="ride-intro">解放した乗り物は全キャラで使えます。ジャンプ操作とキャラの得意なことは、そのまま。</p><p id="ride-balance" role="status"></p><div class="ride-grid"></div><div id="ride-confirm" hidden role="group" aria-label="解放の確認"><span></span><button id="ride-confirm-buy">解放する</button><button id="ride-cancel">やめる</button></div>';
  gameUI.addSection('rides',section);
  const opener=document.createElement('button');opener.id='rides-open';opener.type='button';$('charcol').append(opener);
  opener.onclick=()=>{pending=null;refresh();gameUI.openPanel('rides','のりもの',opener);window.beatPSF?.event('ride_shop','home',names[skinIdx]);};
  const cards=new Map();
  for(const item of catalog){
    const card=document.createElement('button');card.type='button';card.className='ride-card';card.dataset.ride=item.id;
    card.innerHTML='<img alt=""><strong></strong><small></small><span class="ride-status"></span>';
    card.querySelector('strong').textContent=item.name;card.querySelector('small').textContent=item.description;
    card.onclick=()=>{if(saved.owned.includes(item.id)){select(item.id);return;}pending=item.id;refresh();$('ride-confirm-buy').focus();};
    cards.set(item.id,card);section.querySelector('.ride-grid').append(card);
  }
  $('ride-confirm-buy').onclick=()=>{if(pending)buy(pending);};
  $('ride-cancel').onclick=()=>{const id=pending;pending=null;refresh();cards.get(id)?.focus();};
  function refresh(){
    if(!cards)return;
    const item=catalog.find(c=>c.id===saved.selected);opener.textContent='のりもの：'+item.name+' ›';
    $('ride-balance').textContent='所持コイン：'+totalCoins();
    for(const item of catalog){
      const card=cards.get(item.id),owned=saved.owned.includes(item.id),active=saved.selected===item.id;
      card.setAttribute('aria-pressed',String(active));
      card.querySelector('.ride-status').textContent=active?'✓ 使用中':owned?'乗り換える':item.price+'コインで解放';
      const image=card.querySelector('img');image.src=item.id==='run'?skinImageUrl(skinIdx):(icons[item.id][skinIdx]||skinImageUrl(skinIdx));
      image.alt=item.name;card.disabled=!storageOK&&!owned;
    }
    $('ride-confirm').hidden=!pending;
    if(pending){const item=catalog.find(c=>c.id===pending);$('ride-confirm').querySelector('span').textContent=item.name+'を'+item.price+'コインで解放しますか？';$('ride-confirm-buy').disabled=totalCoins()<item.price;}
  }
  const originalRefresh=gameUI.refresh;gameUI.refresh=()=>{originalRefresh();refresh();};
  addEventListener('storage',e=>{if(e.key===KEY||e.key===COINS){saved=read();pending=null;refresh();}});
  window.cosmiiRides={selected,select,buy,catalog,sheets,refresh,art(index,frame){return sheets[saved.selected]?.[index]?.[frame]||null;}};
  refresh();
})();
