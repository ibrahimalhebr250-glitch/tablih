import {
  Clock,
  Radar,
  CheckCircle2,
  XCircle,
  MapPin,
  Layers,
  Handshake,
  ArrowLeft,
  Package,
} from 'lucide-react';
import type { AccountOrder } from '../../../hooks/useAccountOrders';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  pending:           { label: 'قيد البحث',       color: '#B45309', bg: '#FFFBEB', border: '#FDE68A' },
  unmatched:         { label: 'يتتبع المخزون',   color: '#0369A1', bg: '#E0F2FE', border: '#BAE6FD' },
  partially_matched: { label: 'مطابقة جزئية',    color: '#0369A1', bg: '#EFF6FF', border: '#BFDBFE' },
  matched:           { label: 'تمت المطابقة',    color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
  fulfilled:         { label: 'مكتمل',           color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
  cancelled:         { label: 'ملغى',            color: '#dc2626', bg: '#FEF2F2', border: '#FECACA' },
};

function OrderHeader({ order }: { order: AccountOrder }) {
  const cfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending;
  const isPending = order.status === 'pending' || order.status === 'unmatched';

  return (
    <div className="flex items-center justify-between px-4 py-2" style={{ background: cfg.bg, borderBottom: `1px solid ${cfg.border}` }}>
      <div className="flex items-center gap-1.5">
        {isPending && <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: cfg.color }} />}
        {order.status === 'fulfilled' && <CheckCircle2 className="w-3 h-3" style={{ color: cfg.color }} />}
        {order.status === 'cancelled' && <XCircle className="w-3 h-3" style={{ color: cfg.color }} />}
        {(order.status === 'matched' || order.status === 'partially_matched') && <Handshake className="w-3 h-3" style={{ color: cfg.color }} />}
        <span className="text-[10px] font-bold" style={{ color: cfg.color }}>{cfg.label}</span>
      </div>
      <span className="text-[9px] font-mono text-[#9ab0bf]" dir="ltr">{order.request_id}</span>
    </div>
  );
}

function OrderSpecs({ order }: { order: AccountOrder }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[12px] font-bold text-[#1a2f3e]">{order.pallet_type} · {order.size} · درجة {order.quality}</span>
        <span className="text-[11px] text-[#7a9aab]">المواصفات</span>
      </div>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-1.5">
          <MapPin className="w-3 h-3 text-[#7a9aab]" />
          <span className="text-[11px] text-[#7a9aab]">{order.city}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Layers className="w-3 h-3 text-[#1a4a5e]" />
          <span className="text-[12px] font-bold text-[#1a4a5e]">{order.quantity.toLocaleString('ar-SA')} طبلية</span>
        </div>
      </div>
      {order.pallet_condition && order.pallet_condition !== 'new' && (
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-bold text-[#7a9aab]">
            {order.pallet_condition === 'used' ? 'مستعملة' : order.pallet_condition === 'repairable' ? 'قابلة للإصلاح' : order.pallet_condition}
          </span>
          <span className="text-[11px] text-[#7a9aab]">الحالة</span>
        </div>
      )}
    </div>
  );
}

interface ActiveOrderCardProps {
  order: AccountOrder;
  onViewDetail: (order: AccountOrder) => void;
}

export function ActiveOrderCard({ order, onViewDetail }: ActiveOrderCardProps) {
  const cfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending;
  const isUnmatched = order.status === 'unmatched';

  return (
    <button
      onClick={() => onViewDetail(order)}
      className="w-full text-right bg-white rounded-2xl overflow-hidden transition-transform active:scale-[0.98]"
      style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.05)', border: `1.5px solid ${cfg.border}` }}
      dir="rtl"
    >
      <OrderHeader order={order} />
      <div className="p-4 space-y-2">
        <OrderSpecs order={order} />

        {isUnmatched && (
          <div className="flex items-center gap-2.5 bg-[#E0F2FE] border border-[#BAE6FD] rounded-xl px-3 py-2.5 mt-1">
            <Radar className="w-4 h-4 text-[#0369A1] animate-pulse flex-shrink-0" />
            <div className="flex-1 min-w-0 text-right">
              <p className="text-[11px] font-bold text-[#0369A1] leading-tight">جارٍ تتبع المخزون تلقائيا</p>
              <p className="text-[9px] text-[#0284C7] mt-0.5 leading-tight">سيتم مطابقتك فور إضافة مورد لمخزون مطابق</p>
            </div>
          </div>
        )}

        {!isUnmatched && (
          <div className="flex items-center gap-2 justify-center py-2 rounded-xl bg-amber-50 border border-amber-200 mt-1">
            <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
            <span className="text-[11px] font-bold text-amber-700">جارٍ البحث عن مخزون مطابق</span>
          </div>
        )}

        <div className="flex items-center justify-between pt-1">
          <span className="text-[10px] text-[#1a4a5e] font-bold flex items-center gap-1">
            اضغط للتفاصيل <ArrowLeft className="w-3 h-3" />
          </span>
          <span className="text-[9px] text-[#b0c4d0]">
            {new Date(order.created_at).toLocaleDateString('ar-SA', { day: 'numeric', month: 'short' })}
          </span>
        </div>
      </div>
    </button>
  );
}

interface MatchedOrderCardProps {
  order: AccountOrder;
  onViewDetail: (order: AccountOrder) => void;
  onGoToDeal: (order: AccountOrder) => void;
}

export function MatchedOrderCard({ order, onViewDetail, onGoToDeal }: MatchedOrderCardProps) {
  const cfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.matched;
  const isPartial = order.status === 'partially_matched';

  const dealStatusText = () => {
    if (!order.deal_status) return null;
    switch (order.deal_status) {
      case 'matched':
      case 'pending_supplier':
        return { text: 'بانتظار تأكيد المورد', color: '#92400E', bg: '#FFFBEB', border: '#FDE68A', pulse: true };
      case 'supplier_confirmed':
      case 'awaiting_buyer':
        return { text: 'بانتظار تأكيدك', color: '#1E40AF', bg: '#EFF6FF', border: '#BFDBFE', pulse: true };
      case 'inventory_reserved':
        return { text: 'الصفقة محجوزة', color: '#059669', bg: '#ECFDF5', border: '#A7F3D0', pulse: false };
      case 'in_delivery':
        return { text: 'جاري التسليم', color: '#0369A1', bg: '#E0F2FE', border: '#BAE6FD', pulse: true };
      default:
        return null;
    }
  };

  const dealInfo = dealStatusText();

  return (
    <button
      onClick={() => onViewDetail(order)}
      className="w-full text-right bg-white rounded-2xl overflow-hidden transition-transform active:scale-[0.98]"
      style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.05)', border: `1.5px solid ${cfg.border}` }}
      dir="rtl"
    >
      <OrderHeader order={order} />
      <div className="p-4 space-y-2">
        <OrderSpecs order={order} />

        {isPartial && order.matched_quantity && (
          <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl px-3 py-2 mt-1">
            <span className="text-[11px] font-bold text-blue-700">
              {order.matched_quantity.toLocaleString('ar-SA')} من {order.quantity.toLocaleString('ar-SA')} طبلية
            </span>
            <span className="text-[10px] text-blue-600">الكمية المطابقة</span>
          </div>
        )}

        {dealInfo && (
          <div
            className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 mt-1"
            style={{ background: dealInfo.bg, border: `1px solid ${dealInfo.border}` }}
          >
            {dealInfo.pulse && <div className="w-1.5 h-1.5 rounded-full animate-pulse flex-shrink-0" style={{ background: dealInfo.color }} />}
            <div className="flex-1 min-w-0 text-right">
              <p className="text-[11px] font-bold leading-tight" style={{ color: dealInfo.color }}>{dealInfo.text}</p>
              {order.deal_ref && (
                <p className="text-[9px] mt-0.5 font-mono" style={{ color: `${dealInfo.color}99` }} dir="ltr">{order.deal_ref}</p>
              )}
            </div>
            <Handshake className="w-4 h-4 flex-shrink-0" style={{ color: dealInfo.color }} />
          </div>
        )}

        {order.deal_ref && (
          <button
            onClick={(e) => { e.stopPropagation(); onGoToDeal(order); }}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[12px] font-bold text-white active:scale-[0.97] transition-transform mt-1"
            style={{ background: 'linear-gradient(135deg, #1a4a5e 0%, #2c6f8a 100%)', boxShadow: '0 4px 12px rgba(26,74,94,0.3)' }}
          >
            <Handshake className="w-3.5 h-3.5" />
            <span>الانتقال إلى الصفقة</span>
          </button>
        )}

        <div className="flex items-center justify-between pt-1">
          <span className="text-[9px] text-[#b0c4d0]">
            {new Date(order.created_at).toLocaleDateString('ar-SA', { day: 'numeric', month: 'short' })}
          </span>
        </div>
      </div>
    </button>
  );
}

interface CompletedOrderCardProps {
  order: AccountOrder;
  onViewDetail: (order: AccountOrder) => void;
  onGoToWarehouse?: () => void;
}

export function CompletedOrderCard({ order, onViewDetail, onGoToWarehouse }: CompletedOrderCardProps) {
  const isFulfilled = order.status === 'fulfilled';
  const cfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.fulfilled;

  return (
    <button
      onClick={() => onViewDetail(order)}
      className="w-full text-right bg-white rounded-2xl overflow-hidden transition-transform active:scale-[0.98]"
      style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.04)', border: `1.5px solid ${cfg.border}` }}
      dir="rtl"
    >
      <OrderHeader order={order} />
      <div className="p-4 space-y-2">
        <OrderSpecs order={order} />

        {isFulfilled && (
          <div className="flex items-center gap-2.5 bg-[#ECFDF5] border border-[#A7F3D0] rounded-xl px-3 py-2.5 mt-1">
            <Package className="w-4 h-4 text-[#059669] flex-shrink-0" />
            <div className="flex-1 min-w-0 text-right">
              <p className="text-[11px] font-bold text-[#059669] leading-tight">تم نقل الطبليات إلى مشترياتي</p>
              <p className="text-[9px] text-[#10b981] mt-0.5 leading-tight">يمكنك الاطلاع عليها في المستودع السحابي</p>
            </div>
          </div>
        )}

        {isFulfilled && onGoToWarehouse && (
          <button
            onClick={(e) => { e.stopPropagation(); onGoToWarehouse(); }}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[12px] font-bold text-white active:scale-[0.97] transition-transform mt-1"
            style={{ background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', boxShadow: '0 4px 12px rgba(5,150,105,0.3)' }}
          >
            <Package className="w-3.5 h-3.5" />
            <span>عرض مشترياتي</span>
          </button>
        )}

        {order.status === 'cancelled' && (
          <div className="bg-red-50 border border-red-100 rounded-xl px-3 py-2 mt-1">
            <p className="text-[10px] text-red-600 font-bold">تم إلغاء هذا الطلب</p>
          </div>
        )}

        <div className="flex items-center justify-end pt-1">
          <span className="text-[9px] text-[#b0c4d0]">
            {new Date(order.created_at).toLocaleDateString('ar-SA', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
        </div>
      </div>
    </button>
  );
}
