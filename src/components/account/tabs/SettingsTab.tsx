import { useState } from 'react';
import {
  User,
  Phone,
  Building2,
  MapPin,
  Bell,
  Shield,
  LogOut,
  ChevronLeft,
  Globe,
  Palette,
} from 'lucide-react';
import type { AppSession } from '../../../types/session';

interface Props {
  session: AppSession;
  onLogout: () => void;
}

export default function SettingsTab({ session, onLogout }: Props) {
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const isCompany = session.profile.user_type === 'company';

  const profileFields = [
    { label: 'الاسم', value: session.profile.display_name || '-', icon: User },
    { label: 'رقم الهاتف', value: session.profile.phone || '-', icon: Phone },
    ...(isCompany ? [{ label: 'اسم الشركة', value: session.profile.company_name || '-', icon: Building2 }] : []),
    { label: 'المدينة', value: session.profile.city || '-', icon: MapPin },
    { label: 'نوع الحساب', value: isCompany ? 'شركة' : 'فرد', icon: Shield },
  ];

  const settingSections = [
    {
      title: 'الحساب',
      items: [
        { label: 'بيانات الحساب', desc: 'تعديل المعلومات الشخصية', icon: User, color: '#1a4a5e' },
        { label: 'إعدادات الإشعارات', desc: 'التحكم بالإشعارات والتنبيهات', icon: Bell, color: '#0369a1' },
      ],
    },
    {
      title: 'التفضيلات',
      items: [
        { label: 'اللغة', desc: 'العربية', icon: Globe, color: '#059669' },
        { label: 'المظهر', desc: 'فاتح', icon: Palette, color: '#b45309' },
      ],
    },
    {
      title: 'الأمان',
      items: [
        { label: 'تغيير رمز الدخول', desc: 'تحديث رمز PIN', icon: Shield, color: '#dc2626' },
      ],
    },
  ];

  return (
    <div className="space-y-4" dir="rtl">
      {/* Profile Info Card */}
      <div
        className="bg-white rounded-2xl overflow-hidden"
        style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.04)' }}
      >
        <div className="px-4 py-3 border-b border-gray-50">
          <h3 className="text-[13px] font-bold text-[#1a3a4a]">معلومات الحساب</h3>
        </div>
        <div className="divide-y divide-gray-50">
          {profileFields.map((field, idx) => {
            const Icon = field.icon;
            return (
              <div key={idx} className="flex items-center justify-between px-4 py-3">
                <span className="text-[12px] text-[#1a3a4a] font-medium">{field.value}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[12px] text-[#7a9aab]">{field.label}</span>
                  <Icon className="w-4 h-4 text-[#b0c4d0]" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Settings Sections */}
      {settingSections.map((section, sIdx) => (
        <div key={sIdx}>
          <p className="text-[11px] font-bold text-[#7a9aab] mb-2 px-1">{section.title}</p>
          <div
            className="bg-white rounded-2xl overflow-hidden"
            style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.04)' }}
          >
            <div className="divide-y divide-gray-50">
              {section.items.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <button
                    key={idx}
                    className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50/50 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4 text-[#d0dce8] flex-shrink-0" />
                    <div className="flex-1 text-right min-w-0">
                      <p className="text-[12px] font-bold text-[#1a3a4a]">{item.label}</p>
                      <p className="text-[10px] text-[#7a9aab] mt-0.5">{item.desc}</p>
                    </div>
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: `${item.color}10` }}
                    >
                      <Icon className="w-4 h-4" style={{ color: item.color }} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ))}

      {/* Logout */}
      <div className="pt-2">
        {showLogoutConfirm ? (
          <div
            className="rounded-2xl p-4"
            style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}
          >
            <p className="text-[13px] font-bold text-[#dc2626] text-center mb-3">
              هل تريد تسجيل الخروج؟
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-2.5 rounded-xl text-[12px] font-bold text-[#6b7280] bg-white border border-gray-200"
              >
                إلغاء
              </button>
              <button
                onClick={onLogout}
                className="flex-1 py-2.5 rounded-xl text-[12px] font-bold text-white bg-[#dc2626]"
              >
                تسجيل الخروج
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-[13px] font-bold text-[#dc2626] bg-white border border-[#fecaca] active:scale-[0.98] transition-transform"
            style={{ boxShadow: '0 1px 4px rgba(220,38,38,0.06)' }}
          >
            <LogOut className="w-4 h-4" />
            تسجيل الخروج
          </button>
        )}
      </div>

      {/* App Version */}
      <p className="text-[10px] text-[#b0c4d0] text-center pb-4">
        شبكة الطبليات الوطنية v2.0
      </p>
    </div>
  );
}
