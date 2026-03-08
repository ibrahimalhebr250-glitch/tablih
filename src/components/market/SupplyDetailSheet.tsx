import { useState, useEffect } from 'react';
import { MapPin, Package, Wrench, ChevronLeft, ChevronRight, Warehouse, ImageOff, Heart, MessageCircle, Star, Home } from 'lucide-react';
import TrustRatingBadge from '../shared/TrustRatingBadge';
import VisitorRatingDialog from './VisitorRatingDialog';
import { CommentsSection } from '../shared/CommentsSection';
import { supabase } from '../../lib/supabase';

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
  isAuthenticated: boolean;
  onShowAuthPrompt: () => void;
}

export default function SupplyDetailSheet({ card, onClose, isAuthenticated, onShowAuthPrompt }: Props) {
  const [imgIndex, setImgIndex] = useState(0);
  const [isFavorited, setIsFavorited] = useState(false);
  const [showRatingDialog, setShowRatingDialog] = useState(false);
  const [ratingSummary, setRatingSummary] = useState<{ average_rating: number; total_ratings: number } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    loadRatingSummary();
  }, [card.phone]);

  const loadRatingSummary = async () => {
    try {
      const { data, error } = await supabase.rpc('get_visitor_ratings_summary', {
        p_user_phone: card.phone
      });

      if (error) throw error;
      setRatingSummary(data);
    } catch (err) {
      console.error('Error loading rating summary:', err);
    }
  };

  const q = QUALITY_COLORS[card.quality] || QUALITY_COLORS.C;
  const cond = CONDITION_MAP[card.pallet_condition] || CONDITION_MAP.used;
  const hasImages = card.image_urls.length > 0;

  const goNext = () => setImgIndex((i) => (i + 1) % card.image_urls.length);
  const goPrev = () => setImgIndex((i) => (i - 1 + card.image_urls.length) % card.image_urls.length);

  const handleFavorite = () => {
    if (!isAuthenticated) {
      onShowAuthPrompt();
    } else {
      setIsFavorited(!isFavorited);
    }
  };

  const buildWhatsAppLink = () => {
    const cleanPhone = card.phone.replace(/^0/, '966').replace('+', '');
    const platformFee = 0.25;

    const message = [
      'السلام عليكم',
      '',
      'لديكم عرض في منصة *طبليتي*',
      '',
      `النوع: ${card.pallet_type}`,
      `المقاس: ${card.size}`,
      `الجودة: درجة ${card.quality}`,
      `الحالة: ${cond.label}`,
      `الكمية المتاحة: ${card.available_quantity.toLocaleString('ar-SA')} طبلية`,
      `السعر: ${card.price_per_pallet.toLocaleString('ar-SA')} ر.س / طبلية`,
      `المدينة: ${card.city}`,
      '',
      'أرجو الرد لإكمال المشترى معكم',
      '',
      `*ملاحظة:* رسوم المنصة ${platformFee} ر.س للطبلية الواحدة`,
      '',
      'شكراً لتعاملكم مع منصة طبليتي',
    ].join('\n');

    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  };

  const handleWhatsAppClick = () => {
    const link = buildWhatsAppLink();
    window.open(link, '_blank');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className="mt-auto rounded-t-3xl overflow-hidden flex flex-col"
        style={{ background: 'white', maxHeight: '94vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-shrink-0 h-1 w-12 rounded-full mx-auto mt-3 mb-1" style={{ background: '#d1d5db' }} />

        <div className="overflow-y-auto flex-1 pb-4">
          {hasImages ? (
            <div className="relative w-full" style={{ aspectRatio: '4/3', background: '#0a1a24' }}>
              <GalleryImage
                key={card.image_urls[imgIndex]}
                url={card.image_urls[imgIndex]}
                onLoad={() => {}}
                onError={() => {}}
              />

              <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
                <span
                  className="text-[11px] font-bold px-2.5 py-1 rounded-full"
                  style={{ background: 'rgba(21,128,61,0.85)', color: 'white', backdropFilter: 'blur(8px)' }}
                >
                  عرض مورّد
                </span>
              </div>

              {card.image_urls.length > 1 && (
                <>
                  <button
                    onClick={goPrev}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full transition-all active:scale-90 z-10"
                    style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.15)' }}
                  >
                    <ChevronLeft className="w-5 h-5 text-white" />
                  </button>
                  <button
                    onClick={goNext}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full transition-all active:scale-90 z-10"
                    style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.15)' }}
                  >
                    <ChevronRight className="w-5 h-5 text-white" />
                  </button>

                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                    {card.image_urls.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setImgIndex(i)}
                        className="rounded-full transition-all duration-300"
                        style={{
                          width: i === imgIndex ? 20 : 6,
                          height: 6,
                          background: i === imgIndex ? '#22c55e' : 'rgba(255,255,255,0.45)',
                          boxShadow: i === imgIndex ? '0 0 8px rgba(34,197,94,0.5)' : 'none',
                        }}
                      />
                    ))}
                  </div>

                  <div
                    className="absolute bottom-3 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full z-10"
                    style={{ background: 'rgba(0,0,0,0.5)', color: 'white', backdropFilter: 'blur(4px)' }}
                  >
                    {imgIndex + 1} / {card.image_urls.length}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="relative">
              <div
                className="w-full flex flex-col items-center justify-center gap-3"
                style={{ aspectRatio: '4/3', background: 'linear-gradient(145deg, #E8F5E9 0%, #C8E6C9 100%)' }}
              >
                <Warehouse className="w-14 h-14 text-green-300/70" />
                <span className="text-[13px] font-semibold text-green-400/80">لا توجد صور</span>
              </div>
              <span
                className="absolute top-3 right-3 text-[11px] font-bold px-2.5 py-1 rounded-full"
                style={{ background: 'rgba(21,128,61,0.85)', color: 'white' }}
              >
                عرض مورّد
              </span>
            </div>
          )}

          {hasImages && card.image_urls.length > 1 && (
            <div className="flex gap-2 px-4 mt-3 overflow-x-auto pb-1">
              {card.image_urls.map((url, i) => (
                <button
                  key={i}
                  onClick={() => setImgIndex(i)}
                  className="flex-shrink-0 rounded-xl overflow-hidden transition-all duration-200"
                  style={{
                    width: 56,
                    height: 56,
                    border: i === imgIndex ? '2px solid #22c55e' : '2px solid transparent',
                    opacity: i === imgIndex ? 1 : 0.5,
                    boxShadow: i === imgIndex ? '0 0 0 2px rgba(34,197,94,0.2)' : 'none',
                  }}
                >
                  <img src={url} alt="" loading="lazy" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          <div className="px-5 mt-4">
            <div className="flex items-center justify-between mb-1" dir="rtl">
              <h2 className="text-[20px] font-black text-[#1a3a4a]">{card.pallet_type}</h2>
              <span className="text-[11px] text-[#a0b5c0]">{timeAgo(card.created_at)}</span>
            </div>

            <div className="flex items-center gap-2 justify-end mb-4">
              <span
                className="flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-lg"
                style={{ background: q.bg, color: q.text, border: `1px solid ${q.dot}25` }}
              >
                <span className="w-2 h-2 rounded-full" style={{ background: q.dot }} />
                {q.label}
              </span>
              <span
                className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg"
                style={{ background: cond.bg, color: cond.color }}
              >
                <Wrench className="w-3 h-3" />
                {cond.label}
              </span>
              {card.size && (
                <span className="text-[11px] font-semibold px-2.5 py-1 rounded-lg" style={{ background: '#f0f4f8', color: '#4a7a8a' }}>
                  {card.size}
                </span>
              )}
            </div>
          </div>

          <div className="px-5 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl p-3.5 text-right" style={{ background: '#f0f9f4', border: '1px solid rgba(21,128,61,0.08)' }}>
                <p className="text-[10px] text-green-600/60 mb-1">الكمية المتاحة</p>
                <div className="flex items-center justify-end gap-1.5">
                  <span className="text-[22px] font-black text-[#15803d]">{card.available_quantity.toLocaleString()}</span>
                  <Package className="w-4 h-4 text-green-500/50" />
                </div>
                <p className="text-[10px] text-green-600/50">طبلية</p>
              </div>

              <div className="rounded-2xl p-3.5 text-right" style={{ background: '#f0f9f4', border: '1px solid rgba(21,128,61,0.08)' }}>
                <p className="text-[10px] text-green-600/60 mb-1">السعر</p>
                {card.price_per_pallet > 0 ? (
                  <>
                    <span className="text-[22px] font-black text-[#15803d]">{card.price_per_pallet.toLocaleString()}</span>
                    <p className="text-[10px] text-green-600/50">ريال / طبلية</p>
                  </>
                ) : (
                  <p className="text-[14px] font-semibold text-[#a0b5c0] mt-1">غير محدد</p>
                )}
              </div>
            </div>

            <div className="rounded-2xl overflow-hidden" style={{ background: '#f5f9fc', border: '1px solid rgba(0,0,0,0.04)' }}>
              <div className="grid grid-cols-2 divide-x divide-gray-100" dir="rtl">
                <div className="p-3 text-right">
                  <p className="text-[10px] text-[#7a9aab] mb-0.5">المدينة</p>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-green-500/60" />
                    <span className="text-[13px] font-bold text-[#1a3a4a]">{card.city}</span>
                  </div>
                </div>
                <div className="p-3 text-right">
                  <p className="text-[10px] text-[#7a9aab] mb-0.5">المقاس</p>
                  <span className="text-[13px] font-bold text-[#1a3a4a]">{card.size || '-'}</span>
                </div>
              </div>
            </div>

            <TrustRatingBadge rating={card.trust_rating ?? 3} size="md" showLabel={true} variant="detailed" />

            {card.description && (
              <div className="rounded-2xl p-3.5 text-right" style={{ background: '#f5f9fc', border: '1px solid rgba(0,0,0,0.04)' }}>
                <p className="text-[11px] font-bold text-[#4a7a8a] mb-1.5">وصف العرض</p>
                <p className="text-[13px] text-[#3a5a6a] leading-relaxed">{card.description}</p>
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
                <p className="text-[11px] text-amber-600/70">
                  {ratingSummary.total_ratings} تقييم من زوّار المنصة
                </p>
              </div>
            )}
          </div>

          <div className="px-5 mt-4">
            <CommentsSection userPhone={card.phone} maxComments={5} refreshTrigger={refreshKey} />
          </div>
        </div>

        <div
          className="flex-shrink-0 px-4 pb-5 pt-3"
          style={{
            background: 'linear-gradient(to top, #ffffff 0%, #f8fafb 100%)',
            borderTop: '1px solid rgba(0,0,0,0.06)',
          }}
        >
          <button
            onClick={handleWhatsAppClick}
            className="w-full relative overflow-hidden group mb-3"
          >
            <div
              className="absolute inset-0 transition-transform duration-300 group-active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #25D366, #128C7E)',
                boxShadow: '0 6px 20px rgba(37,211,102,0.35)',
              }}
            />
            <div
              className="absolute inset-0 opacity-0 group-active:opacity-100 transition-opacity duration-200"
              style={{ background: 'linear-gradient(135deg, #20BA5A, #0F7A66)' }}
            />
            <div className="relative flex items-center justify-center gap-2.5 py-4 rounded-2xl">
              <MessageCircle className="w-5 h-5 text-white" strokeWidth={2.5} />
              <span className="text-[15px] font-black text-white">تواصل عبر الواتساب</span>
              <div
                className="absolute left-3 w-2 h-2 rounded-full animate-pulse"
                style={{ background: '#dcfce7', boxShadow: '0 0 8px #22c55e' }}
              />
            </div>
          </button>

          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={onClose}
              className="flex flex-col items-center justify-center py-3 rounded-2xl transition-all active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #1a4a5e, #2c5f73)',
                boxShadow: '0 4px 12px rgba(26,74,94,0.25)',
              }}
            >
              <Home className="w-5 h-5 text-white mb-1" />
              <span className="text-[11px] font-bold text-white">الرئيسية</span>
            </button>

            <button
              onClick={() => setShowRatingDialog(true)}
              className="flex flex-col items-center justify-center py-3 rounded-2xl transition-all active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                boxShadow: '0 4px 12px rgba(245,158,11,0.25)',
              }}
            >
              <Star className="w-5 h-5 text-white mb-1" />
              <span className="text-[11px] font-bold text-white">تقييم</span>
            </button>

            <button
              onClick={handleFavorite}
              className="flex flex-col items-center justify-center py-3 rounded-2xl transition-all active:scale-95"
              style={{
                background: isFavorited
                  ? 'linear-gradient(135deg, #DC2626, #EF4444)'
                  : 'linear-gradient(135deg, #ffffff, #f5f9fc)',
                color: isFavorited ? 'white' : '#1a4a5e',
                border: isFavorited ? 'none' : '1.5px solid rgba(0,0,0,0.08)',
                boxShadow: isFavorited
                  ? '0 4px 12px rgba(220,38,38,0.3)'
                  : '0 2px 8px rgba(0,0,0,0.08)',
              }}
            >
              <Heart className={`w-5 h-5 mb-1 ${isFavorited ? 'fill-white text-white' : ''}`} />
              <span className={`text-[11px] font-bold ${isFavorited ? 'text-white' : ''}`}>
                {isFavorited ? 'مفضل' : 'حفظ'}
              </span>
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
          onRatingSubmitted={() => {
            setShowRatingDialog(false);
            loadRatingSummary();
            setRefreshKey(prev => prev + 1);
          }}
        />
      )}
    </div>
  );
}
