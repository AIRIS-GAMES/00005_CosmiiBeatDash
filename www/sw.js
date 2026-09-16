const CACHE = 'rdash-v52-collab-info-only';
const ASSETS = [
  './',
  'index.html',
  'manifest.json',
  'collaboration-config.js',
  'collaboration.js',
  'sun-rhythm.js',
  'ui.js',
  'game-safety.js',
  'html-audio.js',
  'perf-hud.js',
  'Asset/audio/tracks.js',
  ...['stage01.mp3','stage2.mp3','stage03.mp3','bgm1.mp3','bgm2.mp3','bgm3.mp3','bgm4.mp3','death.wav','clear.wav','coin.wav','orb.wav','fever.wav'].map(file=>'Asset/audio/'+file),
  'ui.css',
  'Asset/fonts/MPLUSRounded1c-Regular.ttf',
  'Asset/fonts/MPLUSRounded1c-Bold.ttf',
  'collaboration.css',
  'Asset/IMG_3161.PNG',
  'Asset/IMG_3162.PNG',
  'Asset/IMG_3160.PNG',
  'Asset/IMG_3158.PNG',
  'Asset/IMG_3159.PNG',
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
  // Never retain licensed artwork in the runtime cache.
  if (url.pathname.includes('/Asset/collaborations/')) {
    e.respondWith(fetch(e.request, { cache: 'no-store' }));
    return;
  }
  if (/\/(collaboration-config\.js|collaboration\.js|collaboration\.css|sun-rhythm\.js)$/.test(url.pathname)) {
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
