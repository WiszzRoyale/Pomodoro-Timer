const CACHE_NAME = 'studyfocus-v8';
const URLS_TO_CACHE = [
  './',  
  './index.html',
  './styles.css',
  './app.js',
  'https://cdn.jsdelivr.net/npm/vue@2.6.14/dist/vue.js',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css'
];

self.addEventListener('install', event => {
  console.log('[SW] Install event');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Cache opened');
        return cache.addAll(URLS_TO_CACHE.map(url => new Request(url, {credentials: 'same-origin'})))
          .catch(err => {
            console.error('[SW] Cache addAll error:', err);
            // Cache files one by one if batch fails
            return Promise.all(
              URLS_TO_CACHE.map(url => 
                fetch(new Request(url, {credentials: 'same-origin'}))
                  .then(response => cache.put(url, response))
                  .catch(e => console.error(`[SW] Failed to cache ${url}:`, e))
              )
            );
          });
      })
  );
});

// ACTIVATION - Cleans up old caches
self.addEventListener('activate', event => {
  console.log('[SW] Activate event');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// FETCH - Serves cached files when offline
self.addEventListener('fetch', event => {
  console.log('[SW] Fetch:', event.request.url);
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          console.log('[SW] Serving from cache:', event.request.url);
          return response;
        }
        console.log('[SW] Fetching from network:', event.request.url);
        return fetch(event.request);
      })
  );
});