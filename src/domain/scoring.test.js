import { describe, it, expect } from 'vitest';
import { applyScore, learnThumun, difficulty } from './scoring.js';
import { DEFAULT_PARAMS as P } from './params.js';
import { addDays } from './dates.js';

const DAY = '2026-10-25';
const hist = (...scores) => scores.map((score) => ({ date: '2026-10-01', score }));
const cible = (over = {}) => ({
  status: 'acquis', track: 'cible', scores: hist(3, 4), lastReviewed: '2026-10-15',
  interval: 10, due: '2026-10-25', risk: false, fragileInitial: false, ...over,
});
const base = (over = {}) => ({
  status: 'acquis', track: 'base', scores: hist(3), lastReviewed: '2026-10-01',
  interval: 0, due: null, risk: false, fragileInitial: false, ...over,
});

describe('applyScore - thumun ciblé', () => {
  it('note 5 : intervalle x2.5', () => {
    expect(applyScore(cible(), 5, DAY, P).interval).toBe(25);
  });
  it('note 4 : intervalle x2', () => {
    expect(applyScore(cible(), 4, DAY, P).interval).toBe(20);
  });
  it('note 3 : intervalle x1.3 arrondi, due = jour + intervalle', () => {
    const r = applyScore(cible(), 3, DAY, P);
    expect(r.interval).toBe(13);
    expect(r.track).toBe('cible');
    expect(r.due).toBe(addDays(DAY, 13));
  });
  it('note 2 : retour à 2 jours', () => {
    const r = applyScore(cible(), 2, DAY, P);
    expect(r.interval).toBe(2);
    expect(r.due).toBe(addDays(DAY, 2));
    expect(r.risk).toBe(false);
  });
  it('note 1 : 1 jour et risk', () => {
    const r = applyScore(cible(), 1, DAY, P);
    expect(r.interval).toBe(1);
    expect(r.risk).toBe(true);
    expect(r.due).toBe(addDays(DAY, 1));
  });
  it('une note >= 3 remet risk à false', () => {
    expect(applyScore(cible({ risk: true }), 3, DAY, P).risk).toBe(false);
    expect(applyScore(cible({ risk: true }), 2, DAY, P).risk).toBe(true);
  });
  it('ajoute la note et met lastReviewed à jour', () => {
    const r = applyScore(cible(), 3, DAY, P);
    expect(r.scores).toEqual([...hist(3, 4), { date: DAY, score: 3 }]);
    expect(r.lastReviewed).toBe(DAY);
  });
  it('plafond maxInterval', () => {
    expect(applyScore(cible({ interval: 20 }), 5, DAY, P).interval).toBe(30);
  });
  it('plafond difficile (hardMaxInterval)', () => {
    const r = applyScore(cible({ scores: hist(2, 2) }), 5, DAY, P);
    expect(r.interval).toBe(7);
    expect(r.track).toBe('cible');
    expect(r.due).toBe(addDays(DAY, 7));
  });
  it('sortie vers la base : deux dernières notes >= 4 et intervalle >= 7', () => {
    const r = applyScore(cible({ interval: 4, scores: hist(3, 4) }), 4, DAY, P);
    expect(r.interval).toBe(8);
    expect(r.track).toBe('base');
    expect(r.due).toBeNull();
  });
  it('pas de sortie si le nouvel intervalle est < 7', () => {
    const r = applyScore(cible({ interval: 2, scores: hist(3, 4) }), 4, DAY, P);
    expect(r.interval).toBe(4);
    expect(r.track).toBe('cible');
  });
  it('pas de sortie si la note précédente est < 4', () => {
    const r = applyScore(cible({ scores: hist(4, 3) }), 5, DAY, P);
    expect(r.track).toBe('cible');
  });
  it('les notes 5 et 4 sur [3,4] sortent vers la base avec leur intervalle', () => {
    for (const [s, i] of [[5, 25], [4, 20]]) {
      const r = applyScore(cible(), s, DAY, P);
      expect(r.interval).toBe(i);
      expect(r.track).toBe('base');
      expect(r.due).toBeNull();
    }
  });
  it("est pur : ne modifie pas l'entrée", () => {
    const t = cible();
    const snapshot = JSON.parse(JSON.stringify(t));
    applyScore(t, 5, DAY, P);
    expect(t).toEqual(snapshot);
  });
});

describe('applyScore - thumun de base', () => {
  it('note 4 : reste en base, lastReviewed mis à jour, due null', () => {
    const r = applyScore(base(), 4, DAY, P);
    expect(r.track).toBe('base');
    expect(r.lastReviewed).toBe(DAY);
    expect(r.due).toBeNull();
    expect(r.interval).toBe(0);
    expect(r.scores).toHaveLength(2);
  });
  it('note 3 : passe en cible avec intervalle 4', () => {
    const r = applyScore(base(), 3, DAY, P);
    expect(r.track).toBe('cible');
    expect(r.interval).toBe(4);
    expect(r.due).toBe(addDays(DAY, 4));
  });
  it('note 1 : passe en cible, 1 jour, risk', () => {
    const r = applyScore(base(), 1, DAY, P);
    expect(r.track).toBe('cible');
    expect(r.interval).toBe(1);
    expect(r.risk).toBe(true);
  });
  it('note >= 4 sur une base avec risk le remet à false', () => {
    expect(applyScore(base({ risk: true }), 5, DAY, P).risk).toBe(false);
  });
  it('est pur : ne modifie pas scores', () => {
    const t = base();
    applyScore(t, 3, DAY, P);
    expect(t.scores).toHaveLength(1);
    expect(t.track).toBe('base');
  });
});

describe('difficulty', () => {
  const d = (...s) => difficulty({ scores: hist(...s) });
  it('difficile : deux notes <= 2 sur les 5 dernières', () => {
    expect(d(1, 2, 4, 4, 4)).toBe('difficile');
  });
  it('difficile : moyenne < 3', () => {
    expect(d(3, 3, 2)).toBe('difficile');
  });
  it('facile : 3 dernières >= 4', () => {
    expect(d(3, 4, 5, 4)).toBe('facile');
  });
  it('moyen sinon', () => {
    expect(d(3, 3, 4)).toBe('moyen');
  });
  it('facile impossible avec moins de 3 notes', () => {
    expect(d(5, 5)).toBe('moyen');
  });
  it('ne regarde que les 5 dernières notes', () => {
    expect(d(1, 1, 1, 4, 4, 4, 4, 4)).toBe('facile');
  });
  it('les notes seed comptent comme les autres', () => {
    expect(difficulty({ scores: [{ date: DAY, score: 4, seed: true }, ...hist(4, 4)] })).toBe('facile');
  });
  it('historique vide : moyen', () => {
    expect(difficulty({ scores: [] })).toBe('moyen');
  });
});

describe('learnThumun', () => {
  it('non acquis noté 4 : acquis, ciblé, intervalle 6', () => {
    const t = { status: 'non_acquis', track: null, scores: [], lastReviewed: null, interval: 0, due: null, risk: false, fragileInitial: false };
    const r = learnThumun(t, 4, DAY, P);
    expect(r.status).toBe('acquis');
    expect(r.track).toBe('cible');
    expect(r.interval).toBe(6);
    expect(r.due).toBe(addDays(DAY, 6));
    expect(r.scores).toEqual([{ date: DAY, score: 4 }]);
    expect(t.status).toBe('non_acquis');
  });
});
