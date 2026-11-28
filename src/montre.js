// Données de la montre Garmin, déposées toutes les 3 h par le robot du dépôt privé souffle-donnees
// (chiffrées, voir sync.js et cleMontre.js). Seuls 3 signaux sont montrés : marche, effort,
// pouls au repos (docs/etude/09). Stress, Body Battery, SpO2 et sommeil Garmin : gardés mais jamais affichés.
import { ecrire, lire } from './stockage.js'
import { dateLocale } from './sommeil.js'

const CLE = 'souffle.montre'
const JOUR = 86400000
export const donneesMontre = () => lire(CLE, {})

// Données déposées par le robot Garmin : pour chaque jour, les valeurs du robot font foi
export function fusionnerMontre(jours) {
  const actuel = donneesMontre()
  for (const [d, e] of Object.entries(jours ?? {})) actuel[d] = { ...(actuel[d] ?? {}), ...e }
  ecrire(CLE, actuel)
}

// ---------- Signaux (docs/etude/09) ----------
// Aujourd'hui (J) est toujours exclu : la journée n'est pas finie. Base = médiane de J-35 à J-8.
const mediane = (v) => {
  const s = [...v].sort((a, b) => a - b)
  const m = s.length >> 1
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}
const jourDecale = (k) => dateLocale(new Date(Date.now() - k * JOUR))
export const SEUIL_PAS = 7000

export function signauxMontre() {
  const m = donneesMontre()
  const dates = Object.keys(m).sort()
  if (!dates.length) return null
  const val = (k, champ) => m[jourDecale(k)]?.[champ]
  const semaine = [1, 2, 3, 4, 5, 6, 7]

  // 1. Marche : jours à 7 000 pas ou plus sur les 7 derniers jours complets
  const pasConnus = semaine.filter((k) => val(k, 'pas') != null)
  const marche = pasConnus.length >= 4 ? { jours: pasConnus.filter((k) => val(k, 'pas') >= SEUIL_PAS).length, connus: pasConnus.length } : null

  // 2. Effort : minutes modérées + 2 × intenses sur 7 jours (repères 75 puis 150, OMS)
  const effConnus = semaine.filter((k) => val(k, 'minModerees') != null || val(k, 'minIntenses') != null)
  const effort = effConnus.length >= 4 ? { minutes: effConnus.reduce((t, k) => t + (val(k, 'minModerees') ?? 0) + 2 * (val(k, 'minIntenses') ?? 0), 0) } : null

  // 3. Pouls au repos comparé à l'habitude
  const baseVals = []
  for (let k = 8; k <= 35; k++) if (val(k, 'fcRepos') != null) baseVals.push(val(k, 'fcRepos'))
  let pouls = null
  if (baseVals.length >= 14) {
    const base = mediane(baseVals)
    const sem = semaine.map((k) => val(k, 'fcRepos')).filter((x) => x != null)
    const moy7 = sem.length ? sem.reduce((a, b) => a + b, 0) / sem.length : null
    const hier = val(1, 'fcRepos')
    const avantHier = val(2, 'fcRepos')
    const deuxJours = hier != null && avantHier != null && hier >= base + 5 && avantHier >= base + 5
    pouls = { base, moy7, haut: deuxJours || (moy7 != null && moy7 >= base + 3) }
  }
  return { marche, effort, pouls, derniereDate: dates.at(-1) }
}

// Pistes personnelles : pas du jour J contre la nuit qui suit (notée le matin de J+1).
// Garde-fous (docs/etude/09) : ≥ 28 paires, ≥ 10 par groupe, écart net sinon rien.
export function pistesMarche(nuits) {
  const m = donneesMontre()
  const veille = (iso) => {
    const d = new Date(iso + 'T12:00')
    d.setDate(d.getDate() - 1)
    return dateLocale(d)
  }
  const paires = nuits.map((n) => ({ n, pas: m[veille(n.date)]?.pas })).filter((p) => p.pas != null)
  const groupes = (f) => {
    const ok = paires.filter((p) => f(p.n) != null)
    const actifs = ok.filter((p) => p.pas >= SEUIL_PAS)
    const calmes = ok.filter((p) => p.pas < SEUIL_PAS)
    if (ok.length < 28 || actifs.length < 10 || calmes.length < 10) return { manque: Math.max(0, 28 - ok.length), n: ok.length }
    const moy = (g) => g.reduce((t, p) => t + f(p.n), 0) / g.length
    return { actifs: moy(actifs), calmes: moy(calmes), nActifs: actifs.length, nCalmes: calmes.length }
  }
  return {
    nuit: groupes((n) => (typeof n.qualite === 'number' ? n.qualite : null)),
    jambes: groupes((n) => (n.jambes == null ? null : n.jambes <= 2 ? 100 : 0)), // part de nuits aux jambes calmes (0 à 2), en %
  }
}
