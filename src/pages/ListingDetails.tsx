import { useEffect, useState } from 'react';
import {
  ArrowRight,
  Box,
  Layers,
  Package,
  MapPin,
  Tag,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  ShoppingBag,
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Listing {
  id: string;
  pallet_type: string;
  size: string;
  condition: string;
  quantity: number;
  price: number;
  city_id: string | null;
  status: string;
  created_at: string;
}

const conditionConfig: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  new:     { label: 'جديد',    bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  good:    { label: 'جيد',     bg: 'bg-sky-50',     text: 'text-sky-700',     dot: 'bg-sky-500'     },
  used:    { label: 'مستعمل',  bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-500'   },
  damaged: { label: 'تالف',    bg: 'bg-red-50',     text: 'text-red-700',     dot: 'bg-red-500'     },
};

const palletTypeLabel: Record<string, string> = {
  wooden:    'طبلية خشبية',
  plastic:   'طبلية بلاستيكية',
  metal:     'طبلية معدنية',
  cardboard: 'طبلية كرتونية',
};

interface Props {
  listingId: string;
  onBack: () => void;
}

function DetailRow({
  icon,
  label,
  value,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between py-4 border-b border-gray-100 last:border-0 ${highlight ? 'bg-[#1a4a5e]/5 -mx-5 px-5 rounded-xl' : ''}`}>
      <div className="flex items-center gap-3 text-gray-500">
        <span className="w-8 h-8 rounded-lg bg-[#1a4a5e]/10 flex items-center justify-center text-[#1a4a5e]">
          {icon}
        </span>
        <span className="text-sm font-medium">{label}</span>
      </div>
      <div className={`text-sm font-semibold ${highlight ? 'text-[#1a4a5e] text-base' : 'text-gray-700'}`}>
        {value}
      </div>
    </div>
  );
}

export default function ListingDetails({ listingId, onBack }: Props) {
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchListing() {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from('listings')
      .select('*')
      .eq('id', listingId)
      .maybeSingle();

    if (err) {
      setError('تعذّر تحميل بيانات العرض، يرجى المحاولة مجدداً.');
    } else if (!data) {
      setError('العرض غير موجود أو لم يعد متاحاً.');
    } else {
      setListing(data);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchListing();
  }, [listingId]);

  const condition = listing ? (conditionConfig[listing.condition] ?? { label: listing.condition, bg: 'bg-gray-50', text: 'text-gray-600', dot: 'bg-gray-400' }) : null;
  const palletType = listing ? (palletTypeLabel[listing.pallet_type] ?? listing.pallet_type) : '';

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
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-[#1a4a5e] rounded-lg flex items-center justify-center shadow">
              <svg viewBox="0 0 20 20" className="w-4.5 h-4.5" fill="none">
                <rect x="2" y="2" width="6.5" height="6.5" rx="1.5" fill="white" />
                <rect x="11.5" y="2" width="6.5" height="6.5" rx="1.5" fill="white" />
                <rect x="2" y="11.5" width="6.5" height="6.5" rx="1.5" fill="white" />
                <rect x="11.5" y="11.5" width="6.5" height="6.5" rx="1.5" fill="white" />
              </svg>
            </div>
            <span className="text-[#1a4a5e] font-bold text-base">تفاصيل العرض</span>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8 flex flex-col gap-5">

        {loading && (
          <div className="flex flex-col gap-4 animate-pulse">
            <div className="h-36 bg-gray-200 rounded-2xl" />
            <div className="bg-white rounded-2xl p-5 flex flex-col gap-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex justify-between items-center py-3 border-b border-gray-100 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-100 rounded-lg" />
                    <div className="w-20 h-4 bg-gray-100 rounded" />
                  </div>
                  <div className="w-24 h-4 bg-gray-100 rounded" />
                </div>
              ))}
            </div>
            <div className="h-14 bg-gray-200 rounded-2xl mt-auto" />
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center flex-1 py-20 gap-4">
            <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center">
              <AlertCircle className="w-7 h-7 text-red-400" />
            </div>
            <p className="text-gray-600 font-medium text-center">{error}</p>
            <button
              onClick={fetchListing}
              className="flex items-center gap-2 bg-[#1a4a5e] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#153d50] transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              إعادة المحاولة
            </button>
          </div>
        )}

        {!loading && !error && listing && (
          <>
            <div className="bg-gradient-to-br from-[#1a4a5e] to-[#2a6a82] rounded-2xl p-6 flex items-start justify-between shadow-md">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <Box className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-white font-bold text-lg">{palletType}</span>
                </div>
                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold w-fit ${condition!.bg} ${condition!.text}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${condition!.dot}`} />
                  {condition!.label}
                </div>
              </div>
              <div className="text-left flex flex-col items-end">
                <span className="text-white/60 text-xs">السعر للطبلية</span>
                <span className="text-white font-bold text-2xl">{Number(listing.price).toLocaleString('ar-SA')}</span>
                <span className="text-white/60 text-xs">ريال سعودي</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-5 py-2">
              <DetailRow
                icon={<Layers className="w-4 h-4" />}
                label="المقاس"
                value={listing.size}
              />
              <DetailRow
                icon={<Package className="w-4 h-4" />}
                label="الكمية المتوفرة"
                value={`${listing.quantity} طبلية`}
                highlight
              />
              <DetailRow
                icon={<Tag className="w-4 h-4" />}
                label="السعر للطبلية"
                value={
                  <span>
                    {Number(listing.price).toLocaleString('ar-SA')}
                    <span className="text-gray-400 font-normal text-xs mr-1">ر.س</span>
                  </span>
                }
              />
              {listing.city_id && (
                <DetailRow
                  icon={<MapPin className="w-4 h-4" />}
                  label="المدينة"
                  value={listing.city_id}
                />
              )}
              <DetailRow
                icon={<CheckCircle className="w-4 h-4" />}
                label="حالة العرض"
                value={
                  <span className="flex items-center gap-1.5 text-emerald-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    متاح
                  </span>
                }
              />
            </div>

            <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-amber-700 text-sm">
              سيتم التواصل مع المورد بعد إرسال الطلب لتأكيد التفاصيل وموعد التسليم.
            </div>
          </>
        )}
      </main>

      {!loading && !error && listing && (
        <div className="sticky bottom-0 bg-white/90 backdrop-blur-md border-t border-gray-200 px-4 py-4">
          <div className="max-w-2xl mx-auto">
            <button
              className="w-full flex items-center justify-center gap-2 bg-[#1a4a5e] hover:bg-[#153d50] active:scale-[0.98] text-white rounded-2xl py-3.5 text-base font-bold transition-all duration-150 shadow-md"
            >
              <ShoppingBag className="w-5 h-5" />
              إرسال طلب
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
