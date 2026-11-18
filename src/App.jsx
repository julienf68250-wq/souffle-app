import { useEffect, useState } from 'react'
import Seance from './Seance.jsx'
import Vider from './Vider.jsx'
import Dormir from './Dormir.jsx'
import Effet from './Effet.jsx'
import Echelle from './Echelle.jsx'
import Vague from './Vague.jsx'
import { majSession, notes, nuitANoter, sessions } from './stockage.js'

const estNuit = () => {
  const h = new Date().getHours()
  return h >= 21 || h < 6
}

export default function App() {
  const [ecran, setEcran] = useState({ nom: 'accueil' })
  const [nuit, setNuit] = useState(estNuit)

  useEffect(() => {
    const t = setInterval(() => setNuit(estNuit()), 60000)
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
      return <Dormir onFin={accueil} />
    case 'effet':
      return <Effet onFin={accueil} />
    default:
      return <Accueil nuit={nuit} aller={setEcran} />
  }
}

// Trois bandes d'eau, de la surface au fond : souffler, vider sa tête, dormir.
// Le jour, la surface est la plus haute ; le soir, c'est le fond.
function Accueil({ nuit, aller }) {
  const [aNoter, setANoter] = useState(nuitANoter)
  const nbNotes = notes().length
  const nbSeances = sessions().filter((s) => s.type === 'souffle').length

  return (
    <main className="accueil">
      <header className="ciel">
        <p className="nom">Souffle</p>
        <h1>{nuit ? 'La journée est finie.' : 'Trois minutes, et tu repars.'}</h1>
        {aNoter && (
          <div className="matin">
            <p>Ta nuit, de 0 à 10 ?</p>
            <Echelle
              gauche="horrible"
              droite="parfaite"
              onChoix={(v) => {
                majSession(aNoter.t, { note: v })
                setANoter(null)
              }}
            />
          </div>
        )}
      </header>

      <Vague />
      <div className="profondeurs">
        <section className={`bande bande-1${nuit ? '' : ' haute'}`}>
          <button className="bande-action" onClick={() => aller({ nom: 'souffle', duree: 180 })}>
            <strong>Souffler</strong>
            <span>3 minutes, 5 secondes pour inspirer, 5 pour expirer</span>
          </button>
          <div className="durees">
            <button onClick={() => aller({ nom: 'souffle', duree: 60 })}>1 min</button>
            <button onClick={() => aller({ nom: 'souffle', duree: 300 })}>5 min</button>
          </div>
        </section>

        <section className="bande bande-2">
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
          <button className="bande-action" onClick={() => aller({ nom: 'dormir' })}>
            <strong>Dormir</strong>
            <span>Vider sa tête, souffler lentement, lancer le son</span>
          </button>
          <button className="lien" onClick={() => aller({ nom: 'effet' })}>
            {nbSeances > 0 ? `Voir mon effet sur ${nbSeances} séance${nbSeances > 1 ? 's' : ''}` : 'Voir mon effet'}
          </button>
        </section>
      </div>
    </main>
  )
}
