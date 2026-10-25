import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, within, cleanup } from '@testing-library/react';
import Agenda from './Agenda';
import { makeRefs, makeState } from '../test/fixtures';
import { addDays } from '../domain/dates';
import { regularity } from '../domain/stats';

afterEach(cleanup);

const TODAY = '2026-10-25'; // dimanche
const refs = makeRefs();
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

/** 30 hizbs acquis, H28-T1 en ciblé dû dans 3 jours : visible en « ciblé » à J+3. */
function futureCibleState(extra = {}) {
  const state = makeState({
    acquis: range(1, 30),
    cible: {
      'H28-T1': {
        due: addDays(TODAY, 3),
        interval: 3,
        scores: [{ date: TODAY, score: 2 }],
        lastReviewed: TODAY,
      },
    },
  });
  return { ...state, ...extra };
}

function renderAgenda(state, props = {}) {
  const dispatch = vi.fn();
  const utils = render(<Agenda state={state} dispatch={dispatch} refs={refs} today={TODAY} {...props} />);
  return { dispatch, ...utils };
}

const rows = (container) => [...container.querySelectorAll('.day')];

describe('Agenda, vue semaine', () => {
  it('affiche 7 lignes de jours et la mention sur le ciblé', () => {
    const { container } = renderAgenda(futureCibleState());
    expect(rows(container)).toHaveLength(7);
    expect(
      screen.getByText("Le ciblé dépend de vos notes : il peut changer d'ici là. La base ne bouge pas."),
    ).toBeInTheDocument();
  });

  it('les puces ciblées des jours futurs ont la classe g (pointillé), les bases la classe b', () => {
    const { container } = renderAgenda(futureCibleState());
    const day = rows(container)[3]; // J+3
    const g = day.querySelectorAll('.c.g');
    expect(g.length).toBeGreaterThan(0);
    expect([...g].map((el) => el.textContent)).toContain('28');
    expect(g[0].classList.contains('solid')).toBe(false);
    expect(day.querySelectorAll('.c.b').length).toBeGreaterThan(0);
    // les puces ne contiennent que des numéros
    for (const el of day.querySelectorAll('.c.b, .c.g')) expect(el.textContent).toMatch(/^\d+$/);
  });

  it("affiche la puce d'apprentissage « hizb·thumun/8 » et « repos apprentissage » les jeudis et samedis", () => {
    const { container } = renderAgenda(futureCibleState());
    const rs = rows(container);
    // dimanche (aujourd'hui) : premier thumun non acquis = H31-T1
    expect(rs[0].querySelector('.c.l').textContent).toBe('31·1/8');
    // jeudi 29 = J+4, samedi 31 = J+6
    expect(within(rs[4]).getByText('repos apprentissage')).toBeInTheDocument();
    expect(within(rs[6]).getByText('repos apprentissage')).toBeInTheDocument();
    expect(rs[4].querySelector('.c.l')).toBeNull();
    expect(rs[1].querySelector('.c.l')).not.toBeNull();
  });

  it("aujourd'hui affiche done/planned lu dans dayLog", () => {
    const state = futureCibleState({ dayLog: { [TODAY]: { planned: 5, done: 2 } } });
    const { container } = renderAgenda(state);
    const today = rows(container)[0];
    expect(today.classList.contains('today')).toBe(true);
    expect(within(today).getByText('2/5')).toBeInTheDocument();
  });

  it('les jours futurs affichent le nombre de hizbs prévus', () => {
    const { container } = renderAgenda(futureCibleState());
    const day = rows(container)[2];
    expect(day.querySelector('.ds .n').textContent).toBe('5');
  });

  it('totaux : hizbs sur 7 jours, thumuns à apprendre, régularité en %', () => {
    const dayLog = {};
    for (let i = 1; i <= 30; i++) dayLog[addDays(TODAY, -i)] = i <= 15 ? { planned: 5, done: 5 } : { planned: 5, done: 0 };
    const state = futureCibleState({ dayLog });
    const { container } = renderAgenda(state);
    const sums = container.querySelector('.sums');
    const values = [...sums.querySelectorAll('b')].map((b) => b.textContent);
    expect(values[0]).toBe('35'); // 5 hizbs x 7 jours
    expect(values[1]).toBe('5'); // 7 jours - 2 repos (jeudi, samedi)
    expect(values[2]).toBe(`${Math.round(regularity(dayLog, TODAY) * 100)}%`);
    expect(values[2]).toBe('50%');
  });

  it('la bande compte 7 jours', () => {
    const { container } = renderAgenda(futureCibleState());
    expect(container.querySelectorAll('.strip .sd')).toHaveLength(7);
  });

  it('semaine précédente : jours passés lus dans dayLog et le journal, pas dans la prévision', () => {
    const d = (n) => addDays(TODAY, n);
    const state = futureCibleState({
      dayLog: {
        [d(-1)]: { planned: 5, done: 5 },
        [d(-2)]: { planned: 5, done: 3 },
        [d(-3)]: { planned: 5, done: 0 },
      },
      journal: [
        { id: 'a', date: d(-1), thumunId: 'H04-T1', pilier: 'revision', score: 4, source: 'base' },
        { id: 'b', date: d(-1), thumunId: 'H04-T2', pilier: 'revision', score: 4, source: 'base' },
        { id: 'c', date: d(-1), thumunId: 'H07-T1', pilier: 'revision', score: 4, source: 'cible' },
        { id: 'd', date: d(-1), thumunId: 'H26-T2', pilier: 'hifdh', score: 4, source: 'hifdh' },
      ],
    });
    const { container } = renderAgenda(state);
    fireEvent.click(screen.getByRole('button', { name: 'Semaine précédente' }));
    const rs = rows(container);
    expect(rs).toHaveLength(7);
    expect(rs.every((r) => r.classList.contains('past'))).toBe(true);
    const last = rs[6]; // J-1
    expect([...last.querySelectorAll('.c.b')].map((e) => e.textContent)).toEqual(['4']);
    const g = last.querySelectorAll('.c.g');
    expect([...g].map((e) => e.textContent)).toEqual(['7']);
    expect(g[0].classList.contains('solid')).toBe(true);
    expect(last.querySelector('.c.l').textContent).toBe('26·2/8');
    expect(last.querySelector('.ds .ok')).not.toBeNull();
    expect(rs[5].querySelector('.ds .pt').textContent).toBe('3/5');
    expect(rs[4].querySelector('.ds .mi')).not.toBeNull();
    // un jour sans journal : aucune puce de hizb
    expect(rs[0].querySelectorAll('.c.b, .c.g')).toHaveLength(0);
  });

  it('flèche suivante puis précédente revient à la semaine courante', () => {
    const { container } = renderAgenda(futureCibleState());
    fireEvent.click(screen.getByRole('button', { name: 'Semaine suivante' }));
    expect(rows(container)[0].querySelector('.dl span').textContent).toBe('1');
    fireEvent.click(screen.getByRole('button', { name: 'Semaine précédente' }));
    expect(rows(container)[0].classList.contains('today')).toBe(true);
  });

  it('toucher un jour ouvre le détail avec le nom, la sourate et le type de chaque hizb', () => {
    const { container } = renderAgenda(futureCibleState());
    fireEvent.click(rows(container)[3]);
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('ciblé')).toBeInTheDocument();
    expect(within(dialog).getAllByText('base').length).toBeGreaterThan(0);
    expect(within(dialog).getAllByText('HIZB').length).toBeGreaterThanOrEqual(5);
    expect(within(dialog).getByText('28')).toBeInTheDocument();
    expect(within(dialog).getByText('apprendre')).toBeInTheDocument();
    expect(within(dialog).getByText(/prévision/)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Fermer' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('Agenda, vue mois', () => {
  it('octobre 2026 : 31 cellules, la première dans la colonne jeudi (lundi en premier)', () => {
    const { container } = renderAgenda(futureCibleState());
    fireEvent.click(screen.getByRole('button', { name: 'Mois' }));
    const cal = container.querySelector('.cal');
    const days = cal.querySelectorAll('.mc:not(.off)');
    expect(days).toHaveLength(31);
    const kids = [...cal.children];
    const heads = kids.filter((k) => k.classList.contains('wd')).map((k) => k.textContent);
    expect(heads).toEqual(['L', 'M', 'M', 'J', 'V', 'S', 'D']);
    const firstIndex = kids.indexOf(days[0]);
    expect(firstIndex % 7).toBe(3);
    expect(heads[firstIndex % 7]).toBe('J');
    expect(screen.getByText('Octobre 2026')).toBeInTheDocument();
  });

  it('jours passés colorés complet / partiel / manqué, jours futurs avec barre de charge', () => {
    const state = futureCibleState({
      dayLog: {
        '2026-10-24': { planned: 5, done: 5 },
        '2026-10-23': { planned: 5, done: 2 },
      },
    });
    const { container } = renderAgenda(state);
    fireEvent.click(screen.getByRole('button', { name: 'Mois' }));
    const cell = (n) => [...container.querySelectorAll('.mc:not(.off)')][n - 1];
    expect(cell(24).classList.contains('done')).toBe(true);
    expect(cell(23).classList.contains('part')).toBe(true);
    expect(cell(22).classList.contains('miss')).toBe(true);
    expect(cell(25).classList.contains('today')).toBe(true);
    expect(cell(28).querySelector('.ld')).not.toBeNull();
    expect(cell(24).querySelector('.ld')).toBeNull();
  });

  it('totaux du mois : série, % de jours complets, cycle (— si inconnu)', () => {
    const dayLog = {};
    for (let d = 1; d <= 24; d++) {
      const day = `2026-10-${String(d).padStart(2, '0')}`;
      dayLog[day] = d <= 12 ? { planned: 5, done: 5 } : { planned: 5, done: 0 };
    }
    const { container } = renderAgenda(futureCibleState({ dayLog }));
    fireEvent.click(screen.getByRole('button', { name: 'Mois' }));
    const values = [...container.querySelectorAll('.sums b')].map((b) => b.textContent);
    expect(values[1]).toBe('50%'); // 12 jours complets sur 24 jours passés
    expect(values[2]).toBe('—');
  });

  it('toucher un jour du mois ouvre le détail ; mois suivant avance', () => {
    const { container } = renderAgenda(futureCibleState());
    fireEvent.click(screen.getByRole('button', { name: 'Mois' }));
    fireEvent.click([...container.querySelectorAll('.mc:not(.off)')][27]);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Fermer' }));
    fireEvent.click(screen.getByRole('button', { name: 'Mois suivant' }));
    expect(screen.getByText('Novembre 2026')).toBeInTheDocument();
    expect(container.querySelectorAll('.mc:not(.off)')).toHaveLength(30);
  });
});
