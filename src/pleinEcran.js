import { deverrouillerAudio } from './audio.js'

// App lancée depuis l'icône de l'écran d'accueil (= vrai plein écran sur iPhone)
export const estInstallee = () =>
  window.navigator.standalone === true || window.matchMedia?.('(display-mode: standalone)').matches || window.matchMedia?.('(display-mode: fullscreen)').matches

export const estIOS = () =>
  /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

// PC et Android : plein écran via l'API. iPhone ne la propose pas : il faut installer l'app.
export function entrerPleinEcran() {
  const el = document.documentElement
  if (estInstallee() || document.fullscreenElement || !el.requestFullscreen) return
  el.requestFullscreen({ navigationUI: 'hide' }).catch(() => {})
}

// À appeler dans le clic qui lance une séance : son déverrouillé + plein écran
export function preparerSeance() {
  deverrouillerAudio()
  entrerPleinEcran()
}
