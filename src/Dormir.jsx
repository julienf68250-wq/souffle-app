import { useRef, useState } from 'react'
import Dictee from './Dictee.jsx'
import Respiration from './Respiration.jsx'
import { ajouterNote, ajouterSession } from './stockage.js'
import { recommander } from './contenu.js'
import { preparerSeance } from './pleinEcran.js'
import { etatProgramme } from './sommeil.js'

const RACCOURCI = 'Dormir'

// Rituel du coucher, à faire HORS du lit : liste du lendemain (Scullin 2018),
// 2 min de souffle lent (optionnel), puis au lit seulement si le sommeil est là.
export default function Dormir({ onFin, versEcoute, etapeInitiale = 'vider' }) {
  const [etape, setEtape] = useState(etapeInitiale)
  const [texte, setTexte] = useState('')
  const [technique] = useState(() => recommander('soir'))
  const [aSouffle, setASouffle] = useState(false)
  const prog = etatProgramme()
  const champ = useRef(null)

  const lancerNuit = () => {
    ajouterSession({ type: 'nuit', t: Date.now(), technique: aSouffle ? technique.id : undefined })
    window.location.href = `shortcuts://run-shortcut?name=${encodeURIComponent(RACCOURCI)}`
    setTimeout(onFin, 800)
  }

  if (etape === 'respire')
    return <Respiration technique={technique} duree={120} onFin={() => setEtape('nuit')} onStop={() => setEtape('nuit')} />

  if (etape === 'vider')
    return (
      <main className="ecran">
        <h2>Ta liste pour demain</h2>
        <p className="aide">
          Écris précisément ce que tu as à faire demain et les jours suivants. Dans une étude, 5 minutes de liste au coucher ont fait gagner une dizaine de minutes
          d'endormissement.
        </p>
        <Dictee texte={texte} setTexte={setTexte} champ={champ} />
        <textarea ref={champ} value={texte} onChange={(e) => setTexte(e.target.value)} rows={5} placeholder="Appeler le garage avant 10 h, relire le devis…" />
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
        <p className="aide">
          Assis, hors du lit. <b>{technique.nom}.</b> {technique.pourquoi}
        </p>
        <button
          className="principal"
          onClick={() => {
            preparerSeance()
            setASouffle(true)
            setEtape('respire')
          }}
        >
          Souffler 2 minutes
        </button>
        <button className="secondaire" onClick={() => setEtape('nuit')}>
          Passer
        </button>
      </main>
    )

  return (
    <main className="ecran">
      <h2>Au lit, si le sommeil est là.</h2>
      <p className="aide">
        {prog?.coucher && `Pas avant ${prog.coucher}. `}
        Paupières lourdes : vas-y. Sinon, reste au calme hors du lit encore un moment.
        {prog && ` Lever demain à ${prog.lever}, même si la nuit est mauvaise.`}
      </p>
      <button
        className="principal grand"
        onClick={() => {
          ajouterSession({ type: 'nuit', t: Date.now(), technique: aSouffle ? technique.id : undefined })
          versEcoute()
        }}
      >
        Écouter pour m'endormir
      </button>
      <button className="secondaire" onClick={lancerNuit}>
        Juste le mode Sommeil de l'iPhone
      </button>
      <details className="config">
        <summary>Préparer le raccourci « {RACCOURCI} » (une seule fois)</summary>
        <ol>
          <li>Ouvre l'app <b>Raccourcis</b>, touche <b>+</b> et nomme le raccourci exactement <b>{RACCOURCI}</b>.</li>
          <li>Ajoute <b>Définir la concentration</b> : Sommeil, activé.</li>
          <li>Facultatif : <b>Régler la luminosité</b> à 0 %.</li>
          <li>
            Seulement si ta chambre est bruyante : <b>Définir les sons d'arrière-plan</b> (activé), son Pluie ou Océan, volume bas.
          </li>
        </ol>
        <p className="aide">
          Pourquoi pas de son toute la nuit par défaut : les preuves d'un bénéfice sont très faibles, et une étude récente montre qu'un bruit rose continu réduit le
          sommeil paradoxal. Il sert surtout à masquer les bruits extérieurs.
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
