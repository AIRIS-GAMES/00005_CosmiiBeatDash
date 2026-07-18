const CACHE = 'rdash-v12';
const ASSETS = [
  './',
  'index.html',
  'manifest.json',
  'Asset/IMG_3161.PNG',
  'Asset/IMG_3162.PNG',
  'Asset/IMG_3160.PNG',
  'Asset/IMG_3158.PNG',
  'Asset/IMG_3159.PNG',
  'Asset/cosmo-coin.png',
  'Asset/黒背景.png',
  'Asset/stage01.mp3',
  'Asset/stage2.mp3',
  'Asset/stage03.mp3',
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
