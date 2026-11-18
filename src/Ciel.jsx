// Le ciel de l'accueil suit l'heure : soleil sur sa course le jour, lune et étoiles la nuit.
export function periode(d = new Date()) {
  const h = d.getHours()
  if (h < 6 || h >= 21) return 'nuit'
  if (h < 9) return 'aube'
  if (h < 17) return 'jour'
  return 'crepuscule'
}

// Positions fixes : un ciel qui ne « saute » pas d'une ouverture à l'autre
const ETOILES = [
  [58, 12, 1.6], [66, 30, 1.1], [74, 8, 1.3], [81, 22, 2], [90, 14, 1.2], [94, 36, 1.4],
  [70, 46, 1], [86, 52, 1.5], [62, 58, 1.2], [52, 6, 1], [97, 60, 1.1], [77, 66, 1.3],
]

export default function Astre() {
  const d = new Date()
  const h = d.getHours() + d.getMinutes() / 60
  const nuit = periode(d) === 'nuit'
  // Course de 6 h à 21 h le jour, de 21 h à 6 h la nuit, sur la moitié droite du ciel
  const f = nuit ? ((h - 21 + 24) % 24) / 9 : (h - 6) / 15
  const x = 74 + 18 * f
  const y = 22 + 40 * (1 - Math.sin(Math.PI * f))

  return (
    <div className="astres" aria-hidden="true">
      {nuit &&
        ETOILES.map(([ex, ey, r], i) => (
          <span key={i} className="etoile" style={{ left: `${ex}%`, top: `${ey}%`, width: r * 2, height: r * 2, animationDelay: `${(i * 1.7) % 6}s` }} />
        ))}
      <svg className={nuit ? 'lune' : 'soleil'} style={{ left: `${x}%`, top: `${y}%` }} viewBox="0 0 60 60">
        {nuit ? (
          <>
            <defs>
              <mask id="croissant">
                <rect width="60" height="60" fill="#fff" />
                <circle cx="40" cy="22" r="20" fill="#000" />
              </mask>
            </defs>
            <circle cx="30" cy="30" r="20" mask="url(#croissant)" />
          </>
        ) : (
          <circle cx="30" cy="30" r="20" />
        )}
      </svg>
    </div>
  )
}
