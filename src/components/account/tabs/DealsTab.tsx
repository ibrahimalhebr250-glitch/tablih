import { useState } from 'react';
import {
  Handshake,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Zap,
  MessageSquare,
  Clock,
  Check,
  X,
} from 'lucide-react';
import { useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAccountDeals } from '../../../hooks/useAccountDeals';
import { ActiveDealCard, CompletedDealCard, CancelledDealCard } from '../deals/DealCards';
import DealDetailSheet from '../deals/DealDetailSheet';
import RatingDialog from '../../deals/shared/RatingDialog';
import { ActionToast } from '../../shared/ActionToast';
import type { ToastConfig } from '../../shared/ActionToast';
import type { Deal } from '../../../types/deal';

type DealFilter = 'active' | 'completed' | 'cancelled';

interface Props {
  phone: string;
}

const FILTERS: { key: DealFilter; label: string; icon: typeof Handshake; color: string; activeColor: string }[] = [
  { key: 'active', label: 'النشطة', icon: Zap, color: '#B45309', activeColor: '#FFFBEB' },
  { key: 'completed', label: 'المكتملة', icon: CheckCircle2, color: '#059669', activeColor: '#ECFDF5' },
  { key: 'cancelled', label: 'الملغاة', icon: XCircle, color: '#dc2626', activeColor: '#FEF2F2' },
];

interface NegotiationRequest {
  id: string;
  inventory_batch_id: string;
  buyer_phone: string;
  pallet_type: string;
  size: string;
  quality: string;
  city: string;
  available_quantity: number;
  price_per_pallet: number;
  buyer_message?: string;
  status: string;
  created_at: string;
}

function SupplierNegotiationRequests({ phone }: { phone: string }) {
  const [requests, setRequests] = useState<NegotiationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [responseText, setResponseText] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('negotiation_requests')
      .select('id, inventory_batch_id, buyer_phone, pallet_type, size, quality, city, available_quantity, price_per_pallet, buyer_message, status, created_at')
      .eq('supplier_phone', phone)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    setRequests(data || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel('supplier_negotiation_' + phone)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'negotiation_requests', filter: `supplier_phone=eq.${phone}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [phone]);

  const [acceptResult, setAcceptResult] = useState<{ dealRef: string; quantity: number } | null>(null);

  const handleAccept = async (req: NegotiationRequest) => {
    setActionId(req.id);
    try {
      const { data, error } = await supabase.rpc('accept_negotiation_and_create_deal', {
        p_request_id: req.id,
        p_supplier_phone: phone,
        p_supplier_response: responseText[req.id] || null,
        p_quantity: req.available_quantity,
      });
      if (error) throw error;
      if (data?.success) {
        setAcceptResult({ dealRef: data.deal_ref, quantity: data.quantity });
        setTimeout(() => setAcceptResult(null), 4000);
        load();
      }
    } finally {
      setActionId(null);
    }
  };

  const handleReject = async (req: NegotiationRequest) => {
    setActionId(req.id);
    try {
      const { error } = await supabase
        .from('negotiation_requests')
        .update({ status: 'rejected', supplier_response: responseText[req.id] || null, updated_at: new Date().toISOString() })
        .eq('id', req.id);
      if (!error) load();
    } finally {
      setActionId(null);
    }
  };

  if (loading) return null;
  if (requests.length === 0 && !acceptResult) return null;

  return (
    <div className="space-y-2">
      {acceptResult && (
        <div
          className="rounded-2xl p-4 flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300"
          style={{ background: '#ECFDF5', border: '1.5px solid #A7F3D0', boxShadow: '0 4px 12px rgba(5,150,105,0.12)' }}
          dir="rtl"
        >
          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-[13px] font-black text-green-700">تم إنشاء الصفقة بنجاح</p>
            <p className="text-[11px] text-green-600 mt-0.5">
              رقم الصفقة: {acceptResult.dealRef} — الكمية: {acceptResult.quantity} طبلية
            </p>
            <p className="text-[10px] text-green-500 mt-1">ستظهر في الصفقات النشطة أدناه</p>
          </div>
        </div>
      )}

      {requests.length > 0 && (
      <>
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
        <h3 className="text-[13px] font-black text-[#1a3a4a]">طلبات تفاوض واردة</h3>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#FFFBEB', color: '#b45309', border: '1px solid #FDE68A' }}>
          {requests.length}
        </span>
      </div>
      {requests.map(req => (
        <div
          key={req.id}
          className="rounded-2xl p-4 space-y-3"
          style={{ background: 'white', border: '1.5px solid #FDE68A', boxShadow: '0 2px 8px rgba(245,158,11,0.08)' }}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-[10px] text-[#a0b5c0]">
                {new Date(req.created_at).toLocaleDateString('ar-SA', { day: 'numeric', month: 'short' })}
              </span>
            </div>
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
            <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: '#f0f4f8', color: '#4a7a8a' }}>
              {req.buyer_phone}
            </span>
          </div>

          {req.buyer_message && (
            <div className="rounded-xl p-2.5 text-right" style={{ background: '#f8fbfd', border: '1px solid #e2edf5' }}>
              <div className="flex items-center gap-1.5 mb-1">
                <MessageSquare className="w-3 h-3 text-[#7a9aab]" />
                <span className="text-[10px] font-bold text-[#7a9aab]">رسالة المشتري</span>
              </div>
              <p className="text-[12px] text-[#1a3a4a] leading-relaxed">{req.buyer_message}</p>
            </div>
          )}

          <textarea
            value={responseText[req.id] || ''}
            onChange={(e) => setResponseText(prev => ({ ...prev, [req.id]: e.target.value }))}
            placeholder="رد اختياري للمشتري..."
            rows={2}
            maxLength={200}
            dir="rtl"
            className="w-full rounded-xl px-3 py-2 text-[12px] text-[#1a3a4a] resize-none outline-none"
            style={{ background: '#f8fbfd', border: '1px solid #e2edf5' }}
          />

          <div className="flex gap-2">
            <button
              onClick={() => handleReject(req)}
              disabled={actionId === req.id}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[12px] font-bold text-[#dc2626] disabled:opacity-50"
              style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}
            >
              <X className="w-3.5 h-3.5" />
              رفض
            </button>
            <button
              onClick={() => handleAccept(req)}
              disabled={actionId === req.id}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[12px] font-black text-white disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #059669, #10b981)', boxShadow: '0 3px 10px rgba(5,150,105,0.25)' }}
            >
              {actionId === req.id ? (
                <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              قبول وبدء الصفقة
            </button>
          </div>
        </div>
      ))}
      <div className="h-px" style={{ background: '#e2edf5' }} />
      </>
      )}
    </div>
  );
}

export default function DealsTab({ phone }: Props) {
  const {
    activeDeals, completedDeals, cancelledDeals,
    loading, actionLoading,
    getCounterparty, isBuyer,
    supplierConfirm, buyerConfirm, buyerConfirmWithDeadline,
    startDelivery, confirmDelivery, failDelivery, cancelDeal,
    refresh,
  } = useAccountDeals(phone);

  const [filter, setFilter] = useState<DealFilter>('active');
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [toast, setToast] = useState<ToastConfig | null>(null);
  const [ratingDialog, setRatingDialog] = useState<{
    dealId: string; ratedPhone: string; ratedName: string; userType: 'supplier' | 'buyer';
  } | null>(null);

  const counts = {
    active: activeDeals.length,
    completed: completedDeals.length,
    cancelled: cancelledDeals.length,
  };
  const totalDeals = counts.active + counts.completed + counts.cancelled;

  const currentDeals = filter === 'active' ? activeDeals
    : filter === 'completed' ? completedDeals
    : cancelledDeals;

  const handleAction = async (
    action: (id: string) => Promise<{ success: boolean; error?: string }>,
    dealId: string,
    successMsg: { title: string; message: string },
  ) => {
    const result = await action(dealId);
    if (result.success) {
      setToast({ ...successMsg, variant: 'success' });
      setSelectedDeal(null);
    }
    return result;
  };

  const handleBuyerConfirmDeadline = async (dealId: string, hours: number) => {
    const result = await buyerConfirmWithDeadline(dealId, hours);
    if (result.success) {
      setToast({ title: 'تم تأكيد الشراء', message: `بدأ مؤقت ${hours} ساعة — تواصل مع المورد عبر واتساب`, variant: 'success' });
      setSelectedDeal(null);
    }
    return result;
  };

  const handleRate = (deal: Deal) => {
    const buyer = isBuyer(deal);
    const cp = getCounterparty(deal);
    const ratedName = cp?.company_name || cp?.display_name || (buyer ? 'المورد' : 'المشتري');
    setRatingDialog({
      dealId: deal.id,
      ratedPhone: buyer ? deal.supplier_phone : deal.buyer_phone,
      ratedName,
      userType: buyer ? 'supplier' : 'buyer',
    });
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

      <SupplierNegotiationRequests phone={phone} />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-[#7a9aab]">{totalDeals} صفقة</span>
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
                  className="text-[9px] font-black w-4.5 h-4.5 min-w-[18px] rounded-full flex items-center justify-center"
                  style={{
                    background: isActive ? 'rgba(255,255,255,0.25)' : f.key === 'active' ? '#F59E0B' : '#e2ecf3',
                    color: isActive ? 'white' : f.key === 'active' ? 'white' : '#2c5f7c',
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
      ) : currentDeals.length === 0 ? (
        <EmptyDeals filter={filter} />
      ) : (
        <div className="space-y-3">
          {currentDeals.map(deal => {
            const buyer = isBuyer(deal);
            const cp = getCounterparty(deal);

            if (filter === 'active') {
              return (
                <ActiveDealCard
                  key={deal.id}
                  deal={deal}
                  isBuyer={buyer}
                  counterparty={cp}
                  onViewDetail={setSelectedDeal}
                />
              );
            }
            if (filter === 'completed') {
              return (
                <CompletedDealCard
                  key={deal.id}
                  deal={deal}
                  isBuyer={buyer}
                  counterparty={cp}
                  onViewDetail={setSelectedDeal}
                />
              );
            }
            return (
              <CancelledDealCard
                key={deal.id}
                deal={deal}
                isBuyer={buyer}
                counterparty={cp}
                onViewDetail={setSelectedDeal}
              />
            );
          })}
        </div>
      )}

      {selectedDeal && (
        <DealDetailSheet
          deal={selectedDeal}
          isBuyer={isBuyer(selectedDeal)}
          counterparty={getCounterparty(selectedDeal)}
          actionLoading={actionLoading}
          onClose={() => setSelectedDeal(null)}
          onSupplierConfirm={(id) => handleAction(supplierConfirm, id, { title: 'تم اعتماد الصفقة', message: 'في انتظار تأكيد المشتري واختيار المهلة' })}
          onBuyerConfirm={(id) => handleAction(buyerConfirm, id, { title: 'تم تأكيد الشراء', message: 'سيتواصل معك المورد لإتمام التسليم' })}
          onBuyerConfirmWithDeadline={handleBuyerConfirmDeadline}
          onStartDelivery={(id) => handleAction(startDelivery, id, { title: 'تم بدء التسليم', message: 'تواصل مع المشتري عبر واتساب لتنسيق الاستلام' })}
          onConfirmDelivery={(id) => handleAction(confirmDelivery, id, { title: 'تم تأكيد التسليم', message: 'الصفقة مكتملة — شكرا لتعاملك مع منصة العاديات' })}
          onFailDelivery={(id) => handleAction(failDelivery, id, { title: 'تم تسجيل فشل التسليم', message: 'تم إلغاء الصفقة وإعادة المخزون' })}
          onCancelDeal={(id) => handleAction(cancelDeal, id, { title: 'تم إلغاء الصفقة', message: 'تم إعادة المخزون كما كان' })}
          onRate={handleRate}
        />
      )}

      {ratingDialog && (
        <RatingDialog
          isOpen={true}
          onClose={() => setRatingDialog(null)}
          dealId={ratingDialog.dealId}
          raterPhone={phone}
          ratedUserPhone={ratingDialog.ratedPhone}
          ratedUserName={ratingDialog.ratedName}
          userType={ratingDialog.userType}
          onRatingSubmitted={refresh}
        />
      )}
    </div>
  );
}

function EmptyDeals({ filter }: { filter: DealFilter }) {
  const config = {
    active: {
      title: 'لا توجد صفقات نشطة',
      desc: 'عند إنشاء صفقات جديدة بعد المطابقة بين الطلبات والمخزون ستظهر هنا',
      color: '#B45309',
      bgFrom: '#FFFBEB',
      border: '#FDE68A',
      icon: Zap,
    },
    completed: {
      title: 'لا توجد صفقات مكتملة',
      desc: 'الصفقات التي تم إتمامها بنجاح وتسليم الطبليات ستظهر هنا',
      color: '#059669',
      bgFrom: '#ECFDF5',
      border: '#A7F3D0',
      icon: CheckCircle2,
    },
    cancelled: {
      title: 'لا توجد صفقات ملغاة',
      desc: 'الصفقات التي تم إلغاؤها ستظهر هنا مع سبب الإلغاء',
      color: '#6b7280',
      bgFrom: '#f3f4f6',
      border: '#e5e7eb',
      icon: XCircle,
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
      <p className="text-[12px] text-[#7a9aab] leading-relaxed max-w-[260px] mx-auto">{c.desc}</p>
    </div>
  );
}
