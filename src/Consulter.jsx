// Quand l'auto-assistance ne suffit pas (AASM 2008, ESRS 2023).
export default function Consulter({ onFin }) {
  return (
    <main className="ecran">
      <h2>Quand consulter</h2>
      <p className="aide">Parles-en à ton médecin traitant si l'un de ces signes te concerne. Il peut aussi t'orienter vers une TCC-I avec un thérapeute, plus efficace qu'une app.</p>
      <ul className="signes">
        <li>Ronflement fort, pauses de respiration la nuit, réveils en suffoquant.</li>
        <li>Envie irrépressible de bouger les jambes le soir, ou jambes qui sursautent la nuit : demande un dosage de la ferritine et du CST.</li>
        <li>Endormissements involontaires dans la journée, surtout au volant.</li>
        <li>Humeur très basse, perte d'intérêt, ou anxiété forte depuis plusieurs semaines.</li>
        <li>Comportements anormaux pendant le sommeil.</li>
        <li>Travail de nuit ou en horaires décalés, ou grossesse.</li>
        <li>Pas d'amélioration après 6 à 8 semaines de programme suivi.</li>
      </ul>
      <p className="alerte">
        <b>Si tu as des idées suicidaires</b>, appelle le <b>3114</b> : gratuit, 24 h/24, 7 j/7. En cas de danger immédiat, le 15 ou le 112.
      </p>
      <p className="aide">Souffle est un outil d'auto-assistance, pas un dispositif médical. Il ne remplace pas un avis médical.</p>
      <div className="pied">
        <button className="lien" onClick={onFin}>
          Retour
        </button>
      </div>
    </main>
  )
}
