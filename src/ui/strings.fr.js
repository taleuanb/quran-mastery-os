// Tous les libellés visibles de l'interface (français). Le contenu coranique
// (noms de hizb, sourates) reste en arabe ; seuls les gabarits sont ici.
export const STRINGS = {
  'app.title': 'Quran Mastery OS',

  'tab.today': "Aujourd'hui",
  'tab.agenda': 'Agenda',
  'tab.acquis': 'Acquis',
  'tab.stats': 'Stats',
  'tab.settings': 'Réglages',
  'tab.nav': 'Navigation principale',
  'tab.pending': 'Hizbs restants à réviser',

  'screen.today.title': "Aujourd'hui",
  'screen.agenda.title': 'Agenda',
  'screen.acquis.title': 'Acquis',
  'screen.stats.title': 'Statistiques',
  'screen.settings.title': 'Réglages',

  'common.cancel': 'Annuler',
  'common.close': 'Fermer',
  'common.validate': 'Valider',
  'common.save': 'Enregistrer',

  'toast.validated': 'Hizb {hizb} validé',

  'today.streak': '{n} j',
  'today.streakLabel': 'série',
  'today.progress': 'Progression du jour',
  'today.toReview': '{n} hizbs à réviser',
  'today.mix': '{base} de base · {cible} ciblés',
  'today.allDone': 'Révision du jour terminée',
  'today.learnSection': 'Apprentissage',
  'today.learnCount': '{n} thumun',
  'today.learnNew': 'Nouveau',
  'today.learned': 'Appris',
  'today.learnButton': "J'ai appris ce thumun",
  'today.learnScore': 'Quelle note pour ce thumun ?',
  'today.verse': 'سورة {surah} · آية {ayah}',
  'today.reviewSection': 'Révision',
  'today.reviewHint': 'touchez ✓ si tout va bien',
  'today.base': 'base',
  'today.cible': 'ciblé',
  'today.done': 'Fait',
  'today.focus': 'Surtout :',
  'today.and': 'et',
  'today.check': 'Hizb {hizb} : tout va bien',
  'today.open': 'Noter les thumuns du hizb {hizb}',
  'today.sheetTitle': 'Hizb {hizb}',
  'today.sheetSubtitle': 'Notez chaque thumun (4 par défaut)',
  'today.notAcquired': 'Non acquis',
  'today.overflow': '{n} thumuns faibles en attente',
  'today.backup': "Pensez à sauvegarder vos données.",
  'today.backupButton': 'Sauvegarder',
  'today.emptyTitle': 'Commencez par indiquer vos acquis',
  'today.emptyButton': 'Indiquer mes acquis',

  'score.group': 'Note de 1 à 5',

  'hizb.short': 'HIZB',
  'hizb.surah': 'سورة {name}',
  'hizb.thumun': 'الثمن {n}/8',
};

/**
 * Traduit une clé en remplaçant les marqueurs {nom} par les valeurs de `vars`.
 * Une clé inconnue est renvoyée telle quelle (visible en développement).
 * @param {string} key
 * @param {Record<string, string|number>} [vars]
 * @returns {string}
 */
export function t(key, vars = {}) {
  const template = STRINGS[key] ?? key;
  return template.replace(/\{(\w+)\}/g, (m, name) =>
    name in vars ? String(vars[name]) : m,
  );
}
