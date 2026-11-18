// Son doux optionnel (pas de voix). iOS n'autorise l'audio qu'après un geste :
// deverrouillerAudio() est appelé dans chaque clic qui lance une séance.
let ctx = null

export function deverrouillerAudio() {
  try {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)()
    if (ctx.state === 'suspended') ctx.resume()
    const b = ctx.createBuffer(1, 1, 22050)
    const s = ctx.createBufferSource()
    s.buffer = b
    s.connect(ctx.destination)
    s.start(0)
  } catch {
    /* pas d'audio : la séance reste visuelle */
  }
}

export function tonalite(montante) {
  if (!ctx) return
  try {
    const t = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(montante ? 294 : 392, t)
    osc.frequency.linearRampToValueAtTime(montante ? 392 : 294, t + 1.2)
    gain.gain.setValueAtTime(0, t)
    gain.gain.linearRampToValueAtTime(0.07, t + 0.4)
    gain.gain.linearRampToValueAtTime(0, t + 1.8)
    osc.connect(gain).connect(ctx.destination)
    osc.start(t)
    osc.stop(t + 1.9)
  } catch {
    /* ignoré */
  }
}
