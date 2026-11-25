// Génère les icônes PNG (iOS exige du PNG pour l'écran d'accueil), sans dépendance.
import { deflateSync } from 'node:zlib'
import { writeFileSync } from 'node:fs'

const table = new Uint32Array(256).map((_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
const crc32 = (buf) => {
  let c = 0xffffffff
  for (const b of buf) c = table[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
const chunk = (type, data) => {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const td = Buffer.concat([Buffer.from(type), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(td))
  return Buffer.concat([len, td, crc])
}
const clamp = (v) => Math.max(0, Math.min(1, v))
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t)

// Ciel de brume au-dessus d'une eau ondulée (même motif que l'app).
function png(size) {
  const ciel = [18, 23, 41]
  const surface = [59, 113, 120]
  const fond = [24, 44, 64]
  const ligne = size * 3 + 1
  const raw = Buffer.alloc(ligne * size)
  for (let y = 0; y < size; y++) {
    raw[y * ligne] = 0
    for (let x = 0; x < size; x++) {
      const u = (x + 0.5) / size
      const v = (y + 0.5) / size
      const bord = 0.56 + 0.045 * Math.sin(u * Math.PI * 2 * 1.5 + 0.6)
      const dedans = clamp((v - bord) * size + 0.5)
      const eau = mix(surface, fond, clamp((v - 0.5) / 0.5))
      const c = mix(ciel, eau, dedans)
      const o = y * ligne + 1 + x * 3
      raw[o] = Math.round(c[0]); raw[o + 1] = Math.round(c[1]); raw[o + 2] = Math.round(c[2])
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8; ihdr[9] = 2
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

for (const s of [180, 192, 512]) writeFileSync(new URL(`../public/icon-${s}.png`, import.meta.url), png(s))
console.log('icônes générées')
