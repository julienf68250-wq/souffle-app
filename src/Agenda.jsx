import { useState } from 'react'
import Echelle from './Echelle.jsx'
import { agenda, aujourdhui, calculer, derniereNuit, duree, enHeure, enMinutes, enregistrerNuit, libelleNuit, programme } from './sommeil.js'
import { donneesMontre } from './montre.js'

const LATENCES = [5, 15, 30, 45, 60, 90]
const EVEILS = [0, 10, 30, 60, 90, 120]
const libelle = (m, max) => (m >= max ? `${m} min et +` : m === 0 ? 'aucun' : `${m} min`)

// Heures de la nuit vues par la montre (bloc de sommeil le plus long, robot Garmin) :
// endormissement et fin du sommeil. Seulement des bornes : l'éveil et le ressenti restent à JF.
function nuitMontre(date) {
  const e = donneesMontre()[date]
  if (!e?.coucher || !e.sommeilMin) return null
  const debut = new Date(e.coucher)
  const fin = new Date(debut.getTime() + e.sommeilMin * 60000)
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  if (isNaN(debut) || iso(fin) !== date || e.sommeilMin < 120) return null
  const hm = (d) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  return { endormi: hm(debut), reveil: hm(fin) }
}

// Agenda du sommeil (base de la TCC-I) : 30 secondes le matin, à l'estime.
// Prérempli avec la nuit précédente pour limiter les gestes.
// `date` = jour du lever ; une nuit oubliée se rattrape (7 jours) ou se corrige.
export default function Agenda({ onFin, date = aujourdhui() }) {
  const existante = agenda().find((x) => x.date === date)
  const prec = existante ?? derniereNuit()
  const p = programme()
  const montre = existante ? null : nuitMontre(date)
  const latence = prec?.latence ?? 15
  const ecartLever = prec ? Math.max(0, (enMinutes(prec.lever) - enMinutes(prec.reveil) + 1440) % 1440) : 15
  const [n, setN] = useState({
    date,
    coucher: montre ? enHeure(enMinutes(montre.endormi) - latence) : prec?.coucher ?? '23:00',
    latence,
    eveil: prec?.eveil ?? 0,
    reveil: montre?.reveil ?? prec?.reveil ?? p?.lever ?? '06:30',
    lever: montre ? enHeure(enMinutes(montre.reveil) + (ecartLever > 120 ? 15 : ecartLever)) : prec?.lever ?? p?.lever ?? '06:45',
    qualite: existante?.qualite ?? null,
    jambes: existante?.jambes ?? null,
    jambesReveil: existante?.jambesReveil ?? false,
  })
  const maj = (champ) => (v) => setN((x) => ({ ...x, [champ]: v }))
  const c = calculer(n)

  return (
    <main className="ecran agenda">
      <h2>{date === aujourdhui() ? 'Ta nuit, en 30 secondes' : `Ta nuit ${libelleNuit(date)}`}</h2>
      <p className="aide">
        {montre
          ? 'Heures reprises de ta montre : corrige-les seulement si elles sont fausses. Le reste, c’est ton ressenti, la montre ne le connaît pas.'
          : "À l'estime. La nuit, ne regarde pas l'heure : c'est le matin qu'on note."}
      </p>

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

      <div className="champ-qualite">
        <p className="legende">Jambes, hier soir et cette nuit (facultatif)</p>
        <Echelle valeur={n.jambes} onChoix={maj('jambes')} gauche="calmes" droite="insupportables" />
        {n.jambes > 0 && (
          <fieldset className="puces">
            <legend>Elles t’ont empêché de dormir ?</legend>
            {[
              [false, 'Non'],
              [true, 'Oui'],
            ].map(([v, t]) => (
              <button key={t} className={n.jambesReveil === v ? 'actif' : ''} aria-pressed={n.jambesReveil === v} onClick={() => maj('jambesReveil')(v)}>
                {t}
              </button>
            ))}
          </fieldset>
        )}
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
