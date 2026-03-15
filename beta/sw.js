const CACHE_NAME = 'hostile-volume-v1';
const ASSETS = [
    '/',
    '/index.html',
    '/elevator1.mp3',
    '/manifest.json'
];

self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        })
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
