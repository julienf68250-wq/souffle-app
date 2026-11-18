import { sessions } from './stockage.js'

const moyenne = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null)
const f1 = (x) => x.toFixed(1).replace('.', ',')
const date = (t) => new Date(t).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })

// L'effet mesuré, pas ressenti : la raison de continuer (ou d'arrêter).
export default function Effet({ onFin }) {
  const tout = sessions()
  const notees = tout.filter((s) => s.type === 'souffle' && s.avant != null && s.apres != null)
  const baisse = moyenne(notees.map((s) => s.avant - s.apres))
  const nuits = tout.filter((s) => s.type === 'nuit' && s.note != null).slice(-7)
  const noteNuits = moyenne(nuits.map((n) => n.note))

  let constat
  if (baisse == null) constat = <>Pas encore de séance notée. Note ton stress avant et après, et le résultat s'affichera ici.</>
  else if (baisse > 0) constat = <>Après une séance, ton stress baisse de <b>{f1(baisse)} points</b> en moyenne.</>
  else constat = <>Pour l'instant, les séances ne font pas baisser ton stress ({f1(baisse)} point en moyenne).</>

  return (
    <main className="ecran">
      <p className="constat">{constat}</p>
      {notees.length > 0 && notees.length < 10 && (
        <p className="aide">
          {notees.length} séance{notees.length > 1 ? 's' : ''} notée{notees.length > 1 ? 's' : ''}. Juge vraiment à partir de 10.
        </p>
      )}

      {notees.length > 0 && (
        <section className="historique" aria-label="Dernières séances, stress avant et après">
          {notees.slice(-10).reverse().map((s) => (
            <div key={s.t} className="ligne">
              <span className="ligne-date">{date(s.t)}</span>
              <div className="barres">
                <div className="barre avant" style={{ width: `${s.avant * 10}%` }} />
                <div className="barre apres" style={{ width: `${s.apres * 10}%` }} />
              </div>
              <span className="ligne-val">
                {s.avant} › {s.apres}
              </span>
            </div>
          ))}
        </section>
      )}

      <p className="constat">
        {noteNuits == null ? (
          <>Tes nuits s'afficheront ici, notées chaque matin.</>
        ) : (
          <>
            Tes {nuits.length} dernières nuits : <b>{f1(noteNuits)} sur 10</b>.
          </>
        )}
      </p>

      <div className="pied">
        <button className="lien" onClick={onFin}>
          Retour
        </button>
      </div>
    </main>
  )
}
