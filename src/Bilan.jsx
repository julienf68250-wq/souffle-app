import { useState } from 'react'
import { GAD, PHQ, WHO5, enregistrerBilan, suiviWho5 } from './questionnaires.js'
import { NumerosUrgence } from './Reglages.jsx'

// Le point toutes les 2 semaines : WHO-5 (5 questions) + PHQ-4 (4 questions),
// prolongé par le PHQ-9 ou le GAD-7 complet seulement si un sous-score est ≥ 3.
// Une question par écran ; l'écran de sécurité passe avant tout score.
export default function Bilan({ onFin }) {
  const [rep, setRep] = useState({ who5: [], phq: [], gad: [] })
  const [pile, setPile] = useState([]) // questions répondues, pour revenir en arrière
  const [intro, setIntro] = useState(true)
  const [fin, setFin] = useState(null) // bilan enregistré
  const [securiteVue, setSecuriteVue] = useState(false)

  // Prochaine question selon les réponses déjà données
  const suivante = (r) => {
    if (r.who5.length < 5) return { bloc: 'who5', i: r.who5.length }
    if (r.phq.length < 2) return { bloc: 'phq', i: r.phq.length }
    if (r.gad.length < 2) return { bloc: 'gad', i: r.gad.length }
    if (r.phq[0] + r.phq[1] >= 3 && r.phq.length < 9) return { bloc: 'phq', i: r.phq.length }
    if (r.gad[0] + r.gad[1] >= 3 && r.gad.length < 7) return { bloc: 'gad', i: r.gad.length }
    return null
  }
  const q = suivante(rep)
  const total = 9 + (rep.phq.length >= 2 && rep.phq[0] + rep.phq[1] >= 3 ? 7 : 0) + (rep.gad.length >= 2 && rep.gad[0] + rep.gad[1] >= 3 ? 5 : 0)

  const repondre = (v) => {
    const r = { ...rep, [q.bloc]: [...rep[q.bloc], v] }
    setPile([...pile, q.bloc])
    setRep(r)
    if (!suivante(r)) setFin(enregistrerBilan(r))
  }
  const precedente = () => {
    if (!pile.length) return setIntro(true)
    const bloc = pile.at(-1)
    setPile(pile.slice(0, -1))
    setRep({ ...rep, [bloc]: rep[bloc].slice(0, -1) })
  }

  if (intro)
    return (
      <main className="ecran">
        <h2>Faire le point</h2>
        <p className="aide">
          9 questions, environ 2 minutes, toutes les deux semaines. Ce sont des questionnaires validés : le WHO-5 de l’OMS pour le bien-être, le PHQ-4 pour
          l’humeur et l’anxiété. Réponds pour les deux dernières semaines, sans trop réfléchir.
        </p>
        <p className="aide">Tes réponses restent sur ton téléphone.</p>
        <button className="principal grand" onClick={() => setIntro(false)}>
          Commencer
        </button>
      </main>
    )

  // Sécurité : pensées de mort ou d'auto-agression signalées (PHQ-9 item 9 > 0)
  if (fin && fin.scores.item9 > 0 && !securiteVue)
    return (
      <main className="ecran">
        <h2>Tu as indiqué des pensées de mort.</h2>
        <p className="aide">Tu n’as pas à rester seul avec ça. Des personnes formées sont là pour en parler, maintenant, gratuitement et sans jugement.</p>
        <NumerosUrgence />
        <p className="aide">Ton médecin traitant peut aussi t’aider cette semaine.</p>
        <button className="secondaire" onClick={() => setSecuriteVue(true)}>
          Continuer
        </button>
      </main>
    )

  if (fin) return <Resultat bilan={fin} onFin={onFin} />

  const def = q.bloc === 'who5' ? WHO5 : q.bloc === 'phq' ? PHQ : GAD
  const fait = rep.who5.length + rep.phq.length + rep.gad.length
  const options = def.reponses.map((libelle, v) => ({ libelle, v }))
  if (q.bloc === 'who5') options.reverse() // « Tout le temps » en premier, comme le questionnaire officiel

  return (
    <main className="ecran question-ecran">
      <p className="compteur">
        Question {fait + 1} sur {Math.max(total, fait + 1)}
      </p>
      <p className="consigne-q">{def.consigne}</p>
      <h2 className="item-q">{def.items[q.i]}</h2>
      <div className="reponses-q">
        {options.map((o) => (
          <button key={o.v} onClick={() => repondre(o.v)}>
            {o.libelle}
          </button>
        ))}
      </div>
      <div className="pied">
        <button className="lien" onClick={precedente}>
          Question précédente
        </button>
      </div>
    </main>
  )
}

function Resultat({ bilan, onFin }) {
  const s = bilan.scores
  const suivi = suiviWho5()
  const premier = suivi.points.length === 1
  const ecart = suivi.base != null && !premier ? Math.round(s.who5 - suivi.base) : null
  const orienter = (s.phq9 ?? 0) >= 10 || (s.gad7 ?? 0) >= 10 || s.phq4 >= 6 || s.who5 <= 28

  return (
    <main className="ecran">
      <h2>{premier ? 'Ton point de départ est posé.' : 'C’est noté.'}</h2>
      <p className="constat">
        Bien-être : <b>{s.who5} sur 100</b>
        {ecart != null && <> ({ecart >= 0 ? '+' : '−'}{Math.abs(ecart)} par rapport à ton point de départ)</>}.
      </p>
      <p className="aide">
        {premier
          ? 'Prochain point dans 14 jours. Le deuxième complétera ta ligne de base ; on regardera l’évolution à partir de la semaine 8.'
          : suivi.semaines < 8
            ? `Prochain point dans 14 jours. Un écart de moins de 10 points est du bruit : on juge à partir de la semaine 8 (encore ${8 - suivi.semaines} semaine${8 - suivi.semaines > 1 ? 's' : ''}).`
            : 'Prochain point dans 14 jours. Ton évolution est dans l’onglet Progrès.'}
      </p>
      {orienter && (
        <div className="alerte">
          <p>
            Tes réponses montrent une gêne importante. Une app seule ne suffit pas : <b>parles-en à ton médecin cette semaine</b>. Avec « Mon soutien psy », tu
            peux aussi voir directement un psychologue partenaire, avec des séances remboursées.
          </p>
        </div>
      )}
      <button className="principal" onClick={onFin}>
        Terminer
      </button>
    </main>
  )
}
