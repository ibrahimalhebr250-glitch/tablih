import { useState } from 'react';
import { X, Shield, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Props {
  onClose: () => void;
  onSuccess: (staffData: AdminStaffData) => void;
}

export interface AdminStaffData {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  role: string;
  permissions: Record<string, {
    can_view: boolean;
    can_create: boolean;
    can_edit: boolean;
    can_delete: boolean;
  }>;
}

export default function AdminLoginSheet({ onClose, onSuccess }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      setError('يرجى إدخال البريد الإلكتروني وكلمة المرور');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data, error: dbError } = await supabase.rpc('admin_staff_login', {
        p_email: email,
        p_password: password
      });

      if (dbError) throw dbError;

      if (!data?.success) {
        setError(data?.error || 'حدث خطأ أثناء تسجيل الدخول');
        setLoading(false);
        return;
      }

      const staffData: AdminStaffData = data.staff;
      onSuccess(staffData);
    } catch (err: any) {
      console.error('Admin login error:', err);
      setError(err.message || 'حدث خطأ أثناء تسجيل الدخول');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(14, 34, 51, 0.85)' }}>
      <div
        className="w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #ffffff 0%, #f8fbfd 100%)',
          border: '1px solid rgba(26, 74, 94, 0.1)',
        }}
      >
        <div
          className="p-6 flex items-center justify-between"
          style={{
            background: 'linear-gradient(135deg, #1a4a5e 0%, #2d5a6e 100%)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">لوحة التحكم</h2>
              <p className="text-sm text-white/70">تسجيل دخول موظفي الإدارة</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#1a4a5e' }}>
              البريد الإلكتروني
            </label>
            <div className="relative">
              <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: '#5a7a8c' }} />
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError('');
                }}
                placeholder="admin@example.com"
                className="w-full pr-11 pl-4 py-3 rounded-xl border-2 text-base"
                style={{
                  borderColor: error ? '#dc2626' : '#c5d8e4',
                  background: '#ffffff',
                  color: '#1a4a5e',
                }}
                dir="ltr"
                autoFocus
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#1a4a5e' }}>
              كلمة المرور
            </label>
            <div className="relative">
              <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: '#5a7a8c' }} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                placeholder="••••••••"
                className="w-full pr-11 pl-11 py-3 rounded-xl border-2 text-base"
                style={{
                  borderColor: error ? '#dc2626' : '#c5d8e4',
                  background: '#ffffff',
                  color: '#1a4a5e',
                }}
                dir="ltr"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3 top-1/2 -translate-y-1/2"
                style={{ color: '#5a7a8c' }}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {error && (
            <div
              className="p-3 rounded-xl text-sm"
              style={{
                background: '#fef2f2',
                color: '#dc2626',
                border: '1px solid #fecaca',
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !email || !password}
            className="w-full py-3.5 rounded-xl font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            style={{
              background: (!loading && email && password) ? 'linear-gradient(135deg, #1a4a5e 0%, #2d5a6e 100%)' : '#c5d8e4',
            }}
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                جاري تسجيل الدخول...
              </>
            ) : (
              'تسجيل الدخول'
            )}
          </button>

          <div
            className="text-center text-xs pt-2"
            style={{ color: '#5a7a8c' }}
          >
            للحصول على حساب إداري، يرجى التواصل مع مدير النظام
          </div>
        </form>
      </div>
    </div>
  );
}
