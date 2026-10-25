import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup, within } from '@testing-library/react';
import Acquis from './Acquis';
import { makeRefs, makeState } from '../test/fixtures';
import { loadRefs } from '../domain/referential';

const TODAY = '2026-10-25';
const ids = (hizb) => Array.from({ length: 8 }, (_, i) => `H${String(hizb).padStart(2, '0')}-T${i + 1}`);
const all = (hizbs, v) => Object.fromEntries(hizbs.flatMap((h) => ids(h).map((id) => [id, v])));

function setup({ state = makeState(), refs = makeRefs() } = {}) {
  const dispatch = vi.fn();
  const utils = render(<Acquis state={state} dispatch={dispatch} refs={refs} today={TODAY} />);
  return { dispatch, ...utils };
}
const card = (h) => screen.getByTestId(`hz-${h}`);
const cards = () => screen.queryAllByTestId(/^hz-/);
const tap = (el) => { fireEvent.pointerDown(el); fireEvent.pointerUp(el); };
const longPress = (el) => { fireEvent.pointerDown(el); act(() => { vi.advanceTimersByTime(450); }); };
const bulk = () => within(screen.getByRole('toolbar'));

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

describe('Acquis : en-tête', () => {
  it('affiche hizbs acquis, thumuns sur 480, partiels et fragiles', () => {
    const state = makeState({
      acquis: [1, 2],
      cible: { 'H03-T1': { fragileInitial: true }, 'H03-T2': {} },
    });
    setup({ state });
    expect(screen.getByText('2 hizbs acquis')).toBeInTheDocument();
    expect(screen.getByText('18 thumuns sur 480')).toBeInTheDocument();
    expect(screen.getByText('1 partiels · 2 fragiles')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /4 %/ })).toBeInTheDocument();
  });
});

describe('Acquis : tap', () => {
  it('tap sur le hizb 3 : SET_ACQUIS avec 8 changements à 1', () => {
    const { dispatch } = setup();
    tap(card(3));
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_ACQUIS', changes: all([3], 1), day: TODAY });
  });

  it('tap sur un hizb entièrement acquis : les 8 thumuns repassent à 0', () => {
    const { dispatch } = setup({ state: makeState({ acquis: [3] }) });
    tap(card(3));
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_ACQUIS', changes: all([3], 0), day: TODAY });
  });

  it('tap sur un hizb partiel : tout passe à 1', () => {
    const state = makeState({ cible: { 'H03-T1': {} } });
    const { dispatch } = setup({ state });
    tap(card(3));
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_ACQUIS', changes: all([3], 1), day: TODAY });
  });

  it('Entrée au clavier bascule le hizb', () => {
    const { dispatch } = setup();
    fireEvent.keyDown(card(3), { key: 'Enter' });
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_ACQUIS', changes: all([3], 1), day: TODAY });
  });
});

describe('Acquis : recherche et filtres', () => {
  it('« يوسف » ne laisse que les hizbs dont la sourate correspond', () => {
    setup({ refs: loadRefs() });
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: ' يوسف ' } });
    expect(cards().map((c) => c.dataset.h)).toEqual(['25']);
  });

  it('un numéro de hizb ne retient que ce hizb', () => {
    setup();
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: '2' } });
    expect(cards().map((c) => c.dataset.h)).toEqual(['2']);
  });

  it('aucun résultat : message vide', () => {
    setup();
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'zzz' } });
    expect(cards()).toHaveLength(0);
    expect(screen.getByText('Aucun hizb ne correspond.')).toBeInTheDocument();
  });

  it('filtre « Fragiles » : 1 carte pour un thumun fragile', () => {
    const state = makeState({ acquis: [1, 2], cible: { 'H05-T3': { fragileInitial: true } } });
    setup({ state });
    fireEvent.click(screen.getByRole('button', { name: 'Fragiles' }));
    expect(cards().map((c) => c.dataset.h)).toEqual(['5']);
  });

  it('filtres Acquis, Partiels, Non acquis, Tous', () => {
    const state = makeState({ acquis: [1], cible: { 'H02-T1': {} } });
    setup({ state });
    fireEvent.click(screen.getByRole('button', { name: 'Acquis' }));
    expect(cards().map((c) => c.dataset.h)).toEqual(['1']);
    fireEvent.click(screen.getByRole('button', { name: 'Partiels' }));
    expect(cards().map((c) => c.dataset.h)).toEqual(['2']);
    fireEvent.click(screen.getByRole('button', { name: 'Non acquis' }));
    expect(cards()).toHaveLength(58);
    fireEvent.click(screen.getByRole('button', { name: 'Tous' }));
    expect(cards()).toHaveLength(60);
  });

  it('un thumun de la piste cible compte comme fragile (badge)', () => {
    const state = makeState({ acquis: [1], cible: { 'H01-T1': {}, 'H01-T2': {} } });
    setup({ state });
    expect(within(card(1)).getByText('2 fragiles')).toBeInTheDocument();
  });
});

describe('Acquis : appui long', () => {
  it('450 ms ouvre la feuille avec 8 lignes, sans basculer le hizb', () => {
    const { dispatch } = setup();
    longPress(card(3));
    fireEvent.pointerUp(card(3));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getAllByRole('group', { name: /Thumun/ })).toHaveLength(8);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('un mouvement avant 450 ms annule l’appui long', () => {
    const { dispatch } = setup();
    fireEvent.pointerDown(card(3));
    fireEvent.pointerMove(card(3));
    act(() => { vi.advanceTimersByTime(600); });
    fireEvent.pointerUp(card(3));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('relâcher avant 450 ms est un tap, pas une feuille', () => {
    setup();
    fireEvent.pointerDown(card(3));
    act(() => { vi.advanceTimersByTime(300); });
    fireEvent.pointerUp(card(3));
    act(() => { vi.advanceTimersByTime(600); });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('enregistrer : Non, Acquis et Fragile sur des non acquis ou acquis → un SET_ACQUIS', () => {
    const state = makeState({ cible: { 'H03-T1': {}, 'H03-T2': {} } });
    const { dispatch } = setup({ state });
    longPress(card(3));
    const rows = screen.getAllByRole('group', { name: /Thumun/ });
    fireEvent.click(within(rows[1]).getByRole('button', { name: 'Non' }));
    fireEvent.click(within(rows[4]).getByRole('button', { name: 'Acquis' }));
    fireEvent.click(within(rows[5]).getByRole('button', { name: 'Fragile' }));
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith({
      type: 'SET_ACQUIS',
      changes: { 'H03-T2': 0, 'H03-T5': 1, 'H03-T6': 2 },
      day: TODAY,
    });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('« Fragile » sur un thumun déjà acquis (base) envoie MARK_FORGOTTEN', () => {
    const { dispatch } = setup({ state: makeState({ acquis: [3] }) });
    longPress(card(3));
    const rows = screen.getAllByRole('group', { name: /Thumun/ });
    fireEvent.click(within(rows[2]).getByRole('button', { name: 'Fragile' }));
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith({ type: 'MARK_FORGOTTEN', id: 'H03-T3', day: TODAY });
  });

  it('enregistrer sans changement ne dispatche rien', () => {
    const { dispatch } = setup({ state: makeState({ acquis: [3] }) });
    longPress(card(3));
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('annuler ferme sans rien dispatcher', () => {
    const { dispatch } = setup();
    longPress(card(3));
    const rows = screen.getAllByRole('group', { name: /Thumun/ });
    fireEvent.click(within(rows[0]).getByRole('button', { name: 'Acquis' }));
    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(dispatch).not.toHaveBeenCalled();
  });
});

describe('Acquis : mode sélection', () => {
  it('hors mode, la grille laisse le défilement libre ; en mode, touch-action:none', () => {
    setup();
    const grid = screen.getByTestId('acquis-grid');
    expect(grid.style.touchAction).not.toBe('none');
    fireEvent.click(screen.getByRole('button', { name: /Mode sélection : off/ }));
    expect(grid.style.touchAction).toBe('none');
    fireEvent.click(screen.getByRole('button', { name: /Mode sélection : on/ }));
    expect(grid.style.touchAction).not.toBe('none');
  });

  it('en mode sélection, pointerdown sélectionne ; la barre dispatche un seul SET_ACQUIS', () => {
    const { dispatch } = setup();
    expect(screen.queryByRole('toolbar')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Mode sélection/ }));
    tap(card(1));
    tap(card(4));
    expect(dispatch).not.toHaveBeenCalled();
    expect(screen.getByText('2 sélectionnés')).toBeInTheDocument();
    fireEvent.click(bulk().getByRole('button', { name: 'Acquis' }));
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_ACQUIS', changes: all([1, 4], 1), day: TODAY });
    expect(screen.queryByRole('toolbar')).toBeNull();
  });

  it('« Retirer » envoie 0 pour les hizbs choisis', () => {
    const { dispatch } = setup({ state: makeState({ acquis: [1, 2] }) });
    fireEvent.click(screen.getByRole('button', { name: /Mode sélection/ }));
    tap(card(2));
    fireEvent.click(bulk().getByRole('button', { name: 'Retirer' }));
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_ACQUIS', changes: all([2], 0), day: TODAY });
  });

  it('un second pointerdown sur un hizb choisi le désélectionne', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: /Mode sélection/ }));
    tap(card(1));
    tap(card(1));
    expect(screen.queryByRole('toolbar')).toBeNull();
  });

  it('le glissement sélectionne les hizbs survolés', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: /Mode sélection/ }));
    document.elementFromPoint = vi.fn((x) => card(x === 1 ? 5 : 6));
    fireEvent.pointerDown(card(4));
    fireEvent.pointerMove(card(4), { clientX: 1, clientY: 0 });
    fireEvent.pointerMove(card(4), { clientX: 2, clientY: 0 });
    fireEvent.pointerUp(card(4));
    expect(screen.getByText('3 sélectionnés')).toBeInTheDocument();
    delete document.elementFromPoint;
  });

  it('désactiver le mode vide la sélection', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: /Mode sélection/ }));
    tap(card(1));
    fireEvent.click(screen.getByRole('button', { name: /Mode sélection : on/ }));
    expect(screen.queryByRole('toolbar')).toBeNull();
  });
});

describe('Acquis : raccourci', () => {
  it('« Hizbs 1 à 12 » : un SET_ACQUIS pour les 96 thumuns à 1', () => {
    const { dispatch } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Hizbs 1 à 12' }));
    expect(dispatch).toHaveBeenCalledTimes(1);
    const action = dispatch.mock.calls[0][0];
    expect(action.type).toBe('SET_ACQUIS');
    expect(action.day).toBe(TODAY);
    expect(Object.keys(action.changes)).toHaveLength(96);
    expect(new Set(Object.values(action.changes))).toEqual(new Set([1]));
    expect(action.changes['H12-T8']).toBe(1);
    expect(action.changes['H13-T1']).toBeUndefined();
  });
});
