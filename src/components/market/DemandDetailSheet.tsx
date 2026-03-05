import { useState } from 'react';
import { X, MapPin, Package, Star, ShoppingBag, Heart, Handshake } from 'lucide-react';

interface DemandCard {
  id: string;
  pallet_type: string;
  size: string;
  quality: string;
  quantity: number;
  city: string;
  accept_close_quality: boolean;
  accept_close_city: boolean;
  accept_partial_delivery: boolean;
  created_at: string;
}

const QUALITY_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  A: { bg: '#dcfce7', text: '#15803d', label: 'درجة A' },
  B: { bg: '#dbeafe', text: '#1d4ed8', label: 'درجة B' },
  C: { bg: '#fef9c3', text: '#a16207', label: 'درجة C' },
  Scrap: { bg: '#fee2e2', text: '#b91c1c', label: 'خردة' },
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

interface Props {
  card: DemandCard;
  onClose: () => void;
  isAuthenticated: boolean;
  onShowAuthPrompt: () => void;
}

export default function DemandDetailSheet({ card, onClose, isAuthenticated, onShowAuthPrompt }: Props) {
  const [isFavorited, setIsFavorited] = useState(false);
  const q = QUALITY_COLORS[card.quality] || QUALITY_COLORS.C;
  const flexItems = [
    { active: card.accept_close_quality, label: 'يقبل جودة قريبة', bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
    { active: card.accept_close_city, label: 'يقبل مدينة قريبة', bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
    { active: card.accept_partial_delivery, label: 'يقبل توريد جزئي', bg: '#FFF7ED', color: '#b45309', border: '#FED7AA' },
  ].filter((f) => f.active);

  const handleNegotiate = () => {
    onShowAuthPrompt();
  };

  const handleFavorite = () => {
    if (!isAuthenticated) {
      onShowAuthPrompt();
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
        style={{ background: 'white', maxHeight: '88vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-shrink-0 h-1 w-12 rounded-full mx-auto mt-3 mb-1" style={{ background: '#d1d5db' }} />

        <div className="overflow-y-auto flex-1 pb-4">
          <div className="relative w-full overflow-hidden" style={{ background: 'linear-gradient(145deg, #FFF7ED 0%, #FEF3C7 40%, #FDE68A 100%)' }}>
            <div
              className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-[0.12] pointer-events-none"
              style={{
                background: 'radial-gradient(circle, #F59E0B 0%, transparent 70%)',
                transform: 'translate(20%, -30%)',
              }}
            />
            <div
              className="absolute bottom-0 left-0 w-36 h-36 rounded-full opacity-[0.08] pointer-events-none"
              style={{
                background: 'radial-gradient(circle, #D97706 0%, transparent 70%)',
                transform: 'translate(-20%, 30%)',
              }}
            />

            <button
              onClick={onClose}
              className="absolute top-3 left-3 w-9 h-9 flex items-center justify-center rounded-full z-10"
              style={{ background: 'rgba(0,0,0,0.1)', backdropFilter: 'blur(8px)' }}
            >
              <X className="w-4 h-4 text-amber-800" />
            </button>

            <span
              className="absolute top-3 right-3 text-[11px] font-bold px-2.5 py-1 rounded-full z-10"
              style={{ background: 'rgba(180,83,9,0.85)', color: 'white', backdropFilter: 'blur(8px)' }}
            >
              طلب مشترٍ
            </span>

            <div className="relative flex flex-col items-center justify-center py-8 px-5">
              <div
                className="w-16 h-16 rounded-3xl flex items-center justify-center mb-3"
                style={{ background: 'rgba(245,158,11,0.15)' }}
              >
                <ShoppingBag className="w-8 h-8 text-amber-500" />
              </div>
              <p className="text-[36px] font-black text-amber-800 leading-none">{card.quantity.toLocaleString()}</p>
              <p className="text-[12px] font-bold text-amber-600/60 mt-1">طبلية مطلوبة</p>
              <p className="text-[10px] text-amber-500/50 mt-2">{timeAgo(card.created_at)}</p>
            </div>
          </div>

          <div className="px-5 mt-4">
            <h2 className="text-[20px] font-black text-[#1a3a4a] text-right mb-4">{card.pallet_type}</h2>
          </div>

          <div className="px-5 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl p-3.5 text-right" style={{ background: '#FFF7ED', border: '1px solid rgba(217,119,6,0.1)' }}>
                <p className="text-[10px] text-amber-600/60 mb-1.5">الجودة المطلوبة</p>
                <span className="text-[13px] font-bold px-2.5 py-1 rounded-xl inline-block" style={{ background: q.bg, color: q.text }}>
                  {q.label}
                </span>
              </div>
              <div className="rounded-2xl p-3.5 text-right" style={{ background: '#FFF7ED', border: '1px solid rgba(217,119,6,0.1)' }}>
                <p className="text-[10px] text-amber-600/60 mb-1">المدينة</p>
                <div className="flex items-center justify-end gap-1.5">
                  <span className="text-[14px] font-bold text-[#1a3a4a]">{card.city}</span>
                  <MapPin className="w-4 h-4 text-amber-400" />
                </div>
              </div>
            </div>

            {card.size && (
              <div className="rounded-2xl p-3.5 text-right" style={{ background: '#FFF7ED', border: '1px solid rgba(217,119,6,0.1)' }}>
                <p className="text-[10px] text-amber-600/60 mb-1">الحجم</p>
                <span className="text-[14px] font-bold text-[#1a3a4a]">{card.size} سم</span>
              </div>
            )}

            {flexItems.length > 0 && (
              <div className="rounded-2xl p-3.5 text-right" style={{ background: '#FFF7ED', border: '1px solid rgba(217,119,6,0.1)' }}>
                <div className="flex items-center justify-end gap-1.5 mb-2.5">
                  <p className="text-[11px] font-bold text-amber-700">شروط المرونة</p>
                  <Star className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <div className="flex flex-wrap gap-2 justify-end">
                  {flexItems.map((f) => (
                    <span
                      key={f.label}
                      className="text-[11px] font-semibold px-2.5 py-1 rounded-xl"
                      style={{ background: f.bg, color: f.color, border: `1px solid ${f.border}` }}
                    >
                      {f.label}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-2xl p-3 flex items-center justify-center gap-2" style={{ background: '#f5f9fc', border: '1px solid rgba(0,0,0,0.04)' }}>
              <Package className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[11px] font-semibold text-[#4a7a8a]">
                الكمية المطلوبة: <strong className="text-amber-700">{card.quantity.toLocaleString()}</strong> طبلية
              </span>
            </div>
          </div>
        </div>

        <div className="flex-shrink-0 px-5 pb-6 pt-3 space-y-2.5" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
          <div className="flex gap-2.5">
            <button
              onClick={handleFavorite}
              className="flex-shrink-0 w-14 h-14 flex items-center justify-center rounded-2xl transition-all active:scale-95"
              style={{
                background: isFavorited ? 'linear-gradient(135deg, #DC2626, #EF4444)' : 'white',
                border: isFavorited ? 'none' : '1.5px solid rgba(0,0,0,0.1)',
                boxShadow: isFavorited ? '0 4px 16px rgba(220,38,38,0.3)' : '0 2px 8px rgba(0,0,0,0.08)',
              }}
            >
              <Heart
                className={`w-5 h-5 transition-all ${isFavorited ? 'fill-white text-white scale-110' : 'text-[#7a9aab]'}`}
              />
            </button>
            <button
              onClick={handleNegotiate}
              className="flex-1 relative overflow-hidden group"
            >
              <div
                className="absolute inset-0 transition-transform duration-300 group-active:scale-95"
                style={{ background: 'linear-gradient(135deg, #B45309, #D97706)', boxShadow: '0 4px 16px rgba(217,119,6,0.35)' }}
              />
              <div
                className="absolute inset-0 opacity-0 group-active:opacity-100 transition-opacity duration-200"
                style={{ background: 'linear-gradient(135deg, #92400e, #b45309)' }}
              />
              <div className="relative flex items-center justify-center gap-2.5 py-4 rounded-2xl">
                <div className="flex items-center gap-2">
                  <Handshake className="w-5 h-5 text-white" strokeWidth={2.5} />
                  <span className="text-[14px] font-black text-white">تفاوض الآن</span>
                </div>
                <div
                  className="absolute left-3 w-2 h-2 rounded-full animate-pulse"
                  style={{ background: '#fef9c3', boxShadow: '0 0 8px #fbbf24' }}
                />
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
