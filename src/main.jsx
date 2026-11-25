import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/newsreader'
import '@fontsource-variable/hanken-grotesk'
import App from './App.jsx'
import BandeauMaj from './BandeauMaj.jsx'
import { periode } from './Ciel.jsx'
import { urlsSons } from './audio.js'
import './style.css'

// Thème posé avant le premier rendu, sinon le passage jour → nuit se joue au chargement
const h = new Date().getHours()
let themeSombre = true
try {
  themeSombre = (JSON.parse(localStorage.getItem('souffle.theme')) ?? 'sombre') === 'sombre'
} catch {
  /* stockage indisponible : sombre par défaut */
}
document.documentElement.classList.toggle('nuit', themeSombre || h >= 21 || h < 6)
document.documentElement.dataset.ciel = periode()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
    <BandeauMaj />
  </StrictMode>,
)

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  navigator.serviceWorker
    .register('./sw.js')
    .then(() => navigator.serviceWorker.ready)
    .then(() => setTimeout(mettreEnCache, 1000))
    .catch(() => {})
}

// Nouvelle version publiée ? On compare le script principal de la page en ligne avec celui
// en cours. Vérifié à l'ouverture et à chaque retour dans l'app (une app installée sur l'écran
// d'accueil reprend souvent sans se recharger).
const scriptActuel = () => document.querySelector('script[type="module"][src*="assets/index-"]')?.getAttribute('src')?.split('/').pop()
async function verifierMiseAJour() {
  try {
    const rep = await fetch(new URL('index.html', document.baseURI).href, { cache: 'no-cache' })
    const enLigne = (await rep.text()).match(/assets\/(index-[^"']+\.js)/)?.[1]
    const actuel = scriptActuel()
    if (enLigne && actuel && enLigne !== actuel) window.dispatchEvent(new Event('souffle-maj'))
  } catch {
    /* hors connexion : rien à faire */
  }
}
if (import.meta.env.PROD) {
  setTimeout(verifierMiseAJour, 3000)
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && verifierMiseAJour())
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
