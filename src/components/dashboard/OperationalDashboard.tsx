import { useEffect } from 'react';
import { RefreshCw, Handshake, ShoppingBag, ChevronLeft, Sparkles, Warehouse } from 'lucide-react';
import { useDashboard } from '../../hooks/useDashboard';
import { useBuyerInventory } from '../../hooks/useBuyerInventory';
import ActivitySummaryCard from './ActivitySummaryCard';
import OrdersSection from './OrdersSection';
import WarehouseSection from './WarehouseSection';
import type { AppSession } from '../../types/session';

interface Props {
  session: AppSession;
  onAddInventory: () => void;
  onCreateOrder: () => void;
  onOpenSupplierDeals: () => void;
  onOpenBuyerDeals: () => void;
  refreshRef?: React.MutableRefObject<(() => void) | null>;
}

export default function OperationalDashboard({ session, onAddInventory, onCreateOrder, onOpenSupplierDeals, onOpenBuyerDeals, refreshRef }: Props) {
  const { orders, batches, deals, summary, loading, refresh, updateBatchPrice, updateBatch, deleteBatch, updateOrder } = useDashboard(session.profile.phone);
  const { summary: buyerInventorySummary } = useBuyerInventory(session.profile.phone);

  useEffect(() => {
    if (refreshRef) refreshRef.current = refresh;
  }, [refresh, refreshRef]);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'صباح الخير';
    if (h < 17) return 'مساء الخير';
    return 'مساء النور';
  };

  const displayName = session.profile.company_name || session.profile.display_name || session.profile.phone;

  return (
    <div className="h-full">
      <div className="px-4 lg:px-6 pt-5 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={refresh}
            className={`p-2 rounded-full bg-white border border-gray-100 shadow-sm ${loading ? 'animate-spin' : ''}`}
          >
            <RefreshCw className="w-4 h-4 text-[#2c5f7c]" />
          </button>
        </div>
        <div className="text-right">
          <p className="text-[11px] text-[#7a9aab]">{greeting()}</p>
          <h2 className="text-[16px] font-bold text-[#1a4a5e]">{displayName}</h2>
        </div>
      </div>

      {session.roles.length > 0 && (
        <div className="px-4 lg:px-6 mb-2 flex justify-end gap-2">
          {session.roles.includes('supplier') && (
            <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-[#E8F8F0] text-[#27AE60]">
              مورّد
            </span>
          )}
          {session.roles.includes('buyer') && (
            <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-[#EBF5FF] text-[#2196F3]">
              مشتري
            </span>
          )}
        </div>
      )}

      <ActivitySummaryCard
        summary={summary}
        onAddInventory={onAddInventory}
        onCreateOrder={onCreateOrder}
      />

      {/* Desktop: 2-column grid for Orders + Warehouse */}
      <div className="lg:grid lg:grid-cols-2 lg:gap-0 lg:items-start">
        <OrdersSection orders={orders} loading={loading} phone={session.profile.phone} onCreateOrder={onCreateOrder} onRefresh={refresh} onUpdateOrder={updateOrder} onOpenBuyerDeals={onOpenBuyerDeals} />
        <WarehouseSection batches={batches} loading={loading} onAddInventory={onAddInventory} supplierPhone={session.profile.phone} onDealCreated={refresh} onUpdatePrice={updateBatchPrice} onUpdateBatch={updateBatch} onDeleteBatch={deleteBatch} onOpenDeals={onOpenSupplierDeals} />
      </div>

      <div className="mx-4 lg:mx-6 mt-5 mb-28 space-y-3">
        {session.roles.includes('supplier') && (
          <button
            onClick={onOpenSupplierDeals}
            className="relative w-full rounded-2xl border shadow-sm overflow-hidden active:opacity-75 transition-all hover:shadow-md bg-white"
            style={{ borderColor: deals.length > 0 ? '#27AE60' : '#F3F4F6' }}
          >
            <div className="px-4 py-4 flex items-center justify-between">
              <ChevronLeft className="w-4 h-4 text-[#2c5f7c] flex-shrink-0" />
              <div className="text-right flex-1 mx-3">
                <p className="text-[13px] font-bold text-[#1a4a5e]">صفقاتي</p>
                <p className="text-[11px] text-[#7a9aab] mt-0.5">تتبع وإدارة صفقات التوريد</p>
              </div>
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: deals.length > 0 ? '#E8F8F0' : '#1a4a5e14' }}
              >
                <Handshake className="w-4 h-4" style={{ color: deals.length > 0 ? '#27AE60' : '#1a4a5e' }} />
              </div>
            </div>
            {deals.length > 0 && (
              <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-t border-[#27AE60]/20 bg-[#F0FBF4]">
                <ChevronLeft className="w-3.5 h-3.5 text-[#27AE60] flex-shrink-0" />
                <div className="flex items-center gap-2 justify-end flex-1">
                  <p className="text-[11px] font-bold text-[#1a7a44]">
                    لديك {summary.activeDeals === 1 ? 'صفقة نشطة' : `${summary.activeDeals} صفقات نشطة`}
                  </p>
                  <span className="flex items-center gap-1 text-[10px] font-bold text-[#fff] bg-[#27AE60] px-2 py-0.5 rounded-full animate-pulse">
                    <Sparkles className="w-2.5 h-2.5" />
                    عرض
                  </span>
                </div>
              </div>
            )}
          </button>
        )}

        {(session.roles.includes('buyer') || orders.length > 0) && (
          <button
            onClick={onOpenBuyerDeals}
            className="relative w-full rounded-2xl border shadow-sm overflow-hidden active:opacity-75 transition-all hover:shadow-md bg-white"
            style={{ borderColor: deals.length > 0 ? '#2563eb' : '#F3F4F6' }}
          >
            <div className="px-4 py-4 flex items-center justify-between">
              <ChevronLeft className="w-4 h-4 text-[#2c5f7c] flex-shrink-0" />
              <div className="text-right flex-1 mx-3">
                <p className="text-[13px] font-bold text-[#1a4a5e]">طلباتي</p>
                <p className="text-[11px] text-[#7a9aab] mt-0.5">تتبع وإدارة طلبات الشراء</p>
              </div>
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: deals.length > 0 ? '#EFF6FF' : '#1a4a5e14' }}
              >
                <ShoppingBag className="w-4 h-4" style={{ color: deals.length > 0 ? '#2563eb' : '#1a4a5e' }} />
              </div>
            </div>
            {deals.length > 0 && (
              <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-t border-[#2563eb]/20 bg-[#EFF6FF]">
                <ChevronLeft className="w-3.5 h-3.5 text-[#2563eb] flex-shrink-0" />
                <div className="flex items-center gap-2 justify-end flex-1">
                  <p className="text-[11px] font-bold text-[#1E40AF]">
                    لديك {summary.activeDeals === 1 ? 'صفقة جارية' : `${summary.activeDeals} صفقات جارية`}
                  </p>
                  <span className="flex items-center gap-1 text-[10px] font-bold text-[#fff] bg-[#2563eb] px-2 py-0.5 rounded-full animate-pulse">
                    <Sparkles className="w-2.5 h-2.5" />
                    عرض
                  </span>
                </div>
              </div>
            )}
          </button>
        )}

      </div>

    </div>
  );
}
