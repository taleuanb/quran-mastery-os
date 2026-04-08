import React, { useState, useEffect } from 'react';
import { History, ChevronDown, X } from 'lucide-react';
import { ATMANS_MOCK, HIZBS_MOCK } from '../../constants/quran';

export const LogForm = ({ onSubmit, status, defaultRevIds }) => {
  const [pilierActif, setPilierActif] = useState("Hifdh");
  const [selectedAtman, setSelectedAtman] = useState("");
  const [selectedHizbs, setSelectedHizbs] = useState(defaultRevIds);

  useEffect(() => { setSelectedHizbs(defaultRevIds); }, [defaultRevIds]);

  const handleAddHizb = (e) => {
    const val = e.target.value;
    if (val && !selectedHizbs.includes(val)) setSelectedHizbs([...selectedHizbs, val]);
    e.target.value = ""; 
  };

  const handleScoreClick = async (score) => {
    if (pilierActif === 'Hifdh' && !selectedAtman) return alert("⚠️ Sélectionnez un Atman.");
    if (pilierActif === 'Révision' && selectedHizbs.length === 0) return alert("⚠️ Sélectionnez au moins un Hizb.");
    
    const pilier = pilierActif === 'Hifdh' ? '🧠 Hifdh' : '🔄 Révision';
    const targets = pilierActif === 'Hifdh' ? [selectedAtman] : selectedHizbs;
    
    const success = await onSubmit(pilier, score, 0, targets);
    if (success && pilierActif === 'Hifdh') setSelectedAtman(""); 
  };

  return (
    <section className="bg-slate-900/60 backdrop-blur-xl rounded-[2rem] p-6 border border-slate-700/50 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <h2 className="font-bold text-lg flex items-center gap-2 text-slate-200">
          <History size={20} className="text-slate-400" /> سجل الإنجاز (Log)
        </h2>
        <div className="flex bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800 shadow-inner">
          <button onClick={() => setPilierActif('Hifdh')} className={`flex-1 px-5 py-2 text-sm font-bold rounded-xl transition-all duration-300 ${pilierActif === 'Hifdh' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-slate-500'}`}>حفظ</button>
          <button onClick={() => setPilierActif('Révision')} className={`flex-1 px-5 py-2 text-sm font-bold rounded-xl transition-all duration-300 ${pilierActif === 'Révision' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'text-slate-500'}`}>مراجعة</button>
        </div>
      </div>

      <div className="space-y-6">
        {pilierActif === 'Hifdh' ? (
          <div className="relative group">
            <select value={selectedAtman} onChange={(e) => setSelectedAtman(e.target.value)} className="w-full p-4 pl-12 rounded-2xl border border-slate-700 bg-slate-950/80 text-slate-200 outline-none focus:border-emerald-500/50 appearance-none shadow-inner cursor-pointer">
              <option value="" className="text-slate-500">--- اختر الثمن المنجز ---</option>
              {ATMANS_MOCK.map((atman) => (
                <option key={atman.id} value={atman.id} className="bg-slate-900">{atman.label}</option>
              ))}
            </select>
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none group-focus-within:text-emerald-500 transition-colors">
              <ChevronDown size={20} />
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-[10px] font-bold text-purple-400/80 uppercase tracking-widest px-1">الأحزاب المستهدفة</p>
            <div className="flex flex-wrap gap-2 min-h-[44px] p-3 rounded-2xl border border-slate-800 bg-slate-950/50 shadow-inner">
              {selectedHizbs.length === 0 ? (
                <span className="text-slate-500 text-sm self-center px-2">لم يتم اختيار أي حزب...</span>
              ) : (
                selectedHizbs.map(hizbId => {
                  const hz = HIZBS_MOCK.find(h => h.id === hizbId);
                  return (
                    <div key={hizbId} className="flex items-center gap-1.5 bg-purple-500/10 text-purple-300 border border-purple-500/30 px-3 py-1.5 rounded-xl text-sm font-medium shadow-sm">
                      <span>{hz?.label}</span>
                      <button onClick={() => setSelectedHizbs(selectedHizbs.filter(h => h !== hizbId))} className="text-purple-400/70 hover:text-red-400 hover:bg-red-400/10 rounded-full p-0.5 transition-colors">
                        <X size={14} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
            <div className="relative">
              <select onChange={handleAddHizb} defaultValue="" className="w-full p-3 pl-12 rounded-xl border border-slate-700 bg-slate-900 text-slate-300 text-sm outline-none focus:border-purple-500/50 appearance-none shadow-inner cursor-pointer">
                <option value="" disabled>+ أضف حزباً للمراجعة...</option>
                {HIZBS_MOCK.map((hizb) => (
                  <option key={hizb.id} value={hizb.id} className="bg-slate-900">{hizb.label}</option>
                ))}
              </select>
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
                <ChevronDown size={16} />
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <div className="grid grid-cols-5 gap-2">
            {[
              { score: 1, label: 'ضعيف', hover: 'hover:bg-red-500/10 hover:border-red-500/50 hover:text-red-400 focus:bg-red-500/20 shadow-red-500/20' },
              { score: 2, label: 'مقبول', hover: 'hover:bg-orange-500/10 hover:border-orange-500/50 hover:text-orange-400 focus:bg-orange-500/20 shadow-orange-500/20' },
              { score: 3, label: 'جيد', hover: 'hover:bg-yellow-500/10 hover:border-yellow-500/50 hover:text-yellow-400 focus:bg-yellow-500/20 shadow-yellow-500/20' },
              { score: 4, label: 'ممتاز', hover: 'hover:bg-emerald-500/10 hover:border-emerald-500/50 hover:text-emerald-400 focus:bg-emerald-500/20 shadow-emerald-500/20' },
              { score: 5, label: 'متقن', hover: 'hover:bg-blue-500/10 hover:border-blue-500/50 hover:text-blue-400 focus:bg-blue-500/20 shadow-blue-500/20' },
            ].map((item) => (
              <button 
                key={item.score}
                disabled={status === "loading"}
                onClick={() => handleScoreClick(item.score)}
                className={`group relative py-3 px-1 rounded-2xl border border-slate-700/80 bg-slate-800/50 flex flex-col items-center justify-center gap-1 transition-all duration-200 active:scale-95 disabled:opacity-30 disabled:active:scale-100 disabled:cursor-not-allowed ${item.hover} hover:shadow-[0_0_15px_-3px_var(--tw-shadow-color)]`}
              >
                <span className="text-xl sm:text-2xl font-black text-slate-400 group-hover:text-inherit transition-colors">{item.score}</span>
                <span className="text-[10px] sm:text-xs font-bold text-slate-500 group-hover:text-inherit transition-colors">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};