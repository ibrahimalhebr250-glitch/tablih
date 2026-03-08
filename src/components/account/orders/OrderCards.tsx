import { useState, useEffect } from 'react';
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
  Play,
  MessageCircle,
  Timer,
  AlertTriangle,
} from 'lucide-react';
import type { AccountOrder } from '../../../hooks/useAccountOrders';

const ORDER_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  pending:           { label: 'قيد البحث',       color: '#B45309', bg: '#FFFBEB', border: '#FDE68A' },
  unmatched:         { label: 'يتتبع المخزون',   color: '#0369A1', bg: '#E0F2FE', border: '#BAE6FD' },
  partially_matched: { label: 'مطابقة جزئية',    color: '#0369A1', bg: '#EFF6FF', border: '#BFDBFE' },
  matched:           { label: 'تمت المطابقة',    color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
  fulfilled:         { label: 'مكتمل',           color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
  cancelled:         { label: 'ملغى',            color: '#dc2626', bg: '#FEF2F2', border: '#FECACA' },
};

const DEAL_STAGE: Record<string, { text: string; color: string; bg: string; border: string; pulse: boolean }> = {
  pending_supplier:      { text: 'بانتظار اعتماد المورد',   color: '#92400E', bg: '#FFFBEB', border: '#FDE68A', pulse: true },
  matched:               { text: 'بانتظار اعتماد المورد',   color: '#92400E', bg: '#FFFBEB', border: '#FDE68A', pulse: true },
  supplier_confirmed:    { text: 'بانتظار تأكيدك',          color: '#1E40AF', bg: '#EFF6FF', border: '#BFDBFE', pulse: true },
  awaiting_buyer:        { text: 'بانتظار تأكيدك',          color: '#1E40AF', bg: '#EFF6FF', border: '#BFDBFE', pulse: true },
  execution_in_progress: { text: 'جاري التنفيذ',            color: '#0369A1', bg: '#E0F2FE', border: '#BAE6FD', pulse: false },
  inventory_reserved:    { text: 'جاري التنفيذ',            color: '#0369A1', bg: '#E0F2FE', border: '#BAE6FD', pulse: false },
  in_delivery:           { text: 'جاري التسليم',            color: '#0369A1', bg: '#E0F2FE', border: '#BAE6FD', pulse: true },
  completed:             { text: 'اكتملت الصفقة',           color: '#059669', bg: '#ECFDF5', border: '#A7F3D0', pulse: false },
  cancelled:             { text: 'فشلت الصفقة',             color: '#dc2626', bg: '#FEF2F2', border: '#FECACA', pulse: false },
};

function buildWhatsAppLink(phone: string | null): string {
  if (!phone) return '#';
  const cleaned = phone.replace(/\D/g, '');
  const intl = cleaned.startsWith('0') ? '966' + cleaned.slice(1) : cleaned.startsWith('966') ? cleaned : '966' + cleaned;
  return `https://wa.me/${intl}`;
}

function MiniCountdown({ deadline, hours }: { deadline: string; hours: number }) {
  const [remaining, setRemaining] = useState('');
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const update = () => {
      const diff = new Date(deadline).getTime() - Date.now();
      if (diff <= 0) {
        setRemaining('انتهت المهلة');
        setIsExpired(true);
        return;
      }
      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      setRemaining(h > 0 ? `${h}س ${m}د` : `${m} دقيقة`);
      setIsExpired(false);
    };
    update();
    const t = setInterval(update, 30000);
    return () => clearInterval(t);
  }, [deadline]);

  return (
    <div
      className="flex items-center gap-1.5 px-2 py-1 rounded-lg"
      style={{ background: isExpired ? '#FEF2F2' : '#E0F2FE', border: `1px solid ${isExpired ? '#FECACA' : '#BAE6FD'}` }}
    >
      <Timer className="w-3 h-3" style={{ color: isExpired ? '#dc2626' : '#0369A1' }} />
      <span className="text-[10px] font-bold" style={{ color: isExpired ? '#dc2626' : '#0369A1' }}>
        {remaining}
      </span>
      <span className="text-[9px]" style={{ color: isExpired ? '#f87171' : '#0284C7' }}>/ {hours}س</span>
    </div>
  );
}

function OrderHeader({ order }: { order: AccountOrder }) {
  const cfg = ORDER_STATUS_CONFIG[order.status] ?? ORDER_STATUS_CONFIG.pending;
  const isPending = order.status === 'pending' || order.status === 'unmatched';
  const deal = order.deal;
  const dealCfg = deal ? DEAL_STAGE[deal.deal_status] : null;

  const isExecution = deal?.deal_status === 'execution_in_progress' || deal?.deal_status === 'in_delivery' || deal?.deal_status === 'inventory_reserved';
  const isCompleted = deal?.deal_status === 'completed';
  const isCancelled = deal?.deal_status === 'cancelled';

  const activeCfg = dealCfg ?? cfg;
  const showDealStage = !!dealCfg && !isCompleted && !isCancelled;

  return (
    <div
      className="flex items-center justify-between px-4 py-2"
      style={{
        background: activeCfg.bg,
        borderBottom: `1px solid ${activeCfg.border}`,
      }}
    >
      <div className="flex items-center gap-1.5">
        {isPending && !deal && <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: cfg.color }} />}
        {isCompleted && <CheckCircle2 className="w-3 h-3 text-[#059669]" />}
        {isCancelled && order.status === 'cancelled' && <XCircle className="w-3 h-3 text-red-500" />}
        {(order.status === 'matched' || order.status === 'partially_matched') && !isCancelled && !isCompleted && (
          isExecution ? <Play className="w-3 h-3" style={{ color: activeCfg.color }} /> : <Handshake className="w-3 h-3" style={{ color: activeCfg.color }} />
        )}
        {order.status === 'fulfilled' && <CheckCircle2 className="w-3 h-3 text-[#059669]" />}
        {order.status === 'cancelled' && <XCircle className="w-3 h-3 text-red-500" />}
        <span className="text-[10px] font-bold" style={{ color: activeCfg.color }}>
          {showDealStage ? dealCfg!.text : cfg.label}
        </span>
        {showDealStage && dealCfg!.pulse && (
          <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: dealCfg!.color }} />
        )}
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
  const cfg = ORDER_STATUS_CONFIG[order.status] ?? ORDER_STATUS_CONFIG.pending;
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
  const cfg = ORDER_STATUS_CONFIG[order.status] ?? ORDER_STATUS_CONFIG.matched;
  const isPartial = order.status === 'partially_matched';
  const deal = order.deal;

  const dealStage = deal ? DEAL_STAGE[deal.deal_status] : null;
  const isExecution = deal && (deal.deal_status === 'execution_in_progress' || deal.deal_status === 'in_delivery' || deal.deal_status === 'inventory_reserved');
  const isDealCancelled = deal?.deal_status === 'cancelled';
  const needsBuyerAction = deal && (deal.deal_status === 'supplier_confirmed' || deal.deal_status === 'awaiting_buyer');

  const borderColor = dealStage ? dealStage.border : cfg.border;

  return (
    <button
      onClick={() => onViewDetail(order)}
      className="w-full text-right bg-white rounded-2xl overflow-hidden transition-transform active:scale-[0.98]"
      style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.05)', border: `1.5px solid ${borderColor}` }}
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

        {deal && dealStage && !isDealCancelled && (
          <div
            className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 mt-1"
            style={{ background: dealStage.bg, border: `1px solid ${dealStage.border}` }}
          >
            {dealStage.pulse && <div className="w-1.5 h-1.5 rounded-full animate-pulse flex-shrink-0" style={{ background: dealStage.color }} />}
            {isExecution && <Play className="w-3.5 h-3.5 flex-shrink-0" style={{ color: dealStage.color }} />}
            {!isExecution && <Handshake className="w-3.5 h-3.5 flex-shrink-0" style={{ color: dealStage.color }} />}
            <div className="flex-1 min-w-0 text-right">
              <p className="text-[11px] font-bold leading-tight" style={{ color: dealStage.color }}>{dealStage.text}</p>
              {deal.deal_ref && (
                <p className="text-[9px] mt-0.5 font-mono" style={{ color: `${dealStage.color}99` }} dir="ltr">{deal.deal_ref}</p>
              )}
            </div>
            {isExecution && deal.execution_deadline && deal.execution_hours && (
              <MiniCountdown deadline={deal.execution_deadline} hours={deal.execution_hours} />
            )}
          </div>
        )}

        {isDealCancelled && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 mt-1">
            <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
            <div className="flex-1 min-w-0 text-right">
              <p className="text-[11px] font-bold text-red-700 leading-tight">فشلت الصفقة</p>
              {deal.cancel_reason && (
                <p className="text-[9px] text-red-500 mt-0.5">{deal.cancel_reason}</p>
              )}
            </div>
          </div>
        )}

        {needsBuyerAction && (
          <div className="flex items-center justify-center gap-2 py-2 rounded-xl mt-1 bg-[#EFF6FF] border border-[#BFDBFE]">
            <div className="w-1.5 h-1.5 rounded-full animate-pulse bg-[#1E40AF]" />
            <span className="text-[11px] font-bold text-[#1E40AF]">بحاجة لتأكيدك — افتح الصفقة</span>
          </div>
        )}

        {isExecution && deal.execution_deadline && deal.execution_hours && (
          <a
            href={buildWhatsAppLink(deal.supplier_phone)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-[12px] font-bold text-white active:scale-[0.97] transition-transform mt-1"
            style={{ background: 'linear-gradient(135deg, #25D366, #128C7E)', boxShadow: '0 3px 10px rgba(37,211,102,0.25)' }}
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>تواصل مع المورد عبر واتساب</span>
          </a>
        )}

        {deal?.deal_ref && !isExecution && !isDealCancelled && (
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
  const cfg = ORDER_STATUS_CONFIG[order.status] ?? ORDER_STATUS_CONFIG.fulfilled;

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
