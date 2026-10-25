import React, { useRef, useState } from 'react';
import { diffDays } from '../domain/dates';
import { hizbInfo } from '../domain/referential';
import { exportState, importState } from '../store/storage';
import BottomSheet from '../ui/components/BottomSheet';
import HizbLabel from '../ui/components/HizbLabel';
import ScorePills from '../ui/components/ScorePills';
import { downloadText } from '../ui/download';
import { t } from '../ui/strings.fr';

const HISTORY_SIZE = 20;
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]; // lundi en premier ; 0 = dimanche
const HIZBS = Array.from({ length: 60 }, (_, i) => i + 1);
const THUMUNS = Array.from({ length: 8 }, (_, i) => i + 1);

const thumunId = (hizb, thumun) => `H${String(hizb).padStart(2, '0')}-T${thumun}`;
const round1 = (n) => Math.round(n * 10) / 10;

/** Paramètres avancés : lecture, bornes et patch (les objets imbriqués sont renvoyés entiers). */
const ADVANCED = [
  { key: 'mult5', label: 'settings.mult5', min: 1, max: 5, step: 0.1, get: (p) => p.multipliers[5], show: (v) => `×${String(v).replace('.', ',')}`, patch: (p, v) => ({ multipliers: { ...p.multipliers, 5: v } }) },
  { key: 'mult4', label: 'settings.mult4', min: 1, max: 5, step: 0.1, get: (p) => p.multipliers[4], show: (v) => `×${String(v).replace('.', ',')}`, patch: (p, v) => ({ multipliers: { ...p.multipliers, 4: v } }) },
  { key: 'mult3', label: 'settings.mult3', min: 1, max: 5, step: 0.1, get: (p) => p.multipliers[3], show: (v) => `×${String(v).replace('.', ',')}`, patch: (p, v) => ({ multipliers: { ...p.multipliers, 3: v } }) },
  { key: 'reset2', label: 'settings.reset2', min: 1, max: 14, step: 1, get: (p) => p.resetDays[2], patch: (p, v) => ({ resetDays: { ...p.resetDays, 2: v } }) },
  { key: 'reset1', label: 'settings.reset1', min: 1, max: 14, step: 1, get: (p) => p.resetDays[1], patch: (p, v) => ({ resetDays: { ...p.resetDays, 1: v } }) },
  { key: 'initialInterval', label: 'settings.initialInterval', min: 1, max: 14, step: 1, get: (p) => p.initialInterval, patch: (p, v) => ({ initialInterval: v }) },
  { key: 'hardMaxInterval', label: 'settings.hardMaxInterval', min: 1, max: 30, step: 1, get: (p) => p.hardMaxInterval, patch: (p, v) => ({ hardMaxInterval: v }) },
  { key: 'urgencyDays', label: 'settings.urgencyDays', min: 0, max: 14, step: 1, get: (p) => p.urgencyDays, patch: (p, v) => ({ urgencyDays: v }) },
  { key: 'rolloverHour', label: 'settings.rolloverHour', min: 0, max: 12, step: 1, get: (p) => p.rolloverHour, show: (v) => t('settings.rolloverHour.value', { n: v }), patch: (p, v) => ({ rolloverHour: v }) },
  { key: 'graceDaysPerWeek', label: 'settings.graceDaysPerWeek', min: 0, max: 7, step: 1, get: (p) => p.graceDaysPerWeek, patch: (p, v) => ({ graceDaysPerWeek: v }) },
  { key: 'backupReminderDays', label: 'settings.backupReminderDays', min: 1, max: 60, step: 1, get: (p) => p.backupReminderDays, patch: (p, v) => ({ backupReminderDays: v }) },
];

/** Ligne de réglage avec pas à pas − / +. */
function Stepper({ label, hint, value, display, min, max, step = 1, onChange }) {
  const change = (dir) => onChange(Math.min(max, Math.max(min, round1(value + dir * step))));
  return (
    <div className="set">
      <div>{label}{hint && <small>{hint}</small>}</div>
      <div className="step">
        <button type="button" aria-label={t('settings.decrease', { label })} disabled={value <= min} onClick={() => change(-1)}>−</button>
        <b>{display ?? value}</b>
        <button type="button" aria-label={t('settings.increase', { label })} disabled={value >= max} onClick={() => change(1)}>+</button>
      </div>
    </div>
  );
}

function readText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error(t('settings.restore.unreadable')));
    reader.readAsText(file);
  });
}

/** @param {{state: import('../domain/types.js').AppState, dispatch: Function, refs?: object[], today: string}} props */
export default function Settings({ state, dispatch, today }) {
  const { params } = state;
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [importError, setImportError] = useState(null);
  const [pendingImport, setPendingImport] = useState(null);
  const [pick, setPick] = useState({ hizb: 1, thumun: 1 });
  const [editing, setEditing] = useState(null); // entrée de journal en cours de correction
  const fileInput = useRef(null);

  const setParams = (patch) => dispatch({ type: 'SET_PARAMS', patch });

  const toggleRestDay = (day) => {
    const next = params.restDays.includes(day)
      ? params.restDays.filter((d) => d !== day)
      : [...params.restDays, day];
    setParams({ restDays: next.sort((a, b) => a - b) });
  };

  const exportBackup = () => {
    const { _undo, ...persisted } = state; // _undo n'est pas persisté
    downloadText(exportState(persisted), `qmos-${today}.json`);
    dispatch({ type: 'MARK_BACKUP', day: today });
  };

  const chooseFile = async (event) => {
    const input = event.target;
    const file = input.files && input.files[0];
    if (!file) return;
    setImportError(null);
    setPendingImport(null);
    try {
      setPendingImport(importState(await readText(file)));
    } catch (err) {
      setImportError(err.message);
    }
    input.value = '';
  };

  const confirmImport = () => {
    dispatch({ type: 'IMPORT', state: pendingImport });
    setPendingImport(null);
  };

  const queue = state.learnQueue;
  const setQueue = (ids) => dispatch({ type: 'SET_LEARN_QUEUE', ids });
  const move = (index, dir) => {
    const ids = [...queue];
    [ids[index], ids[index + dir]] = [ids[index + dir], ids[index]];
    setQueue(ids);
  };
  const pickedId = thumunId(pick.hizb, pick.thumun);

  const history = state.journal.slice(-HISTORY_SIZE).reverse();
  const editingInfo = editing && { hizb: Number(editing.thumunId.slice(1, 3)), thumun: Number(editing.thumunId.slice(5)) };

  return (
    <section className="screen on" aria-labelledby="settings-title">
      <div className="top">
        <div>
          <h1 id="settings-title">{t('screen.settings.title')}</h1>
          <div className="sub">{t('settings.subtitle')}</div>
        </div>
      </div>

      <div className="card">
        <Stepper
          label={t('settings.dailyReviewHizbs')} hint={t('settings.dailyReviewHizbs.hint')}
          value={params.dailyReviewHizbs} min={1} max={12}
          onChange={(v) => setParams({ dailyReviewHizbs: v })}
        />
        <Stepper
          label={t('settings.dailyNewThumuns')} hint={t('settings.dailyNewThumuns.hint')}
          value={params.dailyNewThumuns} min={0} max={5}
          onChange={(v) => setParams({ dailyNewThumuns: v })}
        />
        <div className="set">
          <div>{t('settings.rotation')}<small>{t('settings.rotation.hint')}</small></div>
          <div className="seg" role="group" aria-label={t('settings.rotation')}>
            {[2, 1].map((n) => (
              <button
                key={n} type="button" className={params.baseRotationPerMonth === n ? 'on' : ''}
                aria-pressed={params.baseRotationPerMonth === n}
                onClick={() => setParams({ baseRotationPerMonth: n })}
              >
                {t(`settings.rotation.${n}`)}
              </button>
            ))}
          </div>
        </div>
        <Stepper
          label={t('settings.maxInterval')} hint={t('settings.maxInterval.hint')}
          value={params.maxInterval} display={t('settings.days', { n: params.maxInterval })} min={7} max={60}
          onChange={(v) => setParams({ maxInterval: v })}
        />
        <div className="set">
          <div>{t('settings.restDays')}</div>
        </div>
        <div className="days7" role="group" aria-label={t('settings.restDays')}>
          {WEEK_ORDER.map((d) => (
            <button
              key={d} type="button" className={params.restDays.includes(d) ? 'on' : ''}
              aria-pressed={params.restDays.includes(d)} onClick={() => toggleRestDay(d)}
            >
              {t(`settings.day.${d}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <button
          type="button" className="advtoggle" aria-expanded={advancedOpen}
          onClick={() => setAdvancedOpen((open) => !open)}
        >
          <span>{t('settings.advanced')}<small>{t('settings.advanced.hint')}</small></span>
          <span aria-hidden="true">{advancedOpen ? '−' : '+'}</span>
        </button>
        {advancedOpen && ADVANCED.map((a) => {
          const value = a.get(params);
          return (
            <Stepper
              key={a.key} label={t(a.label)} value={value} display={a.show ? a.show(value) : undefined}
              min={a.min} max={a.max} step={a.step}
              onChange={(v) => setParams(a.patch(params, v))}
            />
          );
        })}
      </div>

      <div className="card">
        <div className="set">
          <div>{t('settings.khatma')}<small>{t('settings.khatma.hint')}</small></div>
          <div className="step">
            <b>{state.khatma}</b>
            <button type="button" aria-label={t('settings.khatma.inc.label')} onClick={() => dispatch({ type: 'KHATMA_INC' })}>
              {t('settings.khatma.inc')}
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="set">
          <div>
            {t('settings.backup')}
            <small>
              {state.lastBackup
                ? t('settings.backup.last', { day: state.lastBackup, n: diffDays(today, state.lastBackup) })
                : t('settings.backup.never')}
            </small>
          </div>
          <button type="button" className="btn ghost small" onClick={exportBackup}>{t('settings.backup.export')}</button>
        </div>
        <div className="set">
          <div>{t('settings.restore')}<small>{t('settings.restore.hint')}</small></div>
          <button type="button" className="btn ghost small" onClick={() => fileInput.current.click()}>{t('settings.restore.import')}</button>
          <input
            ref={fileInput} type="file" accept="application/json" style={{ display: 'none' }}
            aria-label={t('settings.restore.file')} onChange={chooseFile}
          />
        </div>
        {importError && <div role="alert" className="errmsg">{importError}</div>}
        {pendingImport && (
          <div className="confirm" role="group" aria-label={t('settings.restore')}>
            <p>{t('settings.restore.confirm')}</p>
            <div className="row">
              <button type="button" className="btn ghost grow" onClick={() => setPendingImport(null)}>{t('common.cancel')}</button>
              <button type="button" className="btn grow" onClick={confirmImport}>{t('settings.restore.replace')}</button>
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <div className="sec" style={{ padding: '0 0 6px' }}><span>{t('settings.learn')}</span></div>
        {queue.length === 0 ? (
          <div className="sub">{t('settings.learn.empty')}</div>
        ) : (
          <ol className="flist" aria-label={t('settings.learn')}>
            {queue.map((id, i) => (
              <li key={id} className="frow">
                <div className="grow"><HizbLabel hizb={Number(id.slice(1, 3))} thumun={Number(id.slice(5))} /></div>
                <button type="button" className="ib" aria-label={t('settings.learn.up', { id })} disabled={i === 0} onClick={() => move(i, -1)}>↑</button>
                <button type="button" className="ib" aria-label={t('settings.learn.down', { id })} disabled={i === queue.length - 1} onClick={() => move(i, 1)}>↓</button>
                <button type="button" className="ib" aria-label={t('settings.learn.remove', { id })} onClick={() => setQueue(queue.filter((q) => q !== id))}>✕</button>
              </li>
            ))}
          </ol>
        )}
        <div className="row picker">
          <select aria-label={t('settings.learn.hizb')} value={pick.hizb} onChange={(e) => setPick({ ...pick, hizb: Number(e.target.value) })}>
            {HIZBS.map((h) => <option key={h} value={h}>{`${h} · ${hizbInfo(h).hizbName}`}</option>)}
          </select>
          <select aria-label={t('settings.learn.thumun')} value={pick.thumun} onChange={(e) => setPick({ ...pick, thumun: Number(e.target.value) })}>
            {THUMUNS.map((n) => <option key={n} value={n}>{n}/8</option>)}
          </select>
          <button type="button" className="btn small" disabled={queue.includes(pickedId)} onClick={() => setQueue([...queue, pickedId])}>
            {t('settings.learn.add')}
          </button>
        </div>
      </div>

      <div className="card">
        <div className="sec" style={{ padding: '0 0 6px' }}>
          <span>{t('settings.history')}</span><span>{t('settings.history.hint')}</span>
        </div>
        {history.length === 0 ? (
          <div className="sub">{t('settings.history.empty')}</div>
        ) : (
          <ul className="flist" aria-label={t('settings.history')}>
            {history.map((e) => (
              <li key={e.id}>
                <button type="button" className="frow rowbtn" onClick={() => setEditing(e)}>
                  <span className="pill" data-s={e.score}>{e.score}</span>
                  <span className="grow">
                    <b>{t('settings.history.row', { hizb: Number(e.thumunId.slice(1, 3)), n: Number(e.thumunId.slice(5)) })}</b>
                    <span className="sub">{e.date}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <BottomSheet
        open={editing !== null}
        title={t('settings.history.edit')}
        subtitle={editing && `${t('settings.history.row', { hizb: editingInfo.hizb, n: editingInfo.thumun })} · ${editing.date}`}
        onClose={() => setEditing(null)}
      >
        {editing && (
          <ScorePills
            value={editing.score}
            onChange={(score) => {
              dispatch({ type: 'EDIT_ENTRY', entryId: editing.id, score });
              setEditing(null);
            }}
          />
        )}
      </BottomSheet>
    </section>
  );
}
