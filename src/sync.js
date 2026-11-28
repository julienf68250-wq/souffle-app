// Sauvegarde en ligne : les données sont chiffrées sur le téléphone (AES-GCM 256, clé dérivée
// de la phrase secrète par PBKDF2) puis envoyées dans le dépôt GitHub PRIVÉ de JF.
// GitHub ne voit que du chiffré. Le téléphone garde une copie de travail (hors connexion).
import { CLES_LOCALES, ecrire, lire } from './stockage.js'
import { donneesASauvegarder, fusionner } from './donnees.js'

const CLE = 'souffle.sync' // { depot, jeton, phrase } : reste sur le téléphone, jamais envoyé
const ETAT = 'souffle.sync-etat'
const FICHIER = 'souffle.json'
export const DEPOT_PAR_DEFAUT = 'julienf68250-wq/souffle-donnees'

export const configSync = () => lire(CLE, null)
export const etatSync = () => lire(ETAT, {})
const majEtat = (champs) => {
  ecrire(ETAT, { ...etatSync(), ...champs })
  window.dispatchEvent(new Event('souffle-sync'))
}

// ---------- Chiffrement ----------
const enc = new TextEncoder()
const dec = new TextDecoder()
const versB64 = (octets) => {
  let s = ''
  for (let i = 0; i < octets.length; i += 0x8000) s += String.fromCharCode(...octets.subarray(i, i + 0x8000))
  return btoa(s)
}
const depuisB64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0))

async function deriver(phrase, sel) {
  const base = await crypto.subtle.importKey('raw', enc.encode(phrase), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: sel, iterations: 250000, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, [
    'encrypt',
    'decrypt',
  ])
}
async function chiffrer(objet, phrase) {
  const sel = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const cle = await deriver(phrase, sel)
  const chiffre = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, cle, enc.encode(JSON.stringify(objet)))
  return { app: 'souffle', format: 1, sel: versB64(sel), iv: versB64(iv), donnees: versB64(new Uint8Array(chiffre)) }
}
async function dechiffrer(env, phrase) {
  if (env?.app !== 'souffle' || env.format !== 1) throw new Error('Le fichier en ligne n’est pas une sauvegarde Souffle.')
  try {
    const cle = await deriver(phrase, depuisB64(env.sel))
    const clair = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: depuisB64(env.iv) }, cle, depuisB64(env.donnees))
    return JSON.parse(dec.decode(clair))
  } catch {
    throw new Error('Phrase secrète incorrecte : les données en ligne ne peuvent pas être lues avec celle-ci.')
  }
}

// ---------- GitHub ----------
function messageErreur(statut) {
  if (statut === 401) return 'Jeton GitHub refusé : expiré ou mal copié.'
  if (statut === 403) return 'Le jeton n’a pas le droit d’écrire dans souffle-donnees (permission Contents : Read and write).'
  if (statut === 404) return 'Dépôt introuvable : vérifie que le jeton donne accès à souffle-donnees.'
  return `GitHub a répondu ${statut}. Réessaie plus tard.`
}
const api = (cfg, methode, corps) =>
  fetch(`https://api.github.com/repos/${cfg.depot}/contents/${FICHIER}`, {
    method: methode,
    cache: 'no-store',
    headers: {
      Authorization: `Bearer ${cfg.jeton}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(corps ? { 'Content-Type': 'application/json' } : {}),
    },
    body: corps ? JSON.stringify(corps) : undefined,
  })

async function lireEnLigne(cfg) {
  const r = await api(cfg, 'GET')
  if (r.status === 404) {
    // Fichier absent (première fois) ou dépôt inaccessible : on vérifie le dépôt
    const d = await fetch(`https://api.github.com/repos/${cfg.depot}`, { headers: { Authorization: `Bearer ${cfg.jeton}` }, cache: 'no-store' })
    if (!d.ok) throw new Error(messageErreur(d.status))
    return { donnees: null, sha: null }
  }
  if (!r.ok) throw new Error(messageErreur(r.status))
  const j = await r.json()
  const env = JSON.parse(dec.decode(depuisB64(j.content.replace(/\s/g, ''))))
  const clair = await dechiffrer(env, cfg.phrase)
  return { donnees: clair.donnees, sha: j.sha }
}

let enCours = false
let encore = false
let silence = false // pas de nouvel envoi déclenché par nos propres écritures

// Récupère, fusionne, puis renvoie tout (chiffré). Renvoie un résumé lisible.
export async function synchroniser(cfg = configSync()) {
  if (!cfg) return null
  if (enCours) {
    encore = true
    return null
  }
  enCours = true
  try {
    const distant = await lireEnLigne(cfg)
    if (distant.donnees) {
      silence = true
      try {
        fusionner(distant.donnees)
      } finally {
        silence = false
      }
    }
    const env = await chiffrer({ donnees: donneesASauvegarder(), le: new Date().toISOString() }, cfg.phrase)
    const corps = {
      message: `Souffle : sauvegarde du ${new Date().toLocaleString('fr-FR')}`,
      content: versB64(enc.encode(JSON.stringify(env))),
      ...(distant.sha ? { sha: distant.sha } : {}),
    }
    let r = await api(cfg, 'PUT', corps)
    if (r.status === 409 || r.status === 422) {
      // Le fichier a changé entre-temps : on relit son identifiant et on réessaie une fois
      const g = await api(cfg, 'GET')
      if (g.ok) r = await api(cfg, 'PUT', { ...corps, sha: (await g.json()).sha })
    }
    if (!r.ok) throw new Error(messageErreur(r.status))
    silence = true
    try {
      majEtat({ derniere: Date.now(), erreur: null })
    } finally {
      silence = false
    }
    return { ok: true, recupere: !!distant.donnees }
  } catch (e) {
    silence = true
    try {
      majEtat({ erreur: e.message })
    } finally {
      silence = false
    }
    throw e
  } finally {
    enCours = false
    if (encore) {
      encore = false
      planifier(2000)
    }
  }
}

let minuterie = null
function planifier(delai = 8000) {
  if (!configSync()) return
  clearTimeout(minuterie)
  minuterie = setTimeout(() => synchroniser().catch(() => {}), delai)
}

// Active la sauvegarde en ligne après un premier aller-retour réussi
export async function activerSync({ jeton, phrase, depot = DEPOT_PAR_DEFAUT }) {
  const cfg = { depot: depot.trim(), jeton: jeton.trim(), phrase }
  const res = await synchroniser(cfg)
  ecrire(CLE, cfg)
  return res
}
export const desactiverSync = () => {
  ecrire(CLE, null)
  majEtat({ derniere: null, erreur: null })
}

export function demarrerSync() {
  window.addEventListener('souffle-ecriture', (e) => {
    if (silence || CLES_LOCALES.includes(e.detail)) return
    planifier()
  })
  window.addEventListener('online', () => planifier(1000))
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') planifier(800) // récupère à l'ouverture
  })
  planifier(1500)
}
