// src/hooks/useLocalDate.js
import { useState, useEffect } from 'react';

export const useLocalDate = () => {
  const [currentDate, setCurrentDate] = useState("");
  const [dayOfWeek, setDayOfWeek] = useState(0); // 0 = Dimanche, 1 = Lundi, etc.

  useEffect(() => {
    const date = new Date();
    
    // Formatage de la date en Arabe (ex: الجمعة، 12 أبريل 2024)
    const dateOptions = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    const formattedDate = new Intl.DateTimeFormat('ar-EG', dateOptions).format(date);
    
    setCurrentDate(formattedDate);
    setDayOfWeek(date.getDay());
  }, []);

  return { currentDate, dayOfWeek };
};