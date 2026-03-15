import { useEffect, useState } from 'react';
import {
  ArrowRight,
  HandCoins,
  Package,
  Banknote,
  Clock,
  FileText,
  User,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  XCircle,
  MessageCircle,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Box,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface SupplyRequest {
  id: string;
  pallet_type: string;
  size: string;
  condition: string;
  quantity: number;
  target_price: number | null;
  notes: string | null;
  request_type: string;
  status: string;
  created_at: string;
  city?: { name: string } | null;
}

interface SupplierOffer {
  id: string;
  supply_request_id: string;
  supplier_id: string | null;
  supplier_name: string;
  supplier_phone: string;
  quantity: number;
  price: number;
  delivery_time: string | null;
  notes: string | null;
  status: string;
  created_at: string;
}

const palletTypeLabel: Record<string, string> = {
  wooden:    'خشبية',
  plastic:   'بلاستيكية',
  metal:     'معدنية',
  cardboard: 'كرتونية',
};

const conditionConfig: Record<string, { label: string; color: string }> = {
  new:     { label: 'جديد',    color: 'bg-emerald-100 text-emerald-700' },
  good:    { label: 'جيد',     color: 'bg-sky-100 text-sky-700' },
  used:    { label: 'مستعمل', color: 'bg-amber-100 text-amber-700' },
  damaged: { label: 'تالف',   color: 'bg-red-100 text-red-700' },
};

const offerStatusConfig: Record<string, { label: string; color: string; bg: string }> = {
  pending:  { label: 'في الانتظار', color: 'text-amber-700',  bg: 'bg-amber-50 border-amber-200' },
  accepted: { label: 'مقبول',       color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
  rejected: { label: 'مرفوض',      color: 'text-red-600',     bg: 'bg-red-50 border-red-200' },
  completed:{ label: 'مكتمل',      color: 'text-blue-700',    bg: 'bg-blue-50 border-blue-200' },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ar-SA', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

interface RejectModalProps {
  supplierName: string;
  onConfirm: () => void;
  onClose: () => void;
  loading: boolean;
}

function RejectModal({ supplierName, onConfirm, onClose, loading }: RejectModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" dir="rtl">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden">
        <div className="bg-red-50 border-b border-red-100 px-6 py-5 flex items-start gap-3">
          <div className="w-10 h-10 bg-red-100 rounded-2xl flex items-center justify-center shrink-0 mt-0.5">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <p className="font-bold text-gray-800 text-sm">تأكيد رفض العرض</p>
            <p className="text-gray-500 text-xs mt-1">
              هل أنت متأكد من رفض عرض{' '}
              <span className="font-semibold text-gray-700">{supplierName}</span>؟
            </p>
          </div>
        </div>
        <div className="px-6 py-5 flex gap-2.5">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-3 rounded-2xl border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            تراجع
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white py-3 rounded-2xl text-sm font-bold transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <XCircle className="w-4 h-4" />
            )}
            رفض العرض
          </button>
        </div>
      </div>
    </div>
  );
}

interface CommitmentModalProps {
  offer: SupplierOffer;
  commission: number;
  onClose: () => void;
}

function CommitmentModal({ offer, commission, onClose }: CommitmentModalProps) {
  const [committed, setCommitted] = useState(false);
  const totalCommission = (commission * offer.quantity).toFixed(2);

  function openWhatsApp() {
    const phone = offer.supplier_phone.replace(/\D/g, '');
    const intlPhone = phone.startsWith('0') ? '966' + phone.slice(1) : phone;
    const msg = encodeURIComponent(
      `السلام عليكم، أنا مهتم بعرضك على طلب التوريد.\nالكمية: ${offer.quantity} طبلية\nالسعر: ${offer.price} ر.س / طبلية`
    );
    window.open(`https://wa.me/${intlPhone}?text=${msg}`, '_blank');
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" dir="rtl">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-md bg-white sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-br from-[#1a4a5e] to-[#2a6a82] px-5 py-4 flex items-center gap-3">
          <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm">تعهد العمولة</p>
            <p className="text-white/60 text-xs">قبل التواصل مع المورد</p>
          </div>
        </div>

        <div className="px-5 py-5 flex flex-col gap-4">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800 font-medium leading-relaxed">
                أتعهد بدفع عمولة المنصة عند إتمام الصفقة
              </p>
            </div>
            <div className="border-t border-amber-200 pt-3 flex flex-col gap-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-amber-700">عمولة الطبلية الواحدة</span>
                <span className="font-bold text-amber-800">{commission} ر.س</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-amber-700">عدد الطباليات</span>
                <span className="font-bold text-amber-800">{offer.quantity}</span>
              </div>
              <div className="flex justify-between text-sm border-t border-amber-200 pt-2 mt-1">
                <span className="text-amber-800 font-semibold">إجمالي العمولة المتوقعة</span>
                <span className="font-bold text-amber-900">{totalCommission} ر.س</span>
              </div>
            </div>
          </div>

          <label className="flex items-start gap-3 cursor-pointer group">
            <div
              onClick={() => setCommitted((v) => !v)}
              className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                committed
                  ? 'bg-[#1a4a5e] border-[#1a4a5e]'
                  : 'border-gray-300 group-hover:border-[#1a4a5e]'
              }`}
            >
              {committed && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
            </div>
            <span className="text-sm text-gray-700 leading-relaxed">
              أوافق على دفع عمولة المنصة البالغة{' '}
              <span className="font-bold text-[#1a4a5e]">{totalCommission} ر.س</span>{' '}
              عند إتمام هذه الصفقة
            </span>
          </label>

          <div className="flex gap-2.5">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-2xl border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition-colors"
            >
              إلغاء
            </button>
            <button
              disabled={!committed}
              onClick={openWhatsApp}
              className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white py-3 rounded-2xl text-sm font-bold transition-all active:scale-[0.98]"
            >
              <MessageCircle className="w-4 h-4" />
              فتح واتساب
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface OfferCardProps {
  offer: SupplierOffer;
  commission: number;
  onReject: () => void;
  onAccept: () => void;
  actionLoading: boolean;
  isJustAccepted: boolean;
}

function OfferCard({ offer, commission, onReject, onAccept, actionLoading, isJustAccepted }: OfferCardProps) {
  const [expanded, setExpanded] = useState(false);
  const statusCfg = offerStatusConfig[offer.status] ?? offerStatusConfig.pending;
  const isPending = offer.status === 'pending';
  const isAccepted = offer.status === 'accepted';

  return (
    <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${statusCfg.bg}`}>
      <div className="p-4 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-[#1a4a5e]/10 rounded-xl flex items-center justify-center shrink-0">
              <User className="w-4 h-4 text-[#1a4a5e]" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-800">{offer.supplier_name || 'مورد'}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{formatDate(offer.created_at)}</p>
            </div>
          </div>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${statusCfg.bg} ${statusCfg.color}`}>
            {statusCfg.label}
          </span>
        </div>

        {isJustAccepted && (
          <div className="flex items-center gap-2 bg-emerald-100 border border-emerald-200 rounded-xl px-3.5 py-2.5">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <p className="text-sm font-semibold text-emerald-800">
              تم قبول العرض بنجاح، يمكنك الآن التواصل عبر واتساب
            </p>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2">
          <div className="bg-gray-50 rounded-xl px-3 py-2.5 flex flex-col gap-0.5">
            <div className="flex items-center gap-1 text-[10px] text-gray-400">
              <Package className="w-3 h-3" />
              الكمية
            </div>
            <p className="text-xs font-bold text-gray-700">{offer.quantity} طبلية</p>
          </div>
          <div className="bg-gray-50 rounded-xl px-3 py-2.5 flex flex-col gap-0.5">
            <div className="flex items-center gap-1 text-[10px] text-gray-400">
              <Banknote className="w-3 h-3" />
              السعر
            </div>
            <p className="text-xs font-bold text-emerald-700">{offer.price} ر.س</p>
          </div>
          <div className="bg-gray-50 rounded-xl px-3 py-2.5 flex flex-col gap-0.5">
            <div className="flex items-center gap-1 text-[10px] text-gray-400">
              <Clock className="w-3 h-3" />
              التوريد
            </div>
            <p className="text-xs font-bold text-gray-700 leading-tight">{offer.delivery_time || '—'}</p>
          </div>
        </div>

        {offer.notes && (
          <div>
            <button
              onClick={() => setExpanded((v) => !v)}
              className="flex items-center gap-1 text-xs text-[#1a4a5e] font-medium hover:underline"
            >
              <FileText className="w-3.5 h-3.5" />
              ملاحظات
              {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            {expanded && (
              <p className="mt-1.5 text-xs text-gray-600 bg-gray-50 rounded-xl px-3 py-2 leading-relaxed">
                {offer.notes}
              </p>
            )}
          </div>
        )}
      </div>

      {(isPending || isAccepted) && (
        <div className="border-t border-gray-100 px-4 py-3 flex gap-2">
          {isPending && (
            <>
              <button
                onClick={onReject}
                disabled={actionLoading}
                className="flex-1 flex items-center justify-center gap-1.5 border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 rounded-xl py-2.5 text-xs font-bold transition-all"
              >
                <XCircle className="w-3.5 h-3.5" />
                رفض العرض
              </button>
              <button
                onClick={onAccept}
                disabled={actionLoading}
                className="flex-1 flex items-center justify-center gap-1.5 bg-[#1a4a5e] hover:bg-[#153d50] disabled:opacity-50 text-white rounded-xl py-2.5 text-xs font-bold transition-all active:scale-[0.98]"
              >
                {actionLoading ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
                قبول العرض
              </button>
            </>
          )}
          {isAccepted && (
            <button
              onClick={onAccept}
              className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-2.5 text-xs font-bold transition-all active:scale-[0.98]"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              تواصل مع المورد
            </button>
          )}
        </div>
      )}
    </div>
  );
}

interface Props {
  requestId: string;
  onBack: () => void;
}

export default function BuyerOffers({ requestId, onBack }: Props) {
  const [request, setRequest]       = useState<SupplyRequest | null>(null);
  const [offers, setOffers]         = useState<SupplierOffer[]>([]);
  const [commission, setCommission] = useState<number>(0.25);
  const [loading, setLoading]       = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [commitOffer, setCommitOffer] = useState<SupplierOffer | null>(null);
  const [justAcceptedId, setJustAcceptedId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<SupplierOffer | null>(null);
  const [rejectLoading, setRejectLoading] = useState(false);

  async function fetchData() {
    setLoading(true);
    setFetchError(null);

    const [reqRes, offersRes, settingsRes] = await Promise.all([
      supabase
        .from('supply_requests')
        .select('id, pallet_type, size, condition, quantity, target_price, notes, request_type, status, created_at, city:city_id(name)')
        .eq('id', requestId)
        .maybeSingle(),
      supabase
        .from('supplier_offers')
        .select('*')
        .eq('supply_request_id', requestId)
        .order('created_at', { ascending: false }),
      supabase
        .from('platform_settings')
        .select('setting_value')
        .eq('setting_key', 'platform_commission_per_pallet')
        .maybeSingle(),
    ]);

    if (reqRes.error || offersRes.error) {
      setFetchError('تعذّر تحميل البيانات، يرجى المحاولة مجدداً.');
    } else {
      setRequest(reqRes.data as unknown as SupplyRequest);
      setOffers((offersRes.data as unknown as SupplierOffer[]) ?? []);
      if (settingsRes.data?.setting_value) {
        const val = parseFloat(String(settingsRes.data.setting_value));
        if (!isNaN(val)) setCommission(val);
      }
    }

    setLoading(false);
  }

  useEffect(() => {
    fetchData();
  }, [requestId]);

  async function handleConfirmReject() {
    if (!rejectTarget) return;
    setRejectLoading(true);
    await supabase.from('supplier_offers').update({ status: 'rejected' }).eq('id', rejectTarget.id);
    setOffers((prev) => prev.map((o) => o.id === rejectTarget.id ? { ...o, status: 'rejected' } : o));
    setRejectLoading(false);
    setRejectTarget(null);
  }

  async function handleAccept(offer: SupplierOffer) {
    if (offer.status === 'pending') {
      setActionLoading(offer.id);
      await supabase.from('supplier_offers').update({ status: 'accepted' }).eq('id', offer.id);
      setOffers((prev) => prev.map((o) => o.id === offer.id ? { ...o, status: 'accepted' } : o));
      setJustAcceptedId(offer.id);
      setActionLoading(null);
    }
    setCommitOffer({ ...offer, status: offer.status === 'pending' ? 'accepted' : offer.status });
  }

  const palletLabel = palletTypeLabel[request?.pallet_type ?? ''] ?? (request?.pallet_type ?? '');
  const condition   = conditionConfig[request?.condition ?? ''] ?? { label: request?.condition ?? '', color: 'bg-gray-100 text-gray-600' };

  const pendingOffers  = offers.filter((o) => o.status === 'pending');
  const acceptedOffers = offers.filter((o) => o.status === 'accepted');
  const otherOffers    = offers.filter((o) => o.status !== 'pending' && o.status !== 'accepted');

  const orderedOffers = [...acceptedOffers, ...pendingOffers, ...otherOffers];

  return (
    <>
      <div className="min-h-screen flex flex-col" dir="rtl" style={{ background: 'linear-gradient(135deg, #eef4f8 0%, #f5f9fc 60%, #eaf2f7 100%)' }}>
        <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm">
          <div className="max-w-2xl mx-auto px-4 h-16 flex items-center gap-3">
            <button
              onClick={onBack}
              className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors text-[#1a4a5e]"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2.5 flex-1">
              <div className="w-8 h-8 bg-[#1a4a5e] rounded-lg flex items-center justify-center shadow">
                <HandCoins className="w-4 h-4 text-white" />
              </div>
              <span className="text-[#1a4a5e] font-bold text-base">عروض الموردين</span>
            </div>
            {!loading && offers.length > 0 && (
              <span className="bg-[#1a4a5e] text-white text-xs font-bold px-2.5 py-0.5 rounded-full">
                {offers.length}
              </span>
            )}
          </div>
        </header>

        <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6 flex flex-col gap-4">
          {loading && (
            <div className="flex flex-col gap-4 animate-pulse">
              <div className="h-24 bg-white rounded-2xl" />
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-white rounded-2xl overflow-hidden">
                  <div className="p-4 flex flex-col gap-3">
                    <div className="h-10 bg-gray-100 rounded-xl" />
                    <div className="grid grid-cols-3 gap-2">
                      <div className="h-14 bg-gray-100 rounded-xl" />
                      <div className="h-14 bg-gray-100 rounded-xl" />
                      <div className="h-14 bg-gray-100 rounded-xl" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {fetchError && !loading && (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center">
                <AlertCircle className="w-7 h-7 text-red-400" />
              </div>
              <p className="text-gray-600 font-medium text-center">{fetchError}</p>
              <button
                onClick={() => fetchData()}
                className="flex items-center gap-2 bg-[#1a4a5e] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#153d50] transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                إعادة المحاولة
              </button>
            </div>
          )}

          {!loading && !fetchError && (
            <>
              {request && (
                <div className="bg-gradient-to-br from-[#1a4a5e] to-[#2a6a82] rounded-2xl p-5 shadow-md">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
                      <Box className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-white font-bold text-sm">طلبك: طباليات {palletLabel}</p>
                      <p className="text-white/60 text-xs mt-0.5">{formatDate(request.created_at)}</p>
                    </div>
                    <span className={`mr-auto text-xs font-semibold px-2.5 py-1 rounded-full ${condition.color}`}>
                      {condition.label}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-white/15 rounded-xl px-3 py-2">
                      <p className="text-white/50 text-[10px]">المقاس</p>
                      <p className="text-white text-xs font-bold mt-0.5">{request.size || '—'}</p>
                    </div>
                    <div className="bg-white/15 rounded-xl px-3 py-2">
                      <p className="text-white/50 text-[10px]">الكمية</p>
                      <p className="text-white text-xs font-bold mt-0.5">{request.quantity} طبلية</p>
                    </div>
                    <div className="bg-white/15 rounded-xl px-3 py-2">
                      <p className="text-white/50 text-[10px]">السعر المتوقع</p>
                      <p className="text-white text-xs font-bold mt-0.5">
                        {request.target_price ? `${request.target_price} ر.س` : '—'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {orderedOffers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 gap-4">
                  <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center">
                    <HandCoins className="w-8 h-8 text-gray-300" />
                  </div>
                  <p className="text-gray-500 font-medium text-center">لا توجد عروض حتى الآن</p>
                  <p className="text-gray-400 text-sm text-center">سيظهر هنا عروض الموردين عند وصولها</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {acceptedOffers.length > 0 && (
                    <p className="text-xs font-bold text-emerald-700 px-1 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      العروض المقبولة ({acceptedOffers.length})
                    </p>
                  )}
                  {orderedOffers.map((offer) => (
                    <OfferCard
                      key={offer.id}
                      offer={offer}
                      commission={commission}
                      actionLoading={actionLoading === offer.id}
                      isJustAccepted={justAcceptedId === offer.id}
                      onReject={() => setRejectTarget(offer)}
                      onAccept={() => handleAccept(offer)}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {rejectTarget && (
        <RejectModal
          supplierName={rejectTarget.supplier_name || 'المورد'}
          onConfirm={handleConfirmReject}
          onClose={() => setRejectTarget(null)}
          loading={rejectLoading}
        />
      )}

      {commitOffer && (
        <CommitmentModal
          offer={commitOffer}
          commission={commission}
          onClose={() => setCommitOffer(null)}
        />
      )}
    </>
  );
}
