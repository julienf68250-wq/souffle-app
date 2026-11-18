// Bord d'eau ondulé. Deux périodes identiques : décaler de 50 % boucle sans à-coup.
export default function Vague({ className = 'vague' }) {
  return (
    <svg className={className} viewBox="0 0 800 22" preserveAspectRatio="none" aria-hidden="true">
      <path d="M0 11 C100 0 100 0 200 11 S300 22 400 11 S500 0 600 11 S700 22 800 11 V22 H0 Z" />
    </svg>
  )
}
