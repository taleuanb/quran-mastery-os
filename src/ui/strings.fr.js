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

  'agenda.sub.week': "Votre semaine en un coup d'œil",
  'agenda.sub.month': "Votre mois en un coup d'œil",
  'agenda.view.group': 'Affichage',
  'agenda.view.week': 'Semaine',
  'agenda.view.month': 'Mois',
  'agenda.nav.prevWeek': 'Semaine précédente',
  'agenda.nav.nextWeek': 'Semaine suivante',
  'agenda.nav.prevMonth': 'Mois précédent',
  'agenda.nav.nextMonth': 'Mois suivant',
  'agenda.sum.hizbs': 'hizbs sur 7 jours',
  'agenda.sum.learn': 'thumuns à apprendre',
  'agenda.sum.regularity': 'régularité (30 j)',
  'agenda.sum.streak': 'série en cours',
  'agenda.sum.complete': 'jours complets',
  'agenda.sum.cycle': 'cycle de base',
  'agenda.unit.days': '{n} j',
  'agenda.leg.base': 'base, ferme',
  'agenda.leg.cible': 'ciblé, prévision',
  'agenda.leg.learn': 'apprentissage',
  'agenda.leg.complete': 'complet',
  'agenda.leg.partial': 'partiel',
  'agenda.leg.missed': 'manqué',
  'agenda.leg.load': 'barre = charge prévue',
  'agenda.rest': 'repos apprentissage',
  'agenda.note': "Le ciblé dépend de vos notes : il peut changer d'ici là. La base ne bouge pas.",
  'agenda.status.complete': 'Complet',
  'agenda.status.partial': 'Partiel',
  'agenda.status.missed': 'Manqué',
  'agenda.status.done': 'faits',
  'agenda.status.hizbs': 'hizbs',
  'agenda.status.today': "Aujourd'hui",
  'agenda.status.future': 'Prévision',
  'agenda.row.label': '{day} : {hizbs} hizbs, {learn} à apprendre, {status}',
  'agenda.sheet.summary': '{hizbs} hizbs · {learn}',
  'agenda.sheet.learnOne': '1 thumun à apprendre',
  'agenda.sheet.learnMany': '{n} thumuns à apprendre',
  'agenda.sheet.learnNone': "repos d'apprentissage",
  'agenda.sheet.forecast': 'prévision',
  'agenda.sheet.empty': "Rien de prévu ce jour-là.",
  'agenda.type.base': 'base',
  'agenda.type.cible': 'ciblé',
  'agenda.type.learn': 'apprendre',
  'agenda.dow.0': 'Dim', 'agenda.dow.1': 'Lun', 'agenda.dow.2': 'Mar', 'agenda.dow.3': 'Mer',
  'agenda.dow.4': 'Jeu', 'agenda.dow.5': 'Ven', 'agenda.dow.6': 'Sam',
  'agenda.dowfull.0': 'Dimanche', 'agenda.dowfull.1': 'Lundi', 'agenda.dowfull.2': 'Mardi', 'agenda.dowfull.3': 'Mercredi',
  'agenda.dowfull.4': 'Jeudi', 'agenda.dowfull.5': 'Vendredi', 'agenda.dowfull.6': 'Samedi',
  'agenda.dowinit.0': 'D', 'agenda.dowinit.1': 'L', 'agenda.dowinit.2': 'M', 'agenda.dowinit.3': 'M',
  'agenda.dowinit.4': 'J', 'agenda.dowinit.5': 'V', 'agenda.dowinit.6': 'S',
  'agenda.month.0': 'janvier', 'agenda.month.1': 'février', 'agenda.month.2': 'mars', 'agenda.month.3': 'avril',
  'agenda.month.4': 'mai', 'agenda.month.5': 'juin', 'agenda.month.6': 'juillet', 'agenda.month.7': 'août',
  'agenda.month.8': 'septembre', 'agenda.month.9': 'octobre', 'agenda.month.10': 'novembre', 'agenda.month.11': 'décembre',
  'agenda.mon.0': 'janv.', 'agenda.mon.1': 'févr.', 'agenda.mon.2': 'mars', 'agenda.mon.3': 'avr.',
  'agenda.mon.4': 'mai', 'agenda.mon.5': 'juin', 'agenda.mon.6': 'juil.', 'agenda.mon.7': 'août',
  'agenda.mon.8': 'sept.', 'agenda.mon.9': 'oct.', 'agenda.mon.10': 'nov.', 'agenda.mon.11': 'déc.',

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
