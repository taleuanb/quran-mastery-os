// src/App.jsx
import React from 'react';
import { useDailyPlan } from './hooks/useDailyPlan';
import { useLogSubmit } from './hooks/useLogSubmit';
import { STATS_MOCK } from './constants/quran';
import { HUDBar } from './components/hud/HUDBar';
import { DailyPlanSection } from './components/plan/DailyPlanSection'; // Ajoute cet import
import { TilawahButton } from './components/ui/TilawahButton'; // Ajoute cet import
import { LogForm } from './components/log/LogForm'; // Ajoute cet import

export default function QuranApp() {
  const { dailyPlan, currentDate, defaultRevIds } = useDailyPlan(STATS_MOCK.last_memorized_hizb);
  const { status, submitLog } = useLogSubmit();

  return (
    <div dir="rtl" className="min-h-screen bg-[#0B1121] text-slate-100 font-sans p-4 md:p-6 flex justify-center pb-24 selection:bg-emerald-500/30">
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-lg h-[500px] bg-emerald-600/5 blur-[120px] pointer-events-none rounded-full"></div>

      <div className="w-full max-w-[440px] space-y-6 relative z-10">
        <HUDBar stats={STATS_MOCK} />
        
        {/* On a retiré les commentaires ici ! */}
        <DailyPlanSection plan={dailyPlan} date={currentDate} />
       <TilawahButton onSubmit={submitLog} isLoading={status === "loading"} />
        <LogForm onSubmit={submitLog} status={status} defaultRevIds={defaultRevIds} />
        
      </div>
    </div>
  );
}