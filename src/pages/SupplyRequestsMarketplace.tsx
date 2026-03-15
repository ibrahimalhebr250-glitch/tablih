import { useEffect, useState } from 'react';
import {
  ArrowRight,
  ShoppingBag,
  Package,
  Layers,
  MapPin,
  Banknote,
  RefreshCw,
  AlertCircle,
  SlidersHorizontal,
  Box,
  ChevronDown,
  HandCoins,
  X,
  Send,
  CheckCircle2,
  Clock,
  FileText,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useSession } from '../hooks/useSession';

interface SupplyRequest {
  id: string;
  pallet_type: string;
  size: string;
  condition: string;
  quantity: number;
  city_id: string | null;
  target_price: number | null;
  notes: string | null;
  status: string;
  created_at: string;
  city?: { name: string } | null;
}

interface OfferForm {
  quantity: string;
  price: string;
  delivery_time: string;
  notes: string;
}

const palletTypeLabel: Record<string, string> = {
  wooden:    'خشبية',
  plastic:   'بلاستيكية',
  metal:     'معدنية',
  cardboard: 'كرتونية',
};

const palletTypeBg: Record<string, string> = {
  wooden:    'from-amber-700 to-amber-500',
  plastic:   'from-sky-700 to-sky-500',
  metal:     'from-slate-600 to-slate-400',
  cardboard: 'from-orange-600 to-orange-400',
};

const conditionConfig: Record<string, { label: string; color: string }> = {
  new:     { label: 'جديد',    color: 'bg-emerald-100 text-emerald-700' },
  good:    { label: 'جيد',     color: 'bg-sky-100 text-sky-700' },
  used:    { label: 'مستعمل', color: 'bg-amber-100 text-amber-700' },
  damaged: { label: 'تالف',   color: 'bg-red-100 text-red-700' },
};

const PALLET_FILTER_OPTIONS = [
  { value: 'all',       label: 'الكل' },
  { value: 'wooden',    label: 'خشبية' },
  { value: 'plastic',   label: 'بلاستيكية' },
  { value: 'metal',     label: 'معدنية' },
  { value: 'cardboard', label: 'كرتونية' },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ar-SA', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

function RequestCard({ req, onMakeOffer }: { req: SupplyRequest; onMakeOffer: () => void }) {
  const condition  = conditionConfig[req.condition] ?? { label: req.condition, color: 'bg-gray-100 text-gray-600' };
  const palletLabel = palletTypeLabel[req.pallet_type] ?? req.pallet_type;
  const gradientBg  = palletTypeBg[req.pallet_type] ?? 'from-[#1a4a5e] to-[#2a6a82]';

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
      <div className={`bg-gradient-to-br ${gradientBg} p-4 flex items-center justify-between`}>
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
            <Box className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">طباليات {palletLabel}</p>
            <p className="text-white/60 text-xs mt-0.5">{formatDate(req.created_at)}</p>
          </div>
        </div>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${condition.color}`}>
          {condition.label}
        </span>
      </div>

      <div className="p-4 flex flex-col gap-3 flex-1">
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-gray-50 rounded-xl px-3 py-2.5 flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-[#1a4a5e] shrink-0" />
            <div>
              <p className="text-[10px] text-gray-400">المقاس</p>
              <p className="text-xs font-bold text-gray-700">{req.size}</p>
            </div>
          </div>
          <div className="bg-gray-50 rounded-xl px-3 py-2.5 flex items-center gap-2">
            <Package className="w-3.5 h-3.5 text-[#1a4a5e] shrink-0" />
            <div>
              <p className="text-[10px] text-gray-400">الكمية المطلوبة</p>
              <p className="text-xs font-bold text-gray-700">{req.quantity} طبلية</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          {req.city && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <MapPin className="w-3.5 h-3.5 text-[#1a4a5e] shrink-0" />
              <span className="font-medium">{req.city.name}</span>
            </div>
          )}
          {req.target_price !== null && req.target_price !== undefined && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <Banknote className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>السعر: <span className="font-bold text-emerald-700">{req.target_price} ر.س</span></span>
            </div>
          )}
        </div>

        {req.notes && (
          <p className="text-xs text-gray-500 bg-gray-50 rounded-xl px-3 py-2 leading-relaxed line-clamp-2">
            {req.notes}
          </p>
        )}
      </div>

      <div className="border-t border-gray-100 px-4 py-3">
        <button
          onClick={onMakeOffer}
          className="w-full flex items-center justify-center gap-2 bg-[#1a4a5e] hover:bg-[#153d50] active:scale-[0.98] text-white rounded-xl py-2.5 text-sm font-bold transition-all"
        >
          <HandCoins className="w-4 h-4" />
          تقديم عرض
        </button>
      </div>
    </div>
  );
}

interface OfferModalProps {
  request: SupplyRequest;
  session: { profile: { id: string; display_name: string; phone: string } } | null;
  onClose: () => void;
  onSuccess: () => void;
}

function OfferModal({ request, session, onClose, onSuccess }: OfferModalProps) {
  const [form, setForm]       = useState<OfferForm>({ quantity: '', price: '', delivery_time: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const palletLabel = palletTypeLabel[request.pallet_type] ?? request.pallet_type;
  const gradientBg  = palletTypeBg[request.pallet_type] ?? 'from-[#1a4a5e] to-[#2a6a82]';
  const condition   = conditionConfig[request.condition] ?? { label: request.condition, color: 'bg-gray-100 text-gray-600' };

  function setField(key: keyof OfferForm, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const qty   = parseInt(form.quantity, 10);
    const price = parseFloat(form.price);

    if (!form.quantity || isNaN(qty) || qty <= 0) {
      setError('يرجى إدخال كمية صحيحة.');
      return;
    }
    if (!form.price || isNaN(price) || price <= 0) {
      setError('يرجى إدخال سعر صحيح.');
      return;
    }
    if (!form.delivery_time.trim()) {
      setError('يرجى تحديد مدة التوريد.');
      return;
    }
    if (!session) {
      setError('يجب تسجيل الدخول أولاً لتقديم عرض.');
      return;
    }

    setSubmitting(true);
    setError(null);

    const { error: insertError } = await supabase.from('supplier_offers').insert({
      supply_request_id: request.id,
      supplier_id:       session.profile.id,
      supplier_name:     session.profile.display_name || '',
      supplier_phone:    session.profile.phone,
      quantity:          qty,
      price:             price,
      delivery_time:     form.delivery_time.trim(),
      notes:             form.notes.trim() || null,
      status:            'pending',
    });

    setSubmitting(false);

    if (insertError) {
      setError('حدث خطأ أثناء إرسال العرض، يرجى المحاولة مجدداً.');
    } else {
      setSuccess(true);
    }
  }

  function handleSuccessClose() {
    onSuccess();
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      dir="rtl"
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={!success ? onClose : undefined}
      />

      <div className="relative w-full sm:max-w-md bg-white sm:rounded-3xl rounded-t-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {success ? (
          <div className="flex flex-col items-center justify-center gap-5 py-12 px-8">
            <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-500" />
            </div>
            <div className="text-center">
              <p className="text-[#1a4a5e] font-bold text-lg">تم إرسال عرضك بنجاح</p>
              <p className="text-gray-500 text-sm mt-1">سيتم إشعارك عند رد المشتري على عرضك</p>
            </div>
            <button
              onClick={handleSuccessClose}
              className="w-full bg-[#1a4a5e] hover:bg-[#153d50] text-white rounded-2xl py-3 font-bold text-sm transition-colors"
            >
              حسناً
            </button>
          </div>
        ) : (
          <>
            <div className={`bg-gradient-to-br ${gradientBg} px-5 py-4 flex items-center justify-between shrink-0`}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
                  <HandCoins className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-white font-bold text-sm">تقديم عرض</p>
                  <p className="text-white/60 text-xs">طباليات {palletLabel} — {request.quantity} طبلية</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            <div className="px-5 pt-3 pb-1 shrink-0">
              <div className="bg-gray-50 rounded-xl px-4 py-2.5 flex items-center gap-3">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${condition.color}`}>
                  {condition.label}
                </span>
                <span className="text-xs text-gray-500">المقاس: <span className="font-bold text-gray-700">{request.size}</span></span>
                {request.target_price && (
                  <span className="text-xs text-emerald-600 font-medium mr-auto">
                    السعر المتوقع: {request.target_price} ر.س
                  </span>
                )}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-5 py-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-600 flex items-center gap-1">
                    <Package className="w-3.5 h-3.5 text-[#1a4a5e]" />
                    الكمية المتوفرة
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      placeholder="0"
                      value={form.quantity}
                      onChange={(e) => setField('quantity', e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1a4a5e]/30 focus:border-[#1a4a5e] transition-all"
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">طبلية</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-600 flex items-center gap-1">
                    <Banknote className="w-3.5 h-3.5 text-emerald-600" />
                    السعر للطبلية
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      placeholder="0.00"
                      value={form.price}
                      onChange={(e) => setField('price', e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1a4a5e]/30 focus:border-[#1a4a5e] transition-all"
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">ر.س</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-600 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  مدة التوريد
                </label>
                <input
                  type="text"
                  placeholder="مثال: خلال 3 أيام، أو فوري"
                  value={form.delivery_time}
                  onChange={(e) => setField('delivery_time', e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1a4a5e]/30 focus:border-[#1a4a5e] transition-all"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-600 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-gray-400" />
                  ملاحظات إضافية
                  <span className="text-gray-400 font-normal">(اختياري)</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="أي تفاصيل إضافية تود إضافتها..."
                  value={form.notes}
                  onChange={(e) => setField('notes', e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1a4a5e]/30 focus:border-[#1a4a5e] transition-all resize-none leading-relaxed"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <p className="text-xs text-red-600 font-medium">{error}</p>
                </div>
              )}

              {!session && (
                <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  <p className="text-xs text-amber-700 font-medium">يجب تسجيل الدخول لتقديم عرض</p>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || !session}
                className="w-full flex items-center justify-center gap-2 bg-[#1a4a5e] hover:bg-[#153d50] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl py-3 text-sm font-bold transition-all active:scale-[0.98]"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    جاري الإرسال...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    إرسال العرض
                  </>
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

interface Props {
  onBack: () => void;
  onMakeOffer: (requestId: string) => void;
}

export default function SupplyRequestsMarketplace({ onBack }: Props) {
  const { session }                   = useSession();
  const [requests, setRequests]       = useState<SupplyRequest[]>([]);
  const [loading, setLoading]         = useState(true);
  const [fetchError, setFetchError]   = useState<string | null>(null);
  const [filter, setFilter]           = useState('all');
  const [showFilter, setShowFilter]   = useState(false);
  const [activeRequest, setActiveRequest] = useState<SupplyRequest | null>(null);

  async function fetchRequests() {
    setLoading(true);
    setFetchError(null);

    let query = supabase
      .from('supply_requests')
      .select('id, pallet_type, size, condition, quantity, city_id, target_price, notes, status, created_at, city:city_id(name)')
      .eq('status', 'open')
      .order('created_at', { ascending: false });

    if (filter !== 'all') {
      query = query.eq('pallet_type', filter);
    }

    const { data, error } = await query;

    if (error) {
      setFetchError('تعذّر تحميل الطلبات، يرجى المحاولة مجدداً.');
    } else {
      setRequests((data as unknown as SupplyRequest[]) ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchRequests();
  }, [filter]);

  const activeFilterLabel = PALLET_FILTER_OPTIONS.find((o) => o.value === filter)?.label ?? 'الكل';

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
                <ShoppingBag className="w-4 h-4 text-white" />
              </div>
              <span className="text-[#1a4a5e] font-bold text-base">طلبات التوريد</span>
            </div>
            {!loading && requests.length > 0 && (
              <span className="bg-[#1a4a5e] text-white text-xs font-bold px-2.5 py-0.5 rounded-full">
                {requests.length}
              </span>
            )}
          </div>
        </header>

        <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6 flex flex-col gap-4">
          <div className="bg-gradient-to-br from-[#1a4a5e] to-[#2a6a82] rounded-2xl p-5 shadow-md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
                <ShoppingBag className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-white font-bold text-base leading-tight">سوق طلبات التوريد</h1>
                <p className="text-white/60 text-xs mt-0.5">تصفّح طلبات المشترين وقدّم عرضك</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="relative">
              <button
                onClick={() => setShowFilter((v) => !v)}
                className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3.5 py-2 text-sm text-gray-700 font-medium hover:bg-gray-50 transition-colors shadow-sm"
              >
                <SlidersHorizontal className="w-4 h-4 text-[#1a4a5e]" />
                {activeFilterLabel}
                <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${showFilter ? 'rotate-180' : ''}`} />
              </button>
              {showFilter && (
                <div className="absolute top-full mt-1.5 right-0 bg-white border border-gray-100 rounded-2xl shadow-lg overflow-hidden z-10 min-w-[130px]">
                  {PALLET_FILTER_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => { setFilter(opt.value); setShowFilter(false); }}
                      className={`w-full text-right px-4 py-2.5 text-sm font-medium transition-colors ${
                        filter === opt.value
                          ? 'bg-[#1a4a5e] text-white'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => fetchRequests()}
              className="flex items-center gap-1.5 text-[#1a4a5e] text-sm font-medium hover:underline"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              تحديث
            </button>
          </div>

          {loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-pulse">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-white rounded-2xl overflow-hidden">
                  <div className="h-16 bg-gray-200" />
                  <div className="p-4 flex flex-col gap-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="h-12 bg-gray-100 rounded-xl" />
                      <div className="h-12 bg-gray-100 rounded-xl" />
                    </div>
                    <div className="h-10 bg-gray-100 rounded-xl" />
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
                onClick={() => fetchRequests()}
                className="flex items-center gap-2 bg-[#1a4a5e] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#153d50] transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                إعادة المحاولة
              </button>
            </div>
          )}

          {!loading && !fetchError && requests.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center">
                <ShoppingBag className="w-8 h-8 text-gray-300" />
              </div>
              <p className="text-gray-500 font-medium text-center">لا توجد طلبات توريد حالياً</p>
              <p className="text-gray-400 text-sm text-center">ستظهر هنا طلبات المشترين عند إضافتها</p>
            </div>
          )}

          {!loading && !fetchError && requests.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {requests.map((req) => (
                <RequestCard
                  key={req.id}
                  req={req}
                  onMakeOffer={() => setActiveRequest(req)}
                />
              ))}
            </div>
          )}
        </main>
      </div>

      {activeRequest && (
        <OfferModal
          request={activeRequest}
          session={session}
          onClose={() => setActiveRequest(null)}
          onSuccess={() => setActiveRequest(null)}
        />
      )}
    </>
  );
}
