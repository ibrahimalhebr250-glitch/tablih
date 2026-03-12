import { useState, useEffect } from 'react';
import {
  MapPin, Package, Wrench, ChevronLeft, ChevronRight, Warehouse, ImageOff,
  Star, Home, X, TrendingDown, Award, ShoppingBag
} from 'lucide-react';
import TrustRatingBadge from '../shared/TrustRatingBadge';
import VisitorRatingDialog from './VisitorRatingDialog';
import { CommentsSection } from '../shared/CommentsSection';
import { supabase } from '../../lib/supabase';
import SaleRequestSheet from './SaleRequestSheet';

interface SupplyCard {
  id: string;
  phone: string;
  pallet_type: string;
  size: string;
  quality: string;
  pallet_condition: string;
  available_quantity: number;
  price_per_pallet: number;
  city: string;
  description: string;
  image_urls: string[];
  created_at: string;
  trust_rating?: number;
}

const QUALITY_COLORS: Record<string, { bg: string; text: string; label: string; dot: string }> = {
  A: { bg: '#dcfce7', text: '#15803d', label: 'درجة A', dot: '#22c55e' },
  B: { bg: '#dbeafe', text: '#1d4ed8', label: 'درجة B', dot: '#3b82f6' },
  C: { bg: '#fff7ed', text: '#c2410c', label: 'درجة C', dot: '#f97316' },
  Scrap: { bg: '#f3f4f6', text: '#6b7280', label: 'خردة', dot: '#9ca3af' },
};

const CONDITION_MAP: Record<string, { label: string; color: string; bg: string }> = {
  new: { label: 'جديدة', color: '#15803d', bg: '#f0fdf4' },
  used: { label: 'مستعملة', color: '#b45309', bg: '#fff7ed' },
  repairable: { label: 'قابلة للإصلاح', color: '#1d4ed8', bg: '#eff6ff' },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'الآن';
  if (mins < 60) return `منذ ${mins} دقيقة`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `منذ ${hrs} ساعة`;
  return `منذ ${Math.floor(hrs / 24)} يوم`;
}

function GalleryImage({ url, onLoad, onError }: { url: string; onLoad: () => void; onError: () => void }) {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  return (
    <div className="relative w-full h-full">
      {status === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center" style={{ background: '#e8f0f5' }}>
          <div className="w-8 h-8 rounded-full border-2 border-green-200 border-t-green-500 animate-spin" />
        </div>
      )}
      {status !== 'error' ? (
        <img
          src={url}
          alt=""
          loading="lazy"
          className={`w-full h-full object-cover transition-opacity duration-300 ${status === 'loaded' ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => { setStatus('loaded'); onLoad(); }}
          onError={() => { setStatus('error'); onError(); }}
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center gap-2" style={{ background: 'linear-gradient(145deg, #E8F5E9, #C8E6C9)' }}>
          <ImageOff className="w-8 h-8 text-green-300" />
          <span className="text-[11px] font-semibold text-green-400">تعذّر تحميل الصورة</span>
        </div>
      )}
    </div>
  );
}

interface Props {
  card: SupplyCard;
  onClose: () => void;
  sessionPhone?: string | null;
  onLoginRequired?: () => void;
  autoOpenDeal?: boolean;
}

export default function SupplyDetailSheet({ card, onClose, sessionPhone, onLoginRequired }: Props) {
  const [imgIndex, setImgIndex] = useState(0);
  const [showRatingDialog, setShowRatingDialog] = useState(false);
  const [ratingSummary, setRatingSummary] = useState<{ average_rating: number; total_ratings: number } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showSaleRequest, setShowSaleRequest] = useState(false);

  const isMine = sessionPhone && sessionPhone === card.phone;

  const handleSaleButton = () => {
    if (!sessionPhone) {
      onLoginRequired?.();
      return;
    }
    setShowSaleRequest(true);
  };

  useEffect(() => { loadRatingSummary(); }, [card.phone]);

  const loadRatingSummary = async () => {
    try {
      const { data } = await supabase.rpc('get_visitor_ratings_summary', { p_user_phone: card.phone });
      setRatingSummary(data);
    } catch {}
  };

  const q = QUALITY_COLORS[card.quality] || QUALITY_COLORS.C;
  const cond = CONDITION_MAP[card.pallet_condition] || CONDITION_MAP.used;
  const hasImages = card.image_urls.length > 0;

  const goNext = () => setImgIndex((i) => (i + 1) % card.image_urls.length);
  const goPrev = () => setImgIndex((i) => (i - 1 + card.image_urls.length) % card.image_urls.length);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className="w-full md:rounded-3xl rounded-t-3xl overflow-hidden flex flex-col md:shadow-2xl"
        style={{ background: 'white', maxHeight: '94vh', maxWidth: 780 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-shrink-0 h-1 w-12 rounded-full mx-auto mt-3 mb-1 md:hidden" style={{ background: '#d1d5db' }} />

        <div className="hidden md:flex items-center justify-between px-5 py-3 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2" dir="rtl">
            <span className="text-[11px] font-black px-2.5 py-1 rounded-full flex items-center gap-1" style={{ background: '#dcfce7', color: '#15803d' }}>
              <Package className="w-3 h-3" />
              عرض مورّد
            </span>
            <h2 className="text-[16px] font-black text-gray-900">{card.pallet_type}</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 pb-4 md:grid md:grid-cols-2 md:gap-0">
          <div className="md:border-l md:border-gray-100 md:overflow-y-auto">
            {hasImages ? (
              <div className="relative w-full" style={{ aspectRatio: '4/3', background: '#0a1a24' }}>
                <GalleryImage key={card.image_urls[imgIndex]} url={card.image_urls[imgIndex]} onLoad={() => {}} onError={() => {}} />
                <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10 md:hidden">
                  <span className="text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1" style={{ background: 'rgba(21,128,61,0.9)', color: 'white', backdropFilter: 'blur(8px)' }}>
                    <Package className="w-2.5 h-2.5" />
                    عرض مورّد
                  </span>
                </div>
                {card.image_urls.length > 1 && (
                  <>
                    <button onClick={goPrev} className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full z-10" style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.15)' }}>
                      <ChevronLeft className="w-5 h-5 text-white" />
                    </button>
                    <button onClick={goNext} className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full z-10" style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.15)' }}>
                      <ChevronRight className="w-5 h-5 text-white" />
                    </button>
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                      {card.image_urls.map((_, i) => (
                        <button key={i} onClick={() => setImgIndex(i)} className="rounded-full transition-all duration-300" style={{ width: i === imgIndex ? 20 : 6, height: 6, background: i === imgIndex ? '#22c55e' : 'rgba(255,255,255,0.45)' }} />
                      ))}
                    </div>
                    <div className="absolute bottom-3 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full z-10" style={{ background: 'rgba(0,0,0,0.5)', color: 'white' }}>
                      {imgIndex + 1} / {card.image_urls.length}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="relative">
                <div className="w-full flex flex-col items-center justify-center gap-3" style={{ aspectRatio: '4/3', background: 'linear-gradient(145deg, #f0fdf4, #dcfce7)' }}>
                  <Warehouse className="w-14 h-14 text-green-300/70" />
                  <span className="text-[13px] font-semibold text-green-400/80">لا توجد صور</span>
                </div>
                <span className="absolute top-3 right-3 text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1 md:hidden" style={{ background: 'rgba(21,128,61,0.9)', color: 'white' }}>
                  <Package className="w-2.5 h-2.5" />
                  عرض مورّد
                </span>
              </div>
            )}

            {hasImages && card.image_urls.length > 1 && (
              <div className="flex gap-2 px-4 mt-3 overflow-x-auto pb-1">
                {card.image_urls.map((url, i) => (
                  <button key={i} onClick={() => setImgIndex(i)} className="flex-shrink-0 rounded-xl overflow-hidden transition-all duration-200" style={{ width: 56, height: 56, border: i === imgIndex ? '2px solid #22c55e' : '2px solid transparent', opacity: i === imgIndex ? 1 : 0.5 }}>
                    <img src={url} alt="" loading="lazy" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            <div className="hidden md:block px-4 mt-4 pb-4 space-y-3">
              {!isMine && (
                <button
                  onClick={handleSaleButton}
                  className="w-full py-3.5 rounded-2xl flex items-center justify-center gap-2 font-black text-[14px] text-white transition-all active:scale-[0.98]"
                  style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)', boxShadow: '0 6px 20px rgba(22,163,74,0.35)' }}
                >
                  <ShoppingBag className="w-5 h-5" />
                  عرض بيع طبليات
                </button>
              )}
              <div className="grid grid-cols-2 gap-2">
                <button onClick={onClose} className="flex flex-col items-center justify-center py-3 rounded-2xl" style={{ background: 'linear-gradient(135deg, #1a4a5e, #2c5f73)', boxShadow: '0 4px 12px rgba(26,74,94,0.25)' }}>
                  <Home className="w-5 h-5 text-white mb-1" />
                  <span className="text-[11px] font-bold text-white">الرئيسية</span>
                </button>
                <button onClick={() => setShowRatingDialog(true)} className="flex flex-col items-center justify-center py-3 rounded-2xl" style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)', boxShadow: '0 4px 12px rgba(245,158,11,0.25)' }}>
                  <Star className="w-5 h-5 text-white mb-1" />
                  <span className="text-[11px] font-bold text-white">تقييم</span>
                </button>
              </div>
            </div>
          </div>

          <div className="md:overflow-y-auto">
            <div className="px-5 mt-4 md:mt-5">
              <div className="flex items-center justify-between mb-1" dir="rtl">
                <h2 className="text-[20px] font-black text-gray-900 md:hidden">{card.pallet_type}</h2>
                <span className="text-[11px] text-gray-400">{timeAgo(card.created_at)}</span>
              </div>
              <div className="flex items-center gap-2 justify-end mb-4 flex-wrap" dir="rtl">
                <span className="flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-lg" style={{ background: q.bg, color: q.text, border: `1px solid ${q.dot}25` }}>
                  <span className="w-2 h-2 rounded-full" style={{ background: q.dot }} />
                  {q.label}
                </span>
                <span className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg" style={{ background: cond.bg, color: cond.color }}>
                  <Wrench className="w-3 h-3" />
                  {cond.label}
                </span>
                {card.size && (
                  <span className="text-[11px] font-semibold px-2.5 py-1 rounded-lg" style={{ background: '#f0f4f8', color: '#4a7a8a' }}>{card.size}</span>
                )}
              </div>
            </div>

            <div className="px-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl p-3.5 text-right" style={{ background: '#f0fdf4', border: '1px solid rgba(21,128,61,0.1)' }}>
                  <p className="text-[10px] text-green-600/60 mb-1">الكمية المتاحة</p>
                  <div className="flex items-center justify-end gap-1.5">
                    <span className="text-[22px] font-black text-green-700">{card.available_quantity.toLocaleString()}</span>
                    <Package className="w-4 h-4 text-green-400" />
                  </div>
                  <p className="text-[10px] text-green-600/50">طبلية</p>
                </div>
                <div className="rounded-2xl p-3.5 text-right" style={{ background: '#f0fdf4', border: '1px solid rgba(21,128,61,0.1)' }}>
                  <p className="text-[10px] text-green-600/60 mb-1">السعر</p>
                  {card.price_per_pallet > 0 ? (
                    <>
                      <span className="text-[22px] font-black text-green-700">{card.price_per_pallet.toLocaleString()}</span>
                      <p className="text-[10px] text-green-600/50">ريال / طبلية</p>
                    </>
                  ) : (
                    <div className="flex items-center gap-1 mt-1">
                      <TrendingDown className="w-4 h-4 text-gray-400" />
                      <p className="text-[12px] font-semibold text-gray-500">قابل للتفاوض</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-2xl overflow-hidden" style={{ background: '#f5f9fc', border: '1px solid rgba(0,0,0,0.04)' }}>
                <div className="grid grid-cols-2 divide-x divide-gray-100" dir="rtl">
                  <div className="p-3 text-right">
                    <p className="text-[10px] text-gray-400 mb-0.5">المدينة</p>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-green-400" />
                      <span className="text-[13px] font-bold text-gray-800">{card.city}</span>
                    </div>
                  </div>
                  <div className="p-3 text-right">
                    <p className="text-[10px] text-gray-400 mb-0.5">المقاس</p>
                    <span className="text-[13px] font-bold text-gray-800">{card.size || '-'}</span>
                  </div>
                </div>
              </div>

              <TrustRatingBadge rating={card.trust_rating ?? 3} size="md" showLabel={true} variant="detailed" />

              {card.description && (
                <div className="rounded-2xl p-3.5 text-right" style={{ background: '#f5f9fc', border: '1px solid rgba(0,0,0,0.04)' }}>
                  <p className="text-[11px] font-bold text-gray-500 mb-1.5">وصف العرض</p>
                  <p className="text-[13px] text-gray-700 leading-relaxed">{card.description}</p>
                </div>
              )}

              {ratingSummary && ratingSummary.total_ratings > 0 && (
                <div className="rounded-2xl p-3.5 text-right" style={{ background: '#fffbeb', border: '1px solid rgba(245,158,11,0.2)' }}>
                  <div className="flex items-center justify-end gap-2 mb-1">
                    <div className="flex items-center gap-1">
                      <span className="text-[16px] font-black text-amber-600">{ratingSummary.average_rating.toFixed(1)}</span>
                      <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                    </div>
                  </div>
                  <p className="text-[11px] text-amber-600/70">{ratingSummary.total_ratings} تقييم من زوّار المنصة</p>
                </div>
              )}

              <div className="rounded-2xl p-3.5" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }} dir="rtl">
                <div className="flex items-center gap-2 mb-2">
                  <Award className="w-4 h-4 text-green-600" />
                  <p className="text-[12px] font-black text-green-800">تفاصيل العرض</p>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-bold text-green-700">{card.pallet_type}</span>
                    <span className="text-[11px] text-green-600/60">نوع الطبلية</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-bold text-green-700">{card.city}</span>
                    <span className="text-[11px] text-green-600/60">المدينة</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-bold text-green-700">{q.label}</span>
                    <span className="text-[11px] text-green-600/60">الجودة</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-5 mt-4">
              <CommentsSection userPhone={card.phone} maxComments={5} refreshTrigger={refreshKey} />
            </div>
          </div>
        </div>

        <div className="md:hidden flex-shrink-0 px-4 pb-5 pt-3 space-y-2" style={{ background: 'linear-gradient(to top, #ffffff 0%, #f8fafb 100%)', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
          {!isMine && (
            <button
              onClick={handleSaleButton}
              className="w-full py-4 rounded-2xl flex items-center justify-center gap-2 font-black text-[15px] text-white transition-all active:scale-[0.98]"
              style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)', boxShadow: '0 6px 20px rgba(22,163,74,0.35)' }}
            >
              <ShoppingBag className="w-5 h-5" />
              عرض بيع طبليات
            </button>
          )}
          <div className="grid grid-cols-2 gap-2">
            <button onClick={onClose} className="flex flex-col items-center justify-center py-3 rounded-2xl" style={{ background: 'linear-gradient(135deg, #1a4a5e, #2c5f73)', boxShadow: '0 4px 12px rgba(26,74,94,0.25)' }}>
              <Home className="w-5 h-5 text-white mb-1" />
              <span className="text-[11px] font-bold text-white">الرئيسية</span>
            </button>
            <button onClick={() => setShowRatingDialog(true)} className="flex flex-col items-center justify-center py-3 rounded-2xl" style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)', boxShadow: '0 4px 12px rgba(245,158,11,0.25)' }}>
              <Star className="w-5 h-5 text-white mb-1" />
              <span className="text-[11px] font-bold text-white">تقييم</span>
            </button>
          </div>
        </div>
      </div>

      {showRatingDialog && (
        <VisitorRatingDialog
          isOpen={showRatingDialog}
          onClose={() => setShowRatingDialog(false)}
          ratedUserPhone={card.phone}
          ratedUserName="المورد"
          itemType="supply"
          itemId={card.id}
          onRatingSubmitted={() => { setShowRatingDialog(false); loadRatingSummary(); setRefreshKey(prev => prev + 1); }}
        />
      )}

      {showSaleRequest && (
        <SaleRequestSheet
          card={card}
          onClose={() => setShowSaleRequest(false)}
          onSuccess={() => { setShowSaleRequest(false); onClose(); }}
        />
      )}
    </div>
  );
}
