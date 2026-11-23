// "The game this stage comes from": the world stages are built on other AIRIS
// games (PROMO_GAMES in index.html). Three entry points:
//  1. result card: a round app-icon button in the button row; it opens the game card
//  2. game card: opened from the GAME button (and shown inside the clear gate, 5)
//  3. stage select: an "App Store ↗" link beside each world heading
// Never shown in practice or daily runs, during play, or after a miss.
// The result card also gets a SHARE button (4): post the result, follow the official accounts.
(function () {
  'use strict';
  const SOURCE = {   // stage world -> PROMO_GAMES id
    rescue: '6811575619', cannon: '6809099787', roll: '6829253493', sudoku: '6797260932', catch: '6828976380',
    mogu: '6789935783', match: '6784988703', arcade: '6790154239',
  };
  const ART = {
    rescue: 'Asset/worlds/rescue/sunset-background.jpg', cannon: 'Asset/worlds/cannon/background.jpg',
    roll: 'Asset/worlds/roll/background.jpg', sudoku: 'Asset/worlds/sudoku/background.jpg', catch: 'Asset/worlds/catch/background.jpg',
    mogu: 'Asset/worlds/mogu/background.jpg', match: 'Asset/worlds/match/background.jpg',
    arcade: 'Asset/worlds/arcade/background.jpg',
  };
  const plan = i => window.stageGimmicks?.PLAN?.[i + 1];
  const worldOf = i => (i >= 0 && i < NSTAGE - 1) ? plan(i)?.world : null;   // the finale mixes everything
  function gameFor(i) {
    const id = SOURCE[worldOf(i)];
    return id ? PROMO_GAMES.find(g => g.id === id) || null : null;
  }
  function stagesOf(world) {
    const list = [];
    for (let i = 0; i < NSTAGE - 1; i++) if (worldOf(i) === world) list.push(i);
    return list;
  }
  const offRun = () => practice || (typeof dailyMode === 'function' && dailyMode());
  function link(a, g, where) {
    a.href = g.url; a.target = '_blank'; a.rel = 'noopener noreferrer';
    a.addEventListener('click', e => { e.stopPropagation(); gaDesign('Promo:Click:' + g.key + ':' + where, 1); });
  }

  // ---------- 1. result card: a round app-icon button in the button row (no banner: it made the card scroll) ----------
  function resultButton(g) {
    const row = $('clearov').querySelector('.btnrow');
    let b = $('clear-src');
    if (!b) { b = document.createElement('button'); b.type = 'button'; b.id = 'clear-src'; b.className = 'clear-icon-btn'; row.append(b); }
    b.innerHTML = `<img src="Asset/promo/${g.id}.jpg" alt=""><small aria-hidden="true">GAME</small>`;
    b.setAttribute('aria-label', `このステージのゲーム「${g.title}」を見る`);
    b.onclick = () => gameCard(stageIdx, g, 'result');
    b.hidden = false;
    gaDesign('Promo:Impression:' + g.key + ':result', 1);
  }

  // ---------- full-screen cards (game card and share card share one slot) ----------
  let dialog = null, lastFocus = null, onClosed = null;
  function closeDialog() {
    if (!dialog) return;
    dialog.remove(); dialog = null;
    removeEventListener('keydown', onKey, true);
    lastFocus?.focus?.();
    const cb = onClosed; onClosed = null; cb?.();
  }
  function onKey(e) { if (e.key === 'Escape') { e.preventDefault(); closeDialog(); } }
  function openDialog(cls, html, onClose) {
    closeDialog();
    onClosed = onClose || null;
    dialog = document.createElement('div'); dialog.className = 'src-modal ' + cls;
    dialog.innerHTML = html;
    dialog.addEventListener('click', e => { if (e.target === dialog) closeDialog(); });
    dialog.querySelector('.src-later').onclick = closeDialog;
    lastFocus = document.activeElement;
    $('app').append(dialog);
    addEventListener('keydown', onKey, true);
    dialog.querySelector('.src-later').focus({ preventScroll: true });
    return dialog;
  }

  // ---------- 2. the game card: once on a world clear, or from the result button ----------
  function gameCard(i, g, where) {
    const world = worldOf(i), stages = stagesOf(world), first = stages[0], last = stages[stages.length - 1];
    const range = first === last ? `ステージ${first + 1}` : `ステージ${first + 1}〜${last + 1}`;
    const name = STAGES[first].title || STAGES[first].name;
    const d = openDialog('src-game', `<div class="src-card" role="dialog" aria-modal="true" aria-labelledby="src-title">
      <div class="src-art"><span class="tag"></span><img class="icon" alt=""><img class="cosmii" alt=""></div>
      <div class="src-body"><small></small><h3 id="src-title"></h3><p></p>
        <div class="src-actions"><a class="src-go">App Storeで見る ↗</a><button type="button" class="src-later"></button></div></div></div>`);
    d.querySelector('.tag').textContent = 'ORIGINAL GAME';
    d.querySelector('.src-art').style.backgroundImage = `url("${ART[world]}")`;
    d.querySelector('.icon').src = `Asset/promo/${g.id}.jpg`;
    const face = typeof skinImageUrl === 'function' ? skinImageUrl(skinIdx) : '';
    const cosmii = d.querySelector('.cosmii'); if (face) cosmii.src = face; else cosmii.remove();
    d.querySelector('small').textContent = `「${name}」ワールドのもとになったゲーム`;
    d.querySelector('h3').textContent = g.title;
    d.querySelector('p').textContent = `${g.sub}。${range}の世界を、本編でもっと遊べます。`;
    d.querySelector('.src-later').textContent = 'とじる';
    const go = d.querySelector('.src-go'); link(go, g, where); go.addEventListener('click', closeDialog);
    gaDesign('Promo:Impression:' + g.key + ':' + where, 1);
  }

  // ---------- 5. the clear gate: a full-screen card before the result plays in ----------
  // CLEAR -> this card (the stage's own game, if it has one, and the official SNS) -> "結果を見る" -> the result
  // sequence. Any way of closing it (button, backdrop, Esc) goes on to the result. Not in practice or daily runs.
  function gate(next) {
    if (offRun() || typeof stageIdx !== 'number') return false;
    const i = stageIdx, g = i < NSTAGE ? gameFor(i) : null, world = g ? worldOf(i) : null;
    const st = STAGES[i] || {}, face = typeof skinImageUrl === 'function' ? skinImageUrl(skinIdx) : '';
    const follow = FOLLOW.map(([id, label, icon, url]) =>
      `<a class="share-sns" href="${url}" target="_blank" rel="noopener noreferrer" data-sns="${id}" aria-label="${label}をフォロー（外部サイトで開く）"><img src="Asset/social/${icon}" alt=""></a>`).join('');
    const token = clearToken;
    const d = openDialog('gate-modal', `<div class="src-card gate-card${g ? '' : ' no-game'}" role="dialog" aria-modal="true" aria-labelledby="gate-title">
      <div class="gate-art">${g ? '<img class="icon" alt="">' : ''}${face ? `<img class="cosmii" src="${face}" alt="">` : ''}<span class="tag">STAGE CLEAR!</span></div>
      <div class="gate-body">
        ${g ? `<small class="gate-kicker"></small><h3 id="gate-title"></h3><p></p><a class="src-go gate-store">App Storeで見る ↗</a>`
            : `<small class="gate-kicker">コスミーの最新情報</small><h3 id="gate-title">SNSで配信中！</h3><p>新しいステージやイベントのお知らせをチェックしよう。</p>`}
        <div class="share-follow gate-follow"><span>FOLLOW</span>${follow}</div>
      </div>
      <button type="button" class="src-later gate-next">結果を見る ▶</button></div>`,
      () => { gaDesign('Gate:Result', 1); if (token === clearToken && state === 'clear') next(); });
    if (g) {
      const name = STAGES[stagesOf(world)[0]]?.title || st.title || st.name;
      d.querySelector('.gate-art').style.backgroundImage = `url("${ART[world]}")`;
      d.querySelector('.icon').src = `Asset/promo/${g.id}.jpg`;
      d.querySelector('.gate-kicker').textContent = `「${name}」のもとになったゲーム`;
      d.querySelector('h3').textContent = g.title;
      d.querySelector('p').textContent = g.sub;
      link(d.querySelector('.gate-store'), g, 'gate');
      gaDesign('Promo:Impression:' + g.key + ':gate', 1);
    }
    d.querySelectorAll('[data-sns]').forEach(a => a.addEventListener('click', e => { e.stopPropagation(); gaDesign('Social:Click:' + a.dataset.sns, 1); window.beatPSF?.external?.(a.dataset.sns, 'gate'); }));
    gaDesign('Gate:Open', 1);
    return true;
  }

  // ---------- 4. share card: post the result, follow the official accounts ----------
  const APP_URL = 'https://apps.apple.com/jp/app/id6792287027';
  const FOLLOW = [['x', 'X', 'X.png', 'https://x.com/airis_games'],
    ['tiktok', 'TikTok', 'TikTok.png', 'https://www.tiktok.com/@airis_games_official'],
    ['instagram', 'Instagram', 'instagram.png', 'https://www.instagram.com/airis_games_official']];
  function shareButton() {
    const row = $('clearov').querySelector('.btnrow');
    let b = $('clear-share');
    if (!b) {
      b = document.createElement('button'); b.type = 'button'; b.id = 'clear-share'; b.className = 'clear-icon-btn';
      b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/></svg><small aria-hidden="true">SHARE</small>';
      b.setAttribute('aria-label', '結果をシェア・SNSをフォロー');
      b.onclick = shareCard;
      row.append(b);
    }
    b.hidden = false;
  }
  function shareCard() {
    const ov = $('clearov');
    const rank = ov.querySelector('.result-rank')?.firstChild?.textContent.trim() || '';
    const pts = Number(ov.querySelector('.result-heading [data-n]')?.dataset.n || 0);
    const st = STAGES[stageIdx] || {}, stage = (st.name || '') + (st.title ? '「' + st.title + '」' : '');
    const text = `Cosmii Rhythm Dash ${stage}をクリア！ ランク${rank}・スコア${pts.toLocaleString()} #コスミー #CosmiiRhythmDash`;
    const face = typeof skinImageUrl === 'function' ? skinImageUrl(skinIdx) : '';
    const d = openDialog('src-share', `<div class="src-card share-card" role="dialog" aria-modal="true" aria-labelledby="share-title">
      <button type="button" class="src-later share-close" aria-label="とじる">✕</button>
      <div class="share-top"><span class="tag">SHARE</span><h3 id="share-title">クリアをシェアしよう！</h3></div>
      <div class="share-result"><span class="share-rank rank-${rank}" aria-label="ランク ${rank}">${rank}</span>
        <div><small></small><b>${pts.toLocaleString()}</b></div>${face ? `<img src="${face}" alt="">` : ''}</div>
      <button type="button" class="share-go"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12M7 8l5-5 5 5M5 13v6h14v-6"/></svg>結果をシェア</button>
      <div class="share-follow"><span>FOLLOW</span>${FOLLOW.map(([id, label, icon, url]) =>
        `<a class="share-sns share-${id}" href="${url}" target="_blank" rel="noopener noreferrer" data-sns="${id}" aria-label="${label}をフォロー（外部サイトで開く）"><img src="Asset/social/${icon}" alt=""></a>`).join('')}</div></div>`);
    d.querySelector('.share-result small').textContent = stage;
    d.querySelector('.share-go').onclick = async () => {
      gaDesign('Share:Result', 1); window.beatPSF?.external?.('share', 'result');
      if (navigator.share) { try { await navigator.share({ text, url: APP_URL }); } catch {} return; }
      window.open('https://x.com/intent/post?text=' + encodeURIComponent(text) + '&url=' + encodeURIComponent(APP_URL), '_blank', 'noopener');
    };
    d.querySelectorAll('[data-sns]').forEach(a => a.addEventListener('click', () => { gaDesign('Social:Click:' + a.dataset.sns, 1); window.beatPSF?.external?.(a.dataset.sns, 'result'); }));
    gaDesign('Share:Open', 1);
  }

  // Called once the result card is on screen (index.html clearStage).
  function onClear() {
    $('clear-src')?.setAttribute('hidden', '');
    if (practice) { $('clear-share')?.setAttribute('hidden', ''); return; }
    shareButton();
    if (offRun() || stageIdx >= NSTAGE) return;
    const g = gameFor(stageIdx); if (!g) return;
    resultButton(g);   // the game card itself now comes up front in the clear gate (5)
  }

  // ---------- 3. stage select ----------
  function decorate(grid) {
    for (const group of grid.querySelectorAll('.wm-group')) {
      const h = group.querySelector('h3'), no = group.querySelector('.wm-no');
      if (!h || !no || h.querySelector('.wm-src')) continue;
      const g = gameFor(Number(no.textContent) - 1); if (!g) continue;
      const a = document.createElement('a'); a.className = 'wm-src';
      a.innerHTML = `<img src="Asset/promo/${g.id}.jpg" alt="">App Store ↗`;
      a.setAttribute('aria-label', `${g.title}をApp Storeで見る`);
      link(a, g, 'stage_select');
      h.append(a);
    }
  }
  const view = window.stageSelectView;
  if (view?.render) {
    const render = view.render;
    view.render = grid => { render(grid); decorate(grid); };
    const grid = $('grid'); if (grid?.children.length) decorate(grid);
  }

  window.cosmiiSource = { onClear, gate, gameFor, close: closeDialog };
})();
