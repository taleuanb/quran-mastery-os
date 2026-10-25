// Types JSDoc uniquement (aucun code exécutable).

/** @typedef {{id:string,hizb:number,thumun:number,juz:number,hizbName:string,surah:string,ayah:number,approx:boolean}} Ref */
/** @typedef {{date:string,score:number,seed?:boolean}} ScoreEntry */
/** @typedef {{status:'non_acquis'|'acquis',track:'base'|'cible'|null,scores:ScoreEntry[],lastReviewed:string|null,interval:number,due:string|null,risk:boolean,fragileInitial:boolean,journalFrom?:number}} ThumunState */
// journalFrom : index du journal à partir duquel l'historique du thumun compte (posé à chaque (ré)initialisation par SET_ACQUIS ; absent = 0). Le rejeu d'EDIT_ENTRY ignore les entrées antérieures.
/** @typedef {{id:string,date:string,thumunId:string,pilier:'hifdh'|'revision',score:number,source:'base'|'cible'|'hifdh'}} Entry */
/** @typedef {{dailyReviewHizbs:number,dailyNewThumuns:number,restDays:number[],baseRotationPerMonth:number,multipliers:Object<number,number>,resetDays:Object<number,number>,initialInterval:number,maxInterval:number,hardMaxInterval:number,urgencyDays:number,rolloverHour:number,graceDaysPerWeek:number,backupReminderDays:number}} Params */
/** @typedef {{schemaVersion:1,params:Params,thumuns:Object<string,ThumunState>,journal:Entry[],learnQueue:string[],dayLog:Object<string,{planned:number,done:number}>,lastBackup:string|null,khatma:number}} AppState */

export {};
