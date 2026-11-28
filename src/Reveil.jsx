import { useState } from 'react'
import Respiration from './Respiration.jsx'
import { preparerSeance } from './pleinEcran.js'

// « Je ne dors pas » : contrôle du stimulus (AASM, ESRS). On ne reste pas au lit à lutter,
// on ne regarde pas l'heure. Écran très sombre, aucune heure affichée.
export default function Reveil({ technique, onFin, versVider }) {
  const [etape, setEtape] = useState('lever')

  if (etape === 'respire')
    return <Respiration technique={technique} duree={300} sombre onFin={() => setEtape('retour')} onStop={() => setEtape('retour')} />

  if (etape === 'retour')
    return (
      <main className="ecran sombre-fin">
        <h2>Le sommeil revient ?</h2>
        <p className="aide">Retourne au lit seulement si tes paupières sont lourdes. Sinon, reste encore un peu dans le calme. Si ça ne vient pas, recommence.</p>
        <div className="pied">
          <button className="lien" onClick={onFin}>
            Fermer
          </button>
        </div>
      </main>
    )

  if (etape === 'jambes')
    return (
      <main className="ecran sombre-fin">
        <h2>Les jambes : bouge, c’est ce qui soulage.</h2>
        <ol className="regles">
          <li>Lève-toi et marche 5 minutes, dans une autre pièce, lumière faible.</li>
          <li>
            Étire les mollets : face au mur, une jambe tendue derrière, talon au sol, 30 secondes de chaque côté, deux fois.
          </li>
          <li>Puis assis, occupe ton esprit : mots croisés, un livre, un puzzle. Une tête occupée sent moins les jambes.</li>
          <li>Retour au lit quand les jambes se calment et que les paupières sont lourdes.</li>
        </ol>
        <p className="aide">
          Pas de respiration ni d’histoire allongé pendant une crise : rester couché l’entretient. Si ça revient plusieurs nuits par semaine, parles-en à ton
          médecin (bilan du fer).
        </p>
        <div className="pied">
          <button className="lien" onClick={onFin}>
            Fermer
          </button>
        </div>
      </main>
    )

  return (
    <main className="ecran sombre-fin">
      <h2>Lève-toi, doucement.</h2>
      <ol className="regles">
        <li>Va dans une autre pièce, avec une lumière faible.</li>
        <li>Fais quelque chose de calme et un peu ennuyeux : un livre papier, ranger quelques objets, rester assis.</li>
        <li>Pas d'heure, pas de mails, pas de réseaux.</li>
        <li>Reviens au lit quand le sommeil revient. Le lit, c'est pour dormir.</li>
      </ol>
      <p className="aide">Rester au lit à lutter apprend au cerveau que le lit est un endroit d'éveil : c'est ce que la TCC-I cherche à défaire.</p>
      <button
        className="secondaire"
        onClick={() => {
          preparerSeance()
          setEtape('respire')
        }}
      >
        Respirer lentement, assis hors du lit
      </button>
      <button className="secondaire" onClick={() => setEtape('jambes')}>
        C’est les jambes qui m’empêchent
      </button>
      <div className="pied">
        <button className="lien" onClick={versVider}>
          Noter ce qui tourne
        </button>
        <button className="lien" onClick={onFin}>
          Fermer
        </button>
      </div>
    </main>
  )
}
