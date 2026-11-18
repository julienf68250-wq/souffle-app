// Tout reste sur le téléphone (localStorage). Rien n'est envoyé nulle part.
export const CLES = {
  sessions: 'souffle.sessions',
  notes: 'souffle.notes',
  son: 'souffle.son',
}

export function lire(cle, defaut) {
  try {
    const v = localStorage.getItem(cle)
    return v ? JSON.parse(v) : defaut
  } catch {
    return defaut
  }
}

export function ecrire(cle, valeur) {
  try {
    localStorage.setItem(cle, JSON.stringify(valeur))
  } catch {
    /* stockage indisponible : l'app fonctionne quand même, sans historique */
  }
}

// Sessions : { t, type: 'souffle' | 'nuit', duree?, avant?, apres?, note? }
export const sessions = () => lire(CLES.sessions, [])
export const ajouterSession = (s) => ecrire(CLES.sessions, [...sessions(), s])
export const majSession = (t, champs) =>
  ecrire(CLES.sessions, sessions().map((s) => (s.t === t ? { ...s, ...champs } : s)))

// Notes « vider sa tête » : { id, t, texte }
export const notes = () => lire(CLES.notes, [])
export const ajouterNote = (texte) =>
  ecrire(CLES.notes, [...notes(), { id: Date.now(), t: Date.now(), texte }])
export const supprimerNote = (id) => ecrire(CLES.notes, notes().filter((n) => n.id !== id))

// Nuit d'hier sans note du matin (pour la question « ta nuit, de 0 à 10 ? »)
export function nuitANoter() {
  const h = new Date().getHours()
  if (h < 5 || h >= 13) return null
  const limite = Date.now() - 16 * 3600 * 1000
  const n = [...sessions()].reverse().find((s) => s.type === 'nuit' && s.t > limite)
  return n && n.note == null ? n : null
}
