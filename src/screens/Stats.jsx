import React, { useState } from 'react';
import { actualCycleDays, distribution, hizbHeat, streak, topFragile } from '../domain/stats';
import { hizbInfo } from '../domain/referential';
import HizbLabel from '../ui/components/HizbLabel';
import { t } from '../ui/strings.fr';

const TRENDS = {
  up: { arrow: '↗', cls: 'txt-s4' },
  down: { arrow: '↘', cls: 'txt-s1' },
  flat: { arrow: '→', cls: '' },
};

/** Niveau de couleur (1 à 5) d'une case, ou null si vide. */
function levelOf(row, mode) {
  if (mode === 'solidity') {
    return row.solidity === null ? null : Math.min(5, Math.max(1, Math.round(row.solidity)));
  }
  if (row.ageDays === null) return null;
  if (row.ageDays <= 7) return 4;
  if (row.ageDays <= 20) return 3;
  return 1;
}

function cellLabel(row, mode) {
  const detail = mode === 'solidity'
    ? (row.solidity === null ? t('stats.map.cell.empty') : t('stats.map.cell.solidity', { n: Math.round(row.solidity * 10) / 10 }))
    : (row.ageDays === null ? t('stats.map.cell.empty') : t('stats.map.cell.age', { n: row.ageDays }));
  return `${t('stats.map.cell', { hizb: row.hizb, name: hizbInfo(row.hizb).hizbName })} · ${detail}`;
}

/** @param {{state: import('../domain/types.js').AppState, refs?: object[], today: string}} props */
export default function Stats({ state, today }) {
  const [mode, setMode] = useState('solidity');
  const cycle = actualCycleDays(state, today);
  const target = 30 / state.params.baseRotationPerMonth;
  const dist = distribution(state);
  const total = dist.difficile + dist.moyen + dist.facile;
  const days = streak(state.dayLog, today, state.params);
  const heat = hizbHeat(state, today);
  const fragile = topFragile(state, 10);

  return (
    <section className="screen on" aria-labelledby="stats-title">
      <div className="top">
        <div>
          <h1 id="stats-title">{t('screen.stats.title')}</h1>
          <div className="sub">{t('stats.subtitle')}</div>
        </div>
      </div>

      <div className="kpis">
        <div className="card">
          <b>{cycle === null ? t('stats.kpi.none') : t('stats.kpi.days', { n: cycle })}</b>
          <span>{t('stats.kpi.cycle', { target })}</span>
        </div>
        <div className="card">
          <b>{dist.difficile}</b>
          <span>{t('stats.kpi.difficult')}</span>
        </div>
        <div className="card">
          <b>{t('stats.kpi.days', { n: days })}</b>
          <span>{t('stats.kpi.streak')}</span>
        </div>
      </div>

      <div className="card">
        <div className="sec" style={{ padding: 0 }}>
          <span>{t('stats.distribution')}</span>
          <span>{t('stats.distribution.total', { n: total })}</span>
        </div>
        {total > 0 && (
          <div className="bar" aria-hidden="true">
            <i style={{ width: `${(dist.difficile / total) * 100}%`, background: 'var(--s1)' }} />
            <i style={{ width: `${(dist.moyen / total) * 100}%`, background: 'var(--s3)' }} />
            <i style={{ width: `${(dist.facile / total) * 100}%`, background: 'var(--s5)' }} />
          </div>
        )}
        <div className="legend">
          <span className="txt-s1">{t('stats.distribution.difficile', { n: dist.difficile })}</span>
          <span>{t('stats.distribution.moyen', { n: dist.moyen })}</span>
          <span>{t('stats.distribution.facile', { n: dist.facile })}</span>
        </div>
      </div>

      <div className="card">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div className="sec" style={{ padding: 0 }}><span>{t('stats.map')}</span></div>
          <div className="seg" role="group" aria-label={t('stats.map.mode')}>
            {['solidity', 'age'].map((m) => (
              <button
                key={m}
                type="button"
                className={mode === m ? 'on' : ''}
                aria-pressed={mode === m}
                onClick={() => setMode(m)}
              >
                {t(`stats.map.${m}`)}
              </button>
            ))}
          </div>
        </div>
        <div className="heat">
          {heat.map((row) => {
            const level = levelOf(row, mode);
            return (
              <i
                key={row.hizb}
                role="img"
                aria-label={cellLabel(row, mode)}
                style={level === null ? undefined : { '--c': `var(--s${level})` }}
              />
            );
          })}
        </div>
        <div className="legend">
          {mode === 'solidity'
            ? (<><span>{t('stats.map.weak')}</span><span>{t('stats.map.solid')}</span></>)
            : (<><span>{t('stats.map.recent')}</span><span>{t('stats.map.stale')}</span></>)}
        </div>
      </div>

      <div className="card">
        <div className="sec" style={{ padding: '0 0 6px' }}><span>{t('stats.fragile')}</span></div>
        {fragile.length === 0 ? (
          <div className="sub">{t('stats.fragile.empty')}</div>
        ) : (
          <ol className="flist" aria-label={t('stats.fragile')}>
            {fragile.map(({ id, last, trend }) => {
              const hizb = Number(id.slice(1, 3));
              const thumun = Number(id.slice(5));
              const tr = TRENDS[trend];
              return (
                <li key={id} className="frow">
                  <span className="pill" data-s={last}>{last}</span>
                  <div className="grow"><HizbLabel hizb={hizb} thumun={thumun} /></div>
                  <span className={`trend ${tr.cls}`} aria-label={t(`stats.trend.${trend}`)} role="img">{tr.arrow}</span>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </section>
  );
}
