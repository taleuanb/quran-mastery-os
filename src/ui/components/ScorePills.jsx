import React from 'react';
import { t } from '../strings.fr';

const SCORES = [1, 2, 3, 4, 5];

/**
 * Cinq pastilles de note 1 à 5 ; le chiffre est toujours écrit.
 * @param {{value?: number|null, onChange: (n: number) => void, size?: 'md'|'sm'}} props
 */
export default function ScorePills({ value = null, onChange, size = 'md' }) {
  return (
    <div className={`scores${size === 'sm' ? ' sm' : ''}`} role="group" aria-label={t('score.group')}>
      {SCORES.map((n) => {
        const selected = value === n;
        const cls = ['sc', selected ? 'sel' : value != null ? 'off' : ''].filter(Boolean).join(' ');
        return (
          <button
            key={n}
            type="button"
            className={cls}
            data-s={n}
            style={{ '--c': `var(--s${n})` }}
            aria-pressed={selected}
            onClick={() => onChange(n)}
          >
            {n}
          </button>
        );
      })}
    </div>
  );
}
