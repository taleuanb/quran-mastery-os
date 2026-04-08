// 📁 src/constants/quran.js
export const ATMANS_MOCK = [
  { id: "id-notion-h26-t1", label: "H26-T1 | أفمن يعلم - الرعد" },
  { id: "id-notion-h26-t2", label: "H26-T2 | الر - إبراهيم" },
];

export const HIZBS_MOCK = Array.from({ length: 60 }, (_, i) => ({ 
  id: `hizb-${i + 1}`, label: `الحزب ${i + 1}` 
}));

export const STATS_MOCK = {
  hifdh_atman: 200, 
  last_memorized_hizb: 25, 
  khatma: 15,
  sriDue: 8,
  streak: 12
};