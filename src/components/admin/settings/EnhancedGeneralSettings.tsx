import { useState, useEffect } from 'react';
import {
  Loader2, Check, Info, AlertTriangle, Settings as SettingsIcon,
  Clock, Users, Shield, Bell, DollarSign, Activity
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { getPlatformFee, updatePlatformFee } from '../../../hooks/useFinance';
import { getAdminEmail } from '../../../utils/adminAuth';

interface GeneralSettings {
  platform_name: string;
  maintenance_mode: boolean;
  allow_new_registrations: boolean;
  session_timeout_minutes: number;
  max_active_orders_per_user: number;
  max_active_inventory_per_supplier: number;
}

interface NotificationSettings {
  whatsapp_enabled: boolean;
  notify_new_match: boolean;
  notify_deal_status: boolean;
  notify_payment_due: boolean;
}

interface SecuritySettings {
  max_login_attempts: number;
  lockout_duration_minutes: number;
  pin_min_length: number;
  pin_max_length: number;
}

function ToggleSwitch({ value, onChange, disabled }: {
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={() => !disabled && onChange(!value)}
      disabled={disabled}
      className={`relative w-10 h-5.5 rounded-full transition-colors flex-shrink-0 ${
        value ? 'bg-[#1a4a5e]' : 'bg-gray-200'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      style={{ width: 40, height: 22 }}
    >
      <span
        className={`absolute top-0.5 w-[18px] h-[18px] rounded-full bg-white shadow-sm transition-transform ${
          value ? 'translate-x-5' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}

function Card({ title, icon: Icon, children, hint }: {
  title: string;
  icon: typeof SettingsIcon;
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

function SettingRow({ label, hint, children, warning }: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  warning?: string;
}) {
  return (
    <div className="py-4 border-b border-[#f0f6fa] last:border-0">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-[#1a2f3e] mb-1">{label}</p>
          {hint && <p className="text-[11px] text-[#7a9aab] leading-relaxed">{hint}</p>}
          {warning && (
            <div className="flex items-start gap-2 mt-2 p-2 rounded-lg bg-[#FFFBEB] border border-[#FDE68A]">
              <AlertTriangle className="w-3.5 h-3.5 text-[#B8860B] flex-shrink-0 mt-0.5" />
              <p className="text-[10px] text-[#92400E] leading-relaxed">{warning}</p>
            </div>
          )}
        </div>
        <div className="flex-shrink-0">{children}</div>
      </div>
    </div>
  );
}

export default function EnhancedGeneralSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [fee, setFee] = useState<number>(1);
  const [general, setGeneral] = useState<GeneralSettings>({
    platform_name: 'منصة الطبليات',
    maintenance_mode: false,
    allow_new_registrations: true,
    session_timeout_minutes: 60,
    max_active_orders_per_user: 10,
    max_active_inventory_per_supplier: 50,
  });
  const [notifications, setNotifications] = useState<NotificationSettings>({
    whatsapp_enabled: true,
    notify_new_match: true,
    notify_deal_status: true,
    notify_payment_due: true,
  });
  const [security, setSecurity] = useState<SecuritySettings>({
    max_login_attempts: 5,
    lockout_duration_minutes: 30,
    pin_min_length: 4,
    pin_max_length: 6,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);

    const feeValue = await getPlatformFee();
    setFee(feeValue);

    const { data } = await supabase
      .from('platform_settings')
      .select('general_settings, notification_settings, security_settings')
      .single();

    if (data) {
      if (data.general_settings) setGeneral(data.general_settings as GeneralSettings);
      if (data.notification_settings) setNotifications(data.notification_settings as NotificationSettings);
      if (data.security_settings) setSecurity(data.security_settings as SecuritySettings);
    }

    setLoading(false);
  };

  const saveSetting = async (group: string, key: string, value: any) => {
    const adminEmail = getAdminEmail();
    if (!adminEmail) {
      setError('غير مصرح لك بهذا الإجراء');
      return;
    }

    setSaving(`${group}.${key}`);
    setError(null);

    const { data: current } = await supabase
      .from('platform_settings')
      .select(group)
      .single();

    const updated = { ...(current as any)[group], [key]: value };

    const { error: updateError } = await supabase
      .from('platform_settings')
      .update({ [group]: updated })
      .eq('id', 1);

    setSaving(null);

    if (updateError) {
      setError('فشل حفظ الإعداد');
    } else {
      setSaved(`${group}.${key}`);
      setTimeout(() => setSaved(null), 2000);
    }
  };

  const handleSaveFee = async () => {
    const adminEmail = getAdminEmail();
    if (!adminEmail) {
      setError('غير مصرح لك بهذا الإجراء');
      return;
    }

    setSaving('fee');
    setError(null);
    const result = await updatePlatformFee(fee, adminEmail);
    setSaving(null);

    if (result.success) {
      setSaved('fee');
      setTimeout(() => setSaved(null), 2000);
    } else {
      setError(result.error || 'فشل حفظ العمولة');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 text-[#1a4a5e] animate-spin" />
      </div>
    );
  }

  const feePresets = [0, 0.25, 0.50, 1.00, 1.50, 2.00];

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

      <Card title="عمولة المنصة" icon={DollarSign} hint="المبلغ المقتطع عن كل طبلية">
        <div className="space-y-4">
          <p className="text-[11px] text-[#7a9aab] leading-relaxed">
            العمولة المحددة هنا تطبق على الصفقات الجديدة فقط. الصفقات القائمة تحتفظ بالعمولة المسجلة وقت إنشائها.
          </p>

          <div className="flex flex-wrap gap-2">
            {feePresets.map(p => (
              <button
                key={p}
                onClick={() => setFee(p)}
                className={`px-4 py-2 rounded-xl text-[12px] font-semibold border-2 transition-all ${
                  fee === p
                    ? 'border-[#1a4a5e] bg-[#1a4a5e] text-white'
                    : 'border-[#e2edf5] text-[#4a7a94] hover:border-[#c5d8e4]'
                }`}
              >
                {p === 0 ? 'مجاناً' : `${p} ريال`}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <input
              type="number"
              step="0.01"
              min="0"
              value={fee}
              onChange={e => setFee(Math.max(0, Number(e.target.value)))}
              className="w-32 px-3 py-2 rounded-lg border border-[#d0e5f2] text-[13px] text-[#1a2f3e] focus:outline-none focus:border-[#1a4a5e] bg-white"
            />
            <span className="text-[12px] text-[#7a9aab]">ريال / طبلية</span>
            <button
              onClick={handleSaveFee}
              disabled={saving === 'fee'}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#1a4a5e] text-white text-[12px] font-semibold rounded-lg hover:bg-[#153d50] transition-colors disabled:opacity-50"
            >
              {saving === 'fee' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : saved === 'fee' ? <Check className="w-3.5 h-3.5" /> : null}
              {saved === 'fee' ? 'تم الحفظ' : 'حفظ'}
            </button>
          </div>
        </div>
      </Card>

      <Card title="الإعدادات العامة" icon={SettingsIcon}>
        <SettingRow
          label="وضع الصيانة"
          hint="إيقاف الوصول للمستخدمين مؤقتاً لإجراء الصيانة"
          warning="تفعيل وضع الصيانة سيمنع جميع المستخدمين من الوصول للمنصة ما عدا المشرفين"
        >
          <ToggleSwitch
            value={general.maintenance_mode}
            onChange={v => {
              setGeneral({ ...general, maintenance_mode: v });
              saveSetting('general_settings', 'maintenance_mode', v);
            }}
          />
        </SettingRow>

        <SettingRow
          label="السماح بالتسجيلات الجديدة"
          hint="السماح للمستخدمين الجدد بإنشاء حسابات"
        >
          <ToggleSwitch
            value={general.allow_new_registrations}
            onChange={v => {
              setGeneral({ ...general, allow_new_registrations: v });
              saveSetting('general_settings', 'allow_new_registrations', v);
            }}
          />
        </SettingRow>

        <SettingRow
          label="مهلة الجلسة"
          hint="المدة بالدقائق قبل تسجيل الخروج التلقائي"
        >
          <div className="flex items-center gap-2">
            {[30, 60, 120, 240].map(n => (
              <button
                key={n}
                onClick={() => {
                  setGeneral({ ...general, session_timeout_minutes: n });
                  saveSetting('general_settings', 'session_timeout_minutes', n);
                }}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-all ${
                  general.session_timeout_minutes === n
                    ? 'bg-[#1a4a5e] text-white border-[#1a4a5e]'
                    : 'bg-white text-[#4a7a94] border-[#e2edf5]'
                }`}
              >
                {n}د
              </button>
            ))}
          </div>
        </SettingRow>

        <SettingRow
          label="الحد الأقصى للطلبات النشطة"
          hint="أقصى عدد طلبات نشطة يمكن للمستخدم إنشاؤها"
        >
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="1"
              max="100"
              value={general.max_active_orders_per_user}
              onChange={e => {
                const val = Number(e.target.value);
                setGeneral({ ...general, max_active_orders_per_user: val });
              }}
              onBlur={() => saveSetting('general_settings', 'max_active_orders_per_user', general.max_active_orders_per_user)}
              className="w-20 px-2 py-1.5 rounded-lg border border-[#d0e5f2] text-[12px] text-right bg-white focus:outline-none"
            />
            <span className="text-[11px] text-[#7a9aab]">طلب</span>
          </div>
        </SettingRow>

        <SettingRow
          label="الحد الأقصى للمخزون النشط"
          hint="أقصى عدد دفعات مخزون يمكن للمورد نشرها"
        >
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="1"
              max="200"
              value={general.max_active_inventory_per_supplier}
              onChange={e => {
                const val = Number(e.target.value);
                setGeneral({ ...general, max_active_inventory_per_supplier: val });
              }}
              onBlur={() => saveSetting('general_settings', 'max_active_inventory_per_supplier', general.max_active_inventory_per_supplier)}
              className="w-20 px-2 py-1.5 rounded-lg border border-[#d0e5f2] text-[12px] text-right bg-white focus:outline-none"
            />
            <span className="text-[11px] text-[#7a9aab]">دفعة</span>
          </div>
        </SettingRow>
      </Card>

      <Card title="إعدادات الإشعارات" icon={Bell} hint="التحكم في إشعارات المنصة">
        <SettingRow
          label="تفعيل إشعارات واتساب"
          hint="إرسال الإشعارات عبر واتساب"
        >
          <ToggleSwitch
            value={notifications.whatsapp_enabled}
            onChange={v => {
              setNotifications({ ...notifications, whatsapp_enabled: v });
              saveSetting('notification_settings', 'whatsapp_enabled', v);
            }}
          />
        </SettingRow>

        <SettingRow
          label="إشعار التطابق الجديد"
          hint="إخطار المستخدمين عند العثور على تطابق"
        >
          <ToggleSwitch
            value={notifications.notify_new_match}
            onChange={v => {
              setNotifications({ ...notifications, notify_new_match: v });
              saveSetting('notification_settings', 'notify_new_match', v);
            }}
            disabled={!notifications.whatsapp_enabled}
          />
        </SettingRow>

        <SettingRow
          label="إشعار حالة الصفقة"
          hint="إخطار المستخدمين بتغييرات حالة الصفقة"
        >
          <ToggleSwitch
            value={notifications.notify_deal_status}
            onChange={v => {
              setNotifications({ ...notifications, notify_deal_status: v });
              saveSetting('notification_settings', 'notify_deal_status', v);
            }}
            disabled={!notifications.whatsapp_enabled}
          />
        </SettingRow>

        <SettingRow
          label="إشعار استحقاق الدفع"
          hint="تذكير الموردين بالعمولات المستحقة"
        >
          <ToggleSwitch
            value={notifications.notify_payment_due}
            onChange={v => {
              setNotifications({ ...notifications, notify_payment_due: v });
              saveSetting('notification_settings', 'notify_payment_due', v);
            }}
            disabled={!notifications.whatsapp_enabled}
          />
        </SettingRow>
      </Card>

      <Card title="إعدادات الأمان" icon={Shield} hint="حماية الحسابات والبيانات">
        <SettingRow
          label="الحد الأقصى لمحاولات تسجيل الدخول"
          hint="عدد المحاولات الخاطئة قبل قفل الحساب"
        >
          <div className="flex items-center gap-2">
            {[3, 5, 10].map(n => (
              <button
                key={n}
                onClick={() => {
                  setSecurity({ ...security, max_login_attempts: n });
                  saveSetting('security_settings', 'max_login_attempts', n);
                }}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-all ${
                  security.max_login_attempts === n
                    ? 'bg-[#1a4a5e] text-white border-[#1a4a5e]'
                    : 'bg-white text-[#4a7a94] border-[#e2edf5]'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </SettingRow>

        <SettingRow
          label="مدة القفل"
          hint="المدة بالدقائق لقفل الحساب بعد المحاولات الخاطئة"
        >
          <div className="flex items-center gap-2">
            {[15, 30, 60].map(n => (
              <button
                key={n}
                onClick={() => {
                  setSecurity({ ...security, lockout_duration_minutes: n });
                  saveSetting('security_settings', 'lockout_duration_minutes', n);
                }}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-all ${
                  security.lockout_duration_minutes === n
                    ? 'bg-[#1a4a5e] text-white border-[#1a4a5e]'
                    : 'bg-white text-[#4a7a94] border-[#e2edf5]'
                }`}
              >
                {n}د
              </button>
            ))}
          </div>
        </SettingRow>

        <SettingRow
          label="الحد الأدنى لطول الرمز"
          hint="أقل عدد أرقام مسموح للرمز السري"
        >
          <div className="flex items-center gap-2">
            {[4, 6].map(n => (
              <button
                key={n}
                onClick={() => {
                  setSecurity({ ...security, pin_min_length: n });
                  saveSetting('security_settings', 'pin_min_length', n);
                }}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-all ${
                  security.pin_min_length === n
                    ? 'bg-[#1a4a5e] text-white border-[#1a4a5e]'
                    : 'bg-white text-[#4a7a94] border-[#e2edf5]'
                }`}
              >
                {n} أرقام
              </button>
            ))}
          </div>
        </SettingRow>
      </Card>

      <div className="bg-[#EBF5FF] border border-[#c5d8e4] rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-[#1a4a5e] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-[12px] font-semibold text-[#1a2f3e] mb-1">ملاحظة هامة</p>
            <p className="text-[11px] text-[#4a7a94] leading-relaxed">
              جميع التغييرات في الإعدادات تُطبق فوراً على المنصة. يُنصح بمراجعة التغييرات قبل حفظها والتأكد من أثرها على تجربة المستخدم.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
