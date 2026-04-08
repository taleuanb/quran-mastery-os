// src/hooks/useDailyPlan.js
import { useState, useEffect } from 'react';
import { useLocalDate } from './useLocalDate'; // Import du nouveau hook

export const useDailyPlan = (lastHizb) => {
  const [dailyPlan, setDailyPlan] = useState(null);
  const [defaultRevIds, setDefaultRevIds] = useState([]);
  
  // On récupère le jour et la date depuis notre nouveau hook
  const { dayOfWeek, currentDate } = useLocalDate();

  useEffect(() => {
    const TARGET_HIFDH = { hizb: lastHizb + 1, thumun: "1/8", surah: "الرعد", title: "أفمن يعلم", lastScore: 0 };
    const TARGET_REV_PROCHE = { hizb: lastHizb, surah: "يوسف", title: "وما أبرئ", lastScore: 4, revisedYesterday: true };
    const TARGET_REV_MOYENNE = { hizb: lastHizb - (6 - (dayOfWeek === 0 ? 6 : dayOfWeek)), surah: "هود", title: "وإلى مدين", lastScore: 3, revisedYesterday: false };

    const plans = {
      1: { day: "الإثنين (Lundi)", hifdh: { type: "إعداد (Préparation)", desc: "Lecture Tafsir, Thèmes.", focus: "J1", target: TARGET_HIFDH }, rev: [ { type: "المراجعة القريبة", desc: "الحزب الأخير", target: TARGET_REV_PROCHE }, { type: "المراجعة المتوسطة", desc: "1/5 من الخمسة الأخيرة", target: TARGET_REV_MOYENNE } ]},
      2: { day: "الثلاثاء (Mardi)", hifdh: { type: "حفظ (Apprentissage)", desc: "Mémorisation active.", focus: "J2", target: TARGET_HIFDH }, rev: [ { type: "المراجعة القريبة", desc: "الحزب الأخير", target: TARGET_REV_PROCHE }, { type: "المراجعة المتوسطة", desc: "2/5 من الخمسة الأخيرة", target: TARGET_REV_MOYENNE } ]},
      3: { day: "الأربعاء (Mercredi)", hifdh: { type: "حفظ (Apprentissage)", desc: "Mémorisation active.", focus: "J3", target: TARGET_HIFDH }, rev: [ { type: "المراجعة القريبة", desc: "الحزب الأخير", target: TARGET_REV_PROCHE }, { type: "المراجعة المتوسطة", desc: "3/5 من الخمسة الأخيرة", target: TARGET_REV_MOYENNE } ]},
      4: { day: "الخميس (Jeudi)", hifdh: { type: "تثبيت (Consolidation)", desc: "Fixation (Aucun ajout).", focus: "J4", target: TARGET_HIFDH }, rev: [ { type: "المراجعة القريبة", desc: "الحزب الأخير", target: TARGET_REV_PROCHE }, { type: "المراجعة المتوسطة", desc: "4/5 من الخمسة الأخيرة", target: TARGET_REV_MOYENNE } ]},
      5: { day: "الجمعة (Vendredi)", hifdh: { type: "حفظ (Apprentissage)", desc: "Mémorisation active.", focus: "J5", target: TARGET_HIFDH }, rev: [ { type: "المراجعة القريبة", desc: "الحزب الأخير", target: TARGET_REV_PROCHE }, { type: "المراجعة المتوسطة", desc: "5/5 من الخمسة الأخيرة", target: TARGET_REV_MOYENNE } ]},
      6: { day: "السبت (Samedi)", hifdh: { type: "تثبيت (Consolidation)", desc: "Mémorisation & Fixation.", focus: "J6", target: TARGET_HIFDH }, rev: [ { type: "المراجعة البعيدة (SRI)", desc: "Focus 100% sur les recommandations.", isSRI: true } ]},
      0: { day: "الأحد (Dimanche)", hifdh: { type: "تثبيت شامل (Globale)", desc: "Consolidation globale.", focus: "J7", target: TARGET_HIFDH }, rev: [ { type: "المراجعة القريبة", desc: "الحزب الأخير فقط", target: TARGET_REV_PROCHE } ]}
    };

    setDailyPlan(plans[dayOfWeek]);
    setDefaultRevIds(dayOfWeek >= 1 && dayOfWeek <= 5 ? [`hizb-${lastHizb}`, `hizb-${lastHizb - 6 + dayOfWeek}`] : (dayOfWeek === 0 ? [`hizb-${lastHizb}`] : []));
  }, [lastHizb, dayOfWeek]); // dayOfWeek devient une dépendance

  return { dailyPlan, currentDate, defaultRevIds };
};