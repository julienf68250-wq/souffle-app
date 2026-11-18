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
  // La page elle-même est toujours revérifiée auprès du serveur (sinon le cache HTTP de
  // GitHub Pages peut servir l'ancienne version pendant 10 min). Les fichiers versionnés
  // (assets/…-hash.js) ne changent jamais de contenu : le cache normal suffit.
  const page = req.mode === 'navigate' || /\/(index\.html)?$/.test(new URL(req.url).pathname)
  e.respondWith(
    fetch(page ? new Request(req, { cache: 'no-cache' }) : req)
      .then((rep) => {
        if (rep.status === 200) {
          const copie = rep.clone()
          caches.open(CACHE).then((c) => c.put(req, copie))
        }
        return rep
      })
      .catch(() =>
        caches.match(req, { ignoreVary: true }).then((r) => r || caches.match('./index.html', { ignoreVary: true })),
      ),
  )
})
