import { useState, useEffect } from 'react';
import {
  ArrowRight, User, Phone, MapPin, Briefcase, LogOut,
  Building2, Handshake, ShoppingBag, Warehouse, Settings,
  Sparkles, Star, TrendingUp, Package, CheckCircle, Activity,
  Edit3, Save, X, ChevronLeft, Bell, Shield, History,
  BarChart3, Zap, Target, Award, Users, Clock, Calendar,
  FileText, TrendingDown, DollarSign, Percent, Eye, EyeOff
} from 'lucide-react';
import type { AppSession } from '../../types/session';
import { SAUDI_CITIES } from '../../types/inventory';
import { supabase } from '../../lib/supabase';
import { getTrustConfig } from '../shared/TrustRatingBadge';
import RatingsSection from './RatingsSection';
import { CommentsSection } from '../shared/CommentsSection';
import { useDashboard } from '../../hooks/useDashboard';

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

interface DashboardStats {
  totalOrders: number;
  completedDeals: number;
  pendingDeals: number;
  totalRevenue: number;
  activeListings: number;
  trustRating: number;
  successRate: number;
  totalSpent: number;
  recentActivity: string;
}

interface RecentActivity {
  id: string;
  type: 'order' | 'deal' | 'inventory';
  title: string;
  subtitle: string;
  timestamp: Date;
  status: 'success' | 'pending' | 'warning';
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
  const [stats, setStats] = useState<DashboardStats>({
    totalOrders: 0,
    completedDeals: 0,
    pendingDeals: 0,
    totalRevenue: 0,
    activeListings: 0,
    trustRating: 3,
    successRate: 0,
    totalSpent: 0,
    recentActivity: 'منذ دقائق'
  });

  const [activeView, setActiveView] = useState<'overview' | 'activity' | 'settings' | 'ratings'>('overview');
  const [showWelcome, setShowWelcome] = useState(freshLogin);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);

  const [editMode, setEditMode] = useState(false);
  const [displayName, setDisplayName] = useState(session.profile.display_name || '');
  const [companyName, setCompanyName] = useState(session.profile.company_name || '');
  const [city, setCity] = useState(session.profile.city || '');
  const [activityType, setActivityType] = useState(session.profile.activity_type || '');
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { orders } = useDashboard(session.profile.phone);

  const isCompany = session.profile.user_type === 'company';
  const isSupplier = session.roles.includes('supplier');
  const isBuyer = session.roles.includes('buyer');
  const displayNameFinal = (isCompany ? companyName : displayName) || 'مستخدم';
  const initials = displayNameFinal.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('');

  useEffect(() => {
    const fetchStats = async () => {
      const phone = session.profile.phone;

      const [userRes, ordersRes, dealsRes, inventoryRes] = await Promise.all([
        supabase.from('platform_users').select('trust_rating').eq('phone', phone).maybeSingle(),
        supabase.from('orders').select('id, status').eq('phone', phone),
        supabase.from('deals').select('id, status, created_at, buyer_price, supplier_price').or(`supplier_phone.eq.${phone},buyer_phone.eq.${phone}`),
        supabase.from('inventory_batches').select('id, created_at').eq('supplier_phone', phone).eq('published', true)
      ]);

      const completedDeals = dealsRes.data?.filter(d => d.status === 'completed').length || 0;
      const pendingDeals = dealsRes.data?.filter(d => ['matched', 'awaiting_buyer', 'inventory_reserved', 'in_delivery'].includes(d.status)).length || 0;
      const totalDeals = dealsRes.data?.length || 0;
      const successRate = totalDeals > 0 ? Math.round((completedDeals / totalDeals) * 100) : 0;

      const totalRevenue = dealsRes.data
        ?.filter(d => d.status === 'completed' && d.supplier_price)
        .reduce((sum, d) => sum + (d.supplier_price || 0), 0) || 0;

      const totalSpent = dealsRes.data
        ?.filter(d => d.status === 'completed' && d.buyer_price)
        .reduce((sum, d) => sum + (d.buyer_price || 0), 0) || 0;

      const activities: RecentActivity[] = [];

      ordersRes.data?.slice(0, 3).forEach(order => {
        activities.push({
          id: order.id,
          type: 'order',
          title: 'طلب جديد',
          subtitle: order.status === 'matched' ? 'تمت المطابقة' : 'قيد الانتظار',
          timestamp: new Date(),
          status: order.status === 'matched' ? 'success' : 'pending'
        });
      });

      dealsRes.data?.slice(0, 2).forEach(deal => {
        activities.push({
          id: deal.id,
          type: 'deal',
          title: 'صفقة',
          subtitle: deal.status === 'completed' ? 'مكتملة' : 'جارية',
          timestamp: new Date(deal.created_at),
          status: deal.status === 'completed' ? 'success' : 'pending'
        });
      });

      inventoryRes.data?.slice(0, 2).forEach(inv => {
        activities.push({
          id: inv.id,
          type: 'inventory',
          title: 'إضافة مخزون',
          subtitle: 'تم النشر',
          timestamp: new Date(inv.created_at),
          status: 'success'
        });
      });

      activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      setRecentActivities(activities.slice(0, 5));

      setStats({
        totalOrders: ordersRes.data?.length || 0,
        completedDeals,
        pendingDeals,
        totalRevenue,
        activeListings: inventoryRes.count || 0,
        trustRating: userRes.data?.trust_rating || 3,
        successRate,
        totalSpent,
        recentActivity: activities.length > 0 ? 'نشط الآن' : 'منذ ساعات'
      });
    };

    fetchStats();
  }, [session.profile.phone]);

  useEffect(() => {
    if (freshLogin) {
      const t = setTimeout(() => setShowWelcome(false), 4000);
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

  const tabs = [
    { id: 'overview' as const, label: 'نظرة عامة', icon: BarChart3 },
    { id: 'activity' as const, label: 'النشاط', icon: History },
    { id: 'settings' as const, label: 'الإعدادات', icon: Settings },
    { id: 'ratings' as const, label: 'التقييمات', icon: Star },
  ];

  return (
    <div className="min-h-screen pb-20" style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 50%, #e2e8f0 100%)' }}>
      {/* Enhanced Header */}
      <div
        className="relative overflow-hidden"
        style={{
          background: isCompany
            ? 'linear-gradient(135deg, #0a1f2e 0%, #1a4a5e 40%, #2c6f8a 100%)'
            : 'linear-gradient(135deg, #1a6640 0%, #27AE60 40%, #34d399 100%)',
          paddingTop: '2rem',
          paddingBottom: '7rem',
        }}
      >
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `
              radial-gradient(circle at 15% 20%, white 0%, transparent 40%),
              radial-gradient(circle at 85% 80%, white 0%, transparent 50%),
              radial-gradient(circle at 50% 50%, white 0%, transparent 60%)
            `,
          }}
        />

        <button
          onClick={onClose}
          className="absolute top-4 left-4 w-10 h-10 rounded-2xl flex items-center justify-center z-10 transition-all active:scale-90"
          style={{
            background: 'rgba(255,255,255,0.15)',
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
                background: 'rgba(255,255,255,0.15)',
                backdropFilter: 'blur(20px)',
                border: '2px solid rgba(255,255,255,0.2)',
              }}
            >
              <Sparkles className="w-16 h-16 text-white mx-auto mb-3 animate-pulse" />
              <h2 className="text-[24px] font-black text-white mb-2">أهلاً بك!</h2>
              <p className="text-[14px] text-white/80">تم الدخول إلى حسابك بنجاح</p>
            </div>
          </div>
        )}

        <div className="relative px-6 pt-4" dir="rtl">
          <div className="flex items-start gap-4 mb-6">
            <div
              className="relative"
              style={{
                width: 88,
                height: 88,
                borderRadius: 24,
                background: 'rgba(255,255,255,0.2)',
                backdropFilter: 'blur(12px)',
                border: '3px solid rgba(255,255,255,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <span className="text-[32px] font-black text-white tracking-tight">{initials}</span>
              <div
                className="absolute -bottom-2 -right-2 w-10 h-10 rounded-2xl flex items-center justify-center border-3 border-white shadow-xl"
                style={{ background: trustConfig.color }}
              >
                <TrustIcon className="w-5 h-5 text-white" />
              </div>
            </div>

            <div className="flex-1 min-w-0 pt-1">
              <h1 className="text-[24px] font-black text-white leading-tight mb-1.5 truncate">
                {displayNameFinal}
              </h1>
              <p className="text-[12px] text-white/60 font-mono mb-3">{session.profile.phone}</p>
              <div className="flex items-center gap-2 flex-wrap">
                {isCompany && (
                  <span className="text-[10px] font-bold px-3 py-1 rounded-full bg-white/20 text-white flex items-center gap-1">
                    <Building2 className="w-3 h-3" />
                    شركة
                  </span>
                )}
                {isSupplier && (
                  <span className="text-[10px] font-bold px-3 py-1 rounded-full bg-white/20 text-white flex items-center gap-1">
                    <Warehouse className="w-3 h-3" />
                    مورّد
                  </span>
                )}
                {isBuyer && (
                  <span className="text-[10px] font-bold px-3 py-1 rounded-full bg-white/20 text-white flex items-center gap-1">
                    <ShoppingBag className="w-3 h-3" />
                    مشتري
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div
              className="rounded-2xl px-4 py-3"
              style={{
                background: 'rgba(255,255,255,0.15)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255,255,255,0.2)',
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <TrustIcon className="w-5 h-5" style={{ color: trustConfig.color }} />
                <p className="text-[10px] text-white/60">التقييم</p>
              </div>
              <p className="text-[14px] font-black mb-1" style={{ color: trustConfig.color }}>
                {trustConfig.label}
              </p>
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star
                    key={i}
                    className="w-3 h-3"
                    style={{
                      color: i <= stats.trustRating ? trustConfig.color : 'rgba(255,255,255,0.3)',
                      fill: i <= stats.trustRating ? trustConfig.color : 'none',
                    }}
                  />
                ))}
              </div>
            </div>

            <div
              className="rounded-2xl px-4 py-3"
              style={{
                background: 'rgba(255,255,255,0.15)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255,255,255,0.2)',
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <Percent className="w-5 h-5 text-white" />
                <p className="text-[10px] text-white/60">نسبة النجاح</p>
              </div>
              <p className="text-[20px] font-black text-white">
                {stats.successRate}%
              </p>
              <p className="text-[9px] text-white/50">{stats.completedDeals} صفقة مكتملة</p>
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 px-6 translate-y-1/2" dir="rtl">
          <div className="grid grid-cols-3 gap-2.5">
            {isSupplier && (
              <>
                <div
                  className="rounded-2xl px-3 py-3 border-2"
                  style={{
                    background: 'white',
                    borderColor: '#e5e7eb',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                  }}
                >
                  <DollarSign className="w-5 h-5 text-[#27AE60] mb-2" />
                  <p className="text-[9px] text-[#64748b] mb-1">الإيرادات</p>
                  <p className="text-[15px] font-black text-[#1a4a5e] truncate">
                    {stats.totalRevenue.toLocaleString('ar-SA')}
                    <span className="text-[9px] font-medium text-[#7a9aab]"> ر.س</span>
                  </p>
                </div>
                <div
                  className="rounded-2xl px-3 py-3 border-2"
                  style={{
                    background: 'white',
                    borderColor: '#e5e7eb',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                  }}
                >
                  <Package className="w-5 h-5 text-[#2196F3] mb-2" />
                  <p className="text-[9px] text-[#64748b] mb-1">المنتجات</p>
                  <p className="text-[15px] font-black text-[#1a4a5e]">
                    {stats.activeListings}
                  </p>
                </div>
                <div
                  className="rounded-2xl px-3 py-3 border-2"
                  style={{
                    background: 'white',
                    borderColor: '#e5e7eb',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                  }}
                >
                  <Handshake className="w-5 h-5 text-[#F59E0B] mb-2" />
                  <p className="text-[9px] text-[#64748b] mb-1">جارية</p>
                  <p className="text-[15px] font-black text-[#1a4a5e]">
                    {stats.pendingDeals}
                  </p>
                </div>
              </>
            )}
            {isBuyer && !isSupplier && (
              <>
                <div
                  className="rounded-2xl px-3 py-3 border-2"
                  style={{
                    background: 'white',
                    borderColor: '#e5e7eb',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                  }}
                >
                  <Activity className="w-5 h-5 text-[#2563eb] mb-2" />
                  <p className="text-[9px] text-[#64748b] mb-1">الطلبات</p>
                  <p className="text-[15px] font-black text-[#1a4a5e]">
                    {stats.totalOrders}
                  </p>
                </div>
                <div
                  className="rounded-2xl px-3 py-3 border-2"
                  style={{
                    background: 'white',
                    borderColor: '#e5e7eb',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                  }}
                >
                  <CheckCircle className="w-5 h-5 text-[#27AE60] mb-2" />
                  <p className="text-[9px] text-[#64748b] mb-1">مكتملة</p>
                  <p className="text-[15px] font-black text-[#1a4a5e]">
                    {stats.completedDeals}
                  </p>
                </div>
                <div
                  className="rounded-2xl px-3 py-3 border-2"
                  style={{
                    background: 'white',
                    borderColor: '#e5e7eb',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                  }}
                >
                  <TrendingDown className="w-5 h-5 text-[#dc2626] mb-2" />
                  <p className="text-[9px] text-[#64748b] mb-1">الإنفاق</p>
                  <p className="text-[15px] font-black text-[#1a4a5e] truncate">
                    {stats.totalSpent.toLocaleString('ar-SA')}
                    <span className="text-[9px] font-medium text-[#7a9aab]"> ر.س</span>
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="px-6 pt-20 pb-6 space-y-4" dir="rtl">
        <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveView(tab.id)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-[12px] transition-all whitespace-nowrap flex-shrink-0"
                style={{
                  background: activeView === tab.id ? 'white' : 'transparent',
                  color: activeView === tab.id ? '#1a4a5e' : '#7a9aab',
                  boxShadow: activeView === tab.id ? '0 4px 12px rgba(0,0,0,0.08)' : 'none',
                }}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {activeView === 'overview' && (
          <div className="space-y-4">
            <div
              className="rounded-3xl p-5 border-2"
              style={{
                background: 'white',
                borderColor: '#e5e7eb',
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[16px] font-black text-[#1a4a5e]">الإجراءات السريعة</h3>
                <Zap className="w-5 h-5 text-[#F59E0B]" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                {isSupplier && onOpenSupplierInventory && (
                  <button
                    onClick={onOpenSupplierInventory}
                    className="relative p-4 rounded-2xl border-2 transition-all active:scale-95"
                    style={{
                      background: 'linear-gradient(135deg, #E3F2FD, #BBDEFB)',
                      borderColor: '#90CAF9',
                    }}
                  >
                    {stats.activeListings > 0 && (
                      <div
                        className="absolute -top-2 -right-2 w-7 h-7 rounded-xl flex items-center justify-center border-2 border-white"
                        style={{ background: '#1565C0' }}
                      >
                        <span className="text-[11px] font-black text-white">{stats.activeListings}</span>
                      </div>
                    )}
                    <Warehouse className="w-7 h-7 text-[#1565C0] mb-2" />
                    <p className="text-[13px] font-black text-[#1565C0]">مستودعي</p>
                    <p className="text-[9px] text-[#64748b]">إدارة المخزون</p>
                  </button>
                )}
                {isSupplier && onOpenSupplierDeals && (
                  <button
                    onClick={onOpenSupplierDeals}
                    className="p-4 rounded-2xl border-2 transition-all active:scale-95"
                    style={{
                      background: 'linear-gradient(135deg, #E8F8F0, #d4f0e2)',
                      borderColor: '#A7F3D0',
                    }}
                  >
                    <Handshake className="w-7 h-7 text-[#27AE60] mb-2" />
                    <p className="text-[13px] font-black text-[#27AE60]">صفقات التوريد</p>
                    <p className="text-[9px] text-[#64748b]">تتبع الصفقات</p>
                  </button>
                )}
                {isBuyer && onOpenPurchasedInventory && (
                  <button
                    onClick={onOpenPurchasedInventory}
                    className="p-4 rounded-2xl border-2 transition-all active:scale-95"
                    style={{
                      background: 'linear-gradient(135deg, #D1FAE5, #A7F3D0)',
                      borderColor: '#86EFAC',
                    }}
                  >
                    <Package className="w-7 h-7 text-[#059669] mb-2" />
                    <p className="text-[13px] font-black text-[#059669]">مشترياتي</p>
                    <p className="text-[9px] text-[#64748b]">المخزون المشترى</p>
                  </button>
                )}
                {isBuyer && onOpenBuyerDeals && (
                  <button
                    onClick={onOpenBuyerDeals}
                    className="relative p-4 rounded-2xl border-2 transition-all active:scale-95"
                    style={{
                      background: 'linear-gradient(135deg, #dbeafe, #bfdbfe)',
                      borderColor: '#93C5FD',
                    }}
                  >
                    {stats.totalOrders > 0 && (
                      <div
                        className="absolute -top-2 -right-2 w-7 h-7 rounded-xl flex items-center justify-center border-2 border-white"
                        style={{ background: '#2563eb' }}
                      >
                        <span className="text-[11px] font-black text-white">{stats.totalOrders}</span>
                      </div>
                    )}
                    <ShoppingBag className="w-7 h-7 text-[#2563eb] mb-2" />
                    <p className="text-[13px] font-black text-[#2563eb]">طلباتي</p>
                    <p className="text-[9px] text-[#64748b]">إدارة الطلبات</p>
                  </button>
                )}
              </div>
            </div>

            <div
              className="rounded-3xl p-5 border-2"
              style={{
                background: 'white',
                borderColor: '#e5e7eb',
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[16px] font-black text-[#1a4a5e]">إحصائيات الأداء</h3>
                <Target className="w-5 h-5 text-[#27AE60]" />
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-[#27AE60]" />
                    </div>
                    <div>
                      <p className="text-[12px] font-bold text-[#1a4a5e]">الصفقات المكتملة</p>
                      <p className="text-[10px] text-[#7a9aab]">إجمالي الصفقات الناجحة</p>
                    </div>
                  </div>
                  <p className="text-[18px] font-black text-[#27AE60]">{stats.completedDeals}</p>
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                      <Clock className="w-5 h-5 text-[#2196F3]" />
                    </div>
                    <div>
                      <p className="text-[12px] font-bold text-[#1a4a5e]">الصفقات الجارية</p>
                      <p className="text-[10px] text-[#7a9aab]">قيد التنفيذ حالياً</p>
                    </div>
                  </div>
                  <p className="text-[18px] font-black text-[#2196F3]">{stats.pendingDeals}</p>
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                      <Percent className="w-5 h-5 text-[#F59E0B]" />
                    </div>
                    <div>
                      <p className="text-[12px] font-bold text-[#1a4a5e]">معدل النجاح</p>
                      <p className="text-[10px] text-[#7a9aab]">نسبة إتمام الصفقات</p>
                    </div>
                  </div>
                  <p className="text-[18px] font-black text-[#F59E0B]">{stats.successRate}%</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeView === 'activity' && (
          <div className="space-y-3">
            <div
              className="rounded-3xl p-5 border-2"
              style={{
                background: 'white',
                borderColor: '#e5e7eb',
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[16px] font-black text-[#1a4a5e]">النشاط الأخير</h3>
                <Activity className="w-5 h-5 text-[#2196F3]" />
              </div>
              {recentActivities.length === 0 ? (
                <div className="text-center py-8">
                  <History className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-[13px] font-bold text-[#7a9aab]">لا يوجد نشاط بعد</p>
                  <p className="text-[11px] text-[#9ab0bf]">ابدأ بإنشاء طلب أو إضافة مخزون</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentActivities.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-center gap-3 p-3 rounded-2xl border transition-all hover:border-gray-300"
                      style={{
                        background: '#f8fafc',
                        borderColor: '#e5e7eb',
                      }}
                    >
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{
                          background:
                            activity.type === 'order'
                              ? '#EBF5FF'
                              : activity.type === 'deal'
                              ? '#E8F8F0'
                              : '#FFF8E1',
                        }}
                      >
                        {activity.type === 'order' && <ShoppingBag className="w-5 h-5 text-[#2196F3]" />}
                        {activity.type === 'deal' && <Handshake className="w-5 h-5 text-[#27AE60]" />}
                        {activity.type === 'inventory' && <Package className="w-5 h-5 text-[#F59E0B]" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-bold text-[#1a4a5e]">{activity.title}</p>
                        <p className="text-[10px] text-[#7a9aab]">{activity.subtitle}</p>
                      </div>
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{
                          background:
                            activity.status === 'success'
                              ? '#27AE60'
                              : activity.status === 'warning'
                              ? '#F59E0B'
                              : '#2196F3',
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div
              className="rounded-3xl p-5 border-2"
              style={{
                background: 'white',
                borderColor: '#e5e7eb',
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-5 h-5 text-[#64748b]" />
                <h3 className="text-[14px] font-black text-[#1a4a5e]">آخر نشاط</h3>
              </div>
              <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50">
                <p className="text-[12px] font-bold text-[#64748b]">الحالة</p>
                <p className="text-[13px] font-black text-[#27AE60]">{stats.recentActivity}</p>
              </div>
            </div>
          </div>
        )}

        {activeView === 'settings' && (
          <div className="space-y-4">
            <div
              className="rounded-3xl p-5 border-2"
              style={{
                background: 'white',
                borderColor: '#e5e7eb',
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[16px] font-black text-[#1a4a5e]">معلومات الحساب</h3>
                {!editMode ? (
                  <button
                    onClick={() => setEditMode(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all active:scale-95"
                    style={{
                      background: '#EBF5FF',
                      color: '#2196F3',
                    }}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    تعديل
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditMode(false)}
                      className="w-8 h-8 rounded-xl flex items-center justify-center bg-red-50 border border-red-100"
                    >
                      <X className="w-4 h-4 text-red-500" />
                    </button>
                    <button
                      onClick={handleSaveProfile}
                      disabled={saving}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all active:scale-95 disabled:opacity-50"
                      style={{
                        background: 'linear-gradient(135deg, #27AE60, #1e9652)',
                        color: 'white',
                      }}
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
                  <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-gray-50 border">
                    <User className="w-4 h-4 text-[#2196F3]" />
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
                    <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-gray-50 border">
                      <Building2 className="w-4 h-4 text-[#2196F3]" />
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
                  <label className="block text-[11px] font-bold text-[#64748b] mb-1.5">
                    رقم الجوال
                  </label>
                  <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-gray-50 border">
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
                  <label className="block text-[11px] font-bold text-[#64748b] mb-1.5">
                    المدينة
                  </label>
                  <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-gray-50 border">
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
                  <label className="block text-[11px] font-bold text-[#64748b] mb-1.5">
                    نوع النشاط التجاري
                  </label>
                  <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-gray-50 border">
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

            <div
              className="rounded-3xl overflow-hidden border-2"
              style={{
                background: 'white',
                borderColor: '#e5e7eb',
              }}
            >
              <button className="w-full flex items-center gap-3 px-5 py-4 hover:bg-gray-50 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                  <Bell className="w-5 h-5 text-[#F59E0B]" />
                </div>
                <div className="flex-1 text-right">
                  <p className="text-[13px] font-bold text-[#1a4a5e]">الإشعارات والتنبيهات</p>
                  <p className="text-[10px] text-[#7a9aab]">إدارة تفضيلات الإشعارات</p>
                </div>
                <ChevronLeft className="w-4 h-4 text-[#cbd5e1]" />
              </button>
              <div className="h-px bg-gray-100" />
              <button className="w-full flex items-center gap-3 px-5 py-4 hover:bg-gray-50 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-[#64748b]" />
                </div>
                <div className="flex-1 text-right">
                  <p className="text-[13px] font-bold text-[#1a4a5e]">الأمان والخصوصية</p>
                  <p className="text-[10px] text-[#7a9aab]">سياسة الاستخدام والبيانات</p>
                </div>
                <ChevronLeft className="w-4 h-4 text-[#cbd5e1]" />
              </button>
            </div>
          </div>
        )}

        {activeView === 'ratings' && (
          <>
            <RatingsSection userPhone={session.profile.phone} />
            <CommentsSection userPhone={session.profile.phone} maxComments={10} />
          </>
        )}

        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-5 py-4 rounded-3xl border-2 transition-all active:scale-98"
          style={{
            background: 'linear-gradient(135deg, #fef2f2, #fee2e2)',
            borderColor: '#fecaca',
          }}
        >
          <LogOut className="w-6 h-6 text-[#dc2626]" />
          <div className="flex-1 text-right">
            <p className="text-[14px] font-black text-[#dc2626]">تسجيل الخروج</p>
            <p className="text-[10px] text-[#dc2626]/60">إنهاء الجلسة الحالية</p>
          </div>
        </button>
      </div>
    </div>
  );
}
