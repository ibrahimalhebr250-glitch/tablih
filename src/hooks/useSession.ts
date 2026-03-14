import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { AppSession, UserProfile } from '../types/session';

const SESSION_KEY = 'tbl_session';

async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin + 'tbl_salt_2024');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

function loadStoredSession(): AppSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s: AppSession = JSON.parse(raw);
    if (new Date(s.expiresAt) <= new Date()) return null;
    return s;
  } catch {
    return null;
  }
}

function saveSession(s: AppSession) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(s));
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem('pallet_session_token');
}

export function useSession() {
  const [session, setSession] = useState<AppSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initSession = async () => {
      try {
        const stored = loadStoredSession();
        if (stored) {
          const expiresAt = new Date(stored.expiresAt);
          const now = new Date();
          const daysLeft = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

          if (daysLeft < 7) {
            const newExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
            const newAccess = crypto.randomUUID() + crypto.randomUUID();
            const newRefresh = crypto.randomUUID() + crypto.randomUUID();
            const { error } = await supabase
              .from('session_tokens')
              .update({ access_token: newAccess, refresh_token: newRefresh, expires_at: newExpiry, last_used: now.toISOString() })
              .eq('refresh_token', stored.refreshToken);
            if (!error) {
              const updated = { ...stored, accessToken: newAccess, refreshToken: newRefresh, expiresAt: newExpiry };
              saveSession(updated);
              setSession(updated);
            } else {
              clearSession();
            }
          } else {
            await supabase.from('session_tokens').update({ last_used: now.toISOString() }).eq('access_token', stored.accessToken);
            setSession(stored);
          }
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };
    initSession();
  }, []);

  const buildSession = async (user: {
    id: string;
    phone: string;
    company_name?: string;
    display_name?: string;
    city?: string;
    activity_type?: string;
    user_type?: string;
    created_at?: string;
    last_active?: string;
  }): Promise<AppSession> => {
    const accessToken = crypto.randomUUID() + crypto.randomUUID();
    const refreshToken = crypto.randomUUID() + crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    await supabase.from('session_tokens').insert({
      user_id: user.id,
      phone: user.phone,
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: expiresAt,
    });

    localStorage.setItem('pallet_session_token', accessToken);

    const profile: UserProfile = {
      id: user.id,
      phone: user.phone,
      company_name: user.company_name ?? '',
      display_name: user.display_name ?? '',
      city: user.city ?? '',
      activity_type: user.activity_type ?? '',
      user_type: (user.user_type as UserProfile['user_type']) || '',
      created_at: user.created_at ?? '',
      last_active: user.last_active ?? '',
    };

    const newSession: AppSession = {
      profile,
      roles: [],
      accessToken,
      refreshToken,
      expiresAt,
    };

    saveSession(newSession);
    setSession(newSession);
    return newSession;
  };

  const register = useCallback(async (data: {
    phone: string;
    name: string;
    userType: 'company' | 'individual';
    pin: string;
  }): Promise<{ success: boolean; error?: string; session?: AppSession }> => {
    const formattedPhone = data.phone.startsWith('0') ? data.phone : `0${data.phone}`;

    const { data: existing } = await supabase.from('platform_users').select('id').eq('phone', formattedPhone).maybeSingle();
    if (existing) return { success: false, error: 'رقم الجوال مسجل مسبقاً. يرجى تسجيل الدخول.' };

    const pinHashed = await hashPin(data.pin);
    const { data: newUser, error } = await supabase
      .from('platform_users')
      .insert({
        phone: formattedPhone,
        display_name: data.name,
        company_name: data.userType === 'company' ? data.name : '',
        user_type: data.userType,
        pin_hash: pinHashed,
        last_active: new Date().toISOString(),
      })
      .select('*')
      .maybeSingle();

    if (error) {
      if (error.code === '23505') return { success: false, error: 'رقم الجوال مسجل مسبقاً. يرجى تسجيل الدخول.' };
      return { success: false, error: 'حدث خطأ أثناء التسجيل. يرجى المحاولة مرة أخرى.' };
    }
    if (!newUser) return { success: false, error: 'حدث خطأ أثناء التسجيل. يرجى المحاولة مرة أخرى.' };

    const s = await buildSession(newUser);
    return { success: true, session: s };
  }, []);

  const login = useCallback(async (phone: string, pin: string): Promise<{ success: boolean; error?: string; session?: AppSession }> => {
    const formattedPhone = phone.startsWith('0') ? phone : `0${phone}`;

    const { data: user } = await supabase.from('platform_users').select('*').eq('phone', formattedPhone).maybeSingle();
    if (!user) return { success: false, error: 'رقم الجوال غير مسجل. يرجى إنشاء حساب جديد.' };

    const pinHashed = await hashPin(pin);
    if (user.pin_hash !== pinHashed) return { success: false, error: 'الرقم السري غير صحيح.' };

    await supabase.from('platform_users').update({ last_active: new Date().toISOString() }).eq('id', user.id);

    const s = await buildSession(user);
    return { success: true, session: s };
  }, []);

  const updateProfile = useCallback(async (updates: Partial<Pick<UserProfile, 'company_name' | 'display_name' | 'city' | 'activity_type'>>) => {
    if (!session) return;
    await supabase.from('platform_users').update(updates).eq('id', session.profile.id);
    const updated: AppSession = { ...session, profile: { ...session.profile, ...updates } };
    saveSession(updated);
    setSession(updated);
  }, [session]);

  const logout = useCallback(async () => {
    if (session) {
      await supabase.from('session_tokens').update({ expires_at: new Date().toISOString() }).eq('access_token', session.accessToken);
    }
    clearSession();
    setSession(null);
  }, [session]);

  return {
    session,
    loading,
    isAuthenticated: !!session,
    register,
    login,
    updateProfile,
    logout,
  };
}
