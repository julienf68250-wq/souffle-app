// Tout reste sur le téléphone (localStorage). Rien n'est envoyé nulle part.
export const CLES = {
  sessions: 'souffle.sessions',
  notes: 'souffle.notes',
  son: 'souffle.son',
  debut: 'souffle.debut',
  versionVue: 'souffle.version-vue',
  theme: 'souffle.theme',
}

export function lire(cle, defaut) {
  try {
    const v = localStorage.getItem(cle)
    return v == null ? defaut : JSON.parse(v)
  } catch {
    return defaut
  }
}

// Clés propres à ce téléphone : jamais exportées ni envoyées en ligne (jeton, phrase secrète…)
export const CLES_LOCALES = ['souffle.sync', 'souffle.sync-etat', 'souffle.dernier-export']

export function ecrire(cle, valeur) {
  try {
    localStorage.setItem(cle, JSON.stringify(valeur))
  } catch {
    /* stockage indisponible : l'app fonctionne quand même, sans historique */
  }
  // Prévient la sauvegarde en ligne qu'il y a du nouveau
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('souffle-ecriture', { detail: cle }))
}

// Sessions : { t, type: 'souffle' | 'nuit' | 'reveil', technique?, duree?, avant?, apres?, note? }
export const sessions = () => lire(CLES.sessions, [])
export const ajouterSession = (s) => ecrire(CLES.sessions, [...sessions(), s])
export const majSession = (t, champs) =>
  ecrire(CLES.sessions, sessions().map((s) => (s.t === t ? { ...s, ...champs } : s)))

// Notes « vider sa tête » : { id, t, texte }
export const notes = () => lire(CLES.notes, [])
export const ajouterNote = (texte) =>
  ecrire(CLES.notes, [...notes(), { id: Date.now(), t: Date.now(), texte }])
export function supprimerNote(id) {
  // Trace de suppression : la note ne revient pas depuis la copie en ligne
  ecrire('souffle.supprimes', [...new Set([...lire('souffle.supprimes', []), id])])
  ecrire(CLES.notes, notes().filter((n) => n.id !== id))
}

// Ambiance sonore choisie (id d'un son de contenu.json, ou null = silence). La mer par défaut.
export function lireSon() {
  const v = lire(CLES.son, 'mer')
  if (v === true) return 'mer' // ancienne v1
  if (v === false) return null
  return v
}
export const ecrireSon = (id) => ecrire(CLES.son, id)

// Nuit d'hier sans note du matin (pour la question « ta nuit, de 0 à 10 ? »)
export function nuitANoter() {
  const h = new Date().getHours()
  if (h < 5 || h >= 13) return null
  const limite = Date.now() - 16 * 3600 * 1000
  const n = [...sessions()].reverse().find((s) => s.type === 'nuit' && s.t > limite)
  return n && n.note == null ? n : null
}

// Thème : 'sombre' (par défaut, choix de JF) ou 'auto' (clair le jour, sombre de 21 h à 6 h)
export const lireTheme = () => lire(CLES.theme, 'sombre')
export const ecrireTheme = (t) => ecrire(CLES.theme, t)
