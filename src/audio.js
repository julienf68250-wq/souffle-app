// Moteur sonore : ambiance (bruit filtré généré, sans fichier) qui suit la marée,
// cloche douce aux changements de phase quand l'ambiance n'a pas de houle.
// iOS : l'audio ne démarre qu'après un geste, d'où deverrouillerAudio() dans chaque clic de départ.
let ctx = null
let sortie = null
let analyseur = null
let amb = null
const bruits = {}

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
  } catch {
    /* pas d'audio : la séance reste visuelle */
  }
}

// Bruit en boucle, raccord sans clic (fondu croisé de la fin sur le début)
function bruit(couleur) {
  if (bruits[couleur]) return bruits[couleur]
  const sr = ctx.sampleRate
  const n = sr * 8
  const buf = ctx.createBuffer(1, n, sr)
  const d = buf.getChannelData(0)
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
  const f = Math.floor(sr * 0.5)
  for (let i = 0; i < f; i++) {
    const a = i / f
    d[i] = d[i] * a + d[n - f + i] * (1 - a)
  }
  return (bruits[couleur] = { buf, fin: (n - f) / sr })
}

export function demarrerAmbiance(son) {
  if (!ctx || !son) return
  arreterAmbiance(0.3)
  const { buf, fin } = bruit(son.bruit)
  const source = ctx.createBufferSource()
  source.buffer = buf
  source.loop = true
  source.loopStart = 0
  source.loopEnd = fin
  const filtre = ctx.createBiquadFilter()
  filtre.type = 'lowpass'
  filtre.frequency.value = son.coupure[0]
  filtre.Q.value = 0.5
  const gain = ctx.createGain()
  const t = ctx.currentTime
  gain.gain.setValueAtTime(0, t)
  gain.gain.linearRampToValueAtTime(son.volume[0], t + 2)
  source.connect(filtre).connect(gain).connect(sortie)
  source.start()
  amb = { source, filtre, gain, son }
}

// Fait monter ou descendre la houle vers un niveau (0 = vide, 1 = plein) en `duree` secondes
export function houle(niveau, duree) {
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
  if (!amb) return
  const { source, gain } = amb
  amb = null
  const t = ctx.currentTime
  gain.gain.cancelScheduledValues(t)
  gain.gain.setValueAtTime(gain.gain.value, t)
  gain.gain.linearRampToValueAtTime(0, t + fondu)
  source.stop(t + fondu + 0.05)
}

// Bol chantant synthétique : aigu à l'inspiration, grave à l'expiration
export function cloche(haute) {
  if (!ctx) return
  const t = ctx.currentTime
  const f0 = haute ? 528 : 396
  for (const [ratio, vol, duree] of [[1, 0.22, 2.6], [2.76, 0.06, 1.3], [5.4, 0.025, 0.7]]) {
    const o = ctx.createOscillator()
    o.type = 'sine'
    o.frequency.value = f0 * ratio
    const g = ctx.createGain()
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(vol, t + 0.02)
    g.gain.exponentialRampToValueAtTime(0.0001, t + duree)
    o.connect(g).connect(sortie)
    o.start(t)
    o.stop(t + duree + 0.05)
  }
}

// Niveau de sortie mesuré (diagnostic : window.__souffleAudio.rms() dans la console)
export function rms() {
  if (!analyseur) return 0
  const a = new Float32Array(analyseur.fftSize)
  analyseur.getFloatTimeDomainData(a)
  return Math.sqrt(a.reduce((s, x) => s + x * x, 0) / a.length)
}
if (typeof window !== 'undefined') window.__souffleAudio = { etat: () => ctx?.state ?? 'absent', rms }
