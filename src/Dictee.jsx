import { useEffect, useRef, useState } from 'react'

const Reconnaissance = typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null

// Dicter au lieu d'écrire. Reconnaissance vocale du navigateur (Safari : serveurs d'Apple) si
// disponible ; sinon, on ouvre le clavier et on rappelle son micro (dictée souvent sur l'appareil).
export default function Dictee({ texte, setTexte, champ }) {
  const [ecoute, setEcoute] = useState(false)
  const [message, setMessage] = useState('')
  const rec = useRef(null)

  useEffect(() => () => rec.current?.abort?.(), [])

  const clavier = (raison) => {
    setMessage(raison)
    champ.current?.focus()
  }

  const basculer = () => {
    if (ecoute) {
      rec.current?.stop()
      return
    }
    if (!Reconnaissance) return clavier('Touche le micro du clavier pour dicter.')
    try {
      const r = new Reconnaissance()
      r.lang = 'fr-FR'
      r.continuous = true
      r.interimResults = true
      const base = texte && !texte.endsWith(' ') && !texte.endsWith('\n') ? texte + ' ' : texte
      // Si rien n'arrive (service muet dans certaines web apps installées), on propose le clavier
      let entendu = false
      const secours = setTimeout(() => {
        if (!entendu) setMessage("Rien ne s'écrit ? Arrête, puis touche le micro du clavier.")
      }, 5000)
      r.onresult = (e) => {
        entendu = true
        clearTimeout(secours)
        setMessage('')
        let dit = ''
        for (let i = 0; i < e.results.length; i++) dit += e.results[i][0].transcript
        setTexte(base + dit.trimStart())
      }
      r.onerror = (e) => {
        clearTimeout(secours)
        setEcoute(false)
        if (e.error === 'no-speech') setMessage("Je n'ai rien entendu. Réessaie.")
        else if (e.error === 'not-allowed') clavier("Micro refusé pour l'app. Utilise le micro du clavier.")
        else clavier("Dictée indisponible ici. Touche le micro du clavier.")
      }
      r.onend = () => {
        clearTimeout(secours)
        setEcoute(false)
      }
      r.start()
      rec.current = r
      setMessage('')
      setEcoute(true)
    } catch {
      clavier("Dictée indisponible ici. Touche le micro du clavier.")
    }
  }

  return (
    <div className="dictee">
      <button className={`dicter${ecoute ? ' actif' : ''}`} onClick={basculer} aria-pressed={ecoute}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="9" y="3" width="6" height="11" rx="3" />
          <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" />
        </svg>
        {ecoute ? 'Arrêter la dictée' : 'Dicter'}
      </button>
      {message && <p className="aide">{message}</p>}
    </div>
  )
}
