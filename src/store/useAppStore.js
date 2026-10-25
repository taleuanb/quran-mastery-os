import { useReducer, useEffect } from 'react';
import { reducer } from './reducer.js';
import { loadState, saveState } from './storage.js';
import { dayKey } from '../domain/dates.js';

/**
 * @param {import('../domain/types.js').Ref[]} refs
 * @returns {{state: object, dispatch: Function, refs: import('../domain/types.js').Ref[], today: string}}
 */
export function useAppStore(refs) {
  const [state, dispatch] = useReducer(reducer, refs, loadState);

  useEffect(() => {
    // `_undo` (annulation) n'est jamais persisté.
    const { _undo, ...persisted } = state;
    saveState(persisted);
  }, [state]);

  const today = dayKey(new Date(), state.params.rolloverHour);
  return { state, dispatch, refs, today };
}
