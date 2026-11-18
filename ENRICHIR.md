# Enrichir Souffle

Tout le contenu est dans **un seul fichier** : [src/contenu/contenu.json](src/contenu/contenu.json). Pas de code à toucher.

## Règle d'or

On n'ajoute jamais de menu ni de choix. Une nouvelle technique entre dans la rotation automatique : Souffle la propose d'office la première fois, puis la garde si elle fait baisser le stress mieux que les autres.

## Ajouter une technique

```json
{
  "id": "mon-id",                    // minuscules, chiffres, tirets, unique
  "nom": "Nom court",                // 30 caractères max
  "pourquoi": "Une phrase : ce que ça fait, sans promesse médicale.",
  "semaine": 5,                      // semaine de déblocage (0 = dès le départ)
  "moments": ["jour", "soir"],       // jour, soir, reveil
  "urgence": false,                  // true = proposée quand le stress noté est ≥ 7 (une seule suffit)
  "phases": [
    { "mot": "Inspire", "duree": 4, "vers": 1 },   // vers = niveau de l'eau à la fin de la phase
    { "mot": "Expire",  "duree": 6, "vers": 0 }    // la dernière phase finit toujours à 0
  ]
}
```

`mot` s'affiche en grand (18 caractères max). Une pause = une phase dont `vers` ne change pas.

## Ajouter un son

```json
{ "id": "vent", "nom": "Vent", "bruit": "rose", "coupure": [800, 2500], "volume": [0.2, 0.5], "houle": true }
```

- `bruit` : `brun` (grave, mer), `rose` (pluie), `blanc` (souffle).
- `houle: true` : le volume et la brillance suivent la respiration (de `[0]` à vide à `[1]` à plein).
- `houle: false` : son constant, avec une cloche douce à chaque changement de phase.

## Annoncer une nouveauté

1. Augmente `version` de 1.
2. Ajoute `{ "version": <nouvelle>, "texte": "…" }` dans `nouveautes` (280 caractères max).

L'annonce s'affiche une fois sur l'accueil, puis disparaît quand on touche « Compris ».

## Publier

```bash
export PATH="/c/Program Files/nodejs:$PATH"
npm run verifier   # refuse un contenu cassé, avec la liste des erreurs
npm run build      # vérifie puis compile dans dist/
```

Puis déployer `dist/`. L'app installée sur l'iPhone prend la nouvelle version à la prochaine ouverture avec du réseau.
