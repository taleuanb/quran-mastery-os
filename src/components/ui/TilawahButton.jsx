import React from 'react';
import { BookOpen, Loader2 } from 'lucide-react';

export const TilawahButton = ({ onSubmit, isLoading }) => (
  <section>
    <button 
      onClick={() => onSubmit('📖 Lecture', 0, 5)}
      disabled={isLoading}
      className="group relative w-full overflow-hidden bg-slate-900 hover:bg-slate-800 active:scale-[0.98] text-blue-400 font-bold py-5 rounded-[2rem] transition-all duration-300 border border-blue-500/30 hover:border-blue-400/60 disabled:opacity-50 disabled:active:scale-100 flex justify-center items-center gap-3 shadow-[0_10px_40px_-15px_rgba(59,130,246,0.2)]"
    >
      <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-blue-600/0 via-blue-600/10 to-blue-600/0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
      {isLoading ? <Loader2 className="animate-spin relative z-10" /> : <BookOpen size={24} className="relative z-10 text-blue-500 group-hover:scale-110 transition-transform" />}
      <span className="relative z-10 text-lg">سجل قراءة 5 أحزاب</span>
    </button>
  </section>
);