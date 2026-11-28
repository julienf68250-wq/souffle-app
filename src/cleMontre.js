// Chiffrement des données de la montre déposées par le robot Garmin (dépôt privé souffle-donnees).
// L'app crée une paire de clés ECDH P-256 : la clé publique est déposée dans le dépôt
// (cle-publique.json), la clé privée reste dans les données de l'app (donc dans la sauvegarde
// chiffrée par la phrase secrète, ce qui la fait suivre sur un nouveau téléphone).
// Le robot chiffre pour cette clé publique ; seule l'app peut relire.
const ECDH = { name: 'ECDH', namedCurve: 'P-256' }
const depuisB64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0))

export async function creerPaire() {
  const paire = await crypto.subtle.generateKey(ECDH, true, ['deriveBits'])
  const garder = ({ kty, crv, x, y, d }) => ({ kty, crv, x, y, ...(d ? { d } : {}) })
  return {
    publique: garder(await crypto.subtle.exportKey('jwk', paire.publicKey)),
    privee: garder(await crypto.subtle.exportKey('jwk', paire.privateKey)),
  }
}

// env = { epk, sel, iv, donnees } produit par robot/garmin.py
export async function dechiffrerMontre(env, priveeJwk) {
  const privee = await crypto.subtle.importKey('jwk', { ...priveeJwk, ext: true }, ECDH, false, ['deriveBits'])
  const epk = await crypto.subtle.importKey('jwk', { ...env.epk, ext: true }, ECDH, false, [])
  const secret = await crypto.subtle.deriveBits({ name: 'ECDH', public: epk }, privee, 256)
  const base = await crypto.subtle.importKey('raw', secret, 'HKDF', false, ['deriveKey'])
  const cle = await crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt: depuisB64(env.sel), info: new TextEncoder().encode('souffle-montre') },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt'],
  )
  const clair = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: depuisB64(env.iv) }, cle, depuisB64(env.donnees))
  return JSON.parse(new TextDecoder().decode(clair))
}
