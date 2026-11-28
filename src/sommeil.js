// Programme sommeil inspiré de la TCC-I (voir docs/RECHERCHE.md) :
// agenda du matin, efficacité du sommeil, contrôle du stimulus, compression du temps au lit.
import { ecrire, lire } from './stockage.js'

const CLE_AGENDA = 'souffle.agenda'
const CLE_PROG = 'souffle.programme'
const JOUR = 86400000
export const FENETRE_MIN = 300 // 5 h : plancher (AASM 2008, essai HABIT)
export const FENETRE_MAX = 540 // 9 h

// ---------- Heures ----------
export const enMinutes = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}
export const enHeure = (min) => {
  const m = ((Math.round(min) % 1440) + 1440) % 1440
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}
export const duree = (min) => {
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  return m ? `${h} h ${String(m).padStart(2, '0')}` : `${h} h`
}
const dateLocale = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
export const aujourdhui = () => dateLocale()
// Nombre de jours de calendrier entre deux dates AAAA-MM-JJ
const jourNum = (iso) => {
  const [a, m, j] = iso.split('-').map(Number)
  return Date.UTC(a, m - 1, j) / JOUR
}
export const joursDepuis = (iso) => jourNum(aujourdhui()) - jourNum(iso)

// ---------- Agenda ----------
// Une nuit : { date (jour du lever), coucher, latence (min), eveil (min), reveil, lever, qualite (0-10) }
export const agenda = () => lire(CLE_AGENDA, [])

export function enregistrerNuit(nuit) {
  const reste = agenda().filter((n) => n.date !== nuit.date)
  ecrire(CLE_AGENDA, [...reste, nuit].sort((a, b) => a.date.localeCompare(b.date)))
}

// Temps au lit (TAL), temps de sommeil (TST), efficacité = TST / TAL
export function calculer(n) {
  const c = enMinutes(n.coucher)
  let r = enMinutes(n.reveil)
  let l = enMinutes(n.lever)
  if (r <= c) r += 1440
  if (l <= c) l += 1440
  if (l < r) l = r
  const tal = l - c
  const tst = Math.max(0, r - c - n.latence - n.eveil)
  return { tal, tst, eff: tal > 0 ? tst / tal : 0 }
}

// La nuit de cette nuit est-elle à noter ? (le matin, entre 4 h et 15 h)
export function nuitANoter() {
  const h = new Date().getHours()
  if (h < 4 || h >= 15) return false
  return !agenda().some((n) => n.date === aujourdhui())
}

export const derniereNuit = () => agenda().at(-1) ?? null

// « du lundi 24 au mardi 25 nov. » pour une date de lever
export function libelleNuit(iso) {
  const lever = new Date(iso + 'T12:00')
  const veille = new Date(lever.getTime() - JOUR)
  const j = (d, opts) => d.toLocaleDateString('fr-FR', opts)
  return `du ${j(veille, { weekday: 'long', day: 'numeric' })} au ${j(lever, { weekday: 'long', day: 'numeric', month: 'short' })}`
}

// Nuits des 7 derniers jours sans agenda (la nuit de cette nuit seulement à partir de 4 h)
export function nuitsManquantes() {
  const notees = new Set(agenda().map((n) => n.date))
  const res = []
  for (let k = new Date().getHours() >= 4 ? 0 : 1; k <= 6; k++) {
    const d = dateLocale(new Date(Date.now() - k * JOUR))
    if (!notees.has(d)) res.push(d)
  }
  return res
}

// Moyennes sur les nuits notées depuis une date (incluse)
export function moyennes(nuits) {
  if (!nuits.length) return null
  const c = nuits.map(calculer)
  const moy = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length
  return {
    n: nuits.length,
    tal: moy(c.map((x) => x.tal)),
    tst: moy(c.map((x) => x.tst)),
    eff: moy(c.map((x) => x.eff)),
    latence: moy(nuits.map((x) => x.latence)),
    eveil: moy(nuits.map((x) => x.eveil)),
    qualite: moy(nuits.map((x) => x.qualite ?? 0)),
  }
}
const depuis = (date) => agenda().filter((n) => n.date >= date)
const ilYa = (jours) => dateLocale(new Date(Date.now() - jours * JOUR))
export const septDerniersJours = () => depuis(ilYa(6))

// ---------- Garde-fous (AASM 2021, ESRS 2023) ----------
export const QUESTIONS = [
  { id: 'risque', texte: 'Tu conduis beaucoup, ou ton travail devient dangereux en cas de somnolence (machines, hauteur, route) ?', bloque: 'compression' },
  { id: 'manie', texte: 'As-tu déjà eu un épisode maniaque ou hypomaniaque, ou un trouble bipolaire ?', bloque: 'compression' },
  { id: 'somnolence', texte: "Il t'arrive de t'endormir sans le vouloir dans la journée (réunion, lecture, volant) ?", bloque: 'compression', medecin: true },
  { id: 'apnee', texte: "On t'a signalé un ronflement fort ou des pauses de respiration, ou tu te réveilles en suffoquant ?", bloque: 'compression', medecin: true },
  { id: 'epilepsie', texte: "As-tu de l'épilepsie ?", bloque: 'tout', medecin: true },
  { id: 'jambes', texte: 'Le soir, des sensations désagréables dans les jambes avec besoin de les bouger ?', medecin: true },
  { id: 'humeur', texte: 'Humeur très basse ou anxiété forte depuis plusieurs semaines ?', medecin: true },
]

export function evaluerGardeFous(reponses) {
  const oui = QUESTIONS.filter((q) => reponses[q.id])
  return {
    toutBloque: oui.some((q) => q.bloque === 'tout'),
    compressionBloquee: oui.some((q) => q.bloque),
    medecin: oui.filter((q) => q.medecin).map((q) => q.id),
  }
}

// ---------- Programme ----------
// { debut, lever, reponses, compression (voulue), fenetre (min|null), ajuste (date), dernierChangement }
export const programme = () => lire(CLE_PROG, null)
const sauver = (p) => ecrire(CLE_PROG, p)

export function demarrerProgramme({ lever, reponses, compression }) {
  const g = evaluerGardeFous(reponses)
  const p = {
    debut: aujourdhui(),
    lever,
    reponses,
    compression: compression && !g.compressionBloquee && !g.toutBloque,
    fenetre: null,
    ajuste: null,
    dernierChangement: null,
  }
  sauver(p)
  return p
}
export const arreterProgramme = () => ecrire(CLE_PROG, null)
export const changerLever = (lever) => {
  const p = programme()
  if (p) sauver({ ...p, lever })
}

const arrondi15 = (m) => Math.round(m / 15) * 15
const borner = (m) => Math.min(FENETRE_MAX, Math.max(FENETRE_MIN, m))

// Met à jour la fenêtre au lit si c'est le moment, puis renvoie l'état du programme.
export function etatProgramme() {
  const p = programme()
  if (!p) return null
  const joursEcoules = joursDepuis(p.debut)

  if (p.compression) {
    if (p.fenetre == null) {
      // Démarrage : au moins 5 nuits notées sur 7 jours
      const base = moyennes(depuis(p.debut))
      if (joursEcoules >= 7 && base && base.n >= 5) {
        p.fenetre = base.eff >= 0.85 ? borner(arrondi15(base.tal)) : borner(arrondi15(base.tst))
        p.ajuste = aujourdhui()
        p.dernierChangement = { date: aujourdhui(), type: 'debut', fenetre: p.fenetre, eff: base.eff }
        sauver(p)
      }
    } else {
      // Ajustement hebdomadaire selon l'efficacité de la semaine écoulée
      const semaine = moyennes(depuis(p.ajuste).filter((n) => n.date > p.ajuste))
      if (joursDepuis(p.ajuste) >= 7 && semaine && semaine.n >= 5) {
        const pas = semaine.eff >= 0.85 ? 15 : semaine.eff >= 0.8 ? 0 : -15
        const avant = p.fenetre
        p.fenetre = borner(p.fenetre + pas)
        p.ajuste = aujourdhui()
        p.dernierChangement = { date: aujourdhui(), type: 'semaine', de: avant, fenetre: p.fenetre, eff: semaine.eff }
        sauver(p)
      }
    }
  }

  const coucher = p.fenetre != null ? enHeure(enMinutes(p.lever) - p.fenetre) : null
  return {
    ...p,
    semaine: Math.floor(joursEcoules / 7) + 1,
    observation: p.compression && p.fenetre == null,
    coucher,
    gardeFous: evaluerGardeFous(p.reponses),
  }
}
