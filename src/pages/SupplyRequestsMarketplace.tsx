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
} from 'lucide-react';
import { supabase } from '../lib/supabase';

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

interface Props {
  onBack: () => void;
  onMakeOffer: (requestId: string) => void;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ar-SA', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

function RequestCard({ req, onMakeOffer }: { req: SupplyRequest; onMakeOffer: () => void }) {
  const condition = conditionConfig[req.condition] ?? { label: req.condition, color: 'bg-gray-100 text-gray-600' };
  const palletLabel = palletTypeLabel[req.pallet_type] ?? req.pallet_type;
  const gradientBg = palletTypeBg[req.pallet_type] ?? 'from-[#1a4a5e] to-[#2a6a82]';

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
              <p className="text-[10px] text-gray-400">الكمية</p>
              <p className="text-xs font-bold text-gray-700">{req.quantity} طبلية</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {req.city && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <MapPin className="w-3.5 h-3.5 text-[#1a4a5e] shrink-0" />
              <span className="font-medium">{req.city.name}</span>
            </div>
          )}
          {req.target_price !== null && req.target_price !== undefined && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <Banknote className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>
                السعر: <span className="font-bold text-emerald-700">{req.target_price} ر.س</span>
              </span>
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

const PALLET_FILTER_OPTIONS = [
  { value: 'all', label: 'الكل' },
  { value: 'wooden', label: 'خشبية' },
  { value: 'plastic', label: 'بلاستيكية' },
  { value: 'metal', label: 'معدنية' },
  { value: 'cardboard', label: 'كرتونية' },
];

export default function SupplyRequestsMarketplace({ onBack, onMakeOffer }: Props) {
  const [requests, setRequests]     = useState<SupplyRequest[]>([]);
  const [loading, setLoading]       = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [filter, setFilter]         = useState('all');
  const [showFilter, setShowFilter] = useState(false);

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
          <div className="flex items-center gap-3 mb-1">
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
                onMakeOffer={() => onMakeOffer(req.id)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
