# Quran Mastery OS : moteur de révision (spécification)

Date : 2026-10-25 · Statut : à relire par l'utilisateur · Périmètre : v1, usage personnel, un seul téléphone.

## 1. Objectif

Suivre l'apprentissage et la révision du Coran, et dire chaque jour :

- combien apprendre et quel thumun apprendre ;
- quels hizbs réviser, selon l'historique des notes ;
- quelles parties sont mal apprises, pour les faire tourner plus souvent.

Critère de réussite : en ouvrant l'app, l'utilisateur voit en moins de 10 secondes sa liste du jour, la valide en quelques taps, et peut expliquer pourquoi chaque élément y figure.

## 2. Hors périmètre (v1)

Notion et tout backend, synchronisation multi-appareils, comptes, notifications push, tafsir et contenu textuel du Coran, correction de récitation.

## 3. Unités et vocabulaire

- **Thumun** : 1/8 de hizb. 480 au total, identifiés par `id` dans `atman_referentiel.json` (`J01-H01-T1/8`, avec `hizb`, `thumun`, `surah`, `ayah`). C'est l'unité de suivi.
- **Hizb** : 8 thumuns. C'est l'unité d'affichage et de quota.
- **Acquis** : thumun déjà mémorisé. **Non acquis** : pas encore mémorisé.
- Chaque thumun s'affiche toujours avec son hizb et sa sourate.

## 4. Modèle de données

Par thumun : `status` (`non_acquis` | `acquis`), `track` (`base` | `cible`), `score_history` (liste des notes datées, 5 dernières utilisées), `last_reviewed` (date), `interval_days`, `due` (date, pour le ciblé), `risk` (booléen), `fragile_initial` (booléen).

Journal : liste d'entrées `{date, thumun_id, pilier (hifdh|revision), score, source (base|cible|hifdh)}`.

Paramètres, tous modifiables dans l'app :

| Paramètre | Défaut |
|---|---|
| Quota de révision par jour (hizbs) | 5 |
| Nouveaux thumuns par jour | 1 |
| Jours sans apprentissage | jeudi, samedi |
| Fréquence de rotation de base | 2 fois par mois |
| Multiplicateurs note 5, 4, 3 | ×2,5, ×2, ×1,3 |
| Retour de la note 2 | 2 jours |
| Retour de la note 1 | 1 jour, thumun « à risque » |
| Intervalle de départ | 3 jours |
| Plafond d'intervalle | 30 jours |
| Plafond d'un thumun difficile | 7 jours |
| Seuil d'urgence (retard d'un thumun ciblé) | 3 jours |
| Heure de changement de jour | 04:00 |
| Jours de grâce de la série | 1 par semaine |

Le stockage est local (`localStorage`/IndexedDB), avec un champ `schema_version` et une migration à chaque changement de format.

## 5. Initialisation des acquis

Écran de réglages accessible dès le premier lancement.

1. Grille de 60 hizbs : un tap marque un hizb comme acquis (ses 8 thumuns passent `acquis`).
2. Toucher un hizb ouvre ses 8 thumuns : on décoche ceux qui ne sont pas acquis, et on peut marquer un thumun « fragile ».
3. Note de départ : 3 (thumun normal), 2 (fragile). Un thumun fragile entre directement dans le flux ciblé.
4. Les thumuns acquis non fragiles entrent dans la base, avec `last_reviewed` échelonné pour éviter qu'ils soient tous échus le même jour.

## 6. Deux flux de révision

**Base (rotation).** Parcourt tous les thumuns acquis, en prenant les plus anciennement révisés. Aucun intervalle par note. Objectif par défaut : chaque acquis revu 2 fois par mois.

**Ciblé.** Reçoit les thumuns mal appris : les fragiles, les notes de 1 à 3, les thumuns fraîchement appris. Les intervalles dépendent des notes (tableau section 7).

Un thumun appartient à un seul flux à la fois. Toute révision (base ou ciblée) met à jour `last_reviewed`, donc un thumun révisé en ciblé n'est pas redemandé en base le même cycle.

## 7. Règle du flux ciblé

| Note | Nouvel intervalle |
|---|---|
| 5 | intervalle × 2,5 |
| 4 | intervalle × 2 |
| 3 | intervalle × 1,3 |
| 2 | 2 jours |
| 1 | 1 jour, marqué `risk` |

Intervalle de départ 3 jours, plafond 30 jours.

**Niveau de difficulté**, calculé sur les 5 dernières notes :
- *difficile* : moyenne inférieure à 3, ou au moins 2 notes de 1 ou 2. L'intervalle est alors plafonné à 7 jours ;
- *facile* : au moins 3 notes de 4 ou 5 d'affilée ;
- *moyen* : tous les autres cas.

**Entrée dans le ciblé** : thumun fragile à l'initialisation, ou note de 1 à 3 lors d'une révision de base, ou thumun fraîchement appris.

**Sortie du ciblé vers la base** : les deux dernières notes sont d'au moins 4 et l'intervalle atteint au moins 7 jours.

## 8. Composition de la liste du jour

1. **Part de base** : `ceil(thumuns_acquis / 8 / (30 / fréquence_par_mois × ... ))`, soit `hizbs_acquis_équivalents / durée_du_cycle_en_jours`, avec une durée de cycle de 15 jours pour 2 fois par mois. Exemple : 25 hizbs acquis donnent environ 2 hizbs de base par jour.
2. **Part ciblée** : tout le reste du quota. Avec 5 hizbs et 25 hizbs acquis, environ 3 hizbs pour le ciblé.
3. Les thumuns ciblés échus sont triés par urgence : jours de retard × poids de difficulté (difficile > moyen > facile).
4. **Regroupement par hizb** : la liste du jour est présentée hizb par hizb (au plus le quota). Un thumun ciblé d'un hizb déjà dans la liste ne consomme pas de place supplémentaire. Chaque hizb signale ses thumuns ciblés (« réviser surtout le thumun 3 »).
5. **Urgence** : un thumun ciblé de note 1 ou 2 en retard de plus de 3 jours passe devant la base.
6. Si la liste ciblée est vide, le quota revient à la base.

## 9. Apprentissage du jour

- Quota réglable (1 nouveau thumun par jour par défaut), aucun apprentissage les jours sans apprentissage.
- Le thumun proposé vient de la liste d'apprentissage ordonnée par l'utilisateur. Si elle est vide : le thumun non acquis qui suit le dernier appris.
- Après apprentissage, l'utilisateur note de 1 à 5. Le thumun devient acquis et entre dans le flux ciblé.

## 10. Notation

- **Base** : un tap par hizb vaut la note 4 pour ses 8 thumuns. L'utilisateur touche ensuite les thumuns qui ont posé problème pour leur donner 1, 2 ou 3.
- **Ciblé et apprentissage** : note de 1 à 5 par thumun.

## 11. Jours manqués

Pas de rattrapage : le quota reste inchangé. La base se décale (le plus anciennement révisé passe en premier). Le seuil d'urgence protège les thumuns faibles. L'écran affiche la durée réelle du cycle de base face à l'objectif. Un jour est « validé » quand toute la liste du jour est cochée. La série tolère 1 jour de grâce par semaine.

## 12. Sauvegarde

Export et import d'un fichier JSON complet (données, journal, paramètres, `schema_version`). Un rappel apparaît si la dernière sauvegarde date de plus de 7 jours.

## 13. Écrans

1. **Aujourd'hui** : apprentissage, liste hizb par hizb, saisie des notes.
2. **Initialisation des acquis** : grille de hizbs, détail par thumun.
3. **Statistiques de rotation** : répartition facile/moyen/difficile, les 10 thumuns les plus fragiles, durée du cycle de base.
4. **Paramètres** : tous ceux de la section 4, sauvegarde et restauration.

## 14. Trous fonctionnels trouvés en relisant, avec la décision proposée

1. **Erreur de saisie** : prévoir l'annulation de la dernière saisie et la modification d'une entrée du journal. Sans cela, un tap raté fausse la détection de difficulté.
2. **Thumun oublié** : permettre de marquer un acquis comme « oublié » (retour dans le ciblé avec la note 1) et de remettre un thumun en « non acquis ».
3. **Double comptage** : une révision ciblée compte aussi pour la base (voir section 6).
4. **Changement de jour** : à 04:00 et pas à minuit, pour ne pas couper une révision tardive.
5. **Évolution du référentiel** : le référentiel est figé (480 thumuns) et ses `id` servent de clés stables. Ne jamais les renommer.
6. **Premier jour** : l'initialisation étale `last_reviewed`, sinon les 200 thumuns seraient tous échus le même jour.
7. **Volume ciblé trop grand** : si le ciblé dépasse le quota plusieurs jours de suite, l'app l'indique (« N thumuns faibles en attente ») au lieu de les masquer.

## 15. Questions ouvertes pour l'utilisateur

1. **Rappel quotidien** : une vraie notification sur le téléphone nécessite une PWA installée, avec des limites selon le navigateur. En v1, le « rappel » est ce que l'app affiche à l'ouverture. Voulez-vous tenter les notifications locales en v2 ?
2. **Khatma et lecture (Tilawah)** : l'interface actuelle a une jauge de khatma et un bouton « enregistrer la lecture de 5 ahzab ». Je propose de les garder comme simple compteur, sans lien avec le moteur. D'accord ?
3. **Types de jour d'apprentissage** (préparation, mémorisation, consolidation du plan actuel) : je propose de les supprimer en v1 au profit du quota réglable. D'accord ?

## 16. Tests attendus

Le moteur est une fonction pure (état + date + paramètres → liste du jour), testée sur des cas simulés :
- initialisation et étalement des dates ;
- chaque note et chaque seuil de la section 7 ;
- calcul de la part de base pour 25 et pour 60 hizbs ;
- absence de plusieurs jours, urgence, ciblé plus grand que le quota ;
- annulation d'une saisie, export puis import.
