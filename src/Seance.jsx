import { useState } from 'react'
import Echelle from './Echelle.jsx'
import Respiration from './Respiration.jsx'
import { ajouterSession } from './stockage.js'
import { deverrouillerAudio } from './audio.js'

// Séance de jour : note avant, cohérence cardiaque 5 s / 5 s, note après.
export default function Seance({ duree, onFin }) {
  const [etape, setEtape] = useState('avant')
  const [avant, setAvant] = useState(null)

  const commencer = (v) => {
    deverrouillerAudio()
    setAvant(v)
    setEtape('respire')
  }
  const terminer = (apres) => {
    ajouterSession({ type: 'souffle', t: Date.now(), duree, avant, apres })
    onFin()
  }

  if (etape === 'respire')
    return <Respiration duree={duree} inspire={5} expire={5} onFin={() => setEtape('apres')} onStop={() => setEtape('apres')} />

  const avantEtape = etape === 'avant'
  return (
    <main className="ecran">
      <h2>{avantEtape ? 'Ton stress, là, maintenant ?' : 'Et maintenant ?'}</h2>
      <p className="aide">
        {avantEtape ? 'Touche un chiffre, la séance démarre.' : 'Note-le, même si rien n’a bougé. C’est comme ça que tu sauras si ça marche.'}
      </p>
      <Echelle onChoix={avantEtape ? commencer : terminer} gauche="calme" droite="à bout" />
      <div className="pied">
        <button className="lien" onClick={() => (avantEtape ? commencer(null) : terminer(null))}>
          {avantEtape ? 'Démarrer sans noter' : 'Terminer sans noter'}
        </button>
        {avantEtape && (
          <button className="lien" onClick={onFin}>
            Retour
          </button>
        )}
      </div>
    </main>
  )
}
