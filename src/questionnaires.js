// Questionnaires validés, textes officiels français (voir docs/etude/03) :
// WHO-5 (bien-être, OMS, CC BY-NC-SA 3.0 IGO) et PHQ-4 = PHQ-2 + GAD-2 (Pfizer, reproduction autorisée),
// PHQ-9 et GAD-7 complets seulement si le sous-score correspondant est ≥ 3.
import { ecrire, lire } from './stockage.js'

const CLE = 'souffle.bilans'
const JOUR = 86400000
export const INTERVALLE_JOURS = 14

export const WHO5 = {
  consigne:
    'Veuillez indiquer, pour chacune des cinq affirmations, laquelle se rapproche le plus de ce que vous avez ressenti au cours des deux dernières semaines.',
  items: [
    'Je me suis senti(e) bien et de bonne humeur',
    'Je me suis senti(e) calme et tranquille',
    'Je me suis senti(e) plein(e) d’énergie et vigoureux(se)',
    'Je me suis réveillé(e) en me sentant frais(che) et dispos(e)',
    'Ma vie quotidienne a été remplie de choses intéressantes',
  ],
  reponses: ['Jamais', 'De temps en temps', 'Moins de la moitié du temps', 'Plus de la moitié du temps', 'La plupart du temps', 'Tout le temps'],
  source: 'WHO-5, Organisation mondiale de la santé (CC BY-NC-SA 3.0 IGO)',
}

// PHQ-9, version française pour la France (Pfizer)
export const PHQ = {
  consigne: 'Au cours des 2 dernières semaines, selon quelle fréquence avez-vous été gêné(e) par les problèmes suivants ?',
  items: [
    'Peu d’intérêt ou de plaisir à faire les choses',
    'Être triste, déprimé(e) ou désespéré(e)',
    'Difficultés à s’endormir ou à rester endormi(e), ou dormir trop',
    'Se sentir fatigué(e) ou manquer d’énergie',
    'Avoir peu d’appétit ou manger trop',
    'Avoir une mauvaise opinion de soi-même, ou avoir le sentiment d’être nul(le), ou d’avoir déçu sa famille ou s’être déçu(e) soi-même',
    'Avoir du mal à se concentrer, par exemple, pour lire le journal ou regarder la télévision',
    'Bouger ou parler si lentement que les autres auraient pu le remarquer. Ou au contraire, être si agité(e) que vous avez eu du mal à tenir en place par rapport à d’habitude',
    'Penser qu’il vaudrait mieux mourir ou envisager de vous faire du mal d’une manière ou d’une autre',
  ],
  reponses: ['Jamais', 'Plusieurs jours', 'Plus de la moitié du temps', 'Presque tous les jours'],
  source: 'PHQ-9 : Spitzer, Williams, Kroenke et coll., allocation Pfizer. Reproduction autorisée.',
}

// GAD-7, version française (Pfizer) ; mêmes libellés de réponse que le PHQ
export const GAD = {
  consigne: 'Au cours des 14 derniers jours, à quelle fréquence avez-vous été dérangé(e) par les problèmes suivants ?',
  items: [
    'Sentiment de nervosité, d’anxiété ou de tension',
    'Incapable d’arrêter de vous inquiéter ou de contrôler vos inquiétudes',
    'Inquiétudes excessives à propos de tout et de rien',
    'Difficulté à se détendre',
    'Agitation telle qu’il est difficile de rester tranquille',
    'Devenir facilement contrarié(e) ou irritable',
    'Avoir peur que quelque chose d’épouvantable puisse arriver',
  ],
  reponses: ['Jamais', 'Plusieurs jours', 'Plus de la moitié des jours', 'Presque tous les jours'],
  source: 'GAD-7 : Spitzer, Williams, Kroenke et coll., bourse Pfizer. Aucune permission requise.',
}

const somme = (xs) => xs.reduce((a, b) => a + b, 0)

export function scorer(r) {
  const who5 = somme(r.who5) * 4 // 0-100
  const phq2 = r.phq[0] + r.phq[1]
  const gad2 = r.gad[0] + r.gad[1]
  return {
    who5,
    phq2,
    gad2,
    phq4: phq2 + gad2,
    phq9: r.phq.length === 9 ? somme(r.phq) : null,
    gad7: r.gad.length === 7 ? somme(r.gad) : null,
    item9: r.phq.length === 9 ? r.phq[8] : null,
  }
}

export const bilans = () => lire(CLE, [])
export function enregistrerBilan(reponses) {
  const b = { t: Date.now(), ...reponses, scores: scorer(reponses) }
  ecrire(CLE, [...bilans(), b])
  return b
}

export function prochainBilan() {
  const l = bilans()
  if (!l.length) return { du: true, premier: true, jours: 0 }
  const jours = Math.ceil((l.at(-1).t + INTERVALLE_JOURS * JOUR - Date.now()) / JOUR)
  return { du: jours <= 0, premier: false, jours: Math.max(0, jours) }
}

// Ligne de base = moyenne des 2 premiers WHO-5 ; changement réel au-delà de ±10 points
export function suiviWho5() {
  const l = bilans()
  const points = l.map((b) => ({ t: b.t, v: b.scores.who5 }))
  const base = points.length >= 2 ? (points[0].v + points[1].v) / 2 : points[0]?.v ?? null
  const semaines = l.length ? Math.floor((Date.now() - l[0].t) / (7 * JOUR)) : 0
  const dernier = points.at(-1)?.v ?? null
  let verdict = null
  if (l.length >= 2 && semaines >= 8 && base != null) {
    if (dernier > base + 10) verdict = 'mieux'
    else if (dernier < base - 10) verdict = 'moins-bien'
    else verdict = 'stable'
  }
  return { points, base, semaines, dernier, verdict }
}
