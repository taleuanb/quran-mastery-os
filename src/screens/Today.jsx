import React, { useEffect, useRef, useState } from 'react';
import { buildDailyPlan } from '../domain/plan';
import { streak } from '../domain/stats';
import { backupDue } from '../store/storage';
import BottomSheet from '../ui/components/BottomSheet';
import HizbLabel from '../ui/components/HizbLabel';
import ScorePills from '../ui/components/ScorePills';
import Toast from '../ui/components/Toast';
import { t } from '../ui/strings.fr';

const DEFAULT_SCORE = 4;
const pad2 = (n) => String(n).padStart(2, '0');
const thumunId = (hizb, n) => `H${pad2(hizb)}-T${n}`;
const hizbOf = (id) => Number(id.slice(1, 3));

/** « Dimanche 25 octobre » (le jour est une chaîne locale YYYY-MM-DD, lue en UTC pour éviter tout décalage). */
function formatDay(day) {
  const s = new Date(`${day}T12:00:00Z`).toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC',
  });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Libellé « Surtout : الثمن 2/8 et 5/8 » à partir des ids ciblés d'un hizb. */
function Focus({ ids }) {
  return (
    <div className="hint">
      {t('today.focus')}{' '}
      {ids.map((id, i) => (
        <React.Fragment key={id}>
          {i > 0 && ` ${t('today.and')} `}
          <span className="ar" dir="rtl">{t('hizb.thumun', { n: Number(id.slice(-1)) })}</span>
        </React.Fragment>
      ))}
    </div>
  );
}

/** Feuille de notation d'un hizb : 8 thumuns, 4 par défaut, non acquis désactivés. */
function ReviewSheet({ hizb, state, onClose, onValidate }) {
  const [values, setValues] = useState({});
  const rows = Array.from({ length: 8 }, (_, i) => {
    const id = thumunId(hizb, i + 1);
    return { id, n: i + 1, acquired: state.thumuns[id]?.status === 'acquis' };
  });
  const valueOf = (id) => values[id] ?? DEFAULT_SCORE;
  const validate = () => {
    const overrides = {};
    for (const r of rows) if (r.acquired && valueOf(r.id) !== DEFAULT_SCORE) overrides[r.id] = valueOf(r.id);
    onValidate(overrides);
  };
  return (
    <BottomSheet
      open
      title={t('today.sheetTitle', { hizb })}
      subtitle={t('today.sheetSubtitle')}
      onClose={onClose}
      actions={(
        <>
          <button type="button" className="btn ghost grow" onClick={onClose}>{t('common.cancel')}</button>
          <button type="button" className="btn grow" onClick={validate}>{t('common.validate')}</button>
        </>
      )}
    >
      {rows.map((r) => (
        <div className="trow" key={r.id}>
          <div className="lab">
            <span className="ar" dir="rtl">{t('hizb.thumun', { n: r.n })}</span>
            {!r.acquired && <div>{t('today.notAcquired')}</div>}
          </div>
          <fieldset className="plain" disabled={!r.acquired}>
            <ScorePills
              size="sm"
              value={r.acquired ? valueOf(r.id) : null}
              onChange={(score) => setValues((v) => ({ ...v, [r.id]: score }))}
            />
          </fieldset>
        </div>
      ))}
    </BottomSheet>
  );
}

/** Carte d'apprentissage d'un thumun. */
function LearnCard({ id, ref_, learned, onLearn }) {
  const [scoring, setScoring] = useState(false);
  const hizb = hizbOf(id);
  return (
    <div className="card learn">
      <div className="row">
        <span className="tag gold">{learned ? t('today.learned') : t('today.learnNew')}</span>
        <span className="sub ar" dir="rtl">{t('today.verse', { surah: ref_?.surah ?? '', ayah: ref_?.ayah ?? '' })}</span>
      </div>
      <HizbLabel hizb={hizb} thumun={Number(id.slice(-1))} showName showSurah={false} />
      {!learned && !scoring && (
        <button type="button" className="btn" onClick={() => setScoring(true)}>{t('today.learnButton')}</button>
      )}
      {!learned && scoring && (
        <>
          <div className="sub">{t('today.learnScore')}</div>
          <ScorePills value={null} onChange={(score) => { onLearn(id, score); setScoring(false); }} />
        </>
      )}
    </div>
  );
}

/**
 * Écran « Aujourd'hui » : série, progression, apprentissage et cartes de révision.
 * Le plan est figé tant que le jour, les thumuns acquis et les paramètres ne changent pas
 * (le plan recalculé après une validation remplacerait sinon les hizbs faits par de nouveaux) ;
 * les hizbs déjà relus aujourd'hui (journal) sont réintégrés comme faits. Le toast « Annuler »
 * ne concerne que la dernière action notée depuis l'écran.
 */
export default function Today({ state, dispatch, refs, today, onNavigate }) {
  // Plan figé tant que le jour, l'ensemble des acquis et les paramètres ne changent pas.
  const acquisIds = Object.keys(state.thumuns).filter((id) => state.thumuns[id].status === 'acquis').sort();
  const planKey = `${today}|${acquisIds.join(',')}|${JSON.stringify(state.params)}`;
  const snap = useRef(null);
  if (!snap.current || snap.current.key !== planKey) {
    snap.current = { key: planKey, plan: buildDailyPlan(state, refs, today, state.params) };
  }
  const plan = snap.current.plan;
  const prevOrder = useRef([]);

  // Faits du jour, d'après le journal.
  const doneSource = new Map();
  const learnedToday = [];
  for (const e of state.journal) {
    if (e.date !== today) continue;
    if (e.pilier === 'revision') {
      if (!doneSource.has(hizbOf(e.thumunId))) doneSource.set(hizbOf(e.thumunId), e.source === 'cible' ? 'cible' : 'base');
    } else if (e.pilier === 'hifdh' && !learnedToday.includes(e.thumunId)) {
      learnedToday.push(e.thumunId);
    }
  }

  // Liste = plan frais (hors faits, borné à sa taille moins les faits) + hizbs faits réintégrés
  // à leur position précédente quand elle est connue.
  const inPlan = new Map(plan.hizbs.map((h) => [h.hizb, h]));
  const undone = plan.hizbs.filter((h) => !doneSource.has(h.hizb))
    .slice(0, Math.max(0, plan.hizbs.length - doneSource.size));
  const doneCards = [...doneSource]
    .map(([hizb, source]) => inPlan.get(hizb) ?? { hizb, source, focus: [], urgent: false })
    .sort((x, y) => prevOrder.current.indexOf(x.hizb) - prevOrder.current.indexOf(y.hizb));
  const cards = [...undone];
  for (const d of doneCards) {
    const at = prevOrder.current.indexOf(d.hizb);
    cards.splice(at < 0 ? 0 : Math.min(at, cards.length), 0, d);
  }
  prevOrder.current = cards.map((c) => c.hizb);
  const doneCount = doneCards.length;
  const total = cards.length;

  const learnIds = [...learnedToday, ...plan.learn.filter((id) => !learnedToday.includes(id))]
    .slice(0, Math.max(plan.learn.length, learnedToday.length));

  const hasAcquis = Object.values(state.thumuns).some((th) => th.status === 'acquis');

  useEffect(() => {
    if ((state.dayLog[today]?.planned ?? 0) !== total) {
      dispatch({ type: 'SET_PLANNED', day: today, planned: total });
    }
  }, [state.dayLog, today, total, dispatch]);

  const [sheetHizb, setSheetHizb] = useState(null);
  const [toast, setToast] = useState(null);

  const review = (hizb, overrides) => {
    dispatch({ type: 'REVIEW_HIZB', hizb, day: today, overrides });
    setToast({ n: (toast?.n ?? 0) + 1, message: t('toast.validated', { hizb }) });
  };
  const undo = () => { dispatch({ type: 'UNDO' }); setToast(null); };

  const streakN = streak(state.dayLog, today, state.params);
  const baseN = cards.filter((c) => c.source === 'base').length;
  const refOf = (id) => refs.find((r) => r.id === id);

  return (
    <section className="screen on" aria-labelledby="today-title">
      <div className="top">
        <div>
          <h1 id="today-title">{t('screen.today.title')}</h1>
          <div className="sub">{formatDay(today)}</div>
        </div>
        <div className="streak"><b>{t('today.streak', { n: streakN })}</b><span>{t('today.streakLabel')}</span></div>
      </div>

      {plan.overflowCible > 0 && (
        <div className="banner" role="note">{t('today.overflow', { n: plan.overflowCible })}</div>
      )}
      {backupDue(state, today) && (
        <div className="banner">
          <span className="grow">{t('today.backup')}</span>
          <button type="button" className="btn ghost" onClick={() => onNavigate('settings')}>{t('today.backupButton')}</button>
        </div>
      )}

      {hasAcquis && (
        <div className="card prog">
          <div className="ring" role="img" aria-label={t('today.progress')}
            style={{ '--p': total ? Math.round((doneCount / total) * 100) : 0 }}>
            <i>{doneCount}/{total}</i>
          </div>
          <div>
            <p><strong>{doneCount === total && total > 0 ? t('today.allDone') : t('today.toReview', { n: total })}</strong></p>
            <p className="sub">{t('today.mix', { base: baseN, cible: total - baseN })}</p>
          </div>
        </div>
      )}

      {learnIds.length > 0 && (
        <>
          <div className="sec"><span>{t('today.learnSection')}</span><span>{t('today.learnCount', { n: learnIds.length })}</span></div>
          {learnIds.map((id) => (
            <LearnCard
              key={id}
              id={id}
              ref_={refOf(id)}
              learned={learnedToday.includes(id)}
              onLearn={(lid, score) => { dispatch({ type: 'LEARN', id: lid, score, day: today }); setToast(null); }}
            />
          ))}
        </>
      )}

      {!hasAcquis ? (
        <div className="card empty-state">
          <p><strong>{t('today.emptyTitle')}</strong></p>
          <button type="button" className="btn" onClick={() => onNavigate('acquis')}>{t('today.emptyButton')}</button>
        </div>
      ) : (
        <>
          <div className="sec"><span>{t('today.reviewSection')}</span><span>{t('today.reviewHint')}</span></div>
          <div className="tiles">
            {cards.map((c) => {
              const done = doneSource.has(c.hizb);
              return (
                <div key={c.hizb} className={`tile${c.source === 'cible' ? ' cible' : ''}${done ? ' done' : ''}`}>
                  <button type="button" className="tile-main" disabled={done}
                    aria-label={t('today.open', { hizb: c.hizb })} onClick={() => setSheetHizb(c.hizb)}>
                    <HizbLabel hizb={c.hizb} />
                    <div className="tile-tags">
                      <span className={`tag${c.source === 'cible' ? ' gold' : ''}`}>{t(c.source === 'cible' ? 'today.cible' : 'today.base')}</span>
                      {done && <span className="tag">{t('today.done')}</span>}
                    </div>
                    {!done && c.focus.length > 0 && <Focus ids={c.focus} />}
                  </button>
                  <button type="button" className="check" data-hizb={c.hizb} disabled={done}
                    aria-label={t('today.check', { hizb: c.hizb })} onClick={() => review(c.hizb, {})}>✓</button>
                </div>
              );
            })}
          </div>
        </>
      )}

      {sheetHizb != null && (
        <ReviewSheet
          hizb={sheetHizb}
          state={state}
          onClose={() => setSheetHizb(null)}
          onValidate={(overrides) => { review(sheetHizb, overrides); setSheetHizb(null); }}
        />
      )}
      {toast && (
        <Toast key={toast.n} message={toast.message} actionLabel={t('common.cancel')} onAction={undo} />
      )}
    </section>
  );
}
