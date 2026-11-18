// Réseau d'abord, cache en secours : l'app reste utilisable hors connexion
// après une première ouverture.
const CACHE = 'souffle-v1'

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((cles) => Promise.all(cles.filter((c) => c !== CACHE).map((c) => caches.delete(c))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return
  e.respondWith(
    fetch(req)
      .then((rep) => {
        if (rep.ok) {
          const copie = rep.clone()
          caches.open(CACHE).then((c) => c.put(req, copie))
        }
        return rep
      })
      .catch(() => caches.match(req).then((r) => r || caches.match('./index.html'))),
  )
})
