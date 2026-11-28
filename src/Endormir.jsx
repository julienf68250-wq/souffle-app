import { useEffect, useRef, useState } from 'react'
import { CONTENU, dejaEcoutee, estNouvelle, histoireDuSoir, histoiresDisponibles, prochainesHistoires, sonParId } from './contenu.js'
import { RYTHME_HISTOIRE, arreterEcoute, demarrerEcoute } from './audio.js'
import { preparerSeance } from './pleinEcran.js'
import { ajouterSession, majSession } from './stockage.js'

const MINUTERIES = [15, 30, 45]
// Durée réelle d'écoute d'une histoire, lue ralentie
const minutesEcoute = (h) => Math.round(h.duree / RYTHME_HISTOIRE / 60)
const mmss = (s) => {
  const t = Math.max(0, Math.floor(s || 0))
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`
}

// Écouter pour s'endormir : une histoire calme (distraction par l'imagerie, Harvey & Payne 2002)
// OU un son seul (jamais les deux, choix de JF). Une histoire différente proposée chaque soir.
export default function Endormir({ onFin }) {
  const [histoire, setHistoire] = useState(histoireDuSoir)
  const [mode, setMode] = useState(() => (histoireDuSoir() ? 'histoire' : 'son')) // sans histoire : les sons directement
  const [autres, setAutres] = useState(false)
  const [sonId, setSonId] = useState('mer')
  const [minutes, setMinutes] = useState(30)
  const [lecture, setLecture] = useState(null) // { el, histoire } pour une histoire, { el: null } pour un son
  const [fini, setFini] = useState(false)
  const prochaines = prochainesHistoires()

  // Écran gardé allumé (noir) pendant l'écoute : sur iPhone, une web app se tait écran verrouillé
  useEffect(() => {
    if (!lecture) return
    let verrou = null
    navigator.wakeLock?.request('screen').then((v) => (verrou = v)).catch(() => {})
    return () => verrou?.release().catch(() => {})
  }, [lecture])

  useEffect(() => () => arreterEcoute(), [])

  const lancer = () => {
    preparerSeance()
    const h = mode === 'histoire' ? histoire : null
    const t = Date.now()
    const el = demarrerEcoute({
      son: h ? null : sonParId(sonId),
      histoire: h,
      minutes,
      onFin: () => {
        if (h) majSession(t, { ecoute: h.duree, fini: true })
        setLecture(null)
        setFini(true)
      },
    })
    ajouterSession({ type: 'ecoute', t, histoire: h?.id, son: h ? null : sonId, minutes: h ? minutesEcoute(h) : minutes })
    setFini(false)
    setLecture({ el, histoire: h, t })
  }

  const arreter = () => {
    // Temps réellement écouté : une histoire coupée après quelques secondes reste dans le roulement
    if (lecture?.el && lecture.t) majSession(lecture.t, { ecoute: Math.round(lecture.el.currentTime) })
    arreterEcoute()
    setLecture(null)
    setFini(false)
  }

  if (lecture?.el) return <Lecteur el={lecture.el} histoire={lecture.histoire} onArreter={arreter} />

  if (lecture || fini)
    return (
      <main className="ecoute-noire">
        <p>{fini ? 'Bonne nuit.' : 'Pose le téléphone, écran contre le lit. Le son baissera tout seul.'}</p>
        <button className="lien" onClick={arreter}>
          {fini ? 'Fermer' : 'Arrêter'}
        </button>
      </main>
    )

  const liste = histoiresDisponibles()
    .filter((h) => h.id !== histoire?.id)
    .sort((a, b) => Number(dejaEcoutee(a)) - Number(dejaEcoutee(b)) || (b.semaine ?? 0) - (a.semaine ?? 0))

  return (
    <main className="ecran">
      <h2>Écouter pour t'endormir</h2>
      {histoire ? (
        <fieldset className="choix-liste">
          <legend>Ce soir</legend>
          <button className={mode === 'histoire' ? 'actif' : ''} aria-pressed={mode === 'histoire'} onClick={() => setMode('histoire')}>
            <strong>
              {histoire.titre}
              {estNouvelle(histoire) && <em className="nouvelle">nouvelle</em>}
            </strong>
            <span>
              {histoire.resume} {minutesEcoute(histoire)} min.
            </span>
          </button>
          <button className={mode === 'son' ? 'actif' : ''} aria-pressed={mode === 'son'} onClick={() => setMode('son')}>
            <strong>Un son, sans voix</strong>
            <span>Mer, pluie, ruisseau, nuit d’été ou bruit, avec arrêt automatique.</span>
          </button>
        </fieldset>
      ) : (
        <p className="aide">Un son qui baisse doucement, puis s’arrête tout seul.</p>
      )}

      {mode === 'histoire' && liste.length > 0 && (
        <div className="autres-histoires">
          <button className="lien" onClick={() => setAutres((v) => !v)} aria-expanded={autres}>
            {autres ? 'Masquer les autres histoires' : `Choisir une autre histoire (${liste.length})`}
          </button>
          {autres && (
            <ul>
              {liste.map((h) => (
                <li key={h.id}>
                  <button
                    onClick={() => {
                      setHistoire(h)
                      setAutres(false)
                    }}
                  >
                    <span className="titre-h">
                      {h.titre}
                      {estNouvelle(h) && <em className="nouvelle">nouvelle</em>}
                    </span>
                    <span className="meta-h">
                      {h.auteur}, {minutesEcoute(h)} min{dejaEcoutee(h) ? ', déjà écoutée' : ''}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {prochaines && (
            <p className="aide">
              {prochaines.n} nouvelle{prochaines.n > 1 ? 's' : ''} histoire{prochaines.n > 1 ? 's' : ''} dans {prochaines.jours} jour{prochaines.jours > 1 ? 's' : ''}.
            </p>
          )}
        </div>
      )}

      {mode === 'son' && (
        <>
          <fieldset className="puces">
            <legend>Le son</legend>
            {CONTENU.sons.map((s) => (
              <button key={s.id} className={sonId === s.id ? 'actif' : ''} aria-pressed={sonId === s.id} onClick={() => setSonId(s.id)}>
                {s.nom}
              </button>
            ))}
          </fieldset>
          <fieldset className="puces">
            <legend>Arrêt automatique</legend>
            {MINUTERIES.map((m) => (
              <button key={m} className={minutes === m ? 'actif' : ''} aria-pressed={minutes === m} onClick={() => setMinutes(m)}>
                {m} min
              </button>
            ))}
          </fieldset>
        </>
      )}

      <button className="principal grand" onClick={lancer} disabled={mode === 'histoire' && !histoire}>
        {mode === 'histoire' ? histoire?.titre : sonParId(sonId)?.nom}
        <small>{mode === 'histoire' ? `${histoire ? minutesEcoute(histoire) : 0} min, fondu à la fin` : `arrêt en douceur dans ${minutes} min`}</small>
      </button>
      <p className="aide">
        L'écran reste allumé en noir pendant l'écoute : sur iPhone, une web app se tait quand l'écran se verrouille.
        {mode === 'histoire' && histoire?.url && ' Les histoires se lisent en ligne.'}
      </p>
      <div className="pied">
        <button className="lien" onClick={onFin}>
          Retour
        </button>
      </div>
    </main>
  )
}

// Lecteur d'histoire : retour 15 s, lecture/pause, avance 30 s, barre de progression.
// Écran noir et commandes à peine visibles ; commandes aussi sur l'écran verrouillé (Media Session).
function Lecteur({ el, histoire, onArreter }) {
  const [pos, setPos] = useState(0)
  const [duree, setDuree] = useState(histoire.duree)
  const [enPause, setEnPause] = useState(false)
  const [charge, setCharge] = useState(true)
  const glisse = useRef(false)

  useEffect(() => {
    const maj = () => !glisse.current && setPos(el.currentTime)
    const meta = () => isFinite(el.duration) && setDuree(el.duration)
    const etat = () => setEnPause(el.paused)
    const attente = () => setCharge(true)
    const pret = () => setCharge(false)
    const evts = [
      ['timeupdate', maj],
      ['loadedmetadata', meta],
      ['play', etat],
      ['pause', etat],
      ['waiting', attente],
      ['playing', pret],
      ['canplay', pret],
    ]
    for (const [n, f] of evts) el.addEventListener(n, f)

    const ms = navigator.mediaSession
    const actions = {
      play: () => el.play(),
      pause: () => el.pause(),
      seekbackward: () => (el.currentTime = Math.max(0, el.currentTime - 15)),
      seekforward: () => (el.currentTime = Math.min(el.duration || 1e9, el.currentTime + 30)),
    }
    if (ms) {
      try {
        ms.metadata = new window.MediaMetadata({ title: histoire.titre, artist: histoire.auteur, album: 'Souffle' })
      } catch {
        /* métadonnées indisponibles */
      }
      for (const [a, f] of Object.entries(actions))
        try {
          ms.setActionHandler(a, f)
        } catch {
          /* action non prise en charge */
        }
    }
    return () => {
      for (const [n, f] of evts) el.removeEventListener(n, f)
      if (ms)
        for (const a of Object.keys(actions))
          try {
            ms.setActionHandler(a, null)
          } catch {
            /* rien */
          }
    }
  }, [el, histoire])

  const deplacer = (d) => {
    el.currentTime = Math.min(Math.max(0, el.currentTime + d), Math.max(0, (duree || el.duration) - 1))
    setPos(el.currentTime)
  }
  const aller = (v) => {
    glisse.current = false
    el.currentTime = v
    setPos(v)
  }

  return (
    <main className="ecoute-noire lecteur">
      <p className="lecteur-titre">{histoire.titre}</p>
      <p className="lecteur-auteur">
        {histoire.auteur}, lu par {histoire.lecteur}
      </p>
      <input
        className="progression"
        type="range"
        min="0"
        max={Math.round(duree)}
        step="1"
        value={Math.round(pos)}
        aria-label="Position dans l'histoire"
        style={{ '--avance': `${(pos / (duree || 1)) * 100}%` }}
        onPointerDown={() => (glisse.current = true)}
        onChange={(e) => setPos(Number(e.target.value))}
        onPointerUp={(e) => aller(Number(e.target.value))}
        onKeyUp={(e) => aller(Number(e.target.value))}
      />
      <div className="temps">
        <span>{mmss(pos / RYTHME_HISTOIRE)}</span>
        <span>{charge && !enPause ? 'chargement…' : `−${mmss((duree - pos) / RYTHME_HISTOIRE)}`}</span>
      </div>
      <div className="commandes">
        <button onClick={() => deplacer(-15)} aria-label="Reculer de 15 secondes">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 5a7 7 0 1 1-6.6 4.7M5 4v5h5" />
          </svg>
          <span>15</span>
        </button>
        <button className="lecture" onClick={() => (el.paused ? el.play() : el.pause())} aria-label={enPause ? 'Lecture' : 'Pause'}>
          {enPause ? (
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path className="plein" d="M8 5.5v13l10.5-6.5z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M8.5 5v14M15.5 5v14" />
            </svg>
          )}
        </button>
        <button onClick={() => deplacer(30)} aria-label="Avancer de 30 secondes">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 5a7 7 0 1 0 6.6 4.7M19 4v5h-5" />
          </svg>
          <span>30</span>
        </button>
      </div>
      <button className="lien" onClick={onArreter}>
        Arrêter
      </button>
    </main>
  )
}
