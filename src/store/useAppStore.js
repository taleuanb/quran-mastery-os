import { useReducer, useEffect, useState } from 'react';
import { reducer } from './reducer.js';
import { loadState, saveState } from './storage.js';
import { dayKey } from '../domain/dates.js';

const REFRESH_MS = 60 * 1000;

/**
 * @param {import('../domain/types.js').Ref[]} refs
 * @returns {{state: object, dispatch: Function, refs: import('../domain/types.js').Ref[], today: string, saveError: boolean}}
 */
export function useAppStore(refs) {
  const [state, dispatch] = useReducer(reducer, refs, loadState);
  const [saveError, setSaveError] = useState(false);
  // « Maintenant » vit dans l'état : le jour change après 04:00 même si l'app reste ouverte.
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    // `_undo` (annulation) n'est jamais persisté.
    const { _undo, ...persisted } = state;
    setSaveError(!saveState(persisted));
  }, [state]);

  useEffect(() => {
    const refresh = () => setNow(new Date());
    const onVisible = () => { if (document.visibilityState === 'visible') refresh(); };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', refresh);
    const timer = setInterval(refresh, REFRESH_MS);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', refresh);
      clearInterval(timer);
    };
  }, []);

  const today = dayKey(now, state.params.rolloverHour);
  return { state, dispatch, refs, today, saveError };
}
