// Le contenu (techniques, sons, nouveautés) vit dans contenu/contenu.json.
// Ici : progression hebdomadaire et choix automatique de la technique.
import contenu from './contenu/contenu.json'
import { CLES, ecrire, lire, sessions } from './stockage.js'

export const CONTENU = contenu
const JOUR = 86400000

export function debut() {
  let d = lire(CLES.debut, null)
  if (!d) {
    d = Date.now()
    ecrire(CLES.debut, d)
  }
  return d
}
export const semaineCourante = () => Math.floor((Date.now() - debut()) / (7 * JOUR))
export const techniquesDisponibles = () => contenu.techniques.filter((t) => t.semaine <= semaineCourante())
export const sonParId = (id) => contenu.sons.find((s) => s.id === id) ?? null

export function moment() {
  const h = new Date().getHours()
  return h >= 21 || h < 6 ? 'soir' : 'jour'
}

// Baisse moyenne de stress par technique (séances notées avant et après)
export function statsParTechnique() {
  const st = {}
  for (const s of sessions()) {
    if (s.type !== 'souffle' || !s.technique) continue
    const e = (st[s.technique] ??= { n: 0, notees: 0, somme: 0 })
    e.n++
    if (s.avant != null && s.apres != null) {
      e.notees++
      e.somme += s.avant - s.apres
    }
  }
  for (const e of Object.values(st)) e.baisse = e.notees ? e.somme / e.notees : null
  return st
}

const dejaFaites = () => new Set(sessions().map((s) => s.technique).filter(Boolean))

// Techniques débloquées après la première semaine et jamais pratiquées
export function nouveautesNonEssayees(m) {
  const faites = dejaFaites()
  return techniquesDisponibles().filter((t) => t.semaine > 0 && !faites.has(t.id) && (!m || t.moments.includes(m)))
}

export function prochaineTechnique() {
  const s = semaineCourante()
  const t = contenu.techniques.filter((x) => x.semaine > s).sort((a, b) => a.semaine - b.semaine)[0]
  if (!t) return null
  const jours = Math.ceil((debut() + t.semaine * 7 * JOUR - Date.now()) / JOUR)
  return { technique: t, jours }
}

// Une seule technique proposée, jamais de menu :
// 1. stress ≥ 7 → la technique d'urgence ;
// 2. une technique débloquée jamais essayée → on la découvre ;
// 3. sinon la plus efficace sur toi, avec une fois sur quatre une autre pour continuer à apprendre.
export function recommander(m, stress = null) {
  const dispo = techniquesDisponibles()
  if (stress != null && stress >= 7) {
    const u = dispo.find((t) => t.urgence)
    if (u) return u
  }
  const pourMoment = dispo.filter((t) => t.moments.includes(m) && !t.urgence)
  if (!pourMoment.length) return dispo[0] ?? contenu.techniques[0]
  const faites = dejaFaites()
  const neuve = pourMoment.find((t) => !faites.has(t.id))
  if (neuve) return neuve
  const st = statsParTechnique()
  const classe = [...pourMoment].sort((a, b) => (st[b.id]?.baisse ?? 0) - (st[a.id]?.baisse ?? 0))
  if (classe.length > 1 && Math.random() < 0.25) return classe[1 + Math.floor(Math.random() * (classe.length - 1))]
  return classe[0]
}

export function meilleure() {
  const st = statsParTechnique()
  let best = null
  for (const t of contenu.techniques) {
    const e = st[t.id]
    if (e && e.notees >= 3 && (best == null || e.baisse > st[best.id].baisse)) best = t
  }
  return best
}

export const nouveautesAAfficher = () => contenu.nouveautes.filter((n) => n.version > lire(CLES.versionVue, 0))
export const marquerNouveautesVues = () => ecrire(CLES.versionVue, contenu.version)
