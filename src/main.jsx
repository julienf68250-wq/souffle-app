import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/newsreader'
import '@fontsource-variable/hanken-grotesk'
import App from './App.jsx'
import { periode } from './Ciel.jsx'
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
  navigator.serviceWorker.register('./sw.js').catch(() => {})
}
