import { useEffect, useState } from 'react';
import { MapPin, Package, Layers, Star, ShoppingCart, RefreshCw, AlertCircle, Box, ClipboardList, ShoppingBag } from 'lucide-react';
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

const conditionLabel: Record<string, { label: string; color: string }> = {
  new: { label: 'جديد', color: 'bg-emerald-100 text-emerald-700' },
  good: { label: 'جيد', color: 'bg-sky-100 text-sky-700' },
  used: { label: 'مستعمل', color: 'bg-amber-100 text-amber-700' },
  damaged: { label: 'تالف', color: 'bg-red-100 text-red-700' },
};

const palletTypeLabel: Record<string, string> = {
  wooden: 'خشبية',
  plastic: 'بلاستيكية',
  metal: 'معدنية',
  cardboard: 'كرتونية',
};

function ListingCard({ listing, onRequest }: { listing: Listing; onRequest: (id: string) => void }) {
  const condition = conditionLabel[listing.condition] ?? { label: listing.condition, color: 'bg-gray-100 text-gray-600' };
  const palletType = palletTypeLabel[listing.pallet_type] ?? listing.pallet_type;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
      <div className="bg-gradient-to-br from-[#1a4a5e] to-[#2a6a82] p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
            <Box className="w-5 h-5 text-white" />
          </div>
          <span className="text-white font-bold text-base">{palletType}</span>
        </div>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${condition.color}`}>
          {condition.label}
        </span>
      </div>

      <div className="p-4 flex flex-col gap-3 flex-1">
        <div className="grid grid-cols-2 gap-2">
          <InfoRow icon={<Layers className="w-3.5 h-3.5" />} label="المقاس" value={listing.size} />
          <InfoRow icon={<Package className="w-3.5 h-3.5" />} label="الكمية" value={`${listing.quantity} طبلية`} />
        </div>

        {listing.city_id && (
          <div className="flex items-center gap-1.5 text-gray-500 text-xs">
            <MapPin className="w-3.5 h-3.5 text-[#1a4a5e]" />
            <span>{listing.city_id}</span>
          </div>
        )}

        <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-100">
          <div className="flex flex-col">
            <span className="text-xs text-gray-400">السعر للطبلية</span>
            <span className="text-xl font-bold text-[#1a4a5e]">
              {Number(listing.price).toLocaleString('ar-SA')}
              <span className="text-sm font-normal text-gray-400 mr-1">ر.س</span>
            </span>
          </div>
          <div className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
            <Star className="w-3.5 h-3.5 fill-emerald-500 text-emerald-500" />
            <span>متوفر</span>
          </div>
        </div>
      </div>

      <div className="px-4 pb-4">
        <button
          onClick={() => onRequest(listing.id)}
          className="w-full flex items-center justify-center gap-2 bg-[#1a4a5e] hover:bg-[#153d50] active:scale-[0.98] text-white rounded-xl py-2.5 text-sm font-semibold transition-all duration-150"
        >
          <ShoppingCart className="w-4 h-4" />
          طلب الآن
        </button>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 bg-gray-50 rounded-lg p-2">
      <div className="flex items-center gap-1 text-gray-400 text-[10px]">
        <span className="text-[#1a4a5e]">{icon}</span>
        {label}
      </div>
      <span className="text-gray-700 text-xs font-semibold">{value}</span>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
      <div className="h-16 bg-gray-200" />
      <div className="p-4 flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="h-12 bg-gray-100 rounded-lg" />
          <div className="h-12 bg-gray-100 rounded-lg" />
        </div>
        <div className="h-4 bg-gray-100 rounded w-1/2" />
        <div className="h-8 bg-gray-100 rounded mt-2" />
        <div className="h-10 bg-gray-200 rounded-xl mt-1" />
      </div>
    </div>
  );
}

interface Props {
  onSelectListing: (id: string) => void;
  onOpenSupplierDashboard: () => void;
  onOpenSupplyRequests: () => void;
}

export default function Marketplace({ onSelectListing, onOpenSupplierDashboard, onOpenSupplyRequests }: Props) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchListings() {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from('listings')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (err) {
      setError('تعذّر تحميل العروض، يرجى المحاولة مجدداً.');
    } else {
      setListings(data ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchListings();
  }, []);

  function handleRequest(id: string) {
    onSelectListing(id);
  }

  return (
    <div
      className="min-h-screen"
      dir="rtl"
      style={{ background: 'linear-gradient(135deg, #eef4f8 0%, #f5f9fc 50%, #eaf2f7 100%)' }}
    >
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#1a4a5e] rounded-xl flex items-center justify-center shadow">
              <svg viewBox="0 0 20 20" className="w-5 h-5" fill="none">
                <rect x="2" y="2" width="6.5" height="6.5" rx="1.5" fill="white" />
                <rect x="11.5" y="2" width="6.5" height="6.5" rx="1.5" fill="white" />
                <rect x="2" y="11.5" width="6.5" height="6.5" rx="1.5" fill="white" />
                <rect x="11.5" y="11.5" width="6.5" height="6.5" rx="1.5" fill="white" />
              </svg>
            </div>
            <div>
              <h1 className="text-[#1a4a5e] font-bold text-base leading-tight">سوق الطبليات</h1>
              <p className="text-gray-400 text-[11px]">عروض الموردين</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenSupplyRequests}
              className="flex items-center gap-1.5 text-xs text-[#1a4a5e] font-medium hover:bg-[#1a4a5e]/10 px-3 py-1.5 rounded-lg transition-colors border border-[#1a4a5e]/20"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              طلبات التوريد
            </button>
            <button
              onClick={onOpenSupplierDashboard}
              className="flex items-center gap-1.5 text-xs text-[#1a4a5e] font-medium hover:bg-[#1a4a5e]/10 px-3 py-1.5 rounded-lg transition-colors border border-[#1a4a5e]/20"
            >
              <ClipboardList className="w-3.5 h-3.5" />
              لوحة المورد
            </button>
            <button
              onClick={fetchListings}
              disabled={loading}
              className="flex items-center gap-1.5 text-xs text-[#1a4a5e] font-medium hover:bg-[#1a4a5e]/10 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              تحديث
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {!loading && !error && (
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-[#1a4a5e]">العروض المتاحة</h2>
              <p className="text-gray-400 text-sm mt-0.5">
                {listings.length === 0 ? 'لا توجد عروض حالياً' : `${listings.length} عرض متاح`}
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center">
              <AlertCircle className="w-7 h-7 text-red-400" />
            </div>
            <p className="text-gray-600 font-medium">{error}</p>
            <button
              onClick={fetchListings}
              className="flex items-center gap-2 bg-[#1a4a5e] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#153d50] transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              إعادة المحاولة
            </button>
          </div>
        )}

        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        )}

        {!loading && !error && listings.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-16 h-16 bg-[#1a4a5e]/10 rounded-2xl flex items-center justify-center">
              <Box className="w-8 h-8 text-[#1a4a5e]/40" />
            </div>
            <div className="text-center">
              <p className="text-gray-600 font-semibold">لا توجد عروض متاحة</p>
              <p className="text-gray-400 text-sm mt-1">سيتم إضافة عروض قريباً</p>
            </div>
          </div>
        )}

        {!loading && !error && listings.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {listings.map(listing => (
              <ListingCard key={listing.id} listing={listing} onRequest={handleRequest} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
