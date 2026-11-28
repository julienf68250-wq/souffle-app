import { useEffect, useState } from 'react'
import { configSync, etatSync, synchroniser } from './sync.js'
import { aller } from './routeur.js'

const JOUR = 86400000
export const dateCourte = (iso) => new Date(iso + 'T12:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
const ilYa = (t) => {
  if (!t) return 'jamais'
  const m = Math.floor((Date.now() - new Date(t).getTime()) / 60000)
  if (m < 1) return 'à l’instant'
  if (m < 60) return `il y a ${m} min`
  const h = Math.floor(m / 60)
  return h < 24 ? `il y a ${h} h` : `il y a ${Math.floor(h / 24)} j`
}
export const joursDepuis = (iso) => (iso ? Math.floor((Date.now() - new Date(iso + 'T12:00').getTime()) / JOUR) : null)

// Petit bandeau quand de nouvelles données de la montre arrivent (jamais la nuit : pas de stimulation)
export function BandeauMontre() {
  const [info, setInfo] = useState(null)
  useEffect(() => {
    let minuterie
    const montrer = (e) => {
      const h = new Date().getHours()
      if (h >= 22 || h < 6) return
      setInfo(e.detail)
      clearTimeout(minuterie)
      minuterie = setTimeout(() => setInfo(null), 5000)
    }
    window.addEventListener('souffle-montre', montrer)
    return () => {
      window.removeEventListener('souffle-montre', montrer)
      clearTimeout(minuterie)
    }
  }, [])
  if (!info) return null
  const vieux = joursDepuis(info.derniere) > 1
  return (
    <button className="bandeau-montre" role="status" onClick={() => (setInfo(null), aller('progres'))}>
      <span aria-hidden="true">⌚</span>{' '}
      {info.erreur
        ? 'Montre : la synchronisation a un souci. Touche pour voir.'
        : vieux
          ? `Montre synchronisée, mais ses dernières données datent de ${dateCourte(info.derniere)}.`
          : 'Montre synchronisée. Tes tendances sont à jour.'}
    </button>
  )
}

// Réglage « Montre Garmin » : tout est automatique, on montre seulement l'état
export function ReglageMontre({ ouvert }) {
  const [etat, setEtat] = useState(etatSync)
  const [enCours, setEnCours] = useState(false)
  useEffect(() => {
    const maj = () => setEtat(etatSync())
    window.addEventListener('souffle-sync', maj)
    return () => window.removeEventListener('souffle-sync', maj)
  }, [])
  const actif = !!configSync()
  const m = etat.montre ?? {}
  const vieux = joursDepuis(m.derniere) > 1

  const verifier = async () => {
    setEnCours(true)
    try {
      await synchroniser()
    } catch {
      /* l'erreur s'affiche dans l'état */
    } finally {
      setEnCours(false)
      setEtat(etatSync())
    }
  }

  return (
    <details className="reglage" open={ouvert}>
      <summary>Montre Garmin</summary>
      {!actif ? (
        <>
          <p className="aide">
            La montre se synchronise toute seule, toutes les 3 heures, dès que la <b>sauvegarde en ligne</b> est activée (juste au-dessus). Rien d’autre à faire.
          </p>
          <button className="secondaire" onClick={() => aller('reglages', { section: 'en-ligne' })}>
            Activer la sauvegarde en ligne
          </button>
        </>
      ) : (
        <>
          <p className="aide">
            Automatique : un robot dans ton dépôt privé interroge Garmin toutes les 3 heures et dépose les données chiffrées. L’app les récupère à chaque ouverture.
          </p>
          {m.erreur ? (
            <p className="alerte">{m.erreur}</p>
          ) : m.derniere ? (
            <p className="aide">
              Dernier passage du robot : <b>{ilYa(m.verifie)}</b>. Données jusqu’au <b>{dateCourte(m.derniere)}</b>.
            </p>
          ) : (
            <p className="aide">En attente du premier passage du robot (dans les 3 heures).</p>
          )}
          {vieux && !m.erreur && (
            <p className="aide">La date est ancienne : ouvre l’app Garmin Connect sur ton iPhone pour que la montre envoie ses données.</p>
          )}
          <button className="secondaire" onClick={verifier} disabled={enCours}>
            {enCours ? 'Vérification…' : 'Vérifier maintenant'}
          </button>
        </>
      )}
      <p className="aide">
        Affiché : marche, effort et pouls au repos, les seuls chiffres assez fiables. Le score de stress, la Body Battery, l’oxygène et le sommeil Garmin
        ne sont pas montrés : ce sont des estimations, et un mauvais chiffre au réveil suffit à aggraver la fatigue ressentie.
      </p>
    </details>
  )
}

const pl = (n, mot) => `${n} ${mot}${n > 1 ? 's' : ''}`

// Carte « Montre » de l'onglet Progrès : 3 signaux fiables, en mots, jamais avant que la nuit soit notée
export function CarteMontre({ signaux, pistes, nuitPasNotee }) {
  const etat = etatSync().montre ?? {}
  if (!signaux) {
    return (
      <button className="ligne-lien" onClick={() => aller('reglages', { section: 'montre' })}>
        Relier ma montre Garmin <span aria-hidden="true">›</span>
      </button>
    )
  }
  if (nuitPasNotee) {
    return (
      <>
        <p className="aide">Note d’abord ta nuit, avec ton ressenti à toi. Les chiffres de la montre s’afficheront ensuite.</p>
        <button className="secondaire" onClick={() => aller('nuit/agenda')}>
          Noter ma nuit
        </button>
      </>
    )
  }
  const { marche, effort, pouls } = signaux
  const vieux = joursDepuis(signaux.derniereDate) > 2
  const pisteNuit = pistes?.nuit
  const pisteJambes = pistes?.jambes
  const f1 = (x) => x.toFixed(1).replace('.', ',')
  return (
    <>
      <ul className="signes">
        {marche && (
          <li>
            <b>Marche</b> : cette semaine, {pl(marche.jours, 'jour')} à 7 000 pas ou plus
            {marche.jours >= 5 ? '. Semaine pleine, c’est ce qui aide le plus le moral.' : ` (repère : 5 sur 7). Chaque millier de pas en plus compte.`}
          </li>
        )}
        {effort && (
          <li>
            <b>Effort</b> : {effort.minutes} min cette semaine
            {effort.minutes >= 150
              ? ', au repère de l’OMS (150). Bravo.'
              : effort.minutes >= 75
                ? ' : la moitié du repère (150) est faite, et la moitié aide déjà.'
                : '. Deux marches rapides de 20 min d’ici dimanche suffisent pour démarrer.'}
          </li>
        )}
        {pouls && (
          <li>
            <b>Pouls au repos</b> :{' '}
            {pouls.haut
              ? `un peu plus haut que d’habitude (${Math.round(pouls.moy7)} contre ${Math.round(pouls.base)}). Rhume qui couve, alcool, grosse journée ou effort : rien d’inquiétant en soi. Journée douce, coucher à l’heure prévue. Si ça dure plus d’une semaine, parles-en à ton médecin.`
              : `stable (${Math.round(pouls.base)} battements par minute d’habitude). Ton corps récupère normalement.`}
          </li>
        )}
      </ul>
      {pisteNuit?.actifs != null && Math.abs(pisteNuit.actifs - pisteNuit.calmes) >= 1.5 && (
        <p className="aide">
          Piste : après une journée à 7 000 pas ou plus, tu notes ta nuit {f1(pisteNuit.actifs)} sur 10, contre {f1(pisteNuit.calmes)} les autres jours (
          {pisteNuit.nActifs} et {pisteNuit.nCalmes} nuits). Une piste, pas une preuve.
        </p>
      )}
      {pisteJambes?.actifs != null && Math.abs(pisteJambes.actifs - pisteJambes.calmes) >= 25 && (
        <p className="aide">
          Piste jambes : {Math.round(pisteJambes.actifs)} % de nuits aux jambes calmes après une journée active, contre {Math.round(pisteJambes.calmes)} % sinon (
          {pisteJambes.nActifs} et {pisteJambes.nCalmes} nuits).
        </p>
      )}
      {pisteNuit?.manque > 0 && (
        <p className="aide">
          Encore {pl(pisteNuit.manque, 'nuit')} notée{pisteNuit.manque > 1 ? 's' : ''} avec la montre, et Souffle te dira si la marche change tes nuits.
        </p>
      )}
      <p className="aide">
        {vieux
          ? `Dernières données de la montre : ${dateCourte(signaux.derniereDate)}. Ouvre l’app Garmin Connect pour qu’elle les envoie.`
          : etat.verifie
            ? `Synchronisée ${ilYa(etat.verifie)}, automatiquement. Ce sont des tendances, pas des notes.`
            : 'Ce sont des tendances, pas des notes : une semaine isolée ne veut rien dire.'}
      </p>
    </>
  )
}
