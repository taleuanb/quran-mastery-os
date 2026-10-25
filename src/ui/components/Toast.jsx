import React, { useEffect, useState } from 'react';

/**
 * Bandeau temporaire avec action (ex. « Annuler »). Disparaît après `duration` ms ;
 * un nouveau `message` le réaffiche.
 * @param {{message: string, actionLabel?: string, onAction?: () => void, duration?: number}} props
 */
export default function Toast({ message, actionLabel, onAction, duration = 5000 }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setVisible(true);
    const id = setTimeout(() => setVisible(false), duration);
    return () => clearTimeout(id);
  }, [message, duration]);

  if (!visible || !message) return null;
  return (
    <div className="toast on" role="status" aria-live="polite">
      <span>{message}</span>
      {actionLabel && (
        <button type="button" onClick={onAction}>{actionLabel}</button>
      )}
    </div>
  );
}
