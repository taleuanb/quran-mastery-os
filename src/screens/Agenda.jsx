import React, { useMemo, useState } from 'react';
import { forecast } from '../domain/forecast';
import { streak, regularity, actualCycleDays } from '../domain/stats';
import { addDays, diffDays, weekday } from '../domain/dates';
import BottomSheet from '../ui/components/BottomSheet';
import HizbLabel from '../ui/components/HizbLabel';
import { t } from '../ui/strings.fr';

/** Nombre de jours de prévision au-delà duquel la navigation vers l'avenir s'arrête. */
const MAX_AHEAD = 120;

const pad2 = (n) => String(n).padStart(2, '0');
const dayNum = (day) => Number(day.slice(8, 10));
const hizbOf = (id) => Number(id.slice(1, 3));
const thumunOf = (id) => Number(id.slice(5));
const dowLabel = (day) => t(`agenda.dow.${weekday(day)}`);
const monLabel = (day) => t(`agenda.mon.${Number(day.slice(5, 7)) - 1}`);

/** Index du journal par jour : hizbs révisés (avec leurs sources) et thumuns appris. */
function indexJournal(journal) {
  const byDay = new Map();
  for (const e of journal) {
    let d = byDay.get(e.date);
    if (!d) {
      d = { hizbs: new Map(), learn: [] };
      byDay.set(e.date, d);
    }
    if (e.pilier === 'revision') {
      const h = hizbOf(e.thumunId);
      const s = d.hizbs.get(h) ?? { base: false, cible: false };
      if (e.source === 'cible') s.cible = true;
      else s.base = true;
      d.hizbs.set(h, s);
    } else if (e.pilier === 'hifdh' && !d.learn.includes(e.thumunId)) {
      d.learn.push(e.thumunId);
    }
  }
  return byDay;
}

/** Premier jour d'un mois décalé de `off` mois par rapport à celui de `today`. */
function monthStart(today, off) {
  const total = Number(today.slice(0, 4)) * 12 + (Number(today.slice(5, 7)) - 1) + off;
  return `${Math.floor(total / 12)}-${pad2((total % 12) + 1)}-01`;
}

function daysInMonth(first) {
  return new Date(Date.UTC(Number(first.slice(0, 4)), Number(first.slice(5, 7)), 0)).getUTCDate();
}

function Chips({ info, past }) {
  return (
    <>
      {info.hizbs.map((h) => (
        <i key={`${h.source}-${h.hizb}`} className={h.source === 'base' ? 'c b' : `c g${past ? ' solid' : ''}`}>
          {h.hizb}
        </i>
      ))}
      {info.learn.map((l) => (
        <i key={`l-${l.hizb}-${l.thumun}`} className="c l">{`${l.hizb}·${l.thumun}/8`}</i>
      ))}
      {info.learn.length === 0 && info.rest && <span className="rest">{t('agenda.rest')}</span>}
    </>
  );
}

function Status({ info }) {
  const { state } = info.status;
  if (state === 'done') return <span className="ok" role="img" aria-label={t('agenda.status.complete')}>✓</span>;
  if (state === 'neutral') return <span className="neutral" role="img" aria-label={t('agenda.status.neutral')}>–</span>;
  if (state === 'miss') return <span className="mi" role="img" aria-label={t('agenda.status.missed')}>✕</span>;
  if (state === 'part') return <span className="pt">{`${info.status.done}/${info.status.planned}`}</span>;
  if (state === 'today') {
    return (
      <>
        <span className="n">{`${info.status.done}/${info.status.planned}`}</span>
        <small>{t('agenda.status.done')}</small>
      </>
    );
  }
  return (
    <>
      <span className="n">{info.hizbs.length}</span>
      <small>{t('agenda.status.hizbs')}</small>
    </>
  );
}

const STATE_CLASS = { done: 'done', part: 'part', miss: 'miss', neutral: '', today: 'today', future: '' };

function statusText(info) {
  const { state } = info.status;
  if (state === 'done') return t('agenda.status.complete');
  if (state === 'part') return `${t('agenda.status.partial')} ${info.status.done}/${info.status.planned}`;
  if (state === 'miss') return t('agenda.status.missed');
  if (state === 'neutral') return t('agenda.status.neutral');
  if (state === 'today') return `${t('agenda.status.today')} ${info.status.done}/${info.status.planned}`;
  return t('agenda.status.future');
}

function dayName(day) {
  return `${t(`agenda.dowfull.${weekday(day)}`)} ${dayNum(day)} ${t(`agenda.month.${Number(day.slice(5, 7)) - 1}`)}`;
}

/**
 * Écran Agenda : semaine (7 jours à partir d'aujourd'hui) ou mois. Lecture seule.
 * @param {{state: import('../domain/types.js').AppState, dispatch?: Function, refs: import('../domain/types.js').Ref[], today: string}} props
 */
export default function Agenda({ state, refs, today }) {
  const [view, setView] = useState('week');
  const [weekOff, setWeekOff] = useState(0);
  const [monthOff, setMonthOff] = useState(0);
  const [selected, setSelected] = useState(null);
  const p = state.params;

  const weekFirst = addDays(today, weekOff * 7);
  const weekLast = addDays(weekFirst, 6);
  const monthFirst = monthStart(today, monthOff);
  const monthLen = daysInMonth(monthFirst);
  const monthLast = addDays(monthFirst, monthLen - 1);
  const lastShown = view === 'week' ? weekLast : monthLast;
  const horizon = Math.max(0, diffDays(lastShown, today) + 1);

  // Avant la première entrée de dayLog (ou sans aucune entrée), un jour passé n'est ni complet ni manqué.
  const firstLogDay = useMemo(
    () => Object.keys(state.dayLog).reduce((a, b) => (a < b ? a : b), null),
    [state.dayLog],
  );

  const plans = useMemo(
    () => (horizon > 0 ? forecast(state, refs, today, horizon, p) : []),
    [state, refs, today, horizon, p],
  );
  const journal = useMemo(() => indexJournal(state.journal), [state.journal]);

  /** Contenu d'un jour : passé lu dans dayLog et journal, aujourd'hui (dayLog[today] s'il existe) et futur dans la prévision. */
  function dayInfo(day) {
    const kind = day < today ? 'past' : day === today ? 'today' : 'future';
    const log = state.dayLog[day];
    const j = journal.get(day);
    const hizbs = [];
    const learn = [];
    const pushLearn = (id) => learn.push({ hizb: hizbOf(id), thumun: thumunOf(id) });

    // Aujourd'hui, l'enregistrement du jour (Ruling 24) fait foi : ses hizbs viennent de la prévision
    // (jour 0 = cet enregistrement), le journal ne sert qu'à l'apprentissage.
    const recorded = kind === 'today' && Array.isArray(log?.hizbs);
    if (kind !== 'future') {
      if (!recorded) for (const [hizb, s] of j?.hizbs ?? []) hizbs.push({ hizb, source: s.base ? 'base' : 'cible' });
      (j?.learn ?? []).forEach(pushLearn);
    }
    if (kind !== 'past') {
      const plan = plans[diffDays(day, today)];
      for (const h of plan?.hizbs ?? []) {
        if (!hizbs.some((x) => x.hizb === h.hizb)) hizbs.push({ hizb: h.hizb, source: h.source });
      }
      // Aujourd'hui, un thumun déjà appris remplace le suivant proposé par la prévision.
      if (learn.length === 0) (plan?.learn ?? []).forEach(pushLearn);
    }
    hizbs.sort((a, b) => (a.source === b.source ? 0 : a.source === 'base' ? -1 : 1));

    let status;
    if (kind === 'future') {
      status = { state: 'future' };
    } else if (kind === 'today') {
      status = { state: 'today', done: log?.done ?? 0, planned: log?.planned || hizbs.length };
    } else {
      const planned = log?.planned ?? 0;
      const done = log?.done ?? 0;
      let st = planned > 0 && done >= planned ? 'done' : done > 0 && done < planned ? 'part' : 'miss';
      if (firstLogDay === null || day < firstLogDay) st = 'neutral';
      status = { state: st, done, planned };
    }
    return { day, kind, hizbs, learn, status, rest: p.restDays.includes(weekday(day)) };
  }

  const openDay = (day) => setSelected(day);
  const selectedInfo = selected ? dayInfo(selected) : null;

  const canGoNextWeek = diffDays(addDays(weekLast, 7), today) <= MAX_AHEAD;
  const canGoNextMonth = diffDays(monthStart(today, monthOff + 1), today) <= MAX_AHEAD;

  function renderWeek() {
    const days = Array.from({ length: 7 }, (_, i) => dayInfo(addDays(weekFirst, i)));
    const hizbTotal = days.reduce((n, d) => n + d.hizbs.length, 0);
    const learnTotal = days.reduce((n, d) => n + d.learn.length, 0);
    const reg = Math.round(regularity(state.dayLog, today) * 100);
    const sameMonth = weekFirst.slice(5, 7) === weekLast.slice(5, 7);
    const label = `${dayNum(weekFirst)}${sameMonth ? '' : ` ${monLabel(weekFirst)}`} – ${dayNum(weekLast)} ${monLabel(weekLast)}`;
    return (
      <div className="agenda-view">
        <div className="wnav">
          <button type="button" className="ib" aria-label={t('agenda.nav.prevWeek')} onClick={() => setWeekOff(weekOff - 1)}>‹</button>
          <div className="lbl" aria-live="polite">{label}</div>
          <button type="button" className="ib" aria-label={t('agenda.nav.nextWeek')} disabled={!canGoNextWeek} onClick={() => setWeekOff(weekOff + 1)}>›</button>
        </div>
        <div className="card">
          <div className="strip">
            {days.map((d) => (
              <div className="sd" key={d.day}>
                <span>{t(`agenda.dowinit.${weekday(d.day)}`)}</span>
                <i className={STATE_CLASS[d.status.state]} role="img" aria-label={`${dayName(d.day)} : ${statusText(d)}`}>{dayNum(d.day)}</i>
              </div>
            ))}
          </div>
          <div className="sums">
            <div><b>{hizbTotal}</b><span>{t('agenda.sum.hizbs')}</span></div>
            <div><b>{learnTotal}</b><span>{t('agenda.sum.learn')}</span></div>
            <div><b>{`${reg}%`}</b><span>{t('agenda.sum.regularity')}</span></div>
          </div>
        </div>
        <div className="leg">
          <span><i className="c b">3</i>{t('agenda.leg.base')}</span>
          <span><i className="c g">25</i>{t('agenda.leg.cible')}</span>
          <span><i className="c l">26·1/8</i>{t('agenda.leg.learn')}</span>
        </div>
        <div className="days">
          {days.map((d) => (
            <button
              type="button"
              key={d.day}
              className={`day${d.kind === 'today' ? ' today' : ''}${d.kind === 'past' ? ' past' : ''}`}
              aria-label={t('agenda.row.label', {
                day: dayName(d.day),
                hizbs: d.hizbs.length,
                learn: d.learn.length,
                status: statusText(d),
              })}
              onClick={() => openDay(d.day)}
            >
              <div className="dl"><b>{dowLabel(d.day)}</b><span>{dayNum(d.day)}</span></div>
              <div className="dc"><Chips info={d} past={d.kind === 'past'} /></div>
              <div className="ds"><Status info={d} /></div>
            </button>
          ))}
        </div>
        <div className="note">{t('agenda.note')}</div>
      </div>
    );
  }

  function renderMonth() {
    const lead = (weekday(monthFirst) + 6) % 7; // lundi en premier
    const days = Array.from({ length: monthLen }, (_, i) => dayInfo(addDays(monthFirst, i)));
    const past = days.filter((d) => d.kind === 'past' && d.status.state !== 'neutral');
    const complete = past.filter((d) => d.status.state === 'done').length;
    const pct = past.length ? `${Math.round((complete / past.length) * 100)}%` : '—';
    const cycle = actualCycleDays(state, today);
    const monthIdx = Number(monthFirst.slice(5, 7)) - 1;
    const monthName = t(`agenda.month.${monthIdx}`);
    return (
      <div className="agenda-view">
        <div className="wnav">
          <button type="button" className="ib" aria-label={t('agenda.nav.prevMonth')} onClick={() => setMonthOff(monthOff - 1)}>‹</button>
          <div className="lbl" aria-live="polite">{`${monthName.charAt(0).toUpperCase()}${monthName.slice(1)} ${monthFirst.slice(0, 4)}`}</div>
          <button type="button" className="ib" aria-label={t('agenda.nav.nextMonth')} disabled={!canGoNextMonth} onClick={() => setMonthOff(monthOff + 1)}>›</button>
        </div>
        <div className="card">
          <div className="cal">
            {[1, 2, 3, 4, 5, 6, 0].map((w) => (
              <div className="wd" key={w}>{t(`agenda.dowinit.${w}`)}</div>
            ))}
            {Array.from({ length: lead }, (_, i) => (
              <div className="mc off" key={`off-${i}`} aria-hidden="true" />
            ))}
            {days.map((d) => {
              const { state: st } = d.status;
              let small = null;
              if (d.kind === 'future') {
                const load = Math.min(100, (d.hizbs.length / Math.max(1, p.dailyReviewHizbs)) * 100);
                small = <div className="ld" style={{ '--p': load }}><i /></div>;
              } else if (st === 'done') small = <small>✓</small>;
              else if (st === 'miss') small = <small>✕</small>;
              else if (st === 'neutral') small = null;
              else small = <small>{`${d.status.done}/${d.status.planned}`}</small>;
              return (
                <button
                  type="button"
                  key={d.day}
                  className={`mc ${STATE_CLASS[st]}`.trim()}
                  aria-label={t('agenda.row.label', {
                    day: dayName(d.day),
                    hizbs: d.hizbs.length,
                    learn: d.learn.length,
                    status: statusText(d),
                  })}
                  onClick={() => openDay(d.day)}
                >
                  <b>{dayNum(d.day)}</b>
                  {small}
                </button>
              );
            })}
          </div>
        </div>
        <div className="card">
          <div className="sums" style={{ margin: 0, padding: 0, border: 0 }}>
            <div><b>{t('agenda.unit.days', { n: streak(state.dayLog, today, p) })}</b><span>{t('agenda.sum.streak')}</span></div>
            <div><b>{pct}</b><span>{t('agenda.sum.complete')}</span></div>
            <div><b>{cycle == null ? '—' : t('agenda.unit.days', { n: cycle })}</b><span>{t('agenda.sum.cycle')}</span></div>
          </div>
        </div>
        <div className="leg">
          <span><i className="c mk done">✓</i>{t('agenda.leg.complete')}</span>
          <span><i className="c mk part">3/5</i>{t('agenda.leg.partial')}</span>
          <span><i className="c mk miss">✕</i>{t('agenda.leg.missed')}</span>
          <span>{t('agenda.leg.load')}</span>
        </div>
      </div>
    );
  }

  const learnSummary = (info) => {
    if (info.learn.length === 0) return t(info.rest ? 'agenda.sheet.learnNone' : 'agenda.sheet.learnZero');
    return info.learn.length === 1
      ? t('agenda.sheet.learnOne')
      : t('agenda.sheet.learnMany', { n: info.learn.length });
  };

  return (
    <section className="screen on agenda">
      <div className="top">
        <div>
          <h1>{t('screen.agenda.title')}</h1>
          <div className="sub">{t(view === 'week' ? 'agenda.sub.week' : 'agenda.sub.month')}</div>
        </div>
        <div className="vtog" role="group" aria-label={t('agenda.view.group')}>
          <button type="button" className={view === 'week' ? 'on' : ''} aria-pressed={view === 'week'} onClick={() => setView('week')}>
            {t('agenda.view.week')}
          </button>
          <button type="button" className={view === 'month' ? 'on' : ''} aria-pressed={view === 'month'} onClick={() => setView('month')}>
            {t('agenda.view.month')}
          </button>
        </div>
      </div>
      {view === 'week' ? renderWeek() : renderMonth()}
      <BottomSheet
        open={selectedInfo != null}
        title={selectedInfo ? dayName(selectedInfo.day) : ''}
        subtitle={
          selectedInfo
            ? `${t('agenda.sheet.summary', { hizbs: selectedInfo.hizbs.length, learn: learnSummary(selectedInfo) })}${selectedInfo.kind === 'future' ? ` · ${t('agenda.sheet.forecast')}` : ''}`
            : undefined
        }
        onClose={() => setSelected(null)}
      >
        {selectedInfo && (
          <div className="sdet-list">
            {selectedInfo.hizbs.length === 0 && selectedInfo.learn.length === 0 && (
              <div className="note">{t('agenda.sheet.empty')}</div>
            )}
            {selectedInfo.hizbs.map((h) => (
              <div className="row sdet" key={`${h.source}-${h.hizb}`}>
                <div className="grow"><HizbLabel hizb={h.hizb} /></div>
                <span className={`tag${h.source === 'cible' ? ' gold' : ''}`}>{t(`agenda.type.${h.source}`)}</span>
              </div>
            ))}
            {selectedInfo.learn.map((l) => (
              <div className="row sdet" key={`l-${l.hizb}-${l.thumun}`}>
                <div className="grow"><HizbLabel hizb={l.hizb} thumun={l.thumun} /></div>
                <span className="tag gold">{t('agenda.type.learn')}</span>
              </div>
            ))}
          </div>
        )}
      </BottomSheet>
    </section>
  );
}
