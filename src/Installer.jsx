import { useState } from 'react'
import { estInstallee, estIOS } from './pleinEcran.js'
import { lire, ecrire } from './stockage.js'

const CLE = 'souffle.installer-plus-tard'
const SEMAINE = 7 * 86400000

// Dans Safari sur iPhone, seul l'ajout à l'écran d'accueil donne le plein écran.
export default function Installer() {
  const [visible, setVisible] = useState(() => estIOS() && !estInstallee() && Date.now() - lire(CLE, 0) > SEMAINE)
  if (!visible) return null
  return (
    <div className="installer" role="note">
      <p>
        <b>Pour l'avoir en plein écran</b>, touche{' '}
        <svg className="icone-partager" viewBox="0 0 20 24" aria-label="Partager">
          <path d="M10 2v13M5.5 6.5 10 2l4.5 4.5M6 10H3v12h14V10h-3" />
        </svg>{' '}
        dans Safari, puis « Sur l'écran d'accueil ». Ouvre ensuite Souffle depuis son icône.
      </p>
      <button
        className="lien"
        onClick={() => {
          ecrire(CLE, Date.now())
          setVisible(false)
        }}
      >
        Plus tard
      </button>
    </div>
  )
}
