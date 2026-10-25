# Quran Mastery OS

Application mobile de suivi de mémorisation du Coran : révision espacée par hizb, apprentissage de nouveaux thumuns, agenda, statistiques. Tout fonctionne en local, sans compte ni serveur.

## Démarrage

1. Installer les dépendances : `npm install`
2. Lancer le serveur de développement : `npm run dev`
3. Lancer les tests : `npm test`
4. Construire l'application : `npm run build`

## Vos données

Les données restent sur le téléphone (`localStorage`, clé `qmos.state`) : aucun appel réseau, aucune donnée envoyée ailleurs. Dans l'onglet Réglages, vous pouvez exporter une sauvegarde (fichier) et la réimporter, par exemple pour changer d'appareil.

## Remplacer les thumuns approximatifs par le fichier exact

Le référentiel livré (`src/data/thumuns.json`) est approximatif pour les versets de départ des thumuns. Pour le remplacer par le fichier exact :

```
node scripts/import-thumuns.mjs <fichier.csv>
```

Colonnes attendues : `id,hizb,thumun,sourate,verset` (480 lignes, de `H01-T1` à `H60-T8`). En cas d'erreur, rien n'est écrit.

## Vérification de bout en bout

`node scripts/smoke.mjs` construit l'application, la lance en prévisualisation et parcourt les écrans en mode clair puis sombre (Playwright). Les captures sont enregistrées dans `smoke-shots/`.
