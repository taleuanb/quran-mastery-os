import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import Stats from './Stats';
import { makeRefs, makeState } from '../test/fixtures';
import { hizbInfo } from '../domain/referential';

afterEach(cleanup);

const TODAY = '2026-10-25';
const refs = makeRefs();
const cells = () => screen.getAllByRole('img', { name: /^Hizb \d+ ·/ });

describe('Stats', () => {
  it('affiche 60 cases de carte, chacune avec numéro et nom du hizb', () => {
    render(<Stats state={makeState({ acquis: [1, 2] })} refs={refs} today={TODAY} />);
    expect(cells()).toHaveLength(60);
    expect(cells()[4]).toHaveAttribute('aria-label', expect.stringContaining(`Hizb 5 · ${hizbInfo(5).hizbName}`));
  });

  it('chiffres clés : cycle « — » sans révision, objectif 30 / rotation, difficiles et série', () => {
    render(<Stats state={makeState({ acquis: [1] })} refs={refs} today={TODAY} />);
    const cycle = screen.getByText(/cycle de base/);
    expect(cycle).toHaveTextContent('objectif 15');
    expect(within(cycle.closest('.card')).getByText('—')).toBeInTheDocument();
    expect(screen.getByText('thumuns difficiles').closest('.card')).toHaveTextContent('0');
    expect(screen.getByText('série en cours').closest('.card')).toHaveTextContent('0 j');
  });

  it("l'objectif suit baseRotationPerMonth", () => {
    render(<Stats state={makeState({ params: { baseRotationPerMonth: 1 } })} refs={refs} today={TODAY} />);
    expect(screen.getByText(/cycle de base/)).toHaveTextContent('objectif 30');
  });

  it('cycle réel affiché quand des révisions de base existent', () => {
    const state = makeState({ acquis: [1, 2, 3, 4] });
    state.journal = [1, 2, 3, 4, 5, 6, 7].map((i) => ({
      id: `e${i}`, date: `2026-10-${String(10 + i).padStart(2, '0')}`, thumunId: `H0${(i % 4) + 1}-T1`,
      pilier: 'revision', score: 4, source: 'base',
    }));
    render(<Stats state={state} refs={refs} today={TODAY} />);
    expect(screen.getByText(/cycle de base/).closest('.card')).toHaveTextContent(/^8 j/);
  });

  it('carte en solidité : couleur de la note arrondie, vide si aucun acquis', () => {
    render(<Stats state={makeState({ acquis: [1] })} refs={refs} today={TODAY} />); // note 3 posée
    expect(cells()[0].style.getPropertyValue('--c')).toBe('var(--s3)');
    expect(cells()[1].style.getPropertyValue('--c')).toBe('');
  });

  it('bascule en ancienneté : ≤ 7 j s4, ≤ 20 j s3, > 20 j s1, vide sinon', () => {
    const state = makeState({ acquis: [1, 2, 3] });
    const reviewed = { 1: '2026-10-20', 2: '2026-10-10', 3: '2026-09-01' }; // 5 j, 15 j, 55 j
    for (const h of [1, 2, 3]) for (let n = 1; n <= 8; n++) state.thumuns[`H0${h}-T${n}`].lastReviewed = reviewed[h];
    render(<Stats state={state} refs={refs} today={TODAY} />);
    fireEvent.click(screen.getByRole('button', { name: 'Ancienneté' }));
    const c = cells().map((el) => el.style.getPropertyValue('--c'));
    expect(c.slice(0, 4)).toEqual(['var(--s4)', 'var(--s3)', 'var(--s1)', '']);
    expect(screen.getByRole('button', { name: 'Ancienneté' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('liste des fragiles : pastille avec la dernière note, tendance et hizb', () => {
    const state = makeState({
      cible: {
        'H05-T3': { scores: [{ date: '2026-10-20', score: 4 }, { date: '2026-10-24', score: 1 }] },
        'H07-T2': { scores: [{ date: '2026-10-20', score: 2 }, { date: '2026-10-24', score: 5 }] },
      },
    });
    render(<Stats state={state} refs={refs} today={TODAY} />);
    const list = screen.getByRole('list', { name: '10 thumuns les plus fragiles' });
    const rows = within(list).getAllByRole('listitem');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent('5');
    const pill = rows[0].querySelector('.pill');
    expect(pill).toHaveAttribute('data-s', '1');
    expect(pill).toHaveTextContent('1');
    const trend = within(rows[0]).getByLabelText('en baisse');
    expect(trend).toHaveTextContent('↘');
    expect(trend).toHaveClass('txt-s1');
    expect(within(rows[1]).getByLabelText('en progression')).toHaveClass('txt-s4');
  });

  it('répartition : compte les thumuns par difficulté', () => {
    render(<Stats state={makeState({ acquis: [1] })} refs={refs} today={TODAY} />);
    expect(screen.getByText('8 thumuns')).toBeInTheDocument();
    expect(screen.getByText(/^Difficile \d+$/)).toBeInTheDocument();
    expect(screen.getByText(/^Moyen \d+$/)).toBeInTheDocument();
    expect(screen.getByText(/^Facile \d+$/)).toBeInTheDocument();
  });
});
