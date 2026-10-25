import React, { useEffect, useId } from 'react';
import { t } from '../strings.fr';

/**
 * Feuille du bas modale. Non rendue quand `open` est faux.
 * `actions` : boutons du pied de feuille ; par défaut un bouton « Fermer ».
 * @param {{open: boolean, title?: React.ReactNode, subtitle?: React.ReactNode, onClose: () => void, actions?: React.ReactNode, children?: React.ReactNode}} props
 */
export default function BottomSheet({ open, title, subtitle, onClose, actions, children }) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <>
      <div className="scrim on" data-testid="scrim" onClick={onClose} />
      <div className="sheet on" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="grab" />
        <div style={{ marginBottom: 6 }}>
          <h2 id={titleId} className="sheet-title">{title}</h2>
          {subtitle && <div className="sub">{subtitle}</div>}
        </div>
        {children}
        <div className="row" style={{ marginTop: 14 }}>
          {actions ?? (
            <button type="button" className="btn ghost grow" onClick={onClose}>
              {t('common.close')}
            </button>
          )}
        </div>
      </div>
    </>
  );
}
