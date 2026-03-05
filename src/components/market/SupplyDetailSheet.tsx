import { useState } from 'react';
import { X, MapPin, Package, Wrench, ChevronLeft, ChevronRight, Warehouse, ImageOff, Heart, Handshake, CheckCircle2, Loader2 } from 'lucide-react';
import { useCreateDeal } from '../../hooks/useCreateDeal';

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
}

const QUALITY_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  A: { bg: '#dcfce7', text: '#15803d', label: 'درجة A' },
  B: { bg: '#dbeafe', text: '#1d4ed8', label: 'درجة B' },
  C: { bg: '#fef9c3', text: '#a16207', label: 'درجة C' },
  Scrap: { bg: '#fee2e2', text: '#b91c1c', label: 'خردة' },
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
  onShowAuthPrompt: (quantity: number) => void;
  onNavigateToDeals?: () => void;
  buyerPhone: string;
}

export default function SupplyDetailSheet({ card, onClose, isAuthenticated, onShowAuthPrompt, onNavigateToDeals, buyerPhone }: Props) {
  const { createDeal, loading: creatingDeal } = useCreateDeal();
  const [imgIndex, setImgIndex] = useState(0);
  const [isFavorited, setIsFavorited] = useState(false);
  const [requestedQuantity, setRequestedQuantity] = useState(card.available_quantity);
  const [dealCreated, setDealCreated] = useState(false);
  const [dealId, setDealId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const q = QUALITY_COLORS[card.quality] || QUALITY_COLORS.C;
  const cond = CONDITION_MAP[card.pallet_condition] || CONDITION_MAP.used;
  const hasImages = card.image_urls.length > 0;

  const goNext = () => setImgIndex((i) => (i + 1) % card.image_urls.length);
  const goPrev = () => setImgIndex((i) => (i - 1 + card.image_urls.length) % card.image_urls.length);

  const handleNegotiate = async () => {
    if (!isAuthenticated) {
      onShowAuthPrompt(requestedQuantity);
      return;
    }

    setError(null);
    const result = await createDeal({
      batchId: card.id,
      buyerPhone,
      quantity: requestedQuantity,
    });

    if (result.success && result.dealId) {
      setDealCreated(true);
      setDealId(result.dealId);
    } else {
      setError(result.error || 'فشل إنشاء الصفقة');
    }
  };

  const handleFavorite = () => {
    if (!isAuthenticated) {
      onShowAuthPrompt(requestedQuantity);
    } else {
      setIsFavorited(!isFavorited);
    }
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

              <button
                onClick={onClose}
                className="absolute top-3 left-3 w-9 h-9 flex items-center justify-center rounded-full z-10"
                style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)' }}
              >
                <X className="w-4.5 h-4.5 text-white" />
              </button>

              <div
                className="absolute top-3 right-3 flex items-center gap-2 z-10"
              >
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
              <button
                onClick={onClose}
                className="absolute top-3 left-3 w-9 h-9 flex items-center justify-center rounded-full z-10"
                style={{ background: 'rgba(0,0,0,0.15)', backdropFilter: 'blur(8px)' }}
              >
                <X className="w-4.5 h-4.5 text-[#1a3a4a]" />
              </button>
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
                  <img src={url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          <div className="px-5 mt-4">
            <h2 className="text-[20px] font-black text-[#1a3a4a] text-right mb-1">{card.pallet_type}</h2>
            <div className="flex items-center gap-1 justify-end mb-4">
              <span className="text-[12px] text-[#7a9aab]">{timeAgo(card.created_at)}</span>
            </div>
          </div>

          <div className="px-5 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl p-3.5 text-right" style={{ background: '#f0f9f4', border: '1px solid rgba(21,128,61,0.08)' }}>
                <p className="text-[10px] text-green-600/60 mb-1">الكمية المتاحة</p>
                <div className="flex items-center justify-end gap-1.5">
                  <span className="text-[24px] font-black text-[#15803d]">{card.available_quantity.toLocaleString()}</span>
                  <Package className="w-4.5 h-4.5 text-green-500/50" />
                </div>
                <p className="text-[10px] text-green-600/50">طبلية</p>
              </div>

              <div className="rounded-2xl p-3.5 text-right" style={{ background: '#f0f9f4', border: '1px solid rgba(21,128,61,0.08)' }}>
                <p className="text-[10px] text-green-600/60 mb-1">السعر</p>
                {card.price_per_pallet > 0 ? (
                  <>
                    <span className="text-[24px] font-black text-[#15803d]">{card.price_per_pallet}</span>
                    <p className="text-[10px] text-green-600/50">ريال / طبلية</p>
                  </>
                ) : (
                  <p className="text-[14px] font-semibold text-[#a0b5c0] mt-1">غير محدد</p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 justify-end">
              <span className="text-[12px] font-bold px-3 py-1.5 rounded-xl" style={{ background: q.bg, color: q.text }}>
                {q.label}
              </span>
              <span className="text-[12px] font-semibold px-3 py-1.5 rounded-xl flex items-center gap-1.5" style={{ background: cond.bg, color: cond.color }}>
                <Wrench className="w-3 h-3" />
                {cond.label}
              </span>
              {card.size && (
                <span className="text-[12px] font-semibold px-3 py-1.5 rounded-xl" style={{ background: '#f0f4f8', color: '#4a7a8a' }}>
                  {card.size} سم
                </span>
              )}
            </div>

            <div className="rounded-2xl p-3.5 flex items-center justify-end gap-2" style={{ background: '#f5f9fc', border: '1px solid rgba(0,0,0,0.04)' }}>
              <span className="text-[13px] font-bold text-[#1a3a4a]">{card.city}</span>
              <MapPin className="w-4 h-4 text-green-500/60" />
            </div>

            {card.description && (
              <div className="rounded-2xl p-3.5 text-right" style={{ background: '#f5f9fc', border: '1px solid rgba(0,0,0,0.04)' }}>
                <p className="text-[11px] font-bold text-[#4a7a8a] mb-1.5">وصف العرض</p>
                <p className="text-[13px] text-[#3a5a6a] leading-relaxed">{card.description}</p>
              </div>
            )}

            <div className="rounded-2xl p-4 text-right" style={{ background: '#f0f9f4', border: '1.5px solid rgba(21,128,61,0.15)' }}>
              <label className="text-[12px] font-bold text-[#15803d] mb-2 block">الكمية المطلوبة</label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setRequestedQuantity(Math.max(1, requestedQuantity - 10))}
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-lg font-black transition-all active:scale-90"
                  style={{ background: 'linear-gradient(135deg, #15803d, #22c55e)' }}
                >
                  -
                </button>
                <input
                  type="number"
                  value={requestedQuantity}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 1;
                    setRequestedQuantity(Math.min(card.available_quantity, Math.max(1, val)));
                  }}
                  className="flex-1 text-center text-[18px] font-black text-[#15803d] px-3 py-2.5 rounded-xl border-none outline-none"
                  style={{ background: 'white' }}
                  min={1}
                  max={card.available_quantity}
                />
                <button
                  onClick={() => setRequestedQuantity(Math.min(card.available_quantity, requestedQuantity + 10))}
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-lg font-black transition-all active:scale-90"
                  style={{ background: 'linear-gradient(135deg, #15803d, #22c55e)' }}
                >
                  +
                </button>
              </div>
              <p className="text-[11px] text-green-600/60 mt-2 text-center">
                الحد الأقصى: {card.available_quantity.toLocaleString()} طبلية
              </p>
            </div>
          </div>
        </div>

        <div className="flex-shrink-0 px-5 pb-6 pt-3 space-y-2.5" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
          {error && (
            <div
              className="rounded-2xl p-3 text-center text-[13px] font-semibold"
              style={{ background: '#fee2e2', color: '#b91c1c' }}
            >
              {error}
            </div>
          )}

          {dealCreated ? (
            <div className="space-y-3">
              <div
                className="rounded-2xl p-4 flex items-center gap-3"
                style={{ background: '#dcfce7', border: '1.5px solid rgba(34,197,94,0.3)' }}
              >
                <div className="flex-1 text-right">
                  <p className="text-[14px] font-black text-[#15803d] mb-1">تم إنشاء الصفقة بنجاح!</p>
                  <p className="text-[11px] text-[#166534]">يمكنك متابعة الصفقة من صفقاتي</p>
                  {dealId && (
                    <p className="text-[10px] font-mono font-bold text-[#166534]/60 mt-1">#{dealId.slice(0, 8)}</p>
                  )}
                </div>
                <CheckCircle2 className="w-8 h-8 text-[#15803d] flex-shrink-0" />
              </div>
              <button
                onClick={() => {
                  if (onNavigateToDeals) {
                    onNavigateToDeals();
                    onClose();
                  }
                }}
                className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl text-[15px] font-black text-white transition-all active:scale-[0.98]"
                style={{
                  background: 'linear-gradient(135deg, #0f2535, #1a4a5e)',
                  boxShadow: '0 6px 20px rgba(15,37,53,0.3)',
                }}
              >
                <Handshake className="w-5 h-5" />
                اذهب إلى صفقاتي
              </button>
            </div>
          ) : (
            <div className="flex gap-2.5">
              <button
                onClick={handleFavorite}
                disabled={creatingDeal}
                className="flex-shrink-0 w-14 h-14 flex items-center justify-center rounded-2xl transition-all active:scale-95"
                style={{
                  background: isFavorited ? 'linear-gradient(135deg, #DC2626, #EF4444)' : 'white',
                  border: isFavorited ? 'none' : '1.5px solid rgba(0,0,0,0.1)',
                  boxShadow: isFavorited ? '0 4px 16px rgba(220,38,38,0.3)' : '0 2px 8px rgba(0,0,0,0.08)',
                  cursor: creatingDeal ? 'not-allowed' : 'pointer',
                  opacity: creatingDeal ? 0.5 : 1,
                }}
              >
                <Heart
                  className={`w-5 h-5 transition-all ${isFavorited ? 'fill-white text-white scale-110' : 'text-[#7a9aab]'}`}
                />
              </button>
              <button
                onClick={handleNegotiate}
                disabled={creatingDeal}
                className="flex-1 relative overflow-hidden group"
              >
                <div
                  className="absolute inset-0 transition-transform duration-300 group-active:scale-95"
                  style={{
                    background: creatingDeal ? '#9ca3af' : 'linear-gradient(135deg, #15803d, #22c55e)',
                    boxShadow: '0 4px 16px rgba(34,197,94,0.35)',
                  }}
                />
                <div
                  className="absolute inset-0 opacity-0 group-active:opacity-100 transition-opacity duration-200"
                  style={{ background: 'linear-gradient(135deg, #166534, #16a34a)' }}
                />
                <div className="relative flex items-center justify-center gap-2.5 py-4 rounded-2xl">
                  {creatingDeal ? (
                    <>
                      <Loader2 className="w-5 h-5 text-white animate-spin" />
                      <span className="text-[14px] font-black text-white">جاري الإنشاء...</span>
                    </>
                  ) : (
                    <>
                      <Handshake className="w-5 h-5 text-white" strokeWidth={2.5} />
                      <span className="text-[14px] font-black text-white">تفاوض الآن</span>
                      <div
                        className="absolute left-3 w-2 h-2 rounded-full animate-pulse"
                        style={{ background: '#dcfce7', boxShadow: '0 0 8px #22c55e' }}
                      />
                    </>
                  )}
                </div>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
