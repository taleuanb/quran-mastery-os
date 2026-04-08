// 📁 src/components/hud/StatGauge.jsx
import React from 'react';

export const StatGauge = ({ value, max, color, label, icon: Icon, unit }) => {
  const radius = 35;
  const circumference = 2 * Math.PI * radius;
  const percent = Math.min((value / max) * 100, 100);
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className="flex flex-col items-center bg-slate-900/50 p-4 rounded-3xl border border-slate-700/50 shadow-inner relative overflow-hidden group">
      <div className={`absolute inset-0 bg-gradient-to-b opacity-0 group-hover:opacity-10 transition-opacity duration-500 from-${color}-500 to-transparent`}></div>
      <div className="relative flex items-center justify-center mb-2">
        <svg className="w-24 h-24 transform -rotate-90 drop-shadow-lg">
          <circle cx="48" cy="48" r={radius} stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-800/80" />
          <circle cx="48" cy="48" r={radius} stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className={`text-${color}-500 transition-all duration-1000 ease-out`} />
        </svg>
        <div className="absolute flex flex-col items-center justify-center">
          <Icon size={18} className={`text-${color}-400 mb-1 opacity-80`} />
          <span className={`text-xl font-black text-${color}-100 tracking-tighter`}>{value % 1 !== 0 ? value.toFixed(1) : value}</span>
        </div>
      </div>
      <div className="text-center z-10">
        <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">{label}</span>
        <p className="text-[10px] text-slate-500 mt-0.5">{max} {unit}</p>
      </div>
    </div>
  );
};