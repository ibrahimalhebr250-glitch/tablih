import { useState, useEffect } from 'react';
import { ArrowRight, User, Phone, MapPin, Briefcase, LogOut, Building2, Warehouse, ShoppingBag, Package, Handshake, Star, Percent, CheckCircle, TrendingUp, DollarSign, CreditCard as Edit3, Save, X, Sparkles, Award, Shield, Target } from 'lucide-react';
import type { AppSession } from '../../types/session';
import { SAUDI_CITIES } from '../../types/inventory';
import { supabase } from '../../lib/supabase';
import { getTrustConfig } from '../shared/TrustRatingBadge';
import RatingsSection from './RatingsSection';
import { CommentsSection } from '../shared/CommentsSection';
import ProfileImageUploader from './ProfileImageUploader';

interface Props {
  session: AppSession;
  freshLogin?: boolean;
  onClose: () => void;
  onLogout: () => void;
  onUpdateProfile: (updates: { company_name?: string; display_name?: string; city?: string; activity_type?: string }) => Promise<void>;
  onOpenSupplierDeals?: () => void;
  onOpenBuyerDeals?: () => void;
  onOpenSupplierInventory?: () => void;
  onOpenPurchasedInventory?: () => void;
}

const ACTIVITY_TYPES = [
  'توزيع وتوريد',
  'تصنيع وإنتاج',
  'تجزئة وبيع',
  'لوجستيات ونقل',
  'تصدير واستيراد',
  'أخرى',
];

export default function EnhancedAccountPage({
  session,
  freshLogin = false,
  onClose,
  onLogout,
  onUpdateProfile,
  onOpenSupplierDeals,
  onOpenBuyerDeals,
  onOpenSupplierInventory,
  onOpenPurchasedInventory
}: Props) {
  const [stats, setStats] = useState({
    completedDeals: 0,
    pendingDeals: 0,
    totalRevenue: 0,
    totalSpent: 0,
    activeListings: 0,
    totalOrders: 0,
    trustRating: 3,
    successRate: 0,
  });

  const [activeTab, setActiveTab] = useState<'overview' | 'settings' | 'ratings'>('overview');
  const [showWelcome, setShowWelcome] = useState(freshLogin);

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

      const [userRes, ordersRes, dealsRes, inventoryRes] = await Promise.all([
        supabase.from('platform_users').select('trust_rating, profile_image_url').eq('phone', phone).maybeSingle(),
        supabase.from('orders').select('id, status').eq('phone', phone),
        supabase.from('deals').select('id, status, buyer_price, supplier_price').or(`supplier_phone.eq.${phone},buyer_phone.eq.${phone}`),
        supabase.from('inventory_batches').select('id').eq('supplier_phone', phone).eq('published', true)
      ]);

      // تحديث صورة الملف الشخصي
      if (userRes.data?.profile_image_url) {
        setProfileImageUrl(userRes.data.profile_image_url);
      }

      const completedDeals = dealsRes.data?.filter(d => d.status === 'completed').length || 0;
      const pendingDeals = dealsRes.data?.filter(d => ['matched', 'awaiting_buyer', 'inventory_reserved', 'in_delivery'].includes(d.status)).length || 0;
      const totalDeals = dealsRes.data?.length || 0;
      const successRate = totalDeals > 0 ? Math.round((completedDeals / totalDeals) * 100) : 0;

      const totalRevenue = dealsRes.data
        ?.filter(d => d.status === 'completed' && d.supplier_phone === phone && d.supplier_price)
        .reduce((sum, d) => sum + (d.supplier_price || 0), 0) || 0;

      const totalSpent = dealsRes.data
        ?.filter(d => d.status === 'completed' && d.buyer_phone === phone && d.buyer_price)
        .reduce((sum, d) => sum + (d.buyer_price || 0), 0) || 0;

      setStats({
        completedDeals,
        pendingDeals,
        totalRevenue,
        totalSpent,
        activeListings: inventoryRes.data?.length || 0,
        totalOrders: ordersRes.data?.length || 0,
        trustRating: userRes.data?.trust_rating || 3,
        successRate,
      });
    };

    fetchStats();
  }, [session.profile.phone]);

  useEffect(() => {
    if (freshLogin) {
      const t = setTimeout(() => setShowWelcome(false), 3000);
      return () => clearTimeout(t);
    }
  }, [freshLogin]);

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

  const trustConfig = getTrustConfig(stats.trustRating);
  const TrustIcon = trustConfig.icon;

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)' }}>
      {/* Header with Profile Card */}
      <div
        className="relative overflow-hidden pb-24"
        style={{
          background: isCompany
            ? 'linear-gradient(135deg, #0a1f2e 0%, #1a4a5e 50%, #2c6f8a 100%)'
            : 'linear-gradient(135deg, #1a6640 0%, #27AE60 50%, #34d399 100%)',
        }}
      >
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `
              radial-gradient(circle at 20% 30%, white 0%, transparent 50%),
              radial-gradient(circle at 80% 70%, white 0%, transparent 50%)
            `,
          }}
        />

        <button
          onClick={onClose}
          className="absolute top-4 left-4 w-11 h-11 rounded-2xl flex items-center justify-center z-10 transition-all active:scale-90"
          style={{
            background: 'rgba(255,255,255,0.2)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <ArrowRight className="w-5 h-5 text-white" />
        </button>

        {showWelcome && (
          <div className="absolute inset-0 flex items-center justify-center z-20 animate-in fade-in duration-500">
            <div
              className="px-8 py-6 rounded-3xl text-center"
              style={{
                background: 'rgba(255,255,255,0.2)',
                backdropFilter: 'blur(20px)',
                border: '2px solid rgba(255,255,255,0.3)',
              }}
            >
              <Sparkles className="w-16 h-16 text-white mx-auto mb-3 animate-pulse" />
              <h2 className="text-[24px] font-black text-white mb-2">أهلاً بك!</h2>
              <p className="text-[14px] text-white/80">تم الدخول بنجاح</p>
            </div>
          </div>
        )}

        <div className="relative px-6 pt-16" dir="rtl">
          <div className="flex items-center gap-4 mb-6">
            <div
              className="relative flex-shrink-0"
              style={{
                width: 80,
                height: 80,
                borderRadius: 22,
                background: 'rgba(255,255,255,0.25)',
                backdropFilter: 'blur(12px)',
                border: '3px solid rgba(255,255,255,0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}
            >
              {profileImageUrl ? (
                <img
                  src={profileImageUrl}
                  alt="الصورة الشخصية"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-[28px] font-black text-white">{initials}</span>
              )}
              <div
                className="absolute -bottom-2 -right-2 w-9 h-9 rounded-xl flex items-center justify-center border-3 border-white"
                style={{ background: trustConfig.color }}
              >
                <TrustIcon className="w-4.5 h-4.5 text-white" />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <h1 className="text-[22px] font-black text-white leading-tight mb-1 truncate">
                {displayNameFinal}
              </h1>
              <p className="text-[11px] text-white/70 font-mono mb-2">{session.profile.phone}</p>
              <div className="flex items-center gap-1.5 flex-wrap">
                {isCompany && (
                  <span className="text-[9px] font-bold px-2.5 py-1 rounded-lg bg-white/20 text-white flex items-center gap-1">
                    <Building2 className="w-3 h-3" />
                    شركة
                  </span>
                )}
                {isSupplier && (
                  <span className="text-[9px] font-bold px-2.5 py-1 rounded-lg bg-white/20 text-white flex items-center gap-1">
                    <Warehouse className="w-3 h-3" />
                    مورّد
                  </span>
                )}
                {isBuyer && (
                  <span className="text-[9px] font-bold px-2.5 py-1 rounded-lg bg-white/20 text-white flex items-center gap-1">
                    <ShoppingBag className="w-3 h-3" />
                    مشتري
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <div
              className="rounded-2xl px-3 py-3 text-center"
              style={{
                background: 'rgba(255,255,255,0.2)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255,255,255,0.3)',
              }}
            >
              <div className="flex items-center justify-center mb-1.5">
                <Star className="w-4 h-4" style={{ color: trustConfig.color, fill: trustConfig.color }} />
              </div>
              <p className="text-[11px] font-black" style={{ color: trustConfig.color }}>
                {trustConfig.label}
              </p>
              <p className="text-[8px] text-white/60">التقييم</p>
            </div>

            <div
              className="rounded-2xl px-3 py-3 text-center"
              style={{
                background: 'rgba(255,255,255,0.2)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255,255,255,0.3)',
              }}
            >
              <CheckCircle className="w-4 h-4 text-white mx-auto mb-1.5" />
              <p className="text-[16px] font-black text-white">{stats.completedDeals}</p>
              <p className="text-[8px] text-white/60">مكتملة</p>
            </div>

            <div
              className="rounded-2xl px-3 py-3 text-center"
              style={{
                background: 'rgba(255,255,255,0.2)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255,255,255,0.3)',
              }}
            >
              <Percent className="w-4 h-4 text-white mx-auto mb-1.5" />
              <p className="text-[16px] font-black text-white">{stats.successRate}%</p>
              <p className="text-[8px] text-white/60">نسبة النجاح</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-6 -mt-16 mb-6 relative z-10" dir="rtl">
        <div
          className="rounded-3xl p-1.5 grid grid-cols-3 gap-1.5"
          style={{
            background: 'white',
            boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
          }}
        >
          <button
            onClick={() => setActiveTab('overview')}
            className="px-4 py-3 rounded-2xl font-bold text-[12px] transition-all"
            style={{
              background: activeTab === 'overview' ? 'linear-gradient(135deg, #2563eb, #1d4ed8)' : 'transparent',
              color: activeTab === 'overview' ? 'white' : '#64748b',
            }}
          >
            نظرة عامة
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className="px-4 py-3 rounded-2xl font-bold text-[12px] transition-all"
            style={{
              background: activeTab === 'settings' ? 'linear-gradient(135deg, #2563eb, #1d4ed8)' : 'transparent',
              color: activeTab === 'settings' ? 'white' : '#64748b',
            }}
          >
            الإعدادات
          </button>
          <button
            onClick={() => setActiveTab('ratings')}
            className="px-4 py-3 rounded-2xl font-bold text-[12px] transition-all"
            style={{
              background: activeTab === 'ratings' ? 'linear-gradient(135deg, #2563eb, #1d4ed8)' : 'transparent',
              color: activeTab === 'ratings' ? 'white' : '#64748b',
            }}
          >
            التقييمات
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 pb-20" dir="rtl">
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* Quick Actions */}
            <div className="rounded-3xl bg-white p-5 border" style={{ borderColor: '#e5e7eb' }}>
              <div className="flex items-center gap-2 mb-4">
                <Target className="w-5 h-5 text-[#2563eb]" />
                <h3 className="text-[15px] font-black text-[#1a4a5e]">الإجراءات السريعة</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {isSupplier && onOpenSupplierInventory && (
                  <button
                    onClick={onOpenSupplierInventory}
                    className="relative p-4 rounded-2xl transition-all active:scale-95"
                    style={{
                      background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
                      border: '2px solid #93c5fd',
                    }}
                  >
                    {stats.activeListings > 0 && (
                      <div
                        className="absolute -top-2 -right-2 w-6 h-6 rounded-xl flex items-center justify-center border-2 border-white"
                        style={{ background: '#2563eb' }}
                      >
                        <span className="text-[10px] font-black text-white">{stats.activeListings}</span>
                      </div>
                    )}
                    <Warehouse className="w-6 h-6 text-[#2563eb] mb-2" />
                    <p className="text-[12px] font-black text-[#2563eb]">مستودعي</p>
                  </button>
                )}
                {isSupplier && onOpenSupplierDeals && (
                  <button
                    onClick={onOpenSupplierDeals}
                    className="p-4 rounded-2xl transition-all active:scale-95"
                    style={{
                      background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)',
                      border: '2px solid #6ee7b7',
                    }}
                  >
                    <Handshake className="w-6 h-6 text-[#059669] mb-2" />
                    <p className="text-[12px] font-black text-[#059669]">صفقات التوريد</p>
                  </button>
                )}
                {isBuyer && onOpenPurchasedInventory && (
                  <button
                    onClick={onOpenPurchasedInventory}
                    className="p-4 rounded-2xl transition-all active:scale-95"
                    style={{
                      background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)',
                      border: '2px solid #6ee7b7',
                    }}
                  >
                    <Package className="w-6 h-6 text-[#059669] mb-2" />
                    <p className="text-[12px] font-black text-[#059669]">مشترياتي</p>
                  </button>
                )}
                {isBuyer && onOpenBuyerDeals && (
                  <button
                    onClick={onOpenBuyerDeals}
                    className="relative p-4 rounded-2xl transition-all active:scale-95"
                    style={{
                      background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                      border: '2px solid #fbbf24',
                    }}
                  >
                    {stats.totalOrders > 0 && (
                      <div
                        className="absolute -top-2 -right-2 w-6 h-6 rounded-xl flex items-center justify-center border-2 border-white"
                        style={{ background: '#f59e0b' }}
                      >
                        <span className="text-[10px] font-black text-white">{stats.totalOrders}</span>
                      </div>
                    )}
                    <ShoppingBag className="w-6 h-6 text-[#f59e0b] mb-2" />
                    <p className="text-[12px] font-black text-[#f59e0b]">طلباتي</p>
                  </button>
                )}
              </div>
            </div>

            {/* Statistics */}
            <div className="rounded-3xl bg-white p-5 border" style={{ borderColor: '#e5e7eb' }}>
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-[#27AE60]" />
                <h3 className="text-[15px] font-black text-[#1a4a5e]">الإحصائيات</h3>
              </div>
              <div className="space-y-3">
                {isSupplier && (
                  <div className="flex items-center justify-between p-3 rounded-2xl" style={{ background: '#f8fafc' }}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#dcfce7' }}>
                        <DollarSign className="w-5 h-5 text-[#27AE60]" />
                      </div>
                      <div>
                        <p className="text-[12px] font-bold text-[#1a4a5e]">إجمالي الإيرادات</p>
                        <p className="text-[10px] text-[#64748b]">من الصفقات المكتملة</p>
                      </div>
                    </div>
                    <p className="text-[15px] font-black text-[#27AE60]">
                      {stats.totalRevenue.toLocaleString('ar-SA')} ر.س
                    </p>
                  </div>
                )}
                {isBuyer && (
                  <div className="flex items-center justify-between p-3 rounded-2xl" style={{ background: '#f8fafc' }}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#fee2e2' }}>
                        <DollarSign className="w-5 h-5 text-[#dc2626]" />
                      </div>
                      <div>
                        <p className="text-[12px] font-bold text-[#1a4a5e]">إجمالي الإنفاق</p>
                        <p className="text-[10px] text-[#64748b]">من المشتريات</p>
                      </div>
                    </div>
                    <p className="text-[15px] font-black text-[#dc2626]">
                      {stats.totalSpent.toLocaleString('ar-SA')} ر.س
                    </p>
                  </div>
                )}
                <div className="flex items-center justify-between p-3 rounded-2xl" style={{ background: '#f8fafc' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#dbeafe' }}>
                      <Handshake className="w-5 h-5 text-[#2563eb]" />
                    </div>
                    <div>
                      <p className="text-[12px] font-bold text-[#1a4a5e]">الصفقات الجارية</p>
                      <p className="text-[10px] text-[#64748b]">قيد التنفيذ</p>
                    </div>
                  </div>
                  <p className="text-[15px] font-black text-[#2563eb]">{stats.pendingDeals}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-4">
            {/* قسم رفع الصورة */}
            <ProfileImageUploader
              currentImageUrl={profileImageUrl || undefined}
              userPhone={session.profile.phone}
              onImageUpdate={setProfileImageUrl}
            />

            <div className="rounded-3xl bg-white p-5 border" style={{ borderColor: '#e5e7eb' }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[15px] font-black text-[#1a4a5e]">معلومات الحساب</h3>
                {!editMode ? (
                  <button
                    onClick={() => setEditMode(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all active:scale-95"
                    style={{ background: '#dbeafe', color: '#2563eb' }}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    تعديل
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditMode(false)}
                      className="w-8 h-8 rounded-xl flex items-center justify-center bg-red-50"
                    >
                      <X className="w-4 h-4 text-red-500" />
                    </button>
                    <button
                      onClick={handleSaveProfile}
                      disabled={saving}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all active:scale-95 disabled:opacity-50"
                      style={{ background: 'linear-gradient(135deg, #27AE60, #1e9652)', color: 'white' }}
                    >
                      {saving ? (
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Save className="w-3.5 h-3.5" />
                      )}
                      حفظ
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#64748b] mb-1.5">
                    {isCompany ? 'اسم المسؤول' : 'الاسم الكامل'}
                  </label>
                  <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-gray-50 border" style={{ borderColor: '#e5e7eb' }}>
                    <User className="w-4 h-4 text-[#2563eb]" />
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      disabled={!editMode}
                      placeholder="أدخل الاسم"
                      className="flex-1 bg-transparent text-[13px] font-semibold text-[#1a4a5e] outline-none disabled:opacity-60"
                    />
                  </div>
                </div>

                {isCompany && (
                  <div>
                    <label className="block text-[11px] font-bold text-[#64748b] mb-1.5">
                      اسم الشركة / المنشأة
                    </label>
                    <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-gray-50 border" style={{ borderColor: '#e5e7eb' }}>
                      <Building2 className="w-4 h-4 text-[#2563eb]" />
                      <input
                        type="text"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        disabled={!editMode}
                        placeholder="أدخل اسم الشركة"
                        className="flex-1 bg-transparent text-[13px] font-semibold text-[#1a4a5e] outline-none disabled:opacity-60"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-bold text-[#64748b] mb-1.5">رقم الجوال</label>
                  <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-gray-50 border" style={{ borderColor: '#e5e7eb' }}>
                    <Phone className="w-4 h-4 text-[#27AE60]" />
                    <input
                      type="text"
                      value={session.profile.phone}
                      disabled
                      className="flex-1 bg-transparent text-[13px] font-semibold text-[#1a4a5e] font-mono outline-none"
                    />
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-[#27AE60]">
                      مؤكد
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#64748b] mb-1.5">المدينة</label>
                  <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-gray-50 border" style={{ borderColor: '#e5e7eb' }}>
                    <MapPin className="w-4 h-4 text-[#F59E0B]" />
                    {editMode ? (
                      <select
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="flex-1 bg-transparent text-[13px] font-semibold text-[#1a4a5e] outline-none"
                      >
                        <option value="">اختر المدينة</option>
                        {SAUDI_CITIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={city || 'غير محدد'}
                        disabled
                        className="flex-1 bg-transparent text-[13px] font-semibold text-[#1a4a5e] outline-none"
                      />
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#64748b] mb-1.5">نوع النشاط التجاري</label>
                  <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-gray-50 border" style={{ borderColor: '#e5e7eb' }}>
                    <Briefcase className="w-4 h-4 text-[#64748b]" />
                    {editMode ? (
                      <select
                        value={activityType}
                        onChange={(e) => setActivityType(e.target.value)}
                        className="flex-1 bg-transparent text-[13px] font-semibold text-[#1a4a5e] outline-none"
                      >
                        <option value="">اختر النشاط</option>
                        {ACTIVITY_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={activityType || 'غير محدد'}
                        disabled
                        className="flex-1 bg-transparent text-[13px] font-semibold text-[#1a4a5e] outline-none"
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'ratings' && (
          <div className="space-y-4">
            <RatingsSection userPhone={session.profile.phone} />
            <CommentsSection userPhone={session.profile.phone} maxComments={10} />
          </div>
        )}

        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-3 px-5 py-4 rounded-3xl border-2 transition-all active:scale-98 mt-6"
          style={{
            background: 'linear-gradient(135deg, #fef2f2, #fee2e2)',
            borderColor: '#fecaca',
          }}
        >
          <LogOut className="w-5 h-5 text-[#dc2626]" />
          <p className="text-[14px] font-black text-[#dc2626]">تسجيل الخروج</p>
        </button>
      </div>
    </div>
  );
}
