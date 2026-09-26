# Tirage Strika

Jets de d20 en direct : Admin vs PJ, ou PJ vs PJ. Plusieurs parties peuvent tourner en même temps, tout le monde voit tout (pas de comptes).

## Mettre en ligne sur Vercel (≈ 3 min)

1. **Pousser le code sur GitHub**
   ```bash
   cd tirage-strika
   git init && git add . && git commit -m "Tirage Strika"
   gh repo create tirage-strika --private --source=. --push   # ou via github.com
   ```
2. **Importer dans Vercel** : vercel.com → *Add New… → Project* → choisir le repo → *Deploy*.
   (Le premier déploiement affichera une erreur « Base de données non configurée » : c'est normal, on la branche juste après.)
3. **Brancher la base (gratuite)** : dans le projet Vercel → onglet *Storage* → *Create Database* → **Upstash for Redis** → plan Free → *Connect* au projet.
   Vercel ajoute tout seul les variables `KV_REST_API_URL` et `KV_REST_API_TOKEN`.
4. **Redéployer** : onglet *Deployments* → ⋯ sur le dernier → *Redeploy*. C'est en ligne.

## En local

```bash
npm install
npm run dev     # http://localhost:3000 — sans variables Upstash, les données restent en mémoire
```

## Fonctionnement

- **Ajouter PJ** : prénom, nom, photo (recadrée en carré et compressée dans le navigateur).
- **Nouveau tirage** : Admin vs PJ (on choisit le PJ) ou PJ vs PJ (on choisit les deux, l'un après l'autre).
- **Partie** : à chaque tour, le côté gauche lance puis le côté droit. Le dé est tiré **côté serveur** (1–20), personne ne peut tricher depuis son navigateur. Le plus haut gagne le tour. « Terminer la partie » la clôt et elle passe dans l'historique.
- **Direct** : chaque page de partie se met à jour toutes les 1,5 s ; un spectateur voit l'animation de chaque jet comme le lanceur.
- **Historique** : une ligne par partie (les deux adversaires, le score, le nombre de tours). En cliquant, on voit les jets tour par tour.
