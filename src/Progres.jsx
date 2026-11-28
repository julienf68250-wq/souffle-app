import { BarreOnglets, BoutonReglages } from './Interface.jsx'
import { aller } from './routeur.js'
import { sessions } from './stockage.js'
import { agenda, calculer, duree } from './sommeil.js'
import { CONTENU, meilleure, statsParTechnique } from './contenu.js'
import { prochainBilan, suiviWho5 } from './questionnaires.js'
import { tendancesMontre } from './montre.js'
import { dernierExport } from './donnees.js'

const JOUR = 86400000
const moy = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null)
const f1 = (x) => x.toFixed(1).replace('.', ',')
const jourCourt = (t) => new Date(t).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })

// Courbe du WHO-5 : points, ligne de base, bande grise de ±10 (changement réel au-delà)
function CourbeWho5({ points, base }) {
  const L = 320
  const H = 150
  const m = { g: 30, d: 10, h: 10, b: 24 }
  const y = (v) => m.h + (1 - v / 100) * (H - m.h - m.b)
  const x = (i) => (points.length === 1 ? (L + m.g - m.d) / 2 : m.g + (i * (L - m.g - m.d)) / (points.length - 1))
  return (
    <svg className="courbe" viewBox={`0 0 ${L} ${H}`} role="img" aria-label={`Bien-être : ${points.map((p) => `${jourCourt(p.t)} ${p.v}`).join(', ')}`}>
      {[0, 50, 100].map((v) => (
        <g key={v}>
          <line x1={m.g} x2={L - m.d} y1={y(v)} y2={y(v)} className="grille" />
          <text x={m.g - 6} y={y(v) + 4} className="axe" textAnchor="end">
            {v}
          </text>
        </g>
      ))}
      {base != null && (
        <>
          <rect x={m.g} width={L - m.g - m.d} y={y(Math.min(100, base + 10))} height={y(Math.max(0, base - 10)) - y(Math.min(100, base + 10))} className="bande" />
          <line x1={m.g} x2={L - m.d} y1={y(base)} y2={y(base)} className="base" />
        </>
      )}
      {points.length > 1 && <polyline points={points.map((p, i) => `${x(i)},${y(p.v)}`).join(' ')} className="trace" />}
      {points.map((p, i) => (
        <g key={p.t}>
          <circle cx={x(i)} cy={y(p.v)} r="4.5" className="point" />
          {(i === 0 || i === points.length - 1) && (
            <text x={x(i)} y={H - 6} className="axe" textAnchor={points.length === 1 ? 'middle' : i === 0 ? 'start' : 'end'}>
              {jourCourt(p.t)}
            </text>
          )}
        </g>
      ))}
    </svg>
  )
}

// Semaines glissantes se terminant aujourd'hui
function parSemaine(n) {
  const fin = Date.now()
  return Array.from({ length: n }, (_, k) => ({ debut: fin - (n - k) * 7 * JOUR, fin: fin - (n - k - 1) * 7 * JOUR }))
}

export default function Progres() {
  const who = suiviWho5()
  const bilan = prochainBilan()
  const semaines = parSemaine(6)
  const nuits = agenda().map((n) => ({ ...n, t: new Date(n.date + 'T00:00').getTime(), c: calculer(n) })) // nuit datée du jour du lever, à minuit
  const sommeil = semaines.map((s) => {
    const l = nuits.filter((n) => n.t > s.debut && n.t <= s.fin)
    return { n: l.length, eff: moy(l.map((x) => x.c.eff)), tst: moy(l.map((x) => x.c.tst)), latence: moy(l.map((x) => x.latence)) }
  })
  const cette = sommeil.at(-1)
  const avant = sommeil.at(-2)
  const seances = sessions().filter((s) => s.type === 'souffle')
  const effet = (debut, fin) => {
    const l = seances.filter((s) => s.t > debut && s.t <= fin && s.avant != null && s.apres != null)
    return { n: l.length, baisse: moy(l.map((s) => s.avant - s.apres)) }
  }
  const effetSemaine = effet(Date.now() - 7 * JOUR, Date.now())
  const effetAvant = effet(Date.now() - 14 * JOUR, Date.now() - 7 * JOUR)
  const mois = Date.now() - 30 * JOUR
  const regul = {
    seances: seances.filter((s) => s.t > mois).length,
    nuits: nuits.filter((n) => n.t > mois).length,
    ecoutes: sessions().filter((s) => s.type === 'ecoute' && s.t > mois).length,
  }
  const montre = tendancesMontre()
  const st = statsParTechnique()
  const best = meilleure()
  const parTechnique = CONTENU.techniques.filter((t) => st[t.id]?.notees)
  const exportJours = dernierExport() ? Math.floor((Date.now() - dernierExport()) / JOUR) : null

  return (
    <div className="onglet">
      <header className="entete-onglet">
        <h1>Progrès</h1>
        <BoutonReglages />
      </header>
      <main className="contenu-onglet progres">
        <section className="carte-section">
          <h2 className="titre-section">Bien-être</h2>
          {who.points.length === 0 ? (
            <>
              <p className="aide">Pas encore de point de départ. 9 questions toutes les deux semaines suffisent pour voir si ça va mieux.</p>
              <button className="principal" onClick={() => aller('bilan')}>
                Faire mon point de départ
              </button>
            </>
          ) : (
            <>
              <CourbeWho5 points={who.points} base={who.base} />
              <p className="aide">
                {who.verdict === 'mieux' && 'Au-dessus de la bande grise : le changement est réel. Ce que tu fais marche, garde-le.'}
                {who.verdict === 'stable' && 'Dans la bande grise : pas de changement net pour l’instant. C’est le moment d’en parler à ton médecin si ça pèse.'}
                {who.verdict === 'moins-bien' && 'Sous la bande grise : parles-en à ton médecin cette semaine. Tu n’as pas à gérer ça seul.'}
                {!who.verdict &&
                  `Dernier point : ${who.dernier} sur 100. La bande grise, c’est ton point de départ à ±10 : dedans, c’est du bruit. On juge à partir de la semaine 8${who.semaines < 8 ? ` (encore ${8 - who.semaines} semaine${8 - who.semaines > 1 ? 's' : ''})` : ''}.`}
              </p>
              {bilan.du ? (
                <button className="principal" onClick={() => aller('bilan')}>
                  Faire le point maintenant
                </button>
              ) : (
                <p className="aide">Prochain point dans {bilan.jours} jour{bilan.jours > 1 ? 's' : ''}.</p>
              )}
            </>
          )}
        </section>

        <section className="carte-section">
          <h2 className="titre-section">Sommeil, semaine par semaine</h2>
          {nuits.length === 0 ? (
            <p className="aide">Note tes nuits le matin (onglet Nuit) : ton sommeil s’affichera ici.</p>
          ) : (
            <>
              <div className="barres-semaines" role="img" aria-label={`Efficacité du sommeil par semaine : ${sommeil.map((s) => (s.eff == null ? 'aucune donnée' : `${Math.round(s.eff * 100)} %`)).join(', ')}`}>
                {sommeil.map((s, i) => (
                  <div key={i} className="barre-semaine">
                    <div className="barre-fond">
                      <div className="barre-eau" style={{ height: `${(s.eff ?? 0) * 100}%` }} />
                      <div className="barre-cible" />
                    </div>
                    <span>{i === sommeil.length - 1 ? 'cette sem.' : `S-${sommeil.length - 1 - i}`}</span>
                  </div>
                ))}
              </div>
              {cette.n > 0 ? (
                <p className="aide">
                  Cette semaine : {duree(cette.tst)} de sommeil par nuit, efficacité {Math.round(cette.eff * 100)} % (cible 85 %), endormissement en{' '}
                  {Math.round(cette.latence)} min.
                  {avant.n > 0 && ` La semaine d’avant : ${Math.round(avant.eff * 100)} %.`}
                </p>
              ) : (
                <p className="aide">Aucune nuit notée cette semaine.</p>
              )}
            </>
          )}
        </section>

        <section className="carte-section">
          <h2 className="titre-section">Effet des séances</h2>
          {effetSemaine.n ? (
            <p className="aide">
              Cette semaine, après une séance, ton stress baisse de <b>{f1(Math.max(0, effetSemaine.baisse))} points</b> en moyenne ({effetSemaine.n} séance
              {effetSemaine.n > 1 ? 's' : ''}){effetAvant.n ? `, contre ${f1(Math.max(0, effetAvant.baisse))} la semaine d’avant` : ''}.
            </p>
          ) : (
            <p className="aide">Aucune séance notée cette semaine.</p>
          )}
          {best && <p className="aide">Ce qui marche le mieux sur toi : « {best.nom} ». Souffle te la propose en priorité.</p>}
          {!best && parTechnique.length > 0 && <p className="aide">Après 3 séances notées sur une technique, Souffle saura laquelle marche le mieux sur toi.</p>}
        </section>

        <section className="carte-section">
          <h2 className="titre-section">Ces 30 derniers jours</h2>
          <p className="aide">
            {regul.seances} séance{regul.seances > 1 ? 's' : ''}, {regul.nuits} nuit{regul.nuits > 1 ? 's' : ''} notée{regul.nuits > 1 ? 's' : ''}, {regul.ecoutes}{' '}
            écoute{regul.ecoutes > 1 ? 's' : ''} du soir. Un oubli ne compte pas : une habitude se prend en deux mois environ.
          </p>
        </section>

        <section className="carte-section">
          <h2 className="titre-section">Montre</h2>
          {montre ? (
            <>
              <ul className="signes">
                {montre.vfc.semaine != null && (
                  <li>
                    Variabilité cardiaque de nuit : {Math.round(montre.vfc.semaine)} ms en moyenne cette semaine
                    {montre.vfc.habitude != null ? `, ${Math.round(montre.vfc.habitude)} d’habitude.` : '.'}
                  </li>
                )}
                {montre.fcRepos.semaine != null && (
                  <li>
                    Pouls au repos : {Math.round(montre.fcRepos.semaine)} battements par minute
                    {montre.fcRepos.habitude != null ? `, ${Math.round(montre.fcRepos.habitude)} d’habitude.` : '.'}
                  </li>
                )}
                {montre.pas.semaine != null && (
                  <li>
                    Pas : {Math.round(montre.pas.semaine).toLocaleString('fr-FR')} par jour
                    {montre.pas.habitude != null ? `, ${Math.round(montre.pas.habitude).toLocaleString('fr-FR')} d’habitude.` : '.'} Viser 7 000 aide le moral.
                  </li>
                )}
              </ul>
              <p className="aide">Ce sont des tendances, pas des notes : une semaine isolée ne veut rien dire.</p>
              <button className="lien" onClick={() => aller('reglages', { section: 'montre' })}>
                Importer de nouvelles données
              </button>
            </>
          ) : (
            <button className="ligne-lien" onClick={() => aller('reglages', { section: 'montre' })}>
              Relier ma montre Garmin <span aria-hidden="true">›</span>
            </button>
          )}
        </section>

        <button className="ligne-lien" onClick={() => aller('reglages', { section: 'sauvegarde' })}>
          {exportJours == null ? 'Sauvegarder mes données' : `Sauvegarde : il y a ${exportJours} jour${exportJours > 1 ? 's' : ''}`} <span aria-hidden="true">›</span>
        </button>
      </main>
      <BarreOnglets actif="progres" />
    </div>
  )
}
