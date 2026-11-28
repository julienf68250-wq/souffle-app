// Éléments communs : barre d’onglets, en-tête avec retour, icône de réglages.
import { aller, remplacer, retour } from './routeur.js'

const ICONES = {
  aujourdhui: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="9" r="3.6" />
      <path d="M3 17c2.2-1.6 4.3-1.6 6.5 0s4.3 1.6 6.5 0 4.3-1.6 5 0" />
    </svg>
  ),
  nuit: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10z" />
    </svg>
  ),
  progres: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3.5 18.5l5-6 4 3.5 7.5-9" />
      <path d="M15.5 7h4.5v4.5" />
    </svg>
  ),
}
const LIBELLES = { aujourdhui: 'Aujourd’hui', nuit: 'Nuit', progres: 'Progrès' }

export function BarreOnglets({ actif }) {
  return (
    <nav className="onglets" aria-label="Sections">
      {Object.keys(LIBELLES).map((o) => (
        <button key={o} className={o === actif ? 'actif' : ''} aria-current={o === actif ? 'page' : undefined} onClick={() => o !== actif && remplacer(o)}>
          {ICONES[o]}
          <span>{LIBELLES[o]}</span>
        </button>
      ))}
    </nav>
  )
}

// En-tête des sous-écrans : un retour toujours visible, en haut à gauche, 44 pt
export function Entete({ titre, onRetour }) {
  return (
    <header className="entete">
      <button className="entete-retour" onClick={onRetour ?? (() => retour())}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M15 5l-7 7 7 7" />
        </svg>
        Retour
      </button>
      {titre && <span className="entete-titre">{titre}</span>}
    </header>
  )
}

// Réglages (sauvegarde, montre, rappel, thème ; 3114 en bas), au même endroit sur chaque onglet
export function BoutonReglages() {
  return (
    <button className="bouton-reglages" onClick={() => aller('reglages')} aria-label="Réglages">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="3.2" />
        <path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7" />
      </svg>
    </button>
  )
}
