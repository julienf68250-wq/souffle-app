import { useRef, useState } from 'react'
import { aller } from './routeur.js'
import { dernierExport, exporter, fusionner, lireSauvegarde, resume } from './donnees.js'
import { importerMontre } from './montre.js'
import { ecrireTheme, lireTheme } from './stockage.js'

// Numéros d'urgence, réutilisés dans l'écran de sécurité du questionnaire
export function NumerosUrgence() {
  return (
    <div className="urgence">
      <a className="principal grand appel" href="tel:3114">
        Appeler le 3114
        <small>Prévention du suicide : gratuit, 24 h/24, 7 j/7</small>
      </a>
      <div className="rangee-urgence">
        <a className="secondaire" href="tel:15">
          SAMU : 15
        </a>
        <a className="secondaire" href="tel:112">
          Urgences : 112
        </a>
      </div>
    </div>
  )
}

const pluriel = (n, mot, pl = mot + 's') => `${n} ${n > 1 ? pl : mot}`

const ilYa = (t) => {
  if (!t) return null
  const j = Math.floor((Date.now() - t) / 86400000)
  return j === 0 ? 'aujourd’hui' : j === 1 ? 'hier' : `il y a ${j} jours`
}

export default function Aide({ section }) {
  const [theme, setTheme] = useState(lireTheme)
  const [apercu, setApercu] = useState(null)
  const [message, setMessage] = useState('')
  const [montreMsg, setMontreMsg] = useState('')
  const [collage, setCollage] = useState(false)
  const [texteMontre, setTexteMontre] = useState('')
  const fichier = useRef(null)
  const depuis = ilYa(dernierExport())

  const basculerTheme = () => {
    const t = theme === 'sombre' ? 'auto' : 'sombre'
    ecrireTheme(t)
    setTheme(t)
    window.dispatchEvent(new Event('souffle-theme'))
  }

  const sauvegarder = async () => {
    const r = await exporter()
    setMessage(r === 'annule' ? '' : 'Sauvegarde créée. Range-la dans Fichiers (iCloud Drive), pas seulement sur le téléphone.')
  }

  const choisirFichier = async (e) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    try {
      setApercu(lireSauvegarde(await f.text()))
      setMessage('')
    } catch (err) {
      setMessage(err.message)
    }
  }

  const importer = (texte) => {
    try {
      const r = importerMontre(texte)
      setMontreMsg(`${r.jours} jours importés : VFC ${r.vfc}, pouls au repos ${r.fcRepos}, pas ${r.pas}.`)
      setCollage(false)
    } catch (err) {
      setMontreMsg(err.message)
    }
  }
  const importerPressePapiers = async () => {
    try {
      importer(await navigator.clipboard.readText())
    } catch {
      setCollage(true) // lecture refusée : on colle à la main
      setMontreMsg('Colle ici le contenu copié par le Raccourci.')
    }
  }

  return (
    <main className="ecran aide-ecran">
      <h2>Aide</h2>

      <section>
        <p className="aide">Si tu penses au suicide, ou si tu t’inquiètes pour toi : appelle, maintenant. On t’écoute, sans jugement.</p>
        <NumerosUrgence />
        <button className="ligne-lien" onClick={() => aller('consulter')}>
          Quand consulter un médecin <span aria-hidden="true">›</span>
        </button>
      </section>

      <section>
        <h3 className="titre-section">Repères</h3>
        <ul className="signes">
          <li>Alcool : 10 verres par semaine au maximum, 2 par jour au plus, et des jours sans (Santé publique France). Il aggrave l’anxiété et le sommeil.</li>
          <li>Café : son effet dure 5 à 6 heures. Si tu dors mal, rien après 14 h.</li>
        </ul>
      </section>

      <section>
        <h3 className="titre-section">Réglages</h3>

        <details className="reglage">
          <summary>Rappel quotidien</summary>
          <p className="aide">Une web app ne peut pas programmer de notification seule. L’app Raccourcis le fait, sans serveur, en 1 minute :</p>
          <ol className="regles">
            <li>
              Ouvre <b>Raccourcis</b>, onglet <b>Automatisation</b>, touche <b>+</b>, puis <b>Heure de la journée</b>.
            </li>
            <li>
              Choisis l’heure de ton lever plus 15 minutes, <b>Quotidien</b>, et <b>Exécuter immédiatement</b>.
            </li>
            <li>
              Ajoute l’action <b>Afficher une notification</b> avec le texte : « Souffle : ta nuit et ton geste ».
            </li>
            <li>Quand elle arrive, ouvre Souffle depuis son icône (la notification ouvre Raccourcis).</li>
          </ol>
        </details>

        <details className="reglage" open={section === 'sauvegarde'}>
          <summary>Sauvegarde de mes données</summary>
          <p className="aide">
            Tout est sur ce téléphone. Supprimer l’icône de Souffle efface tout. Sauvegarde chaque dimanche dans Fichiers.
            {depuis ? ` Dernière sauvegarde : ${depuis}.` : ' Aucune sauvegarde pour l’instant.'}
          </p>
          <button className="principal" onClick={sauvegarder}>
            Sauvegarder maintenant
          </button>
          <button className="secondaire" onClick={() => fichier.current?.click()}>
            Restaurer une sauvegarde
          </button>
          <input ref={fichier} type="file" accept="application/json,.json" hidden onChange={choisirFichier} />
          {apercu && (
            <div className="apercu">
              <p>
                Cette sauvegarde contient {pluriel(apercu.resume.nuits, 'nuit')}, {pluriel(apercu.resume.seances, 'séance')}, {pluriel(apercu.resume.bilans, 'point', 'points')} de suivi et{' '}
                {pluriel(apercu.resume.notes, 'note')}. Elle sera fusionnée avec ce qui est déjà là, sans doublon.
              </p>
              <button
                className="principal"
                onClick={() => {
                  fusionner(apercu.donnees)
                  const r = resume(Object.fromEntries(Object.keys(localStorage).map((k) => [k, JSON.parse(localStorage.getItem(k) || 'null')])))
                  setApercu(null)
                  setMessage(`Restauré. Tu as maintenant ${pluriel(r.nuits, 'nuit')} et ${pluriel(r.seances, 'séance')}.`)
                }}
              >
                Fusionner
              </button>
              <button className="lien" onClick={() => setApercu(null)}>
                Annuler
              </button>
            </div>
          )}
          {message && <p className="aide" role="status">{message}</p>}
        </details>

        <details className="reglage" open={section === 'montre'}>
          <summary>Montre Garmin</summary>
          <p className="aide">
            Souffle garde trois chiffres seulement : la variabilité cardiaque (VFC) de la nuit, le pouls au repos et les pas. Le score de stress, la Body Battery
            et le sommeil Garmin ne sont pas fiables : ils ne sont pas importés. Ta clé reste dans le Raccourci, jamais dans l’app.
          </p>
          <ol className="regles">
            <li>
              Sur <b>connect.garmin.com</b> (navigateur) : <b>Réglages</b>, <b>Personal API Key</b>, <b>Create Key</b>, durée 1 an. Copie la clé : elle ne
              s’affiche qu’une fois.
            </li>
            <li>
              Dans <b>Raccourcis</b>, crée « Souffle Garmin ». Action <b>Texte</b> : colle ta clé.
            </li>
            <li>
              <b>Obtenir le contenu de l’URL</b> : <code>https://personal.connectapi.garmin.com/personalapitoken-service/personal-api/personal-api-key/token</code>,
              méthode <b>POST</b>, en-tête <code>Authorization</code> = « ApiKey » + espace + le Texte.
            </li>
            <li>
              <b>Obtenir la valeur du dictionnaire</b> pour la clé <code>access_token</code> : c’est le jeton.
            </li>
            <li>
              <b>Date actuelle</b>, <b>Ajuster la date</b> (moins 35 jours), <b>Formater la date</b> au format personnalisé <code>yyyy-MM-dd</code> : c’est le
              début. Même chose sans ajustement : c’est la fin.
            </li>
            <li>
              Trois <b>Obtenir le contenu de l’URL</b> (méthode GET, en-tête <code>Authorization</code> = « Bearer » + espace + le jeton) :
              <br />
              <code>https://personal.connectapi.garmin.com/hrv-service/hrv/daily/DÉBUT/FIN</code>
              <br />
              <code>https://personal.connectapi.garmin.com/usersummary-service/v2/dailysummaries?startDate=DÉBUT&amp;endDate=FIN</code>
              <br />
              <code>https://personal.connectapi.garmin.com/usersummary-service/stats/steps/daily/DÉBUT/FIN</code>
            </li>
            <li>
              <b>Dictionnaire</b> avec les trois résultats (vfc, resume, pas), puis <b>Copier dans le presse-papiers</b>.
            </li>
            <li>Lance le raccourci, reviens dans Souffle et touche « Importer ».</li>
          </ol>
          <button className="principal" onClick={importerPressePapiers}>
            Importer depuis le presse-papiers
          </button>
          {collage && (
            <>
              <textarea rows={4} value={texteMontre} onChange={(e) => setTexteMontre(e.target.value)} placeholder="Colle ici (appui long, Coller)" />
              <button className="secondaire" onClick={() => importer(texteMontre)} disabled={!texteMontre.trim()}>
                Importer ce texte
              </button>
            </>
          )}
          {montreMsg && <p className="aide" role="status">{montreMsg}</p>}
        </details>

        <button className="ligne-lien" onClick={basculerTheme}>
          {theme === 'sombre' ? 'Thème clair en journée' : 'Mode sombre tout le temps'} <span aria-hidden="true">›</span>
        </button>
      </section>

      <p className="aide sources">
        Souffle est un outil d’auto-assistance, pas un dispositif médical. Questionnaires : WHO-5 (OMS, CC BY-NC-SA 3.0 IGO), PHQ-9 et GAD-7 (Spitzer, Williams,
        Kroenke, Pfizer, reproduction autorisée).
      </p>
    </main>
  )
}
