// 📁 src/components/hud/HUDBar.jsx
import React from 'react';
import { Target, Flame, Brain, BookOpen, ShieldCheck } from 'lucide-react';
import { StatGauge } from './StatGauge';

export const HUDBar = ({ stats }) => (
  <>
    <header className="flex justify-between items-center bg-slate-900/60 p-4 rounded-3xl border border-slate-700/50 shadow-lg backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
          <Target size={22} className="text-emerald-400" />
        </div>
        <h1 className="text-xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-l from-white to-slate-400">Quran OS</h1>
      </div>
      <div className="flex items-center gap-1.5 bg-orange-500/10 border border-orange-500/20 px-3 py-1.5 rounded-xl shadow-inner">
        <Flame size={16} className="text-orange-500 animate-pulse" />
        <span className="font-bold text-sm text-orange-400">{stats.streak} أيام</span>
      </div>
    </header>

    <div className="grid grid-cols-3 gap-3">
      <StatGauge value={stats.hifdh_atman / 8} max={60} color="emerald" label="الحفظ" unit="حزب" icon={Brain} />
      <StatGauge value={stats.khatma} max={60} color="blue" label="الختمة" unit="حزب" icon={BookOpen} />
      <StatGauge value={stats.sriDue} max={480} color="purple" label="المراجعة" unit="ثمن" icon={ShieldCheck} />
    </div>
  </>
);