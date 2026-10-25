// Les jours sont des chaînes 'YYYY-MM-DD'. Tous les calculs se font en UTC
// sur cette chaîne pour éviter les décalages liés à l'heure d'été.

const MS_PER_DAY = 86400000;

const pad = (n) => String(n).padStart(2, '0');

function toUTC(day) {
  const [y, m, d] = day.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

function fromUTC(ms) {
  const dt = new Date(ms);
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

/** Jour logique (heure locale) : avant `rolloverHour`, on est encore la veille. */
export function dayKey(now, rolloverHour) {
  const shifted = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() - rolloverHour, now.getMinutes());
  return `${shifted.getFullYear()}-${pad(shifted.getMonth() + 1)}-${pad(shifted.getDate())}`;
}

export function addDays(day, n) {
  return fromUTC(toUTC(day) + n * MS_PER_DAY);
}

/** a - b en jours. */
export function diffDays(a, b) {
  return Math.round((toUTC(a) - toUTC(b)) / MS_PER_DAY);
}

/** 0 = dimanche. */
export function weekday(day) {
  return new Date(toUTC(day)).getUTCDay();
}
