import { useRef, useState } from 'react'
import { aller } from './routeur.js'
import { dernierExport, exporter, fusionner, lireSauvegarde, resume } from './donnees.js'
import { importerMontre } from './montre.js'
import { ecrireTheme, lireTheme } from './stockage.js'
import SauvegardeEnLigne from './SauvegardeEnLigne.jsx'

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

export default function Reglages({ section }) {
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
      <h2>Réglages</h2>

      <section>

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

        <SauvegardeEnLigne ouvert={section === 'en-ligne'} />

        <details className="reglage" open={section === 'montre'}>
          <summary>Montre Garmin</summary>
          <p className="aide">
            Souffle garde deux chiffres : le pouls au repos et les pas (et la variabilité cardiaque de nuit si ta montre la fournit). Le score de stress, la Body Battery
            et le sommeil Garmin ne sont pas fiables : ils ne sont pas importés. Ta clé reste dans le Raccourci, jamais dans l’app.
          </p>
          <ol className="regles">
            <li>
              Sur <b>connect.garmin.com</b> (navigateur) : <b>Réglages</b>, <b>Personal API Key</b>, <b>Create Key</b>, durée 1 an. Copie la clé : elle ne
              s’affiche qu’une fois.
            </li>
            <li>
              Dans <b>Raccourcis</b>, crée le raccourci « Souffle Garmin ». Première action : <b>Texte</b>, et colle ta clé dedans.
            </li>
            <li>
              Ajoute <b>Obtenir le contenu de l’URL</b>. Remplace l’adresse par{' '}
              <code>https://personal.connectapi.garmin.com/personalapitoken-service/personal-api/personal-api-key/token</code>. Touche la flèche › : méthode{' '}
              <b>POST</b> ; <b>Ajouter un nouvel en-tête</b> : clé <code>Authorization</code>, texte « ApiKey », un espace, puis la bulle <b>Texte</b>. Le résultat
              de cette action est ton jeton.
            </li>
            <li>
              Ajoute <b>Date actuelle</b>, puis <b>Ajuster la date</b> : soustraire 35 jours, puis <b>Formater la date</b> : format personnalisé{' '}
              <code>yyyy-MM-dd</code>. Renomme le résultat « Début ». Ajoute encore <b>Date actuelle</b> puis <b>Formater la date</b> (même format) : c’est « Fin ».
            </li>
            <li>
              Ajoute <b>Obtenir le contenu de l’URL</b> :{' '}
              <code>https://personal.connectapi.garmin.com/usersummary-service/v2/dailysummaries?startDate=Début&amp;endDate=Fin</code> (insère les bulles Début et
              Fin à leur place). En-tête : clé <code>Authorization</code>, texte « Bearer », un espace, puis la bulle du jeton (résultat de l’étape 3).
            </li>
            <li>
              Ajoute <b>Copier dans le presse-papiers</b>. Lance le raccourci, puis reviens ici et touche « Importer ».
            </li>
          </ol>
          <p className="aide">Si les chiffres s’arrêtent à une vieille date : ouvre l’app Garmin Connect pour synchroniser ta montre, puis relance le raccourci.</p>
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

      <section className="parler">
        <h3 className="titre-section">Besoin de parler à quelqu’un</h3>
        <NumerosUrgence />
        <button className="ligne-lien" onClick={() => aller('consulter')}>
          Quand consulter un médecin <span aria-hidden="true">›</span>
        </button>
      </section>

      <p className="aide sources">
        Souffle est un outil d’auto-assistance, pas un dispositif médical. Questionnaires : WHO-5 (OMS, CC BY-NC-SA 3.0 IGO), PHQ-9 et GAD-7 (Spitzer, Williams,
        Kroenke, Pfizer, reproduction autorisée).
      </p>
    </main>
  )
}
