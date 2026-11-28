import { useEffect, useRef, useState } from 'react'
import Aujourdhui from './Aujourdhui.jsx'
import Nuit from './Nuit.jsx'
import Progres from './Progres.jsx'
import Reglages from './Reglages.jsx'
import Bilan from './Bilan.jsx'
import Seance from './Seance.jsx'
import Vider from './Vider.jsx'
import Dormir from './Dormir.jsx'
import Reveil from './Reveil.jsx'
import Agenda from './Agenda.jsx'
import Programme from './Programme.jsx'
import Consulter from './Consulter.jsx'
import Jambes from './Jambes.jsx'
import Endormir from './Endormir.jsx'
import { Entete } from './Interface.jsx'
import { periode } from './Ciel.jsx'
import { aller, remplacer, retour, useRoute } from './routeur.js'
import { ajouterSession, lireTheme } from './stockage.js'
import { recommander } from './contenu.js'
import { demanderStockagePersistant } from './donnees.js'
import { demarrerSync } from './sync.js'

const estNuit = () => {
  const h = new Date().getHours()
  return h >= 21 || h < 6
}

// Sous-écran : en-tête avec retour toujours visible
const Page = ({ titre, children }) => (
  <div className="page">
    <Entete titre={titre} />
    {children}
  </div>
)

// « Je ne dors pas » : la technique est choisie et la session notée une seule fois
function ReveilRoute() {
  const [technique] = useState(() => recommander('reveil'))
  const note = useRef(false)
  useEffect(() => {
    if (note.current) return
    note.current = true
    ajouterSession({ type: 'reveil', t: Date.now(), technique: technique.id })
  }, [technique])
  return <Reveil technique={technique} onFin={() => retour('nuit')} versVider={() => aller('vider')} />
}

export default function App() {
  const { chemin, params } = useRoute()
  const [nuit, setNuit] = useState(estNuit)
  const [theme, setTheme] = useState(lireTheme)
  const sombre = theme === 'sombre' || nuit

  useEffect(() => {
    demanderStockagePersistant()
    demarrerSync()
    const t = setInterval(() => {
      setNuit(estNuit())
      document.documentElement.dataset.ciel = periode()
    }, 60000)
    const changerTheme = () => setTheme(lireTheme())
    window.addEventListener('souffle-theme', changerTheme)
    return () => {
      clearInterval(t)
      window.removeEventListener('souffle-theme', changerTheme)
    }
  }, [])
  useEffect(() => {
    document.documentElement.classList.toggle('nuit', sombre)
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', sombre ? '#121729' : '#dde4e3')
  }, [sombre])

  const fin = () => retour()

  switch (chemin) {
    case 'nuit':
      return <Nuit />
    case 'progres':
      return <Progres />
    case 'reglages':
    case 'aide': // ancienne adresse
      return (
        <Page titre="Réglages">
          <Reglages section={params.section} />
        </Page>
      )
    case 'bilan':
      return (
        <Page titre="Faire le point">
          <Bilan onFin={fin} />
        </Page>
      )
    case 'souffle':
      return <Seance duree={Number(params.d) || 180} onFin={fin} />
    case 'vider':
      return (
        <Page titre="Vider ma tête">
          <Vider onFin={fin} />
        </Page>
      )
    case 'jambes':
      return (
        <Page titre="Jambes sans repos">
          <Jambes onFin={fin} />
        </Page>
      )
    case 'consulter':
      return (
        <Page titre="Quand consulter">
          <Consulter onFin={fin} />
        </Page>
      )
    case 'nuit/preparer':
      return (
        <Dormir
          onFin={() => retour('nuit')}
          etapeInitiale={params.etape}
          versEcoute={() => {
            remplacer('nuit/preparer', { etape: 'nuit' }) // au retour, on revient à l'étape « Au lit »
            aller('nuit/ecouter')
          }}
        />
      )
    case 'nuit/ecouter':
      return <Endormir onFin={() => retour('nuit')} />
    case 'nuit/reveil':
      return <ReveilRoute />
    case 'nuit/agenda':
      return (
        <Page titre="Agenda du sommeil">
          <Agenda key={params.date} date={params.date || undefined} onFin={() => retour('nuit')} />
        </Page>
      )
    case 'nuit/programme':
      return (
        <Page titre="Programme sommeil">
          <Programme onFin={() => retour('nuit')} versConsulter={() => aller('consulter')} />
        </Page>
      )
    default:
      return <Aujourdhui />
  }
}
