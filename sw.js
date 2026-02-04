
const CACHE_NAME = 'tw-hrms-v1';
const ASSETS = [
  './index.html',
  './index.tsx',
  './App.tsx',
  './types.ts',
  './services/storage.ts',
  './services/laborLaw.ts',
  './components/ClockCard.tsx',
  './components/AdminPanel.tsx'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
