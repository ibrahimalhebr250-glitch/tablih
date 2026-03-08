import { useState, useEffect } from 'react';
import {
  ClipboardList,
  Clock,
  CheckCircle2,
  Plus,
  Handshake,
  RefreshCw,
  Radar,
  XCircle,
  MessageSquare,
} from 'lucide-react';
import { useAccountOrders } from '../../../hooks/useAccountOrders';
import { ActiveOrderCard, MatchedOrderCard, CompletedOrderCard } from '../orders/OrderCards';
import OrderDetailSheet from '../orders/OrderDetailSheet';
import { ActionToast } from '../../shared/ActionToast';
import type { ToastConfig } from '../../shared/ActionToast';
import type { AccountOrder } from '../../../hooks/useAccountOrders';
import { supabase } from '../../../lib/supabase';

type OrderFilter = 'active' | 'matched' | 'completed';

interface Props {
  phone: string;
  onCreateOrder: () => void;
  onGoToDeals?: () => void;
  onGoToWarehouse?: () => void;
}

const FILTERS: { key: OrderFilter; label: string; icon: typeof Clock; color: string }[] = [
  { key: 'active', label: 'النشطة', icon: Radar, color: '#B45309' },
  { key: 'matched', label: 'تمت المطابقة', icon: Handshake, color: '#059669' },
  { key: 'completed', label: 'المكتملة', icon: CheckCircle2, color: '#6b7280' },
];

const STATUS_MAP: Record<string, { label: string; color: string; bg: string; border: string }> = {
  pending:      { label: 'قيد الانتظار', color: '#b45309', bg: '#FFFBEB', border: '#FDE68A' },
  accepted:     { label: 'تم القبول', color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
  rejected:     { label: 'مرفوض', color: '#dc2626', bg: '#FEF2F2', border: '#FECACA' },
  deal_created: { label: 'الصفقة أُنشئت', color: '#1d4ed8', bg: '#EFF6FF', border: '#BFDBFE' },
  cancelled:    { label: 'ملغي', color: '#6b7280', bg: '#f3f4f6', border: '#e5e7eb' },
};

function BuyerNegotiationRequests({ phone }: { phone: string }) {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('negotiation_requests')
      .select('id, pallet_type, size, quality, city, available_quantity, price_per_pallet, supplier_phone, supplier_response, status, created_at')
      .eq('buyer_phone', phone)
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false })
      .limit(10);
    setRequests(data || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel('buyer_negotiation_' + phone)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'negotiation_requests', filter: `buyer_phone=eq.${phone}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [phone]);

  if (loading || requests.length === 0) return null;

  return (
    <div className="space-y-2 mb-4">
      <div className="flex items-center justify-between">
        <button onClick={load} className="w-6 h-6 rounded-lg bg-white/80 border border-[#e2edf5] flex items-center justify-center">
          <RefreshCw className="w-3 h-3 text-[#7a9aab]" />
        </button>
        <div className="flex items-center gap-2">
          <h3 className="text-[13px] font-black text-[#1a3a4a]">طلبات التفاوض</h3>
          <MessageSquare className="w-4 h-4 text-[#4a7a8a]" />
        </div>
      </div>
      {requests.map(req => {
        const s = STATUS_MAP[req.status] || STATUS_MAP.pending;
        return (
          <div
            key={req.id}
            className="rounded-2xl p-4 space-y-2.5"
            style={{ background: 'white', border: `1.5px solid ${s.border}`, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
            dir="rtl"
          >
            <div className="flex items-start justify-between">
              <span
                className="text-[10px] font-bold px-2.5 py-1 rounded-full"
                style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}
              >
                {s.label}
              </span>
              <div className="text-right">
                <p className="text-[14px] font-black text-[#1a3a4a]">{req.pallet_type}</p>
                <p className="text-[10px] text-[#7a9aab]">{req.city} — {req.size}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 justify-end flex-wrap">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#f0f9f4', color: '#15803d' }}>
                {req.available_quantity} طبلية
              </span>
              {req.price_per_pallet > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#f0f9f4', color: '#15803d' }}>
                  {req.price_per_pallet} ر.س
                </span>
              )}
              <span className="text-[10px] text-[#a0b5c0]">
                {new Date(req.created_at).toLocaleDateString('ar-SA', { day: 'numeric', month: 'short' })}
              </span>
            </div>

            {req.supplier_response && (
              <div className="rounded-xl p-2.5" style={{ background: s.bg, border: `1px solid ${s.border}` }}>
                <div className="flex items-center gap-1.5 mb-1">
                  <MessageSquare className="w-3 h-3" style={{ color: s.color }} />
                  <span className="text-[10px] font-bold" style={{ color: s.color }}>رد المورد</span>
                </div>
                <p className="text-[12px] text-[#1a3a4a] leading-relaxed">{req.supplier_response}</p>
              </div>
            )}

            {req.status === 'accepted' && (
              <div
                className="rounded-xl p-2.5 flex items-center gap-2"
                style={{ background: '#ECFDF5', border: '1px solid #A7F3D0' }}
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                <p className="text-[11px] text-green-700">وافق المورد! توجّه إلى <span className="font-black">صفقاتي</span> لمتابعة الصفقة.</p>
              </div>
            )}

            {req.status === 'deal_created' && (
              <div
                className="rounded-xl p-2.5 flex items-center gap-2"
                style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}
              >
                <Handshake className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                <p className="text-[11px] text-blue-700">الصفقة أُنشئت! توجّه إلى <span className="font-black">صفقاتي</span> لمتابعة التسليم.</p>
              </div>
            )}
          </div>
        );
      })}
      <div className="h-px" style={{ background: '#e2edf5' }} />
    </div>
  );
}

export default function MyOrdersTab({ phone, onCreateOrder, onGoToDeals, onGoToWarehouse }: Props) {
  const {
    activeOrders, matchedOrders, completedOrders,
    loading, actionLoading,
    canEdit, canCancel,
    updateOrder, cancelOrder,
    refresh,
  } = useAccountOrders(phone);

  const [filter, setFilter] = useState<OrderFilter>('active');
  const [selectedOrder, setSelectedOrder] = useState<AccountOrder | null>(null);
  const [toast, setToast] = useState<ToastConfig | null>(null);

  const counts = {
    active: activeOrders.length,
    matched: matchedOrders.length,
    completed: completedOrders.length,
  };
  const totalOrders = counts.active + counts.matched + counts.completed;

  const currentOrders = filter === 'active' ? activeOrders
    : filter === 'matched' ? matchedOrders
    : completedOrders;

  const handleGoToDeal = (order: AccountOrder) => {
    if (onGoToDeals) {
      onGoToDeals();
    }
  };

  return (
    <div className="space-y-3" dir="rtl">
      {toast && (
        <ActionToast
          title={toast.title}
          message={toast.message}
          variant={toast.variant}
          onClose={() => setToast(null)}
        />
      )}

      <BuyerNegotiationRequests phone={phone} />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-[#7a9aab]">{totalOrders} طلب</span>
          <button
            onClick={refresh}
            className={`w-7 h-7 rounded-lg bg-white/80 border border-[#e2edf5] flex items-center justify-center ${loading ? 'animate-spin' : ''}`}
          >
            <RefreshCw className="w-3 h-3 text-[#7a9aab]" />
          </button>
        </div>
      </div>

      <div
        className="flex gap-1 p-1 rounded-2xl"
        style={{ background: 'rgba(255,255,255,0.7)', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', border: '1px solid rgba(255,255,255,0.9)' }}
      >
        {FILTERS.map(f => {
          const Icon = f.icon;
          const isActive = filter === f.key;
          const count = counts[f.key];
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[11px] font-bold transition-all ${
                isActive
                  ? 'text-white shadow-lg'
                  : 'text-[#5a7a8a] hover:text-[#1a4a5e] hover:bg-white/50'
              }`}
              style={isActive ? {
                background: 'linear-gradient(135deg, #1a4a5e 0%, #2c6f8a 100%)',
                boxShadow: '0 4px 12px rgba(26,74,94,0.3)',
              } : undefined}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{f.label}</span>
              {count > 0 && (
                <span
                  className="text-[9px] font-black min-w-[18px] rounded-full flex items-center justify-center"
                  style={{
                    background: isActive ? 'rgba(255,255,255,0.25)' : f.key === 'active' ? '#F59E0B' : '#e2ecf3',
                    color: isActive ? 'white' : f.key === 'active' ? 'white' : '#2c5f7c',
                    padding: '2px 6px',
                  }}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white/60 rounded-2xl p-5 animate-pulse">
              <div className="h-3 bg-gray-200 rounded w-1/3 mb-3" />
              <div className="space-y-2">
                <div className="h-2.5 bg-gray-200 rounded w-2/3" />
                <div className="h-2.5 bg-gray-200 rounded w-1/2" />
                <div className="h-2.5 bg-gray-200 rounded w-3/4" />
              </div>
              <div className="h-10 bg-gray-200 rounded-xl mt-3" />
            </div>
          ))}
        </div>
      ) : currentOrders.length === 0 ? (
        <EmptyOrders filter={filter} onCreateOrder={onCreateOrder} />
      ) : (
        <div className="space-y-3">
          {currentOrders.map(order => {
            if (filter === 'active') {
              return (
                <ActiveOrderCard
                  key={order.id}
                  order={order}
                  onViewDetail={setSelectedOrder}
                />
              );
            }
            if (filter === 'matched') {
              return (
                <MatchedOrderCard
                  key={order.id}
                  order={order}
                  onViewDetail={setSelectedOrder}
                  onGoToDeal={handleGoToDeal}
                />
              );
            }
            return (
              <CompletedOrderCard
                key={order.id}
                order={order}
                onViewDetail={setSelectedOrder}
                onGoToWarehouse={onGoToWarehouse}
              />
            );
          })}
        </div>
      )}

      <button
        onClick={onCreateOrder}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-[13px] font-bold text-white active:scale-[0.98] transition-transform"
        style={{ background: 'linear-gradient(135deg, #b45309 0%, #d97706 100%)', boxShadow: '0 4px 14px rgba(180,83,9,0.25)' }}
      >
        <Plus className="w-4 h-4" />
        إنشاء طلب جديد
      </button>

      {selectedOrder && (
        <OrderDetailSheet
          order={selectedOrder}
          actionLoading={actionLoading}
          canEdit={canEdit(selectedOrder)}
          canCancel={canCancel(selectedOrder)}
          onClose={() => setSelectedOrder(null)}
          onUpdate={async (id, data) => {
            const result = await updateOrder(id, data);
            if (result.success) {
              setToast({ title: 'تم تعديل الطلب', message: 'تم حفظ التعديلات بنجاح', variant: 'success' });
            }
            return result;
          }}
          onCancel={async (id) => {
            const result = await cancelOrder(id);
            if (result.success) {
              setToast({ title: 'تم إلغاء الطلب', message: 'تم حذف الطلب بنجاح', variant: 'info' });
            }
            return result;
          }}
          onGoToDeal={onGoToDeals ? handleGoToDeal : undefined}
          onGoToWarehouse={onGoToWarehouse}
        />
      )}
    </div>
  );
}

function EmptyOrders({ filter, onCreateOrder }: { filter: OrderFilter; onCreateOrder: () => void }) {
  const config = {
    active: {
      title: 'لا توجد طلبات نشطة',
      desc: 'أنشئ طلب شراء جديد وسنبحث لك عن المورد المناسب تلقائيا',
      color: '#B45309',
      bgFrom: '#FFFBEB',
      border: '#FDE68A',
      icon: Radar,
      showButton: true,
    },
    matched: {
      title: 'لا توجد طلبات تمت مطابقتها',
      desc: 'الطلبات التي يتم العثور لها على مخزون مطابق ستظهر هنا',
      color: '#059669',
      bgFrom: '#ECFDF5',
      border: '#A7F3D0',
      icon: Handshake,
      showButton: false,
    },
    completed: {
      title: 'لا توجد طلبات مكتملة',
      desc: 'الطلبات التي تم تنفيذها بنجاح ونقل الطبليات إلى مشترياتك ستظهر هنا',
      color: '#6b7280',
      bgFrom: '#f3f4f6',
      border: '#e5e7eb',
      icon: CheckCircle2,
      showButton: false,
    },
  };

  const c = config[filter];
  const Icon = c.icon;

  return (
    <div
      className="rounded-2xl p-8 text-center"
      style={{ background: `linear-gradient(135deg, rgba(255,255,255,0.8) 0%, ${c.bgFrom}80 100%)`, border: `2px dashed ${c.border}` }}
    >
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
        style={{ background: c.bgFrom }}
      >
        <Icon className="w-7 h-7" style={{ color: c.color }} />
      </div>
      <h3 className="text-[15px] font-bold text-[#1a3a4a] mb-1.5">{c.title}</h3>
      <p className="text-[12px] text-[#7a9aab] leading-relaxed max-w-[260px] mx-auto mb-4">{c.desc}</p>
      {c.showButton && (
        <button
          onClick={onCreateOrder}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[12px] font-bold text-white active:scale-95 transition-transform"
          style={{ background: 'linear-gradient(135deg, #b45309 0%, #d97706 100%)', boxShadow: '0 4px 12px rgba(180,83,9,0.25)' }}
        >
          <Plus className="w-4 h-4" />
          إنشاء طلب
        </button>
      )}
    </div>
  );
}
