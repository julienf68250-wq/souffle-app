import { useState } from 'react'
import { ecrire, lire } from './stockage.js'
import { agenda, enHeure, enMinutes } from './sommeil.js'

// Jambes sans repos (maladie de Willis-Ekbom) : ce qui a des preuves, classé (docs/etude/07).
// Le premier levier est hors de l'app : le bilan du fer, puis le médecin (AASM 2024-2025).
const CLE_FER = 'souffle.fer'
const JOUR = 86400000
const heureFr = (h) => h.replace(':00', ' h').replace(':', ' h ')

function lireFer(f) {
  if (!f) return null
  const bas = f.ferritine <= 75 || (f.cst != null && f.cst < 20)
  if (bas)
    return {
      ton: 'alerte',
      texte:
        'Sous les seuils des recommandations (ferritine 75 ou moins, ou saturation sous 20 %) : du fer est indiqué. Demande à ton médecin lequel, en comprimé ou en perfusion. Ne choisis pas seul.',
    }
  if (f.ferritine > 300)
    return {
      ton: 'alerte',
      texte:
        'Ferritine au-dessus de la normale : le fer n’est pas la piste pour les jambes, et surtout pas de fer en plus. Une ferritine haute avec une saturation normale vient le plus souvent d’une inflammation, du foie ou du métabolisme : vérifie avec ton médecin que c’est suivi.',
    }
  if (f.ferritine <= 100)
    return { ton: 'aide', texte: 'Zone intermédiaire (75 à 100) : une perfusion de fer peut se discuter avec le médecin. Le comprimé est moins utile ici.' }
  return { ton: 'aide', texte: 'Au-dessus des seuils : le fer n’est pas la piste pour toi. Les autres leviers de cette page restent valables.' }
}

// Heure de coucher médiane des 14 dernières nuits notées (les couchers après minuit comptent comme tardifs)
function coucherMedian() {
  const m = agenda()
    .slice(-14)
    .filter((n) => n.coucher)
    .map((n) => {
      const x = enMinutes(n.coucher)
      return x < 720 ? x + 1440 : x
    })
    .sort((a, b) => a - b)
  return m.length >= 3 ? enHeure(m[Math.floor(m.length / 2)]) : null
}

export default function Jambes({ onFin }) {
  const [fer, setFer] = useState(() => lire(CLE_FER, null))
  const [saisie, setSaisie] = useState({ ferritine: '', cst: '' })
  const sem = agenda().filter((n) => n.jambes != null && new Date(n.date + 'T12:00').getTime() > Date.now() - 7 * JOUR)
  const genantes = sem.filter((n) => n.jambes >= 5).length
  const lecture = lireFer(fer)
  const rappel = fer && fer.ferritine <= 300 && lecture?.ton === 'alerte' && Date.now() - new Date(fer.date + 'T12:00').getTime() > 80 * JOUR
  const coucherHabituel = coucherMedian()
  const limiteCafe = coucherHabituel ? enHeure(Math.floor((enMinutes(coucherHabituel) - 540) / 30) * 30) : null

  const enregistrer = () => {
    const ferritine = Number(saisie.ferritine.replace(',', '.'))
    const cst = saisie.cst.trim() ? Number(saisie.cst.replace(',', '.')) : null
    if (!ferritine) return
    const f = { date: new Date().toISOString().slice(0, 10), ferritine, cst }
    ecrire(CLE_FER, f)
    setFer(f)
  }

  return (
    <main className="ecran aide-ecran">
      <h2>Jambes sans repos</h2>
      {sem.length > 0 && (
        <p className="aide">
          Cette semaine : {genantes} nuit{genantes > 1 ? 's' : ''} sur {sem.length} avec des jambes gênantes (5 ou plus).
          {genantes > 2 && ' Le programme sommeil garde ta fenêtre au lit telle quelle tant que ça dure : manquer de sommeil aggrave les jambes.'}
        </p>
      )}

      <h3 className="titre-section">1. Le plus efficace : une prise de sang</h3>
      <p className="aide">
        Le manque de fer dans le cerveau entretient le syndrome, même sans anémie. C’est le seul levier sans médicament contre les symptômes qui a une
        recommandation forte (AASM 2025). Demande à ton médecin :
      </p>
      <ul className="signes">
        <li>
          <b>Ferritine</b> et <b>coefficient de saturation de la transferrine</b> (CST), avec fer sérique, NFS et CRP.
        </li>
        <li>Le matin, à jeun, sans comprimé de fer depuis 24 heures.</li>
        <li>
          La phrase à dire : « J’ai des jambes sans repos ; les recommandations demandent une ferritine au-dessus de 75 et un CST au-dessus de 20 %. »
        </li>
      </ul>
      <p className="aide">Ne prends ni fer ni magnésium sans ce dosage : le fer en trop est toxique. Le café et le thé bloquent une partie du fer des repas : bois-les au moins 1 heure avant ou 2 heures après, surtout si le médecin te prescrit du fer.</p>

      <details className="reglage" open={!!fer}>
        <summary>{fer ? `Mon résultat du ${new Date(fer.date + 'T12:00').toLocaleDateString('fr-FR')}` : 'J’ai mon résultat'}</summary>
        {lecture && <p className={lecture.ton}>{lecture.texte}</p>}
        {rappel && <p className="alerte">Ça fait près de 3 mois : c’est le moment de refaire le dosage pour voir si le fer a remonté.</p>}
        <label className="champ">
          Ferritine (ng/mL ou µg/L, c’est pareil)
          <input inputMode="decimal" value={saisie.ferritine} onChange={(e) => setSaisie((s) => ({ ...s, ferritine: e.target.value }))} placeholder="ex. 62" />
        </label>
        <label className="champ">
          CST en % (facultatif)
          <input inputMode="decimal" value={saisie.cst} onChange={(e) => setSaisie((s) => ({ ...s, cst: e.target.value }))} placeholder="ex. 18" />
        </label>
        <button className="secondaire" onClick={enregistrer} disabled={!saisie.ferritine.trim()}>
          Enregistrer
        </button>
      </details>

      <h3 className="titre-section">2. Les médicaments qui aggravent</h3>
      <p className="aide">À revoir avec ton pharmacien ou ton médecin. N’arrête jamais seul un traitement prescrit.</p>
      <ul className="signes">
        <li>Somnifères en vente libre et antihistaminiques : Donormyl, Atarax, Théralène, médicaments du rhume « nuit ».</li>
        <li>Contre les nausées : Primpéran (métoclopramide). Les neuroleptiques.</li>
        <li>Certains antidépresseurs, surtout la mirtazapine.</li>
      </ul>
      <p className="aide">
        Si on te propose un traitement contre les jambes : les recommandations américaines 2024 déconseillent désormais en premier choix les agonistes
        dopaminergiques (ropinirole, pramipexole, rotigotine), car ils peuvent aggraver le syndrome avec le temps. Si tu en prends et que les jambes
        commencent plus tôt dans la journée ou touchent les bras, parles-en au médecin.
      </p>

      <h3 className="titre-section">3. Ce qui aide, au quotidien</h3>
      <ul className="signes">
        <li>
          <b>Marcher et renforcer les jambes</b>, plutôt avant 17 h, sans effort intense le soir. Dans un essai, la gêne a baissé d’environ 40 % en 6 semaines.
        </li>
        <li>
          <b>Pendant une crise</b> : se lever, marcher, étirer les mollets, occuper son esprit. Rester allongé à lutter l’entretient.
        </li>
        <li>
          <b>Café</b> : le dernier au moins 9 heures avant le coucher (méta-analyse 2023 sur le sommeil)
          {limiteCafe ? `, donc avant ${heureFr(limiteCafe)} pour toi (coucher habituel ${heureFr(coucherHabituel)}).` : '.'} Pour les
          jambes, le lien avec la caféine est faible : si tu respectes déjà cette heure, ce n’est pas ta piste.
        </li>
        <li>
          <b>Étirements doux le soir</b> (mollets, cuisses) : preuve faible, mais sans risque.
        </li>
        <li>
          <b>Des horaires de sommeil réguliers</b> : la fatigue aggrave les jambes.
        </li>
      </ul>

      <h3 className="titre-section">4. Ce qui ne marche pas</h3>
      <ul className="signes">
        <li>Les « fréquences qui guérissent » (528 Hz, 432 Hz, Rife) : aucune preuve.</li>
        <li>Les sons et les vibrations du téléphone : aucune étude sur les jambes. Un iPhone ne vibre pas comme les coussins testés.</li>
        <li>La montre : elle ne voit pas les mouvements des jambes, il faudrait un capteur à la cheville.</li>
        <li>Acheter un appareil (pressothérapie, coussin vibrant) avant le bilan du fer.</li>
      </ul>

      <p className="aide">
        Association de patients : <b>France Ekbom</b>, france-ekbom.fr. Souffle est un outil d’auto-assistance : le diagnostic et le traitement se font avec ton
        médecin.
      </p>
      <div className="pied">
        <button className="lien" onClick={onFin}>
          Retour
        </button>
      </div>
    </main>
  )
}
