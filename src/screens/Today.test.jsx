import React, { useReducer } from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within, act } from '@testing-library/react';
import Today from './Today';
import { reducer } from '../store/reducer';
import { makeRefs, makeState } from '../test/fixtures';

afterEach(cleanup);

const TODAY = '2026-10-25';
const refs = makeRefs();
const ACQUIS = Array.from({ length: 10 }, (_, i) => i + 1);

function setup(state, extra = {}) {
  const dispatch = vi.fn();
  const onNavigate = vi.fn();
  const utils = render(
    <Today state={state} dispatch={dispatch} refs={refs} today={TODAY} onNavigate={onNavigate} {...extra} />,
  );
  return { dispatch, onNavigate, ...utils };
}

/** Today branché sur le vrai reducer ; `api` expose l'état et le dispatch courants. */
function Harness({ initial, api }) {
  const [state, dispatch] = useReducer(reducer, initial);
  api.state = state;
  api.dispatch = dispatch;
  return <Today state={state} dispatch={dispatch} refs={refs} today={TODAY} onNavigate={() => {}} />;
}

const baseState = (over = {}) => ({ ...makeState({ acquis: ACQUIS }), lastBackup: TODAY, ...over });
const checks = () => screen.getAllByRole('button', { name: /tout va bien/ });

describe('Today', () => {
  it('affiche 5 cartes de hizb et la série', () => {
    const state = baseState({ dayLog: { '2026-10-24': { planned: 5, done: 5 } } });
    setup(state);
    expect(checks()).toHaveLength(5);
    expect(screen.getByText('1 j')).toBeInTheDocument();
    expect(screen.getByText('0/5')).toBeInTheDocument();
  });

  it('dispatche SET_DAY_PLAN au montage avec la liste ordonnée affichée', () => {
    const { dispatch } = setup(baseState());
    const shown = checks().map((b) => Number(b.getAttribute('data-hizb')));
    expect(shown).toHaveLength(5);
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'SET_DAY_PLAN', day: TODAY, hizbs: shown }));
    const action = dispatch.mock.calls.map((c) => c[0]).find((a) => a.type === 'SET_DAY_PLAN');
    expect(action.cards.map((c) => c.hizb)).toEqual(shown);
    expect(action.key).toContain(TODAY);
  });

  it('ne dispatche pas SET_DAY_PLAN quand la liste est déjà celle de dayLog', () => {
    const api = {};
    const first = render(<Harness initial={baseState()} api={api} />);
    first.unmount();
    const { dispatch } = setup(api.state);
    expect(dispatch).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'SET_DAY_PLAN' }));
  });

  it('oublier un thumun d’un hizb prévu (MARK_FORGOTTEN) ne le compte pas comme fait', () => {
    const api = {};
    render(<Harness initial={baseState()} api={api} />);
    const shown = checks().map((b) => b.getAttribute('data-hizb'));
    act(() => api.dispatch({ type: 'MARK_FORGOTTEN', id: `H${shown[0].padStart(2, '0')}-T2`, day: TODAY }));
    expect(checks().map((b) => b.getAttribute('data-hizb'))).toEqual(shown);
    expect(screen.getByText('0/5')).toBeInTheDocument();
    expect(screen.queryByText('Fait')).toBeNull();
    expect(api.state.dayLog[TODAY]).toMatchObject({ planned: 5, done: 0, reviewed: [] });
  });

  it('valider un hizb : anneau et dayLog concordent (1/5), la liste reste la même', () => {
    const api = {};
    render(<Harness initial={baseState()} api={api} />);
    const shown = checks().map((b) => Number(b.getAttribute('data-hizb')));
    fireEvent.click(checks()[2]);
    expect(checks().map((b) => Number(b.getAttribute('data-hizb')))).toEqual(shown);
    expect(screen.getByText('1/5')).toBeInTheDocument();
    expect(api.state.dayLog[TODAY]).toMatchObject({ planned: 5, done: 1, hizbs: shown, reviewed: [shown[2]] });
  });

  it('au remontage, l’ordre et les faits sont relus dans dayLog (hizb relu gardé à sa place)', () => {
    const api = {};
    const first = render(<Harness initial={baseState()} api={api} />);
    const shown = checks().map((b) => Number(b.getAttribute('data-hizb')));
    fireEvent.click(checks()[3]);
    const saved = api.state;
    first.unmount();
    const { dispatch } = setup(saved);
    expect(checks().map((b) => Number(b.getAttribute('data-hizb')))).toEqual(shown);
    expect(checks()[3]).toBeDisabled();
    expect(screen.getByText('1/5')).toBeInTheDocument();
    expect(dispatch).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'SET_DAY_PLAN' }));
  });

  it('clic sur ✓ de la première carte : REVIEW_HIZB sans override, toast, puis Annuler → UNDO', () => {
    const { dispatch } = setup(baseState());
    fireEvent.click(checks()[0]);
    const call = dispatch.mock.calls.map((c) => c[0]).filter((a) => a.type === 'REVIEW_HIZB');
    expect(call).toHaveLength(1);
    expect(call[0]).toEqual({ type: 'REVIEW_HIZB', hizb: expect.any(Number), day: TODAY, overrides: {} });
    expect(screen.getByRole('status')).toHaveTextContent(`Hizb ${call[0].hizb} validé`);
    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }));
    expect(dispatch).toHaveBeenCalledWith({ type: 'UNDO' });
  });

  it('un hizb relu aujourd’hui est marqué fait (✓ désactivé, libellé « Fait ») et compte dans l’anneau', () => {
    const state = baseState();
    const first = (() => {
      const { unmount } = setup(state);
      const h = Number(checks()[0].getAttribute('data-hizb'));
      unmount();
      return h;
    })();
    const id = `H${String(first).padStart(2, '0')}-T1`;
    const withDone = {
      ...state,
      journal: [{ id: 'x', date: TODAY, thumunId: id, pilier: 'revision', score: 4, source: 'base' }],
      dayLog: { [TODAY]: { planned: 1, done: 1, hizbs: [first], reviewed: [first] } },
    };
    setup(withDone);
    expect(screen.getByText('1/5')).toBeInTheDocument();
    expect(screen.getAllByText('Fait')).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: /tout va bien/ }).filter((b) => b.disabled)).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: /tout va bien/ })).toHaveLength(5);
  });

  it('la liste est figée : après validation (état mis à jour) le hizb reste, marqué fait, sans nouvelle carte', () => {
    const state = baseState();
    const { rerender, dispatch, onNavigate } = setup(state);
    const hizbs = checks().map((b) => b.getAttribute('data-hizb'));
    const pad = String(hizbs[0]).padStart(2, '0');
    const after = {
      ...state,
      thumuns: Object.fromEntries(Object.entries(state.thumuns).map(([id, th]) => [id, id.startsWith(`H${pad}-`) ? { ...th, lastReviewed: TODAY } : th])),
      journal: [{ id: 'x', date: TODAY, thumunId: `H${pad}-T1`, pilier: 'revision', score: 4, source: 'base' }],
      dayLog: { [TODAY]: { planned: 5, done: 1, hizbs: hizbs.map(Number), reviewed: [Number(hizbs[0])] } },
    };
    rerender(<Today state={after} dispatch={dispatch} refs={refs} today={TODAY} onNavigate={onNavigate} />);
    expect(checks().map((b) => b.getAttribute('data-hizb'))).toEqual(hizbs);
    expect(screen.getByText('1/5')).toBeInTheDocument();
  });

  it('toucher la carte ouvre la feuille de 8 thumuns ; valider envoie les overrides ≠ 4', () => {
    const { dispatch } = setup(baseState());
    const hizb = Number(checks()[0].getAttribute('data-hizb'));
    fireEvent.click(screen.getByRole('button', { name: new RegExp(`thumuns du hizb ${hizb}$`) }));
    const dialog = screen.getByRole('dialog');
    const groups = within(dialog).getAllByRole('group', { name: 'Note de 1 à 5' });
    expect(groups).toHaveLength(8);
    fireEvent.click(within(groups[1]).getByRole('button', { name: '2' }));
    fireEvent.click(within(groups[5]).getByRole('button', { name: '5' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Valider' }));
    const pad = String(hizb).padStart(2, '0');
    expect(dispatch).toHaveBeenCalledWith({
      type: 'REVIEW_HIZB',
      hizb,
      day: TODAY,
      overrides: { [`H${pad}-T2`]: 2, [`H${pad}-T6`]: 5 },
    });
    expect(screen.getByRole('status')).toHaveTextContent(`Hizb ${hizb} validé`);
  });

  it('feuille : les thumuns non acquis sont désactivés', () => {
    const state = makeState({ acquis: ACQUIS });
    state.thumuns['H01-T3'] = { ...state.thumuns['H01-T3'], status: 'non_acquis', track: null };
    setup(state);
    fireEvent.click(screen.getByRole('button', { name: /thumuns du hizb 1$/ }));
    const groups = within(screen.getByRole('dialog')).getAllByRole('group', { name: 'Note de 1 à 5' });
    expect(within(groups[2]).getByRole('button', { name: '4' })).toBeDisabled();
    expect(within(groups[1]).getByRole('button', { name: '4' })).not.toBeDisabled();
    expect(within(groups[1]).getByRole('button', { name: '4' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('carte Apprentissage : bouton puis note → LEARN', () => {
    const { dispatch } = setup(baseState());
    expect(screen.getByText(/سورة S11 · آية 1/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: "J'ai appris ce thumun" }));
    fireEvent.click(screen.getByRole('button', { name: '3' }));
    expect(dispatch).toHaveBeenCalledWith({ type: 'LEARN', id: 'H11-T1', score: 3, day: TODAY });
  });

  it('affiche « Surtout : » pour un hizb ciblé avec focus', () => {
    const state = makeState({
      acquis: ACQUIS,
      cible: { 'H03-T6': { due: TODAY, scores: [{ date: '2026-10-20', score: 3 }] } },
    });
    setup(state);
    expect(screen.getByText(/Surtout :/)).toBeInTheDocument();
    expect(screen.getByText('الثمن 6/8')).toBeInTheDocument();
    expect(screen.getByText('ciblé')).toBeInTheDocument();
  });

  it('bandeau de débordement quand overflowCible > 0', () => {
    const cible = {};
    for (let h = 1; h <= 10; h++) cible[`H${String(h).padStart(2, '0')}-T1`] = { due: TODAY, scores: [{ date: '2026-10-20', score: 3 }] };
    setup(makeState({ acquis: ACQUIS, cible }));
    expect(screen.getByText('5 thumuns faibles en attente')).toBeInTheDocument();
  });

  it('bandeau de sauvegarde → onNavigate("settings")', () => {
    const { onNavigate } = setup(makeState({ acquis: ACQUIS }));
    fireEvent.click(screen.getByRole('button', { name: 'Sauvegarder' }));
    expect(onNavigate).toHaveBeenCalledWith('settings');
  });

  it('pas de bandeau de sauvegarde quand la sauvegarde est récente', () => {
    setup(baseState());
    expect(screen.queryByRole('button', { name: 'Sauvegarder' })).toBeNull();
  });

  it('état sans acquis : texte d’accueil et bouton vers Acquis', () => {
    const { onNavigate } = setup(makeState({ acquis: [] }));
    expect(screen.getByText('Commencez par indiquer vos acquis')).toBeInTheDocument();
    expect(screen.queryAllByRole('button', { name: /tout va bien/ })).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: 'Indiquer mes acquis' }));
    expect(onNavigate).toHaveBeenCalledWith('acquis');
  });

  it('recalcule le plan quand les acquis changent (écran resté monté)', () => {
    const empty = makeState({ acquis: [] });
    const { rerender, dispatch, onNavigate } = setup(empty);
    expect(screen.queryAllByRole('button', { name: /tout va bien/ })).toHaveLength(0);
    rerender(<Today state={baseState()} dispatch={dispatch} refs={refs} today={TODAY} onNavigate={onNavigate} />);
    expect(checks()).toHaveLength(5);
    expect(screen.queryByText('Commencez par indiquer vos acquis')).toBeNull();
  });

  it('recalcule le plan quand dailyReviewHizbs change', () => {
    const { rerender, dispatch, onNavigate } = setup(baseState());
    expect(checks()).toHaveLength(5);
    const fewer = { ...makeState({ acquis: ACQUIS, params: { dailyReviewHizbs: 3 } }), lastBackup: TODAY };
    rerender(<Today state={fewer} dispatch={dispatch} refs={refs} today={TODAY} onNavigate={onNavigate} />);
    expect(checks()).toHaveLength(3);
  });

  it('une ancienne entrée (sans listes) ne tronque pas la liste ; SET_DAY_PLAN la remplace', () => {
    const { dispatch } = setup(baseState({ dayLog: { [TODAY]: { planned: 3, done: 0 } } }));
    expect(checks()).toHaveLength(5);
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'SET_DAY_PLAN', day: TODAY }));
  });

  it('le toast Annuler disparaît dès qu’une autre action (apprentissage) est dispatchée', () => {
    const { dispatch } = setup(baseState());
    fireEvent.click(checks()[0]);
    expect(screen.getByRole('status')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: "J'ai appris ce thumun" }));
    fireEvent.click(screen.getByRole('button', { name: '3' }));
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'LEARN' }));
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Annuler' })).toBeNull();
  });

  it('le toast reflète la dernière validation (deux ✓ successifs)', () => {
    setup(baseState());
    const [b0, b1] = checks();
    fireEvent.click(b0);
    fireEvent.click(b1);
    expect(screen.getAllByRole('status')).toHaveLength(1);
    expect(screen.getByRole('status')).toHaveTextContent(`Hizb ${b1.getAttribute('data-hizb')} validé`);
  });

  it('garde le plan du jour après remontage même si des ciblés non urgents restent à faire', () => {
    // 40 hizbs de base + 2 ciblés échus non urgents (urgencyDays 30) : le plan frais change dès qu'on relit des hizbs.
    const initial = {
      ...makeState({
        acquis: Array.from({ length: 40 }, (_, i) => i + 1),
        cible: {
          'H50-T1': { scores: [{ date: '2026-10-20', score: 4 }], interval: 3, due: TODAY },
          'H51-T1': { scores: [{ date: '2026-10-20', score: 4 }], interval: 3, due: TODAY },
        },
        params: { urgencyDays: 30 },
      }),
      lastBackup: TODAY,
    };
    const api = {};
    const first = render(<Harness initial={initial} api={api} />);
    const listOf = () => screen.getAllByRole('button', { name: /tout va bien/ }).map((b) => b.getAttribute('aria-label'));
    const before = listOf();
    for (let i = 0; i < 3; i += 1) {
      fireEvent.click(screen.getAllByRole('button', { name: /tout va bien/ }).filter((b) => !b.disabled && !b.getAttribute('aria-pressed'))[i] ?? checks()[i]);
    }
    const afterReviews = listOf();
    first.unmount();
    render(<Harness initial={api.state} api={api} />);
    expect(listOf()).toEqual(afterReviews);
    expect(afterReviews).toHaveLength(before.length);
    expect(api.state.dayLog[TODAY].hizbs).toEqual(api.state.dayLog[TODAY].cards.map((c) => c.hizb));
  });
});
