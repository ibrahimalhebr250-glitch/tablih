import { useState, useEffect, useRef } from 'react';

export interface CountdownResult {
  minutes: number;
  seconds: number;
  totalSeconds: number;
  isExpired: boolean;
  formatted: string;
}

export function useCountdown(expiresAt: string | null | undefined): CountdownResult {
  const getRemaining = () => {
    if (!expiresAt) return 0;
    return Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
  };

  const [remaining, setRemaining] = useState(getRemaining);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!expiresAt) return;
    setRemaining(getRemaining());
    intervalRef.current = setInterval(() => {
      const r = getRemaining();
      setRemaining(r);
      if (r === 0 && intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [expiresAt]);

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const isExpired = remaining === 0 && !!expiresAt;
  const formatted = isExpired
    ? 'انتهت المهلة'
    : `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return { minutes, seconds, totalSeconds: remaining, isExpired, formatted };
}
