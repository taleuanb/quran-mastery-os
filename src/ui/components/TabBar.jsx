import React from 'react';
import { t } from '../strings.fr';

const ICONS = {
  today: (<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>),
  agenda: (<><rect x="4" y="5" width="16" height="15" rx="3" /><path d="M4 10h16M9 3v4M15 3v4" /></>),
  acquis: (<><rect x="4" y="4" width="7" height="7" rx="2" /><rect x="13" y="4" width="7" height="7" rx="2" /><rect x="4" y="13" width="7" height="7" rx="2" /><rect x="13" y="13" width="7" height="7" rx="2" /></>),
  stats: (<path d="M4 20V10M10 20V4M16 20v-8M22 20H2" />),
  settings: (<><circle cx="12" cy="12" r="3" /><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" /></>),
};

export const TABS = ['today', 'agenda', 'acquis', 'stats', 'settings'];

/**
 * Barre d'onglets du bas.
 * @param {{active: string, onChange: (tab: string) => void, badge?: boolean}} props
 */
export default function TabBar({ active, onChange, badge = false }) {
  return (
    <nav aria-label={t('tab.nav')}>
      <div>
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            className={tab === active ? 'on' : undefined}
            aria-current={tab === active ? 'page' : undefined}
            onClick={() => onChange(tab)}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">{ICONS[tab]}</svg>
            {t(`tab.${tab}`)}
            {tab === 'today' && badge && (
              <i className="pip" role="img" aria-label={t('tab.pending')} />
            )}
          </button>
        ))}
      </div>
    </nav>
  );
}
