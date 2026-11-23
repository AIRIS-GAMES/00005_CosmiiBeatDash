// Bond with each Cosmii (きずな): playing, PERFECTs and petting raise it, and
// every level lets the player do one more thing with that character.
//   Lv1  talk on the home screen (tap) / a word on the result card and on a miss
//   Lv2  petting (long press) / secret 1 in the profile
//   Lv3  a postcard from that Cosmii at the next launch (るすばん日記)
//   Lv4  secret 2 / a welcome pose and greeting on the home screen
//   Lv5  secret 3 / a なかよし badge
// Lines, secrets and postcards follow Cosmii_Wiki; they are placeholders to be
// checked against the series canon. Visual only: no effect on judging or score.
(function () {
  'use strict';
  const KEY = 'rdash_bond_v1';
  const LEVELS = [0, 20, 60, 120, 200];   // xp at which Lv1..Lv5 start
  const PET_XP = 2, PET_PER_DAY = 5, FAIL_XP = 2;
  const UNLOCK = { 1: ['おしゃべり', '結果のひとこと'], 2: ['なでなで', 'ひみつ 1'], 3: ['るすばん日記'], 4: ['ひみつ 2', 'おむかえ'], 5: ['ひみつ 3', 'なかよしバッジ'] };
  const SECRET_AT = [2, 4, 5];
  const ids = ['red', 'blue', 'pink', 'green', 'purple'], names = ['赤', '水色', 'ピンク', '黄緑', '紫'];
  const C = [
    { tap: ['あそぼ！ あそぼ！', 'つぎ、どの曲にする？', '黄緑もよんでくる！'], pet: 'えへへ〜。\nもっとやって！', good: 'やったー！\nもう一回やろ！', ok: 'クリア！\nつぎも一緒ね！', bad: 'いまのナシ！\nもう一回！', hello: 'おかえり！\n待ってたよ！',
      secrets: ['ひとりで寝るのが、ちょっぴりこわい。', 'いちばんの宝物は、黄緑とはじめて遊んだ日のコイン。', '仲間外れにされる夢を見た日は、だれより早く起きている。'],
      cards: ['きのう、きみが帰ったあと\n黄緑とお茶会したよ！\nまた明日も来てね。', 'ゆうべ、新しい曲を見つけたんだ！\nはやく一緒にあそぼ！', 'きみがいないと、\nなんだか静かすぎるんだよね。'] },
    { tap: ['ちゃんと準備運動した？', 'まかせて、お姉さんだから。', 'あれ……リボン、どこ置いたっけ'], pet: '……ありがと。\nちょっとだけね。', good: 'ふふん、\n計算どおり！', ok: 'よくできました。\n次もがんばろ。', bad: 'だ、大丈夫。\n想定内よ……たぶん', hello: 'おかえりなさい。\n準備はできてる？',
      secrets: ['じつは、弟（紫）の失敗ノートをつけている。', 'リボンは2つとも、一度ずつなくしたことがある。', 'みんなが寝たあと、こっそり次の日の準備をしている。'],
      cards: ['あなたが帰ったあと、\nみんなで片づけ……したんだけど\nまたリボンなくしたの。', '紫がまた、いたずらしてたのよ。\nちゃんと叱っておいたから。', '今日も無理しないでね。\n……お姉さんからのお願い。'] },
    { tap: ['……なに？', 'べつに、待ってたわけじゃないし', 'ふん。今日も来たのね'], pet: '……もうちょっとだけなら、\nいいけど。', good: 'まあまあね。\n……すごかったけど', ok: 'ふーん。\nクリアしたんだ', bad: 'ドンマイ、\nって言ってあげる', hello: '……おかえり。\nおそかったじゃない',
      secrets: ['みんなが寝たあと、こっそり練習している。', 'ハートの耳飾りは、だれかにもらった大切なもの。', 'ほんとうは、なでられるのがきらいじゃない。'],
      cards: ['……べつに。\nきのうの曲、ちょっと練習しただけ。', '来なくても、べつにいいけど。\n……来るなら、待ってる。', 'ゆうべ、月がきれいだった。\n……それだけ。'] },
    { tap: ['……ん。', 'のんびり、いこ', '……おかえり'], pet: '……ふわ〜。', good: '……いいね。', ok: '……できたね。', bad: '……だいじょうぶ。\nまた、やろ', hello: '……おかえり。',
      secrets: ['赤に誘われるの、じつはうれしい。', '糸目のままでも、ちゃんと全部見えている。', 'いちばん好きなのは、閉店直後の静かな時間。'],
      cards: ['……ゆうべは、\nみんなで、星を数えた。\n……また、おいで。', '……赤が、ずっと\nきみの話をしてた。', '……今日も、のんびりいこ。'] },
    { tap: ['へへっ、引っかかった？', '姉ちゃんには、ないしょね', '見てたよ〜、いまの'], pet: 'く、くすぐったいって！', good: 'ちょっとは、\nやるじゃん', ok: 'ま、合格かな', bad: 'あ〜あ。\nでも次はいけるでしょ', hello: 'おっ、来た来た！',
      secrets: ['姉ちゃんの失敗、こっそり直している。', 'いたずらの計画ノートは、もう3冊目。', '姉ちゃんに「ありがと」と言われると、しばらく照れている。'],
      cards: ['姉ちゃんが景品の棚で\nころんでたよ。へへっ。\n今日もくるでしょ？', '新しいいたずら、思いついたんだ。\nきみにだけ教えてあげる。', 'ゆうべ、姉ちゃんの代わりに\n片づけしといた。ないしょね。'] },
  ];
  const PHOTOS = ['opening/02-friends.jpg', 'opening/01-after-hours.jpg', 'opening/03-discovery.jpg', 'opening/04-one-more-song.jpg', 'first-night.jpg', 'arcade-night.jpg'].map(f => 'Asset/world/' + f);

  // ---------- store ----------
  const today = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  function read() {
    const defaults = { xp: [0, 0, 0, 0, 0], petDay: '', pets: [0, 0, 0, 0, 0], lastPlay: '', lastChar: 0, cardDay: '', cards: 0 };
    try { return { ...defaults, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; }
    catch { return defaults; }
  }
  let S = read();
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {} };
  const level = i => LEVELS.filter(x => (S.xp[i] || 0) >= x).length;
  function progress(i) {
    const lv = level(i), xp = S.xp[i] || 0;
    if (lv >= LEVELS.length) return { lv, pct: 100, left: 0 };
    const a = LEVELS[lv - 1], b = LEVELS[lv];
    return { lv, pct: Math.round((xp - a) / (b - a) * 100), left: b - xp };
  }
  function gain(i, amount, why, transactional = false) {
    const before = level(i);
    if (transactional) {
      const xp = S.xp.slice();
      xp[i] = (xp[i] || 0) + amount;
      const next = { ...S, xp };
      localStorage.setItem(KEY, JSON.stringify(next));
      S = next;
    } else {
      S.xp[i] = (S.xp[i] || 0) + amount; save();
    }
    const after = level(i);
    if (after > before && !transactional) window.beatPSF?.event('bond_level', ids[i], 'lv_' + after);
    return { before, after, up: after > before, amount };
  }
  const can = (i, lv) => level(i) >= lv;

  // ---------- shared bits ----------
  const make = (tag, cls, parent, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; parent?.append(e); return e; };
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const art = (i, pose = '') => `Asset/world/cast-neon/${ids[i]}${pose}.png`;
  function bubble(host, text, at, side = 'up') {
    host.querySelectorAll(':scope > .bond-bubble').forEach(b => b.remove());
    const b = make('div', 'bond-bubble ' + side, host); b.textContent = text;
    Object.assign(b.style, at);
    return b;
  }
  function hearts(host, x, y, n = 6) {
    for (let k = 0; k < n; k++) setTimeout(() => {
      const h = make('span', 'bond-heart', host, '♥');
      h.style.left = x + (Math.random() * 30 - 15) + 'px'; h.style.top = y + 'px'; h.style.setProperty('--dx', (Math.random() * 60 - 30) + 'px');
      setTimeout(() => h.remove(), 1200);
    }, k * 90);
  }
  const rectIn = (el, host) => { const a = el.getBoundingClientRect(), b = host.getBoundingClientRect(); return { x: a.left - b.left, y: a.top - b.top, w: a.width, h: a.height, W: b.width, H: b.height }; };

  function levelLine(lv) { return (UNLOCK[lv] || []).join('・'); }
  const levelToast = (i, lv) => toast(`♥ ${names[i]}とのきずな Lv${lv}！ ${levelLine(lv)}`);

  // ---------- A: talking and petting on the home screen ----------
  const app = $('app'), charimg = $('charimg');
  let downAt = 0, petTimer = null, homeBubble = null;
  function homeSay(text, pose) {
    const r = rectIn(charimg, app);
    homeBubble = bubble(app, text, { left: Math.min(r.x + r.w * 0.72, r.W - 230) + 'px', top: Math.max(8, r.y - 58) + 'px' }, 'home');
    clearTimeout(homeSay.t); homeSay.t = setTimeout(() => { homeBubble?.remove(); if (pose) restorePose(); }, 2600);
  }
  let posed = false;
  function pose() {
    if (posed) return;
    posed = true;
    charimg.dataset.src = charimg.src;
    if (window.cosmiiWardrobe) window.cosmiiWardrobe.setPortrait(charimg, skinIdx, 'hands', art(skinIdx, '-hands'));
    else charimg.src = art(skinIdx, '-hands');
  }
  function restorePose() {
    if (!posed) return;
    posed = false;
    if (window.cosmiiWardrobe) window.cosmiiWardrobe.setPortrait(charimg, skinIdx, 'front', skinImageUrl(skinIdx));
    else charimg.src = charimg.dataset.src || charimg.src;
  }
  function pet() {
    const i = skinIdx;
    if (!can(i, 2)) { homeSay('なでなでは、きずな Lv2 から'); return; }
    if (S.petDay !== today()) { S.petDay = today(); S.pets = [0, 0, 0, 0, 0]; }
    pose(); charimg.classList.add('bond-pet');
    homeSay(C[i].pet, true);
    const r = rectIn(charimg, app); hearts(app, r.x + r.w / 2, r.y + r.h * 0.3, 8);
    if (S.pets[i] < PET_PER_DAY) { S.pets[i]++; const g = gain(i, PET_XP, 'pet'); refreshBadge(); if (g.up) levelToast(i, g.after); }
    setTimeout(() => charimg.classList.remove('bond-pet'), 900);
    window.beatPSF?.event('bond_pet', ids[i], 'home');
  }
  charimg.addEventListener('pointerdown', e => { if (state !== 'menu') return; downAt = performance.now(); clearTimeout(petTimer); petTimer = setTimeout(() => { downAt = 0; pet(); }, 550); });
  const cancelPet = () => clearTimeout(petTimer);
  charimg.addEventListener('pointerleave', cancelPet);
  charimg.addEventListener('click', e => {   // a short tap talks; the ⇄ badge and the name still open character select
    if (state !== 'menu') return;
    e.stopPropagation(); e.preventDefault(); cancelPet();
    if (!downAt) return; downAt = 0;
    charimg.classList.remove('bond-hop'); void charimg.offsetWidth; charimg.classList.add('bond-hop');
    homeSay(pick(C[skinIdx].tap));
    window.beatPSF?.event('bond_talk', ids[skinIdx], 'home');
  }, true);
  charimg.setAttribute('title', 'タップで話す・長押しでなでなで');

  // Lv5 badge by the name, and the Lv4 welcome when the home screen comes back
  function refreshBadge() {
    const n = $('charname'); if (!n) return;
    n.querySelector('.bond-badge')?.remove();
    const p = progress(skinIdx);
    const b = make('span', 'bond-badge' + (p.lv >= 5 ? ' best' : ''), n, `♥${p.lv}`);
    b.setAttribute('aria-label', `きずな Lv${p.lv}${p.lv >= 5 ? '・なかよし' : ''}`);
  }
  window.gameUI?.onRefresh(refreshBadge); refreshBadge();
  let wasHome = false;
  setInterval(() => {
    const home = state === 'menu' && getComputedStyle($('menu')).display !== 'none' && $('world-dialog')?.hidden !== false && getComputedStyle($('splash')).display === 'none';
    if (home && !wasHome && can(skinIdx, 4) && !document.querySelector('.bond-postcard')) setTimeout(() => { if (state === 'menu') { pose(); homeSay(C[skinIdx].hello, true); } }, 900);
    wasHome = home;
  }, 400);

  // ---------- B + C: the result card ----------
  function onClear() {
    const ov = $('clearov'); ov.querySelectorAll('.bond-bubble,.bond-chip').forEach(e => e.remove());
    if (practice || stageIdx >= NSTAGE + 1) return;
    const i = skinIdx, notes = judgeableCount();
    const acc = Math.min(1, (runStats.p + runStats.g * 0.6 + runStats.o * 0.3) / Math.max(1, notes));
    const rank = acc >= 0.9 ? 'S' : acc >= 0.7 ? 'A' : acc >= 0.5 ? 'B' : 'C';
    const g = gain(i, 10 + { S: 6, A: 4, B: 2, C: 0 }[rank] + Math.min(5, Math.floor(runStats.p / 10)), 'clear');
    S.lastPlay = today(); S.lastChar = i; save();
    // the word: next to Cosmii at the top of the card
    setTimeout(() => {
      if (getComputedStyle(ov).display === 'none') return;
      const ch = $('clearchar'); if (!ch) return;
      const r = rectIn(ch, ov);
      const text = rank === 'S' ? C[i].good : rank === 'C' ? C[i].bad.replace('いまのナシ！\n', 'つぎは、\n') : C[i].ok;
      const right = r.x > 230;
      bubble(ov, text, right ? { right: (r.W - r.x + 6) + 'px', top: Math.max(6, r.y + 4) + 'px' } : { left: (r.x + r.w + 6) + 'px', top: Math.max(6, r.y + 4) + 'px' }, right ? 'left' : 'right');
    }, 1200);
    // the bond chip in the unlock row (their pop-in animates it with the rest)
    const row = $('clear-unlocks') || ov.querySelector('.btnrow');
    const chip = make('button', 'result-unlock bond-chip' + (g.up ? ' up' : ''), null);
    chip.type = 'button';
    chip.innerHTML = g.up ? `<i aria-hidden="true">♥</i>LEVEL UP! Lv${g.after}<small>${levelLine(g.after)}</small>` : `<i aria-hidden="true">♥</i>きずな +${g.amount}<small>Lv${g.after}</small>`;
    chip.setAttribute('aria-label', g.up ? `${names[i]}とのきずながLv${g.after}に上がりました。${levelLine(g.after)}ができるようになりました。プロフィールを見る` : `${names[i]}とのきずな +${g.amount}。プロフィールを見る`);
    chip.onclick = () => window.cosmiiWorld?.profiles(i, 'bond');
    row.append(chip);
  }
  // a miss: the word next to the continue ring
  let missShown = false;
  setInterval(() => {
    const rv = $('reviveov'), on = rv?.classList.contains('on');
    if (on && !missShown) {
      missShown = true;
      const i = skinIdx, ring = rv.querySelector('.rv-ring');
      if (ring) { const r = rectIn(ring, rv); bubble(rv, C[i].bad, { left: (r.x + r.w + 10) + 'px', top: (r.y + 6) + 'px' }, 'right'); }
      if (!practice && duration > 0 && songPos / duration > 0.3) { gain(i, FAIL_XP, 'try'); S.lastPlay = today(); S.lastChar = i; save(); }
    } else if (!on && missShown) { missShown = false; rv?.querySelectorAll('.bond-bubble').forEach(b => b.remove()); }
  }, 250);

  // ---------- C: the profile ----------
  function profileHtml(i) {
    const p = progress(i), lv = p.lv;
    const now = Object.entries(UNLOCK).filter(([l]) => +l <= lv).flatMap(([, v]) => v).join('・');
    const next = lv < 5 ? `<span class="bond-next">Lv${lv + 1}で：${levelLine(lv + 1)}</span>` : '<span class="bond-next">なかよし！</span>';
    const secrets = C[i].secrets.map((t, k) => SECRET_AT[k] <= lv ? `<li><b>ひみつ ${k + 1}</b>${t}</li>` : `<li class="locked"><b>ひみつ ${k + 1}</b>きずな Lv${SECRET_AT[k]} で開く</li>`).join('');
    return `<div class="bond-profile"><div class="bond-row"><span class="bond-lv">♥ きずな Lv${lv}</span><span class="bond-bar" role="progressbar" aria-label="次のレベルまで" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${p.pct}"><i style="width:${p.pct}%"></i></span>${lv < 5 ? `<small>あと ${p.left}</small>` : ''}</div>
      <p class="bond-can">できること：${now}</p>${next}<ul class="bond-secrets">${secrets}</ul></div>`;
  }

  // ---------- E: the postcard at the next launch ----------
  function postcardDue() {
    const i = S.lastChar ?? 0;
    return !DEMO && S.lastPlay && S.lastPlay !== today() && S.cardDay !== today() && can(i, 3) && skinUnlocked(i);
  }
  function postcard() {
    const i = S.lastChar ?? 0, k = S.cards % C[i].cards.length;
    S.cardDay = today(); S.cards++; save();
    const box = make('section', 'bond-postcard', app);
    box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-label', `${names[i]}コスミーからの絵はがき`);
    box.innerHTML = `<div class="bp-card"><div class="bp-photo" style="background-image:url('${PHOTOS[(S.cards + i) % PHOTOS.length]}')"></div><div class="bp-text"><small>るすばん日記</small><p></p><div class="bp-from"><img src="${art(i)}" alt="">${names[i]}コスミーより</div><div class="bp-stamps"><button type="button" data-s="♥">♥ ありがと</button><button type="button" data-s="★">★ また来るね</button></div></div><button type="button" class="bp-x" aria-label="閉じる">✕</button></div>`;
    box.querySelector('p').textContent = C[i].cards[k];
    const done = () => { box.remove(); };
    box.querySelector('.bp-x').onclick = done;
    box.querySelectorAll('[data-s]').forEach(b => b.onclick = () => {
      box.querySelectorAll('[data-s]').forEach(x => x.disabled = true);
      make('div', 'bp-stamp', box.querySelector('.bp-card'), b.dataset.s);
      window.beatPSF?.event('postcard_reply', ids[i], b.dataset.s === '♥' ? 'heart' : 'star');
      setTimeout(done, 1100);
    });
    box.querySelector('[data-s]').focus({ preventScroll: true });
    window.beatPSF?.event('postcard_shown', ids[i], 'launch');
  }
  // After the daily bonus and after the world's own launch notice (one story popup per launch).
  if (postcardDue()) {
    const wait = setInterval(() => {
      const notice = window.cosmiiWorld?.launchNotice;
      if (notice === undefined) return;
      clearInterval(wait);
      if (notice === 'shown') return;   // a new memory took this launch's slot
      const ready = setInterval(() => {
        const home = state === 'menu' && getComputedStyle($('menu')).display !== 'none' && $('world-dialog')?.hidden !== false && getComputedStyle($('loginov')).display === 'none';
        if (!home) return; clearInterval(ready); postcard();
      }, 300);
      setTimeout(() => clearInterval(ready), 60000);
    }, 300);
    setTimeout(() => clearInterval(wait), 130000);
  }

  window.cosmiiBond = { level, progress, gain, profileHtml, onClear, can, postcard, storageKey: KEY, reload() { S = read(); refreshBadge(); }, _state: () => S };
})();
