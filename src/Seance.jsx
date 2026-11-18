import { useState } from 'react'
import Echelle from './Echelle.jsx'
import Respiration from './Respiration.jsx'
import { ajouterSession } from './stockage.js'
import { moment, recommander } from './contenu.js'
import { deverrouillerAudio } from './audio.js'

// Séance : note avant → Souffle choisit la technique → marée → note après.
export default function Seance({ duree, onFin }) {
  const [etape, setEtape] = useState('avant')
  const [avant, setAvant] = useState(null)
  const [technique, setTechnique] = useState(null)

  const commencer = (v) => {
    deverrouillerAudio()
    setAvant(v)
    setTechnique(recommander(moment(), v))
    setEtape('respire')
  }
  const terminer = (apres) => {
    ajouterSession({ type: 'souffle', t: Date.now(), technique: technique?.id, duree, avant, apres })
    onFin()
  }

  if (etape === 'respire')
    return <Respiration technique={technique} duree={duree} onFin={() => setEtape('apres')} onStop={() => setEtape('apres')} />

  const avantEtape = etape === 'avant'
  return (
    <main className="ecran">
      <h2>{avantEtape ? 'Ton stress, là, maintenant ?' : 'C’est fait. Et maintenant ?'}</h2>
      <p className="aide">
        {avantEtape
          ? 'Touche un chiffre : Souffle choisit la technique et démarre.'
          : `Après « ${technique.nom} ». Note-le, même si rien n’a bougé : c’est comme ça que Souffle apprend ce qui marche sur toi.`}
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
