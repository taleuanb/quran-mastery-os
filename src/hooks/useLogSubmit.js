// 📁 src/hooks/useLogSubmit.js
import { useState } from 'react';
import { submitLogToNotion } from '../services/notionProxy';

export const useLogSubmit = () => {
  const [status, setStatus] = useState("idle");

  const submitLog = async (pilier, score = 0, volume = 0, targets = []) => {
    setStatus("loading");
    try {
      await submitLogToNotion({ pilier, score, volume, targets });
      setStatus("success");
      setTimeout(() => setStatus("idle"), 3000);
      return true;
    } catch (error) {
      console.error(error);
      setStatus("error");
      setTimeout(() => setStatus("idle"), 4000);
      return false;
    }
  };

  return { status, submitLog };
};