import { useState } from 'react';
import {
  X,
  ClipboardList,
  MapPin,
  Package,
  Layers,
  Hash,
  Star,
  Handshake,
  Radar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Pencil,
  Trash2,
  Loader2,
  Check,
  ChevronDown,
  Shield,
} from 'lucide-react';
import type { AccountOrder } from '../../../hooks/useAccountOrders';

interface Props {
  order: AccountOrder;
  actionLoading: string | null;
  canEdit: boolean;
  canCancel: boolean;
  onClose: () => void;
  onUpdate: (orderId: string, data: { pallet_type?: string; size?: string; quality?: string; quantity?: number; city?: string }) => Promise<{ success: boolean; error?: string }>;
  onCancel: (orderId: string) => Promise<{ success: boolean; error?: string }>;
  onGoToDeal?: (order: AccountOrder) => void;
  onGoToWarehouse?: () => void;
}

const STATUS_DISPLAY: Record<string, { label: string; color: string; bg: string; desc: string }> = {
  pending:           { label: 'قيد البحث',       color: '#B45309', bg: '#FFFBEB', desc: 'يتم البحث عن مخزون مطابق لطلبك' },
  unmatched:         { label: 'يتتبع المخزون',   color: '#0369A1', bg: '#E0F2FE', desc: 'لم يتوفر مخزون حاليا — سيتم مطابقتك فور توفره' },
  partially_matched: { label: 'مطابقة جزئية',    color: '#0369A1', bg: '#EFF6FF', desc: 'تم العثور على جزء من الكمية المطلوبة' },
  matched:           { label: 'تمت المطابقة',    color: '#059669', bg: '#ECFDF5', desc: 'تم العثور على مخزون مطابق وتم إنشاء صفقة' },
  fulfilled:         { label: 'مكتمل',           color: '#059669', bg: '#ECFDF5', desc: 'تم إتمام الصفقة ونقل الطبليات إلى مشترياتك' },
  cancelled:         { label: 'ملغى',            color: '#dc2626', bg: '#FEF2F2', desc: 'تم إلغاء هذا الطلب' },
};

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[12px] font-bold text-[#1a2f3e]">{value}</span>
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] text-[#7a9aab]">{label}</span>
        {icon}
      </div>
    </div>
  );
}

export default function OrderDetailSheet({
  order, actionLoading, canEdit, canCancel,
  onClose, onUpdate, onCancel, onGoToDeal, onGoToWarehouse,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editType, setEditType] = useState(order.pallet_type);
  const [editSize, setEditSize] = useState(order.size);
  const [editQuality, setEditQuality] = useState(order.quality);
  const [editQuantity, setEditQuantity] = useState(order.quantity.toString());
  const [editCity, setEditCity] = useState(order.city);
  const [editSaved, setEditSaved] = useState(false);

  const isLoading = actionLoading === order.id;
  const statusCfg = STATUS_DISPLAY[order.status] ?? STATUS_DISPLAY.pending;
  const isFulfilled = order.status === 'fulfilled';
  const isMatched = order.status === 'matched' || order.status === 'partially_matched';

  const handleSave = async () => {
    const qty = Number(editQuantity);
    if (!editType || !editSize || !editQuality || !editCity || isNaN(qty) || qty <= 0) return;
    setError(null);
    const result = await onUpdate(order.id, {
      pallet_type: editType,
      size: editSize,
      quality: editQuality,
      quantity: qty,
      city: editCity,
    });
    if (result.success) {
      setEditSaved(true);
      setTimeout(() => { setEditSaved(false); setEditing(false); }, 800);
    } else {
      setError(result.error ?? 'حدث خطأ');
    }
  };

  const handleCancel = async () => {
    setError(null);
    const result = await onCancel(order.id);
    if (result.success) {
      onClose();
    } else {
      setError(result.error ?? 'حدث خطأ');
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full sm:max-w-lg max-h-[92vh] flex flex-col rounded-t-3xl sm:rounded-3xl overflow-hidden"
        style={{ background: '#f4f9fc' }}
        onClick={e => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #0f2535, #1a3d56)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}
        >
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center">
            <X className="w-4 h-4 text-white" />
          </button>
          <div className="flex items-center gap-2">
            <div className="text-right">
              <p className="text-[13px] font-bold text-white">تفاصيل الطلب</p>
              <p className="text-[10px] text-white/50" dir="ltr">{order.request_id}</p>
            </div>
            <ClipboardList className="w-5 h-5 text-white/70" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4" dir="rtl">
          <div
            className="flex items-center gap-2.5 rounded-xl px-3.5 py-3"
            style={{ background: statusCfg.bg, border: `1px solid ${statusCfg.color}20` }}
          >
            {(order.status === 'pending' || order.status === 'unmatched') && <Radar className="w-4 h-4 animate-pulse" style={{ color: statusCfg.color }} />}
            {isMatched && <Handshake className="w-4 h-4" style={{ color: statusCfg.color }} />}
            {isFulfilled && <CheckCircle2 className="w-4 h-4" style={{ color: statusCfg.color }} />}
            {order.status === 'cancelled' && <XCircle className="w-4 h-4" style={{ color: statusCfg.color }} />}
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-black" style={{ color: statusCfg.color }}>{statusCfg.label}</p>
              <p className="text-[10px] mt-0.5" style={{ color: `${statusCfg.color}99` }}>{statusCfg.desc}</p>
            </div>
          </div>

          {!editing ? (
            <div className="bg-white rounded-2xl border border-[#e2edf5] overflow-hidden">
              <div className="px-4 py-2.5 border-b border-[#f0f6fa] bg-[#f8fbfd]">
                <p className="text-[11px] font-bold text-[#4a7a94]">مواصفات الطلب</p>
              </div>
              <div className="p-4 space-y-2.5">
                <InfoRow icon={<Package className="w-3.5 h-3.5 text-[#7a9aab]" />} label="النوع" value={order.pallet_type} />
                <InfoRow icon={<Layers className="w-3.5 h-3.5 text-[#7a9aab]" />} label="المقاس" value={order.size} />
                <InfoRow icon={<Star className="w-3.5 h-3.5 text-[#7a9aab]" />} label="الجودة" value={`درجة ${order.quality}`} />
                <InfoRow icon={<Hash className="w-3.5 h-3.5 text-[#7a9aab]" />} label="الكمية" value={`${order.quantity.toLocaleString('ar-SA')} طبلية`} />
                <InfoRow icon={<MapPin className="w-3.5 h-3.5 text-[#7a9aab]" />} label="المدينة" value={order.city} />
                {order.pallet_condition && order.pallet_condition !== 'new' && (
                  <InfoRow
                    icon={<Package className="w-3.5 h-3.5 text-[#7a9aab]" />}
                    label="الحالة"
                    value={order.pallet_condition === 'used' ? 'مستعملة' : 'قابلة للإصلاح'}
                  />
                )}
              </div>
            </div>
          ) : (
            <EditForm
              type={editType} size={editSize} quality={editQuality}
              quantity={editQuantity} city={editCity}
              onTypeChange={setEditType} onSizeChange={setEditSize}
              onQualityChange={setEditQuality} onQuantityChange={setEditQuantity}
              onCityChange={setEditCity}
            />
          )}

          {order.accept_close_quality || order.accept_close_city || order.accept_partial_delivery ? (
            <div className="bg-white rounded-2xl border border-[#e2edf5] overflow-hidden">
              <div className="px-4 py-2.5 border-b border-[#f0f6fa] bg-[#f8fbfd]">
                <p className="text-[11px] font-bold text-[#4a7a94]">خيارات المرونة</p>
              </div>
              <div className="p-4 space-y-2">
                {order.accept_close_quality && (
                  <div className="flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5 text-[#059669]" />
                    <span className="text-[11px] text-[#1a2f3e]">قبول جودة قريبة</span>
                  </div>
                )}
                {order.accept_close_city && (
                  <div className="flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5 text-[#059669]" />
                    <span className="text-[11px] text-[#1a2f3e]">قبول مدينة قريبة</span>
                  </div>
                )}
                {order.accept_partial_delivery && (
                  <div className="flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5 text-[#059669]" />
                    <span className="text-[11px] text-[#1a2f3e]">قبول توريد جزئي</span>
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {isMatched && order.matched_quantity && (
            <div className="bg-white rounded-2xl border border-[#e2edf5] overflow-hidden">
              <div className="px-4 py-2.5 border-b border-[#f0f6fa] bg-[#f8fbfd]">
                <p className="text-[11px] font-bold text-[#4a7a94]">نتيجة المطابقة</p>
              </div>
              <div className="p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-bold text-[#059669]">{order.matched_quantity.toLocaleString('ar-SA')} طبلية</span>
                  <span className="text-[11px] text-[#7a9aab]">الكمية المطابقة</span>
                </div>
                {order.matched_price && (
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-bold text-[#1a2f3e]">{order.matched_price.toLocaleString('ar-SA')} ر.س / طبلية</span>
                    <span className="text-[11px] text-[#7a9aab]">السعر</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <p className="text-[11px] font-bold text-red-700">{error}</p>
            </div>
          )}

          {isMatched && order.deal_ref && onGoToDeal && (
            <button
              onClick={() => onGoToDeal(order)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-bold text-white active:scale-[0.97] transition-transform"
              style={{ background: 'linear-gradient(135deg, #1a4a5e 0%, #2c6f8a 100%)', boxShadow: '0 4px 12px rgba(26,74,94,0.3)' }}
            >
              <Handshake className="w-4 h-4" />
              <span>الانتقال إلى الصفقة</span>
            </button>
          )}

          {isFulfilled && onGoToWarehouse && (
            <button
              onClick={onGoToWarehouse}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-bold text-white active:scale-[0.97] transition-transform"
              style={{ background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', boxShadow: '0 4px 12px rgba(5,150,105,0.3)' }}
            >
              <Package className="w-4 h-4" />
              <span>عرض مشترياتي</span>
            </button>
          )}

          {canEdit && !editing && (
            <button
              onClick={() => setEditing(true)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-bold text-[#1a4a5e] border-2 border-[#e2edf5] bg-white active:scale-[0.97] transition-transform"
            >
              <Pencil className="w-4 h-4" />
              <span>تعديل الطلب</span>
            </button>
          )}

          {editing && (
            <div className="flex gap-2">
              <button
                onClick={() => setEditing(false)}
                className="flex-1 py-3 rounded-xl bg-gray-100 text-[13px] font-bold text-[#4a6a7e] active:scale-[0.97] transition-transform"
              >
                إلغاء
              </button>
              <button
                disabled={isLoading}
                onClick={handleSave}
                className="flex-1 py-3 rounded-xl text-[13px] font-bold text-white active:scale-[0.97] transition-transform disabled:opacity-50"
                style={{
                  background: editSaved ? 'linear-gradient(135deg, #16a34a, #15803d)' : 'linear-gradient(135deg, #0369A1, #0284C7)',
                  boxShadow: editSaved ? '0 4px 14px rgba(22,163,74,0.3)' : '0 4px 14px rgba(3,105,161,0.25)',
                }}
              >
                {editSaved ? (
                  <span className="flex items-center justify-center gap-1"><Check className="w-4 h-4" /> تم الحفظ</span>
                ) : isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                ) : (
                  <span className="flex items-center justify-center gap-1"><Pencil className="w-4 h-4" /> حفظ التعديلات</span>
                )}
              </button>
            </div>
          )}

          {canCancel && !confirmingDelete && !editing && (
            <button
              onClick={() => setConfirmingDelete(true)}
              className="w-full py-2.5 rounded-xl border border-red-200 bg-red-50 text-[11px] font-bold text-red-600 active:scale-[0.97] transition-transform"
            >
              إلغاء الطلب
            </button>
          )}

          {confirmingDelete && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <p className="text-[12px] font-black text-red-800">تأكيد إلغاء الطلب</p>
              </div>
              <p className="text-[11px] text-red-700 leading-relaxed">
                سيتم حذف هذا الطلب نهائيا. هل أنت متأكد؟
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmingDelete(false)}
                  className="flex-1 py-2.5 rounded-xl bg-white border border-gray-200 text-[12px] font-bold text-[#4a6a7e]"
                >
                  تراجع
                </button>
                <button
                  disabled={isLoading}
                  onClick={handleCancel}
                  className="flex-1 py-2.5 rounded-xl text-[12px] font-bold text-white flex items-center justify-center gap-1 disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)' }}
                >
                  {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  <span>{isLoading ? 'جارٍ الإلغاء...' : 'تأكيد الإلغاء'}</span>
                </button>
              </div>
            </div>
          )}

          <div className="text-center py-2">
            <span className="text-[9px] text-[#b0c4d0]">
              تاريخ الإنشاء: {new Date(order.created_at).toLocaleString('ar-SA', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function EditForm({
  type, size, quality, quantity, city,
  onTypeChange, onSizeChange, onQualityChange, onQuantityChange, onCityChange,
}: {
  type: string; size: string; quality: string; quantity: string; city: string;
  onTypeChange: (v: string) => void; onSizeChange: (v: string) => void;
  onQualityChange: (v: string) => void; onQuantityChange: (v: string) => void;
  onCityChange: (v: string) => void;
}) {
  const [cityOpen, setCityOpen] = useState(false);

  return (
    <div className="bg-white rounded-2xl border border-[#e2edf5] overflow-hidden">
      <div className="px-4 py-2.5 border-b border-[#f0f6fa] bg-[#f8fbfd] flex items-center gap-2">
        <Pencil className="w-3.5 h-3.5 text-[#0369A1]" />
        <p className="text-[11px] font-bold text-[#0369A1]">تعديل المواصفات</p>
      </div>
      <div className="p-4 space-y-4">
        <div>
          <p className="text-[11px] font-bold text-[#4a7a94] mb-2">النوع</p>
          <input
            type="text"
            value={type}
            onChange={e => onTypeChange(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border-2 border-gray-200 bg-gray-50 focus:border-[#0369A1] focus:bg-white text-[13px] font-bold text-[#1a4a5e] text-right outline-none transition-colors"
          />
        </div>
        <div>
          <p className="text-[11px] font-bold text-[#4a7a94] mb-2">المقاس</p>
          <input
            type="text"
            value={size}
            onChange={e => onSizeChange(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border-2 border-gray-200 bg-gray-50 focus:border-[#0369A1] focus:bg-white text-[13px] font-bold text-[#1a4a5e] text-right outline-none transition-colors"
          />
        </div>
        <div>
          <p className="text-[11px] font-bold text-[#4a7a94] mb-2">الجودة</p>
          <input
            type="text"
            value={quality}
            onChange={e => onQualityChange(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border-2 border-gray-200 bg-gray-50 focus:border-[#0369A1] focus:bg-white text-[13px] font-bold text-[#1a4a5e] text-right outline-none transition-colors"
          />
        </div>
        <div>
          <p className="text-[11px] font-bold text-[#4a7a94] mb-2">الكمية</p>
          <div className="relative">
            <input
              type="number"
              value={quantity}
              onChange={e => onQuantityChange(e.target.value)}
              min={1}
              className="w-full pr-4 pl-16 py-2.5 rounded-xl border-2 border-gray-200 bg-gray-50 focus:border-[#0369A1] focus:bg-white text-[16px] font-bold text-[#1a4a5e] text-right outline-none transition-colors"
            />
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[11px] font-bold text-[#7a9aab]">طبلية</span>
          </div>
        </div>
        <div>
          <p className="text-[11px] font-bold text-[#4a7a94] mb-2">المدينة</p>
          <button
            onClick={() => setCityOpen(!cityOpen)}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl border-2 border-gray-200 bg-gray-50 text-right"
          >
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${cityOpen ? 'rotate-180' : ''}`} />
            <span className="text-[13px] font-bold text-[#1a4a5e]">{city || 'اختر المدينة'}</span>
          </button>
          {cityOpen && (
            <div className="mt-1 border-2 border-gray-200 rounded-xl overflow-hidden max-h-36 overflow-y-auto bg-white">
              {['الرياض', 'جدة', 'مكة المكرمة', 'المدينة المنورة', 'الدمام', 'الخبر', 'تبوك', 'أبها', 'القصيم', 'حائل', 'جازان', 'نجران', 'الطائف', 'ينبع', 'الجبيل'].map(c => (
                <button
                  key={c}
                  onClick={() => { onCityChange(c); setCityOpen(false); }}
                  className="w-full text-right px-4 py-2 text-[12px] font-bold transition-colors hover:bg-gray-50"
                  style={{ color: city === c ? '#0369A1' : '#374151', background: city === c ? '#E0F2FE' : 'white' }}
                >
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
