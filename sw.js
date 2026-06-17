const CACHE_NAME = 'hostile-volume-v3';
const ASSETS = [
    '/',
    '/index.html',
    '/assets/app.js',
    '/assets/styles.css',
    '/elevator.mp3',
    '/manifest.json',
    '/data/levels/level-01.json',
    '/data/levels/level-02.json',
    '/data/levels/level-03.json',
    '/data/levels/level-04.json',
    '/data/levels/level-05.json',
    '/data/levels/level-06.json',
    '/data/levels/level-07.json',
    '/data/levels/level-08.json',
    '/data/levels/level-09.json',
    '/data/levels/level-10.json',
    '/data/levels/level-11.json',
    '/data/levels/level-12.json',
    '/data/levels/level-13.json',
    '/data/levels/level-14.json',
    '/data/levels/level-15.json',
    '/data/levels/level-16.json',
    '/data/levels/level-17.json',
    '/data/levels/level-18.json',
    '/data/levels/level-19.json',
    '/data/levels/level-20.json',
    '/data/levels/level-21.json',
    '/data/levels/level-22.json',
    '/data/levels/level-23.json',
    '/data/levels/level-24.json',
    '/data/levels/level-25.json',
    '/data/levels/level-26.json',
    '/data/levels/level-27.json',
    '/data/levels/level-28.json',
    '/data/levels/level-29.json',
    '/data/levels/level-30.json'
];

self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)));
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (e) => {
   
    if (e.request.url.includes('upstash.io') || e.request.url.includes('goatcounter.com')) {
        return; 
    }
    
    e.respondWith(
        caches.match(e.request).then((response) => {
            return response || fetch(e.request);
        })
    );
});
