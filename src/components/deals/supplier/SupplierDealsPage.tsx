import { useState } from 'react';
import { ArrowRight, Handshake, RefreshCw, Bell, Package, CheckCircle, MapPin, Layers, Hash, Banknote, CheckSquare, Square, Receipt, MessageCircle, Truck, XCircle, AlertTriangle, Star } from 'lucide-react';
import { useSupplierDeals } from '../../../hooks/useSupplierDeals';
import { DEAL_STATUS_CONFIG } from '../../../types/deal';
import type { Deal } from '../../../types/deal';
import { ActionToast } from '../../shared/ActionToast';
import type { ToastConfig } from '../../shared/ActionToast';
import RatingDialog from '../shared/RatingDialog';

type Tab = 'new' | 'reserved' | 'delivery' | 'ended';

interface Props {
  phone: string;
  onClose: () => void;
}

function buildWhatsAppLink(phone: string, senderRole: 'supplier' | 'buyer', deal: Deal): string {
  const cleanPhone = phone.replace(/^0/, '966').replace('+', '');
  const otherRole = senderRole === 'supplier' ? 'المشتري' : 'المورد';
  const myRole = senderRole === 'supplier' ? 'المورد' : 'المشتري';
  const message = [
    `السلام عليكم`,
    ``,
    `تواصل معك عبر *منصة العاديات* بخصوص الصفقة رقم *${deal.deal_ref}*`,
    ``,
    `--- تفاصيل الصفقة ---`,
    `النوع: ${deal.pallet_type} · ${deal.size} · درجة ${deal.quality}`,
    `الكمية: ${deal.quantity} طبلية`,
    `المدينة: ${deal.city}`,
    `السعر: ${deal.final_price} ر.س / طبلية`,
    ``,
    `انا ${myRole} في هذه الصفقة وأنت ${otherRole}`,
    ``,
    `شكرا لتعاملك مع منصة العاديات`,
  ].join('\n');
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

const TABS: { id: Tab; label: string; icon: typeof Bell }[] = [
  { id: 'new',      label: 'طلبات جديدة',      icon: Bell },
  { id: 'reserved', label: 'تأكيد المشتري',    icon: Package },
  { id: 'delivery', label: 'جاري التسليم',    icon: Truck },
  { id: 'ended',    label: 'منتهية',           icon: CheckCircle },
];

function DealInfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
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

function ConfirmDialog({ deal, onConfirm, onCancel, loading, error }: {
  deal: Deal; onConfirm: () => void; onCancel: () => void; loading: boolean; error: string | null;
}) {
  const [accepted, setAccepted] = useState(false);
  const feePerPallet = deal.platform_fee_per_pallet ?? 1;
  const totalFee = deal.platform_fee ?? (feePerPallet * deal.quantity);
  const totalPrice = deal.final_price * deal.quantity;
  const grandTotal = totalPrice + totalFee;

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center" onClick={onCancel}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full sm:max-w-md max-h-[95vh] flex flex-col rounded-t-3xl sm:rounded-3xl overflow-hidden"
        style={{ background: '#f4f9fc' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="text-center">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-[#FFF7ED] flex items-center justify-center mb-2">
              <Receipt className="w-6 h-6 text-[#F59E0B]" />
            </div>
            <h3 className="text-[15px] font-black text-[#1a2f3e] mb-0.5">تأكيد الصفقة</h3>
            <p className="text-[11px] text-[#7a9aab]">{deal.deal_ref}</p>
          </div>

          <div className="bg-white rounded-2xl border border-[#e2edf5] overflow-hidden" dir="rtl">
            <div className="px-4 py-2.5 border-b border-[#f0f6fa] bg-[#f8fbfd]">
              <p className="text-[11px] font-bold text-[#4a7a94]">تفاصيل الصفقة</p>
            </div>
            <div className="p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-[#7a9aab]">النوع</span>
                <span className="text-[11px] font-bold text-[#1a2f3e]">{deal.pallet_type} · {deal.size} · درجة {deal.quality}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-[#7a9aab]">الكمية</span>
                <span className="text-[11px] font-bold text-[#1a2f3e]">{deal.quantity.toLocaleString('ar-SA')} طبلية</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-[#7a9aab]">سعر الوحدة</span>
                <span className="text-[11px] font-bold text-[#1a2f3e]">{deal.final_price.toLocaleString('ar-SA')} ر.س</span>
              </div>
              <div className="border-t border-[#f0f6fa] pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-[#7a9aab]">إجمالي البضاعة</span>
                  <span className="text-[11px] font-bold text-[#1a2f3e]">{totalPrice.toLocaleString('ar-SA')} ر.س</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-[#7a9aab]">رسوم المنصة ({feePerPallet} ر.س x {deal.quantity})</span>
                <span className="text-[11px] font-bold text-[#F59E0B]">{totalFee.toLocaleString('ar-SA')} ر.س</span>
              </div>
              <div className="border-t-2 border-[#e2edf5] pt-2.5 mt-1">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-black text-[#4a7a94]">المبلغ الإجمالي</span>
                  <span className="text-[14px] font-black text-[#1a2f3e]">{grandTotal.toLocaleString('ar-SA')} ر.س</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-xl p-2.5 text-right text-[10px] leading-relaxed text-[#92400E]">
            سيتم إضافة رسوم المنصة ({totalFee.toLocaleString('ar-SA')} ر.س) إلى فاتورة البيع الخاصة بكم، وتتعهدون بتحصيلها من المشتري وتسليمها للمنصة.
          </div>

          <button
            onClick={() => setAccepted(!accepted)}
            className="w-full flex items-center gap-3 p-3 rounded-xl transition-colors"
            style={{ background: accepted ? '#F0FDF4' : '#f8fbfd', border: `1.5px solid ${accepted ? '#86EFAC' : '#e2edf5'}` }}
            dir="rtl"
          >
            {accepted
              ? <CheckSquare className="w-5 h-5 text-[#16a34a] flex-shrink-0" />
              : <Square className="w-5 h-5 text-[#b0c8d5] flex-shrink-0" />
            }
            <span className="text-[12px] font-bold text-right" style={{ color: accepted ? '#166534' : '#4a6a7e' }}>
              أتعهد بتحصيل رسوم المنصة من المشتري وتسليمها للمنصة
            </span>
          </button>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-right text-[11px] font-bold text-red-600">
              {error}
            </div>
          )}
        </div>

        <div className="flex-shrink-0 p-4 pt-2 border-t border-[#e8f0f5] bg-[#f4f9fc]">
          {!accepted ? (
            <button onClick={onCancel} className="w-full py-3.5 rounded-2xl bg-white border border-[#e2edf5] text-[13px] font-bold text-[#4a6a7e] active:scale-[0.97] transition-transform">
              إلغاء
            </button>
          ) : (
            <div className="flex gap-3">
              <button onClick={onCancel} className="w-[90px] flex-shrink-0 py-3.5 rounded-2xl bg-white border border-[#e2edf5] text-[13px] font-bold text-[#4a6a7e] active:scale-[0.97] transition-transform">
                إلغاء
              </button>
              <button
                disabled={loading}
                onClick={onConfirm}
                className="flex-1 py-3.5 rounded-2xl text-[13px] font-bold text-white active:scale-[0.97] transition-transform disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)', boxShadow: '0 4px 16px rgba(22,163,74,0.3)' }}
              >
                {loading ? 'جارٍ التأكيد...' : 'موافق وأتعهد'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FailDeliveryDialog({ deal, onConfirm, onCancel, loading }: {
  deal: Deal; onConfirm: () => void; onCancel: () => void; loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center" onClick={onCancel}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl overflow-hidden p-5 space-y-4"
        style={{ background: '#fff' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="text-center">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-red-50 flex items-center justify-center mb-2">
            <AlertTriangle className="w-6 h-6 text-red-500" />
          </div>
          <h3 className="text-[15px] font-black text-[#1a2f3e] mb-1">تأكيد فشل التسليم</h3>
          <p className="text-[12px] text-[#7a9aab] leading-relaxed">
            سيتم إلغاء الصفقة وإعادة المخزون لحسابك كما كان. هل أنت متأكد؟
          </p>
        </div>
        <div className="bg-[#FEF2F2] border border-red-200 rounded-xl p-3 text-right text-[11px] text-red-700 leading-relaxed">
          رقم الصفقة: {deal.deal_ref} — {deal.quantity} طبلية × {deal.pallet_type}
        </div>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-3 rounded-xl bg-gray-100 text-[13px] font-bold text-[#4a6a7e] active:scale-[0.97] transition-transform">
            تراجع
          </button>
          <button
            disabled={loading}
            onClick={onConfirm}
            className="flex-1 py-3 rounded-xl text-[13px] font-bold text-white active:scale-[0.97] transition-transform disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)' }}
          >
            {loading ? 'جارٍ الإلغاء...' : 'فشل التسليم'}
          </button>
        </div>
      </div>
    </div>
  );
}

function NewRequestCard({ deal, onConfirm }: { deal: Deal; onConfirm: (d: Deal) => void }) {
  const feePerPallet = deal.platform_fee_per_pallet ?? 1;
  const totalFee = deal.platform_fee ?? (feePerPallet * deal.quantity);
  const totalPrice = deal.final_price * deal.quantity;
  const grandTotal = totalPrice + totalFee;

  return (
    <div className="bg-white rounded-2xl border border-[#e2edf5] shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#f0f6fa]">
        <span className="text-[10px] font-mono text-[#7a9aab]">{deal.deal_ref}</span>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: DEAL_STATUS_CONFIG[deal.status]?.bg ?? '#FFFBEB', color: DEAL_STATUS_CONFIG[deal.status]?.color ?? '#B45309' }}>
          {deal.status === 'pending_supplier' ? 'طلب جديد من السوق' : DEAL_STATUS_CONFIG[deal.status]?.label ?? deal.status}
        </span>
      </div>
      <div className="p-4 space-y-2.5">
        <DealInfoRow icon={<MapPin className="w-3.5 h-3.5 text-[#7a9aab]" />} label="المدينة" value={deal.city} />
        <DealInfoRow icon={<Layers className="w-3.5 h-3.5 text-[#7a9aab]" />} label="المقاس" value={deal.size} />
        <DealInfoRow icon={<Package className="w-3.5 h-3.5 text-[#7a9aab]" />} label="الحمولة" value={`${deal.pallet_type} · درجة ${deal.quality}`} />
        <DealInfoRow icon={<Hash className="w-3.5 h-3.5 text-[#7a9aab]" />} label="الكمية" value={`${deal.quantity.toLocaleString('ar-SA')} طبلية`} />
        <DealInfoRow icon={<Banknote className="w-3.5 h-3.5 text-[#7a9aab]" />} label="سعر الوحدة" value={`${deal.final_price.toLocaleString('ar-SA')} ر.س`} />
        <DealInfoRow icon={<Banknote className="w-3.5 h-3.5 text-[#F59E0B]" />} label="رسوم المنصة" value={`${totalFee.toLocaleString('ar-SA')} ر.س`} />
        <div className="border-t border-[#e2edf5] pt-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[14px] font-black text-[#1a2f3e]">{grandTotal.toLocaleString('ar-SA')} ر.س</span>
            <span className="text-[11px] font-bold text-[#4a7a94]">المبلغ الإجمالي</span>
          </div>
        </div>
      </div>
      <div className="px-4 pb-4">
        <button
          onClick={() => onConfirm(deal)}
          className="w-full py-3 rounded-xl text-[13px] font-bold text-white active:scale-[0.97] transition-transform"
          style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)', boxShadow: '0 4px 16px rgba(22,163,74,0.25)' }}
        >
          تأكيد الصفقة
        </button>
      </div>
    </div>
  );
}

function ReservedDealCard({ deal, onStartDelivery, loading }: {
  deal: Deal; onStartDelivery: () => void; loading: boolean;
}) {
  const isStalled = deal.reserved_at && new Date(deal.reserved_at).getTime() < Date.now() - 3 * 24 * 60 * 60 * 1000;

  return (
    <div className="bg-white rounded-2xl border-2 border-[#2563eb]/20 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b" style={{ background: '#EFF6FF', borderColor: '#DBEAFE' }}>
        <span className="text-[10px] font-mono text-[#6B7280]">{deal.deal_ref}</span>
        <div className="flex items-center gap-1.5">
          {isStalled && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-50 text-red-500">متأخر</span>}
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#EFF6FF', color: '#1E40AF' }}>
            بانتظار تأكيد المشتري
          </span>
        </div>
      </div>

      <div className="mx-4 mt-3.5 mb-0 flex items-center gap-2.5 bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl px-3 py-2.5">
        <div className="w-2 h-2 rounded-full bg-[#2563eb] animate-pulse flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-black text-[#1E40AF] leading-tight">الطلب وصل للمشتري</p>
          <p className="text-[10px] text-[#3B82F6] mt-0.5 leading-tight">في انتظار مراجعته وتأكيد الفاتورة</p>
        </div>
        <div className="w-7 h-7 rounded-lg bg-[#DBEAFE] flex items-center justify-center flex-shrink-0">
          <Bell className="w-3.5 h-3.5 text-[#2563eb]" />
        </div>
      </div>
      <div className="p-4 space-y-2.5">
        <DealInfoRow icon={<MapPin className="w-3.5 h-3.5 text-[#7a9aab]" />} label="المدينة" value={deal.city} />
        <DealInfoRow icon={<Package className="w-3.5 h-3.5 text-[#7a9aab]" />} label="النوع" value={`${deal.pallet_type} · ${deal.size} · درجة ${deal.quality}`} />
        <DealInfoRow icon={<Hash className="w-3.5 h-3.5 text-[#7a9aab]" />} label="الكمية" value={`${deal.quantity.toLocaleString('ar-SA')} طبلية`} />
        <DealInfoRow icon={<Banknote className="w-3.5 h-3.5 text-[#7a9aab]" />} label="سعر الوحدة" value={`${deal.final_price.toLocaleString('ar-SA')} ر.س`} />
        <div className="border-t border-[#e2edf5] pt-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[14px] font-black text-[#1a2f3e]">{((deal.final_price * deal.quantity) + (deal.platform_fee ?? deal.quantity)).toLocaleString('ar-SA')} ر.س</span>
            <span className="text-[11px] font-bold text-[#4a7a94]">المبلغ الإجمالي</span>
          </div>
        </div>

        <div className="border-t border-[#f0f6fa] pt-3">
          <a
            href={buildWhatsAppLink(deal.buyer_phone, 'supplier', deal)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2.5 w-full py-3 rounded-xl text-[13px] font-bold text-white active:scale-[0.97] transition-transform"
            style={{ background: 'linear-gradient(135deg, #25D366, #128C7E)', boxShadow: '0 4px 14px rgba(37,211,102,0.3)' }}
          >
            <MessageCircle className="w-4 h-4" />
            <span>تواصل مع المشتري عبر واتساب</span>
          </a>
        </div>
      </div>
      <div className="px-4 pb-4">
        <button
          disabled={loading}
          onClick={onStartDelivery}
          className="w-full py-3 rounded-xl text-[13px] font-bold text-white flex items-center justify-center gap-2 active:scale-[0.97] transition-transform disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #0369A1, #0284C7)', boxShadow: '0 4px 14px rgba(3,105,161,0.25)' }}
        >
          <Truck className="w-4 h-4" />
          {loading ? 'جارٍ التحديث...' : 'بدء التسليم'}
        </button>
      </div>
    </div>
  );
}

function InDeliveryCard({ deal, onConfirmDelivery, onFailDelivery, loading }: {
  deal: Deal;
  onConfirmDelivery: () => void;
  onFailDelivery: () => void;
  loading: boolean;
}) {
  return (
    <div className="bg-white rounded-2xl border-2 border-[#0369A1]/20 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5" style={{ background: '#E0F2FE', borderBottom: '1px solid #BAE6FD' }}>
        <span className="text-[10px] font-mono text-[#0369A1]">{deal.deal_ref}</span>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-[#0369A1] animate-pulse" />
          <span className="text-[10px] font-bold text-[#0369A1]">جاري التسليم</span>
        </div>
      </div>

      <div className="mx-4 mt-3.5 mb-0 flex items-center gap-2.5 bg-[#E0F2FE] border border-[#BAE6FD] rounded-xl px-3 py-2.5">
        <div className="w-2 h-2 rounded-full bg-[#0369A1] animate-pulse flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-black text-[#0369A1] leading-tight">المشتري أكّد الاستلام</p>
          <p className="text-[10px] text-[#0284C7] mt-0.5 leading-tight">تواصل معه لتنسيق موعد التسليم الآن</p>
        </div>
        <div className="w-7 h-7 rounded-lg bg-[#BAE6FD] flex items-center justify-center flex-shrink-0">
          <Truck className="w-3.5 h-3.5 text-[#0369A1]" />
        </div>
      </div>

      <div className="p-4 space-y-2.5">
        <DealInfoRow icon={<MapPin className="w-3.5 h-3.5 text-[#7a9aab]" />} label="المدينة" value={deal.city} />
        <DealInfoRow icon={<Package className="w-3.5 h-3.5 text-[#7a9aab]" />} label="النوع" value={`${deal.pallet_type} · ${deal.size} · درجة ${deal.quality}`} />
        <DealInfoRow icon={<Hash className="w-3.5 h-3.5 text-[#7a9aab]" />} label="الكمية" value={`${deal.quantity.toLocaleString('ar-SA')} طبلية`} />
        <DealInfoRow icon={<Banknote className="w-3.5 h-3.5 text-[#7a9aab]" />} label="المبلغ الإجمالي" value={`${((deal.final_price * deal.quantity) + (deal.platform_fee ?? deal.quantity)).toLocaleString('ar-SA')} ر.س`} />

        {deal.delivery_started_at && (
          <div className="flex items-center justify-end gap-1 text-[10px] text-[#7a9aab]">
            <span>بدأ التسليم: {new Date(deal.delivery_started_at).toLocaleString('ar-SA', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}</span>
            <Truck className="w-3 h-3" />
          </div>
        )}

        <div className="border-t border-[#f0f6fa] pt-3">
          <a
            href={buildWhatsAppLink(deal.buyer_phone, 'supplier', deal)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2.5 w-full py-3 rounded-xl text-[13px] font-bold text-white active:scale-[0.97] transition-transform"
            style={{ background: 'linear-gradient(135deg, #25D366, #128C7E)', boxShadow: '0 4px 14px rgba(37,211,102,0.3)' }}
          >
            <MessageCircle className="w-4 h-4" />
            <span>تواصل مع المشتري عبر واتساب</span>
          </a>
        </div>
      </div>

      <div className="px-4 pb-4 flex gap-2">
        <button
          disabled={loading}
          onClick={onFailDelivery}
          className="flex-1 py-3 rounded-xl border border-red-200 bg-red-50 text-[12px] font-bold text-red-600 flex items-center justify-center gap-1.5 active:scale-[0.97] transition-transform disabled:opacity-50"
        >
          <XCircle className="w-3.5 h-3.5" />
          فشل التسليم
        </button>
        <button
          disabled={loading}
          onClick={onConfirmDelivery}
          className="flex-1 py-3 rounded-xl text-[12px] font-bold text-white flex items-center justify-center gap-1.5 active:scale-[0.97] transition-transform disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)', boxShadow: '0 4px 14px rgba(22,163,74,0.25)' }}
        >
          <CheckCircle className="w-3.5 h-3.5" />
          تم التسليم
        </button>
      </div>
    </div>
  );
}

function EndedDealCard({ deal, onRate }: { deal: Deal; onRate: () => void }) {
  const cfg = DEAL_STATUS_CONFIG[deal.status];
  const isCompleted = deal.status === 'completed';
  const feePerPallet = deal.platform_fee_per_pallet ?? 1;
  const totalFee = deal.platform_fee ?? (feePerPallet * deal.quantity);
  const totalPrice = deal.final_price * deal.quantity;
  const grandTotal = totalPrice + totalFee;

  return (
    <div
      className="bg-white rounded-2xl shadow-sm overflow-hidden"
      style={{ border: isCompleted ? '1.5px solid #86EFAC' : '1.5px solid #e2edf5' }}
    >
      <div
        className="flex items-center justify-between px-4 py-2.5"
        style={{
          background: isCompleted ? '#F0FDF4' : '#f8fbfd',
          borderBottom: `1px solid ${isCompleted ? '#BBF7D0' : '#f0f6fa'}`,
        }}
      >
        <span className="text-[10px] font-mono text-[#9ab0bf]">{deal.deal_ref}</span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[#9ab0bf]">
            {new Date(deal.created_at).toLocaleDateString('ar-SA', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: cfg?.bg ?? '#f3f4f6', color: cfg?.color ?? '#6b7280' }}
          >
            {cfg?.label ?? deal.status}
          </span>
        </div>
      </div>

      <div className="p-4 space-y-2" dir="rtl">
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-bold text-[#1a2f3e]">{deal.pallet_type} · {deal.size} · درجة {deal.quality}</span>
          <span className="text-[11px] text-[#7a9aab]">النوع</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-bold text-[#1a2f3e]">{deal.quantity.toLocaleString('ar-SA')} طبلية</span>
          <span className="text-[11px] text-[#7a9aab]">الكمية</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-bold text-[#1a2f3e]">{deal.city}</span>
          <span className="text-[11px] text-[#7a9aab]">المدينة</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-bold text-[#1a2f3e]">{deal.final_price.toLocaleString('ar-SA')} ر.س / طبلية</span>
          <span className="text-[11px] text-[#7a9aab]">سعر الوحدة</span>
        </div>

        <div className="border-t border-[#f0f6fa] pt-2 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#1a2f3e]">{totalPrice.toLocaleString('ar-SA')} ر.س</span>
            <span className="text-[11px] text-[#7a9aab]">إجمالي البضاعة</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#F59E0B]">{totalFee.toLocaleString('ar-SA')} ر.س</span>
            <span className="text-[11px] text-[#7a9aab]">رسوم المنصة ({feePerPallet} × {deal.quantity})</span>
          </div>
          <div className="flex items-center justify-between bg-[#0f2535] rounded-xl px-3 py-2.5 mt-1">
            <span className="text-[14px] font-black text-white">{grandTotal.toLocaleString('ar-SA')} ر.س</span>
            <span className="text-[11px] font-bold text-white/70">المبلغ الإجمالي</span>
          </div>
        </div>

        {deal.cancel_reason && (
          <div className="bg-red-50 border border-red-100 rounded-xl px-3 py-2">
            <p className="text-[11px] text-red-600 font-bold">{deal.cancel_reason}</p>
          </div>
        )}

        {isCompleted && (
          <div className="border-t border-[#f0f6fa] pt-3 space-y-2">
            <button
              onClick={onRate}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-[12px] font-bold text-white active:scale-[0.97] transition-transform bg-amber-500 hover:bg-amber-600"
            >
              <Star className="w-3.5 h-3.5" />
              <span>تقييم المشتري</span>
            </button>
            <a
              href={buildWhatsAppLink(deal.buyer_phone, 'supplier', deal)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2.5 w-full py-2.5 rounded-xl text-[12px] font-bold text-white active:scale-[0.97] transition-transform"
              style={{ background: 'linear-gradient(135deg, #25D366, #128C7E)', boxShadow: '0 3px 10px rgba(37,211,102,0.3)' }}
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>تواصل مع المشتري</span>
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ tab }: { tab: Tab }) {
  const messages: Record<Tab, { title: string; sub: string }> = {
    new:      { title: 'لا توجد طلبات جديدة',             sub: 'ستظهر هنا طلبات المشترين التي تطابق مخزونك' },
    reserved: { title: 'لا توجد صفقات بانتظار المشتري',  sub: 'الصفقات التي قبلتها وتنتظر تأكيد المشتري ستظهر هنا' },
    delivery: { title: 'لا توجد صفقات جاري تسليمها', sub: 'الصفقات التي بدأ تسليمها ستظهر هنا' },
    ended:    { title: 'لا توجد صفقات منتهية',       sub: 'الصفقات المكتملة والملغاة ستظهر هنا' },
  };
  const m = messages[tab];
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <div className="w-16 h-16 rounded-2xl bg-white border border-dashed border-[#d0e6f0] flex items-center justify-center">
        <Handshake className="w-7 h-7 text-[#c0d5e0]" />
      </div>
      <p className="text-[13px] font-bold text-[#a0b5c0]">{m.title}</p>
      <p className="text-[11px] text-[#c0d0da] text-center px-8">{m.sub}</p>
    </div>
  );
}

export default function SupplierDealsPage({ phone, onClose }: Props) {
  const {
    loading, actionLoading,
    newRequests, reservedDeals, inDelivery, endedDeals,
    confirmDeal, startDelivery, confirmDelivery, failDelivery,
    refresh,
  } = useSupplierDeals(phone);

  const [activeTab, setActiveTab] = useState<Tab>('new');
  const [confirmingDeal, setConfirmingDeal] = useState<Deal | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [failingDeal, setFailingDeal] = useState<Deal | null>(null);
  const [toast, setToast] = useState<ToastConfig | null>(null);
  const [ratingDialog, setRatingDialog] = useState<{ dealId: string; buyerPhone: string; buyerName: string } | null>(null);

  const counts = {
    new: newRequests.length,
    reserved: reservedDeals.length,
    delivery: inDelivery.length,
    ended: endedDeals.length,
  };
  const total = counts.new + counts.reserved + counts.delivery + counts.ended;

  const handleConfirm = async () => {
    if (!confirmingDeal) return;
    setConfirmError(null);
    const result = await confirmDeal(confirmingDeal.id);
    if (result.success) {
      setConfirmingDeal(null);
      setToast({
        title: 'تم تأكيد الصفقة بنجاح',
        message: 'في انتظار موافقة المشتري على الفاتورة — سيتم إشعارك فور تأكيده',
        variant: 'success',
      });
      setActiveTab('reserved');
    } else {
      setConfirmError(result.error ?? 'حدث خطأ غير متوقع');
    }
  };

  const handleStartDelivery = async (dealId: string) => {
    const result = await startDelivery(dealId);
    if (result.success) {
      setToast({
        title: 'تم تسجيل بدء التسليم',
        message: 'الصفقة الآن في مرحلة التسليم — تواصل مع المشتري عبر واتساب لتنسيق الاستلام',
        variant: 'success',
      });
      setActiveTab('delivery');
    }
  };

  const handleConfirmDelivery = async (dealId: string) => {
    const result = await confirmDelivery(dealId);
    if (result.success) {
      setToast({
        title: 'تم تأكيد التسليم بنجاح',
        message: 'الصفقة مكتملة — شكراً لتعاملك مع منصة العاديات',
        variant: 'success',
      });
      setActiveTab('ended');
    }
  };

  const handleFailDelivery = async () => {
    if (!failingDeal) return;
    const result = await failDelivery(failingDeal.id);
    if (result.success) {
      setFailingDeal(null);
      setToast({
        title: 'تم تسجيل فشل التسليم',
        message: 'تم إلغاء الصفقة وإعادة المخزون لحسابك',
        variant: 'info',
      });
      setActiveTab('ended');
    }
  };

  const handleOpenRating = (deal: Deal) => {
    setRatingDialog({
      dealId: deal.id,
      buyerPhone: deal.buyer_phone,
      buyerName: 'المشتري',
    });
  };

  const handleRatingSubmitted = () => {
    refresh();
  };

  return (
    <>
    {toast && (
      <ActionToast
        title={toast.title}
        message={toast.message}
        variant={toast.variant}
        onClose={() => setToast(null)}
      />
    )}
    <div className="fixed inset-0 z-[100] flex items-end lg:items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-md" onClick={onClose} />
      <div
        className="relative w-full lg:w-[780px] xl:w-[900px] lg:max-h-[90vh] max-h-[100vh] flex flex-col slide-up lg:rounded-3xl overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, #e8f2f8 0%, #f0f7fc 40%, #f5f9fc 60%, #eef5fa 100%)',
          boxShadow: '0 40px 100px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.15)',
        }}
      >
        {confirmingDeal && (
          <ConfirmDialog
            deal={confirmingDeal}
            onConfirm={handleConfirm}
            onCancel={() => { setConfirmingDeal(null); setConfirmError(null); }}
            loading={actionLoading === confirmingDeal.id}
            error={confirmError}
          />
        )}

        {failingDeal && (
          <FailDeliveryDialog
            deal={failingDeal}
            onConfirm={handleFailDelivery}
            onCancel={() => setFailingDeal(null)}
            loading={actionLoading === failingDeal.id}
          />
        )}

        <div
          className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #0f2535, #1a3d56)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}
        >
          <div className="flex items-center gap-2">
            <button onClick={refresh} className={`w-8 h-8 rounded-full bg-white/15 flex items-center justify-center ${loading ? 'animate-spin' : ''}`}>
              <RefreshCw className="w-3.5 h-3.5 text-white" />
            </button>
            {counts.new > 0 && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F59E0B] text-white animate-pulse">
                {counts.new} جديد
              </span>
            )}
            {counts.delivery > 0 && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#0369A1] text-white animate-pulse">
                {counts.delivery} تسليم
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right">
              <p className="text-[14px] font-bold text-white">صفقاتي</p>
              <p className="text-[10px] text-white/60">{total} صفقة إجمالاً</p>
            </div>
            <Handshake className="w-5 h-5 text-white/80" />
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center mr-1">
              <ArrowRight className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>

        <div className="flex-shrink-0 px-4 pt-3 pb-0">
          <div className="flex gap-1 p-1 bg-white/60 rounded-2xl backdrop-blur-sm border border-white/80">
            {TABS.map(({ id, label, icon: Icon }) => {
              const count = counts[id];
              const isActive = activeTab === id;
              return (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-[10px] font-bold transition-all"
                  style={{ background: isActive ? '#1a4a5e' : 'transparent', color: isActive ? 'white' : '#4a6a7e' }}
                >
                  <Icon className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{label}</span>
                  {count > 0 && (
                    <span
                      className="text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{
                        background: isActive ? 'rgba(255,255,255,0.25)'
                          : id === 'new' ? '#F59E0B'
                          : id === 'delivery' ? '#0369A1'
                          : '#e2ecf3',
                        color: isActive ? 'white'
                          : (id === 'new' || id === 'delivery') ? 'white'
                          : '#2c5f7c',
                      }}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 lg:px-8 py-4 pb-10 max-w-2xl mx-auto w-full">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-32 bg-white rounded-2xl animate-pulse border border-gray-100" />
              ))}
            </div>
          ) : activeTab === 'new' ? (
            newRequests.length === 0 ? <EmptyState tab="new" /> : (
              <div className="space-y-3">
                {newRequests.map(deal => (
                  <NewRequestCard key={deal.id} deal={deal} onConfirm={d => setConfirmingDeal(d)} />
                ))}
              </div>
            )
          ) : activeTab === 'reserved' ? (
            reservedDeals.length === 0 ? <EmptyState tab="reserved" /> : (
              <div className="space-y-3">
                {reservedDeals.map(deal => (
                  <ReservedDealCard
                    key={deal.id}
                    deal={deal}
                    onStartDelivery={() => handleStartDelivery(deal.id)}
                    loading={actionLoading === deal.id}
                  />
                ))}
              </div>
            )
          ) : activeTab === 'delivery' ? (
            inDelivery.length === 0 ? <EmptyState tab="delivery" /> : (
              <div className="space-y-3">
                {inDelivery.map(deal => (
                  <InDeliveryCard
                    key={deal.id}
                    deal={deal}
                    onConfirmDelivery={() => handleConfirmDelivery(deal.id)}
                    onFailDelivery={() => setFailingDeal(deal)}
                    loading={actionLoading === deal.id}
                  />
                ))}
              </div>
            )
          ) : (
            endedDeals.length === 0 ? <EmptyState tab="ended" /> : (
              <div className="space-y-2">
                {endedDeals.map(deal => (
                  <EndedDealCard
                    key={deal.id}
                    deal={deal}
                    onRate={() => handleOpenRating(deal)}
                  />
                ))}
              </div>
            )
          )}
        </div>
      </div>
    </div>
    {ratingDialog && (
      <RatingDialog
        isOpen={true}
        onClose={() => setRatingDialog(null)}
        dealId={ratingDialog.dealId}
        raterPhone={phone}
        ratedUserPhone={ratingDialog.buyerPhone}
        ratedUserName={ratingDialog.buyerName}
        userType="buyer"
        onRatingSubmitted={handleRatingSubmitted}
      />
    )}
    </>
  );
}
