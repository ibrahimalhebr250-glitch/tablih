import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

const SESSION_TOKEN_KEY = 'pallet_session_token';
const TBL_SESSION_KEY = 'tbl_session';

function getSessionToken(): string | null {
  const palletToken = localStorage.getItem(SESSION_TOKEN_KEY);
  if (palletToken) return palletToken;

  try {
    const raw = localStorage.getItem(TBL_SESSION_KEY);
    if (raw) {
      const s = JSON.parse(raw);
      if (s?.accessToken && new Date(s.expiresAt) > new Date()) {
        return s.accessToken;
      }
    }
  } catch {
    // ignore
  }
  return null;
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: (url, options = {}) => {
      const token = getSessionToken();
      const headers = new Headers((options as RequestInit).headers);
      if (token) {
        headers.set('x-session-token', token);
      }
      return fetch(url, { ...(options as RequestInit), headers });
    },
  },
});
