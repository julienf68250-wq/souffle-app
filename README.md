# Souffle

Web app iPhone (PWA) pour le stress et l'endormissement. Données uniquement sur le téléphone (localStorage).

- **Souffler** : cohérence cardiaque 5 s / 5 s (1, 3 ou 5 min), stress noté 0-10 avant et après.
- **Vider ma tête** : noter ce qui tourne en boucle, cocher « C'est fait » plus tard.
- **Dormir** : vider sa tête, 2 min de souffle 4 s / 6 s, puis lancement du raccourci iOS « Dormir » (mode Sommeil + sons d'arrière-plan).
- **Mon effet** : baisse moyenne du stress par séance, note moyenne des nuits (posée chaque matin).

Design : « la marée ». Jour = brume de lac, nuit (21 h - 6 h) = indigo. Polices Newsreader + Hanken Grotesk embarquées.

```bash
export PATH="/c/Program Files/nodejs:$PATH"
npm install
npm run dev      # test sur le réseau local : http://<IP-du-PC>:5173 depuis l'iPhone
npm run build    # dist/ à héberger en HTTPS
npm run icones   # régénère les PNG d'icône
```

Limites connues : pas de vibration sur iPhone (Safari ne la supporte pas) ; le son de la séance suit le bouton silencieux ; le service worker (hors connexion) exige HTTPS.
