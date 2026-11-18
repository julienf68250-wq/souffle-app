# Souffle

**En ligne : https://julienf68250-wq.github.io/souffle-app/** (publication automatique à chaque push sur main : le code reste dans ce dépôt privé, seule l'app compilée part dans le dépôt public `souffle-app`).

Web app iPhone (PWA) pour le stress et l'endormissement. Données uniquement sur le téléphone (localStorage).

- **Souffler** : cohérence cardiaque 5 s / 5 s (1, 3 ou 5 min), stress noté 0-10 avant et après.
- **Vider ma tête** : noter ce qui tourne en boucle, cocher « C'est fait » plus tard.
- **Dormir** : vider sa tête, 2 min de souffle 4 s / 6 s, puis lancement du raccourci iOS « Dormir » (mode Sommeil + sons d'arrière-plan).
- **Mon effet** : échelle de marée (stress avant/après), efficacité par technique, note des nuits, progression hebdomadaire.
- **Réveil nocturne** (23 h - 6 h) : 5 min très lentes, écran assombri, rien à noter.
- **Choix automatique** : Souffle choisit la technique (stress ≥ 7 → soupir physiologique ; sinon nouveauté, puis la plus efficace sur toi). Une technique se débloque chaque semaine.
- **Son** : mer générée qui suit la respiration, ou pluie avec cloche douce. Diagnostic : `window.__souffleAudio.rms()` dans la console.

- **Programme sommeil (TCC-I)** : agenda du matin, 4 règles du contrôle du stimulus, compression du temps au lit sur demande avec garde-fous, guide « Je ne dors pas ». Bases scientifiques : [docs/RECHERCHE.md](docs/RECHERCHE.md).

Enrichir le contenu : voir [ENRICHIR.md](ENRICHIR.md) (un seul fichier JSON, vérifié avant chaque build).

Design : « la marée ». Jour = brume de lac, nuit (21 h - 6 h) = indigo. Polices Newsreader + Hanken Grotesk embarquées.

```bash
export PATH="/c/Program Files/nodejs:$PATH"
npm install
npm run dev      # test sur le réseau local : http://<IP-du-PC>:5173 depuis l'iPhone
npm run build    # dist/ à héberger en HTTPS
npm run icones   # régénère les PNG d'icône
```

Limites connues : pas de vibration sur iPhone (Safari ne la supporte pas) ; le son de la séance suit le bouton silencieux ; le service worker (hors connexion) exige HTTPS.
