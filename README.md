# Quran Mastery OS

Application mobile de suivi de mémorisation du Coran : révision espacée par hizb, apprentissage de nouveaux thumuns, agenda, statistiques. Tout fonctionne en local, sans compte ni serveur.

## Démarrage

1. Installer les dépendances : `npm install`
2. Lancer le serveur de développement : `npm run dev`
3. Lancer les tests : `npm test`
4. Construire l'application : `npm run build`

## Vos données

Stockage local (`localStorage`, clé `qmos.state`) : vos données ne quittent pas le téléphone ; seules les polices sont chargées depuis Google Fonts. Dans l'onglet Réglages, vous pouvez exporter une sauvegarde (fichier) et la réimporter, par exemple pour changer d'appareil.

## Remplacer les thumuns approximatifs par le fichier exact

Le référentiel livré (`src/data/thumuns.json`) est approximatif pour les versets de départ des thumuns. Pour le remplacer par le fichier exact :

```
node scripts/import-thumuns.mjs <fichier.csv>
```

Colonnes attendues : `id,hizb,thumun,sourate,verset` (480 lignes, de `H01-T1` à `H60-T8`). En cas d'erreur, rien n'est écrit.

## Vérification de bout en bout

`node scripts/smoke.mjs` construit l'application, la lance en prévisualisation et parcourt les écrans en mode clair puis sombre (Playwright). Les captures sont enregistrées dans `smoke-shots/`.

## Installer sur iPhone (écran d'accueil)

L'app se déploie sur GitHub Pages à chaque mise à jour de `main` (`.github/workflows/pages.yml`).

1. Dans le dépôt GitHub : Settings → Pages → Source « GitHub Actions » (une seule fois).
2. Après la fusion dans `main`, l'adresse est `https://<utilisateur>.github.io/quran-mastery-os/`.
3. Sur l'iPhone, ouvrez cette adresse dans **Safari**, touchez Partager, puis « Sur l'écran d'accueil ».
4. Ouvrez toujours l'app depuis cette icône : ses données (stockage local) sont séparées de celles de Safari.

L'app fonctionne ensuite sans réseau. iOS peut effacer les données d'un site peu visité : faites de temps en
temps un export dans Réglages (le rappel de sauvegarde vous y invite).
