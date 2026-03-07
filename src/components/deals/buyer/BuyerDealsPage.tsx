import { useState, useEffect } from 'react';
import { ArrowRight, ShoppingBag, RefreshCw, Bell, Package, CheckCircle, MessageCircle, CreditCard, Truck, Clock, Loader2, ShieldCheck, Star } from 'lucide-react';
import { useBuyerDeals } from '../../../hooks/useBuyerDeals';
import type { SupplierInfo } from '../../../hooks/useBuyerDeals';
import { DEAL_STATUS_CONFIG } from '../../../types/deal';
import type { Deal } from '../../../types/deal';
import { ActionToast } from '../../shared/ActionToast';
import type { ToastConfig } from '../../shared/ActionToast';
import RatingDialog from '../shared/RatingDialog';

type Tab = 'awaiting' | 'active' | 'ended';

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
  { id: 'awaiting', label: 'بانتظار موافقتك', icon: Bell },
  { id: 'active', label: 'صفقات جارية', icon: Package },
  { id: 'ended', label: 'صفقات منتهية', icon: CheckCircle },
];

function DealInfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[12px] font-bold text-[#1a2f3e]">{value}</span>
      <span className="text-[11px] text-[#7a9aab]">{label}</span>
    </div>
  );
}

function AwaitingDealCard({ deal, supplierInfo, onConfirm, loading }: {
  deal: Deal; supplierInfo: SupplierInfo | null; onConfirm: () => void; loading: boolean;
}) {
  const supplierName = supplierInfo?.company_name || supplierInfo?.display_name || 'مورد';
  const platformFee = deal.platform_fee_per_pallet ?? 1;
  const buyerUnitPrice = deal.final_price + platformFee;
  const totalAmount = buyerUnitPrice * deal.quantity;

  return (
    <div className="bg-white rounded-2xl border-2 border-[#2563eb]/20 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5" style={{ background: '#EFF6FF', borderBottom: '1px solid #DBEAFE' }}>
        <span className="text-[10px] font-mono text-[#6B7280]">{deal.deal_ref}</span>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#2563eb] text-white animate-pulse">
          بانتظار موافقتك
        </span>
      </div>
      <div className="p-4 space-y-2.5">
        <DealInfoRow label="المورد" value={supplierName} />
        <DealInfoRow label="المدينة" value={deal.city} />
        <DealInfoRow label="الكمية" value={`${deal.quantity.toLocaleString('ar-SA')} طبلية`} />
        <DealInfoRow label="المقاس" value={`${deal.pallet_type} · ${deal.size} · درجة ${deal.quality}`} />
        <DealInfoRow label="سعر المورد" value={`${deal.final_price.toLocaleString('ar-SA')} ر.س / طبلية`} />

        <div className="border-t border-[#f0f6fa] pt-2.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#F59E0B]">{platformFee} ر.س / طبلية</span>
            <span className="text-[11px] text-[#7a9aab]">رسوم المنصة</span>
          </div>
          <div className="flex items-center justify-between bg-[#F8FAFC] rounded-xl px-3 py-2">
            <span className="text-[13px] font-bold text-[#1a2f3e]">{buyerUnitPrice.toLocaleString('ar-SA')} ر.س / طبلية</span>
            <span className="text-[11px] font-bold text-[#1a4a5e]">السعر النهائي للوحدة</span>
          </div>
        </div>

        <div className="border-t-2 border-[#e2edf5] pt-3">
          <div className="flex items-center justify-between bg-[#0f2535] rounded-xl px-4 py-3">
            <span className="text-[16px] font-black text-white">{totalAmount.toLocaleString('ar-SA')} ر.س</span>
            <span className="text-[11px] font-bold text-white/70">المبلغ الإجمالي</span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-1.5 pt-1">
          <span className="text-[10px] text-[#7a9aab]">الدفع عند المعاينة</span>
          <CreditCard className="w-3 h-3 text-[#7a9aab]" />
        </div>
      </div>
      <div className="px-4 pb-4">
        <button
          disabled={loading}
          onClick={onConfirm}
          className="w-full py-3 rounded-xl text-[13px] font-bold text-white active:scale-[0.97] transition-transform disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', boxShadow: '0 4px 16px rgba(37,99,235,0.25)' }}
        >
          {loading ? 'جارٍ التأكيد...' : 'تأكيد الشراء'}
        </button>
      </div>
    </div>
  );
}

function ActiveDealCard({ deal, supplierInfo }: { deal: Deal; supplierInfo: SupplierInfo | null }) {
  const supplierName = supplierInfo?.company_name || supplierInfo?.display_name || 'مورد';
  const unitPrice = deal.buyer_price ?? (deal.final_price + (deal.platform_fee_per_pallet ?? 1));
  const totalAmount = unitPrice * deal.quantity;
  const isInDelivery = deal.status === 'in_delivery';
  const statusCfg = isInDelivery
    ? DEAL_STATUS_CONFIG.in_delivery
    : { label: 'تم التأكيد', color: '#166534', bg: '#F0FDF4' };

  return (
    <div className="bg-white rounded-2xl border border-[#e2edf5] shadow-sm overflow-hidden" style={isInDelivery ? { borderColor: '#BAE6FD' } : {}}>
      <div
        className="flex items-center justify-between px-4 py-2.5 border-b"
        style={isInDelivery ? { background: '#E0F2FE', borderColor: '#BAE6FD' } : { borderColor: '#f0f6fa' }}
      >
        <span className="text-[10px] font-mono text-[#7a9aab]">{deal.deal_ref}</span>
        <div className="flex items-center gap-1.5">
          {isInDelivery && <div className="w-1.5 h-1.5 rounded-full bg-[#0369A1] animate-pulse" />}
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: statusCfg.bg, color: statusCfg.color }}
          >
            {isInDelivery ? (
              <span className="flex items-center gap-1"><Truck className="w-2.5 h-2.5 inline" /> جاري التسليم</span>
            ) : statusCfg.label}
          </span>
        </div>
      </div>
      <div className="p-4 space-y-2.5">
        <DealInfoRow label="المورد" value={supplierName} />
        <DealInfoRow label="المدينة" value={deal.city} />
        <DealInfoRow label="النوع" value={`${deal.pallet_type} · ${deal.size} · درجة ${deal.quality}`} />
        <DealInfoRow label="الكمية" value={`${deal.quantity.toLocaleString('ar-SA')} طبلية`} />
        <DealInfoRow label="سعر الوحدة" value={`${unitPrice.toLocaleString('ar-SA')} ر.س`} />

        <div className="border-t-2 border-[#e2edf5] pt-3">
          <div className="flex items-center justify-between bg-[#0f2535] rounded-xl px-4 py-3">
            <span className="text-[16px] font-black text-white">{totalAmount.toLocaleString('ar-SA')} ر.س</span>
            <span className="text-[11px] font-bold text-white/70">المبلغ الإجمالي</span>
          </div>
        </div>

        <div className="border-t border-[#f0f6fa] pt-3">
          <a
            href={buildWhatsAppLink(deal.supplier_phone, 'buyer', deal)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2.5 w-full py-3 rounded-xl text-[13px] font-bold text-white active:scale-[0.97] transition-transform"
            style={{ background: 'linear-gradient(135deg, #25D366, #128C7E)', boxShadow: '0 4px 14px rgba(37,211,102,0.3)' }}
          >
            <MessageCircle className="w-4.5 h-4.5" />
            <span>تواصل مع المورد عبر واتساب</span>
          </a>
        </div>
      </div>
    </div>
  );
}

function EndedDealCard({ deal, supplierInfo, onRate }: { deal: Deal; supplierInfo: SupplierInfo | null; onRate: () => void }) {
  const cfg = DEAL_STATUS_CONFIG[deal.status];
  const isCompleted = deal.status === 'completed';
  const unitPrice = deal.buyer_price ?? (deal.final_price + (deal.platform_fee_per_pallet ?? 1));
  const totalAmount = unitPrice * deal.quantity;
  const supplierName = supplierInfo?.company_name || supplierInfo?.display_name || 'مورد';

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
          <span className="text-[12px] font-bold text-[#1a2f3e]">{supplierName}</span>
          <span className="text-[11px] text-[#7a9aab]">المورد</span>
        </div>
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
          <span className="text-[12px] font-bold text-[#1a2f3e]">{unitPrice.toLocaleString('ar-SA')} ر.س / طبلية</span>
          <span className="text-[11px] text-[#7a9aab]">سعر الوحدة</span>
        </div>

        <div className="border-t border-[#f0f6fa] pt-2">
          <div className="flex items-center justify-between bg-[#0f2535] rounded-xl px-3 py-2.5">
            <span className="text-[14px] font-black text-white">{totalAmount.toLocaleString('ar-SA')} ر.س</span>
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
              <span>تقييم المورد</span>
            </button>
            <a
              href={buildWhatsAppLink(deal.supplier_phone, 'buyer', deal)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2.5 w-full py-2.5 rounded-xl text-[12px] font-bold text-white active:scale-[0.97] transition-transform"
              style={{ background: 'linear-gradient(135deg, #25D366, #128C7E)', boxShadow: '0 3px 10px rgba(37,211,102,0.3)' }}
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>تواصل مع المورد</span>
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

function PendingSupplierDealCard({ deal, supplierInfo }: { deal: Deal; supplierInfo: SupplierInfo | null }) {
  const supplierName = supplierInfo?.company_name || supplierInfo?.display_name || 'مورد';
  const totalAmount = deal.final_price;

  return (
    <div className="bg-white rounded-2xl border-2 border-amber-200 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5" style={{ background: '#FFFBEB', borderBottom: '1px solid #FDE68A' }}>
        <span className="text-[10px] font-mono text-[#6B7280]">{deal.deal_ref}</span>
        <div className="flex items-center gap-1.5">
          <Loader2 className="w-3 h-3 text-amber-600 animate-spin" />
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
            بانتظار موافقة المورد
          </span>
        </div>
      </div>
      <div className="p-4 space-y-2.5">
        <DealInfoRow label="المورد" value={supplierName} />
        <DealInfoRow label="المدينة" value={deal.city} />
        <DealInfoRow label="الكمية" value={`${deal.quantity.toLocaleString('ar-SA')} طبلية`} />
        <DealInfoRow label="النوع" value={`${deal.pallet_type} · ${deal.size} · درجة ${deal.quality}`} />
        {totalAmount > 0 && (
          <DealInfoRow label="السعر المبدئي" value={`${totalAmount.toLocaleString('ar-SA')} ر.س`} />
        )}

        <div className="border-t border-[#f0f6fa] pt-3">
          <div className="flex items-center gap-2 justify-center py-2.5 rounded-xl bg-amber-50 border border-amber-200">
            <Clock className="w-4 h-4 text-amber-600" />
            <span className="text-[12px] font-bold text-amber-700">
              في انتظار رد المورد على طلبك
            </span>
          </div>
        </div>

        <div className="border-t border-[#f0f6fa] pt-3">
          <div className="flex items-center gap-2 justify-center py-2 rounded-xl bg-[#f5f9fc] border border-[#e2edf5]" dir="rtl">
            <ShieldCheck className="w-3.5 h-3.5 text-[#4a7a94]" />
            <span className="text-[10px] text-[#4a7a94] font-semibold">
              سيتم الكشف عن معلومات التواصل بعد تأكيد الصفقة
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ tab }: { tab: Tab }) {
  const messages: Record<Tab, { title: string; sub: string }> = {
    awaiting: { title: 'لا توجد صفقات بانتظار موافقتك', sub: 'عندما يوافق مورد على طلبك ستظهر الصفقة هنا لتأكيدها' },
    active: { title: 'لا توجد صفقات جارية', sub: 'الصفقات التي تم حجز مخزونها ستظهر هنا' },
    ended: { title: 'لا توجد صفقات منتهية', sub: 'الصفقات المكتملة والملغاة ستظهر هنا' },
  };
  const m = messages[tab];
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <div className="w-16 h-16 rounded-2xl bg-white border border-dashed border-[#d0e6f0] flex items-center justify-center">
        <ShoppingBag className="w-7 h-7 text-[#c0d5e0]" />
      </div>
      <p className="text-[13px] font-bold text-[#a0b5c0]">{m.title}</p>
      <p className="text-[11px] text-[#c0d0da] text-center px-8">{m.sub}</p>
    </div>
  );
}

export default function BuyerDealsPage({ phone, onClose }: Props) {
  const {
    loading, actionLoading,
    awaitingDeals, activeDeals, endedDeals,
    confirmPurchase, getSupplierInfo,
    refresh,
  } = useBuyerDeals(phone);

  const [activeTab, setActiveTab] = useState<Tab>('awaiting');
  const [toast, setToast] = useState<ToastConfig | null>(null);
  const [ratingDialog, setRatingDialog] = useState<{ dealId: string; supplierPhone: string; supplierName: string } | null>(null);

  const handleConfirmPurchase = async (dealId: string) => {
    const result = await confirmPurchase(dealId);
    if (result?.success) {
      setToast({
        title: 'شكراً لك على تأكيد طلبك',
        message: 'تم استلام موافقتك بنجاح — سيتواصل معك المورد فوراً لإتمام التسليم',
        variant: 'success',
      });
      setActiveTab('active');
    }
  };

  const handleOpenRating = (deal: Deal, supplierInfo: SupplierInfo | null) => {
    const supplierName = supplierInfo?.company_name || supplierInfo?.display_name || 'المورد';
    setRatingDialog({
      dealId: deal.id,
      supplierPhone: deal.supplier_phone,
      supplierName,
    });
  };

  const handleRatingSubmitted = () => {
    refresh();
  };

  const counts = { awaiting: awaitingDeals.length, active: activeDeals.length, ended: endedDeals.length };
  const total = counts.awaiting + counts.active + counts.ended;

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
        <div
          className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #0f2535, #1a3d56)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}
        >
          <div className="flex items-center gap-2">
            <button
              onClick={refresh}
              className={`w-8 h-8 rounded-full bg-white/15 flex items-center justify-center ${loading ? 'animate-spin' : ''}`}
            >
              <RefreshCw className="w-3.5 h-3.5 text-white" />
            </button>
            {counts.awaiting > 0 && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#2563eb] text-white animate-pulse">
                {counts.awaiting} جديد
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right">
              <p className="text-[14px] font-bold text-white">طلباتي</p>
              <p className="text-[10px] text-white/60">{total} صفقة إجمالاً</p>
            </div>
            <ShoppingBag className="w-5 h-5 text-white/80" />
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
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-bold transition-all"
                  style={{ background: isActive ? '#1a4a5e' : 'transparent', color: isActive ? 'white' : '#4a6a7e' }}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{label}</span>
                  <span className="sm:hidden">{label.split(' ')[0]}</span>
                  {count > 0 && (
                    <span
                      className="text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{
                        background: isActive ? 'rgba(255,255,255,0.25)' : id === 'awaiting' ? '#2563eb' : '#e2ecf3',
                        color: isActive ? 'white' : id === 'awaiting' ? 'white' : '#2c5f7c',
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
                <div key={i} className="h-40 bg-white rounded-2xl animate-pulse border border-gray-100" />
              ))}
            </div>
          ) : activeTab === 'awaiting' ? (
            awaitingDeals.length === 0 ? <EmptyState tab="awaiting" /> : (
              <div className="space-y-4">
                {awaitingDeals.map(deal => (
                  deal.status === 'pending_supplier' || deal.status === 'matched' || deal.status === 'supplier_confirmed' ? (
                    <PendingSupplierDealCard
                      key={deal.id}
                      deal={deal}
                      supplierInfo={getSupplierInfo(deal.supplier_phone)}
                    />
                  ) : (
                    <AwaitingDealCard
                      key={deal.id}
                      deal={deal}
                      supplierInfo={getSupplierInfo(deal.supplier_phone)}
                      onConfirm={() => handleConfirmPurchase(deal.id)}
                      loading={actionLoading === deal.id}
                    />
                  )
                ))}
              </div>
            )
          ) : activeTab === 'active' ? (
            activeDeals.length === 0 ? <EmptyState tab="active" /> : (
              <div className="space-y-3">
                {activeDeals.map(deal => (
                  <ActiveDealCard
                    key={deal.id}
                    deal={deal}
                    supplierInfo={getSupplierInfo(deal.supplier_phone)}
                  />
                ))}
              </div>
            )
          ) : (
            endedDeals.length === 0 ? <EmptyState tab="ended" /> : (
              <div className="space-y-3">
                {endedDeals.map(deal => (
                  <EndedDealCard
                    key={deal.id}
                    deal={deal}
                    supplierInfo={getSupplierInfo(deal.supplier_phone)}
                    onRate={() => handleOpenRating(deal, getSupplierInfo(deal.supplier_phone))}
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
        ratedUserPhone={ratingDialog.supplierPhone}
        ratedUserName={ratingDialog.supplierName}
        userType="supplier"
        onRatingSubmitted={handleRatingSubmitted}
      />
    )}
    </>
  );
}
