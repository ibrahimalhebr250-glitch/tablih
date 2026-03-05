import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

const POLL_INTERVAL_MS = 60_000;

export function useReservationExpiry(onExpired?: () => void) {
  const callbackRef = useRef(onExpired);
  callbackRef.current = onExpired;

  useEffect(() => {
    const runExpiry = async () => {
      try {
        await supabase.rpc('expire_reservations');
        callbackRef.current?.();
      } catch {
        // silent — expiry is best-effort
      }
    };

    runExpiry();
    const interval = setInterval(runExpiry, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);
}
