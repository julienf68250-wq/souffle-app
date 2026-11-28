import { BarreOnglets, BoutonAide } from './Interface.jsx'
import { aller } from './routeur.js'
import { aujourdhui, etatProgramme, libelleNuit, nuitsManquantes } from './sommeil.js'

const estNuitNoire = () => {
  const h = new Date().getHours()
  return h >= 23 || h < 6
}
const court = (iso) => new Date(iso + 'T12:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' })

// Onglet Nuit : tout ce qui concerne le sommeil. Entre 23 h et 6 h, « Je ne dors pas » et
// « Écouter » passent en tête, sans aucune heure affichée.
export default function Nuit() {
  const prog = etatProgramme()
  const manquantes = nuitsManquantes()
  const tard = estNuitNoire()

  const actions = [
    { cle: 'preparer', titre: 'Préparer la nuit', texte: 'La liste de demain, 2 minutes de souffle lent, puis au lit si le sommeil est là.', aller: 'nuit/preparer' },
    { cle: 'ecouter', titre: 'Écouter pour s’endormir', texte: 'Une histoire lue lentement, ou un son, qui s’arrête tout seul.', aller: 'nuit/ecouter' },
    { cle: 'reveil', titre: 'Je ne dors pas', texte: 'Ce que recommandent les études, sans regarder l’heure.', aller: 'nuit/reveil' },
  ]
  if (tard) actions.sort((a, b) => ['reveil', 'ecouter', 'preparer'].indexOf(a.cle) - ['reveil', 'ecouter', 'preparer'].indexOf(b.cle))

  return (
    <div className="onglet">
      <header className="entete-onglet">
        <h1>Nuit</h1>
        <BoutonAide />
      </header>
      <main className="contenu-onglet">
        {prog && !tard && (
          <p className="consigne">
            {prog.coucher ? `Au lit pas avant ${prog.coucher}, et seulement si le sommeil est là. ` : 'Au lit seulement quand le sommeil est là. '}
            Lever à {prog.lever}.
          </p>
        )}

        <div className="choix-liste">
          {actions.map((a, i) => (
            <button key={a.cle} className={i === 0 ? 'actif' : ''} onClick={() => aller(a.aller)}>
              <strong>{a.titre}</strong>
              <span>{a.texte}</span>
            </button>
          ))}
        </div>

        {!tard && (
          <section className="bloc-nuits">
            <h2 className="titre-section">Agenda du sommeil</h2>
            {manquantes.length ? (
              <>
                <p className="aide">{manquantes.length === 1 ? 'Une nuit n’est pas notée.' : `${manquantes.length} nuits ne sont pas notées.`} Tu peux les rattraper :</p>
                <div className="puces">
                  {manquantes.map((d) => (
                    <button key={d} onClick={() => aller('nuit/agenda', { date: d })} aria-label={`Noter la nuit ${libelleNuit(d)}`}>
                      {d === aujourdhui() ? 'Cette nuit' : court(d)}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <p className="aide">Les 7 dernières nuits sont notées.</p>
            )}
            <button className="lien" onClick={() => aller('nuit/agenda', { date: aujourdhui() })}>
              Corriger la nuit dernière
            </button>
          </section>
        )}

        <button className="ligne-lien" onClick={() => aller('nuit/programme')}>
          {prog ? `Programme sommeil, semaine ${prog.semaine}` : 'Démarrer le programme sommeil'}
          <span aria-hidden="true">›</span>
        </button>
      </main>
      <BarreOnglets actif="nuit" />
    </div>
  )
}
