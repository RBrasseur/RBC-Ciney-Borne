# RBC Ciney — Application de Prise de Commandes

Application web de prise de commandes de boissons et snacks pour le club de basket **RBC Ciney**, conçue aux couleurs du club (bleu et blanc) sans gestion de prix.

## Fonctionnalités principales

- **Couleurs du club (Bleu & Blanc)** : Interface sobre, lisible et contrastée, sans logo inventé.
- **6 catégories configurées selon la carte du club** :
  1. **Bières** : Bière, Tango, Mazout, Panaché, Wittekerke Rosée, Radler Citron, Léonard Triple, Cuvée Ciney Blonde, Orval, Chimay Dorée, Kwarmont, Kwarmont 0%.
  2. **Crémants & Vins** : Vin blanc, Vin rouge, Crémant.
  3. **Softs** : Eau plate, Eau pétillante, Coca 0%, Coca, Fanta, Jus multifruits, Jus pomme cerise, Tonic Bliss, Lipton 0%, Fuze Tea Pêche, Fuze Tea Green, Agrume, Aquarius Citron, Aquarius Bleu, Aquarius Rouge, Aquarius Cherry.
  4. **Boissons chaudes** : Café, Choco chaud, Thé nature, Thé menthe, Thé citron.
  5. **Soupes** : Soupe légumes, Soupe poulet, Soupe tomates.
  6. **Snacks** : Chips sel, Chips paprika, Chips poivre sel, Chips thaï curry, Saucisse sèche, Croque monsieur.
- **Parcours rapide** :
  - Cliquer sur une catégorie ouvre la sélection correspondante.
  - Appuyer sur **`+`** ajoute la boisson et **redirige automatiquement vers la sélection générale**.
  - Appuyer sur **`-`** (dans le résumé général, dans la catégorie ou via le bandeau de correction rapide) retire un article en cas d'erreur.
  - Le **Résumé de la commande** affiche en permanence le détail et le **Total** des articles pris, avec un bouton **Valider la commande**.
- **Carte évolutive** :
  - Possibilité d'ajouter à tout moment de nouvelles boissons, de nouveaux snacks ou de nouvelles catégories via le bouton **Gérer la carte** (sauvegarde locale automatique dans le navigateur).

## Fichiers à mettre sur GitHub

Placez ces fichiers à la racine de votre dépôt GitHub :
- `index.html` — Structure de l'application
- `styles.css` — Feuille de style aux couleurs du RBC Ciney (bleu et blanc)
- `app.js` — Logique métier, gestion des commandes et personnalisation de la carte
- `manifest.json` — Configuration Web App (ajout à l'écran d'accueil sur smartphone/tablette)

## Déploiement sur GitHub Pages

1. Créez un nouveau dépôt sur GitHub (par exemple `rbc-ciney-commandes`).
2. Importez les fichiers `index.html`, `styles.css`, `app.js`, `manifest.json` et `README.md` (ou décompressez l'archive `rbc-ciney-commandes.zip`).
3. Allez dans **Settings** > **Pages** de votre dépôt GitHub.
4. Sous **Build and deployment** > **Branch**, sélectionnez `main` (ou `master`) et le dossier `/ (root)`, puis cliquez sur **Save**.
5. Votre application sera accessible en ligne après quelques secondes.
