import { useState } from 'react'
import Respiration from './Respiration.jsx'

// Réveil nocturne : écran très sombre, 5 minutes de souffle très lent, rien à noter.
export default function Reveil({ technique, onFin, versVider }) {
  const [etape, setEtape] = useState('respire')

  if (etape === 'respire')
    return <Respiration technique={technique} duree={300} sombre onFin={() => setEtape('fin')} onStop={() => setEtape('fin')} />

  return (
    <main className="ecran sombre-fin">
      <h2>Rendors-toi.</h2>
      <p className="aide">Pose le téléphone. Si quelque chose tourne encore, sors-le de ta tête.</p>
      <div className="pied">
        <button className="lien" onClick={versVider}>
          Noter ce qui tourne
        </button>
        <button className="lien" onClick={onFin}>
          Fermer
        </button>
      </div>
    </main>
  )
}
