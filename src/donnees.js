// Sauvegarde des données : export JSON daté (menu Partager → Fichiers / iCloud Drive),
// import avec aperçu et fusion sans doublon, demande de stockage persistant.
import { lire, ecrire } from './stockage.js'

export const SCHEMA = 1
const PREFIXE = 'souffle.'
const CLE_SCHEMA = 'souffle.schema'
const CLE_DERNIER_EXPORT = 'souffle.dernier-export'

// Demande à iOS de ne pas vider le stockage de l'app (accordé ou non selon le système)
export function demanderStockagePersistant() {
  try {
    navigator.storage?.persist?.()
  } catch {
    /* non disponible */
  }
  if (lire(CLE_SCHEMA, null) == null) ecrire(CLE_SCHEMA, SCHEMA)
}

function toutesLesDonnees() {
  const donnees = {}
  for (let i = 0; i < localStorage.length; i++) {
    const cle = localStorage.key(i)
    if (!cle?.startsWith(PREFIXE) || cle === CLE_DERNIER_EXPORT) continue
    donnees[cle] = lire(cle, null)
  }
  return donnees
}

export function resume(donnees) {
  const n = (cle) => (Array.isArray(donnees[cle]) ? donnees[cle].length : 0)
  return {
    nuits: n('souffle.agenda'),
    seances: (donnees['souffle.sessions'] ?? []).filter((s) => s.type === 'souffle').length,
    bilans: n('souffle.bilans'),
    notes: n('souffle.notes'),
    jours_montre: Object.keys(donnees['souffle.montre'] ?? {}).length,
  }
}

export const dernierExport = () => lire(CLE_DERNIER_EXPORT, null)

export async function exporter() {
  const contenu = { app: 'souffle', schemaVersion: SCHEMA, exporteLe: new Date().toISOString(), donnees: toutesLesDonnees() }
  const jour = new Date().toISOString().slice(0, 10)
  const nom = `souffle-sauvegarde-${jour}.json`
  const fichier = new File([JSON.stringify(contenu, null, 1)], nom, { type: 'application/json' })
  try {
    if (navigator.canShare?.({ files: [fichier] })) {
      await navigator.share({ files: [fichier], title: 'Sauvegarde Souffle' })
      ecrire(CLE_DERNIER_EXPORT, Date.now())
      return 'partage'
    }
  } catch (e) {
    if (e?.name === 'AbortError') return 'annule'
  }
  // Repli : téléchargement classique
  const url = URL.createObjectURL(fichier)
  const a = document.createElement('a')
  a.href = url
  a.download = nom
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
  ecrire(CLE_DERNIER_EXPORT, Date.now())
  return 'telecharge'
}

// Lit un fichier exporté ; renvoie { donnees, resume } ou lève une erreur lisible
export function lireSauvegarde(texte) {
  let contenu
  try {
    contenu = JSON.parse(texte)
  } catch {
    throw new Error("Ce fichier n'est pas une sauvegarde Souffle (format illisible).")
  }
  if (contenu?.app !== 'souffle' || typeof contenu.donnees !== 'object') throw new Error("Ce fichier n'est pas une sauvegarde Souffle.")
  if (contenu.schemaVersion > SCHEMA) throw new Error('Cette sauvegarde vient d’une version plus récente de Souffle. Mets l’app à jour, puis réessaie.')
  return { donnees: contenu.donnees, resume: resume(contenu.donnees), exporteLe: contenu.exporteLe }
}

// Identifiant d'un élément de liste, pour fusionner sans doublon
const idElement = (x) => (x && typeof x === 'object' ? (x.id ?? x.t ?? x.date ?? JSON.stringify(x)) : JSON.stringify(x))

export function fusionner(donneesImportees) {
  for (const [cle, valeur] of Object.entries(donneesImportees)) {
    if (!cle.startsWith(PREFIXE) || cle === CLE_DERNIER_EXPORT) continue
    const actuelle = lire(cle, null)
    if (Array.isArray(valeur)) {
      const parId = new Map((Array.isArray(actuelle) ? actuelle : []).map((x) => [idElement(x), x]))
      for (const x of valeur) if (!parId.has(idElement(x))) parId.set(idElement(x), x)
      const liste = [...parId.values()]
      liste.sort((a, b) => String(a?.date ?? a?.t ?? '').localeCompare(String(b?.date ?? b?.t ?? ''), undefined, { numeric: true }))
      ecrire(cle, liste)
    } else if (valeur && typeof valeur === 'object' && cle === 'souffle.montre') {
      ecrire(cle, { ...valeur, ...(actuelle ?? {}) })
    } else if (actuelle == null) {
      ecrire(cle, valeur) // réglages et programme : on garde ceux du téléphone s'ils existent
    }
  }
}
