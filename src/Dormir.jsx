import { useState } from 'react'
import Respiration from './Respiration.jsx'
import { ajouterNote, ajouterSession } from './stockage.js'
import { deverrouillerAudio } from './audio.js'

const RACCOURCI = 'Dormir'

// Rituel du coucher : vider sa tête, 2 min de souffle lent (optionnel), lancer la nuit.
export default function Dormir({ onFin }) {
  const [etape, setEtape] = useState('vider')
  const [texte, setTexte] = useState('')

  const lancerNuit = () => {
    ajouterSession({ type: 'nuit', t: Date.now() })
    window.location.href = `shortcuts://run-shortcut?name=${encodeURIComponent(RACCOURCI)}`
    setTimeout(onFin, 800)
  }

  if (etape === 'respire')
    return <Respiration duree={120} inspire={4} expire={6} onFin={() => setEtape('nuit')} onStop={() => setEtape('nuit')} />

  if (etape === 'vider')
    return (
      <main className="ecran">
        <h2>Qu'est-ce qui tourne dans ta tête ?</h2>
        <p className="aide">Note-le en vrac. Demain matin, ce sera là. Cette nuit, tu n'en as plus besoin.</p>
        <textarea value={texte} onChange={(e) => setTexte(e.target.value)} rows={5} />
        <button
          className="principal"
          onClick={() => {
            if (texte.trim()) ajouterNote(texte.trim())
            setEtape('souffle')
          }}
        >
          {texte.trim() ? 'Ranger pour demain' : 'Rien à ranger'}
        </button>
        <div className="pied">
          <button className="lien" onClick={onFin}>
            Retour
          </button>
        </div>
      </main>
    )

  if (etape === 'souffle')
    return (
      <main className="ecran">
        <h2>Deux minutes de souffle lent ?</h2>
        <p className="aide">Inspire 4 secondes, expire 6. L'expiration longue ralentit le cœur.</p>
        <button
          className="principal"
          onClick={() => {
            deverrouillerAudio()
            setEtape('respire')
          }}
        >
          Souffler 2 minutes
        </button>
        <button className="secondaire" onClick={() => setEtape('nuit')}>
          Passer, je vais au lit
        </button>
      </main>
    )

  return (
    <main className="ecran">
      <h2>Bonne nuit.</h2>
      <p className="aide">Une fois le son lancé, pose le téléphone écran contre le lit.</p>
      <button className="principal grand" onClick={lancerNuit}>
        Lancer la nuit
      </button>
      <details className="config">
        <summary>Préparer le raccourci « {RACCOURCI} » (une seule fois)</summary>
        <ol>
          <li>Ouvre l'app <b>Raccourcis</b>, touche <b>+</b> et nomme le raccourci exactement <b>{RACCOURCI}</b>.</li>
          <li>Ajoute <b>Définir la concentration</b> : Sommeil, activé.</li>
          <li>Ajoute <b>Définir les sons d'arrière-plan</b> : activé.</li>
          <li>Ajoute <b>Changer le son d'arrière-plan</b> : Pluie, Océan ou Bruit sombre.</li>
          <li>Ajoute <b>Régler le volume des sons d'arrière-plan</b> : 30 à 40 %.</li>
          <li>Facultatif : <b>Régler la luminosité</b> à 0 %.</li>
        </ol>
        <p className="aide">
          Le son tourne toute la nuit à bas volume, ce qui aide aussi à se rendormir. Pour l'arrêter : Centre de contrôle, icône oreille.
        </p>
      </details>
      <div className="pied">
        <button className="lien" onClick={onFin}>
          Retour
        </button>
      </div>
    </main>
  )
}
