// src/hooks/useStats.js
import { useState } from 'react';
import { STATS_MOCK } from '../constants/quran';

export const useStats = () => {
  // L'état initial est défini avec nos constantes de mock
  const [stats, setStats] = useState(STATS_MOCK);

  // Plus tard, nous ajouterons un useEffect ici pour faire un "fetch"
  // et mettre à jour le state via setStats() avec les vraies données de Notion.

  return stats;
};