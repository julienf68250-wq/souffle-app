// Navigation par adresse (#/onglet/ecran?param=…) : chaque écran a une adresse,
// le retour suit l'historique, et l'app rouvre là où on était.
import { useEffect, useState } from 'react'

export const ONGLETS = ['aujourdhui', 'nuit', 'progres']

export function lireRoute() {
  const brut = location.hash.replace(/^#\/?/, '')
  const [chemin, requete = ''] = brut.split('?')
  const params = Object.fromEntries(new URLSearchParams(requete))
  return { chemin: chemin || 'aujourdhui', params }
}

const versHash = (chemin, params = {}) => {
  const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v != null && v !== '')).toString()
  return `#/${chemin}${q ? `?${q}` : ''}`
}

let profondeur = 0 // écrans ouverts depuis le lancement (pour savoir si « retour » a un sens)

export function aller(chemin, params) {
  profondeur++
  location.hash = versHash(chemin, params)
}
export function remplacer(chemin, params) {
  history.replaceState(null, '', versHash(chemin, params))
  window.dispatchEvent(new HashChangeEvent('hashchange'))
}
// Revient à l'écran précédent ; à défaut (app rouverte sur un sous-écran), à l'onglet parent
export function retour(defaut) {
  if (profondeur > 0) {
    profondeur--
    history.back()
  } else {
    const racine = defaut ?? (lireRoute().chemin.startsWith('nuit') ? 'nuit' : 'aujourdhui')
    remplacer(racine)
  }
}

export function useRoute() {
  const [route, setRoute] = useState(lireRoute)
  useEffect(() => {
    const maj = () => {
      setRoute(lireRoute())
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', maj)
    return () => window.removeEventListener('hashchange', maj)
  }, [])
  return route
}
