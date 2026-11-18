import { useEffect, useRef, useState } from 'react'
import Vague from './Vague.jsx'
import { CLES, ecrire, lire } from './stockage.js'
import { deverrouillerAudio, tonalite } from './audio.js'

// La marée : l'eau monte à l'inspiration, redescend à l'expiration.
// Durée arrondie au cycle complet pour finir sur une expiration.
export default function Respiration({ duree, inspire, expire, onFin, onStop }) {
  const cycle = inspire + expire
  const total = Math.ceil(duree / cycle) * cycle
  const debut = useRef(performance.now())
  const finRef = useRef(onFin)
  finRef.current = onFin
  const [ecoule, setEcoule] = useState(0)
  const [son, setSon] = useState(() => lire(CLES.son, false))

  useEffect(() => {
    let id
    const tic = () => {
      const e = (performance.now() - debut.current) / 1000
      if (e >= total) {
        finRef.current()
        return
      }
      setEcoule(e)
      id = requestAnimationFrame(tic)
    }
    id = requestAnimationFrame(tic)
    return () => cancelAnimationFrame(id)
  }, [total])

  // Garde l'écran allumé pendant la séance (iOS 16.4+)
  useEffect(() => {
    let verrou = null
    navigator.wakeLock?.request('screen').then((v) => (verrou = v)).catch(() => {})
    return () => verrou?.release().catch(() => {})
  }, [])

  const p = ecoule % cycle
  const enInspire = p < inspire
  const avance = enInspire ? p / inspire : 1 - (p - inspire) / expire
  const niveau = (1 - Math.cos(Math.PI * avance)) / 2
  const reste = Math.max(0, Math.ceil(total - ecoule))
  const mot = enInspire ? 'Inspire' : 'Expire'

  useEffect(() => {
    if (son) tonalite(enInspire)
  }, [enInspire, son])

  const basculerSon = () => {
    deverrouillerAudio()
    setSon((s) => {
      ecrire(CLES.son, !s)
      return !s
    })
  }

  return (
    <main className="maree" style={{ '--l': niveau }}>
      <div className="eau">
        <Vague />
      </div>
      <div className="mot" aria-live="polite">{mot}</div>
      <div className="mot mot-eau" aria-hidden="true">{mot}</div>
      <div className="maree-bas">
        <span className="reste">
          {Math.floor(reste / 60)}:{String(reste % 60).padStart(2, '0')}
        </span>
        <div className="actions">
          <button onClick={basculerSon}>{son ? 'Couper le son' : 'Son doux'}</button>
          <button onClick={onStop}>Arrêter</button>
        </div>
      </div>
    </main>
  )
}
