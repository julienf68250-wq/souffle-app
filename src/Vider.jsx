import { useState } from 'react'
import { ajouterNote, notes as lireNotes, supprimerNote } from './stockage.js'

// Sortir de la tête ce qui tourne en boucle. Une note = une chose rangée.
export default function Vider({ onFin }) {
  const [texte, setTexte] = useState('')
  const [liste, setListe] = useState(lireNotes)

  const ranger = () => {
    if (!texte.trim()) return
    ajouterNote(texte.trim())
    setTexte('')
    setListe(lireNotes())
  }
  const fait = (id) => {
    supprimerNote(id)
    setListe(lireNotes())
  }

  return (
    <main className="ecran">
      <h2>Qu'est-ce qui tourne ?</h2>
      <p className="aide">Écris-le en vrac. C'est rangé ici, ta tête n'a plus besoin de le retenir.</p>
      <textarea value={texte} onChange={(e) => setTexte(e.target.value)} rows={4} placeholder="Rappeler le garage, préparer jeudi…" />
      <button className="principal" onClick={ranger} disabled={!texte.trim()}>
        Ranger
      </button>

      {liste.length > 0 && (
        <section className="notes">
          <h3>Rangé pour plus tard</h3>
          {[...liste].reverse().map((n) => (
            <div key={n.id} className="note">
              <span>{n.texte}</span>
              <button onClick={() => fait(n.id)}>C'est fait</button>
            </div>
          ))}
        </section>
      )}

      <div className="pied">
        <button className="lien" onClick={onFin}>
          Retour
        </button>
      </div>
    </main>
  )
}
