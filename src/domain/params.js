export const DEFAULT_PARAMS = {
  dailyReviewHizbs: 5, dailyNewThumuns: 1, restDays: [4, 6], baseRotationPerMonth: 2,
  multipliers: { 5: 2.5, 4: 2, 3: 1.3 }, resetDays: { 2: 2, 1: 1 },
  initialInterval: 3, maxInterval: 30, hardMaxInterval: 7, urgencyDays: 3,
  rolloverHour: 4, graceDaysPerWeek: 1, backupReminderDays: 7,
};

export const cycleDays = (p) => 30 / p.baseRotationPerMonth;
