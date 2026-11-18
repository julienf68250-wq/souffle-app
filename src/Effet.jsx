import { sessions } from './stockage.js'
import { agenda, calculer, duree, moyennes, septDerniersJours } from './sommeil.js'
import { CONTENU, meilleure, prochaineTechnique, semaineCourante, statsParTechnique, techniquesDisponibles } from './contenu.js'

const moyenne = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null)
const f1 = (x) => x.toFixed(1).replace('.', ',')
const signe = (b) => `${b >= 0 ? '−' : '+'}${f1(Math.abs(b))}`
const date = (t) => new Date(t).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })

// L'effet mesuré, pas ressenti : la raison de continuer (ou d'arrêter).
export default function Effet({ onFin }) {
  const tout = sessions()
  const notees = tout.filter((s) => s.type === 'souffle' && s.avant != null && s.apres != null)
  const baisse = moyenne(notees.map((s) => s.avant - s.apres))
  const nuits = agenda().slice(-14)
  const sept = moyennes(septDerniersJours())
  const debutAgenda = moyennes(agenda().slice(0, 7))
  const st = statsParTechnique()
  const parTechnique = CONTENU.techniques.filter((t) => st[t.id])
  const best = meilleure()
  const prochaine = prochaineTechnique()
  const nbDispo = techniquesDisponibles().length

  let constat
  if (baisse == null) constat = <>Pas encore de séance notée. Note ton stress avant et après : le résultat s'affichera ici.</>
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
        <section className="marees">
          <div className="marees-graphe">
            <div className="marees-axe" aria-hidden="true">
              <span>10</span>
              <span>5</span>
              <span>0</span>
            </div>
            <div className="marees-colonnes">
              {notees.slice(-14).map((s) => (
                <div key={s.t} className="colonne" role="img" aria-label={`${date(s.t)} : ${s.avant} avant, ${s.apres} après`}>
                  <div className="colonne-eau" style={{ height: `${s.apres * 10}%` }} />
                  <div className="colonne-repere" style={{ bottom: `${s.avant * 10}%` }} />
                </div>
              ))}
            </div>
          </div>
          <p className="marees-legende">
            <span><i className="pastille pastille-repere" /> stress avant</span>
            <span><i className="pastille pastille-eau" /> stress après</span>
          </p>
        </section>
      )}

      {parTechnique.length > 0 && (
        <section className="techniques">
          <h3>Ce qui marche sur toi</h3>
          {parTechnique.map((t) => (
            <div key={t.id} className="tech-ligne">
              <span>{t.nom}</span>
              <span className="tech-n">{st[t.id].n} fois</span>
              <span className="tech-b">{st[t.id].baisse == null ? '–' : signe(st[t.id].baisse)}</span>
            </div>
          ))}
          <p className="aide">
            {best
              ? `Souffle te propose en priorité « ${best.nom} », et une autre de temps en temps pour continuer à comparer.`
              : 'Après 3 séances notées sur une technique, Souffle commence à te proposer celle qui marche le mieux.'}
          </p>
        </section>
      )}

      <section className="sommeil">
        <h3 className="titre-section">Ton sommeil</h3>
        {sept ? (
          <>
            <p className="constat">
              Sur 7 jours : <b>{duree(sept.tst)}</b> de sommeil par nuit, efficacité <b>{Math.round(sept.eff * 100)} %</b>.
            </p>
            <p className="aide">
              Endormissement en {Math.round(sept.latence)} min, {Math.round(sept.eveil)} min d'éveil dans la nuit en moyenne.
              {debutAgenda && agenda().length >= 14 && ` Première semaine : efficacité ${Math.round(debutAgenda.eff * 100)} %.`} Objectif de la TCC-I : 85 % ou plus.
            </p>
            <div className="marees-graphe">
              <div className="marees-axe" aria-hidden="true">
                <span>100</span>
                <span>50</span>
                <span>0</span>
              </div>
              <div className="marees-colonnes">
                {nuits.map((n) => {
                  const e = calculer(n).eff
                  return (
                    <div key={n.date} className="colonne" role="img" aria-label={`${n.date} : efficacité ${Math.round(e * 100)} %`}>
                      <div className="colonne-eau" style={{ height: `${e * 100}%` }} />
                      <div className="colonne-repere objectif" style={{ bottom: '85%' }} />
                    </div>
                  )
                })}
              </div>
            </div>
            <p className="marees-legende">
              <span><i className="pastille pastille-eau" /> efficacité de la nuit</span>
              <span><i className="pastille pastille-repere" /> objectif 85 %</span>
            </p>
          </>
        ) : (
          <p className="aide">Note tes nuits chaque matin (accueil, « Ta nuit en 30 secondes ») : ton sommeil s'affichera ici.</p>
        )}
      </section>

      <p className="aide">
        Semaine {semaineCourante() + 1}. {nbDispo} technique{nbDispo > 1 ? 's' : ''} débloquée{nbDispo > 1 ? 's' : ''} sur {CONTENU.techniques.length}.
        {prochaine && ` Prochaine : « ${prochaine.technique.nom} », dans ${prochaine.jours} jour${prochaine.jours > 1 ? 's' : ''}.`}
      </p>

      <div className="pied">
        <button className="lien" onClick={onFin}>
          Retour
        </button>
      </div>
    </main>
  )
}
