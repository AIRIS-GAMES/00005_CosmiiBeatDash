const CACHE = 'rdash-v103-purple-icon';
const ASSETS = [
  'beat-analytics.js',
  ...['TikTok.png','instagram.png','X.png','LINE.png'].map(file=>'Asset/social/'+file),
  'Asset/promo/6811575619.jpg', 'Asset/promo/6809099787.jpg',
  'Asset/promo/6829253493.jpg', 'Asset/promo/6797260932.jpg',
  'Asset/promo/6784988703.jpg', 'Asset/promo/6789935783.jpg', 'Asset/promo/6790154239.jpg',
  './',
  'index.html',
  'manifest.json',
  'cosmii-power.js',
  'cosmii-character-motion.js',
  'cosmii-rides.js','cosmii-rides.css',
  'cosmii-mobile-dialogs.css',
  ...['skate','bike'].flatMap(type=>['red','blue','pink','green','purple'].map(name=>'Asset/world/rides/'+type+'-'+name+'.png')),
  ...['red','blue','pink','green','purple'].map(name=>'Asset/world/run/'+name+'.png'),
  ...['red','blue','pink','green','purple'].map(name=>'Asset/world/cast-neon/'+name+'-hands.png'),
  'ui.js',
  'game-safety.js',
  'html-audio.js',
  'perf-hud.js',
  'Asset/audio/tracks.js',
  'Asset/audio/rhythm-beats.js',
  ...['stage01.mp3','stage2.mp3','stage03.mp3','bgm1.mp3','bgm2.mp3','bgm3.mp3','bgm4.mp3','death.wav','clear.wav','coin.wav','orb.wav','fever.wav'].map(file=>'Asset/audio/'+file),
  'ui.css',
  'cosmii-world.js',
  'Asset/world/neon-speaker.png',
  'cosmii-opening.js',
  'cosmii-opening.css',
  'cosmii-home.js',
  'Asset/world/menu-extra-icons.png',
  'cosmii-home.css',
  'cosmii-ui-art.js',
  'cosmii-ui-art.css',
  'cosmii-typography.css',
  'cosmii-calm.css',
  'cosmii-tutorial.js',
  'cosmii-tutorial.css',
  'Asset/world/memory-photos.png',
  ...['Exo2','Exo2-Italic','MPLUS1p-Medium','MPLUS1p-Bold','MPLUS1p-ExtraBold'].map(name=>'Asset/fonts/'+name+'.woff2'),
  ...['ui-panel.png','ui-progress.png','ui-words.png','ui-japanese.png'].map(file=>'Asset/world/'+file),
  ...['theme-sea.png','theme-garden.png','theme-sunset.png','theme-aurora.png','title-arcade.png','menu-icons.png','play-icon.png'].map(file=>'Asset/world/'+file),
  ...['01-after-hours.png','02-friends.png','03-discovery.png','04-one-more-song.png'].map(file=>'Asset/world/opening/'+file),
  'cosmii-world.css',
  'neon-theme.css',
  ...['arcade-neon.png','rhythm-neon.png','neon-spike.png','neon-block.png'].map(file=>'Asset/world/'+file),
  ...['arcade-night.png','first-night.png'].map(file=>'Asset/world/'+file),
  ...['red','blue','pink','green','purple'].map(file=>'Asset/world/cast-neon/'+file+'.png'),
  'Asset/app-icon.png',
  'Asset/cosmo-coin.png',
  'Asset/黒背景.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if(e.request.headers.has('range')&&url.pathname.includes('/Asset/audio/')){
    e.respondWith((async()=>{
      const cached=await caches.match(url.href);
      if(!cached)return fetch(e.request);
      const bytes=await cached.arrayBuffer(),match=/^bytes=(\d*)-(\d*)$/.exec(e.request.headers.get('range'));
      if(!match)return fetch(e.request);
      let start=match[1]?Number(match[1]):0,end=match[2]?Number(match[2]):bytes.byteLength-1;
      if(!match[1]&&match[2]){start=Math.max(0,bytes.byteLength-Number(match[2]));end=bytes.byteLength-1;}
      end=Math.min(end,bytes.byteLength-1);
      if(start>end||start>=bytes.byteLength)return new Response(null,{status:416,headers:{'Content-Range':`bytes */${bytes.byteLength}`}});
      return new Response(bytes.slice(start,end+1),{status:206,headers:{'Content-Type':cached.headers.get('Content-Type')||'audio/mpeg','Content-Range':`bytes ${start}-${end}/${bytes.byteLength}`,'Content-Length':String(end-start+1),'Accept-Ranges':'bytes'}});
    })());return;
  }
  if (/\/cosmii-power\.js$/.test(url.pathname)) {
    e.respondWith(fetch(e.request, { cache: 'no-cache' }).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
      return res;
    }).catch(() => caches.match(e.request)));
    return;
  }
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).catch(() => caches.match('./')));
    return;
  }
  if (e.request.cache === 'reload') {
    // 最新を取りに行くが、オフライン時はキャッシュ済みアセットにフォールバック
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
    return;
  }
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy));
      return res;
    }))
  );
});
