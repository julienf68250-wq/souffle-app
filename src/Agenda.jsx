import { useState } from 'react'
import Echelle from './Echelle.jsx'
import { aujourdhui, calculer, derniereNuit, duree, enregistrerNuit, programme } from './sommeil.js'

const LATENCES = [5, 15, 30, 45, 60, 90]
const EVEILS = [0, 10, 30, 60, 90, 120]
const libelle = (m, max) => (m >= max ? `${m} min et +` : m === 0 ? 'aucun' : `${m} min`)

// Agenda du sommeil (base de la TCC-I) : 30 secondes le matin, à l'estime.
// Prérempli avec la nuit précédente pour limiter les gestes.
export default function Agenda({ onFin }) {
  const prec = derniereNuit()
  const p = programme()
  const [n, setN] = useState({
    date: aujourdhui(),
    coucher: prec?.coucher ?? '23:00',
    latence: prec?.latence ?? 15,
    eveil: prec?.eveil ?? 0,
    reveil: prec?.reveil ?? p?.lever ?? '06:30',
    lever: prec?.lever ?? p?.lever ?? '06:45',
    qualite: null,
  })
  const maj = (champ) => (v) => setN((x) => ({ ...x, [champ]: v }))
  const c = calculer(n)

  return (
    <main className="ecran agenda">
      <h2>Ta nuit, en 30 secondes</h2>
      <p className="aide">À l'estime. La nuit, ne regarde pas l'heure : c'est le matin qu'on note.</p>

      <div className="champs-heures">
        <label>
          Coucher
          <input type="time" value={n.coucher} onChange={(e) => e.target.value && maj('coucher')(e.target.value)} />
        </label>
        <label>
          Réveil
          <input type="time" value={n.reveil} onChange={(e) => e.target.value && maj('reveil')(e.target.value)} />
        </label>
        <label>
          Lever
          <input type="time" value={n.lever} onChange={(e) => e.target.value && maj('lever')(e.target.value)} />
        </label>
      </div>

      <fieldset className="puces">
        <legend>Temps pour t'endormir, environ</legend>
        {LATENCES.map((m) => (
          <button key={m} className={n.latence === m ? 'actif' : ''} onClick={() => maj('latence')(m)} aria-pressed={n.latence === m}>
            {libelle(m, 90)}
          </button>
        ))}
      </fieldset>

      <fieldset className="puces">
        <legend>Temps éveillé dans la nuit, au total</legend>
        {EVEILS.map((m) => (
          <button key={m} className={n.eveil === m ? 'actif' : ''} onClick={() => maj('eveil')(m)} aria-pressed={n.eveil === m}>
            {libelle(m, 120)}
          </button>
        ))}
      </fieldset>

      <div className="champ-qualite">
        <p className="legende">Qualité de la nuit</p>
        <Echelle valeur={n.qualite} onChoix={maj('qualite')} gauche="horrible" droite="parfaite" />
      </div>

      <p className="resume">
        {duree(c.tst)} de sommeil sur {duree(c.tal)} au lit, efficacité <b>{Math.round(c.eff * 100)} %</b>.
      </p>

      <button
        className="principal"
        disabled={n.qualite == null}
        onClick={() => {
          enregistrerNuit(n)
          onFin()
        }}
      >
        Enregistrer ma nuit
      </button>
      <div className="pied">
        <button className="lien" onClick={onFin}>
          Plus tard
        </button>
      </div>
    </main>
  )
}
