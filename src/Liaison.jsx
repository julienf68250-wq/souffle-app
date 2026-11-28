import { useEffect, useRef, useState } from 'react'
import { DEPOT_PAR_DEFAUT } from './sync.js'

// Liaison PC → iPhone sans rien taper sur le téléphone :
// le PC affiche un QR code (jeton + phrase secrète), l'iPhone le scanne avec la caméra dans l'app.
// Rien ne transite par un serveur : le QR reste à l'écran du PC.
const PREFIXE = 'souffle1:'
const b64u = (s) => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const deb64u = (s) => decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/'))))

export const encoderLiaison = (jeton, phrase) => PREFIXE + b64u(JSON.stringify({ j: jeton.trim(), p: phrase }))
export function decoderLiaison(texte) {
  const t = (texte || '').trim()
  if (!t.startsWith(PREFIXE)) return null
  try {
    const o = JSON.parse(deb64u(t.slice(PREFIXE.length)))
    return o.j && o.p ? { jeton: o.j, phrase: o.p } : null
  } catch {
    return null
  }
}

// Phrase secrète tirée au hasard : 4 groupes de 4 caractères sans ambiguïté (environ 80 bits)
function phraseAuHasard() {
  const a = 'abcdefghjkmnpqrstuvwxyz23456789'
  const v = crypto.getRandomValues(new Uint8Array(16))
  const c = Array.from(v, (x) => a[x % a.length]).join('')
  return c.match(/.{4}/g).join('-')
}

// Côté PC : coller le jeton, voir le QR code
export function CodeLiaison() {
  const [jeton, setJeton] = useState('')
  const [phrase] = useState(phraseAuHasard)
  const [qr, setQr] = useState(null)
  const [message, setMessage] = useState('')
  const [enCours, setEnCours] = useState(false)

  const creer = async () => {
    setEnCours(true)
    setMessage('')
    try {
      const r = await fetch(`https://api.github.com/repos/${DEPOT_PAR_DEFAUT}/contents/`, {
        headers: { Authorization: `Bearer ${jeton.trim()}`, Accept: 'application/vnd.github+json' },
        cache: 'no-store',
      })
      if (r.status === 401) throw new Error('Jeton refusé : il est expiré ou mal copié.')
      if (r.status === 404 || r.status === 403) throw new Error('Ce jeton n’a pas accès à souffle-donnees : modifie-le sur GitHub (Only select repositories, souffle-donnees).')
      if (!r.ok) throw new Error(`GitHub a répondu ${r.status}. Réessaie.`)
      const QRCode = (await import('qrcode')).default
      setQr(await QRCode.toDataURL(encoderLiaison(jeton, phrase), { errorCorrectionLevel: 'M', margin: 2, width: 360 }))
    } catch (e) {
      setMessage(e.message)
    } finally {
      setEnCours(false)
    }
  }

  if (qr)
    return (
      <div className="liaison">
        <img src={qr} alt="QR code de liaison" width="300" height="300" />
        <p className="aide">
          Sur l’iPhone : Souffle, Réglages, Sauvegarde en ligne, <b>Scanner le code du PC</b>, et vise ce carré.
        </p>
        <p className="aide">
          Ta phrase secrète : <b className="phrase">{phrase}</b>. Range-la dans ton gestionnaire de mots de passe : elle sert seulement si tu changes de
          téléphone. Ferme cette page une fois le téléphone lié.
        </p>
      </div>
    )

  return (
    <>
      <label className="champ">
        Colle ici ton jeton GitHub
        <input type="password" autoComplete="off" value={jeton} onChange={(e) => setJeton(e.target.value)} placeholder="github_pat_…" />
      </label>
      <button className="principal" onClick={creer} disabled={enCours || !jeton.trim()}>
        {enCours ? 'Vérification…' : 'Afficher le code pour l’iPhone'}
      </button>
      {message && <p className="alerte">{message}</p>}
    </>
  )
}

// Côté iPhone : la caméra lit le QR code et renvoie { jeton, phrase }
export function ScannerLiaison({ onCode, onFermer }) {
  const video = useRef(null)
  const rappel = useRef(onCode)
  rappel.current = onCode
  const [erreur, setErreur] = useState('')

  useEffect(() => {
    let flux
    let fini = false
    let minuterie
    const toile = document.createElement('canvas')
    const ctx = toile.getContext('2d', { willReadFrequently: true })
    ;(async () => {
      try {
        const jsQR = (await import('jsqr')).default
        flux = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
        if (fini) return flux.getTracks().forEach((t) => t.stop())
        const v = video.current
        v.srcObject = flux
        await v.play()
        const lire = () => {
          if (fini) return
          if (v.videoWidth) {
            const l = Math.min(v.videoWidth, 720)
            const h = Math.round((v.videoHeight * l) / v.videoWidth)
            toile.width = l
            toile.height = h
            ctx.drawImage(v, 0, 0, l, h)
            const res = jsQR(ctx.getImageData(0, 0, l, h).data, l, h, { inversionAttempts: 'dontInvert' })
            const code = res && decoderLiaison(res.data)
            if (code) {
              fini = true
              flux.getTracks().forEach((t) => t.stop())
              return rappel.current(code)
            }
          }
          minuterie = setTimeout(lire, 200)
        }
        lire()
      } catch {
        setErreur('La caméra n’est pas accessible. Autorise-la pour Souffle dans Réglages de l’iPhone, puis réessaie.')
      }
    })()
    return () => {
      fini = true
      clearTimeout(minuterie)
      flux?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  return (
    <div className="liaison">
      {erreur ? <p className="alerte">{erreur}</p> : <video ref={video} className="viseur" playsInline muted />}
      <p className="aide">Vise le QR code affiché sur l’écran du PC.</p>
      <button className="lien" onClick={onFermer}>
        Annuler
      </button>
    </div>
  )
}
