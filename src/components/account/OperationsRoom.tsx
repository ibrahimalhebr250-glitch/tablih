import { useState, useEffect } from 'react';
import { ArrowRight, RefreshCw, Plus, Package, ShoppingCart, Handshake, TrendingUp, Clock, CheckCircle, AlertCircle, Warehouse, Truck, Box, LogOut, X } from 'lucide-react';
import type { AppSession } from '../../types/session';
import { supabase } from '../../lib/supabase';
import { useDashboard } from '../../hooks/useDashboard';
import { useBuyerInventory } from '../../hooks/useBuyerInventory';

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

interface DealCard {
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

export default function OperationsRoom({
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
  const [activeView, setActiveView] = useState<'orders' | 'inventory' | 'deals'>('orders');
  const [loading, setLoading] = useState(false);
  const [recentDeals, setRecentDeals] = useState<DealCard[]>([]);

  const { orders = [], batches = [], deals = [], summary, refresh } = useDashboard(session.profile.phone);
  const { summary: buyerInventorySummary } = useBuyerInventory(session.profile.phone);

  const isSupplier = session.roles.includes('supplier');
  const isBuyer = session.roles.includes('buyer');
  const displayName = session.profile.company_name || session.profile.display_name || session.profile.phone;

  useEffect(() => {
    fetchRecentDeals();
  }, [session.profile.phone]);

  const fetchRecentDeals = async () => {
    try {
      setLoading(true);
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
        const dealsWithType: DealCard[] = data.map(deal => ({
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
    } finally {
      setLoading(false);
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-gradient-to-r from-[#1a4a5e] via-[#2c5f7c] to-[#1a4a5e] shadow-lg">
        <div className="px-4 pt-6 pb-4">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/20 backdrop-blur-lg active:scale-90 transition-transform"
            >
              <X className="w-5 h-5 text-white" />
            </button>

            <button
              onClick={handleRefresh}
              disabled={loading}
              className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/20 backdrop-blur-lg active:scale-90 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 text-white ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="text-right mb-6">
            <h1 className="text-[24px] font-black text-white mb-1">غرفة العمليات</h1>
            <p className="text-[13px] text-white/70">{displayName}</p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setActiveView('orders')}
              className={`rounded-2xl p-3 transition-all active:scale-95 ${
                activeView === 'orders'
                  ? 'bg-white shadow-lg'
                  : 'bg-white/10 backdrop-blur-lg'
              }`}
            >
              <ShoppingCart className={`w-5 h-5 mx-auto mb-1 ${
                activeView === 'orders' ? 'text-[#2196F3]' : 'text-white'
              }`} />
              <p className={`text-[18px] font-black ${
                activeView === 'orders' ? 'text-[#2196F3]' : 'text-white'
              }`}>{activeOrders.length}</p>
              <p className={`text-[9px] font-bold ${
                activeView === 'orders' ? 'text-gray-500' : 'text-white/60'
              }`}>طلبات نشطة</p>
            </button>

            <button
              onClick={() => setActiveView('inventory')}
              className={`rounded-2xl p-3 transition-all active:scale-95 ${
                activeView === 'inventory'
                  ? 'bg-white shadow-lg'
                  : 'bg-white/10 backdrop-blur-lg'
              }`}
            >
              <Package className={`w-5 h-5 mx-auto mb-1 ${
                activeView === 'inventory' ? 'text-[#27AE60]' : 'text-white'
              }`} />
              <p className={`text-[18px] font-black ${
                activeView === 'inventory' ? 'text-[#27AE60]' : 'text-white'
              }`}>{activeBatches.length}</p>
              <p className={`text-[9px] font-bold ${
                activeView === 'inventory' ? 'text-gray-500' : 'text-white/60'
              }`}>دفعات مخزون</p>
            </button>

            <button
              onClick={() => setActiveView('deals')}
              className={`rounded-2xl p-3 transition-all active:scale-95 ${
                activeView === 'deals'
                  ? 'bg-white shadow-lg'
                  : 'bg-white/10 backdrop-blur-lg'
              }`}
            >
              <Handshake className={`w-5 h-5 mx-auto mb-1 ${
                activeView === 'deals' ? 'text-[#F59E0B]' : 'text-white'
              }`} />
              <p className={`text-[18px] font-black ${
                activeView === 'deals' ? 'text-[#F59E0B]' : 'text-white'
              }`}>{activeDeals.length}</p>
              <p className={`text-[9px] font-bold ${
                activeView === 'deals' ? 'text-gray-500' : 'text-white/60'
              }`}>صفقات جارية</p>
            </button>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      {(isSupplier || isBuyer) && (
        <div className="px-4 py-4 space-y-2" dir="rtl">
          <div className={`grid gap-2 ${isSupplier && isBuyer ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {isSupplier && (
              <button
                onClick={onAddInventory}
                className={`relative overflow-hidden rounded-2xl p-4 bg-gradient-to-br from-[#27AE60] to-[#229954] shadow-lg active:scale-95 transition-transform ${!isBuyer ? 'col-span-1' : ''}`}
              >
                <div className="relative z-10 flex items-center justify-between">
                  <Plus className="w-6 h-6 text-white" />
                  <div className="text-right">
                    <p className="text-[14px] font-black text-white">إضافة مخزون</p>
                    <p className="text-[10px] text-white/80">نشر دفعة جديدة</p>
                  </div>
                </div>
                <div className="absolute inset-0 bg-white/10" />
              </button>
            )}

            {isBuyer && (
              <button
                onClick={onCreateOrder}
                className={`relative overflow-hidden rounded-2xl p-4 bg-gradient-to-br from-[#2196F3] to-[#1976D2] shadow-lg active:scale-95 transition-transform ${!isSupplier ? 'col-span-1' : ''}`}
              >
                <div className="relative z-10 flex items-center justify-between">
                  <Plus className="w-6 h-6 text-white" />
                  <div className="text-right">
                    <p className="text-[14px] font-black text-white">إنشاء طلب</p>
                    <p className="text-[10px] text-white/80">طلب جديد</p>
                  </div>
                </div>
                <div className="absolute inset-0 bg-white/10" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* My Orders */}
      {isBuyer && orders.length > 0 && (
        <div className="px-4 py-2" dir="rtl">
          <button
            onClick={onOpenBuyerDeals}
            className="w-full rounded-2xl bg-white shadow-md border border-gray-100 p-4 active:scale-95 transition-all"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
                  <ShoppingCart className="w-5 h-5 text-[#2196F3]" />
                </div>
                <div className="text-right">
                  <p className="text-[14px] font-bold text-gray-900">طلباتي</p>
                  <p className="text-[11px] text-gray-500">{orders.length} طلب</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {activeOrders.length > 0 && (
                  <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-blue-50 text-[#2196F3]">
                    {activeOrders.length} نشط
                  </span>
                )}
                <ArrowRight className="w-4 h-4 text-gray-400" />
              </div>
            </div>
          </button>
        </div>
      )}

      {/* Cloud Warehouse */}
      {isBuyer && (
        <div className="px-4 py-2" dir="rtl">
          <button
            onClick={onOpenPurchasedInventory}
            className="w-full rounded-2xl bg-white shadow-md border border-gray-100 p-4 active:scale-95 transition-all"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-50 to-purple-100 flex items-center justify-center">
                  <Warehouse className="w-5 h-5 text-[#8B5CF6]" />
                </div>
                <div className="text-right">
                  <p className="text-[14px] font-bold text-gray-900">مستودعي السحابي</p>
                  <p className="text-[11px] text-gray-500">
                    {(buyerInventorySummary?.total_quantity || 0).toLocaleString('ar-SA')} طبلية
                  </p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400" />
            </div>
          </button>
        </div>
      )}

      {/* Recent Deals */}
      <div className="px-4 py-4" dir="rtl">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[16px] font-black text-gray-900">الصفقات الأخيرة</h2>
          <button
            onClick={isSupplier ? onOpenSupplierDeals : onOpenBuyerDeals}
            className="text-[12px] font-bold text-[#2c5f7c]"
          >
            عرض الكل
          </button>
        </div>

        <div className="space-y-2">
          {loading ? (
            <div className="text-center py-8">
              <RefreshCw className="w-6 h-6 text-gray-400 animate-spin mx-auto" />
            </div>
          ) : recentDeals.length === 0 ? (
            <div className="text-center py-8 bg-white rounded-2xl border-2 border-dashed border-gray-200">
              <Box className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p className="text-[13px] text-gray-500">لا توجد صفقات</p>
            </div>
          ) : (
            recentDeals.map((deal) => {
              const statusConfig = getStatusConfig(deal.status);
              return (
                <div
                  key={deal.id}
                  className="rounded-2xl bg-white shadow-md border border-gray-100 p-4"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="px-2.5 py-1 rounded-lg text-[10px] font-bold"
                        style={{ backgroundColor: statusConfig.bg, color: statusConfig.color }}
                      >
                        {statusConfig.label}
                      </div>
                      <div
                        className="px-2.5 py-1 rounded-lg text-[10px] font-bold"
                        style={{
                          backgroundColor: deal.type === 'supplier' ? '#E8F8F0' : '#EFF6FF',
                          color: deal.type === 'supplier' ? '#27AE60' : '#2196F3'
                        }}
                      >
                        {deal.type === 'supplier' ? 'مورّد' : 'مشتري'}
                      </div>
                    </div>

                    <p className="text-[11px] text-gray-400">
                      {new Date(deal.created_at).toLocaleDateString('ar-SA', {
                        month: 'short',
                        day: 'numeric'
                      })}
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-right flex-1">
                      <p className="text-[14px] font-bold text-gray-900 mb-1">{deal.pallet_type}</p>
                      <div className="flex items-center gap-3 text-[11px] text-gray-500">
                        <span>{deal.quantity.toLocaleString('ar-SA')} طبلية</span>
                        <span>•</span>
                        <span>{deal.city}</span>
                      </div>
                    </div>

                    <div className="text-left">
                      <p className="text-[16px] font-black text-[#2c5f7c]">
                        {(deal.price || 0).toLocaleString('ar-SA')}
                      </p>
                      <p className="text-[9px] text-gray-500">ريال</p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Logout Button */}
      <div className="px-4 pb-24">
        <button
          onClick={onLogout}
          className="w-full rounded-2xl bg-gradient-to-r from-red-50 to-red-100 border border-red-200 p-4 active:scale-95 transition-all"
          dir="rtl"
        >
          <div className="flex items-center justify-between">
            <div className="text-right">
              <p className="text-[14px] font-bold text-red-900">تسجيل الخروج</p>
              <p className="text-[11px] text-red-600">الخروج من الحساب</p>
            </div>
            <LogOut className="w-5 h-5 text-red-600" />
          </div>
        </button>
      </div>
    </div>
  );
}
