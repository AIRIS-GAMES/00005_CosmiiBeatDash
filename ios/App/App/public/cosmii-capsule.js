/* In-game coins and a daily free draw. Capsule inventory is shared; outfits are per Cosmii. */
(() => {
  'use strict';
  const KEY = 'cosmii_capsule_v1', JOURNAL = 'cosmii_capsule_pending_v1', COINS = 'rdash_coins';
  const PRICE = 100, PITY = 10, BOND = 10, ROOT = 'Asset/world/capsule/';
  const colors = ['red','blue','pink','green','purple'], names = ['赤','水色','ピンク','黄緑','紫'];
  const slots = { head:'頭', face:'顔', color:'カラー' };
  const items = [
    ['phones','ヘッドホン','n','head'], ['cap','ナイトキャップ','n','head'],
    ['glasses','まるメガネ','n','face'],
    ['star','スターヘアピン','n','head'], ['bow','おおきなリボン','r','head'],
    ['shades','ネオングラス','r','face'], ['neon','ネオンカラー','r','color'],
    ['night','よぞらカラー','r','color'], ['crown','スターかんむり','sr','head'],
    ['gold','ゴールドカラー','sr','color'], ['halo','ネオンの輪','sr','head'],
  ].map(([id,name,rarity,slot]) => ({id,name,rarity,slot}));
  const byId = Object.fromEntries(items.map(item => [item.id,item]));
  const pools = Object.fromEntries(['n','r','sr'].map(rarity => [rarity,items.filter(item => item.rarity===rarity)]));
  let storageOK = true, busy = false;
  const snapshotKeys = [COINS, KEY, window.cosmiiBond.storageKey];

  function recover() {
    const raw = localStorage.getItem(JOURNAL);
    if (!raw) return;
    const snapshot = JSON.parse(raw);
    for (const key of snapshotKeys) {
      if (!(key in snapshot)) throw new Error('Invalid capsule journal');
      if (snapshot[key] === null) localStorage.removeItem(key);
      else localStorage.setItem(key, snapshot[key]);
    }
    localStorage.removeItem(JOURNAL);
    window.cosmiiBond.reload();
  }
  try { recover(); } catch { storageOK = false; }
  function read() {
    let value = {};
    try { value = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch {}
    const owned = Array.isArray(value.owned) ? [...new Set(value.owned.filter(id => Object.hasOwn(byId,id)))] : [];
    const outfits = colors.map((_,i) => Object.fromEntries(Object.keys(slots).flatMap(slot => {
      const id = value.outfits?.[i]?.[slot];
      const valid = Object.hasOwn(byId,id) && byId[id].slot === slot &&
        owned.includes(id);
      return valid ? [[slot,id]] : [];
    })));
    return { owned, outfits, freeDay:typeof value.freeDay==='string'?value.freeDay:'',
      misses:Number.isInteger(value.misses)?Math.min(PITY-1,Math.max(0,value.misses)):0 };
  }
  let saved = read();
  const free = () => saved.freeDay !== dayKey();
  const has = item => saved.owned.includes(item.id);
  const name = i => names[i]+'コスミー';
  const source = (item, direction='front') => ROOT+'items/'+item.id+'-'+direction+'.png';
  for (const [i,outfit] of saved.outfits.entries()) window.cosmiiWardrobe.setOutfit(i,outfit);

  function pull(method) {
    if (busy || !storageOK || state !== 'menu' || (method !== 'free' && method !== 'coin')) return null;
    saved = read();
    if (method === 'free' && !free()) return null;
    const coins = totalCoins();
    if (method === 'coin' && (!Number.isSafeInteger(coins) || coins < PRICE)) return null;
    busy = true;
    const roll = Math.random();
    const rarity = saved.misses >= PITY-1 || roll >= .95 ? 'sr' : roll < .70 ? 'n' : 'r';
    const pool = pools[rarity], item = pool[Math.floor(Math.random()*pool.length)];
    const duplicate = saved.owned.includes(item.id), i = skinIdx;
    const next = { ...saved, owned:duplicate?saved.owned:[...saved.owned,item.id],
      misses:rarity==='sr'?0:saved.misses+1, freeDay:method==='free'?dayKey():saved.freeDay };
    let journalWritten = false, bond;
    try {
      const snapshot = Object.fromEntries(snapshotKeys.map(key => [key,localStorage.getItem(key)]));
      localStorage.setItem(JOURNAL,JSON.stringify(snapshot));
      journalWritten = true;
      if (method === 'coin') localStorage.setItem(COINS,String(coins-PRICE));
      localStorage.setItem(KEY,JSON.stringify(next));
      if (duplicate) bond = window.cosmiiBond.gain(i,BOND,'capsule',true);
      localStorage.removeItem(JOURNAL);
      saved = next;
    } catch {
      try { if (journalWritten) recover(); } catch { storageOK = false; }
      toast('保存できなかったため、カプセルを取り消しました。');
      return null;
    } finally { busy = false; }
    if (method==='coin') gaCoins('Sink',PRICE,'Capsule','pull');
    window.beatPSF?.event('capsule_pull',method,rarity);
    if (duplicate) window.beatPSF?.event('capsule_dup',colors[i],'bond');
    if (bond?.up) window.beatPSF?.event('bond_level',colors[i],'lv_'+bond.after);
    refreshMenu();
    return {item,duplicate,i};
  }
  function equip(i,id,toggle=true) {
    if (!Number.isInteger(i) || !colors[i] || !skinUnlocked(i) || !Object.hasOwn(byId,id)) return false;
    saved = read();
    const item = byId[id];
    if (!has(item)) return false;
    const outfit = {...saved.outfits[i]}, outfits = saved.outfits.slice();
    if (toggle && outfit[item.slot]===id) delete outfit[item.slot];
    else outfit[item.slot]=id;
    outfits[i]=outfit;
    const next = {...saved,outfits};
    try { localStorage.setItem(KEY,JSON.stringify(next)); } catch {
      toast('着せかえを保存できませんでした。');
      return false;
    }
    saved = next;
    window.cosmiiWardrobe.setOutfit(i,outfit);
    window.beatPSF?.event('skin_equip',colors[i],item.slot);
    return true;
  }

  const make = (tag,cls,parent) => {
    const el = document.createElement(tag);
    if (cls) el.className=cls;
    if (parent) parent.append(el);
    return el;
  };
  const button = (parent,label,action,cls) => {
    const b=make('button',cls,parent); b.type='button'; b.textContent=label; b.onclick=action; return b;
  };
  const image = (parent,src,cls) => {
    const im=make('img',cls,parent); im.src=src; im.alt=''; return im;
  };
  const machine=make('section','capsule-shop');
  machine.id='capsule-shop';
  const cabinet=make('div','capsule-machine',machine);
  image(cabinet,ROOT+'machine.png','capsule-machine-art');
  const handle=image(cabinet,ROOT+'machine-handle.png','capsule-handle');
  const chute=image(cabinet,ROOT+'capsule-n.png','capsule-chute'); chute.hidden=true;
  const controls=make('div','capsule-controls',machine);
  make('h3','capsule-word',controls).textContent='CAPSULE';
  const pityText=make('p','capsule-pity',controls);
  const balance=make('p','capsule-balance',controls);
  const freeButton=button(controls,'今日の無料 1回',()=>animate('free'),'capsule-free');
  const payButton=button(controls,'100 コインで1回',()=>animate('coin'),'capsule-pay');
  const reveal=make('div','capsule-reveal',machine);
  reveal.hidden=true;
  reveal.setAttribute('aria-live','polite');

  const closet=make('section','capsule-closet');
  closet.id='capsule-closet';
  const wearer=make('div','capsule-wearer',closet), grid=make('div','capsule-items',closet);
  const selected=image(wearer,SKINS[0].src,'capsule-wearer-art');
  const who=make('h3','',wearer), outfitText=make('p','',wearer), tabs=make('div','capsule-tabs',wearer);
  let wearerIndex=0, animating=false, animationToken=0;
  const charButtons=colors.map((color,i)=>{
    const b=button(tabs,'',()=>{wearerIndex=i;renderCloset();});
    b.setAttribute('aria-label',name(i)); image(b,SKINS[i].src); return b;
  });
  const cards=items.map(item=>{
    const b=button(grid,'',()=>{if(equip(wearerIndex,item.id))renderCloset();},'capsule-item');
    b.dataset.item=item.id;b.dataset.rarity=item.rarity;
    if(item.slot==='color')make('i','capsule-color '+item.id,b);
    else image(b,source(item));
    const tag=make('small','capsule-rarity',b);tag.textContent=item.rarity.toUpperCase();
    const title=make('strong','',b), hint=make('small','capsule-slot',b);
    return {item,b,title,hint};
  });
  gameUI.addSection('capsule',machine);
  gameUI.addSection('closet',closet);

  const closetButton=button($('charcol'),'きせかえ',()=>openCloset(skinIdx,closetButton),'capsule-home-closet');
  const actions=make('div','capsule-home-actions',$('charcol'));
  actions.append($('rides-open'),closetButton);
  const opener=button($('home-footer'),'カプセル',()=>openMachine(opener,true),'capsule-home-open');
  opener.prepend(image(null,ROOT+'capsule-r.png','capsule-footer-icon'));
  const badge=make('i','capsule-free-dot',opener);badge.hidden=true;
  badge.setAttribute('aria-hidden','true');

  function renderShop() {
    pityText.textContent='SR確定まで あと '+(PITY-saved.misses)+' 回';
    balance.textContent='所持コイン '+totalCoins().toLocaleString();
    freeButton.textContent=free()?'今日の無料 1回':'今日の無料分は使用済み';
    freeButton.disabled=animating || !storageOK || !free();
    payButton.disabled=animating || !storageOK || totalCoins()<PRICE;
    badge.hidden=!free();
    opener.setAttribute('aria-label',free()?'カプセル・今日の無料分あり':'カプセル');
  }
  function renderCloset() {
    const i=wearerIndex;
    const equipped=saved.outfits[i];
    window.cosmiiWardrobe.setPortrait(selected,i,'front',skinImageUrl(i));
    who.textContent=name(i);
    outfitText.textContent=Object.values(equipped).map(id=>byId[id].name).join('・') || '着せかえアイテムなし';
    charButtons.forEach((b,j)=>{b.disabled=!skinUnlocked(j);b.setAttribute('aria-pressed',String(j===i));});
    for (const {item,b,title,hint} of cards) {
      const available=has(item), active=equipped[item.slot]===item.id;
      b.disabled=!available;
      b.setAttribute('aria-pressed',String(active));
      title.textContent=available?item.name:'？？？';
      hint.textContent=slots[item.slot]+(active?' ・着用中':'');
    }
  }
  function openMachine(from,track) {
    if (state!=='menu') return;
    animationToken++;animating=false;reveal.hidden=true;chute.hidden=true;
    handle.classList.remove('turn');chute.classList.remove('roll');
    saved=read();renderShop();
    gameUI.openPanel('capsule','コスミーのカプセル',from);
    if(track)window.beatPSF?.event('capsule_open','home',colors[skinIdx]);
  }
  function openCloset(i=skinIdx,from=closetButton) {
    wearerIndex=skinUnlocked(i)?i:skinIdx;
    saved=read();renderCloset();
    gameUI.openPanel('closet','きせかえ',from);
  }
  function animate(method) {
    if (animating) return;
    const prize=pull(method);
    if (!prize) { renderShop(); return; }
    const token=++animationToken;
    animating=true;reveal.hidden=true;renderShop();
    const reduced=!!window.reducedEffects || matchMedia('(prefers-reduced-motion: reduce)').matches;
    chute.src=ROOT+'capsule-'+prize.item.rarity+'.png';chute.hidden=false;
    handle.classList.toggle('turn',!reduced);chute.classList.toggle('roll',!reduced);
    setTimeout(()=>{
      if(token!==animationToken)return;
      animating=false;chute.hidden=true;
      handle.classList.remove('turn');chute.classList.remove('roll');
      showPrize(prize);
      renderShop();
      if (!$('ui-panel').hidden && $('ui-panel').dataset.section==='capsule') reveal.querySelector('button').focus();
    },reduced?130:1420);
  }
  function showPrize({item,duplicate,i}) {
    reveal.replaceChildren();
    reveal.dataset.rarity=item.rarity;
    reveal.dataset.reduced=String(!!window.reducedEffects);
    const prize=make('div','capsule-reveal-art',reveal);
    image(prize,ROOT+'capsule-open-'+item.rarity+'.png','capsule-open-shell');
    if(item.slot==='color')make('i','capsule-color '+item.id+' capsule-reveal-item',prize);
    else image(prize,source(item),'capsule-reveal-item');
    make('div','capsule-reveal-rarity',reveal).textContent=item.rarity.toUpperCase();
    make('h3','',reveal).textContent=item.name;
    if (duplicate) make('p','',reveal).textContent='もう持っているので '+name(i)+'とのきずな +10 に変わりました';
    const buttons=make('div','capsule-reveal-actions',reveal);
    button(buttons,name(i)+'に着せる',()=>{if(equip(i,item.id,false))openCloset(i,opener);});
    button(buttons,'もう1回',()=>openMachine(opener,false));
    reveal.hidden=false;
  }

  window.cosmiiCapsule={openCloset,pull,equip,items,free,inspect:()=>structuredClone(saved)};
  window.cosmiiWardrobe.setPortrait($('charimg'),skinIdx,'front',skinImageUrl(skinIdx));
  gameUI.onRefresh(renderShop);
  addEventListener('storage',e=>{
    if(e.key===KEY||e.key===COINS||e.key===window.cosmiiBond.storageKey||e.key===null){
      if(e.key===window.cosmiiBond.storageKey||e.key===null)window.cosmiiBond.reload();
      saved=read();
      saved.outfits.forEach((outfit,i)=>window.cosmiiWardrobe.setOutfit(i,outfit));
      renderShop();renderCloset();
    }
  });
  const refreshDaily=()=>{saved=read();renderShop();};
  addEventListener('focus',refreshDaily);
  setInterval(()=>{if(badge.hidden===free())renderShop();},15000);
  renderShop();
})();
