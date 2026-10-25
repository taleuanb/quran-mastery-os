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
