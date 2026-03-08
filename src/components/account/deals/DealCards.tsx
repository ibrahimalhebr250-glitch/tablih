import { useState, useEffect } from 'react';
import {
  Handshake,
  Clock,
  Truck,
  CheckCircle2,
  XCircle,
  MessageCircle,
  Loader2,
  ShieldCheck,
  MapPin,
  Package,
  Layers,
  ArrowLeftRight,
  Timer,
  Play,
} from 'lucide-react';
import type { Deal } from '../../../types/deal';
import { DEAL_STATUS_CONFIG } from '../../../types/deal';
import type { CounterpartyInfo } from '../../../hooks/useAccountDeals';

export function buildWhatsAppLink(phone: string, senderRole: 'supplier' | 'buyer', deal: Deal): string {
  const cleanPhone = phone.replace(/^0/, '966').replace('+', '');
  const myRole = senderRole === 'supplier' ? 'المورد' : 'المشتري';
  const otherRole = senderRole === 'supplier' ? 'المشتري' : 'المورد';
  const message = [
    `السلام عليكم`,
    ``,
    `تواصل معك عبر *منصة العاديات* بخصوص الصفقة رقم *${deal.deal_ref}*`,
    ``,
    `--- تفاصيل الصفقة ---`,
    `النوع: ${deal.pallet_type} · ${deal.size} · درجة ${deal.quality}`,
    `الكمية: ${deal.quantity} طبلية`,
    `المدينة: ${deal.city}`,
    `السعر: ${(deal.supplier_price ?? deal.final_price)} ر.س / طبلية`,
    ``,
    `انا ${myRole} في هذه الصفقة وأنت ${otherRole}`,
    ``,
    `شكرا لتعاملك مع منصة العاديات`,
  ].join('\n');
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

function DealHeader({ deal, isBuyer }: { deal: Deal; isBuyer: boolean }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <span className="text-[10px] font-mono text-[#9ab0bf]" dir="ltr">{deal.deal_ref}</span>
      <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
        style={{ background: isBuyer ? '#EFF6FF' : '#ECFDF5', color: isBuyer ? '#1E40AF' : '#059669', border: isBuyer ? '1px solid #BFDBFE' : '1px solid #A7F3D0' }}
      >
        <ArrowLeftRight className="w-2.5 h-2.5" />
        {isBuyer ? 'مشتري' : 'مورد'}
      </span>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[12px] font-bold text-[#1a2f3e]">{value}</span>
      <span className="text-[11px] text-[#7a9aab]">{label}</span>
    </div>
  );
}

function PriceBlock({ deal, isBuyer }: { deal: Deal; isBuyer: boolean }) {
  const supplierPrice = deal.supplier_price ?? deal.final_price;
  const platformFee = deal.platform_fee_per_pallet ?? 0.25;
  const unitPrice = isBuyer ? (deal.buyer_price ?? (supplierPrice + platformFee)) : supplierPrice;
  const totalAmount = unitPrice * deal.quantity;

  return (
    <div className="border-t border-[#f0f6fa] pt-2.5 mt-1">
      <div className="flex items-center justify-between bg-[#0f2535] rounded-xl px-3.5 py-2.5">
        <span className="text-[15px] font-black text-white">{totalAmount.toLocaleString('ar-SA')} ر.س</span>
        <span className="text-[10px] font-bold text-white/60">الإجمالي</span>
      </div>
    </div>
  );
}

function CountdownBadge({ deadline }: { deadline: string }) {
  const [remaining, setRemaining] = useState('');
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const update = () => {
      const now = Date.now();
      const end = new Date(deadline).getTime();
      const diff = end - now;

      if (diff <= 0) {
        setRemaining('انتهت المهلة');
        setIsExpired(true);
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (hours > 0) {
        setRemaining(`${hours} ساعة ${minutes} دقيقة`);
      } else {
        setRemaining(`${minutes} دقيقة`);
      }
      setIsExpired(false);
    };

    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [deadline]);

  return (
    <div
      className="flex items-center gap-2 rounded-lg px-2.5 py-1.5"
      style={{
        background: isExpired ? '#FEF2F2' : '#E0F2FE',
        border: `1px solid ${isExpired ? '#FECACA' : '#BAE6FD'}`,
      }}
    >
      <Timer className="w-3 h-3" style={{ color: isExpired ? '#dc2626' : '#0369A1' }} />
      <span className="text-[10px] font-bold" style={{ color: isExpired ? '#dc2626' : '#0369A1' }}>
        {remaining}
      </span>
    </div>
  );
}

function getStatusIndicator(deal: Deal, isBuyer: boolean) {
  const isExecution = deal.status === 'execution_in_progress';
  const isInDelivery = deal.status === 'in_delivery';
  const isWaitingSupplier = deal.status === 'pending_supplier' || deal.status === 'matched';
  const isWaitingBuyer = deal.status === 'awaiting_buyer' || deal.status === 'supplier_confirmed';
  const isReserved = deal.status === 'inventory_reserved';

  if (isExecution || isInDelivery) return { icon: Play, color: '#0369A1', bg: '#E0F2FE', border: '#BAE6FD', text: 'جاري التنفيذ', pulse: true };
  if (isWaitingSupplier) return { icon: Clock, color: '#B45309', bg: '#FFFBEB', border: '#FDE68A', text: 'بانتظار اعتماد المورد', pulse: true };
  if (isWaitingBuyer) return { icon: Clock, color: '#1E40AF', bg: '#EFF6FF', border: '#BFDBFE', text: 'بانتظار تأكيد المشتري', pulse: true };
  if (isReserved) return { icon: Package, color: '#059669', bg: '#ECFDF5', border: '#A7F3D0', text: 'محجوزة', pulse: false };

  const statusCfg = DEAL_STATUS_CONFIG[deal.status];
  return { icon: Handshake, color: statusCfg?.color ?? '#6b7280', bg: statusCfg?.bg ?? '#f3f4f6', border: '#e2edf5', text: statusCfg?.label ?? deal.status, pulse: false };
}

interface ActiveCardProps {
  deal: Deal;
  isBuyer: boolean;
  counterparty: CounterpartyInfo | null;
  onViewDetail: (deal: Deal) => void;
}

export function ActiveDealCard({ deal, isBuyer, counterparty, onViewDetail }: ActiveCardProps) {
  const counterpartyName = counterparty?.company_name || counterparty?.display_name || (isBuyer ? 'مورد' : 'مشتري');
  const indicator = getStatusIndicator(deal, isBuyer);
  const IndicatorIcon = indicator.icon;

  const isWaitingSupplier = deal.status === 'pending_supplier' || deal.status === 'matched';
  const isWaitingBuyer = deal.status === 'awaiting_buyer' || deal.status === 'supplier_confirmed';
  const isExecution = deal.status === 'execution_in_progress' || deal.status === 'in_delivery';
  const isReserved = deal.status === 'inventory_reserved';

  return (
    <button
      onClick={() => onViewDetail(deal)}
      className="w-full text-right bg-white rounded-2xl overflow-hidden transition-transform active:scale-[0.98]"
      style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.05)', border: `1.5px solid ${indicator.border}` }}
      dir="rtl"
    >
      <div className="flex items-center justify-between px-4 py-2" style={{ background: indicator.bg, borderBottom: `1px solid ${indicator.border}` }}>
        <div className="flex items-center gap-1.5">
          {indicator.pulse && <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: indicator.color }} />}
          <IndicatorIcon className="w-3 h-3" style={{ color: indicator.color }} />
          <span className="text-[10px] font-bold" style={{ color: indicator.color }}>{indicator.text}</span>
        </div>
        {isExecution && deal.execution_deadline && (
          <CountdownBadge deadline={deal.execution_deadline} />
        )}
        {!isExecution && (
          <span className="text-[9px] font-mono text-[#9ab0bf]" dir="ltr">{deal.deal_ref}</span>
        )}
      </div>

      <div className="p-4 space-y-2">
        <DealHeader deal={deal} isBuyer={isBuyer} />
        <InfoRow label={isBuyer ? 'المورد' : 'المشتري'} value={counterpartyName} />
        <InfoRow label="النوع" value={`${deal.pallet_type} · ${deal.size} · درجة ${deal.quality}`} />
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3 h-3 text-[#7a9aab]" />
            <span className="text-[11px] text-[#7a9aab]">{deal.city}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Layers className="w-3 h-3 text-[#1a4a5e]" />
            <span className="text-[12px] font-bold text-[#1a4a5e]">{deal.quantity.toLocaleString('ar-SA')} طبلية</span>
          </div>
        </div>

        <PriceBlock deal={deal} isBuyer={isBuyer} />

        {isWaitingSupplier && isBuyer && (
          <div className="flex items-center gap-2 justify-center py-2 rounded-xl bg-amber-50 border border-amber-200 mt-1">
            <Loader2 className="w-3.5 h-3.5 text-amber-600 animate-spin" />
            <span className="text-[11px] font-bold text-amber-700">في انتظار اعتماد المورد</span>
          </div>
        )}

        {isWaitingSupplier && !isBuyer && (
          <div className="flex items-center gap-2 justify-center py-2 rounded-xl bg-amber-50 border border-amber-200 mt-1">
            <Handshake className="w-3.5 h-3.5 text-amber-600" />
            <span className="text-[11px] font-bold text-amber-700">بحاجة لاعتمادك</span>
          </div>
        )}

        {isWaitingBuyer && isBuyer && (
          <div className="flex items-center gap-2 justify-center py-2 rounded-xl bg-blue-50 border border-blue-200 mt-1">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-[11px] font-bold text-blue-700">بحاجة لتأكيدك وتحديد المهلة</span>
          </div>
        )}

        {isExecution && (
          <div className="flex items-center gap-2 justify-center py-2 rounded-xl mt-1"
            style={{ background: '#E0F2FE', border: '1px solid #BAE6FD' }}
          >
            <MessageCircle className="w-3.5 h-3.5 text-[#0369A1]" />
            <span className="text-[11px] font-bold text-[#0369A1]">
              تواصلوا عبر واتساب لتنسيق التسليم
            </span>
          </div>
        )}

        {isReserved && (
          <div className="flex items-center gap-2 justify-center py-2 rounded-xl mt-1"
            style={{ background: '#ECFDF5', border: '1px solid #A7F3D0' }}
          >
            <Package className="w-3.5 h-3.5 text-[#059669]" />
            <span className="text-[11px] font-bold text-[#059669]">الكمية محجوزة</span>
          </div>
        )}
      </div>
    </button>
  );
}

interface CompletedCardProps {
  deal: Deal;
  isBuyer: boolean;
  counterparty: CounterpartyInfo | null;
  onViewDetail: (deal: Deal) => void;
}

export function CompletedDealCard({ deal, isBuyer, counterparty, onViewDetail }: CompletedCardProps) {
  const counterpartyName = counterparty?.company_name || counterparty?.display_name || (isBuyer ? 'مورد' : 'مشتري');

  return (
    <button
      onClick={() => onViewDetail(deal)}
      className="w-full text-right bg-white rounded-2xl overflow-hidden transition-transform active:scale-[0.98]"
      style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.04)', border: '1.5px solid #BBF7D0' }}
      dir="rtl"
    >
      <div className="flex items-center justify-between px-4 py-2" style={{ background: '#F0FDF4', borderBottom: '1px solid #BBF7D0' }}>
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="w-3 h-3 text-[#16a34a]" />
          <span className="text-[10px] font-bold text-[#16a34a]">مكتملة</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-[#9ab0bf]">
            {deal.completed_at ? new Date(deal.completed_at).toLocaleDateString('ar-SA', { day: 'numeric', month: 'short' }) : ''}
          </span>
          <span className="text-[9px] font-mono text-[#9ab0bf]" dir="ltr">{deal.deal_ref}</span>
        </div>
      </div>
      <div className="p-4 space-y-2">
        <DealHeader deal={deal} isBuyer={isBuyer} />
        <InfoRow label={isBuyer ? 'المورد' : 'المشتري'} value={counterpartyName} />
        <InfoRow label="النوع" value={`${deal.pallet_type} · ${deal.size} · درجة ${deal.quality}`} />
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3 h-3 text-[#7a9aab]" />
            <span className="text-[11px] text-[#7a9aab]">{deal.city}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Layers className="w-3 h-3 text-[#1a4a5e]" />
            <span className="text-[12px] font-bold text-[#1a4a5e]">{deal.quantity.toLocaleString('ar-SA')} طبلية</span>
          </div>
        </div>
        <PriceBlock deal={deal} isBuyer={isBuyer} />
      </div>
    </button>
  );
}

interface CancelledCardProps {
  deal: Deal;
  isBuyer: boolean;
  counterparty: CounterpartyInfo | null;
  onViewDetail: (deal: Deal) => void;
}

export function CancelledDealCard({ deal, isBuyer, counterparty, onViewDetail }: CancelledCardProps) {
  const counterpartyName = counterparty?.company_name || counterparty?.display_name || (isBuyer ? 'مورد' : 'مشتري');

  return (
    <button
      onClick={() => onViewDetail(deal)}
      className="w-full text-right bg-white rounded-2xl overflow-hidden transition-transform active:scale-[0.98]"
      style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.04)', border: '1.5px solid #FECACA' }}
      dir="rtl"
    >
      <div className="flex items-center justify-between px-4 py-2" style={{ background: '#FEF2F2', borderBottom: '1px solid #FECACA' }}>
        <div className="flex items-center gap-1.5">
          <XCircle className="w-3 h-3 text-[#dc2626]" />
          <span className="text-[10px] font-bold text-[#dc2626]">ملغاة</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-[#9ab0bf]">
            {deal.cancelled_at ? new Date(deal.cancelled_at).toLocaleDateString('ar-SA', { day: 'numeric', month: 'short' }) : new Date(deal.created_at).toLocaleDateString('ar-SA', { day: 'numeric', month: 'short' })}
          </span>
          <span className="text-[9px] font-mono text-[#9ab0bf]" dir="ltr">{deal.deal_ref}</span>
        </div>
      </div>
      <div className="p-4 space-y-2">
        <DealHeader deal={deal} isBuyer={isBuyer} />
        <InfoRow label={isBuyer ? 'المورد' : 'المشتري'} value={counterpartyName} />
        <InfoRow label="النوع" value={`${deal.pallet_type} · ${deal.size} · درجة ${deal.quality}`} />
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3 h-3 text-[#7a9aab]" />
            <span className="text-[11px] text-[#7a9aab]">{deal.city}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Layers className="w-3 h-3 text-[#6b7280]" />
            <span className="text-[12px] font-bold text-[#6b7280]">{deal.quantity.toLocaleString('ar-SA')} طبلية</span>
          </div>
        </div>
        {deal.cancel_reason && (
          <div className="bg-red-50 border border-red-100 rounded-xl px-3 py-2 mt-1">
            <p className="text-[10px] text-red-600 font-bold">{deal.cancel_reason}</p>
          </div>
        )}
        <PriceBlock deal={deal} isBuyer={isBuyer} />
      </div>
    </button>
  );
}
