import { useRef, useState } from 'react'
import { aller } from './routeur.js'
import { dernierExport, exporter, fusionner, lireSauvegarde, resume } from './donnees.js'
import { ecrireTheme, lireTheme } from './stockage.js'
import SauvegardeEnLigne from './SauvegardeEnLigne.jsx'
import { ReglageMontre } from './MontreEtat.jsx'

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

        <ReglageMontre ouvert={section === 'montre'} />

        <details className="reglage">
          <summary>Sons et fréquences : ce que disent les études</summary>
          <p className="aide">
            Les fréquences « qui guérissent » (528 Hz, 432 Hz, Rife) n’ont aucune preuve. Les battements binauraux ont un petit effet sur l’anxiété, mais pas
            sur le sommeil dans les essais sérieux.
          </p>
          <p className="aide">
            Ce qui marche : respirer lentement, environ 6 fois par minute avec une expiration longue (c’est la base des séances Souffler), et un son calme au
            coucher qui baisse puis s’arrête seul. Pas de bruit toute la nuit : il réduit le sommeil paradoxal. Le haut-parleur à un mètre plutôt qu’un casque.
          </p>
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
