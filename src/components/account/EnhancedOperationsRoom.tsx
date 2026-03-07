import { useState, useEffect } from 'react';
import { X, RefreshCw, Plus, Package, ShoppingCart, Handshake, Warehouse, TrendingUp, LogOut, Sparkles, Box } from 'lucide-react';
import type { AppSession } from '../../types/session';
import { supabase } from '../../lib/supabase';
import { useDashboard } from '../../hooks/useDashboard';
import { useBuyerInventory } from '../../hooks/useBuyerInventory';
import ProfileHeader from './enhanced/ProfileHeader';
import ActivityCard from './enhanced/ActivityCard';
import QuickActionButton from './enhanced/QuickActionButton';
import DealCard from './enhanced/DealCard';

interface Props {
  session: AppSession;
  onClose: () => void;
  onLogout: () => void;
  onAddInventory: () => void;
  onCreateOrder: () => void;
  onOpenSupplierDeals: () => void;
  onOpenBuyerDeals: () => void;
  onOpenSupplierInventory: () => void;
  onOpenPurchasedInventory: () => void;
}

interface DealData {
  id: string;
  type: 'supplier' | 'buyer';
  status: string;
  pallet_type: string;
  quantity: number;
  price: number;
  city: string;
  created_at: string;
  otherParty: string;
}

export default function EnhancedOperationsRoom({
  session,
  onClose,
  onLogout,
  onAddInventory,
  onCreateOrder,
  onOpenSupplierDeals,
  onOpenBuyerDeals,
  onOpenSupplierInventory,
  onOpenPurchasedInventory
}: Props) {
  const [loading, setLoading] = useState(false);
  const [recentDeals, setRecentDeals] = useState<DealData[]>([]);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const { orders = [], batches = [], deals = [], summary, refresh } = useDashboard(session.profile.phone);
  const { summary: buyerInventorySummary } = useBuyerInventory(session.profile.phone);

  const isSupplier = session.roles.includes('supplier');
  const isBuyer = session.roles.includes('buyer');

  useEffect(() => {
    fetchRecentDeals();
  }, [session.profile.phone]);

  const fetchRecentDeals = async () => {
    try {
      const { data, error } = await supabase
        .from('deals')
        .select('*')
        .or(`supplier_phone.eq.${session.profile.phone},buyer_phone.eq.${session.profile.phone}`)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) {
        console.error('Error fetching deals:', error);
        setRecentDeals([]);
      } else if (data) {
        const dealsWithType: DealData[] = data.map(deal => ({
          id: deal.id,
          type: deal.supplier_phone === session.profile.phone ? 'supplier' : 'buyer',
          status: deal.status || 'matched',
          pallet_type: deal.pallet_type || '',
          quantity: deal.quantity || 0,
          price: deal.supplier_phone === session.profile.phone ? (deal.supplier_price || 0) : (deal.buyer_price || 0),
          city: deal.city || '',
          created_at: deal.created_at || new Date().toISOString(),
          otherParty: deal.supplier_phone === session.profile.phone ? deal.buyer_phone : deal.supplier_phone
        }));
        setRecentDeals(dealsWithType);
      }
    } catch (err) {
      console.error('Exception in fetchRecentDeals:', err);
      setRecentDeals([]);
    }
  };

  const handleRefresh = async () => {
    try {
      setLoading(true);
      await Promise.all([refresh(), fetchRecentDeals()]);
    } catch (err) {
      console.error('Error refreshing:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setShowLogoutConfirm(false);
    onLogout();
  };

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { label: string; color: string; bg: string }> = {
      matched: { label: 'جديدة', color: '#3B82F6', bg: '#EFF6FF' },
      awaiting_buyer: { label: 'انتظار', color: '#F59E0B', bg: '#FEF3C7' },
      inventory_reserved: { label: 'محجوزة', color: '#8B5CF6', bg: '#F3E8FF' },
      in_delivery: { label: 'توصيل', color: '#EC4899', bg: '#FCE7F3' },
      completed: { label: 'مكتملة', color: '#10B981', bg: '#D1FAE5' },
      cancelled: { label: 'ملغية', color: '#EF4444', bg: '#FEE2E2' },
    };
    return configs[status] || { label: status, color: '#6B7280', bg: '#F3F4F6' };
  };

  const activeOrders = (orders || []).filter(o => o?.status && o.status !== 'fulfilled' && o.status !== 'cancelled');
  const activeBatches = (batches || []).filter(b => b?.status === 'active' && b?.available_quantity > 0);
  const activeDeals = (deals || []).filter(d => d?.status && !['completed', 'cancelled', 'failed'].includes(d.status));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-200/50 shadow-sm">
        <div className="px-4 py-3 flex items-center justify-between">
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl flex items-center justify-center bg-gray-100 hover:bg-gray-200 active:scale-90 transition-all"
          >
            <X className="w-5 h-5 text-gray-700" />
          </button>

          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#2c5f7c]" />
            <h1 className="text-[18px] font-black text-gray-900">غرفة العمليات</h1>
          </div>

          <button
            onClick={handleRefresh}
            disabled={loading}
            className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#2c5f7c] hover:bg-[#1a4a5e] active:scale-90 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 text-white ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* Profile Header */}
        <ProfileHeader session={session} />

        {/* Quick Actions */}
        {(isSupplier || isBuyer) && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-1 h-6 bg-gradient-to-b from-[#2c5f7c] to-[#1a4a5e] rounded-full" />
              <h2 className="text-[16px] font-black text-gray-900">إجراءات سريعة</h2>
            </div>

            <div className={`grid gap-3 ${isSupplier && isBuyer ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {isSupplier && (
                <QuickActionButton
                  title="إضافة مخزون"
                  subtitle="نشر دفعة جديدة"
                  icon={Plus}
                  gradient="bg-gradient-to-br from-[#27AE60] to-[#229954]"
                  onClick={onAddInventory}
                />
              )}

              {isBuyer && (
                <QuickActionButton
                  title="إنشاء طلب"
                  subtitle="طلب شراء جديد"
                  icon={Plus}
                  gradient="bg-gradient-to-br from-[#2196F3] to-[#1976D2]"
                  onClick={onCreateOrder}
                />
              )}
            </div>
          </div>
        )}

        {/* Activity Overview */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1 h-6 bg-gradient-to-b from-[#2c5f7c] to-[#1a4a5e] rounded-full" />
            <h2 className="text-[16px] font-black text-gray-900">نشاطاتي</h2>
          </div>

          <div className="grid gap-3">
            {isBuyer && (
              <>
                <ActivityCard
                  title="طلباتي"
                  count={orders.length}
                  subtitle={`${activeOrders.length} طلب نشط`}
                  icon={ShoppingCart}
                  color="#2196F3"
                  bgColor="#EFF6FF"
                  onClick={onOpenBuyerDeals}
                  badge={activeOrders.length > 0 ? { text: 'نشط', color: '#2196F3' } : undefined}
                />

                <ActivityCard
                  title="مستودعي السحابي"
                  count={buyerInventorySummary?.total_quantity || 0}
                  subtitle="طبلية متاحة"
                  icon={Warehouse}
                  color="#8B5CF6"
                  bgColor="#F3E8FF"
                  onClick={onOpenPurchasedInventory}
                />
              </>
            )}

            {isSupplier && (
              <ActivityCard
                title="دفعات المخزون"
                count={batches.length}
                subtitle={`${activeBatches.length} دفعة نشطة`}
                icon={Package}
                color="#27AE60"
                bgColor="#E8F8F0"
                onClick={onOpenSupplierInventory}
                badge={activeBatches.length > 0 ? { text: 'متاح', color: '#27AE60' } : undefined}
              />
            )}

            <ActivityCard
              title="صفقاتي"
              count={deals.length}
              subtitle={`${activeDeals.length} صفقة جارية`}
              icon={Handshake}
              color="#F59E0B"
              bgColor="#FEF3C7"
              onClick={isSupplier ? onOpenSupplierDeals : onOpenBuyerDeals}
              badge={activeDeals.length > 0 ? { text: 'جارية', color: '#F59E0B' } : undefined}
            />
          </div>
        </div>

        {/* Recent Deals */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-1 h-6 bg-gradient-to-b from-[#2c5f7c] to-[#1a4a5e] rounded-full" />
              <h2 className="text-[16px] font-black text-gray-900">الصفقات الأخيرة</h2>
            </div>
            <button
              onClick={isSupplier ? onOpenSupplierDeals : onOpenBuyerDeals}
              className="text-[12px] font-bold text-[#2c5f7c] hover:text-[#1a4a5e] transition-colors"
            >
              عرض الكل
            </button>
          </div>

          <div className="space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-12 bg-white rounded-2xl border-2 border-gray-100">
                <RefreshCw className="w-8 h-8 text-gray-400 animate-spin" />
              </div>
            ) : recentDeals.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border-2 border-dashed border-gray-200">
                <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
                  <Box className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-[14px] font-bold text-gray-900 mb-1">لا توجد صفقات</p>
                <p className="text-[12px] text-gray-500">ابدأ بإضافة مخزون أو إنشاء طلب</p>
              </div>
            ) : (
              recentDeals.map((deal) => (
                <DealCard
                  key={deal.id}
                  deal={deal}
                  statusConfig={getStatusConfig(deal.status)}
                />
              ))
            )}
          </div>
        </div>

        {/* Logout Section */}
        <div className="pt-4 pb-8">
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="w-full rounded-2xl bg-gradient-to-br from-red-50 to-red-100 border-2 border-red-200 p-4 hover:shadow-lg active:scale-[0.98] transition-all"
            dir="rtl"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-lg">
                  <LogOut className="w-6 h-6 text-white" />
                </div>
                <div className="text-right">
                  <p className="text-[15px] font-black text-red-900">تسجيل الخروج</p>
                  <p className="text-[11px] text-red-600">إنهاء الجلسة الحالية</p>
                </div>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center">
                <LogOut className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-[18px] font-black text-gray-900 mb-2">تسجيل الخروج</h3>
              <p className="text-[13px] text-gray-600">هل أنت متأكد من رغبتك في تسجيل الخروج؟</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="px-4 py-3 rounded-xl bg-gray-100 text-gray-900 font-bold text-[14px] hover:bg-gray-200 active:scale-95 transition-all"
              >
                إلغاء
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-3 rounded-xl bg-gradient-to-br from-red-500 to-red-600 text-white font-bold text-[14px] hover:shadow-lg active:scale-95 transition-all"
              >
                تأكيد الخروج
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
