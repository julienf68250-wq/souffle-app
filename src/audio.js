// Moteur sonore : ambiance enregistrée (mer, pluie…) qui suit la marée, bol chantant
// aux changements de phase quand l'ambiance n'a pas de houle. Si un fichier ne charge
// pas, un bruit généré prend le relais.
// iOS : l'audio ne démarre qu'après un geste, d'où deverrouillerAudio() dans chaque clic de départ.
import { CONTENU } from './contenu.js'

let ctx = null
let sortie = null
let analyseur = null
let amb = null
let jeton = 0
const bruits = {}
const fichiers = {}

function contexte() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext
    ctx = new AC()
    sortie = ctx.createGain()
    analyseur = ctx.createAnalyser()
    analyseur.fftSize = 2048
    sortie.connect(analyseur)
    analyseur.connect(ctx.destination)
  }
  return ctx
}

export function deverrouillerAudio() {
  try {
    // iOS 17+ : joue même quand le bouton silencieux est activé
    if (navigator.audioSession) navigator.audioSession.type = 'playback'
    const c = contexte()
    if (c.state !== 'running') c.resume()
    const s = c.createBufferSource()
    s.buffer = c.createBuffer(1, 1, 22050)
    s.connect(c.destination)
    s.start(0)
    setTimeout(() => (bol(true), bol(false)), 0) // prépare le bol hors du geste
  } catch {
    /* pas d'audio : la séance reste visuelle */
  }
}

// Adresses des sons, pour la mise en cache hors connexion
// Seuls les sons des séances sont mis en cache d'avance ; les ambiances de nuit le sont
// à leur première écoute (inutile de télécharger 20 Mo à la première visite).
export const urlsSons = () =>
  CONTENU.sons
    .filter((s) => s.fichier && (!s.usage || s.usage.includes('seance')))
    .map((s) => new URL(s.fichier, document.baseURI).href)

// Raccord de boucle sans clic : la fin se fond dans le début, sur chaque canal
function boucler(buf, fondu) {
  const f = Math.min(Math.floor(buf.sampleRate * fondu), Math.floor(buf.length / 4))
  const n = buf.length
  for (let c = 0; c < buf.numberOfChannels; c++) {
    const d = buf.getChannelData(c)
    for (let i = 0; i < f; i++) {
      const a = i / f
      d[i] = d[i] * Math.sqrt(a) + d[n - f + i] * Math.sqrt(1 - a)
    }
  }
  return { buf, fin: (n - f) / buf.sampleRate }
}

function charger(fichier, enBoucle = true) {
  if (!fichiers[fichier]) {
    fichiers[fichier] = fetch(new URL(fichier, document.baseURI))
      .then((r) => {
        if (!r.ok) throw new Error(`${fichier} : ${r.status}`)
        return r.arrayBuffer()
      })
      .then((ab) => new Promise((ok, ko) => ctx.decodeAudioData(ab, ok, ko)))
      .then((buf) => (enBoucle ? boucler(buf, 2) : { buf, fin: buf.duration }))
      .catch((e) => {
        delete fichiers[fichier]
        throw e
      })
  }
  return fichiers[fichier]
}

// Bruit généré en secours
// Bruit généré : gauche et droite tirés indépendamment, pour une vraie stéréo (pas un mono dédoublé)
function bruit(couleur) {
  if (bruits[couleur]) return bruits[couleur]
  const sr = ctx.sampleRate
  const n = sr * 8
  const buf = ctx.createBuffer(2, n, sr)
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c)
    let dernier = 0
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0
    for (let i = 0; i < n; i++) {
      const w = Math.random() * 2 - 1
      if (couleur === 'brun') {
        dernier = (dernier + 0.02 * w) / 1.02
        d[i] = dernier * 3.5
      } else if (couleur === 'rose') {
        b0 = 0.99886 * b0 + w * 0.0555179
        b1 = 0.99332 * b1 + w * 0.0750759
        b2 = 0.969 * b2 + w * 0.153852
        b3 = 0.8665 * b3 + w * 0.3104856
        b4 = 0.55 * b4 + w * 0.5329522
        b5 = -0.7616 * b5 - w * 0.016898
        d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11
        b6 = w * 0.115926
      } else {
        d[i] = w * 0.3
      }
    }
  }
  return (bruits[couleur] = boucler(buf, 0.5))
}

// Réverbération stéréo légère (réponse impulsionnelle générée) : donne de l'espace au bol
// et à la voix des histoires, enregistrés en mono.
let salle = null
function envoiSalle() {
  if (!salle) {
    const sr = ctx.sampleRate
    const n = Math.floor(sr * 2.6)
    const ir = ctx.createBuffer(2, n, sr)
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c)
      let lisse = 0
      for (let i = 0; i < n; i++) {
        lisse = lisse * 0.6 + (Math.random() * 2 - 1) * 0.4 // un peu plus sombre qu'un bruit blanc
        d[i] = lisse * Math.pow(1 - i / n, 3.2)
      }
    }
    const conv = ctx.createConvolver()
    conv.buffer = ir
    salle = ctx.createGain()
    salle.gain.value = 1
    salle.connect(conv).connect(sortie)
  }
  return salle
}
// Branche une source : son direct + une part de réverbération
function brancher(noeud, reverb) {
  noeud.connect(sortie)
  if (reverb > 0) {
    const g = ctx.createGain()
    g.gain.value = reverb
    noeud.connect(g).connect(envoiSalle())
  }
}

// opts : { volume, coupure } fixes (écoute de nuit, sans houle)
export function demarrerAmbiance(son, opts = {}) {
  if (!ctx || !son) return
  arreterAmbiance(0.3)
  const mon = ++jeton
  const pret = son.fichier
    ? charger(son.fichier).catch(() => (son.bruit ? bruit(son.bruit) : null))
    : Promise.resolve(son.bruit ? bruit(son.bruit) : null)
  pret.then((t) => {
    if (!t || mon !== jeton) return
    const source = ctx.createBufferSource()
    source.buffer = t.buf
    source.loop = true
    source.loopStart = 0
    source.loopEnd = t.fin
    const filtre = ctx.createBiquadFilter()
    filtre.type = 'lowpass'
    filtre.frequency.value = opts.coupure ?? son.coupure[0]
    filtre.Q.value = 0.5
    const gain = ctx.createGain()
    const now = ctx.currentTime
    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(opts.volume ?? son.volume[0], now + 3)
    source.connect(filtre).connect(gain).connect(sortie)
    // Départ à un endroit au hasard : la boucle se remarque moins d'une séance à l'autre
    source.start(0, Math.random() * t.fin)
    amb = { source, filtre, gain, son: opts.volume != null ? { ...son, houle: false } : son }
    // La phase en cours a commencé pendant le chargement : on la rattrape
    if (cible && cible.fin > ctx.currentTime) houle(cible.niveau, cible.fin - ctx.currentTime)
  })
}

let cible = null

// Fait monter ou descendre la houle vers un niveau (0 = vide, 1 = plein) en `duree` secondes
export function houle(niveau, duree) {
  if (ctx) cible = { niveau, fin: ctx.currentTime + duree }
  if (!amb || !amb.son.houle) return
  const { son, gain, filtre } = amb
  const t = ctx.currentTime
  const cibles = [
    [gain.gain, son.volume[0] + (son.volume[1] - son.volume[0]) * niveau],
    [filtre.frequency, son.coupure[0] + (son.coupure[1] - son.coupure[0]) * niveau],
  ]
  for (const [p, cible] of cibles) {
    p.cancelScheduledValues(t)
    p.setValueAtTime(p.value, t)
    p.linearRampToValueAtTime(cible, t + duree)
  }
}

export function arreterAmbiance(fondu = 1.5) {
  jeton++
  if (!amb) return
  const { source, gain } = amb
  amb = null
  const t = ctx.currentTime
  gain.gain.cancelScheduledValues(t)
  gain.gain.setValueAtTime(gain.gain.value, t)
  gain.gain.linearRampToValueAtTime(0, t + fondu)
  source.stop(t + fondu + 0.05)
}

// ---------- Écoute pour s'endormir ----------
// Histoire (élément audio, lu en flux) et/ou ambiance, puis baisse douce sur les 2 dernières
// minutes, programmée dans le moteur audio lui-même.
let ecoute = null
// Vitesse de lecture des histoires
export const RYTHME_HISTOIRE = 1 // vitesse normale : la lecture ralentie ne plaisait pas à JF

// Histoire : lue jusqu'au bout (le lecteur permet pause, avance, retour), fondu à la fin.
// Son seul : minuterie, baisse douce sur les 5 dernières minutes (docs/etude/08). Jamais les deux ensemble.
// Renvoie l'élément audio de l'histoire (pour le lecteur), sinon null.
export function demarrerEcoute({ son, histoire, minutes, onFin }) {
  if (!ctx) return null
  arreterEcoute(0)
  const t = ctx.currentTime
  sortie.gain.cancelScheduledValues(t)
  sortie.gain.setValueAtTime(1, t)

  if (histoire) {
    const el = new Audio()
    if (histoire.url) el.crossOrigin = 'anonymous' // archive.org autorise la lecture (CORS)
    el.src = histoire.url ?? new URL(histoire.fichier, document.baseURI).href
    el.preload = 'auto'
    // Volume harmonisé (gain mesuré à l'avance) + limiteur pour ne jamais saturer
    // Voix du soir : débit ralenti (hauteur conservée), plus de chaleur, moins de dureté
    el.defaultPlaybackRate = RYTHME_HISTOIRE
    el.playbackRate = RYTHME_HISTOIRE
    el.preservesPitch = true
    el.webkitPreservesPitch = true
    el.addEventListener('play', () => (el.playbackRate = RYTHME_HISTOIRE))
    const g = ctx.createGain()
    g.gain.value = Math.pow(10, ((histoire.gain ?? 0) - 2) / 20)
    const graves = ctx.createBiquadFilter()
    graves.type = 'lowshelf'
    graves.frequency.value = 200
    graves.gain.value = 2.5
    const presence = ctx.createBiquadFilter()
    presence.type = 'peaking'
    presence.frequency.value = 3200
    presence.Q.value = 0.9
    presence.gain.value = -3
    const aigus = ctx.createBiquadFilter()
    aigus.type = 'highshelf'
    aigus.frequency.value = 6500
    aigus.gain.value = -6
    const limiteur = ctx.createDynamicsCompressor()
    limiteur.threshold.value = -8
    limiteur.knee.value = 6
    limiteur.ratio.value = 8
    limiteur.attack.value = 0.003
    limiteur.release.value = 0.25
    ctx.createMediaElementSource(el).connect(g).connect(graves).connect(presence).connect(aigus).connect(limiteur)
    brancher(limiteur, 0) // voix sans réverbération : l'écho gênait (retour de JF)
    el.addEventListener('ended', () => {
      arreterEcoute(3)
      onFin?.()
    })
    el.play().catch(() => {})
    if (ctx.state !== 'running') ctx.resume()
    ecoute = { el, minuterie: null }
    return el
  }

  const fin = t + minutes * 60
  sortie.gain.setValueAtTime(1, Math.max(t, fin - 300))
  sortie.gain.linearRampToValueAtTime(0.0001, fin)
  if (son) demarrerAmbiance(son, { volume: son.nuit.volume, coupure: son.nuit.coupure })
  const minuterie = setTimeout(() => {
    arreterEcoute(0)
    onFin?.()
  }, minutes * 60 * 1000)
  ecoute = { el: null, minuterie }
  return null
}

export function arreterEcoute(fondu = 1.5) {
  if (!ecoute) return
  const { el, minuterie } = ecoute
  ecoute = null
  clearTimeout(minuterie)
  arreterAmbiance(fondu)
  if (el) {
    el.pause()
    el.removeAttribute('src')
    el.load()
  }
  // Remet le volume général à 1 une fois le fondu terminé
  const t = ctx.currentTime
  sortie.gain.cancelScheduledValues(t)
  sortie.gain.setValueAtTime(sortie.gain.value, t)
  sortie.gain.linearRampToValueAtTime(0.0001, t + Math.max(fondu, 0.05))
  sortie.gain.setValueAtTime(1, t + fondu + 0.2)
}

// Bol chantant synthétisé en stéréo : partiels inharmoniques d'un bol tibétain, chacun
// légèrement désaccordé entre gauche et droite (battements qui « tournent »), coup de maillet au début.
// Plus aigu à l'inspiration, plus grave à l'expiration.
const bols = {}
function bol(haute) {
  const cle = haute ? 'haut' : 'bas'
  if (bols[cle]) return bols[cle]
  const sr = ctx.sampleRate
  const n = Math.floor(sr * 7)
  const buf = ctx.createBuffer(2, n, sr)
  const f0 = haute ? 262 : 220
  // [rapport, amplitude, durée de décroissance (s), écart gauche/droite (Hz)]
  const partiels = [
    [1, 1, 6.5, 0.7],
    [2.71, 0.42, 4.2, 1.1],
    [5.13, 0.2, 2.6, 1.6],
    [8.27, 0.09, 1.5, 2.2],
    [12.1, 0.04, 0.8, 3],
  ]
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c)
    const sens = c === 0 ? 1 : -1
    for (const [r, a, dec, ecart] of partiels) {
      const f = f0 * r + (sens * ecart) / 2
      const w = (2 * Math.PI * f) / sr
      const phase = Math.random() * 2 * Math.PI
      const k = 1 / (dec * sr)
      for (let i = 0; i < n; i++) {
        const att = i < sr * 0.004 ? i / (sr * 0.004) : 1
        d[i] += a * att * Math.exp(-i * k) * Math.sin(w * i + phase)
      }
    }
    // Coup de maillet : bref bruit adouci
    let lisse = 0
    for (let i = 0; i < sr * 0.012; i++) {
      lisse = lisse * 0.7 + (Math.random() * 2 - 1) * 0.3
      d[i] += lisse * 0.5 * (1 - i / (sr * 0.012))
    }
  }
  let crete = 0
  for (let c = 0; c < 2; c++) for (const v of buf.getChannelData(c)) crete = Math.max(crete, Math.abs(v))
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c)
    for (let i = 0; i < n; i++) d[i] *= 0.5 / crete
  }
  return (bols[cle] = buf)
}

export function cloche(haute) {
  if (!ctx) return
  const s = ctx.createBufferSource()
  s.buffer = bol(haute)
  const g = ctx.createGain()
  g.gain.value = 0.7
  s.connect(g)
  brancher(g, 0.3)
  s.start()
}

// Niveau de sortie mesuré (diagnostic : window.__souffleAudio.rms() dans la console)
export function rms() {
  if (!analyseur) return 0
  const a = new Float32Array(analyseur.fftSize)
  analyseur.getFloatTimeDomainData(a)
  return Math.sqrt(a.reduce((s, x) => s + x * x, 0) / a.length)
}
if (typeof window !== 'undefined')
  window.__souffleAudio = { etat: () => ctx?.state ?? 'absent', rms, ecoute: () => !!ecoute, vitesse: () => ecoute?.el?.playbackRate ?? null, source: () => (amb ? (amb.source.buffer.numberOfChannels === 2 ? 'fichier' : 'genere') : 'aucune') }
