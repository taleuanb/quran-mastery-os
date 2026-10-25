import React, { useEffect, useMemo, useRef, useState } from 'react';
import BottomSheet from '../ui/components/BottomSheet';
import Toast from '../ui/components/Toast';
import { t } from '../ui/strings.fr';

const LONG_PRESS_MS = 450;
const HIZBS = Array.from({ length: 60 }, (_, i) => i + 1);
const FILTERS = ['all', 'full', 'part', 'fr', 'none'];

const pad2 = (n) => String(n).padStart(2, '0');
const thumunIds = (hizb) => Array.from({ length: 8 }, (_, i) => `H${pad2(hizb)}-T${i + 1}`);

/** Affichage d'un thumun : 0 non acquis, 1 acquis, 2 fragile (acquis en piste cible ou fragile au départ). */
function displayState(th) {
  if (!th || th.status !== 'acquis') return 0;
  return th.fragileInitial || th.track === 'cible' ? 2 : 1;
}

const hizbStatus = (a) => (a === 8 ? 'full' : a === 0 ? 'none' : 'part');
const changesFor = (hizbs, value) =>
  Object.fromEntries(hizbs.flatMap((h) => thumunIds(h).map((id) => [id, value])));

/**
 * Écran Acquis : saisie initiale et continue des parties mémorisées.
 * @param {{state: object, dispatch: (a: object) => void, refs: object[], today: string}} props
 */
export default function Acquis({ state, dispatch, refs, today }) {
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [selMode, setSelMode] = useState(false);
  const [picked, setPicked] = useState({});
  const [sheet, setSheet] = useState(null); // {hizb, initial: number[8], draft: number[8]}
  const [toast, setToast] = useState(null); // {key, message}

  const press = useRef({ timer: null });
  const drag = useRef(null); // null | true (sélectionne) | false (désélectionne)

  useEffect(() => () => clearTimeout(press.current.timer), []);

  // Infos de référentiel par hizb (nom, sourate), dérivées de `refs`.
  const info = useMemo(() => {
    const out = {};
    for (const r of refs) if (r.thumun === 1) out[r.hizb] = { hizbName: r.hizbName, surah: r.surah };
    return out;
  }, [refs]);

  // États d'affichage par hizb.
  const rows = useMemo(() => {
    const out = {};
    for (const h of HIZBS) {
      const states = thumunIds(h).map((id) => displayState(state.thumuns[id]));
      const a = states.filter(Boolean).length;
      out[h] = { states, a, f: states.filter((s) => s === 2).length, status: hizbStatus(a) };
    }
    return out;
  }, [state.thumuns]);

  const totals = useMemo(() => {
    let thumuns = 0; let hizbs = 0; let partials = 0; let fragiles = 0;
    for (const h of HIZBS) {
      const r = rows[h];
      thumuns += r.a; fragiles += r.f;
      if (r.a === 8) hizbs += 1; else if (r.a > 0) partials += 1;
    }
    return { thumuns, hizbs, partials, fragiles };
  }, [rows]);

  const q = query.trim().toLowerCase();
  const matches = (h) => {
    const r = rows[h];
    if (filter === 'fr' ? r.f === 0 : filter !== 'all' && r.status !== filter) return false;
    if (!q) return true;
    if (/^\d+$/.test(q)) return h === Number(q);
    const i = info[h] ?? { hizbName: '', surah: '' };
    return `${i.hizbName} ${i.surah}`.toLowerCase().includes(q);
  };

  const pickedList = Object.keys(picked).map(Number).sort((a, b) => a - b);

  // ---- interactions de la grille ----
  const clearPress = () => { clearTimeout(press.current.timer); press.current.timer = null; };
  const hizbOf = (el) => {
    const card = el && el.closest ? el.closest('[data-h]') : null;
    return card ? Number(card.dataset.h) : null;
  };
  const setPick = (h, on) => setPicked((prev) => {
    if (!!prev[h] === on) return prev;
    const next = { ...prev };
    if (on) next[h] = true; else delete next[h];
    return next;
  });

  const toggleHizb = (h) => {
    dispatch({ type: 'SET_ACQUIS', changes: changesFor([h], rows[h].a === 8 ? 0 : 1), day: today });
  };

  const openSheet = (h) => setSheet({ hizb: h, initial: rows[h].states, draft: rows[h].states });

  const onPointerDown = (e) => {
    const h = hizbOf(e.target);
    if (h == null) return;
    if (selMode) {
      drag.current = !picked[h];
      setPick(h, drag.current);
      e.preventDefault();
      return;
    }
    clearPress();
    press.current.timer = setTimeout(() => { press.current.timer = null; openSheet(h); }, LONG_PRESS_MS);
    press.current.hizb = h;
  };

  const onPointerMove = (e) => {
    if (press.current.timer) clearPress();
    if (!selMode || drag.current === null) return;
    const under = typeof document.elementFromPoint === 'function'
      ? document.elementFromPoint(e.clientX, e.clientY)
      : e.target;
    const h = hizbOf(under);
    if (h != null) setPick(h, drag.current);
  };

  const onPointerUp = () => {
    drag.current = null;
    if (press.current.timer) {
      clearPress();
      if (!selMode) toggleHizb(press.current.hizb);
    }
  };

  const onPointerCancel = () => { clearPress(); drag.current = null; };

  const onKeyDown = (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const h = hizbOf(e.target);
    if (h == null) return;
    e.preventDefault();
    if (selMode) setPick(h, !picked[h]); else toggleHizb(h);
  };

  const toggleSelMode = () => { setSelMode((on) => !on); setPicked({}); };

  const applyBulk = (value) => {
    dispatch({ type: 'SET_ACQUIS', changes: changesFor(pickedList, value), day: today });
    setPicked({});
  };

  const quickFill = () => {
    dispatch({ type: 'SET_ACQUIS', changes: changesFor(HIZBS.slice(0, 12), 1), day: today });
    setToast((prev) => ({ key: (prev?.key ?? 0) + 1, message: t('acquis.quick.done') }));
  };

  // ---- feuille des 8 thumuns ----
  const setDraft = (i, v) => setSheet((s) => ({ ...s, draft: s.draft.map((x, j) => (j === i ? v : x)) }));

  const saveSheet = () => {
    const ids = thumunIds(sheet.hizb);
    const changes = {};
    const forgotten = [];
    ids.forEach((id, i) => {
      const from = sheet.initial[i];
      const to = sheet.draft[i];
      if (from === to) return;
      if (to === 0 || from === 0) changes[id] = to;
      else if (to === 2) forgotten.push(id); // déjà acquis : le reducer ignore SET_ACQUIS, l'oubli passe par MARK_FORGOTTEN
    });
    if (Object.keys(changes).length) dispatch({ type: 'SET_ACQUIS', changes, day: today });
    forgotten.forEach((id) => dispatch({ type: 'MARK_FORGOTTEN', id, day: today }));
    setSheet(null);
  };

  // ---- rendu ----
  const pct = Math.round((totals.thumuns / 480) * 100);
  const badge = (r) => {
    if (r.f) return t(r.f > 1 ? 'acquis.badge.fragile.many' : 'acquis.badge.fragile.one', { n: r.f });
    if (r.status === 'full') return t('acquis.badge.full');
    if (r.status === 'part') return t('acquis.badge.part', { n: r.a });
    return t('acquis.badge.none');
  };

  const juzBlocks = [];
  for (let j = 1; j <= 30; j++) {
    const hs = [2 * j - 1, 2 * j].filter(matches);
    if (!hs.length) continue;
    const ja = rows[2 * j - 1].a + rows[2 * j].a;
    juzBlocks.push(
      <div className="juz" key={j}>
        <div className="jh">
          <b>{t('acquis.juz', { n: j })}</b>
          <span className="ar" dir="rtl">{t('acquis.juz.ar', { n: j })}</span>
          <div className="jb" style={{ '--p': (ja / 16) * 100 }}><i /></div>
          <small className="sub">{ja}/16</small>
        </div>
        {hs.map((h) => {
          const r = rows[h];
          const i = info[h] ?? { hizbName: '', surah: '' };
          const cls = ['hz', r.status, r.f ? 'fr' : '', picked[h] ? 'pick' : '', selMode ? 'selmode' : '']
            .filter(Boolean).join(' ');
          return (
            <div
              key={h}
              className={cls}
              data-h={h}
              data-testid={`hz-${h}`}
              role="button"
              tabIndex={0}
              aria-pressed={selMode ? !!picked[h] : undefined}
              style={{ '--p': (r.a / 8) * 100 }}
              onKeyDown={onKeyDown}
            >
              <div className="t">
                <b style={{ font: '700 20px var(--display)' }}>{h}</b>
                <span className="badge">{badge(r)}</span>
              </div>
              <div className="nm" dir="rtl">{i.hizbName}</div>
              <div className="sr" dir="rtl">{t('hizb.surah', { name: i.surah })}</div>
              <div className="fill"><i /></div>
            </div>
          );
        })}
      </div>,
    );
  }

  return (
    <section className="screen on">
      <div className="top">
        <div>
          <h1>{t('screen.acquis.title')}</h1>
          <div className="sub">{t('acquis.subtitle')}</div>
        </div>
      </div>

      <div className="card hero">
        <div className="ring" role="img" aria-label={t('acquis.ring', { pct })} style={{ '--p': (totals.thumuns / 480) * 100 }}>
          <i>{pct}%</i>
        </div>
        <div className="grow">
          <strong style={{ font: '700 22px var(--display)' }}>{t('acquis.hizbs', { n: totals.hizbs })}</strong>
          <div className="sub">{t('acquis.thumuns', { n: totals.thumuns })}</div>
          <div className="sub">{t('acquis.partials', { p: totals.partials, f: totals.fragiles })}</div>
        </div>
      </div>

      <div className="search">
        <span aria-hidden="true">⌕</span>
        <input
          type="search"
          value={query}
          placeholder={t('acquis.search.placeholder')}
          aria-label={t('acquis.search.label')}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="chips" role="group" aria-label={t('acquis.filters')}>
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            className={filter === f ? 'chip on' : 'chip'}
            aria-pressed={filter === f}
            onClick={() => setFilter(f)}
          >
            {t(`acquis.filter.${f}`)}
          </button>
        ))}
      </div>

      <div className="tools">
        <button type="button" className={selMode ? 'chip on' : 'chip'} onClick={toggleSelMode}>
          {t(selMode ? 'acquis.selmode.on' : 'acquis.selmode.off')}
        </button>
        <button type="button" className="chip" onClick={quickFill}>{t('acquis.quick')}</button>
      </div>

      <div
        data-testid="acquis-grid"
        style={{ display: 'flex', flexDirection: 'column', gap: 8, ...(selMode ? { touchAction: 'none' } : {}) }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onContextMenu={(e) => e.preventDefault()}
      >
        {juzBlocks.length ? juzBlocks : <div className="card sub" style={{ textAlign: 'center' }}>{t('acquis.empty')}</div>}
      </div>

      <div className="note">{t('acquis.note')}</div>

      {pickedList.length > 0 && (
        <div className="bulk on" role="toolbar" aria-label={t('acquis.bulk.label')}>
          <span>{t(pickedList.length > 1 ? 'acquis.bulk.many' : 'acquis.bulk.one', { n: pickedList.length })}</span>
          <button type="button" className="g" onClick={() => applyBulk(0)}>{t('acquis.bulk.remove')}</button>
          <button type="button" onClick={() => applyBulk(1)}>{t('acquis.bulk.add')}</button>
          <button type="button" className="g" aria-label={t('acquis.bulk.clear')} onClick={() => setPicked({})}>✕</button>
        </div>
      )}

      {toast && <Toast key={toast.key} message={toast.message} />}

      <BottomSheet
        open={!!sheet}
        title={sheet && t('acquis.sheet.title', { hizb: sheet.hizb })}
        subtitle={sheet && (
          <>
            <span className="ar" dir="rtl">{info[sheet.hizb]?.hizbName}</span>
            {' · '}
            <span className="ar" dir="rtl">{t('hizb.surah', { name: info[sheet.hizb]?.surah })}</span>
            {' · '}
            {t('acquis.sheet.subtitle', { juz: Math.ceil(sheet.hizb / 2) })}
          </>
        )}
        onClose={() => setSheet(null)}
        actions={(
          <>
            <button type="button" className="btn ghost grow" onClick={() => setSheet(null)}>{t('common.cancel')}</button>
            <button type="button" className="btn grow" onClick={saveSheet}>{t('common.save')}</button>
          </>
        )}
      >
        {sheet && sheet.draft.map((v, i) => (
          <div className="tr3" key={i}>
            <div className="lab"><b>{i + 1}/8</b><span dir="rtl">{t('hizb.thumun', { n: i + 1 })}</span></div>
            <div className="seg3" role="group" aria-label={t('acquis.sheet.thumun', { n: i + 1 })}>
              {[0, 1, 2].map((s) => (
                <button
                  key={s}
                  type="button"
                  className={[s === 1 ? 'a' : s === 2 ? 'f' : '', v === s ? 'on' : ''].filter(Boolean).join(' ')}
                  aria-pressed={v === s}
                  onClick={() => setDraft(i, s)}
                >
                  {t(`acquis.state.${s}`)}
                </button>
              ))}
            </div>
          </div>
        ))}
      </BottomSheet>
    </section>
  );
}
