import { useState } from 'react'

// Note de 0 à 10 en un seul geste : le chiffre touché se remplit d'eau, puis on avance.
// auToucher s'exécute dans le geste lui-même (son et plein écran l'exigent), avant l'animation.
// Avec `valeur`, l'échelle devient un simple choix modifiable (formulaire).
export default function Echelle({ onChoix, auToucher, gauche, droite, valeur }) {
  const [choisi, setChoisi] = useState(null)
  const controle = valeur !== undefined
  const choisir = (i) => {
    if (controle) return onChoix(i)
    if (choisi != null) return
    auToucher?.()
    setChoisi(i)
    setTimeout(() => onChoix(i), 320)
  }
  const actif = controle ? valeur : choisi
  return (
    <div className="echelle">
      <div className="echelle-grille">
        {Array.from({ length: 11 }, (_, i) => (
          <button key={i} className={`echelle-btn${actif === i ? ' choisi' : ''}`} onClick={() => choisir(i)} aria-pressed={actif === i}>
            {i}
          </button>
        ))}
      </div>
      <div className="echelle-legende">
        <span>{gauche}</span>
        <span>{droite}</span>
      </div>
    </div>
  )
}
