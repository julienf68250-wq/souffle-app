import { useEffect, useRef, useState } from 'react'
import Vague from './Vague.jsx'
import { CONTENU, sonParId } from './contenu.js'
import { ecrireSon, lireSon } from './stockage.js'
import { arreterAmbiance, cloche, demarrerAmbiance, deverrouillerAudio, houle } from './audio.js'

// La marée : l'eau suit les phases de la technique (inspire, pause, expire…).
// La durée est arrondie au cycle complet pour finir à vide.
export default function Respiration({ technique, duree, sombre = false, onFin, onStop }) {
  const phases = technique.phases
  const cycle = phases.reduce((s, p) => s + p.duree, 0)
  const total = Math.max(1, Math.ceil(duree / cycle)) * cycle
  const debut = useRef(performance.now())
  const finRef = useRef(onFin)
  finRef.current = onFin
  const [ecoule, setEcoule] = useState(0)
  const [sonId, setSonId] = useState(lireSon)
  const son = sonParId(sonId)

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

  // Position dans le cycle
  const n = Math.floor(ecoule / cycle)
  let r = ecoule - n * cycle
  let i = 0
  while (i < phases.length - 1 && r >= phases[i].duree) {
    r -= phases[i].duree
    i++
  }
  const phase = phases[i]
  const de = (i === 0 ? phases[phases.length - 1] : phases[i - 1]).vers
  const f = Math.min(1, r / phase.duree)
  const niveau = de + (phase.vers - de) * ((1 - Math.cos(Math.PI * f)) / 2)
  const indexPhase = n * phases.length + i
  const reste = Math.max(0, Math.ceil(total - ecoule))

  useEffect(() => {
    demarrerAmbiance(son)
    return () => arreterAmbiance()
  }, [sonId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!son) return
    if (son.houle) houle(phase.vers, phase.duree)
    else if (phase.vers !== de) cloche(phase.vers > de)
  }, [indexPhase, sonId]) // eslint-disable-line react-hooks/exhaustive-deps

  const changerSon = () => {
    deverrouillerAudio()
    const ids = [...CONTENU.sons.filter((s) => !s.usage || s.usage.includes('seance')).map((s) => s.id), null]
    const suivant = ids[(ids.indexOf(sonId) + 1) % ids.length]
    ecrireSon(suivant)
    setSonId(suivant)
  }

  const introOpacite = ecoule < cycle ? 1 : Math.max(0, 1 - (ecoule - cycle) / 1.5)
  const long = phase.mot.length > 9 ? ' long' : ''

  return (
    <main className={`maree${sombre ? ' sombre' : ''}`} style={{ '--l': niveau }}>
      <div className="eau">
        <Vague className="vague arriere" />
        <Vague />
      </div>
      <div className={`mot${long}`} aria-live="polite">{phase.mot}</div>
      <div className={`mot mot-eau${long}`} aria-hidden="true">{phase.mot}</div>
      <div className="maree-bas">
        {introOpacite > 0 && (
          <p className="intro" style={{ opacity: introOpacite }}>
            <b>{technique.nom}.</b> {technique.pourquoi}
          </p>
        )}
        <div className="maree-ligne">
          {/* La nuit, aucune durée affichée : surveiller le temps entretient l'éveil (Tang 2007) */}
          <span className="reste">{sombre ? '' : `${Math.floor(reste / 60)}:${String(reste % 60).padStart(2, '0')}`}</span>
          <div className="actions">
            <button onClick={changerSon}>{son ? `Son : ${son.nom}` : 'Son coupé'}</button>
            <button onClick={onStop}>Arrêter</button>
          </div>
        </div>
      </div>
    </main>
  )
}
