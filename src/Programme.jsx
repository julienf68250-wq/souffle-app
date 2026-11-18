import { useState } from 'react'
import {
  QUESTIONS,
  arreterProgramme,
  changerLever,
  demarrerProgramme,
  duree,
  etatProgramme,
  evaluerGardeFous,
  moyennes,
  septDerniersJours,
  agenda,
} from './sommeil.js'

// Les 4 règles du contrôle du stimulus (AASM 2008 / 2021, ESRS 2023)
export function Regles() {
  return (
    <ol className="regles">
      <li>
        <b>Lever à heure fixe</b>, 7 jours sur 7, même après une mauvaise nuit. C'est l'ancre de ton horloge.
      </li>
      <li>
        <b>Au lit seulement quand tu as sommeil</b> : paupières lourdes, pas juste de la fatigue.
      </li>
      <li>
        <b>Le lit sert à dormir</b> (et à l'intimité). Pas d'écran, pas de travail, pas de ruminations au lit.
      </li>
      <li>
        <b>Si le sommeil ne vient pas au bout d'environ 20 minutes</b>, à l'estime et sans regarder l'heure : lève-toi, va dans une autre pièce, et ne reviens que quand le
        sommeil revient.
      </li>
    </ol>
  )
}

export default function Programme({ onFin, versConsulter }) {
  const etat = etatProgramme()
  return etat ? <Suivi etat={etat} onFin={onFin} versConsulter={versConsulter} /> : <Demarrage onFin={onFin} versConsulter={versConsulter} />
}

function Demarrage({ onFin, versConsulter }) {
  const [etape, setEtape] = useState('intro')
  const [reponses, setReponses] = useState({})
  const [lever, setLever] = useState('06:45')
  const g = evaluerGardeFous(reponses)
  const toutesRepondues = QUESTIONS.every((q) => reponses[q.id] !== undefined)

  if (etape === 'intro')
    return (
      <main className="ecran">
        <h2>Programme sommeil</h2>
        <p className="aide">
          Il reprend la TCC-I, le traitement de première intention de l'insomnie en France, en Europe et aux États-Unis. Ce qui marche le plus, ce n'est pas la
          relaxation : ce sont quatre règles et un agenda du sommeil.
        </p>
        <Regles />
        <p className="aide">
          Chaque matin, tu notes ta nuit en 30 secondes. Comptes 4 à 8 semaines pour juger. C'est un outil d'auto-assistance, pas un traitement médical.
        </p>
        <button className="principal" onClick={() => setEtape('securite')}>
          Commencer
        </button>
        <div className="pied">
          <button className="lien" onClick={onFin}>
            Retour
          </button>
        </div>
      </main>
    )

  if (etape === 'securite')
    return (
      <main className="ecran">
        <h2>Sept questions de sécurité</h2>
        <p className="aide">Certaines techniques sont déconseillées dans ces situations. Tes réponses restent sur ton téléphone.</p>
        {QUESTIONS.map((q) => (
          <div key={q.id} className="question">
            <p>{q.texte}</p>
            <div className="oui-non">
              {[
                ['Non', false],
                ['Oui', true],
              ].map(([l, v]) => (
                <button key={l} className={reponses[q.id] === v ? 'actif' : ''} aria-pressed={reponses[q.id] === v} onClick={() => setReponses((r) => ({ ...r, [q.id]: v }))}>
                  {l}
                </button>
              ))}
            </div>
          </div>
        ))}
        <button className="principal" disabled={!toutesRepondues} onClick={() => setEtape(g.toutBloque ? 'bloque' : 'lever')}>
          Continuer
        </button>
      </main>
    )

  if (etape === 'bloque')
    return (
      <main className="ecran">
        <h2>Parles-en d'abord à un médecin.</h2>
        <p className="aide">
          Avec une épilepsie, les recommandations européennes déconseillent de réduire le temps au lit et de se lever la nuit sans suivi médical : le manque de
          sommeil peut favoriser les crises. Un médecin peut t'orienter vers une TCC-I adaptée.
        </p>
        <button className="principal" onClick={versConsulter}>
          Quand et qui consulter
        </button>
        <div className="pied">
          <button className="lien" onClick={onFin}>
            Retour
          </button>
        </div>
      </main>
    )

  if (etape === 'lever')
    return (
      <main className="ecran">
        <h2>Ton heure de lever fixe</h2>
        <p className="aide">Celle que tu peux tenir tous les jours, week-end compris. Tout le reste se cale dessus.</p>
        <label className="grande-heure">
          <input type="time" value={lever} onChange={(e) => e.target.value && setLever(e.target.value)} />
        </label>
        <button className="principal" onClick={() => setEtape('compression')}>
          Continuer
        </button>
      </main>
    )

  // Compression du temps au lit : sur demande, et seulement sans contre-indication
  const lancer = (compression) => {
    demarrerProgramme({ lever, reponses, compression })
    onFin()
  }
  return (
    <main className="ecran">
      <h2>Compression du temps au lit</h2>
      {g.compressionBloquee ? (
        <>
          <p className="aide">
            D'après tes réponses, cette technique est déconseillée sans suivi médical. Ton programme garde l'agenda et les quatre règles, qui restent efficaces.
          </p>
          {g.medecin.length > 0 && (
            <p className="alerte">
              Certaines réponses méritent un avis médical (somnolence, ronflement, jambes, humeur).{' '}
              <button className="lien" onClick={versConsulter}>
                Voir quand consulter
              </button>
            </p>
          )}
          <button className="principal" onClick={() => lancer(false)}>
            Démarrer le programme
          </button>
        </>
      ) : (
        <>
          <p className="aide">
            C'est la technique la plus efficace de la TCC-I, et la plus exigeante. Après une semaine d'agenda, Souffle calcule une fenêtre au lit égale à ton temps
            de sommeil réel, jamais moins de 5 h. Chaque semaine, elle s'allonge de 15 minutes si tu dors bien plus de 85 % du temps passé au lit.
          </p>
          <p className="alerte">
            Les deux ou trois premières semaines, tu auras probablement plus sommeil dans la journée. <b>Si tu somnoles, ne conduis pas.</b>
          </p>
          {g.medecin.length > 0 && (
            <p className="aide">
              Une de tes réponses mérite un avis médical.{' '}
              <button className="lien" onClick={versConsulter}>
                Voir quand consulter
              </button>
            </p>
          )}
          <button className="principal" onClick={() => lancer(true)}>
            Démarrer avec la compression
          </button>
          <button className="secondaire" onClick={() => lancer(false)}>
            Démarrer sans, juste l'agenda et les règles
          </button>
        </>
      )}
    </main>
  )
}

function Suivi({ etat, onFin, versConsulter }) {
  const [lever, setLever] = useState(etat.lever)
  const [confirmerArret, setConfirmerArret] = useState(false)
  const m = moyennes(septDerniersJours())
  const nbNotees = agenda().filter((n) => n.date >= etat.debut).length
  const ch = etat.dernierChangement

  let fenetre
  if (!etat.compression) fenetre = <>Lever à <b>{etat.lever}</b>, tous les jours. Au lit seulement quand tu as sommeil.</>
  else if (etat.observation)
    fenetre = (
      <>
        Semaine d'observation : note tes nuits sans rien changer ({Math.min(nbNotees, 5)} sur 5 minimum). Lever à <b>{etat.lever}</b>.
      </>
    )
  else
    fenetre = (
      <>
        Au lit <b>pas avant {etat.coucher}</b>, et seulement si tu as sommeil. Lever à <b>{etat.lever}</b>, quoi qu'il arrive.
      </>
    )

  return (
    <main className="ecran">
      <p className="nom-ecran">Programme sommeil, semaine {etat.semaine}</p>
      <p className="constat">{fenetre}</p>

      {ch && (
        <p className="annonce-texte">
          {ch.type === 'debut'
            ? `Fenêtre calculée sur ta première semaine : ${duree(ch.fenetre)} au lit.`
            : ch.fenetre > ch.de
              ? `Efficacité ${Math.round(ch.eff * 100)} % la semaine dernière : ta fenêtre s'allonge à ${duree(ch.fenetre)}.`
              : ch.fenetre < ch.de
                ? `Efficacité ${Math.round(ch.eff * 100)} % la semaine dernière : ta fenêtre passe à ${duree(ch.fenetre)} pour consolider le sommeil.`
                : `Efficacité ${Math.round(ch.eff * 100)} % la semaine dernière : ta fenêtre reste à ${duree(ch.fenetre)}.`}
        </p>
      )}

      {m && (
        <p className="aide">
          Sur 7 jours : {duree(m.tst)} de sommeil par nuit, efficacité {Math.round(m.eff * 100)} %, endormissement en {Math.round(m.latence)} min environ.
        </p>
      )}

      {etat.compression && !etat.observation && (
        <p className="alerte">
          <b>Si tu somnoles, ne conduis pas.</b> La somnolence des premières semaines est attendue et passe quand la fenêtre s'allonge.
        </p>
      )}

      <section>
        <h3 className="titre-section">Les quatre règles</h3>
        <Regles />
      </section>

      <label className="ligne-reglage">
        Heure de lever
        <input
          type="time"
          value={lever}
          onChange={(e) => {
            if (!e.target.value) return
            setLever(e.target.value)
            changerLever(e.target.value)
          }}
        />
      </label>

      <div className="pied">
        <button className="lien" onClick={versConsulter}>
          Quand consulter un médecin
        </button>
        {confirmerArret ? (
          <p className="aide">
            Arrêter efface le programme (ton agenda est gardé).{' '}
            <button
              className="lien"
              onClick={() => {
                arreterProgramme()
                onFin()
              }}
            >
              Confirmer l'arrêt
            </button>
          </p>
        ) : (
          <button className="lien" onClick={() => setConfirmerArret(true)}>
            Arrêter le programme
          </button>
        )}
        <button className="lien" onClick={onFin}>
          Retour
        </button>
      </div>
    </main>
  )
}
