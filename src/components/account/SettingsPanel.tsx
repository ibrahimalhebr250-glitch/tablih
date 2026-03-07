import { useState, useEffect } from 'react';
import {
  X, User, Building2, Phone, MapPin, Briefcase,
  Bell, Shield, Camera, Check, Pencil, ChevronLeft,
  Info, FileText, Lock
} from 'lucide-react';
import type { AppSession } from '../../types/session';
import { SAUDI_CITIES } from '../../types/inventory';
import { supabase } from '../../lib/supabase';
import ProfileImageUploader from './ProfileImageUploader';

const ACTIVITY_TYPES = [
  'توزيع وتوريد',
  'تصنيع وإنتاج',
  'تجزئة وبيع',
  'لوجستيات ونقل',
  'تصدير واستيراد',
  'أخرى',
];

interface Props {
  session: AppSession;
  open: boolean;
  onClose: () => void;
  onUpdateProfile: (updates: { company_name?: string; display_name?: string; city?: string; activity_type?: string }) => Promise<void>;
}

type SettingsView = 'main' | 'profile' | 'photo' | 'notifications' | 'privacy';

export default function SettingsPanel({ session, open, onClose, onUpdateProfile }: Props) {
  const [view, setView] = useState<SettingsView>('main');
  const [closing, setClosing] = useState(false);

  const [displayName, setDisplayName] = useState(session.profile.display_name ?? '');
  const [companyName, setCompanyName] = useState(session.profile.company_name ?? '');
  const [city, setCity] = useState(session.profile.city ?? '');
  const [activityType, setActivityType] = useState(session.profile.activity_type ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);

  const isCompany = session.profile.user_type === 'company';

  useEffect(() => {
    if (open) {
      setView('main');
      setClosing(false);
      setDisplayName(session.profile.display_name ?? '');
      setCompanyName(session.profile.company_name ?? '');
      setCity(session.profile.city ?? '');
      setActivityType(session.profile.activity_type ?? '');
      setSaved(false);
    }
  }, [open, session]);

  useEffect(() => {
    if (!session.profile.phone) return;
    supabase
      .from('platform_users')
      .select('profile_image_url')
      .eq('phone', session.profile.phone)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.profile_image_url) setProfileImageUrl(data.profile_image_url);
      });
  }, [session.profile.phone]);

  const handleClose = () => {
    setClosing(true);
    setTimeout(onClose, 300);
  };

  const handleBack = () => {
    setView('main');
    setSaved(false);
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    await onUpdateProfile({
      display_name: displayName,
      company_name: companyName,
      city,
      activity_type: activityType,
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (!open) return null;

  const menuItems = [
    {
      id: 'profile' as const,
      icon: User,
      iconBg: '#EBF5FF',
      iconColor: '#2563eb',
      title: 'معلومات الحساب',
      desc: 'الاسم والمدينة ونوع النشاط',
    },
    {
      id: 'photo' as const,
      icon: Camera,
      iconBg: '#F0FDF4',
      iconColor: '#16a34a',
      title: 'الصورة الشخصية',
      desc: 'تغيير الصورة أو الشعار',
    },
    {
      id: 'notifications' as const,
      icon: Bell,
      iconBg: '#FFFBEB',
      iconColor: '#d97706',
      title: 'الإشعارات',
      desc: 'تفضيلات التنبيهات',
    },
    {
      id: 'privacy' as const,
      icon: Shield,
      iconBg: '#F0F4F8',
      iconColor: '#475569',
      title: 'الخصوصية والشروط',
      desc: 'سياسة الاستخدام والبيانات',
    },
  ];

  return (
    <div className="fixed inset-0 z-[100]">
      <div
        className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${closing ? 'opacity-0' : 'opacity-100'}`}
        onClick={handleClose}
      />

      <div
        className={`absolute top-0 bottom-0 right-0 w-full sm:w-[420px] flex flex-col transition-transform duration-300 ease-out ${closing ? 'translate-x-full' : 'translate-x-0'}`}
        style={{
          background: '#f0f5f9',
          boxShadow: '-8px 0 30px rgba(0,0,0,0.12)',
        }}
        dir="rtl"
      >
        {/* Header */}
        <div
          className="flex-shrink-0 px-5 pt-5 pb-4"
          style={{
            background: 'linear-gradient(135deg, #0a1f2e 0%, #0f3654 50%, #1a5073 100%)',
          }}
        >
          <div className="flex items-center justify-between mb-1">
            {view === 'main' ? (
              <button
                onClick={handleClose}
                className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/10 active:scale-95 transition-all"
              >
                <X className="w-4.5 h-4.5 text-white/70" />
              </button>
            ) : (
              <button
                onClick={handleBack}
                className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/10 active:scale-95 transition-all"
              >
                <ChevronLeft className="w-4.5 h-4.5 text-white/70 rotate-180" />
              </button>
            )}
            <h2 className="text-[17px] font-black text-white tracking-tight">
              {view === 'main' && 'الإعدادات'}
              {view === 'profile' && 'معلومات الحساب'}
              {view === 'photo' && 'الصورة الشخصية'}
              {view === 'notifications' && 'الإشعارات'}
              {view === 'privacy' && 'الخصوصية'}
            </h2>
            <div className="w-9" />
          </div>
          {view === 'main' && (
            <p className="text-[11px] text-white/40 text-center mt-1">إدارة حسابك وتفضيلاتك</p>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 pt-4 pb-10" style={{ scrollbarWidth: 'thin', scrollbarColor: '#b8d0e0 transparent' }}>

          {/* Main Menu */}
          {view === 'main' && (
            <div className="space-y-2">
              {/* User card */}
              <div
                className="rounded-2xl p-4 mb-4"
                style={{ background: '#fff', border: '2px solid #e4edf3' }}
              >
                <div className="flex items-center gap-3">
                  {profileImageUrl ? (
                    <div
                      className="w-14 h-14 rounded-2xl overflow-hidden flex-shrink-0"
                      style={{ border: '3px solid #e4edf3' }}
                    >
                      <img src={profileImageUrl} alt="" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                      style={{
                        background: isCompany
                          ? 'linear-gradient(135deg, #0f2535, #1a4a5e)'
                          : 'linear-gradient(135deg, #1a6640, #27AE60)',
                        border: '3px solid #e4edf3',
                      }}
                    >
                      <span className="text-[18px] font-black text-white">
                        {(session.profile.display_name || session.profile.company_name || '')
                          .trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('') || (isCompany ? 'ش' : 'م')}
                      </span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-black text-[#1a2f3e] truncate">
                      {isCompany
                        ? (session.profile.company_name || session.profile.display_name || 'مستخدم')
                        : (session.profile.display_name || 'مستخدم')}
                    </p>
                    <p className="text-[11px] text-[#7a9aab] font-mono mt-0.5">{session.profile.phone}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span
                        className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                        style={{
                          background: isCompany ? '#EBF5FF' : '#E8F8F0',
                          color: isCompany ? '#2563eb' : '#16a34a',
                        }}
                      >
                        {isCompany ? 'شركة' : 'فردي'}
                      </span>
                      {session.profile.city && (
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#92400E]">
                          {session.profile.city}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Menu items */}
              <div className="bg-white rounded-2xl overflow-hidden" style={{ border: '2px solid #e4edf3' }}>
                {menuItems.map((item, i) => (
                  <button
                    key={item.id}
                    onClick={() => setView(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-4 active:bg-[#f0f5f9] transition-all ${
                      i < menuItems.length - 1 ? 'border-b border-[#f0f5f9]' : ''
                    }`}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: item.iconBg }}
                    >
                      <item.icon className="w-5 h-5" style={{ color: item.iconColor }} />
                    </div>
                    <div className="flex-1 text-right min-w-0">
                      <p className="text-[13px] font-bold text-[#1a2f3e]">{item.title}</p>
                      <p className="text-[10px] text-[#9ab0bf] mt-0.5">{item.desc}</p>
                    </div>
                    <ChevronLeft className="w-4 h-4 text-[#c0d5e0] flex-shrink-0" />
                  </button>
                ))}
              </div>

              {/* Version */}
              <div className="text-center pt-6">
                <p className="text-[10px] text-[#b8cdd8]">شبكة الطبليات v1.0</p>
              </div>
            </div>
          )}

          {/* Profile Edit */}
          {view === 'profile' && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl overflow-hidden" style={{ border: '2px solid #e4edf3' }}>
                {/* Name */}
                <div className="px-4 py-4 border-b border-[#f0f5f9]">
                  <label className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#EBF5FF' }}>
                      <User className="w-3.5 h-3.5 text-[#2563eb]" />
                    </div>
                    <span className="text-[12px] font-bold text-[#1a4a5e]">
                      {isCompany ? 'اسم المسؤول' : 'الاسم الكامل'}
                    </span>
                  </label>
                  <input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="أدخل اسمك"
                    className="w-full text-right text-[14px] font-semibold text-[#1a2f3e] bg-[#f8fafc] border-2 border-[#e4edf3] rounded-xl px-4 py-3 outline-none focus:border-[#2563eb] transition-colors"
                  />
                </div>

                {/* Company name */}
                {isCompany && (
                  <div className="px-4 py-4 border-b border-[#f0f5f9]">
                    <label className="flex items-center gap-2 mb-2">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#EBF5FF' }}>
                        <Building2 className="w-3.5 h-3.5 text-[#2563eb]" />
                      </div>
                      <span className="text-[12px] font-bold text-[#1a4a5e]">اسم الشركة / المنشأة</span>
                    </label>
                    <input
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="اسم الشركة"
                      className="w-full text-right text-[14px] font-semibold text-[#1a2f3e] bg-[#f8fafc] border-2 border-[#e4edf3] rounded-xl px-4 py-3 outline-none focus:border-[#2563eb] transition-colors"
                    />
                  </div>
                )}

                {/* Phone (read only) */}
                <div className="px-4 py-4 border-b border-[#f0f5f9]">
                  <label className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#E8F8F0' }}>
                      <Phone className="w-3.5 h-3.5 text-[#16a34a]" />
                    </div>
                    <span className="text-[12px] font-bold text-[#1a4a5e]">رقم الجوال</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 text-right text-[14px] font-semibold text-[#7a9aab] bg-[#f0f5f9] border-2 border-[#e4edf3] rounded-xl px-4 py-3 font-mono">
                      {session.profile.phone}
                    </div>
                    <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#E8F8F0]">
                      <Lock className="w-3 h-3 text-[#16a34a]" />
                      <span className="text-[9px] font-bold text-[#16a34a]">مؤكد</span>
                    </div>
                  </div>
                </div>

                {/* City */}
                <div className="px-4 py-4 border-b border-[#f0f5f9]">
                  <label className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#FFFBEB' }}>
                      <MapPin className="w-3.5 h-3.5 text-[#d97706]" />
                    </div>
                    <span className="text-[12px] font-bold text-[#1a4a5e]">المدينة</span>
                  </label>
                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full text-right text-[14px] font-semibold text-[#1a2f3e] bg-[#f8fafc] border-2 border-[#e4edf3] rounded-xl px-4 py-3 outline-none focus:border-[#d97706] transition-colors appearance-none"
                  >
                    <option value="">اختر المدينة</option>
                    {SAUDI_CITIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* Activity type */}
                <div className="px-4 py-4">
                  <label className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#F0F4F8' }}>
                      <Briefcase className="w-3.5 h-3.5 text-[#475569]" />
                    </div>
                    <span className="text-[12px] font-bold text-[#1a4a5e]">نوع النشاط التجاري</span>
                  </label>
                  <select
                    value={activityType}
                    onChange={(e) => setActivityType(e.target.value)}
                    className="w-full text-right text-[14px] font-semibold text-[#1a2f3e] bg-[#f8fafc] border-2 border-[#e4edf3] rounded-xl px-4 py-3 outline-none focus:border-[#475569] transition-colors appearance-none"
                  >
                    <option value="">اختر النشاط</option>
                    {ACTIVITY_TYPES.map(a => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Save button */}
              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="w-full py-4 rounded-2xl text-[14px] font-black text-white flex items-center justify-center gap-2 active:scale-[0.97] transition-all disabled:opacity-60"
                style={{
                  background: saved
                    ? 'linear-gradient(135deg, #16a34a, #15803d)'
                    : 'linear-gradient(135deg, #0f3654, #0a1f2e)',
                  boxShadow: saved
                    ? '0 4px 16px rgba(22,163,74,0.3)'
                    : '0 4px 16px rgba(15,54,84,0.3)',
                }}
              >
                {saved ? (
                  <>
                    <Check className="w-5 h-5" />
                    <span>تم الحفظ بنجاح</span>
                  </>
                ) : saving ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Pencil className="w-4 h-4" />
                    <span>حفظ التعديلات</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Photo */}
          {view === 'photo' && (
            <div className="space-y-4">
              <ProfileImageUploader
                currentImageUrl={profileImageUrl || undefined}
                userPhone={session.profile.phone}
                onImageUpdate={(url) => setProfileImageUrl(url)}
              />
            </div>
          )}

          {/* Notifications */}
          {view === 'notifications' && (
            <div className="space-y-4">
              <div
                className="rounded-2xl p-5 text-center"
                style={{ background: '#fff', border: '2px solid #e4edf3' }}
              >
                <div
                  className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center"
                  style={{ background: '#FFFBEB' }}
                >
                  <Bell className="w-8 h-8 text-[#d97706]" />
                </div>
                <h3 className="text-[16px] font-black text-[#1a2f3e] mb-2">الإشعارات</h3>
                <p className="text-[12px] text-[#7a9aab] leading-relaxed mb-4">
                  يتم إرسال الإشعارات تلقائياً عند وجود تحديثات على طلباتك وصفقاتك
                </p>

                <div className="space-y-3 text-right">
                  <NotificationToggle
                    label="إشعارات الصفقات"
                    desc="عند إنشاء أو تحديث صفقة"
                    defaultOn
                  />
                  <NotificationToggle
                    label="إشعارات المطابقة"
                    desc="عند مطابقة طلبك مع مخزون متاح"
                    defaultOn
                  />
                  <NotificationToggle
                    label="تحديثات السوق"
                    desc="عروض جديدة في منطقتك"
                    defaultOn={false}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Privacy */}
          {view === 'privacy' && (
            <div className="space-y-3">
              <div
                className="rounded-2xl overflow-hidden"
                style={{ background: '#fff', border: '2px solid #e4edf3' }}
              >
                <div className="px-5 py-4 border-b border-[#f0f5f9]">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#EBF5FF' }}>
                      <FileText className="w-5 h-5 text-[#2563eb]" />
                    </div>
                    <div>
                      <h3 className="text-[14px] font-black text-[#1a2f3e]">شروط الاستخدام</h3>
                      <p className="text-[10px] text-[#7a9aab]">آخر تحديث: مارس 2026</p>
                    </div>
                  </div>
                  <div className="text-[12px] text-[#475569] leading-relaxed space-y-2">
                    <p>باستخدامك لمنصة شبكة الطبليات، فإنك توافق على الشروط التالية:</p>
                    <ul className="space-y-1.5 pr-4 list-disc marker:text-[#9ab0bf]">
                      <li>المنصة وسيط بين الموردين والمشترين ولا تتحمل مسؤولية جودة المنتجات</li>
                      <li>يجب أن تكون المعلومات المقدمة صحيحة ودقيقة</li>
                      <li>يحق للمنصة تعليق الحسابات المخالفة</li>
                      <li>تخضع المعاملات لنظام العمولة المعتمد</li>
                    </ul>
                  </div>
                </div>

                <div className="px-5 py-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#F0F4F8' }}>
                      <Shield className="w-5 h-5 text-[#475569]" />
                    </div>
                    <div>
                      <h3 className="text-[14px] font-black text-[#1a2f3e]">سياسة الخصوصية</h3>
                      <p className="text-[10px] text-[#7a9aab]">حماية بياناتك أولوية</p>
                    </div>
                  </div>
                  <div className="text-[12px] text-[#475569] leading-relaxed space-y-2">
                    <ul className="space-y-1.5 pr-4 list-disc marker:text-[#9ab0bf]">
                      <li>نحتفظ ببياناتك بشكل آمن ومشفر</li>
                      <li>لا نشارك معلوماتك مع أطراف ثالثة بدون موافقتك</li>
                      <li>يمكنك طلب حذف حسابك وبياناتك في أي وقت</li>
                      <li>نستخدم البيانات فقط لتحسين تجربة المنصة</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div
                className="rounded-2xl p-4 flex items-center gap-3"
                style={{ background: '#EBF5FF', border: '2px solid #BFDBFE' }}
              >
                <Info className="w-5 h-5 text-[#2563eb] flex-shrink-0" />
                <p className="text-[11px] text-[#1e40af] leading-relaxed">
                  لأي استفسارات حول الخصوصية والبيانات، يمكنك التواصل مع فريق الدعم عبر المنصة.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function NotificationToggle({ label, desc, defaultOn = true }: { label: string; desc: string; defaultOn?: boolean }) {
  const [enabled, setEnabled] = useState(defaultOn);

  return (
    <div className="flex items-center justify-between gap-3 p-3 rounded-xl" style={{ background: '#f8fafc' }}>
      <button
        onClick={() => setEnabled(!enabled)}
        className="w-11 h-6 rounded-full p-0.5 transition-colors duration-200 flex-shrink-0"
        style={{ background: enabled ? '#16a34a' : '#cbd5e1' }}
      >
        <div
          className="w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200"
          style={{ transform: enabled ? 'translateX(-20px)' : 'translateX(0)' }}
        />
      </button>
      <div className="flex-1 text-right min-w-0">
        <p className="text-[12px] font-bold text-[#1a2f3e]">{label}</p>
        <p className="text-[10px] text-[#9ab0bf]">{desc}</p>
      </div>
    </div>
  );
}
