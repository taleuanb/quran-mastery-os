import React, { useState } from 'react';
import { loadRefs } from './domain/referential';
import { buildDailyPlan } from './domain/plan';
import { useAppStore } from './store/useAppStore';
import TabBar from './ui/components/TabBar';
import Today from './screens/Today';
import Agenda from './screens/Agenda';
import Acquis from './screens/Acquis';
import Stats from './screens/Stats';
import Settings from './screens/Settings';

const SCREENS = { today: Today, agenda: Agenda, acquis: Acquis, stats: Stats, settings: Settings };

const refs = loadRefs();
/**
 * Badge de l'onglet Aujourd'hui : même source de vérité que l'écran (state.dayLog[today], tenu à jour
 * par Today : SET_PLANNED, REVIEW_HIZB). Repli sur le plan du jour tant que Today n'a rien écrit.
 */
export function hasPendingHizbs(state, today, refsList = refs) {
  const log = state.dayLog[today];
  if (log) return log.planned > 0 && log.done < log.planned;
  return buildDailyPlan(state, refsList, today, state.params).hizbs.length > 0;
}

export default function App() {
  const { state, dispatch, today } = useAppStore(refs);
  const [tab, setTab] = useState('today');
  const pending = hasPendingHizbs(state, today);
  // Un seul écran monté à la fois : un toast « Annuler » ne survit pas à un changement d'onglet.
  const Screen = SCREENS[tab];

  return (
    <>
      <main className="app">
        <Screen state={state} dispatch={dispatch} refs={refs} today={today} onNavigate={setTab} />
      </main>
      <TabBar active={tab} onChange={setTab} badge={pending} />
    </>
  );
}
