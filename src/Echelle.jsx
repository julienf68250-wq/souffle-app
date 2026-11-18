// Note de 0 à 10 en un seul geste.
export default function Echelle({ onChoix, gauche, droite }) {
  return (
    <div className="echelle">
      <div className="echelle-grille">
        {Array.from({ length: 11 }, (_, i) => (
          <button key={i} className="echelle-btn" onClick={() => onChoix(i)}>
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
