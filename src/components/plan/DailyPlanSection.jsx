import React from 'react';
import { CalendarDays, Clock, ShieldCheck, Brain, Bookmark, MapPin, Flame, History, AlertCircle, Star } from 'lucide-react';

const ScoreBadge = ({ score }) => {
  const config = {
    0: { label: 'جديد (Nouveau)', style: 'bg-slate-800/80 text-slate-400 border-slate-700' },
    1: { label: 'ضعيف (Faible)', style: 'bg-red-500/10 text-red-400 border-red-500/30' },
    2: { label: 'مقبول (Moyen)', style: 'bg-orange-500/10 text-orange-400 border-orange-500/30' },
    3: { label: 'جيد (Bien)', style: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30' },
    4: { label: 'ممتاز (Très Bien)', style: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
    5: { label: 'متقن (Moutqin)', style: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
  }[score] || { label: 'جديد (Nouveau)', style: 'bg-slate-800/80 text-slate-400 border-slate-700' };

  return (
    <div className="flex flex-col items-end gap-1">
      <span className="text-[9px] font-bold text-slate-500">آخر تقييم (Dernier)</span>
      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-bold ${config.style}`}>
        {score > 0 && <span className="flex items-center gap-0.5"><Star size={10} className="fill-current" /> {score} -</span>}
        <span>{config.label}</span>
      </div>
    </div>
  );
};

const TaskCard = ({ type, focus, desc, target, isSRI, color, icon: Icon }) => (
  <div className={`relative bg-gradient-to-br from-slate-900/90 to-slate-950/90 p-4 rounded-[1.25rem] border border-slate-700/60 shadow-lg overflow-hidden group`}>
    <div className={`absolute top-0 right-0 w-1 h-full bg-${color}-500/80`}></div>
    <div className={`absolute -top-10 -right-10 w-24 h-24 bg-${color}-500/10 blur-2xl rounded-full pointer-events-none`}></div>

    <div className="flex justify-between items-start mb-4 relative z-10">
      <div>
        <span className={`text-[10px] font-black text-${color}-400/70 tracking-widest uppercase`}>{focus}</span>
        <h3 className={`text-${color}-300 text-sm font-bold flex items-center gap-2 mt-0.5`}>
          <Icon size={16} /> {type}
        </h3>
      </div>
      {!isSRI && target && <ScoreBadge score={target.lastScore} />}
    </div>

    {!isSRI && target ? (
      <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80 shadow-inner flex flex-col gap-3 relative z-10">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2 text-slate-200 text-sm font-bold">
            <Bookmark size={15} className={`text-${color}-400/80`} />
            <span>الحزب {target.hizb} {target.thumun && <span className="text-slate-600 mx-1 font-normal">•</span>} {target.thumun && <span className="text-slate-300 font-medium">الثمن {target.thumun}</span>}</span>
          </div>
        </div>
        <div className={`flex items-center gap-2 bg-slate-900/60 px-3 py-2 rounded-lg border border-slate-800`}>
          <MapPin size={13} className={`text-${color}-400/60`} />
          <span className="text-[11px] text-slate-400">يبدأ بـ :</span>
          <span className={`text-xs font-bold text-${color}-200`}>"{target.title}"</span>
        </div>
      </div>
    ) : (
      <div className="bg-orange-500/5 p-4 rounded-xl border border-orange-500/20 flex items-center justify-center gap-2 relative z-10">
         <AlertCircle size={16} className="text-orange-400" />
         <span className="text-sm font-bold text-orange-300">يوم مخصص لمقترحات الخوارزمية (SRI)</span>
      </div>
    )}

    <div className="mt-4 flex flex-col gap-2 relative z-10">
      <p className="text-slate-400 text-xs leading-relaxed">{desc}</p>
      {!isSRI && target?.revisedYesterday && (
        <div className="self-start inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mt-1">
          <History size={12} />
          <span className="text-[10px] font-bold">رُوجع بالأمس</span>
        </div>
      )}
    </div>
  </div>
);

export const DailyPlanSection = ({ plan, date }) => {
  if (!plan) return null;
  return (
    <section className="bg-slate-900/60 backdrop-blur-xl rounded-[2rem] p-5 border border-slate-700/50 shadow-2xl relative overflow-hidden">
      <div className="flex flex-col mb-6 border-b border-slate-800/80 pb-4">
        <div className="flex justify-between items-center mb-1.5">
          <h2 className="font-bold text-xl flex items-center gap-2 text-slate-100">
            <CalendarDays size={22} className="text-emerald-400" /> خطة اليوم
          </h2>
          <span className="text-xs font-bold px-3 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl shadow-sm">
            {plan.day}
          </span>
        </div>
        <p className="text-sm text-slate-400 flex items-center gap-1.5">
          <Clock size={14} className="text-slate-500" /> {date}
        </p>
      </div>
      
      <div className="space-y-5">
        <TaskCard type={plan.hifdh.type} focus={plan.hifdh.focus} desc={plan.hifdh.desc} target={plan.hifdh.target} color="emerald" icon={Brain} />
        
        <div className="pt-2">
          <h3 className="text-purple-400 text-sm font-black flex items-center gap-2 mb-4 px-1">
            <ShieldCheck size={18} /> المراجعة (Le Bouclier)
          </h3>
          <div className="space-y-3">
            {plan.rev.map((r, idx) => (
              <TaskCard key={idx} type={r.type || r.title} focus={r.desc} desc="" target={r.target} isSRI={r.isSRI} color={r.isSRI ? "orange" : "purple"} icon={r.isSRI ? Flame : ShieldCheck} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};