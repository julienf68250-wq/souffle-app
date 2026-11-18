// Garde-fou de src/contenu/contenu.json : lancé avant chaque build.
// Un contenu invalide bloque la compilation au lieu de casser l'app sur le téléphone.
import { readFileSync } from 'node:fs'

const c = JSON.parse(readFileSync(new URL('../src/contenu/contenu.json', import.meta.url), 'utf8'))
const err = []
const MOMENTS = ['jour', 'soir', 'reveil']
const BRUITS = ['brun', 'rose', 'blanc']
const texte = (v, max) => typeof v === 'string' && v.trim().length > 0 && v.length <= max
const nombre = (v, min, max) => typeof v === 'number' && v >= min && v <= max

if (!Number.isInteger(c.version) || c.version < 1) err.push('version : entier ≥ 1')

const ids = new Set()
for (const [k, t] of (c.techniques ?? []).entries()) {
  const ici = `techniques[${k}] (${t.id ?? '?'})`
  if (!/^[a-z0-9-]+$/.test(t.id ?? '')) err.push(`${ici} : id en minuscules, chiffres et tirets`)
  if (ids.has(t.id)) err.push(`${ici} : id en double`)
  ids.add(t.id)
  if (!texte(t.nom, 30)) err.push(`${ici} : nom de 1 à 30 caractères`)
  if (!texte(t.pourquoi, 200)) err.push(`${ici} : pourquoi de 1 à 200 caractères`)
  if (!Number.isInteger(t.semaine) || t.semaine < 0) err.push(`${ici} : semaine entière ≥ 0`)
  if (!Array.isArray(t.moments) || !t.moments.length || t.moments.some((m) => !MOMENTS.includes(m)))
    err.push(`${ici} : moments parmi ${MOMENTS.join(', ')}`)
  if (!Array.isArray(t.phases) || t.phases.length < 2) err.push(`${ici} : au moins 2 phases`)
  else {
    for (const [j, p] of t.phases.entries()) {
      if (!texte(p.mot, 18)) err.push(`${ici} phase ${j} : mot de 1 à 18 caractères`)
      if (!nombre(p.duree, 1, 20)) err.push(`${ici} phase ${j} : durée entre 1 et 20 s`)
      if (!nombre(p.vers, 0, 1)) err.push(`${ici} phase ${j} : vers entre 0 et 1`)
    }
    if (t.phases.at(-1).vers !== 0) err.push(`${ici} : la dernière phase doit finir à vide (vers 0)`)
    if (!t.phases.some((p) => p.vers === 1)) err.push(`${ici} : une phase doit atteindre le plein (vers 1)`)
  }
}
for (const m of MOMENTS)
  if (!(c.techniques ?? []).some((t) => t.semaine === 0 && t.moments?.includes(m) && !t.urgence))
    err.push(`aucune technique dès la semaine 0 pour le moment « ${m} »`)

const sons = new Set()
for (const [k, s] of (c.sons ?? []).entries()) {
  const ici = `sons[${k}] (${s.id ?? '?'})`
  if (!/^[a-z0-9-]+$/.test(s.id ?? '') || sons.has(s.id)) err.push(`${ici} : id invalide ou en double`)
  sons.add(s.id)
  if (!texte(s.nom, 14)) err.push(`${ici} : nom de 1 à 14 caractères`)
  if (!BRUITS.includes(s.bruit)) err.push(`${ici} : bruit parmi ${BRUITS.join(', ')}`)
  if (!Array.isArray(s.coupure) || s.coupure.length !== 2 || !s.coupure.every((v) => nombre(v, 50, 12000)))
    err.push(`${ici} : coupure = [min, max] entre 50 et 12000 Hz`)
  if (!Array.isArray(s.volume) || s.volume.length !== 2 || !s.volume.every((v) => nombre(v, 0, 1)))
    err.push(`${ici} : volume = [min, max] entre 0 et 1`)
  if (typeof s.houle !== 'boolean') err.push(`${ici} : houle = true ou false`)
}
if (!sons.has('mer')) err.push('le son « mer » (son par défaut) doit exister')

for (const [k, n] of (c.nouveautes ?? []).entries()) {
  if (!Number.isInteger(n.version) || n.version > c.version) err.push(`nouveautes[${k}] : version entière ≤ ${c.version}`)
  if (!texte(n.texte, 280)) err.push(`nouveautes[${k}] : texte de 1 à 280 caractères`)
}

if (err.length) {
  console.error(`contenu.json invalide :\n- ${err.join('\n- ')}`)
  process.exit(1)
}
console.log(`contenu.json v${c.version} : ${c.techniques.length} techniques, ${c.sons.length} sons, ${c.nouveautes.length} nouveautés. OK`)
