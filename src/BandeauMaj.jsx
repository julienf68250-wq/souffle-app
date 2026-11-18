import { useEffect, useState } from 'react'

// Bandeau discret, au-dessus de tous les écrans, quand une nouvelle version est en ligne.
export default function BandeauMaj() {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const montrer = () => setVisible(true)
    window.addEventListener('souffle-maj', montrer)
    return () => window.removeEventListener('souffle-maj', montrer)
  }, [])
  if (!visible) return null
  return (
    <button className="bandeau-maj" onClick={() => location.reload()}>
      Nouvelle version prête. Touche ici pour l'installer.
    </button>
  )
}
