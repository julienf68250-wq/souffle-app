// Données de la montre Garmin, importées par un Raccourci iOS qui interroge l'API Personal
// de Garmin et copie le résultat dans le presse-papiers (la clé reste dans le Raccourci).
// Seules la VFC de nuit, la fréquence cardiaque au repos et les pas sont gardés
// (stress, Body Battery et sommeil Garmin écartés : non validés, voir docs/etude/04).
import { ecrire, lire } from './stockage.js'

const CLE = 'souffle.montre'
const JOUR = 86400000
export const donneesMontre = () => lire(CLE, {})

// Parcourt n'importe quelle réponse JSON de Garmin et récupère, par date, les champs utiles
function extraire(noeud, acc) {
  if (Array.isArray(noeud)) {
    for (const x of noeud) extraire(x, acc)
    return acc
  }
  if (!noeud || typeof noeud !== 'object') return acc
  const date = noeud.calendarDate ?? noeud.date
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}/.test(date)) {
    const d = date.slice(0, 10)
    const e = (acc[d] ??= {})
    const vfc = noeud.lastNightAvg ?? noeud.hrvSummary?.lastNightAvg
    if (typeof vfc === 'number' && vfc > 0) e.vfc = vfc
    const pas = noeud.totalSteps ?? noeud.steps
    if (typeof pas === 'number' && pas >= 0 && !('lastNightAvg' in noeud)) e.pas = pas
    const fc = noeud.restingHeartRate ?? noeud.restingHeartRateValue
    if (typeof fc === 'number' && fc > 20) e.fcRepos = fc
  }
  for (const v of Object.values(noeud)) if (v && typeof v === 'object') extraire(v, acc)
  return acc
}

export function importerMontre(texte) {
  let json
  try {
    json = JSON.parse(texte)
  } catch {
    throw new Error("Le presse-papiers ne contient pas les données de la montre. Lance d'abord le Raccourci « Souffle Garmin ».")
  }
  const nouveaux = extraire(json, {})
  for (const k of Object.keys(nouveaux)) if (!Object.keys(nouveaux[k]).length) delete nouveaux[k]
  const jours = Object.keys(nouveaux)
  if (!jours.length) throw new Error('Aucune donnée reconnue (VFC, pouls au repos ou pas). Vérifie le Raccourci.')
  const actuel = donneesMontre()
  for (const d of jours) actuel[d] = { ...(actuel[d] ?? {}), ...nouveaux[d] }
  ecrire(CLE, actuel)
  return {
    jours: jours.length,
    vfc: jours.filter((d) => nouveaux[d].vfc != null).length,
    fcRepos: jours.filter((d) => nouveaux[d].fcRepos != null).length,
    pas: jours.filter((d) => nouveaux[d].pas != null).length,
  }
}

// Moyenne des 7 derniers jours comparée à l'habitude (28 jours précédents)
export function tendancesMontre() {
  const m = donneesMontre()
  const dates = Object.keys(m).sort()
  if (!dates.length) return null
  const fin = Date.now()
  const dans = (d, a, b) => {
    const t = new Date(d + 'T12:00').getTime()
    return t > fin - a * JOUR && t <= fin - b * JOUR
  }
  const moy = (champ, a, b) => {
    const v = dates.filter((d) => dans(d, a, b) && m[d][champ] != null).map((d) => m[d][champ])
    return v.length ? v.reduce((x, y) => x + y, 0) / v.length : null
  }
  const ind = (champ) => ({ semaine: moy(champ, 7, 0), habitude: moy(champ, 35, 7) })
  return { vfc: ind('vfc'), fcRepos: ind('fcRepos'), pas: ind('pas'), derniereDate: dates.at(-1) }
}
