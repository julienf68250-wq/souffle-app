import { useState } from 'react'

// Note de 0 à 10 en un seul geste : le chiffre touché se remplit d'eau, puis on avance.
export default function Echelle({ onChoix, gauche, droite }) {
  const [choisi, setChoisi] = useState(null)
  const choisir = (i) => {
    if (choisi != null) return
    setChoisi(i)
    setTimeout(() => onChoix(i), 320)
  }
  return (
    <div className="echelle">
      <div className="echelle-grille">
        {Array.from({ length: 11 }, (_, i) => (
          <button key={i} className={`echelle-btn${choisi === i ? ' choisi' : ''}`} onClick={() => choisir(i)}>
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
