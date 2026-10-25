import React, { useMemo, useState } from 'react';
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
const hizbOf = (id) => Number(id.slice(1, 3));

/** Vrai s'il reste au moins un hizb à réviser aujourd'hui (même logique que l'écran Aujourd'hui). */
function hasPendingHizbs(state, today) {
  if (!Object.values(state.thumuns).some((th) => th.status === 'acquis')) return false;
  const plan = buildDailyPlan(state, refs, today, state.params);
  const done = new Set();
  for (const e of state.journal) if (e.date === today && e.pilier === 'revision') done.add(hizbOf(e.thumunId));
  const undone = plan.hizbs.filter((h) => !done.has(h.hizb));
  return Math.min(undone.length, plan.hizbs.length - done.size) > 0;
}

export default function App() {
  const { state, dispatch, today } = useAppStore(refs);
  const [tab, setTab] = useState('today');
  const pending = useMemo(
    () => hasPendingHizbs(state, today),
    [state.thumuns, state.journal, state.params, today], // eslint-disable-line react-hooks/exhaustive-deps
  );
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
