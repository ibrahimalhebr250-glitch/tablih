import { useState, useEffect } from 'react';
import {
  ArrowRight, User, Phone, MapPin, Briefcase, LogOut,
  Building2, Handshake, ShoppingBag, Warehouse,
  Sparkles, Star, TrendingUp, Award, Crown, Shield,
  Zap, Target, Package, CheckCircle, Activity, Eye
} from 'lucide-react';
import type { AppSession } from '../../types/session';
import { supabase } from '../../lib/supabase';
import { getTrustConfig } from '../shared/TrustRatingBadge';
import RatingsSection from './RatingsSection';
import { CommentsSection } from '../shared/CommentsSection';

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
  totalRevenue: number;
  activeListings: number;
  trustRating: number;
}

export default function EnhancedAccountPage({
  session,
  freshLogin = false,
  onClose,
  onLogout,
  onOpenSupplierDeals,
  onOpenBuyerDeals,
  onOpenSupplierInventory,
  onOpenPurchasedInventory
}: Props) {
  const [stats, setStats] = useState<DashboardStats>({
    totalOrders: 0,
    completedDeals: 0,
    totalRevenue: 0,
    activeListings: 0,
    trustRating: 3
  });
  const [activeView, setActiveView] = useState<'home' | 'ratings'>('home');
  const [showWelcome, setShowWelcome] = useState(freshLogin);

  const isCompany = session.profile.user_type === 'company';
  const isSupplier = session.roles.includes('supplier');
  const isBuyer = session.roles.includes('buyer');
  const displayName = (isCompany ? session.profile.company_name : session.profile.display_name) || 'مستخدم';
  const initials = displayName.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('');

  useEffect(() => {
    const fetchStats = async () => {
      const phone = session.profile.phone;

      const [userRes, ordersRes, dealsRes, inventoryRes] = await Promise.all([
        supabase.from('platform_users').select('trust_rating').eq('phone', phone).maybeSingle(),
        supabase.from('orders').select('id', { count: 'exact', head: true }).eq('phone', phone),
        supabase.from('deals').select('id, status').or(`supplier_phone.eq.${phone},buyer_phone.eq.${phone}`),
        supabase.from('inventory_batches').select('id', { count: 'exact', head: true }).eq('supplier_phone', phone).eq('published', true)
      ]);

      const completedDeals = dealsRes.data?.filter(d => d.status === 'completed').length || 0;

      setStats({
        totalOrders: ordersRes.count || 0,
        completedDeals,
        totalRevenue: completedDeals * 1500,
        activeListings: inventoryRes.count || 0,
        trustRating: userRes.data?.trust_rating || 3
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

  const trustConfig = getTrustConfig(stats.trustRating);
  const TrustIcon = trustConfig.icon;

  const quickActions = [
    {
      icon: Warehouse,
      label: 'مستودعي',
      description: 'إدارة المخزون',
      color: '#1565C0',
      bg: 'linear-gradient(135deg, #E3F2FD, #BBDEFB)',
      show: isSupplier && onOpenSupplierInventory,
      action: onOpenSupplierInventory,
      badge: stats.activeListings
    },
    {
      icon: Handshake,
      label: 'صفقات التوريد',
      description: 'تتبع الصفقات',
      color: '#27AE60',
      bg: 'linear-gradient(135deg, #E8F8F0, #d4f0e2)',
      show: isSupplier && onOpenSupplierDeals,
      action: onOpenSupplierDeals,
      badge: null
    },
    {
      icon: Package,
      label: 'مشترياتي',
      description: 'المخزون المشترى',
      color: '#059669',
      bg: 'linear-gradient(135deg, #D1FAE5, #A7F3D0)',
      show: isBuyer && onOpenPurchasedInventory,
      action: onOpenPurchasedInventory,
      badge: null
    },
    {
      icon: ShoppingBag,
      label: 'طلباتي',
      description: 'إدارة الطلبات',
      color: '#2563eb',
      bg: 'linear-gradient(135deg, #dbeafe, #bfdbfe)',
      show: isBuyer && onOpenBuyerDeals,
      action: onOpenBuyerDeals,
      badge: stats.totalOrders
    },
  ].filter(item => item.show);

  return (
    <div className="min-h-screen pb-20" style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 50%, #e2e8f0 100%)' }}>
      {/* Enhanced Header with Gradient */}
      <div
        className="relative overflow-hidden"
        style={{
          background: isCompany
            ? 'linear-gradient(135deg, #0a1f2e 0%, #1a4a5e 40%, #2c6f8a 100%)'
            : 'linear-gradient(135deg, #1a6640 0%, #27AE60 40%, #34d399 100%)',
          paddingTop: '2rem',
          paddingBottom: '6rem',
        }}
      >
        {/* Decorative Background */}
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

        {/* Close Button */}
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

        {/* Welcome Animation */}
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

        {/* Profile Card */}
        <div className="relative px-6 pt-4" dir="rtl">
          <div className="flex items-start gap-4 mb-6">
            {/* Avatar */}
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

            {/* Info */}
            <div className="flex-1 min-w-0 pt-1">
              <h1 className="text-[24px] font-black text-white leading-tight mb-1.5 truncate">
                {displayName}
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

          {/* Trust Rating Card */}
          <div
            className="rounded-3xl px-5 py-4"
            style={{
              background: 'rgba(255,255,255,0.15)',
              backdropFilter: 'blur(12px)',
              border: '2px solid rgba(255,255,255,0.2)',
            }}
          >
            <div className="flex items-center justify-between" dir="rtl">
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center"
                  style={{ background: `${trustConfig.color}40` }}
                >
                  <TrustIcon className="w-6 h-6" style={{ color: trustConfig.color }} />
                </div>
                <div>
                  <p className="text-[14px] font-black mb-1" style={{ color: trustConfig.color }}>
                    {trustConfig.label}
                  </p>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star
                        key={i}
                        className="w-3.5 h-3.5"
                        style={{
                          color: i <= stats.trustRating ? trustConfig.color : 'rgba(255,255,255,0.3)',
                          fill: i <= stats.trustRating ? trustConfig.color : 'none',
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
              {stats.completedDeals > 0 && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/20">
                  <span className="text-[16px] font-black text-white">{stats.completedDeals}</span>
                  <Handshake className="w-5 h-5 text-white/70" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Floating Stats Cards */}
        <div className="absolute bottom-0 left-0 right-0 px-6 translate-y-1/2" dir="rtl">
          <div className="grid grid-cols-2 gap-3">
            {isSupplier && (
              <>
                <div
                  className="rounded-2xl px-4 py-3 border-2"
                  style={{
                    background: 'white',
                    borderColor: '#e5e7eb',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                  }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <TrendingUp className="w-5 h-5 text-[#27AE60]" />
                    <p className="text-[10px] text-[#64748b]">الإيرادات</p>
                  </div>
                  <p className="text-[18px] font-black text-[#1a4a5e]">
                    {stats.totalRevenue.toLocaleString('ar-SA')}
                    <span className="text-[11px] font-medium text-[#7a9aab] mr-1">ر.س</span>
                  </p>
                </div>
                <div
                  className="rounded-2xl px-4 py-3 border-2"
                  style={{
                    background: 'white',
                    borderColor: '#e5e7eb',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                  }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <Package className="w-5 h-5 text-[#2196F3]" />
                    <p className="text-[10px] text-[#64748b]">المنتجات</p>
                  </div>
                  <p className="text-[18px] font-black text-[#1a4a5e]">
                    {stats.activeListings}
                    <span className="text-[11px] font-medium text-[#7a9aab] mr-1">منتج</span>
                  </p>
                </div>
              </>
            )}
            {isBuyer && !isSupplier && (
              <>
                <div
                  className="rounded-2xl px-4 py-3 border-2"
                  style={{
                    background: 'white',
                    borderColor: '#e5e7eb',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                  }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <Activity className="w-5 h-5 text-[#2563eb]" />
                    <p className="text-[10px] text-[#64748b]">الطلبات</p>
                  </div>
                  <p className="text-[18px] font-black text-[#1a4a5e]">
                    {stats.totalOrders}
                    <span className="text-[11px] font-medium text-[#7a9aab] mr-1">طلب</span>
                  </p>
                </div>
                <div
                  className="rounded-2xl px-4 py-3 border-2"
                  style={{
                    background: 'white',
                    borderColor: '#e5e7eb',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                  }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <CheckCircle className="w-5 h-5 text-[#27AE60]" />
                    <p className="text-[10px] text-[#64748b]">مكتملة</p>
                  </div>
                  <p className="text-[18px] font-black text-[#1a4a5e]">
                    {stats.completedDeals}
                    <span className="text-[11px] font-medium text-[#7a9aab] mr-1">صفقة</span>
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="px-6 pt-24 pb-6 space-y-5" dir="rtl">
        {/* Tab Navigation */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveView('home')}
            className="flex-1 py-3 rounded-2xl font-bold text-[13px] transition-all"
            style={{
              background: activeView === 'home' ? 'white' : 'transparent',
              color: activeView === 'home' ? '#1a4a5e' : '#7a9aab',
              boxShadow: activeView === 'home' ? '0 4px 12px rgba(0,0,0,0.08)' : 'none',
            }}
          >
            الرئيسية
          </button>
          <button
            onClick={() => setActiveView('ratings')}
            className="flex-1 py-3 rounded-2xl font-bold text-[13px] transition-all"
            style={{
              background: activeView === 'ratings' ? 'white' : 'transparent',
              color: activeView === 'ratings' ? '#1a4a5e' : '#7a9aab',
              boxShadow: activeView === 'ratings' ? '0 4px 12px rgba(0,0,0,0.08)' : 'none',
            }}
          >
            التقييمات
          </button>
        </div>

        {activeView === 'home' && (
          <>
            {/* Quick Actions */}
            <div className="space-y-3">
              <h3 className="text-[15px] font-black text-[#1a4a5e] px-2">الإجراءات السريعة</h3>
              <div className="grid grid-cols-2 gap-3">
                {quickActions.map((action, index) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={index}
                      onClick={action.action}
                      className="relative p-5 rounded-3xl border-2 transition-all active:scale-95"
                      style={{
                        background: action.bg,
                        borderColor: `${action.color}30`,
                        boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
                      }}
                    >
                      {action.badge !== null && action.badge !== undefined && (
                        <div
                          className="absolute -top-2 -right-2 w-8 h-8 rounded-2xl flex items-center justify-center border-2 border-white"
                          style={{ background: action.color }}
                        >
                          <span className="text-[12px] font-black text-white">{action.badge}</span>
                        </div>
                      )}
                      <Icon className="w-8 h-8 mb-3" style={{ color: action.color }} />
                      <p className="text-[14px] font-black mb-0.5" style={{ color: action.color }}>
                        {action.label}
                      </p>
                      <p className="text-[10px] text-[#64748b]">{action.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Logout */}
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
          </>
        )}

        {activeView === 'ratings' && (
          <>
            <RatingsSection userPhone={session.profile.phone} />
            <CommentsSection userPhone={session.profile.phone} maxComments={10} />
          </>
        )}
      </div>
    </div>
  );
}
