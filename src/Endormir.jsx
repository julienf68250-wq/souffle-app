import { useEffect, useState } from 'react'
import { CONTENU, sonParId } from './contenu.js'
import { arreterEcoute, demarrerEcoute } from './audio.js'
import { preparerSeance } from './pleinEcran.js'
import { ajouterSession } from './stockage.js'

const MINUTERIES = [15, 30, 45]
const minutesDe = (s) => Math.round(s / 60)

// Écouter pour s'endormir : une histoire calme (distraction par l'imagerie, Harvey & Payne 2002)
// OU un son seul (jamais les deux : choix de JF), qui baisse doucement puis s'arrête (pas de bruit toute la nuit : Basner 2026).
export default function Endormir({ onFin }) {
  const [histoireId, setHistoireId] = useState(CONTENU.histoires[0]?.id ?? null)
  const [sonId, setSonId] = useState('mer')
  const [minutes, setMinutes] = useState(30)
  const [enCours, setEnCours] = useState(false)
  const [fini, setFini] = useState(false)
  const histoire = CONTENU.histoires.find((h) => h.id === histoireId) ?? null
  const minimum = histoire ? minutesDe(histoire.duree) + 3 : 0
  const duree = Math.max(minutes, minimum)

  // Écran gardé allumé (noir) pendant l'écoute : sur iPhone, une web app se tait écran verrouillé
  useEffect(() => {
    if (!enCours) return
    let verrou = null
    navigator.wakeLock?.request('screen').then((v) => (verrou = v)).catch(() => {})
    return () => verrou?.release().catch(() => {})
  }, [enCours])

  useEffect(() => () => arreterEcoute(), [])

  const lancer = () => {
    preparerSeance()
    demarrerEcoute({
      son: histoire ? null : sonParId(sonId),
      histoire,
      minutes: duree,
      onFin: () => {
        setEnCours(false)
        setFini(true)
      },
    })
    ajouterSession({ type: 'ecoute', t: Date.now(), histoire: histoire?.id, son: histoire ? null : sonId, minutes: duree })
    setEnCours(true)
  }

  if (enCours || fini)
    return (
      <main className="ecoute-noire" onDoubleClick={() => !fini && (arreterEcoute(), setEnCours(false))}>
        <p>{fini ? 'Bonne nuit.' : 'Pose le téléphone, écran contre le lit. Le son baissera tout seul.'}</p>
        <button
          className="lien"
          onClick={() => {
            // On revient au choix de l'écoute, là où on était
            arreterEcoute()
            setEnCours(false)
            setFini(false)
          }}
        >
          {fini ? 'Fermer' : 'Arrêter'}
        </button>
      </main>
    )

  return (
    <main className="ecran">
      <h2>Écouter pour t'endormir</h2>
      <p className="aide">
        Suivre des images calmes occupe l'esprit et éloigne les pensées qui tournent : chez des personnes insomniaques, ça a raccourci l'endormissement (une
        étude, 41 personnes). Le son baisse doucement à la fin, puis s'arrête.
      </p>

      <fieldset className="choix-liste">
        <legend>Une histoire, lue lentement</legend>
        {CONTENU.histoires.map((h) => (
          <button key={h.id} className={histoireId === h.id ? 'actif' : ''} aria-pressed={histoireId === h.id} onClick={() => setHistoireId(h.id)}>
            <strong>{h.titre}</strong>
            <span>
              {h.resume} {minutesDe(h.duree)} min, {h.auteur}, lu par {h.lecteur}.
            </span>
          </button>
        ))}
        <button className={histoireId == null ? 'actif' : ''} aria-pressed={histoireId == null} onClick={() => setHistoireId(null)}>
          <strong>Un son, sans voix</strong>
          <span>Mer, pluie, bruit brun ou rose.</span>
        </button>
      </fieldset>

      {!histoire && (
        <fieldset className="puces">
          <legend>Le son</legend>
          {CONTENU.sons.map((s) => (
            <button key={s.id} className={sonId === s.id ? 'actif' : ''} aria-pressed={sonId === s.id} onClick={() => setSonId(s.id)}>
              {s.nom}
            </button>
          ))}
        </fieldset>
      )}

      <fieldset className="puces">
        <legend>Arrêt automatique</legend>
        {MINUTERIES.map((m) => (
          <button key={m} className={minutes === m ? 'actif' : ''} aria-pressed={minutes === m} onClick={() => setMinutes(m)} disabled={m < minimum}>
            {m} min
          </button>
        ))}
      </fieldset>

      <button className="principal grand" onClick={lancer}>
        {histoire ? histoire.titre : sonParId(sonId)?.nom}
        <small>arrêt en douceur dans {duree} min</small>
      </button>
      <p className="aide">L'écran reste allumé en noir pendant l'écoute : sur iPhone, une web app se tait quand l'écran se verrouille.</p>
      <div className="pied">
        <button className="lien" onClick={onFin}>
          Retour
        </button>
      </div>
    </main>
  )
}
