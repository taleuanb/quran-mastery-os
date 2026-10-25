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

  'acquis.subtitle': 'Ce que vous avez déjà mémorisé',
  'acquis.ring': 'Part des 480 thumuns acquis : {pct} %',
  'acquis.hizbs': '{n} hizbs acquis',
  'acquis.thumuns': '{n} thumuns sur 480',
  'acquis.partials': '{p} partiels · {f} fragiles',
  'acquis.search.placeholder': 'Hizb, sourate ou début de verset',
  'acquis.search.label': 'Rechercher',
  'acquis.filters': 'Filtrer les hizbs',
  'acquis.filter.all': 'Tous',
  'acquis.filter.full': 'Acquis',
  'acquis.filter.part': 'Partiels',
  'acquis.filter.fr': 'Fragiles',
  'acquis.filter.none': 'Non acquis',
  'acquis.selmode.off': 'Mode sélection : off',
  'acquis.selmode.on': 'Mode sélection : on',
  'acquis.quick': 'Hizbs 1 à 12',
  'acquis.quick.done': 'Hizbs 1 à 12 marqués acquis',
  'acquis.juz': 'Juz {n}',
  'acquis.juz.ar': 'جزء {n}',
  'acquis.badge.full': 'Acquis',
  'acquis.badge.part': '{n}/8',
  'acquis.badge.none': 'À apprendre',
  'acquis.badge.fragile.one': '{n} fragile',
  'acquis.badge.fragile.many': '{n} fragiles',
  'acquis.empty': 'Aucun hizb ne correspond.',
  'acquis.note': "Touchez un hizb pour l'acquérir ou le retirer. Appui long : détail des 8 thumuns avec « fragile ». Mode sélection : glissez sur plusieurs hizbs, puis appliquez.",
  'acquis.bulk.label': 'Actions sur la sélection',
  'acquis.bulk.one': '{n} sélectionné',
  'acquis.bulk.many': '{n} sélectionnés',
  'acquis.bulk.add': 'Acquis',
  'acquis.bulk.remove': 'Retirer',
  'acquis.bulk.clear': 'Vider la sélection',
  'acquis.sheet.title': 'Hizb {hizb}',
  'acquis.sheet.subtitle': 'Juz {juz}',
  'acquis.sheet.thumun': 'Thumun {n} sur 8',
  'acquis.state.0': 'Non',
  'acquis.state.1': 'Acquis',
  'acquis.state.2': 'Fragile',

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
