import { useState, useEffect } from 'react';
import {
  X,
  Handshake,
  MapPin,
  Package,
  Layers,
  Hash,
  Banknote,
  MessageCircle,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Star,
  Loader2,
  CreditCard,
  CheckSquare,
  Square,
  Timer,
  Play,
  ShieldCheck,
} from 'lucide-react';
import type { Deal } from '../../../types/deal';
import { DEAL_STATUS_CONFIG } from '../../../types/deal';
import type { CounterpartyInfo } from '../../../hooks/useAccountDeals';
import { buildWhatsAppLink } from './DealCards';
import { logWhatsAppContact } from '../../../hooks/useWhatsAppTemplates';
import { supabase } from '../../../lib/supabase';

interface Props {
  deal: Deal;
  isBuyer: boolean;
  counterparty: CounterpartyInfo | null;
  actionLoading: string | null;
  onClose: () => void;
  onSupplierConfirm: (dealId: string) => Promise<{ success: boolean; error?: string }>;
  onBuyerConfirm: (dealId: string) => Promise<{ success: boolean; error?: string }>;
  onBuyerConfirmWithDeadline: (dealId: string, hours: number) => Promise<{ success: boolean; error?: string }>;
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

function DealTimeline({ deal }: { deal: Deal }) {
  const steps = [
    { label: 'المطابقة', done: true, date: deal.created_at },
    { label: 'اعتماد المورد', done: !!deal.supplier_confirmed_at, date: deal.supplier_confirmed_at },
    { label: 'تأكيد المشتري', done: !!deal.buyer_confirmed_at, date: deal.buyer_confirmed_at },
    { label: 'التنفيذ والتسليم', done: deal.status === 'execution_in_progress' || deal.status === 'in_delivery' || deal.status === 'completed', date: deal.delivery_started_at },
    { label: 'مكتملة', done: deal.status === 'completed', date: deal.completed_at },
  ];

  const currentIdx = steps.findIndex(s => !s.done);
  const activeIdx = currentIdx === -1 ? steps.length - 1 : currentIdx;

  return (
    <div className="bg-white rounded-2xl border border-[#e2edf5] overflow-hidden">
      <div className="px-4 py-2.5 border-b border-[#f0f6fa] bg-[#f8fbfd]">
        <p className="text-[11px] font-bold text-[#4a7a94]">مسار الصفقة</p>
      </div>
      <div className="p-4">
        <div className="flex items-start gap-3" dir="rtl">
          <div className="flex flex-col items-center gap-0">
            {steps.map((step, i) => (
              <div key={i} className="flex flex-col items-center">
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                    step.done
                      ? 'bg-[#059669]'
                      : i === activeIdx
                        ? 'bg-[#0369A1] ring-4 ring-[#BAE6FD]'
                        : 'bg-gray-200'
                  }`}
                >
                  {step.done ? (
                    <CheckCircle2 className="w-3 h-3 text-white" />
                  ) : i === activeIdx ? (
                    <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-gray-400" />
                  )}
                </div>
                {i < steps.length - 1 && (
                  <div className={`w-0.5 h-5 ${step.done ? 'bg-[#059669]' : 'bg-gray-200'}`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex-1 space-y-[14px] pt-0.5">
            {steps.map((step, i) => (
              <div key={i}>
                <p className={`text-[11px] font-bold ${step.done ? 'text-[#059669]' : i === activeIdx ? 'text-[#0369A1]' : 'text-gray-400'}`}>
                  {step.label}
                </p>
                {step.done && step.date && (
                  <p className="text-[9px] text-[#b0c4d0] mt-0.5">
                    {new Date(step.date).toLocaleString('ar-SA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ExecutionCountdown({ deadline, hours }: { deadline: string; hours: number }) {
  const [remaining, setRemaining] = useState('');
  const [progress, setProgress] = useState(100);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const totalMs = hours * 60 * 60 * 1000;

    const update = () => {
      const now = Date.now();
      const end = new Date(deadline).getTime();
      const diff = end - now;

      if (diff <= 0) {
        setRemaining('انتهت المهلة');
        setProgress(0);
        setIsExpired(true);
        return;
      }

      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      setRemaining(h > 0 ? `${h} ساعة ${m} دقيقة` : `${m} دقيقة`);
      setProgress(Math.min(100, (diff / totalMs) * 100));
      setIsExpired(false);
    };

    update();
    const interval = setInterval(update, 30000);
    return () => clearInterval(interval);
  }, [deadline, hours]);

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ border: `1.5px solid ${isExpired ? '#FECACA' : '#BAE6FD'}` }}
    >
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ background: isExpired ? '#FEF2F2' : '#E0F2FE' }}
      >
        <div className="flex items-center gap-2">
          <Timer className="w-4 h-4" style={{ color: isExpired ? '#dc2626' : '#0369A1' }} />
          <div>
            <p className="text-[12px] font-black" style={{ color: isExpired ? '#dc2626' : '#0369A1' }}>
              {remaining}
            </p>
            <p className="text-[9px] mt-0.5" style={{ color: isExpired ? '#f87171' : '#0284C7' }}>
              مهلة {hours} ساعة للتنفيذ
            </p>
          </div>
        </div>
        <Play className="w-5 h-5" style={{ color: isExpired ? '#dc2626' : '#0369A1' }} />
      </div>
      <div className="h-1.5" style={{ background: isExpired ? '#FECACA' : '#BAE6FD' }}>
        <div
          className="h-full transition-all duration-1000"
          style={{
            width: `${progress}%`,
            background: isExpired ? '#dc2626' : progress < 25 ? '#f59e0b' : '#0369A1',
          }}
        />
      </div>
    </div>
  );
}

export default function DealDetailSheet({
  deal, isBuyer, counterparty, actionLoading, onClose,
  onSupplierConfirm, onBuyerConfirm, onBuyerConfirmWithDeadline,
  onStartDelivery, onConfirmDelivery, onFailDelivery, onCancelDeal, onRate,
}: Props) {
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [supplierPledge, setSupplierPledge] = useState(false);
  const [selectedDeadline, setSelectedDeadline] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTemplate, setActiveTemplate] = useState<{ id: string; text: string } | null>(null);

  useEffect(() => {
    async function loadTemplate() {
      try {
        const role = isBuyer ? 'buyer' : 'supplier';
        const { data } = await supabase
          .from('whatsapp_templates')
          .select('id, template_text')
          .eq('is_active', true)
          .eq('is_default', true)
          .or(`sender_role.eq.${role},sender_role.eq.both`)
          .maybeSingle();
        if (data) setActiveTemplate({ id: data.id, text: data.template_text });
      } catch {
        // silently fail
      }
    }
    loadTemplate();
  }, [isBuyer]);

  const counterpartyName = counterparty?.company_name || counterparty?.display_name || (isBuyer ? 'مورد' : 'مشتري');
  const statusCfg = DEAL_STATUS_CONFIG[deal.status];
  const supplierPrice = deal.supplier_price ?? deal.final_price;
  const platformFee = deal.platform_fee_per_pallet ?? 0.25;
  const buyerUnitPrice = deal.buyer_price ?? (supplierPrice + platformFee);
  const unitPrice = isBuyer ? buyerUnitPrice : supplierPrice;
  const totalAmount = unitPrice * deal.quantity;
  const totalFee = deal.platform_fee ?? (platformFee * deal.quantity);

  const isLoading = actionLoading === deal.id;

  const isWaitingSupplier = deal.status === 'pending_confirmation' || deal.status === 'pending_supplier' || deal.status === 'matched';
  const isSupplierConfirmed = deal.status === 'supplier_confirmed';
  const isWaitingBuyer = deal.status === 'awaiting_buyer' || isSupplierConfirmed;
  const isReserved = deal.status === 'inventory_reserved';
  const isInDelivery = deal.status === 'in_delivery';
  const isExecution = deal.status === 'execution_in_progress';
  const isCompleted = deal.status === 'completed';
  const isCancelled = deal.status === 'cancelled';
  const isActive = !isCompleted && !isCancelled;

  const otherPhone = isBuyer ? deal.supplier_phone : deal.buyer_phone;
  const myRole: 'buyer' | 'supplier' = isBuyer ? 'buyer' : 'supplier';
  const showWhatsApp = isExecution || isInDelivery || isReserved || isCompleted;

  const canSupplierConfirm = !isBuyer && isWaitingSupplier;
  const canBuyerConfirmDeadline = isBuyer && isWaitingBuyer;
  const canConfirmDelivery = !isBuyer && (isExecution || isInDelivery);
  const canCancel = isActive && !isExecution && !isInDelivery;
  const canRate = isCompleted;

  const handleAction = async (action: (id: string) => Promise<{ success: boolean; error?: string }>) => {
    setError(null);
    const result = await action(deal.id);
    if (!result.success) {
      setError(result.error ?? 'حدث خطأ');
    }
  };

  const handleBuyerConfirmWithDeadline = async () => {
    if (!selectedDeadline) return;
    setError(null);
    const result = await onBuyerConfirmWithDeadline(deal.id, selectedDeadline);
    if (!result.success) {
      setError(result.error ?? 'حدث خطأ');
    }
  };

  const getStatusIcon = () => {
    if (isExecution || isInDelivery) return <Play className="w-4 h-4" style={{ color: statusCfg?.color }} />;
    if (isCompleted) return <CheckCircle2 className="w-4 h-4" style={{ color: '#16a34a' }} />;
    if (isCancelled) return <XCircle className="w-4 h-4" style={{ color: '#dc2626' }} />;
    if (isWaitingSupplier) return <Clock className="w-4 h-4 animate-pulse" style={{ color: statusCfg?.color }} />;
    if (isWaitingBuyer) return <Clock className="w-4 h-4 animate-pulse" style={{ color: statusCfg?.color }} />;
    return <Handshake className="w-4 h-4" style={{ color: statusCfg?.color }} />;
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
            {getStatusIcon()}
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-black" style={{ color: statusCfg?.color ?? '#1a2f3e' }}>
                {statusCfg?.label ?? deal.status}
              </p>
              <p className="text-[10px] mt-0.5" style={{ color: `${statusCfg?.color ?? '#6b7280'}99` }}>
                {isBuyer ? 'أنت المشتري في هذه الصفقة' : 'أنت المورد في هذه الصفقة'}
              </p>
            </div>
          </div>

          <DealTimeline deal={deal} />

          {(isExecution || isInDelivery) && deal.execution_deadline && deal.execution_hours && (
            <ExecutionCountdown deadline={deal.execution_deadline} hours={deal.execution_hours} />
          )}

          <div className="bg-white rounded-2xl border border-[#e2edf5] overflow-hidden">
            <div className="px-4 py-2.5 border-b border-[#f0f6fa] bg-[#f8fbfd]">
              <p className="text-[11px] font-bold text-[#4a7a94]">ملخص الصفقة</p>
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
                    <span className="text-[11px] text-[#7a9aab]">عمولة المنصة</span>
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
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[12px] font-bold text-[#F59E0B]">{totalFee.toLocaleString('ar-SA')} ر.س</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-[#7a9aab]">عمولة المنصة ({platformFee} x {deal.quantity})</span>
                    <CreditCard className="w-3.5 h-3.5 text-[#F59E0B]" />
                  </div>
                </div>
              )}
              <div className="border-t-2 border-[#e2edf5] pt-3">
                <div className="flex items-center justify-between bg-[#0f2535] rounded-xl px-4 py-3">
                  <span className="text-[16px] font-black text-white">{totalAmount.toLocaleString('ar-SA')} ر.س</span>
                  <span className="text-[11px] font-bold text-white/70">المبلغ الإجمالي</span>
                </div>
              </div>
            </div>
          </div>

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

          {canSupplierConfirm && (
            <div className="space-y-3">
              <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-xl p-3 text-right space-y-2">
                <p className="text-[11px] font-black text-[#92400E]">عمولة المنصة</p>
                <p className="text-[10px] leading-relaxed text-[#92400E]">
                  عمولة المنصة: <span className="font-black">{platformFee} ر.س</span> لكل طبلية
                </p>
                <p className="text-[10px] leading-relaxed text-[#92400E]">
                  إجمالي العمولة: <span className="font-black">{totalFee.toLocaleString('ar-SA')} ر.س</span> ({deal.quantity} طبلية)
                </p>
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
                  أوافق على تحصيل عمولة المنصة من المشتري عند إتمام هذه الصفقة
                </span>
              </button>
              <button
                disabled={isLoading || !supplierPledge}
                onClick={() => handleAction(onSupplierConfirm)}
                className="w-full py-3.5 rounded-2xl text-[13px] font-bold text-white active:scale-[0.97] transition-transform disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)', boxShadow: '0 4px 16px rgba(22,163,74,0.3)' }}
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'تأكيد اعتماد الصفقة'}
              </button>
            </div>
          )}

          {canBuyerConfirmDeadline && (
            <div className="space-y-3">
              <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl p-3 text-right">
                <p className="text-[11px] font-black text-[#1E40AF] mb-1">تأكيد الشراء وتحديد المهلة</p>
                <p className="text-[10px] text-[#3b82f6] leading-relaxed">
                  بعد التأكيد سيبدأ مؤقت لمهلة التنفيذ ويمكنكم التواصل عبر واتساب لتنسيق الدفع والتسليم
                </p>
              </div>

              <div>
                <p className="text-[11px] font-bold text-[#4a7a94] mb-2">اختر مهلة تنفيذ الصفقة</p>
                <div className="grid grid-cols-3 gap-2">
                  {[24, 48, 72].map(h => (
                    <button
                      key={h}
                      onClick={() => setSelectedDeadline(h)}
                      className="py-3 rounded-xl text-center transition-all border-2"
                      style={{
                        background: selectedDeadline === h ? '#0369A1' : 'white',
                        borderColor: selectedDeadline === h ? '#0369A1' : '#e2edf5',
                        color: selectedDeadline === h ? 'white' : '#1a4a5e',
                      }}
                    >
                      <p className="text-[16px] font-black">{h}</p>
                      <p className="text-[9px] font-bold mt-0.5" style={{ color: selectedDeadline === h ? 'rgba(255,255,255,0.7)' : '#7a9aab' }}>
                        ساعة
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              <button
                disabled={isLoading || !selectedDeadline}
                onClick={handleBuyerConfirmWithDeadline}
                className="w-full py-3.5 rounded-2xl text-[13px] font-bold text-white active:scale-[0.97] transition-transform disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', boxShadow: '0 4px 16px rgba(37,99,235,0.25)' }}
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : (
                  <span className="flex items-center justify-center gap-2">
                    <ShieldCheck className="w-4 h-4" />
                    تأكيد الشراء
                  </span>
                )}
              </button>
            </div>
          )}

          {showWhatsApp && otherPhone && (
            <a
              href={buildWhatsAppLink(otherPhone, myRole, deal, activeTemplate?.text)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                logWhatsAppContact({
                  deal_id: deal.id,
                  deal_ref: deal.deal_ref,
                  sender_phone: myRole === 'buyer' ? (deal.buyer_phone ?? '') : (deal.supplier_phone ?? ''),
                  sender_role: myRole,
                  recipient_phone: otherPhone,
                  template_id: activeTemplate?.id,
                  message_preview: activeTemplate ? activeTemplate.text.slice(0, 100) : undefined,
                  context_data: { pallet_type: deal.pallet_type, quantity: deal.quantity, city: deal.city },
                });
              }}
              className="flex items-center justify-center gap-2.5 w-full py-3 rounded-xl text-[13px] font-bold text-white active:scale-[0.97] transition-transform"
              style={{ background: 'linear-gradient(135deg, #25D366, #128C7E)', boxShadow: '0 4px 14px rgba(37,211,102,0.3)' }}
            >
              <MessageCircle className="w-4 h-4" />
              <span>التواصل عبر واتساب</span>
            </a>
          )}

          {canConfirmDelivery && !isBuyer && (
            <div className="space-y-2">
              <p className="text-[11px] font-bold text-[#4a7a94] text-right">بعد إتمام التسليم</p>
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
                  تأكيد التسليم
                </button>
              </div>
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
