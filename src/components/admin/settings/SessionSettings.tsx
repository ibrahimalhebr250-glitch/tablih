import { useState, useEffect } from 'react';
import { Loader2, Check, Clock, Shield, Info, Users, AlertTriangle } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { getAdminEmail } from '../../../utils/adminAuth';

interface SessionSettings {
  duration_hours: number;
  active_sessions_count?: number;
}

function Card({ title, icon: Icon, children, hint }: {
  title: string;
  icon: typeof Clock;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-[#e2edf5] overflow-hidden">
      <div className="px-5 py-4 border-b border-[#e2edf5] bg-[#f7fbfd]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#EBF5FF] flex items-center justify-center">
            <Icon className="w-5 h-5 text-[#1a4a5e]" />
          </div>
          <div className="flex-1">
            <h4 className="text-[14px] font-bold text-[#1a2f3e]">{title}</h4>
            {hint && <p className="text-[11px] text-[#7a9aab] mt-0.5">{hint}</p>}
          </div>
        </div>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

export default function SessionSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sessionDuration, setSessionDuration] = useState<number>(24);
  const [activeSessions, setActiveSessions] = useState<number>(0);
  const [totalUsers, setTotalUsers] = useState<number>(0);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);

    const { data: settings } = await supabase
      .from('platform_settings')
      .select('session_duration_hours')
      .maybeSingle();

    if (settings?.session_duration_hours) {
      setSessionDuration(settings.session_duration_hours);
    }

    const { count: sessionsCount } = await supabase
      .from('user_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    setActiveSessions(sessionsCount || 0);

    const { count: usersCount } = await supabase
      .from('platform_users')
      .select('*', { count: 'exact', head: true });

    setTotalUsers(usersCount || 0);

    setLoading(false);
  };

  const handleSave = async () => {
    const adminEmail = getAdminEmail();
    if (!adminEmail) {
      setError('غير مصرح لك بهذا الإجراء');
      return;
    }

    setSaving(true);
    setError(null);

    const { error: updateError } = await supabase
      .from('platform_settings')
      .update({ session_duration_hours: sessionDuration })
      .eq('id', 1);

    setSaving(false);

    if (updateError) {
      setError('فشل حفظ الإعدادات');
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 text-[#1a4a5e] animate-spin" />
      </div>
    );
  }

  const durationPresets = [6, 12, 24, 48, 72, 168]; // 6h, 12h, 1d, 2d, 3d, 1w

  return (
    <div className="space-y-5">
      {error && (
        <div className="bg-[#fef2f2] border border-[#fecaca] rounded-xl p-4 flex items-start justify-between">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-[#dc2626] flex-shrink-0 mt-0.5" />
            <p className="text-[13px] text-[#dc2626] font-semibold">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="text-[#dc2626] hover:text-[#991b1b]">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-[#EBF5FF] to-[#D5E9F8] rounded-2xl p-5 border border-[#c5d8e4]">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-white/80 flex items-center justify-center">
              <Clock className="w-5 h-5 text-[#1a4a5e]" />
            </div>
            <h4 className="text-[13px] font-bold text-[#1a2f3e]">مدة الجلسة</h4>
          </div>
          <p className="text-[28px] font-black text-[#1a4a5e] mb-1">
            {sessionDuration}
            <span className="text-[14px] font-semibold mr-1">ساعة</span>
          </p>
          <p className="text-[11px] text-[#4a7a94]">قبل تسجيل الخروج التلقائي</p>
        </div>

        <div className="bg-gradient-to-br from-[#F0FDF4] to-[#DCFCE7] rounded-2xl p-5 border border-[#86EFAC]">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-white/80 flex items-center justify-center">
              <Shield className="w-5 h-5 text-[#166534]" />
            </div>
            <h4 className="text-[13px] font-bold text-[#1a2f3e]">جلسات نشطة</h4>
          </div>
          <p className="text-[28px] font-black text-[#166534] mb-1">{activeSessions}</p>
          <p className="text-[11px] text-[#166534]">مستخدم متصل الآن</p>
        </div>

        <div className="bg-gradient-to-br from-[#FEF3C7] to-[#FDE68A] rounded-2xl p-5 border border-[#FCD34D]">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-white/80 flex items-center justify-center">
              <Users className="w-5 h-5 text-[#92400E]" />
            </div>
            <h4 className="text-[13px] font-bold text-[#1a2f3e]">إجمالي المستخدمين</h4>
          </div>
          <p className="text-[28px] font-black text-[#92400E] mb-1">{totalUsers}</p>
          <p className="text-[11px] text-[#92400E]">مسجل في المنصة</p>
        </div>
      </div>

      <Card
        title="مدة الجلسة للمستخدمين"
        icon={Clock}
        hint="تحديد مدة بقاء المستخدم مسجلاً قبل طلب تسجيل الدخول مرة أخرى"
      >
        <div className="space-y-5">
          <div className="flex items-start gap-2 p-4 rounded-xl bg-[#EBF5FF] border border-[#c5d8e4]">
            <Info className="w-4 h-4 text-[#1a4a5e] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-[12px] text-[#1a2f3e] font-semibold mb-1">
                كيف يعمل نظام الجلسات؟
              </p>
              <ul className="text-[11px] text-[#4a7a94] space-y-1 list-disc list-inside">
                <li>عند تسجيل الدخول، يحصل المستخدم على جلسة نشطة لمدة محددة</li>
                <li>يمكن للمستخدم التنقل بحرية داخل المنصة دون الحاجة لتسجيل الدخول مرة أخرى</li>
                <li>عند انتهاء مدة الجلسة، يُطلب من المستخدم تسجيل الدخول مجدداً</li>
                <li>التغييرات تؤثر على الجلسات الجديدة فقط، الجلسات الحالية تبقى على المدة القديمة</li>
              </ul>
            </div>
          </div>

          <div>
            <label className="block text-[13px] font-semibold text-[#1a2f3e] mb-3">
              اختر المدة المناسبة
            </label>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
              {durationPresets.map(hours => (
                <button
                  key={hours}
                  onClick={() => setSessionDuration(hours)}
                  className={`px-4 py-3 rounded-xl text-[12px] font-bold border-2 transition-all ${
                    sessionDuration === hours
                      ? 'border-[#1a4a5e] bg-[#1a4a5e] text-white shadow-lg'
                      : 'border-[#e2edf5] text-[#4a7a94] hover:border-[#c5d8e4] bg-white'
                  }`}
                >
                  <div className="text-center">
                    <div className="text-[16px] font-black">{hours}</div>
                    <div className="text-[10px] opacity-75 mt-0.5">
                      {hours === 168 ? 'أسبوع' : hours >= 24 ? `${hours/24} ${hours === 24 ? 'يوم' : 'أيام'}` : 'ساعة'}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[13px] font-semibold text-[#1a2f3e] mb-2">
              أو أدخل مدة مخصصة
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="1"
                max="720"
                value={sessionDuration}
                onChange={e => setSessionDuration(Math.max(1, Math.min(720, Number(e.target.value))))}
                className="w-32 px-4 py-2.5 rounded-xl border-2 border-[#d0e5f2] text-[13px] text-[#1a2f3e] font-semibold focus:outline-none focus:border-[#1a4a5e] bg-white"
              />
              <span className="text-[12px] text-[#7a9aab] font-semibold">ساعة</span>
              <span className="text-[11px] text-[#7a9aab] flex-1">
                (من 1 إلى 720 ساعة - حوالي شهر)
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-[#e2edf5]">
            <div className="text-[11px] text-[#7a9aab]">
              آخر تحديث: {new Date().toLocaleDateString('ar-SA')}
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#1a4a5e] text-white text-[13px] font-bold rounded-xl hover:bg-[#153d50] transition-colors disabled:opacity-50 shadow-lg"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  جاري الحفظ...
                </>
              ) : saved ? (
                <>
                  <Check className="w-4 h-4" />
                  تم الحفظ
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  حفظ التغييرات
                </>
              )}
            </button>
          </div>
        </div>
      </Card>

      <Card
        title="إدارة الجلسات النشطة"
        icon={Shield}
        hint="معلومات وإحصائيات الجلسات الحالية"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-[#f0f6fa]">
            <div>
              <p className="text-[13px] font-semibold text-[#1a2f3e]">الجلسات النشطة حالياً</p>
              <p className="text-[11px] text-[#7a9aab] mt-0.5">مستخدمين متصلين الآن</p>
            </div>
            <div className="text-[18px] font-black text-[#1a4a5e]">
              {activeSessions}
            </div>
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-[13px] font-semibold text-[#1a2f3e]">نسبة الجلسات النشطة</p>
              <p className="text-[11px] text-[#7a9aab] mt-0.5">من إجمالي المستخدمين</p>
            </div>
            <div className="text-[18px] font-black text-[#1a4a5e]">
              {totalUsers > 0 ? Math.round((activeSessions / totalUsers) * 100) : 0}%
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
