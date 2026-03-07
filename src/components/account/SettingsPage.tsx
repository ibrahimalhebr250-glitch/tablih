import { useState, useEffect } from 'react';
import { ArrowRight, User, Building2, MapPin, Briefcase, LogOut, Save, X, Edit3, Star, MessageSquare, Shield } from 'lucide-react';
import type { AppSession } from '../../types/session';
import { SAUDI_CITIES } from '../../types/inventory';
import { supabase } from '../../lib/supabase';
import { getTrustConfig } from '../shared/TrustRatingBadge';
import RatingsSection from './RatingsSection';
import { CommentsSection } from '../shared/CommentsSection';
import ProfileImageUploader from './ProfileImageUploader';

interface Props {
  session: AppSession;
  onClose: () => void;
  onLogout: () => void;
  onUpdateProfile: (updates: { company_name?: string; display_name?: string; city?: string; activity_type?: string }) => Promise<void>;
}

const ACTIVITY_TYPES = [
  'توزيع وتوريد',
  'تصنيع وإنتاج',
  'تجزئة وبيع',
  'لوجستيات ونقل',
  'تصدير واستيراد',
  'أخرى',
];

export default function SettingsPage({
  session,
  onClose,
  onLogout,
  onUpdateProfile
}: Props) {
  const [activeTab, setActiveTab] = useState<'profile' | 'ratings'>('profile');
  const [stats, setStats] = useState({
    completedDeals: 0,
    trustRating: 3,
  });

  const [editMode, setEditMode] = useState(false);
  const [displayName, setDisplayName] = useState(session.profile.display_name || '');
  const [companyName, setCompanyName] = useState(session.profile.company_name || '');
  const [city, setCity] = useState(session.profile.city || '');
  const [activityType, setActivityType] = useState(session.profile.activity_type || '');
  const [saving, setSaving] = useState(false);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);

  const isCompany = session.profile.user_type === 'company';
  const isSupplier = session.roles.includes('supplier');
  const isBuyer = session.roles.includes('buyer');
  const displayNameFinal = (isCompany ? companyName : displayName) || 'مستخدم';
  const initials = displayNameFinal.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('');

  useEffect(() => {
    const fetchStats = async () => {
      const phone = session.profile.phone;

      const [userRes, dealsRes] = await Promise.all([
        supabase.from('platform_users').select('trust_rating, profile_image_url').eq('phone', phone).maybeSingle(),
        supabase.from('deals').select('id, status').or(`supplier_phone.eq.${phone},buyer_phone.eq.${phone}`)
      ]);

      if (userRes.data?.profile_image_url) {
        setProfileImageUrl(userRes.data.profile_image_url);
      }

      const completedDeals = dealsRes.data?.filter(d => d.status === 'completed').length || 0;

      setStats({
        completedDeals,
        trustRating: userRes.data?.trust_rating || 3,
      });
    };

    fetchStats();
  }, [session.profile.phone]);

  const handleSaveProfile = async () => {
    setSaving(true);
    await onUpdateProfile({
      display_name: displayName,
      company_name: companyName,
      city,
      activity_type: activityType
    });
    setSaving(false);
    setEditMode(false);
  };

  const handleCancelEdit = () => {
    setDisplayName(session.profile.display_name || '');
    setCompanyName(session.profile.company_name || '');
    setCity(session.profile.city || '');
    setActivityType(session.profile.activity_type || '');
    setEditMode(false);
  };

  const trustConfig = getTrustConfig(stats.trustRating);
  const TrustIcon = trustConfig.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-gradient-to-r from-[#1a4a5e] via-[#2c5f7c] to-[#1a4a5e] shadow-lg">
        <div className="px-4 pt-6 pb-4">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/20 backdrop-blur-lg active:scale-90 transition-transform"
            >
              <ArrowRight className="w-5 h-5 text-white" />
            </button>

            <h1 className="text-[20px] font-black text-white">الإعدادات</h1>

            <div className="w-10" />
          </div>

          {/* Profile Card */}
          <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-4 border border-white/20" dir="rtl">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div
                  className="relative flex-shrink-0 overflow-hidden"
                  style={{
                    width: 70,
                    height: 70,
                    borderRadius: 20,
                    background: 'rgba(255,255,255,0.3)',
                    border: '3px solid rgba(255,255,255,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {profileImageUrl ? (
                    <img
                      src={profileImageUrl}
                      alt="الصورة الشخصية"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-[24px] font-black text-white">{initials}</span>
                  )}
                </div>
                <div
                  className="absolute -bottom-1 -right-1 w-8 h-8 rounded-xl flex items-center justify-center border-3 border-white"
                  style={{ background: trustConfig.color }}
                >
                  <TrustIcon className="w-4 h-4 text-white" />
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <h2 className="text-[18px] font-black text-white leading-tight mb-1 truncate">
                  {displayNameFinal}
                </h2>
                <p className="text-[10px] text-white/70 font-mono mb-2">{session.profile.phone}</p>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {isCompany && (
                    <span className="text-[9px] font-bold px-2 py-1 rounded-lg bg-white/20 text-white flex items-center gap-1">
                      <Building2 className="w-3 h-3" />
                      شركة
                    </span>
                  )}
                  {isSupplier && (
                    <span className="text-[9px] font-bold px-2 py-1 rounded-lg bg-white/20 text-white">
                      مورّد
                    </span>
                  )}
                  {isBuyer && (
                    <span className="text-[9px] font-bold px-2 py-1 rounded-lg bg-white/20 text-white">
                      مشتري
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-3 text-center border border-white/20">
                <Star className="w-4 h-4 mx-auto mb-1" style={{ color: trustConfig.color, fill: trustConfig.color }} />
                <p className="text-[11px] font-black" style={{ color: trustConfig.color }}>
                  {trustConfig.label}
                </p>
                <p className="text-[8px] text-white/60">التقييم</p>
              </div>

              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-3 text-center border border-white/20">
                <p className="text-[16px] font-black text-white">{stats.completedDeals}</p>
                <p className="text-[8px] text-white/60">صفقات مكتملة</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 py-4" dir="rtl">
        <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-1.5 grid grid-cols-2 gap-1.5">
          <button
            onClick={() => setActiveTab('profile')}
            className={`py-3 rounded-xl text-[13px] font-bold transition-all ${
              activeTab === 'profile'
                ? 'bg-gradient-to-r from-[#2c5f7c] to-[#1a4a5e] text-white shadow-md'
                : 'text-gray-600'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <User className="w-4 h-4" />
              الملف الشخصي
            </div>
          </button>

          <button
            onClick={() => setActiveTab('ratings')}
            className={`py-3 rounded-xl text-[13px] font-bold transition-all ${
              activeTab === 'ratings'
                ? 'bg-gradient-to-r from-[#2c5f7c] to-[#1a4a5e] text-white shadow-md'
                : 'text-gray-600'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Star className="w-4 h-4" />
              التقييمات
            </div>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pb-24">
        {activeTab === 'profile' ? (
          <div className="space-y-4" dir="rtl">
            {/* Profile Image Upload */}
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-4">
              <h3 className="text-[14px] font-bold text-gray-900 mb-3">الصورة الشخصية</h3>
              <ProfileImageUploader
                phone={session.profile.phone}
                currentImageUrl={profileImageUrl}
                onImageUploaded={(url) => setProfileImageUrl(url)}
              />
            </div>

            {/* Profile Info */}
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[14px] font-bold text-gray-900">البيانات الأساسية</h3>
                {!editMode ? (
                  <button
                    onClick={() => setEditMode(true)}
                    className="px-3 py-1.5 rounded-lg bg-[#2c5f7c] text-white text-[11px] font-bold flex items-center gap-1 active:scale-95 transition-transform"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    تعديل
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCancelEdit}
                      className="px-3 py-1.5 rounded-lg bg-gray-200 text-gray-700 text-[11px] font-bold flex items-center gap-1 active:scale-95 transition-transform"
                    >
                      <X className="w-3.5 h-3.5" />
                      إلغاء
                    </button>
                    <button
                      onClick={handleSaveProfile}
                      disabled={saving}
                      className="px-3 py-1.5 rounded-lg bg-[#27AE60] text-white text-[11px] font-bold flex items-center gap-1 active:scale-95 transition-transform disabled:opacity-50"
                    >
                      <Save className="w-3.5 h-3.5" />
                      حفظ
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                {isCompany ? (
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1.5">اسم الشركة</label>
                    {editMode ? (
                      <input
                        type="text"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 text-[13px] focus:border-[#2c5f7c] focus:outline-none"
                        placeholder="أدخل اسم الشركة"
                      />
                    ) : (
                      <div className="px-4 py-3 rounded-xl bg-gray-50 text-[13px] text-gray-900">
                        {companyName || 'غير محدد'}
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1.5">الاسم</label>
                    {editMode ? (
                      <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 text-[13px] focus:border-[#2c5f7c] focus:outline-none"
                        placeholder="أدخل اسمك"
                      />
                    ) : (
                      <div className="px-4 py-3 rounded-xl bg-gray-50 text-[13px] text-gray-900">
                        {displayName || 'غير محدد'}
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1.5">المدينة</label>
                  {editMode ? (
                    <select
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 text-[13px] focus:border-[#2c5f7c] focus:outline-none"
                    >
                      <option value="">اختر المدينة</option>
                      {SAUDI_CITIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  ) : (
                    <div className="px-4 py-3 rounded-xl bg-gray-50 text-[13px] text-gray-900 flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      {city || 'غير محدد'}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1.5">نوع النشاط</label>
                  {editMode ? (
                    <select
                      value={activityType}
                      onChange={(e) => setActivityType(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 text-[13px] focus:border-[#2c5f7c] focus:outline-none"
                    >
                      <option value="">اختر نوع النشاط</option>
                      {ACTIVITY_TYPES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  ) : (
                    <div className="px-4 py-3 rounded-xl bg-gray-50 text-[13px] text-gray-900 flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-gray-400" />
                      {activityType || 'غير محدد'}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1.5">رقم الجوال</label>
                  <div className="px-4 py-3 rounded-xl bg-gray-100 text-[13px] text-gray-500 flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    {session.profile.phone}
                  </div>
                </div>
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={onLogout}
              className="w-full bg-gradient-to-r from-red-500 to-red-600 text-white py-4 rounded-2xl text-[14px] font-bold shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2"
            >
              <LogOut className="w-5 h-5" />
              تسجيل الخروج
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-4">
              <RatingsSection phone={session.profile.phone} />
            </div>

            <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-4">
              <CommentsSection phone={session.profile.phone} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
