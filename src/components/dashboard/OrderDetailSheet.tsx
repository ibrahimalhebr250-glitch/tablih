import { X, MapPin, Package2, Layers, Hash, Clock, CheckCircle2, AlertCircle, BarChart3 } from 'lucide-react';
import type { DashboardOrder } from '../../hooks/useDashboard';

interface Props {
  order: DashboardOrder;
  onClose: () => void;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dotColor: string }> = {
  pending:   { label: 'قيد الانتظار', color: '#B45309', bg: '#FFFBEB', dotColor: '#F59E0B' },
  matched:   { label: 'تمت المطابقة', color: '#166534', bg: '#F0FDF4', dotColor: '#22C55E' },
  unmatched: { label: 'لا يوجد تطابق', color: '#B91C1C', bg: '#FEF2F2', dotColor: '#EF4444' },
  executed:  { label: 'منفّذ', color: '#374151', bg: '#F3F4F6', dotColor: '#9CA3AF' },
};

const QUALITY_LABELS: Record<string, string> = {
  A: 'ممتازة', B: 'جيدة', C: 'استخدام خفيف', Scrap: 'إعادة تدوير',
};

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
      <span className={`text-[12px] text-[#1a4a5e] font-medium ${mono ? 'font-mono' : ''}`}>{value}</span>
      <span className="text-[11px] text-[#7a9aab]">{label}</span>
    </div>
  );
}

export default function OrderDetailSheet({ order, onClose }: Props) {
  const cfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending;

  const formatDate = (iso: string) =>
    new Intl.DateTimeFormat('ar-SA', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end lg:items-center justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div
        className="relative w-full lg:w-[540px] bg-white rounded-t-3xl lg:rounded-3xl shadow-2xl overflow-hidden"
        style={{ maxHeight: '90vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ background: '#1a4a5e' }}
        >
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
            style={{ background: cfg.bg }}
          >
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.dotColor }} />
            <span className="text-[11px] font-bold" style={{ color: cfg.color }}>{cfg.label}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right">
              <p className="text-[13px] font-bold text-white">تفاصيل الطلب</p>
              <p className="text-[10px] text-white/60 font-mono">{order.request_id}</p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto px-5 py-4 space-y-4" style={{ maxHeight: 'calc(90vh - 70px)' }}>
          <div className="bg-[#F5F9FC] rounded-2xl p-4">
            <p className="text-[12px] font-bold text-[#1a4a5e] text-right mb-3">مواصفات الطلب</p>
            <Row label="نوع الطبلية" value={order.pallet_type} />
            <Row label="المقاس" value={order.size} />
            <Row label="درجة الجودة" value={`${QUALITY_LABELS[order.quality] ?? order.quality} (${order.quality})`} />
            <Row label="المدينة" value={order.city} />
            <Row label="الكمية المطلوبة" value={`${order.quantity.toLocaleString('ar-SA')} طبلية`} />
          </div>

          {order.status === 'matched' && order.matched_quantity && (
            <div
              className="rounded-2xl p-4 border"
              style={{ background: '#F0FDF4', borderColor: '#BBF7D0' }}
            >
              <div className="flex items-center justify-end gap-2 mb-3">
                <p className="text-[12px] font-bold text-[#166534]">نتيجة المطابقة</p>
                <CheckCircle2 className="w-4 h-4 text-[#22C55E]" />
              </div>
              <Row label="الكمية المطابقة" value={`${order.matched_quantity.toLocaleString('ar-SA')} طبلية`} />
              {order.matched_price && (
                <Row label="السعر لكل طبلية" value={`${order.matched_price.toLocaleString('ar-SA')} ريال`} />
              )}
              {order.matched_price && order.matched_quantity && (
                <Row label="الإجمالي" value={`${(order.matched_price * order.matched_quantity).toLocaleString('ar-SA')} ريال`} />
              )}
              {order.delivery_days && (
                <Row label="أيام التوصيل" value={`${order.delivery_days} أيام عمل`} />
              )}
            </div>
          )}

          {order.status === 'unmatched' && (
            <div
              className="rounded-2xl p-4 border flex items-start gap-3"
              style={{ background: '#FEF2F2', borderColor: '#FECACA' }}
            >
              <div className="flex-1 text-right">
                <p className="text-[12px] font-bold text-[#B91C1C] mb-1">لا يوجد مخزون متاح</p>
                <p className="text-[11px] text-[#EF4444]">
                  لم يتم العثور على مخزون يطابق مواصفاتك حالياً. ستتلقى إشعاراً عند توفر مخزون مناسب.
                </p>
              </div>
              <AlertCircle className="w-5 h-5 text-[#EF4444] flex-shrink-0 mt-0.5" />
            </div>
          )}

          <div className="bg-[#F5F9FC] rounded-2xl p-4">
            <p className="text-[12px] font-bold text-[#1a4a5e] text-right mb-3">بيانات إضافية</p>
            <Row label="رقم الطلب" value={order.request_id} mono />
            <Row label="تاريخ الإنشاء" value={formatDate(order.created_at)} />
          </div>

          <div className="flex items-start gap-3 bg-[#EBF5FF] rounded-2xl p-3 border border-[#BFDBFE]">
            <div className="flex-1 text-right">
              <p className="text-[11px] font-bold text-[#1D4ED8] mb-0.5">مرونة البحث</p>
              <div className="flex flex-wrap gap-2 justify-end mt-2">
                {(order as { accept_close_quality?: boolean }).accept_close_quality && (
                  <span className="text-[10px] bg-white px-2 py-1 rounded-full text-[#1D4ED8] border border-[#BFDBFE]">
                    قبول جودة قريبة
                  </span>
                )}
                {(order as { accept_close_city?: boolean }).accept_close_city && (
                  <span className="text-[10px] bg-white px-2 py-1 rounded-full text-[#1D4ED8] border border-[#BFDBFE]">
                    قبول مدينة قريبة
                  </span>
                )}
                {(order as { accept_partial_delivery?: boolean }).accept_partial_delivery && (
                  <span className="text-[10px] bg-white px-2 py-1 rounded-full text-[#1D4ED8] border border-[#BFDBFE]">
                    قبول تسليم جزئي
                  </span>
                )}
              </div>
            </div>
            <BarChart3 className="w-4 h-4 text-[#2196F3] flex-shrink-0 mt-0.5" />
          </div>

          <div className="flex items-center justify-end gap-2 pb-2">
            <div
              className="flex items-center gap-1"
              style={{ color: '#7a9aab' }}
            >
              <Clock className="w-3 h-3" />
              <span className="text-[10px]">{formatDate(order.created_at)}</span>
            </div>
            <Package2 className="w-3.5 h-3.5 text-[#7a9aab]" />
            <MapPin className="w-3.5 h-3.5 text-[#7a9aab]" />
            <Layers className="w-3.5 h-3.5 text-[#7a9aab]" />
            <Hash className="w-3.5 h-3.5 text-[#7a9aab]" />
          </div>
        </div>
      </div>
    </div>
  );
}
