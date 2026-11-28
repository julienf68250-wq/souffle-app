import { useEffect, useState } from 'react'
import { activerSync, configSync, desactiverSync, etatSync, synchroniser } from './sync.js'
import { CodeLiaison, ScannerLiaison } from './Liaison.jsx'

const depuis = (t) => {
  if (!t) return 'jamais'
  const m = Math.floor((Date.now() - t) / 60000)
  if (m < 1) return 'à l’instant'
  if (m < 60) return `il y a ${m} min`
  const h = Math.floor(m / 60)
  return h < 24 ? `il y a ${h} h` : `il y a ${Math.floor(h / 24)} j`
}

// Réglage « Sauvegarde en ligne » : dépôt GitHub privé, données chiffrées sur le téléphone
export default function SauvegardeEnLigne({ ouvert }) {
  const [cfg, setCfg] = useState(configSync)
  const [etat, setEtat] = useState(etatSync)
  const [jeton, setJeton] = useState('')
  const [phrase, setPhrase] = useState('')
  const [phrase2, setPhrase2] = useState('')
  const [enCours, setEnCours] = useState(false)
  const [message, setMessage] = useState('')
  const [scan, setScan] = useState(false)

  useEffect(() => {
    const maj = () => setEtat(etatSync())
    window.addEventListener('souffle-sync', maj)
    return () => window.removeEventListener('souffle-sync', maj)
  }, [])

  const activer = async (lien) => {
    if (!lien) {
      if (phrase.length < 8) return setMessage('Choisis une phrase secrète d’au moins 8 caractères.')
      if (phrase !== phrase2) return setMessage('Les deux phrases secrètes ne sont pas identiques.')
    }
    setScan(false)
    setEnCours(true)
    setMessage(lien ? 'Code lu. Activation…' : '')
    try {
      const r = await activerSync(lien ?? { jeton, phrase })
      setCfg(configSync())
      setJeton('')
      setPhrase('')
      setPhrase2('')
      setMessage(r?.recupere ? 'Activée. Tes données en ligne ont été récupérées et fusionnées.' : 'Activée. Tes données sont maintenant sauvegardées en ligne.')
    } catch (e) {
      setMessage(e.message)
    } finally {
      setEnCours(false)
    }
  }

  const maintenant = async () => {
    setEnCours(true)
    setMessage('')
    try {
      await synchroniser()
      setMessage('Synchronisé.')
    } catch (e) {
      setMessage(e.message)
    } finally {
      setEnCours(false)
    }
  }

  return (
    <details className="reglage" open={ouvert}>
      <summary>Sauvegarde en ligne (GitHub)</summary>
      {cfg ? (
        <>
          <p className="aide">
            Active. Tes données sont chiffrées sur le téléphone puis envoyées dans ton dépôt privé <code>{cfg.depot}</code>, après chaque changement et à chaque
            ouverture. Dernière synchronisation : {depuis(etat.derniere)}.
          </p>
          {etat.erreur && <p className="alerte">{etat.erreur}</p>}
          <button className="principal" onClick={maintenant} disabled={enCours}>
            {enCours ? 'Synchronisation…' : 'Synchroniser maintenant'}
          </button>
          <button
            className="lien"
            onClick={() => {
              desactiverSync()
              setCfg(null)
              setMessage('Désactivée. Tes données restent sur le téléphone et dans le dépôt.')
            }}
          >
            Désactiver
          </button>
        </>
      ) : (
        <>
          <p className="aide">
            Tes données partent dans ton dépôt GitHub <b>privé</b> « souffle-donnees », <b>chiffrées</b> avec une phrase secrète : même GitHub ne peut pas les lire.
            Si tu changes de téléphone, tout revient. C’est aussi ce qui relie la montre.
          </p>
          {scan ? (
            <ScannerLiaison onCode={activer} onFermer={() => setScan(false)} />
          ) : (
            <button className="principal" onClick={() => setScan(true)} disabled={enCours}>
              {enCours ? 'Activation…' : 'Scanner le code du PC'}
            </button>
          )}
          <details className="sous-reglage">
            <summary>Sur le PC : afficher le code</summary>
            <p className="aide">
              Ouvre Souffle sur ton PC (julienf68250-wq.github.io/souffle-app), Réglages, Sauvegarde en ligne, puis colle ton jeton ici. Le code reste à ton
              écran, rien n’est enregistré sur le PC.
            </p>
            <CodeLiaison />
          </details>
          <details className="sous-reglage">
            <summary>Je n’ai pas encore de jeton GitHub</summary>
            <ol className="regles">
              <li>
                Sur le PC, ouvre github.com/settings/personal-access-tokens/new. Nom « Souffle », expiration 1 an.
              </li>
              <li>
                <b>Repository access</b> : <b>Only select repositories</b>, puis <b>souffle-donnees</b>.
              </li>
              <li>
                <b>Permissions</b> : <b>Add permissions</b>, <b>Contents</b>, accès <b>Read and write</b>. Génère et copie le jeton (il commence par{' '}
                <code>github_pat_</code>).
              </li>
            </ol>
          </details>
          <details className="sous-reglage">
            <summary>Saisir à la main</summary>
            <label className="champ">
              Jeton GitHub
              <input type="password" autoComplete="off" value={jeton} onChange={(e) => setJeton(e.target.value)} placeholder="github_pat_…" />
            </label>
            <label className="champ">
              Phrase secrète
              <input type="password" autoComplete="new-password" value={phrase} onChange={(e) => setPhrase(e.target.value)} />
            </label>
            <label className="champ">
              La même, encore une fois
              <input type="password" autoComplete="new-password" value={phrase2} onChange={(e) => setPhrase2(e.target.value)} />
            </label>
            <p className="aide">Note la phrase secrète dans un endroit sûr : sans elle, personne ne peut relire les données en ligne, pas même toi.</p>
            <button className="principal" onClick={() => activer()} disabled={enCours || !jeton.trim() || !phrase}>
              {enCours ? 'Vérification…' : 'Activer la sauvegarde en ligne'}
            </button>
          </details>
        </>
      )}
      {message && (
        <p className="aide" role="status">
          {message}
        </p>
      )}
    </details>
  )
}
