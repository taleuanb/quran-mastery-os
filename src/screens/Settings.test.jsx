import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within, waitFor } from '@testing-library/react';
import Settings from './Settings';
import { makeRefs, makeState } from '../test/fixtures';
import { exportState } from '../store/storage';

const TODAY = '2026-10-25';
const refs = makeRefs();

function setup(state = makeState({ acquis: [1] })) {
  const dispatch = vi.fn();
  render(<Settings state={state} dispatch={dispatch} refs={refs} today={TODAY} />);
  return dispatch;
}
const click = (name) => fireEvent.click(screen.getByRole('button', { name }));
const readBlob = (blob) => new Promise((resolve) => {
  const r = new FileReader();
  r.onload = () => resolve(r.result);
  r.readAsText(blob);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('Settings : paramètres', () => {
  it('« + » sur le quota envoie SET_PARAMS {dailyReviewHizbs: 6}', () => {
    const dispatch = setup();
    click('Augmenter : Hizbs de révision par jour');
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_PARAMS', patch: { dailyReviewHizbs: 6 } });
  });

  it('les pas à pas respectent leurs bornes', () => {
    const dispatch = setup(makeState({ params: { dailyReviewHizbs: 12, dailyNewThumuns: 0, maxInterval: 7 } }));
    expect(screen.getByRole('button', { name: 'Augmenter : Hizbs de révision par jour' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Diminuer : Nouveaux thumuns par jour' })).toBeDisabled();
    expect(screen.getByRole('button', { name: "Diminuer : Plafond d'intervalle" })).toBeDisabled();
    click('Augmenter : Nouveaux thumuns par jour');
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_PARAMS', patch: { dailyNewThumuns: 1 } });
  });

  it('la rotation de base se règle en 1× ou 2× par mois', () => {
    const dispatch = setup();
    click('1× / mois');
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_PARAMS', patch: { baseRotationPerMonth: 1 } });
    expect(screen.getByRole('button', { name: '2× / mois' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('7 bascules de jours de repos', () => {
    const dispatch = setup();
    const group = screen.getByRole('group', { name: 'Jours sans apprentissage' });
    expect(within(group).getAllByRole('button')).toHaveLength(7);
    expect(within(group).getByRole('button', { name: 'Jeu' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(within(group).getByRole('button', { name: 'Lun' }));
    expect(dispatch).toHaveBeenLastCalledWith({ type: 'SET_PARAMS', patch: { restDays: [1, 4, 6] } });
    fireEvent.click(within(group).getByRole('button', { name: 'Jeu' }));
    expect(dispatch).toHaveBeenLastCalledWith({ type: 'SET_PARAMS', patch: { restDays: [6] } });
  });

  it('la section Avancé est repliée, puis envoie les objets imbriqués fusionnés', () => {
    const dispatch = setup();
    expect(screen.queryByText('Multiplicateur note 5')).toBeNull();
    const toggle = screen.getByRole('button', { name: /Avancé/ });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');

    click('Augmenter : Multiplicateur note 5');
    expect(dispatch).toHaveBeenLastCalledWith({ type: 'SET_PARAMS', patch: { multipliers: { 5: 2.6, 4: 2, 3: 1.3 } } });
    click('Augmenter : Retour de la note 1 (jours)');
    expect(dispatch).toHaveBeenLastCalledWith({ type: 'SET_PARAMS', patch: { resetDays: { 2: 2, 1: 2 } } });
    click('Augmenter : Heure de changement de jour');
    expect(dispatch).toHaveBeenLastCalledWith({ type: 'SET_PARAMS', patch: { rolloverHour: 5 } });
    click('Diminuer : Rappel de sauvegarde (jours)');
    expect(dispatch).toHaveBeenLastCalledWith({ type: 'SET_PARAMS', patch: { backupReminderDays: 6 } });
  });

  it('le compteur khatma envoie KHATMA_INC', () => {
    const state = makeState();
    state.khatma = 3;
    const dispatch = setup(state);
    click('Ajouter une khatma');
    expect(dispatch).toHaveBeenCalledWith({ type: 'KHATMA_INC' });
  });
});

describe('Settings : sauvegarde', () => {
  let anchors;
  let blobs;
  beforeEach(() => {
    anchors = [];
    blobs = [];
    globalThis.URL.createObjectURL = vi.fn((b) => { blobs.push(b); return 'blob:qmos'; });
    globalThis.URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function click() { anchors.push(this); });
  });

  it('Exporter télécharge qmos-AAAA-MM-JJ.json sans _undo puis envoie MARK_BACKUP', async () => {
    const state = { ...makeState({ acquis: [1] }), _undo: { thumuns: {}, journal: [], dayLog: {} } };
    const dispatch = setup(state);
    click('Exporter');
    expect(anchors).toHaveLength(1);
    expect(anchors[0].download).toBe('qmos-2026-10-25.json');
    expect(anchors[0].getAttribute('href')).toBe('blob:qmos');
    const text = await readBlob(blobs[0]);
    expect(JSON.parse(text)._undo).toBeUndefined();
    const { _undo, ...clean } = state;
    expect(text).toBe(exportState(clean));
    expect(dispatch).toHaveBeenCalledWith({ type: 'MARK_BACKUP', day: TODAY });
  });

  it('affiche la dernière sauvegarde', () => {
    const state = makeState();
    state.lastBackup = '2026-10-22';
    setup(state);
    expect(screen.getByText(/2026-10-22/)).toBeInTheDocument();
  });

  it('fichier invalide : message en français, aucun IMPORT', async () => {
    const dispatch = setup();
    fireEvent.change(screen.getByLabelText('Fichier de sauvegarde'), {
      target: { files: [new File(['pas du json'], 'x.json', { type: 'application/json' })] },
    });
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Fichier illisible');
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('fichier valide : confirmation dans la page puis IMPORT', async () => {
    const imported = makeState({ acquis: [3, 4] });
    const dispatch = setup();
    fireEvent.change(screen.getByLabelText('Fichier de sauvegarde'), {
      target: { files: [new File([exportState(imported)], 'qmos.json', { type: 'application/json' })] },
    });
    await screen.findByText(/Remplacer toutes les données/);
    expect(dispatch).not.toHaveBeenCalled();
    click('Remplacer');
    expect(dispatch).toHaveBeenCalledWith({ type: 'IMPORT', state: imported });
  });

  it('annuler la confirmation ne dispatche rien', async () => {
    const dispatch = setup();
    fireEvent.change(screen.getByLabelText('Fichier de sauvegarde'), {
      target: { files: [new File([exportState(makeState())], 'qmos.json')] },
    });
    await screen.findByText(/Remplacer toutes les données/);
    click('Annuler');
    await waitFor(() => expect(screen.queryByText(/Remplacer toutes les données/)).toBeNull());
    expect(dispatch).not.toHaveBeenCalled();
  });
});

describe('Settings : liste d\'apprentissage', () => {
  it('ajoute un thumun choisi par hizb puis thumun', () => {
    const state = makeState();
    state.learnQueue = ['H02-T1'];
    const dispatch = setup(state);
    fireEvent.change(screen.getByLabelText('Hizb'), { target: { value: '7' } });
    fireEvent.change(screen.getByLabelText('Thumun'), { target: { value: '3' } });
    click('Ajouter');
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_LEARN_QUEUE', ids: ['H02-T1', 'H07-T3'] });
  });

  it('monte, descend et retire', () => {
    const state = makeState();
    state.learnQueue = ['H02-T1', 'H03-T2', 'H04-T3'];
    const dispatch = setup(state);
    expect(screen.getByRole('button', { name: 'Monter H02-T1' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Descendre H04-T3' })).toBeDisabled();
    click('Monter H03-T2');
    expect(dispatch).toHaveBeenLastCalledWith({ type: 'SET_LEARN_QUEUE', ids: ['H03-T2', 'H02-T1', 'H04-T3'] });
    click('Descendre H03-T2');
    expect(dispatch).toHaveBeenLastCalledWith({ type: 'SET_LEARN_QUEUE', ids: ['H02-T1', 'H04-T3', 'H03-T2'] });
    click('Retirer H03-T2');
    expect(dispatch).toHaveBeenLastCalledWith({ type: 'SET_LEARN_QUEUE', ids: ['H02-T1', 'H04-T3'] });
  });

  it('un thumun déjà en liste ne peut pas être ajouté deux fois', () => {
    const state = makeState();
    state.learnQueue = ['H01-T1'];
    setup(state);
    expect(screen.getByRole('button', { name: 'Ajouter' })).toBeDisabled();
  });
});

describe('Settings : historique', () => {
  const entry = (i, score) => ({
    id: `2026-10-${String(i).padStart(2, '0')}-${i}`, date: `2026-10-${String(i).padStart(2, '0')}`,
    thumunId: `H0${(i % 5) + 1}-T${(i % 8) + 1}`, pilier: 'revision', score, source: 'base',
  });

  it('liste les 20 dernières entrées, la plus récente en premier', () => {
    const state = makeState({ acquis: [1] });
    state.journal = Array.from({ length: 25 }, (_, i) => entry(i + 1, 4));
    setup(state);
    const rows = within(screen.getByRole('list', { name: 'Historique' })).getAllByRole('listitem');
    expect(rows).toHaveLength(20);
    expect(rows[0]).toHaveTextContent('2026-10-25');
    expect(rows[19]).toHaveTextContent('2026-10-06');
  });

  it('toucher une entrée ouvre les pastilles ; choisir une note envoie EDIT_ENTRY', () => {
    const state = makeState({ acquis: [1] });
    state.journal = [entry(3, 4)];
    const dispatch = setup(state);
    fireEvent.click(within(screen.getByRole('list', { name: 'Historique' })).getByRole('button'));
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: '2' }));
    expect(dispatch).toHaveBeenCalledWith({ type: 'EDIT_ENTRY', entryId: '2026-10-03-3', score: 2 });
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
