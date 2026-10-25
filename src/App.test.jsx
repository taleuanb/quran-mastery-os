import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import App, { hasPendingHizbs } from './App';
import { makeRefs, makeState } from './test/fixtures';

const TODAY = '2026-10-25';
const refs = makeRefs();
const withLog = (acquis, log) => {
  const s = makeState({ acquis });
  s.dayLog = log ? { [TODAY]: log } : {};
  return s;
};

describe('badge de l’onglet Aujourd’hui', () => {
  it('planned 5, done 2 : badge', () => {
    expect(hasPendingHizbs(withLog([1, 2, 3], { planned: 5, done: 2 }), TODAY, refs)).toBe(true);
  });
  it('planned 5, done 5 : pas de badge', () => {
    expect(hasPendingHizbs(withLog([1, 2, 3], { planned: 5, done: 5 }), TODAY, refs)).toBe(false);
  });
  it('dayLog absent avec acquis : badge (repli sur le plan)', () => {
    expect(hasPendingHizbs(withLog([1, 2, 3], null), TODAY, refs)).toBe(true);
  });
  it('dayLog absent sans acquis : pas de badge', () => {
    expect(hasPendingHizbs(withLog([], null), TODAY, refs)).toBe(false);
  });
});

describe('App : échec d’enregistrement', () => {
  let orig;
  beforeEach(() => {
    localStorage.clear();
    orig = Storage.prototype.setItem;
  });
  afterEach(() => {
    Storage.prototype.setItem = orig;
    cleanup();
  });

  it('pas de bandeau quand l’enregistrement réussit', () => {
    render(<App />);
    expect(screen.queryByText(/Impossible d'enregistrer/)).toBeNull();
  });

  it('bandeau persistant quand localStorage refuse l’écriture', () => {
    Storage.prototype.setItem = () => { throw new Error('quota'); };
    render(<App />);
    const banner = screen.getByRole('alert');
    expect(banner).toHaveTextContent("Impossible d'enregistrer sur cet appareil : exportez vos données dans Réglages.");
    fireEvent.click(screen.getByRole('button', { name: 'Agenda' }));
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});
