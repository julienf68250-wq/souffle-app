import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/newsreader'
import '@fontsource-variable/hanken-grotesk'
import App from './App.jsx'
import { periode } from './Ciel.jsx'
import { urlsSons } from './audio.js'
import './style.css'

// Thème posé avant le premier rendu, sinon le passage jour → nuit se joue au chargement
const h = new Date().getHours()
document.documentElement.classList.toggle('nuit', h >= 21 || h < 6)
document.documentElement.dataset.ciel = periode()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  navigator.serviceWorker
    .register('./sw.js')
    .then(() => navigator.serviceWorker.ready)
    .then(() => setTimeout(mettreEnCache, 1000))
    .catch(() => {})
}

// Dès la première visite : la page, ses fichiers et les sons vont dans le cache du service worker
// (sinon, chargés avant lui, ils manqueraient hors connexion).
function mettreEnCache() {
  const origine = location.origin
  const urls = new Set([
    location.href.split('#')[0],
    new URL('index.html', document.baseURI).href,
    ...performance.getEntriesByType('resource').map((e) => e.name).filter((u) => u.startsWith(origine)),
    ...urlsSons(),
  ])
  caches
    .open('souffle-v1')
    .then((c) => Promise.all([...urls].map((u) => c.add(u).catch(() => {}))))
    .catch(() => {})
}
