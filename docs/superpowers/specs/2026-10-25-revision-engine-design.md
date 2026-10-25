# Quran Mastery OS : moteur de révision et interface (spécification)

Date : 2026-10-25 · Statut : version finale, à relire par l'utilisateur · Périmètre : v1, usage personnel, un seul téléphone.

## 1. Objectif

Suivre l'apprentissage et la révision du Coran, et dire chaque jour :

- combien apprendre et quel thumun apprendre ;
- quels hizbs réviser, selon l'historique des notes ;
- quelles parties sont mal apprises, pour les faire tourner plus souvent.

Critère de réussite : en ouvrant l'app, l'utilisateur voit en moins de 10 secondes sa liste du jour, la valide en quelques taps, et peut expliquer pourquoi chaque élément y figure.

## 2. Hors périmètre (v1)

Notion et tout backend, synchronisation multi-appareils, comptes, notifications push, tafsir et contenu textuel du Coran, correction de récitation.

## 3. Unités et vocabulaire

- **Thumun** : 1/8 de hizb. 480 au total, identifiés par `H01-T1` à `H60-T8` (hizb, numéro de thumun). C'est l'unité de suivi. Voir la section 18 pour l'origine des données.
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

1. **Part de base** : `ceil(hizbs_acquis_équivalents / durée_du_cycle_en_jours)`, où `hizbs_acquis_équivalents = thumuns_acquis / 8` et la durée du cycle est de 15 jours pour 2 fois par mois (30 jours pour 1 fois). Exemple : 25 hizbs acquis donnent `ceil(25 / 15) = 2` hizbs de base par jour.
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

Cinq écrans, détaillés en section 17 : Aujourd'hui, Agenda, Acquis, Statistiques, Réglages.

## 14. Trous fonctionnels trouvés en relisant, avec la décision proposée

1. **Erreur de saisie** : prévoir l'annulation de la dernière saisie et la modification d'une entrée du journal. Sans cela, un tap raté fausse la détection de difficulté.
2. **Thumun oublié** : permettre de marquer un acquis comme « oublié » (retour dans le ciblé avec la note 1) et de remettre un thumun en « non acquis ».
3. **Double comptage** : une révision ciblée compte aussi pour la base (voir section 6).
4. **Changement de jour** : à 04:00 et pas à minuit, pour ne pas couper une révision tardive.
5. **Évolution du référentiel** : le référentiel est figé (480 thumuns) et ses `id` servent de clés stables. Ne jamais les renommer.
6. **Premier jour** : l'initialisation étale `last_reviewed`, sinon les 200 thumuns seraient tous échus le même jour.
7. **Volume ciblé trop grand** : si le ciblé dépasse le quota plusieurs jours de suite, l'app l'indique (« N thumuns faibles en attente ») au lieu de les masquer.

## 15. Décisions prises sur les questions ouvertes

1. **Rappel quotidien** : en v1, le rappel est ce que l'app affiche à l'ouverture (écran Aujourd'hui, point doré sur l'onglet tant qu'il reste des hizbs). Pas de notification push. Notifications locales envisagées en v2.
2. **Khatma et lecture (Tilawah)** : simple compteur, sans lien avec le moteur.
3. **Types de jour d'apprentissage** (préparation, mémorisation, consolidation) : supprimés en v1, remplacés par le quota réglable et les jours de repos.

## 16. Tests attendus

Le moteur est une fonction pure (état + date + paramètres → liste du jour), testée sur des cas simulés :
- initialisation et étalement des dates ;
- chaque note et chaque seuil de la section 7 ;
- calcul de la part de base pour 25 et pour 60 hizbs ;
- absence de plusieurs jours, urgence, ciblé plus grand que le quota ;
- annulation d'une saisie, export puis import.

## 17. Interface (UX/UI)

Maquette interactive de référence : `docs/design/maquette.html` (données d'exemple, aucun enregistrement).

### 17.1 Principes

- Mobile d'abord, une main, colonne unique de 440 px au plus. Cibles tactiles d'au moins 44 px.
- Le cas courant se fait en un tap. Le détail est derrière un second geste (feuille du bas, appui long).
- Chaque saisie est annulable pendant quelques secondes (bandeau « Annuler »).
- Interface en **français** (sens gauche-droite). Contenu coranique en **arabe** (police Amiri) : noms de hizb, sourates, début de verset. Tous les libellés sont dans un seul fichier de textes pour permettre une version arabe plus tard.
- Partout où un hizb ou un thumun apparaît dans un écran de travail, son nom arabe, sa sourate et son numéro (« الثمن 6/8 ») sont visibles. Seul l'Agenda n'affiche que des numéros, le détail s'ouvrant au toucher.

### 17.2 Système visuel

Mode clair et sombre automatiques (réglage du téléphone), mêmes jetons de couleur déclinés dans les deux modes.

| Jeton | Clair | Sombre |
|---|---|---|
| Fond | `#F7F3EA` | `#0E1613` |
| Surface | `#FFFFFF` | `#16211D` |
| Texte | `#1B2420` | `#E9EFEA` |
| Accent (base, actions) | `#1F6B4F` | `#4FC59A` |
| Or (ciblé, repères) | `#A9772B` | `#D9AE62` |

Échelle des notes 1 à 5 : rouge brique, orange, ocre, vert, bleu. Le chiffre est toujours écrit dans la pastille (la couleur ne porte jamais seule l'information). Polices : Bricolage Grotesque (titres et chiffres), Figtree (texte), Amiri (arabe). Respect de `prefers-reduced-motion`. Contraste texte/fond d'au moins 4,5:1.

### 17.3 Navigation

Barre d'onglets en bas, cinq entrées : Aujourd'hui, Agenda, Acquis, Stats, Réglages. Zone sûre en bas respectée. Un point doré sur « Aujourd'hui » signale des hizbs restants.

### 17.4 Aujourd'hui

- En-tête : date, série (avec jour de grâce).
- Anneau de progression du jour (hizbs faits sur hizbs prévus) et la répartition base/ciblé.
- Carte **Apprentissage** : thumun du jour (hizb, sourate, thumun, début de verset), bouton « J'ai appris ce thumun », puis note de 1 à 5.
- **Liste de cartes** par hizb (base et ciblé mélangés) : numéro, nom arabe, sourate, badge base/ciblé, thumuns à surveiller. Le bouton ✓ valide le hizb (note 4 pour ses 8 thumuns). Toucher la carte ouvre la **feuille du bas** : 8 lignes de thumuns, chacune avec 5 pastilles de note.
- Bandeau « Annuler » après chaque validation.

### 17.5 Agenda

Deux vues, commutables (Semaine par défaut).

**Semaine** (7 jours à partir d'aujourd'hui, navigation par semaine) :
- Bande des 7 jours (fait, partiel, manqué, aujourd'hui, à venir), totaux (hizbs, thumuns à apprendre) et régularité sur 30 jours.
- Une ligne par jour avec uniquement des numéros : hizbs de **base** (plein, ferme), hizbs **ciblés** (pointillé or, prévision), thumun à apprendre (`26·2/8`), ou « repos apprentissage ».
- Statut à droite : ✓, ✕, « 3/5 », progression pour aujourd'hui, nombre de hizbs prévus pour l'avenir.
- Toucher un jour ouvre le détail (noms, sourates, type).
- Règle de prévision : la base est une rotation ordonnée, donc ferme. Le ciblé dépend des notes futures, donc toujours présenté comme prévision, avec une mention en bas de l'écran.

**Mois** : calendrier en grille (lundi en premier), jours passés colorés (complet, partiel, manqué), aujourd'hui cerclé, barre de charge prévue sur les jours à venir. Dessous : série en cours, taux de jours complets, durée du cycle de base. Navigation de mois en mois.

### 17.6 Acquis

- En-tête : anneau (part des 480 thumuns acquis), hizbs acquis, partiels et fragiles.
- Recherche par numéro de hizb, nom, sourate ou début de verset. Filtres : Tous, Acquis, Partiels, Fragiles, Non acquis.
- Grille de 60 hizbs groupée par juz (barre de progression par juz). Chaque carte : numéro, nom arabe, sourate, badge d'état, jauge de remplissage.
- Un tap acquiert ou retire un hizb entier. Un **appui long** ouvre le détail des 8 thumuns avec trois états : Non, Acquis, Fragile.
- **Mode sélection** (bouton) : glissement sur plusieurs hizbs, puis action groupée (Acquis ou Retirer) dans une barre d'actions. Hors de ce mode, le défilement reste libre.
- Raccourci « Hizbs 1 à 12 » pour la saisie initiale.

### 17.7 Statistiques

Trois blocs : chiffres clés (cycle de base, thumuns difficiles, série), répartition facile/moyen/difficile, carte du Coran (60 hizbs colorés par solidité ou par ancienneté, commutable), puis les 10 thumuns les plus fragiles (note, tendance, hizb, nom, sourate).

### 17.8 Réglages

Quotas (hizbs de révision par jour, nouveaux thumuns par jour), fréquence de rotation de base, plafond d'intervalle, jours de repos et tous les paramètres de la section 4. Sauvegarde : export et import JSON, date de la dernière sauvegarde.

## 18. Données de référence : les 480 thumuns

Constat : `atman_referentiel.json` n'est correct que pour ses 8 premières lignes, qui correspondent en réalité à des quarts de hizb (1:1, 2:26, 2:44, 2:60, 2:75, 2:92, 2:106, 2:124). Les 472 autres lignes contiennent « البقرة, verset 1 ». `classfication coran.csv` contient les 60 noms de hizbs et leur sourate de départ, qui sont utilisables.

Décision :
1. Le modèle de données garde le hizb et le numéro de thumun comme identifiants stables (`H01-T1` à `H60-T8`).
2. La sourate affichée pour un hizb vient de `classfication coran.csv`.
3. Les 240 quarts de hizb proviennent d'une source fiable (Tanzil ou Tarteel QUL). Chaque quart est coupé en deux thumuns au verset le plus proche de la moitié du texte. Ces débuts de thumun sont marqués « approximatifs » dans les données.
4. L'utilisateur fournira le fichier exact des thumuns. Il remplace l'approximation par un import unique (colonnes : id, hizb, thumun, sourate, verset de départ). Aucun autre changement de code n'est nécessaire, car les identifiants restent les mêmes.
5. Le référentiel actuel `atman_referentiel.json` est remplacé, pas corrigé à la main.
