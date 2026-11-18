import { useEffect, useState } from 'react'
import Seance from './Seance.jsx'
import Vider from './Vider.jsx'
import Dormir from './Dormir.jsx'
import Reveil from './Reveil.jsx'
import Effet from './Effet.jsx'
import Agenda from './Agenda.jsx'
import Programme from './Programme.jsx'
import Consulter from './Consulter.jsx'
import Endormir from './Endormir.jsx'
import Vague from './Vague.jsx'
import Astre, { periode } from './Ciel.jsx'
import Installer from './Installer.jsx'
import { ajouterSession, notes, sessions } from './stockage.js'
import { etatProgramme, nuitANoter } from './sommeil.js'
import { marquerNouveautesVues, nouveautesAAfficher, nouveautesNonEssayees, recommander } from './contenu.js'
import { preparerSeance } from './pleinEcran.js'

const estNuit = () => {
  const h = new Date().getHours()
  return h >= 21 || h < 6
}
const SALUTS = {
  aube: 'Bonjour. On démarre en douceur ?',
  jour: 'Trois minutes, et tu repars.',
  crepuscule: 'La journée retombe.',
  nuit: 'La journée est finie.',
}
const estAuLit = () => {
  const h = new Date().getHours()
  return h >= 23 || h < 6
}

export default function App() {
  const [ecran, setEcran] = useState({ nom: 'accueil' })
  const [nuit, setNuit] = useState(estNuit)

  useEffect(() => {
    const t = setInterval(() => {
      setNuit(estNuit())
      document.documentElement.dataset.ciel = periode()
    }, 60000)
    return () => clearInterval(t)
  }, [])
  useEffect(() => {
    document.documentElement.classList.toggle('nuit', nuit)
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', nuit ? '#121729' : '#dde4e3')
  }, [nuit])

  const accueil = () => setEcran({ nom: 'accueil' })

  switch (ecran.nom) {
    case 'souffle':
      return <Seance duree={ecran.duree} onFin={accueil} />
    case 'vider':
      return <Vider onFin={accueil} />
    case 'dormir':
      return <Dormir onFin={accueil} versEcoute={() => setEcran({ nom: 'ecoute' })} />
    case 'reveil':
      return <Reveil technique={ecran.technique} onFin={accueil} versVider={() => setEcran({ nom: 'vider' })} />
    case 'effet':
      return <Effet onFin={accueil} />
    case 'ecoute':
      return <Endormir onFin={accueil} />
    case 'agenda':
      return <Agenda onFin={accueil} />
    case 'programme':
      return <Programme onFin={accueil} versConsulter={() => setEcran({ nom: 'consulter', retour: 'programme' })} />
    case 'consulter':
      return <Consulter onFin={() => setEcran({ nom: ecran.retour ?? 'accueil' })} />
    default:
      return <Accueil nuit={nuit} aller={setEcran} />
  }
}

// Trois bandes d'eau, de la surface au fond : souffler, vider sa tête, dormir.
// Le jour, la surface est la plus haute ; le soir, c'est le fond.
function Accueil({ nuit, aller }) {
  const aNoter = nuitANoter()
  const prog = etatProgramme()
  const soir = periode() === 'crepuscule' || nuit
  const [annonces, setAnnonces] = useState(nouveautesAAfficher)
  const nbNotes = notes().length
  const nbSeances = sessions().filter((s) => s.type === 'souffle').length
  const neuve = nouveautesNonEssayees(nuit ? 'soir' : 'jour')[0]

  const reveil = () => {
    preparerSeance()
    const technique = recommander('reveil')
    ajouterSession({ type: 'reveil', t: Date.now(), technique: technique.id })
    aller({ nom: 'reveil', technique })
  }

  return (
    <main className="accueil">
      <header className="ciel">
        <Astre />
        <Installer />
        <p className="nom">Souffle</p>
        <h1>{SALUTS[periode()]}</h1>

        {soir && prog && (
          <p className="consigne">
            {prog.coucher ? `Au lit pas avant ${prog.coucher}, et seulement si le sommeil est là.` : 'Au lit seulement quand le sommeil est là.'} Lever à{' '}
            {prog.lever}.
          </p>
        )}

        {estAuLit() && (
          <button className="reveil" onClick={reveil}>
            Je ne dors pas
            <span>Ce que recommandent les études, sans regarder l'heure</span>
          </button>
        )}

        {annonces.length > 0 && (
          <div className="annonce" role="status">
            <p>{annonces[annonces.length - 1].texte}</p>
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

        {aNoter && (
          <button className="matin-carte" onClick={() => aller({ nom: 'agenda' })}>
            <strong>Ta nuit, en 30 secondes</strong>
            <span>L'agenda du matin : la base de ce qui marche contre l'insomnie</span>
          </button>
        )}
      </header>

      <div className="horizon">
        <Vague className="vague derive" />
      </div>
      <div className="profondeurs">
        <section className={`bande bande-1${nuit ? '' : ' haute'}`}>
          <button className="bande-action" onClick={() => aller({ nom: 'souffle', duree: 180 })}>
            <strong>Souffler</strong>
            <span>{neuve ? `Nouveau cette semaine : ${neuve.nom}` : '3 minutes, la technique choisie selon ton stress'}</span>
          </button>
          <div className="durees">
            <button onClick={() => aller({ nom: 'souffle', duree: 60 })}>1 min</button>
            <button onClick={() => aller({ nom: 'souffle', duree: 300 })}>5 min</button>
          </div>
        </section>

        <section className="bande bande-2">
          <div className="horizon interne">
            <Vague className="vague derive" />
          </div>
          <button className="bande-action" onClick={() => aller({ nom: 'vider' })}>
            <strong>Vider ma tête</strong>
            <span>
              {nbNotes > 0
                ? `${nbNotes} chose${nbNotes > 1 ? 's' : ''} rangée${nbNotes > 1 ? 's' : ''} pour plus tard`
                : 'Écrire ce qui tourne en boucle'}
            </span>
          </button>
        </section>

        <section className={`bande bande-3${nuit ? ' haute' : ''}`}>
          <div className="horizon interne">
            <Vague className="vague derive" />
          </div>
          <button className="bande-action" onClick={() => aller({ nom: 'dormir' })}>
            <strong>Dormir</strong>
            <span>Liste de demain, souffle lent, puis au lit si le sommeil est là</span>
          </button>
          <div className="liens-bande">
            <button className="lien" onClick={() => aller({ nom: 'ecoute' })}>
              Écouter pour s'endormir
            </button>
            <button className="lien" onClick={() => aller({ nom: 'programme' })}>
              {prog ? `Programme sommeil, semaine ${prog.semaine}` : 'Démarrer le programme sommeil'}
            </button>
            <button className="lien" onClick={() => aller({ nom: 'effet' })}>
              {nbSeances > 0 ? `Voir mon effet sur ${nbSeances} séance${nbSeances > 1 ? 's' : ''}` : 'Voir mon effet'}
            </button>
          </div>
        </section>
      </div>
    </main>
  )
}
