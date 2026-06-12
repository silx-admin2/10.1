const CACHE_VERSION = 'v1'
const CACHE_NAME = `coffee-tracker-static-${CACHE_VERSION}`
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './entries-view.js'
]

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)

  if(request.method !== 'GET' || url.origin !== self.location.origin) return

  event.respondWith(
    caches.match(request).then(cachedResponse => {
      if(cachedResponse) {
        fetch(request)
          .then(response => {
            if(response.ok) {
              const responseToCache = response.clone()
              caches.open(CACHE_NAME).then(cache => cache.put(request, responseToCache))
            }
          })
          .catch(error => console.warn('Background cache refresh failed', error))

        return cachedResponse
      }

      return fetch(request)
        .then(response => {
          if(response.ok) {
            const responseToCache = response.clone()
            caches.open(CACHE_NAME).then(cache => cache.put(request, responseToCache))
          }
          return response
        })
        .catch(() => {
          return new Response('Offline content unavailable.', {
            status: 503,
            statusText: 'Service Unavailable'
          })
        })
    })
  )
})
