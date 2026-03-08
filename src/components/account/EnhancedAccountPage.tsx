import { useState, useEffect } from 'react';
import {
  RefreshCw, Plus, ShoppingCart, Handshake, Warehouse,
  LogOut, ClipboardList, ChevronLeft, Package, Radar,
  CheckCircle2, Clock, Trash2, MapPin, Eye,
  AlertTriangle, Settings
} from 'lucide-react';
import SettingsPanel from './SettingsPanel';
import type { AppSession } from '../../types/session';
import { supabase } from '../../lib/supabase';
import { useDashboard } from '../../hooks/useDashboard';
import { useBuyerInventory } from '../../hooks/useBuyerInventory';

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
  onAddInventory?: () => void;
  onCreateOrder?: () => void;
}

type RoleView = 'supplier' | 'buyer';

interface DealData {
  id: string;
  deal_ref: string;
  type: 'supplier' | 'buyer';
  status: string;
  pallet_type: string;
  size: string;
  quality: string;
  quantity: number;
  price: number;
  city: string;
  created_at: string;
  otherParty: string;
}

const ORDER_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: typeof Clock }> = {
  pending: { label: 'قيد الانتظار', color: '#F59E0B', bg: '#FFFBEB', icon: Clock },
  matched: { label: 'تمت المطابقة', color: '#27AE60', bg: '#E8F8F0', icon: CheckCircle2 },
  unmatched: { label: 'تحت المطابقة', color: '#0369A1', bg: '#E0F2FE', icon: Radar },
  partially_matched: { label: 'مطابقة جزئية', color: '#8B5CF6', bg: '#F3E8FF', icon: CheckCircle2 },
  executed: { label: 'منفّذ', color: '#6B7280', bg: '#F3F4F6', icon: CheckCircle2 },
};

const DEAL_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  matched: { label: 'جديدة', color: '#3B82F6', bg: '#EFF6FF' },
  awaiting_buyer: { label: 'بانتظار التأكيد', color: '#F59E0B', bg: '#FEF3C7' },
  inventory_reserved: { label: 'محجوزة', color: '#10B981', bg: '#D1FAE5' },
  in_delivery: { label: 'قيد التوصيل', color: '#EC4899', bg: '#FCE7F3' },
  completed: { label: 'مكتملة', color: '#10B981', bg: '#D1FAE5' },
  cancelled: { label: 'ملغية', color: '#EF4444', bg: '#FEE2E2' },
};

export default function EnhancedAccountPage({
  session,
  onClose,
  onLogout,
  onUpdateProfile,
  onOpenSupplierDeals,
  onOpenBuyerDeals,
  onOpenSupplierInventory,
  onOpenPurchasedInventory,
  onAddInventory,
  onCreateOrder,
}: Props) {
  const isSupplier = session.roles.includes('supplier');
  const isBuyer = session.roles.includes('buyer');

  const [activeRole, setActiveRole] = useState<RoleView>(isSupplier ? 'supplier' : 'buyer');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [supplierDeals, setSupplierDeals] = useState<DealData[]>([]);
  const [buyerDeals, setBuyerDeals] = useState<DealData[]>([]);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { orders, batches, deals, summary, loading, refresh } = useDashboard(session.profile.phone);
  const { summary: buyerSummary } = useBuyerInventory(session.profile.phone);

  const activeOrders = orders.filter(o => o.status !== 'fulfilled' && o.status !== 'cancelled');
  const activeBatches = batches.filter(b => b.status === 'active' && b.available_quantity > 0);
  const activeDeals = deals.filter(d => !['completed', 'cancelled', 'failed'].includes(d.status || ''));

  useEffect(() => {
    fetchRecentDeals();
  }, [session.profile.phone]);

  const fetchRecentDeals = async () => {
    const phone = session.profile.phone;
    const { data } = await supabase
      .from('deals')
      .select('*')
      .or(`supplier_phone.eq.${phone},buyer_phone.eq.${phone}`)
      .not('status', 'in', '("completed","cancelled","failed")')
      .order('created_at', { ascending: false })
      .limit(10);

    if (data) {
      const mapped = data.map(deal => ({
        id: deal.id,
        deal_ref: deal.deal_ref || '',
        type: (deal.supplier_phone === phone ? 'supplier' : 'buyer') as 'supplier' | 'buyer',
        status: deal.status || 'matched',
        pallet_type: deal.pallet_type || '',
        size: deal.size || '',
        quality: deal.quality || '',
        quantity: deal.quantity || 0,
        price: deal.supplier_phone === phone ? (deal.supplier_price || 0) : (deal.buyer_price || 0),
        city: deal.city || '',
        created_at: deal.created_at || new Date().toISOString(),
        otherParty: deal.supplier_phone === phone ? deal.buyer_phone : deal.supplier_phone,
      }));
      setSupplierDeals(mapped.filter(d => d.type === 'supplier'));
      setBuyerDeals(mapped.filter(d => d.type === 'buyer'));
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refresh(), fetchRecentDeals()]);
    setRefreshing(false);
  };

  const handleDeleteOrder = async (orderId: string) => {
    setDeletingId(orderId);
    await supabase.from('orders').delete().eq('id', orderId).eq('phone', session.profile.phone);
    setDeletingId(null);
    setConfirmDeleteId(null);
    refresh();
  };

  return (
    <div className="min-h-screen" style={{ background: '#f0f5f9' }}>
      <div className="w-full max-w-2xl mx-auto pb-24">

        {/* Role Toggle */}
        {isSupplier && isBuyer && (
          <div className="sticky top-0 z-40 px-4 pt-3 pb-2" style={{ background: '#f0f5f9' }}>
            <div className="flex gap-2 p-1.5 rounded-2xl" style={{ background: '#e2eaf0' }}>
              <button
                onClick={() => setActiveRole('supplier')}
                className="flex-1 py-2.5 rounded-xl text-[13px] font-black transition-all duration-200"
                style={{
                  background: activeRole === 'supplier' ? '#fff' : 'transparent',
                  color: activeRole === 'supplier' ? '#27AE60' : '#7a9aab',
                  boxShadow: activeRole === 'supplier' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                }}
              >
                مورّد
              </button>
              <button
                onClick={() => setActiveRole('buyer')}
                className="flex-1 py-2.5 rounded-xl text-[13px] font-black transition-all duration-200"
                style={{
                  background: activeRole === 'buyer' ? '#fff' : 'transparent',
                  color: activeRole === 'buyer' ? '#2196F3' : '#7a9aab',
                  boxShadow: activeRole === 'buyer' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                }}
              >
                مشتري
              </button>
            </div>
          </div>
        )}

        {/* Activity Summary Card */}
        <div className="px-4 pt-3">
          <div className="rounded-2xl p-5 shadow-sm border-2" style={{ background: '#fff', borderColor: '#e4edf3' }}>
            <div className="flex items-center justify-between mb-4" dir="rtl">
              <h3 className="text-[15px] font-black text-[#1a2f3e]">ملخص النشاط</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSettingsOpen(true)}
                  className="w-8 h-8 rounded-xl flex items-center justify-center transition-all active:scale-90 hover:bg-[#e4edf3]"
                  style={{ background: '#f0f5f9' }}
                >
                  <Settings className="w-4 h-4 text-[#7a9aab]" />
                </button>
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="w-8 h-8 rounded-xl flex items-center justify-center transition-all"
                  style={{ background: '#f0f5f9' }}
                >
                  <RefreshCw className={`w-4 h-4 text-[#7a9aab] ${refreshing ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-5" dir="rtl">
              <div className="text-center p-3 rounded-xl" style={{ background: '#f0f8ff' }}>
                <div className="w-10 h-10 mx-auto mb-2 rounded-xl flex items-center justify-center" style={{ background: '#dbeafe' }}>
                  <ClipboardList className="w-5 h-5 text-[#2196F3]" />
                </div>
                <p className="text-[20px] font-black text-[#1a2f3e]">{activeOrders.length}</p>
                <p className="text-[10px] font-bold text-[#7a9aab]">طلبات نشطة</p>
              </div>

              <div className="text-center p-3 rounded-xl" style={{ background: '#f0faf4' }}>
                <div className="w-10 h-10 mx-auto mb-2 rounded-xl flex items-center justify-center" style={{ background: '#d1fae5' }}>
                  <Package className="w-5 h-5 text-[#27AE60]" />
                </div>
                <p className="text-[20px] font-black text-[#1a2f3e]">{activeBatches.length}</p>
                <p className="text-[10px] font-bold text-[#7a9aab]">مستودع سحابي</p>
              </div>

              <div className="text-center p-3 rounded-xl" style={{ background: '#fefce8' }}>
                <div className="w-10 h-10 mx-auto mb-2 rounded-xl flex items-center justify-center" style={{ background: '#fef08a' }}>
                  <Handshake className="w-5 h-5 text-[#ca8a04]" />
                </div>
                <p className="text-[20px] font-black text-[#1a2f3e]">{activeDeals.length}</p>
                <p className="text-[10px] font-bold text-[#7a9aab]">صفقات جارية</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3" dir="rtl">
              <button
                onClick={onAddInventory}
                className="flex items-center justify-center gap-2 py-3.5 rounded-2xl text-[13px] font-black text-white transition-all active:scale-[0.97]"
                style={{
                  background: 'linear-gradient(135deg, #1a4a5e, #0f3347)',
                  boxShadow: '0 4px 14px rgba(26,74,94,0.3)',
                }}
              >
                <Plus className="w-4 h-4" />
                <span>إضافة مخزون سحابي</span>
              </button>
              <button
                onClick={onCreateOrder}
                className="flex items-center justify-center gap-2 py-3.5 rounded-2xl text-[13px] font-black text-white transition-all active:scale-[0.97]"
                style={{
                  background: 'linear-gradient(135deg, #27AE60, #1e8449)',
                  boxShadow: '0 4px 14px rgba(39,174,96,0.3)',
                }}
              >
                <ClipboardList className="w-4 h-4" />
                <span>إنشاء طلب</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── BUYER VIEW: Orders + Buyer Deals ── */}
        {activeRole === 'buyer' && (
          <>
            {/* My Orders */}
            <div className="px-4 pt-4">
              <div className="flex items-center justify-between mb-3" dir="rtl">
                <div className="flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-[#2196F3]" />
                  <h3 className="text-[14px] font-black text-[#1a2f3e]">طلباتي</h3>
                </div>
                <button
                  onClick={onCreateOrder}
                  className="text-[11px] font-bold text-[#2196F3] flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  طلب جديد
                </button>
              </div>

              {loading ? (
                <div className="space-y-2">
                  {[1, 2].map(i => (
                    <div key={i} className="h-20 bg-white rounded-2xl animate-pulse border-2 border-[#e4edf3]" />
                  ))}
                </div>
              ) : activeOrders.length === 0 ? (
                <div className="bg-white rounded-2xl border-2 border-dashed border-[#d0dfe8] py-10 text-center">
                  <ShoppingCart className="w-10 h-10 mx-auto mb-2 text-[#c0d5e0]" />
                  <p className="text-[12px] font-bold text-[#9ab0bf]">لا توجد طلبات نشطة</p>
                  <button
                    onClick={onCreateOrder}
                    className="mt-3 px-4 py-2 rounded-xl text-[11px] font-bold text-white"
                    style={{ background: 'linear-gradient(135deg, #2196F3, #1565C0)' }}
                  >
                    <Plus className="w-3 h-3 inline ml-1" />
                    إنشاء أول طلب
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {activeOrders.slice(0, 4).map(order => {
                    const cfg = ORDER_STATUS_CONFIG[order.status] || ORDER_STATUS_CONFIG.pending;
                    const StatusIcon = cfg.icon;
                    return (
                      <div key={order.id} className="bg-white rounded-2xl border-2 border-[#e4edf3] p-4 shadow-sm" dir="rtl">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="text-[13px] font-black text-[#1a2f3e] truncate">
                                {order.pallet_type} – {order.size} – {order.quality}
                              </p>
                            </div>
                            <div className="flex items-center gap-3 text-[10px] text-[#7a9aab] mb-1.5">
                              <span>{order.city}</span>
                              <span>{order.quantity.toLocaleString('ar-SA')} طبلية</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-bold"
                                style={{ background: cfg.bg, color: cfg.color }}
                              >
                                <StatusIcon className="w-3 h-3" />
                                {cfg.label}
                              </span>
                              {order.deal_ref && (
                                <span className="text-[9px] font-mono font-bold text-[#2196F3] bg-[#EBF5FF] px-1.5 py-0.5 rounded">
                                  {order.deal_ref}
                                </span>
                              )}
                            </div>
                            {order.status === 'matched' && order.matched_quantity && order.matched_price && (
                              <p className="mt-1 text-[10px] font-bold text-[#27AE60]">
                                {order.matched_quantity.toLocaleString('ar-SA')} طبلية @ {order.matched_price} ر.س
                              </p>
                            )}
                            {order.status === 'unmatched' && (
                              <div className="mt-1 flex items-center gap-1">
                                <Radar className="w-3 h-3 text-[#0369A1] animate-pulse" />
                                <span className="text-[9px] font-bold text-[#0369A1]">يتتبع المخزون تلقائيا</span>
                              </div>
                            )}
                          </div>
                          <div className="flex gap-1.5 flex-shrink-0">
                            {confirmDeleteId === order.id ? (
                              <div className="flex gap-1">
                                <button
                                  disabled={deletingId === order.id}
                                  onClick={() => handleDeleteOrder(order.id)}
                                  className="text-[9px] font-bold px-2 py-1 rounded-lg bg-red-500 text-white disabled:opacity-40"
                                >
                                  {deletingId === order.id ? '...' : 'حذف'}
                                </button>
                                <button
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="text-[9px] font-bold px-2 py-1 rounded-lg bg-gray-100 text-gray-500"
                                >
                                  الغاء
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setConfirmDeleteId(order.id)}
                                className="p-1.5 rounded-lg bg-red-50 border border-red-100 active:scale-90 transition-transform"
                              >
                                <Trash2 className="w-3 h-3 text-red-400" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {activeOrders.length > 4 && (
                    <button
                      onClick={onCreateOrder}
                      className="w-full py-2.5 text-center text-[11px] font-bold text-[#2196F3] bg-white rounded-2xl border-2 border-[#e4edf3]"
                    >
                      عرض جميع الطلبات ({activeOrders.length})
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Buyer Deals */}
            <div className="px-4 pt-4">
              <div className="flex items-center justify-between mb-3" dir="rtl">
                <div className="flex items-center gap-2">
                  <Handshake className="w-4 h-4 text-[#2196F3]" />
                  <h3 className="text-[14px] font-black text-[#1a2f3e]">صفقات الشراء</h3>
                </div>
                <button
                  onClick={onOpenBuyerDeals}
                  className="text-[11px] font-bold text-[#2196F3] flex items-center gap-1"
                >
                  <ChevronLeft className="w-3 h-3" />
                  <span>عرض الكل</span>
                </button>
              </div>

              {buyerDeals.length === 0 ? (
                <div className="bg-white rounded-2xl border-2 border-dashed border-[#d0dfe8] py-8 text-center">
                  <Handshake className="w-10 h-10 mx-auto mb-2 text-[#c0d5e0]" />
                  <p className="text-[12px] font-bold text-[#9ab0bf]">لا توجد صفقات شراء</p>
                  <p className="text-[10px] text-[#c0d5e0] mt-1">ستظهر هنا عند مطابقة طلباتك مع مخزون متاح</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {buyerDeals.slice(0, 3).map(deal => {
                    const statusCfg = DEAL_STATUS_CONFIG[deal.status] || DEAL_STATUS_CONFIG.matched;
                    return (
                      <button
                        key={deal.id}
                        onClick={onOpenBuyerDeals}
                        className="w-full bg-white rounded-2xl border-2 border-[#e4edf3] p-4 shadow-sm text-right active:scale-[0.98] transition-all"
                        dir="rtl"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <p className="text-[13px] font-black text-[#1a2f3e]">
                              {deal.pallet_type} – {deal.size}
                            </p>
                            <span className="text-[9px] font-mono text-[#7a9aab]">{deal.deal_ref}</span>
                          </div>
                          <span
                            className="text-[9px] font-bold px-2 py-0.5 rounded-lg"
                            style={{ background: statusCfg.bg, color: statusCfg.color }}
                          >
                            {statusCfg.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-[10px] text-[#7a9aab]">
                          <span>{deal.quantity.toLocaleString('ar-SA')} طبلية</span>
                          <span>{deal.city}</span>
                          {deal.price > 0 && <span className="font-bold text-[#1a2f3e]">{deal.price} ر.س</span>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {/* ── SUPPLIER VIEW: Inventory + Supplier Deals ── */}
        {activeRole === 'supplier' && (
          <>
            {/* My Inventory */}
            <div className="px-4 pt-4">
              <div className="flex items-center justify-between mb-3" dir="rtl">
                <div className="flex items-center gap-2">
                  <Warehouse className="w-4 h-4 text-[#27AE60]" />
                  <h3 className="text-[14px] font-black text-[#1a2f3e]">مستودعي السحابي</h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={onOpenSupplierInventory}
                    className="text-[11px] font-bold text-[#7a9aab] flex items-center gap-1"
                  >
                    <Eye className="w-3 h-3" />
                    ادارة
                  </button>
                  <button
                    onClick={onAddInventory}
                    className="text-[11px] font-bold text-[#27AE60] flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    اضافة مخزون
                  </button>
                </div>
              </div>

              {batches.length === 0 ? (
                <div className="bg-white rounded-2xl border-2 border-dashed border-[#d0dfe8] py-10 text-center">
                  <Package className="w-10 h-10 mx-auto mb-2 text-[#c0d5e0]" />
                  <p className="text-[12px] font-bold text-[#9ab0bf]">لم يتم اضافة مخزون بعد</p>
                  <button
                    onClick={onAddInventory}
                    className="mt-3 px-4 py-2 rounded-xl text-[11px] font-bold text-white"
                    style={{ background: 'linear-gradient(135deg, #27AE60, #1e8449)' }}
                  >
                    <Plus className="w-3 h-3 inline ml-1" />
                    اضافة اول مخزون
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {batches.slice(0, 3).map(batch => (
                    <div key={batch.id} className="bg-white rounded-2xl border-2 border-[#e4edf3] p-4 shadow-sm" dir="rtl">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <p className="text-[13px] font-black text-[#1a2f3e]">
                            {batch.pallet_type} – {batch.size}
                          </p>
                          <span
                            className="text-[9px] font-bold px-2 py-0.5 rounded-lg"
                            style={{
                              background: batch.quality === 'A' ? '#E8F8F0' : batch.quality === 'B' ? '#EBF5FF' : '#FFFBEB',
                              color: batch.quality === 'A' ? '#27AE60' : batch.quality === 'B' ? '#2196F3' : '#F59E0B',
                            }}
                          >
                            Grade {batch.quality}
                          </span>
                        </div>
                        {batch.status === 'active' ? (
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-lg bg-[#E8F8F0] text-[#27AE60]">
                            نشط
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-lg bg-[#F3F4F6] text-[#6B7280]">
                            {batch.status}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mb-2 text-[10px] text-[#7a9aab]">
                        <MapPin className="w-3 h-3" />
                        <span>{batch.city}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="text-center p-2 rounded-xl" style={{ background: '#f0f8ff' }}>
                          <p className="text-[10px] text-[#7a9aab] mb-0.5">الكمية المتاحة</p>
                          <p className="text-[14px] font-black text-[#1a2f3e]">{batch.available_quantity} <span className="text-[10px] font-bold text-[#7a9aab]">طبلية</span></p>
                        </div>
                        <div className="text-center p-2 rounded-xl" style={{ background: '#fefce8' }}>
                          <p className="text-[10px] text-[#7a9aab] mb-0.5">محجوز للصفقات</p>
                          <p className="text-[14px] font-black text-[#1a2f3e]">{batch.matched_quantity.toLocaleString('ar-SA')} <span className="text-[10px] font-bold text-[#7a9aab]">طبلية</span></p>
                        </div>
                      </div>

                      {batch.min_price && (
                        <p className="text-[11px] font-bold text-[#7a9aab] mt-2">
                          السعر الادنى: <span className="text-[#1a2f3e]">{batch.min_price} ريال</span>
                        </p>
                      )}
                    </div>
                  ))}
                  {batches.length > 3 && (
                    <button
                      onClick={onOpenSupplierInventory}
                      className="w-full py-2.5 text-center text-[11px] font-bold text-[#27AE60] bg-white rounded-2xl border-2 border-[#e4edf3]"
                    >
                      عرض كل المخزون ({batches.length})
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Supplier Deals */}
            <div className="px-4 pt-4">
              <div className="flex items-center justify-between mb-3" dir="rtl">
                <div className="flex items-center gap-2">
                  <Handshake className="w-4 h-4 text-[#27AE60]" />
                  <h3 className="text-[14px] font-black text-[#1a2f3e]">صفقات التوريد</h3>
                </div>
                <button
                  onClick={onOpenSupplierDeals}
                  className="text-[11px] font-bold text-[#27AE60] flex items-center gap-1"
                >
                  <ChevronLeft className="w-3 h-3" />
                  <span>عرض الكل</span>
                </button>
              </div>

              {supplierDeals.length === 0 ? (
                <div className="bg-white rounded-2xl border-2 border-dashed border-[#d0dfe8] py-8 text-center">
                  <Handshake className="w-10 h-10 mx-auto mb-2 text-[#c0d5e0]" />
                  <p className="text-[12px] font-bold text-[#9ab0bf]">لا توجد صفقات توريد</p>
                  <p className="text-[10px] text-[#c0d5e0] mt-1">ستظهر هنا عند مطابقة مخزونك مع طلبات المشترين</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {supplierDeals.slice(0, 3).map(deal => {
                    const statusCfg = DEAL_STATUS_CONFIG[deal.status] || DEAL_STATUS_CONFIG.matched;
                    return (
                      <button
                        key={deal.id}
                        onClick={onOpenSupplierDeals}
                        className="w-full bg-white rounded-2xl border-2 border-[#e4edf3] p-4 shadow-sm text-right active:scale-[0.98] transition-all"
                        dir="rtl"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <p className="text-[13px] font-black text-[#1a2f3e]">
                              {deal.pallet_type} – {deal.size}
                            </p>
                            <span className="text-[9px] font-mono text-[#7a9aab]">{deal.deal_ref}</span>
                          </div>
                          <span
                            className="text-[9px] font-bold px-2 py-0.5 rounded-lg"
                            style={{ background: statusCfg.bg, color: statusCfg.color }}
                          >
                            {statusCfg.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-[10px] text-[#7a9aab]">
                          <span>{deal.quantity.toLocaleString('ar-SA')} طبلية</span>
                          <span>{deal.city}</span>
                          {deal.price > 0 && <span className="font-bold text-[#1a2f3e]">{deal.price} ر.س</span>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {/* Logout */}
        <div className="px-4 pt-6 pb-4">
          {!showLogoutConfirm ? (
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="w-full flex items-center gap-3 px-4 py-4 rounded-2xl border-2 active:scale-[0.98] transition-all"
              style={{ background: '#FEF2F2', borderColor: '#FCA5A5' }}
              dir="rtl"
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #EF4444, #DC2626)' }}>
                <LogOut className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 text-right">
                <p className="text-[13px] font-black text-red-700">تسجيل الخروج</p>
                <p className="text-[10px] text-red-400">إنهاء الجلسة الحالية</p>
              </div>
            </button>
          ) : (
            <div className="rounded-2xl border-2 overflow-hidden" style={{ background: '#FEF2F2', borderColor: '#FCA5A5' }}>
              <div className="flex items-center gap-3 px-4 py-3.5 border-b border-red-100" dir="rtl">
                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
                <div className="flex-1 text-right">
                  <p className="text-[13px] font-bold text-red-700">تأكيد تسجيل الخروج</p>
                  <p className="text-[10px] text-red-400 mt-0.5">هل أنت متأكد من إنهاء الجلسة؟</p>
                </div>
              </div>
              <div className="flex gap-2 p-3">
                <button
                  onClick={onLogout}
                  className="flex-1 py-2.5 rounded-xl text-[13px] font-bold text-white"
                  style={{ background: 'linear-gradient(135deg, #DC2626, #b91c1c)' }}
                >
                  نعم، خروج
                </button>
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 py-2.5 rounded-xl text-[13px] font-bold bg-white text-gray-500 border border-gray-200"
                >
                  إلغاء
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <SettingsPanel
        session={session}
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onUpdateProfile={onUpdateProfile}
      />
    </div>
  );
}
