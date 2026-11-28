import { useState } from 'react'
import Astre, { periode } from './Ciel.jsx'
import Installer from './Installer.jsx'
import { BarreOnglets, BoutonReglages } from './Interface.jsx'
import { aller } from './routeur.js'
import { sessions } from './stockage.js'
import { agenda, enMinutes, etatProgramme, nuitANoter } from './sommeil.js'
import { marquerNouveautesVues, nouveautesAAfficher } from './contenu.js'
import { prochainBilan } from './questionnaires.js'

const SALUTS = {
  aube: 'Bonjour. On démarre en douceur ?',
  jour: 'Trois minutes, et tu repars.',
  crepuscule: 'La journée retombe.',
  nuit: 'La journée est finie.',
}
const JOUR = 86400000

// Moment de la journée, calé sur le programme sommeil s'il existe (lever L, coucher C)
function moment(prog) {
  const d = new Date()
  const m = d.getHours() * 60 + d.getMinutes()
  const lever = prog ? enMinutes(prog.lever) : 6 * 60 + 30
  const coucher = prog?.coucher ? enMinutes(prog.coucher) : 22 * 60 + 30
  const coucherAbs = coucher < lever ? coucher + 1440 : coucher // coucher après minuit
  const mAbs = m < lever ? m + 1440 : m
  if (mAbs >= coucherAbs) return 'nuit'
  if (mAbs >= coucherAbs - 90) return 'soir'
  if (m < 11 * 60 && m >= lever - 60) return 'matin'
  return 'jour'
}

// Une seule carte principale, choisie selon le moment et ce qui reste à faire
function cartePrincipale(prog) {
  const mo = moment(prog)
  if (nuitANoter() && mo !== 'nuit')
    return { titre: 'Noter ma nuit', texte: '30 secondes, à l’estime. C’est la base de tout le programme sommeil.', aller: ['nuit/agenda'] }
  const bilan = prochainBilan()
  if (bilan.du && (mo === 'matin' || mo === 'jour'))
    return {
      titre: bilan.premier ? 'Faire ton point de départ' : 'Faire le point',
      texte: bilan.premier
        ? '2 minutes, 9 questions. C’est ce qui permettra de voir si ça va mieux.'
        : '2 minutes, toutes les deux semaines, pour suivre ton évolution.',
      aller: ['bilan'],
    }
  if (mo === 'soir') return { titre: 'Préparer la nuit', texte: 'La liste de demain, 2 minutes de souffle lent, puis au lit si le sommeil est là.', aller: ['nuit/preparer'] }
  if (mo === 'nuit') return { titre: 'Je ne dors pas', texte: 'Ce que recommandent les études, sans regarder l’heure.', aller: ['nuit/reveil'], nuit: true }
  return { titre: 'Souffler 3 minutes', texte: 'Souffle choisit la technique selon ton stress.', aller: ['souffle', { d: 180 }], souffle: true }
}

export default function Aujourdhui() {
  const prog = etatProgramme()
  const carte = cartePrincipale(prog)
  const [annonces, setAnnonces] = useState(nouveautesAAfficher)
  const p = periode()
  const debutSemaine = Date.now() - 7 * JOUR
  const nbSeances = sessions().filter((s) => s.type === 'souffle' && s.t > debutSemaine).length
  const nbNuits = agenda().filter((n) => new Date(n.date + 'T12:00').getTime() > debutSemaine).length

  return (
    <div className="onglet">
      <header className="ciel ciel-compact">
        <Astre />
        <div className="barre-haut">
          <p className="nom">Souffle</p>
          <BoutonReglages />
        </div>
        <h1>{SALUTS[p]}</h1>
        <Installer />
      </header>

      <main className="contenu-onglet">
        <button className="carte-principale" onClick={() => aller(...carte.aller)}>
          <strong>{carte.titre}</strong>
          <span>{carte.texte}</span>
        </button>
        {carte.souffle && (
          <div className="durees durees-carte">
            <button onClick={() => aller('souffle', { d: 60 })}>1 min</button>
            <button onClick={() => aller('souffle', { d: 300 })}>5 min</button>
          </div>
        )}
        {carte.nuit && (
          <button className="secondaire" onClick={() => aller('nuit/ecouter')}>
            Écouter pour s’endormir
          </button>
        )}

        <div className="actions-fixes">
          {!carte.souffle && (
            <button className="secondaire" onClick={() => aller('souffle', { d: 180 })}>
              Souffler
            </button>
          )}
          <button className="secondaire" onClick={() => aller('vider')}>
            Vider ma tête
          </button>
        </div>

        {annonces.length > 0 && p !== 'nuit' && (
          <div className="annonce" role="status">
            <p>{annonces.at(-1).texte}</p>
            <button
              className="lien"
              onClick={() => {
                marquerNouveautesVues()
                setAnnonces([])
              }}
            >
              Compris
            </button>
          </div>
        )}

        <p className="ligne-neutre">
          Cette semaine : {nbNuits} nuit{nbNuits > 1 ? 's' : ''} notée{nbNuits > 1 ? 's' : ''}, {nbSeances} séance{nbSeances > 1 ? 's' : ''}.
        </p>
      </main>
      <BarreOnglets actif="aujourdhui" />
    </div>
  )
}
