import { useState } from 'react';
import {
  X,
  Handshake,
  MapPin,
  Package,
  Layers,
  Hash,
  Banknote,
  MessageCircle,
  Truck,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Star,
  Loader2,
  CreditCard,
  CheckSquare,
  Square,
} from 'lucide-react';
import type { Deal } from '../../../types/deal';
import { DEAL_STATUS_CONFIG } from '../../../types/deal';
import type { CounterpartyInfo } from '../../../hooks/useAccountDeals';
import { buildWhatsAppLink } from './DealCards';

interface Props {
  deal: Deal;
  isBuyer: boolean;
  counterparty: CounterpartyInfo | null;
  actionLoading: string | null;
  onClose: () => void;
  onSupplierConfirm: (dealId: string) => Promise<{ success: boolean; error?: string }>;
  onBuyerConfirm: (dealId: string) => Promise<{ success: boolean; error?: string }>;
  onStartDelivery: (dealId: string) => Promise<{ success: boolean; error?: string }>;
  onConfirmDelivery: (dealId: string) => Promise<{ success: boolean; error?: string }>;
  onFailDelivery: (dealId: string) => Promise<{ success: boolean; error?: string }>;
  onCancelDeal: (dealId: string) => Promise<{ success: boolean; error?: string }>;
  onRate: (deal: Deal) => void;
}

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

export default function DealDetailSheet({
  deal, isBuyer, counterparty, actionLoading, onClose,
  onSupplierConfirm, onBuyerConfirm, onStartDelivery,
  onConfirmDelivery, onFailDelivery, onCancelDeal, onRate,
}: Props) {
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [supplierPledge, setSupplierPledge] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const counterpartyName = counterparty?.company_name || counterparty?.display_name || (isBuyer ? 'مورد' : 'مشتري');
  const statusCfg = DEAL_STATUS_CONFIG[deal.status];
  const supplierPrice = deal.supplier_price ?? deal.final_price;
  const platformFee = deal.platform_fee_per_pallet ?? 0.25;
  const buyerUnitPrice = deal.buyer_price ?? (supplierPrice + platformFee);
  const unitPrice = isBuyer ? buyerUnitPrice : supplierPrice;
  const totalAmount = unitPrice * deal.quantity;
  const totalFee = deal.platform_fee ?? (platformFee * deal.quantity);

  const isLoading = actionLoading === deal.id;

  const isWaitingSupplier = deal.status === 'pending_supplier' || deal.status === 'matched';
  const isSupplierConfirmed = deal.status === 'supplier_confirmed';
  const isWaitingBuyer = deal.status === 'awaiting_buyer';
  const isReserved = deal.status === 'inventory_reserved';
  const isInDelivery = deal.status === 'in_delivery';
  const isCompleted = deal.status === 'completed';
  const isCancelled = deal.status === 'cancelled';
  const isActive = !isCompleted && !isCancelled;

  const otherPhone = isBuyer ? deal.supplier_phone : deal.buyer_phone;
  const myRole: 'buyer' | 'supplier' = isBuyer ? 'buyer' : 'supplier';
  const showWhatsApp = isReserved || isInDelivery || isCompleted;

  const canSupplierConfirm = !isBuyer && (isWaitingSupplier || isSupplierConfirmed);
  const canBuyerConfirm = isBuyer && isWaitingBuyer;
  const canStartDelivery = !isBuyer && (isReserved || isWaitingBuyer);
  const canConfirmDelivery = !isBuyer && isInDelivery;
  const canFailDelivery = !isBuyer && isInDelivery;
  const canCancel = !isBuyer && isActive && !isInDelivery;
  const canRate = isCompleted;

  const handleAction = async (action: (id: string) => Promise<{ success: boolean; error?: string }>) => {
    setError(null);
    const result = await action(deal.id);
    if (!result.success) {
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
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center"
          >
            <X className="w-4 h-4 text-white" />
          </button>
          <div className="flex items-center gap-2">
            <div className="text-right">
              <p className="text-[13px] font-bold text-white">تفاصيل الصفقة</p>
              <p className="text-[10px] text-white/50" dir="ltr">{deal.deal_ref}</p>
            </div>
            <Handshake className="w-5 h-5 text-white/70" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4" dir="rtl">
          <div
            className="flex items-center gap-2.5 rounded-xl px-3.5 py-3"
            style={{ background: statusCfg?.bg ?? '#f3f4f6', border: `1px solid ${statusCfg?.color ?? '#e2edf5'}20` }}
          >
            {isInDelivery && <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: statusCfg?.color }} />}
            {isCompleted && <CheckCircle2 className="w-4 h-4" style={{ color: '#16a34a' }} />}
            {isCancelled && <XCircle className="w-4 h-4" style={{ color: '#dc2626' }} />}
            {isActive && !isInDelivery && <Clock className="w-4 h-4" style={{ color: statusCfg?.color }} />}
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-black" style={{ color: statusCfg?.color ?? '#1a2f3e' }}>
                {statusCfg?.label ?? deal.status}
              </p>
              <p className="text-[10px] mt-0.5" style={{ color: `${statusCfg?.color ?? '#6b7280'}99` }}>
                {isBuyer ? 'أنت المشتري في هذه الصفقة' : 'أنت المورد في هذه الصفقة'}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#e2edf5] overflow-hidden">
            <div className="px-4 py-2.5 border-b border-[#f0f6fa] bg-[#f8fbfd]">
              <p className="text-[11px] font-bold text-[#4a7a94]">معلومات الصفقة</p>
            </div>
            <div className="p-4 space-y-2.5">
              <InfoRow icon={<Handshake className="w-3.5 h-3.5 text-[#7a9aab]" />} label={isBuyer ? 'المورد' : 'المشتري'} value={counterpartyName} />
              <InfoRow icon={<Package className="w-3.5 h-3.5 text-[#7a9aab]" />} label="النوع" value={deal.pallet_type} />
              <InfoRow icon={<Layers className="w-3.5 h-3.5 text-[#7a9aab]" />} label="المقاس" value={deal.size} />
              <InfoRow icon={<Star className="w-3.5 h-3.5 text-[#7a9aab]" />} label="الجودة" value={`درجة ${deal.quality}`} />
              <InfoRow icon={<Hash className="w-3.5 h-3.5 text-[#7a9aab]" />} label="الكمية" value={`${deal.quantity.toLocaleString('ar-SA')} طبلية`} />
              <InfoRow icon={<MapPin className="w-3.5 h-3.5 text-[#7a9aab]" />} label="المدينة" value={deal.city} />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#e2edf5] overflow-hidden">
            <div className="px-4 py-2.5 border-b border-[#f0f6fa] bg-[#f8fbfd]">
              <p className="text-[11px] font-bold text-[#4a7a94]">التفاصيل المالية</p>
            </div>
            <div className="p-4 space-y-2.5">
              <InfoRow icon={<Banknote className="w-3.5 h-3.5 text-[#7a9aab]" />} label="سعر المورد" value={`${supplierPrice.toLocaleString('ar-SA')} ر.س / طبلية`} />
              {isBuyer && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[12px] font-bold text-[#F59E0B]">{platformFee} ر.س / طبلية</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-[#7a9aab]">رسوم المنصة</span>
                    <CreditCard className="w-3.5 h-3.5 text-[#F59E0B]" />
                  </div>
                </div>
              )}
              {isBuyer && (
                <div className="flex items-center justify-between bg-[#F8FAFC] rounded-xl px-3 py-2">
                  <span className="text-[12px] font-bold text-[#1a2f3e]">{buyerUnitPrice.toLocaleString('ar-SA')} ر.س / طبلية</span>
                  <span className="text-[10px] font-bold text-[#4a7a94]">السعر النهائي للوحدة</span>
                </div>
              )}
              {!isBuyer && (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[12px] font-bold text-[#F59E0B]">{totalFee.toLocaleString('ar-SA')} ر.س</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-[#7a9aab]">رسوم المنصة ({platformFee} x {deal.quantity})</span>
                      <CreditCard className="w-3.5 h-3.5 text-[#F59E0B]" />
                    </div>
                  </div>
                </>
              )}
              <div className="border-t-2 border-[#e2edf5] pt-3">
                <div className="flex items-center justify-between bg-[#0f2535] rounded-xl px-4 py-3">
                  <span className="text-[16px] font-black text-white">{totalAmount.toLocaleString('ar-SA')} ر.س</span>
                  <span className="text-[11px] font-bold text-white/70">المبلغ الإجمالي</span>
                </div>
              </div>
            </div>
          </div>

          {deal.delivery_started_at && (
            <div className="flex items-center gap-2 bg-[#E0F2FE] border border-[#BAE6FD] rounded-xl px-3 py-2.5">
              <Truck className="w-4 h-4 text-[#0369A1]" />
              <span className="text-[11px] font-bold text-[#0369A1]">
                بدأ التسليم: {new Date(deal.delivery_started_at).toLocaleString('ar-SA', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
              </span>
            </div>
          )}

          {deal.cancel_reason && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
              <p className="text-[11px] text-red-700 font-bold">سبب الإلغاء: {deal.cancel_reason}</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <p className="text-[11px] font-bold text-red-700">{error}</p>
            </div>
          )}

          {canSupplierConfirm && !isBuyer && (
            <div className="space-y-3">
              <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-xl p-2.5 text-right text-[10px] leading-relaxed text-[#92400E]">
                سيتم إضافة رسوم المنصة ({totalFee.toLocaleString('ar-SA')} ر.س) إلى فاتورة البيع الخاصة بكم، وتتعهدون بتحصيلها من المشتري وتسليمها للمنصة.
              </div>
              <button
                onClick={() => setSupplierPledge(!supplierPledge)}
                className="w-full flex items-center gap-3 p-3 rounded-xl transition-colors"
                style={{ background: supplierPledge ? '#F0FDF4' : '#f8fbfd', border: `1.5px solid ${supplierPledge ? '#86EFAC' : '#e2edf5'}` }}
              >
                {supplierPledge
                  ? <CheckSquare className="w-5 h-5 text-[#16a34a] flex-shrink-0" />
                  : <Square className="w-5 h-5 text-[#b0c8d5] flex-shrink-0" />
                }
                <span className="text-[12px] font-bold text-right" style={{ color: supplierPledge ? '#166534' : '#4a6a7e' }}>
                  أتعهد بتحصيل رسوم المنصة من المشتري وتسليمها للمنصة
                </span>
              </button>
              <button
                disabled={isLoading || !supplierPledge}
                onClick={() => handleAction(onSupplierConfirm)}
                className="w-full py-3.5 rounded-2xl text-[13px] font-bold text-white active:scale-[0.97] transition-transform disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)', boxShadow: '0 4px 16px rgba(22,163,74,0.3)' }}
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'تأكيد الصفقة'}
              </button>
            </div>
          )}

          {canBuyerConfirm && (
            <div className="space-y-3">
              <div className="flex items-center justify-end gap-1.5">
                <span className="text-[10px] text-[#7a9aab]">الدفع عند المعاينة</span>
                <CreditCard className="w-3 h-3 text-[#7a9aab]" />
              </div>
              <button
                disabled={isLoading}
                onClick={() => handleAction(onBuyerConfirm)}
                className="w-full py-3.5 rounded-2xl text-[13px] font-bold text-white active:scale-[0.97] transition-transform disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', boxShadow: '0 4px 16px rgba(37,99,235,0.25)' }}
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'تأكيد الشراء'}
              </button>
            </div>
          )}

          {showWhatsApp && (
            <a
              href={buildWhatsAppLink(otherPhone, myRole, deal)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2.5 w-full py-3 rounded-xl text-[13px] font-bold text-white active:scale-[0.97] transition-transform"
              style={{ background: 'linear-gradient(135deg, #25D366, #128C7E)', boxShadow: '0 4px 14px rgba(37,211,102,0.3)' }}
            >
              <MessageCircle className="w-4 h-4" />
              <span>تواصل عبر واتساب</span>
            </a>
          )}

          {canStartDelivery && (
            <button
              disabled={isLoading}
              onClick={() => handleAction(onStartDelivery)}
              className="w-full py-3 rounded-xl text-[13px] font-bold text-white flex items-center justify-center gap-2 active:scale-[0.97] transition-transform disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #0369A1, #0284C7)', boxShadow: '0 4px 14px rgba(3,105,161,0.25)' }}
            >
              <Truck className="w-4 h-4" />
              {isLoading ? 'جارٍ التحديث...' : 'بدء التسليم'}
            </button>
          )}

          {canConfirmDelivery && (
            <div className="flex gap-2">
              <button
                disabled={isLoading}
                onClick={() => handleAction(onFailDelivery)}
                className="flex-1 py-3 rounded-xl border border-red-200 bg-red-50 text-[12px] font-bold text-red-600 flex items-center justify-center gap-1.5 active:scale-[0.97] transition-transform disabled:opacity-50"
              >
                <XCircle className="w-3.5 h-3.5" />
                فشل التسليم
              </button>
              <button
                disabled={isLoading}
                onClick={() => handleAction(onConfirmDelivery)}
                className="flex-1 py-3 rounded-xl text-[12px] font-bold text-white flex items-center justify-center gap-1.5 active:scale-[0.97] transition-transform disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)', boxShadow: '0 4px 14px rgba(22,163,74,0.25)' }}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                تم التسليم
              </button>
            </div>
          )}

          {canRate && (
            <button
              onClick={() => onRate(deal)}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-[12px] font-bold text-white active:scale-[0.97] transition-transform bg-amber-500 hover:bg-amber-600"
            >
              <Star className="w-3.5 h-3.5" />
              <span>تقييم {isBuyer ? 'المورد' : 'المشتري'}</span>
            </button>
          )}

          {canCancel && !confirmingCancel && (
            <button
              onClick={() => setConfirmingCancel(true)}
              className="w-full py-2.5 rounded-xl border border-red-200 bg-red-50 text-[11px] font-bold text-red-600 active:scale-[0.97] transition-transform"
            >
              إلغاء الصفقة
            </button>
          )}

          {confirmingCancel && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <p className="text-[12px] font-black text-red-800">تأكيد إلغاء الصفقة</p>
              </div>
              <p className="text-[11px] text-red-700 leading-relaxed">
                سيتم إلغاء الصفقة وإعادة المخزون كما كان. هل أنت متأكد؟
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmingCancel(false)}
                  className="flex-1 py-2.5 rounded-xl bg-white border border-gray-200 text-[12px] font-bold text-[#4a6a7e]"
                >
                  تراجع
                </button>
                <button
                  disabled={isLoading}
                  onClick={() => handleAction(onCancelDeal)}
                  className="flex-1 py-2.5 rounded-xl text-[12px] font-bold text-white disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)' }}
                >
                  {isLoading ? 'جارٍ الإلغاء...' : 'تأكيد الإلغاء'}
                </button>
              </div>
            </div>
          )}

          {(isWaitingSupplier || isWaitingBuyer) && (
            <div className="flex items-center gap-2 justify-center py-2 rounded-xl bg-[#f5f9fc] border border-[#e2edf5]">
              <ShieldCheck className="w-3.5 h-3.5 text-[#4a7a94]" />
              <span className="text-[10px] text-[#4a7a94] font-semibold">
                الكمية محجوزة ومحمية حتى اكتمال الصفقة
              </span>
            </div>
          )}

          <div className="text-center py-2">
            <span className="text-[9px] text-[#b0c4d0]">
              تاريخ الإنشاء: {new Date(deal.created_at).toLocaleString('ar-SA', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
