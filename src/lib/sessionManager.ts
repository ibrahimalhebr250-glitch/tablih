import { supabase } from './supabase';

const SESSION_TOKEN_KEY = 'pallet_session_token';

export interface SessionData {
  phone: string;
  user_type: 'buyer' | 'supplier' | 'admin';
  user_name: string;
  expires_at: string;
  session_id: string;
}

export interface CreateSessionParams {
  phone: string;
  user_type: 'buyer' | 'supplier' | 'admin';
  user_name: string;
}

export const sessionManager = {
  async createSession(params: CreateSessionParams): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🔐 Creating new session for:', params.phone);
      const { data, error } = await supabase.rpc('create_user_session', {
        p_phone: params.phone,
        p_user_type: params.user_type,
        p_user_name: params.user_name,
        p_ip_address: null,
        p_user_agent: navigator.userAgent
      });

      if (error) throw error;

      if (data?.success && data?.session_token) {
        localStorage.setItem(SESSION_TOKEN_KEY, data.session_token);
        console.log('✅ Session created successfully. Expires at:', data.expires_at);
        console.log('⏱️ Session duration:', data.duration_hours, 'hours');
        return { success: true };
      }

      return { success: false, error: data?.error || 'فشل إنشاء الجلسة' };
    } catch (error) {
      console.error('❌ Error creating session:', error);
      return { success: false, error: 'فشل إنشاء الجلسة' };
    }
  },

  async validateSession(): Promise<{ success: boolean; data?: SessionData; error?: string }> {
    try {
      const token = localStorage.getItem(SESSION_TOKEN_KEY);

      if (!token) {
        console.log('ℹ️ No active session token found');
        return { success: false, error: 'لا توجد جلسة نشطة' };
      }

      console.log('🔍 Validating session...');
      const { data, error } = await supabase.rpc('validate_user_session', {
        p_session_token: token
      });

      if (error) throw error;

      if (data?.success) {
        console.log('✅ Session valid for user:', data.user_name);
        console.log('⏱️ Expires at:', data.expires_at);
        return {
          success: true,
          data: {
            phone: data.phone,
            user_type: data.user_type,
            user_name: data.user_name,
            expires_at: data.expires_at,
            session_id: data.session_id
          }
        };
      }

      console.log('⚠️ Session invalid:', data?.error);
      this.clearSession();
      return { success: false, error: data?.error || 'جلسة غير صالحة' };
    } catch (error) {
      console.error('❌ Error validating session:', error);
      this.clearSession();
      return { success: false, error: 'خطأ في التحقق من الجلسة' };
    }
  },

  async invalidateSession(): Promise<{ success: boolean }> {
    try {
      const token = localStorage.getItem(SESSION_TOKEN_KEY);

      if (token) {
        await supabase.rpc('invalidate_user_session', {
          p_session_token: token
        });
      }

      this.clearSession();
      return { success: true };
    } catch (error) {
      console.error('Error invalidating session:', error);
      this.clearSession();
      return { success: true };
    }
  },

  async invalidateAllSessions(phone: string, userType: string): Promise<{ success: boolean }> {
    try {
      await supabase.rpc('invalidate_all_user_sessions', {
        p_phone: phone,
        p_user_type: userType
      });

      this.clearSession();
      return { success: true };
    } catch (error) {
      console.error('Error invalidating all sessions:', error);
      return { success: false };
    }
  },

  clearSession(): void {
    localStorage.removeItem(SESSION_TOKEN_KEY);
  },

  hasSession(): boolean {
    return !!localStorage.getItem(SESSION_TOKEN_KEY);
  },

  getSessionToken(): string | null {
    return localStorage.getItem(SESSION_TOKEN_KEY);
  }
};
