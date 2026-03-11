import { useState, useEffect } from 'react';
import { MapPin, Package, Star, ShoppingBag, Heart, Home, X } from 'lucide-react';
import TrustRatingBadge from '../shared/TrustRatingBadge';
import VisitorRatingDialog from './VisitorRatingDialog';
import { CommentsSection } from '../shared/CommentsSection';
import { supabase } from '../../lib/supabase';

interface DemandCard {
  id: string;
  phone: string;
  pallet_type: string;
  size: string;
  quality: string;
  quantity: number;
  city: string;
  accept_close_quality: boolean;
  accept_close_city: boolean;
  accept_partial_delivery: boolean;
  created_at: string;
  trust_rating?: number;
}

const QUALITY_COLORS: Record<string, { bg: string; text: string; label: string; dot: string }> = {
  A: { bg: '#dcfce7', text: '#15803d', label: 'درجة A', dot: '#22c55e' },
  B: { bg: '#dbeafe', text: '#1d4ed8', label: 'درجة B', dot: '#3b82f6' },
  C: { bg: '#fff7ed', text: '#c2410c', label: 'درجة C', dot: '#f97316' },
  Scrap: { bg: '#f3f4f6', text: '#6b7280', label: 'خردة', dot: '#9ca3af' },
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
  sessionPhone?: string | null;
  onLoginRequired?: () => void;
  autoOpenOffer?: boolean;
}

export default function DemandDetailSheet({ card, onClose }: Props) {
  const [isFavorited, setIsFavorited] = useState(false);
  const [showRatingDialog, setShowRatingDialog] = useState(false);
  const [ratingSummary, setRatingSummary] = useState<{ average_rating: number; total_ratings: number } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => { loadRatingSummary(); }, [card.phone]);

  const loadRatingSummary = async () => {
    try {
      const { data } = await supabase.rpc('get_visitor_ratings_summary', { p_user_phone: card.phone });
      setRatingSummary(data);
    } catch {}
  };

  const q = QUALITY_COLORS[card.quality] || QUALITY_COLORS.C;
  const flexItems = [
    { active: card.accept_close_quality, label: 'يقبل جودة قريبة', bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
    { active: card.accept_close_city, label: 'يقبل مدينة قريبة', bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
    { active: card.accept_partial_delivery, label: 'يقبل توريد جزئي', bg: '#FFF7ED', color: '#b45309', border: '#FED7AA' },
  ].filter((f) => f.active);

  const handleFavorite = () => setIsFavorited(!isFavorited);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className="w-full md:rounded-3xl rounded-t-3xl overflow-hidden flex flex-col md:shadow-2xl"
        style={{ background: 'white', maxHeight: '92vh', maxWidth: 680 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-shrink-0 h-1 w-12 rounded-full mx-auto mt-3 mb-1 md:hidden" style={{ background: '#d1d5db' }} />

        <div className="hidden md:flex items-center justify-between px-5 py-3 border-b border-amber-100/60 flex-shrink-0" style={{ background: 'linear-gradient(135deg, #FFFBEB, #FEF3C7)' }}>
          <div className="flex items-center gap-2" dir="rtl">
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ background: 'rgba(180,83,9,0.12)', color: '#b45309' }}>طلب مشترٍ</span>
            <h2 className="text-[16px] font-black text-[#1a3a4a]">{card.pallet_type}</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-white/70 flex items-center justify-center hover:bg-white transition-colors border border-amber-100">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 pb-4 md:grid md:grid-cols-[280px_1fr] md:gap-0">
          <div className="md:border-l md:border-amber-100/50 flex flex-col">
            <div className="relative w-full overflow-hidden" style={{ background: 'linear-gradient(145deg, #FFF7ED 0%, #FEF3C7 40%, #FDE68A 100%)' }}>
              <div className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-[0.12] pointer-events-none" style={{ background: 'radial-gradient(circle, #F59E0B 0%, transparent 70%)', transform: 'translate(20%, -30%)' }} />
              <div className="absolute bottom-0 left-0 w-36 h-36 rounded-full opacity-[0.08] pointer-events-none" style={{ background: 'radial-gradient(circle, #D97706 0%, transparent 70%)', transform: 'translate(-20%, 30%)' }} />

              <span className="absolute top-3 right-3 text-[11px] font-bold px-2.5 py-1 rounded-full z-10 md:hidden" style={{ background: 'rgba(180,83,9,0.85)', color: 'white', backdropFilter: 'blur(8px)' }}>
                طلب مشترٍ
              </span>

              <div className="relative flex flex-col items-center justify-center py-8 px-5 md:py-12">
                <div className="w-16 h-16 rounded-3xl flex items-center justify-center mb-3" style={{ background: 'rgba(245,158,11,0.15)' }}>
                  <ShoppingBag className="w-8 h-8 text-amber-500" />
                </div>
                <p className="text-[42px] font-black text-amber-800 leading-none">{card.quantity.toLocaleString()}</p>
                <p className="text-[12px] font-bold text-amber-600/60 mt-1">طبلية مطلوبة</p>
                <p className="text-[10px] text-amber-500/50 mt-2">{timeAgo(card.created_at)}</p>
              </div>
            </div>

            <div className="hidden md:flex flex-col gap-2 p-4 mt-auto">
              <div className="grid grid-cols-3 gap-2">
                <button onClick={onClose} className="flex flex-col items-center justify-center py-3 rounded-2xl transition-all hover:opacity-90 active:scale-95" style={{ background: 'linear-gradient(135deg, #1a4a5e, #2c5f73)', boxShadow: '0 4px 12px rgba(26,74,94,0.25)' }}>
                  <Home className="w-5 h-5 text-white mb-1" />
                  <span className="text-[11px] font-bold text-white">الرئيسية</span>
                </button>
                <button onClick={() => setShowRatingDialog(true)} className="flex flex-col items-center justify-center py-3 rounded-2xl transition-all hover:opacity-90 active:scale-95" style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)', boxShadow: '0 4px 12px rgba(245,158,11,0.25)' }}>
                  <Star className="w-5 h-5 text-white mb-1" />
                  <span className="text-[11px] font-bold text-white">تقييم</span>
                </button>
                <button onClick={handleFavorite} className="flex flex-col items-center justify-center py-3 rounded-2xl transition-all hover:opacity-90 active:scale-95" style={{ background: isFavorited ? 'linear-gradient(135deg, #DC2626, #EF4444)' : 'linear-gradient(135deg, #ffffff, #fffaf0)', color: isFavorited ? 'white' : '#1a4a5e', border: isFavorited ? 'none' : '1.5px solid rgba(217,119,6,0.15)', boxShadow: isFavorited ? '0 4px 12px rgba(220,38,38,0.3)' : '0 2px 8px rgba(217,119,6,0.12)' }}>
                  <Heart className={`w-5 h-5 mb-1 ${isFavorited ? 'fill-white text-white' : ''}`} />
                  <span className={`text-[11px] font-bold ${isFavorited ? 'text-white' : ''}`}>{isFavorited ? 'مفضل' : 'حفظ'}</span>
                </button>
              </div>
            </div>
          </div>

          <div className="md:overflow-y-auto">
            <div className="px-5 mt-4 md:mt-5">
              <h2 className="text-[20px] font-black text-[#1a3a4a] text-right mb-4 md:hidden">{card.pallet_type}</h2>
            </div>

            <div className="px-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl p-3.5 text-right" style={{ background: '#FFF7ED', border: '1px solid rgba(217,119,6,0.1)' }}>
                  <p className="text-[10px] text-amber-600/60 mb-1.5">الجودة المطلوبة</p>
                  <span className="flex items-center gap-1.5 text-[13px] font-bold px-2.5 py-1 rounded-xl inline-flex" style={{ background: q.bg, color: q.text }}>
                    <span className="w-2 h-2 rounded-full" style={{ background: q.dot }} />
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

              <TrustRatingBadge rating={card.trust_rating ?? 3} size="md" showLabel={true} variant="detailed" />

              {flexItems.length > 0 && (
                <div className="rounded-2xl p-3.5 text-right" style={{ background: '#FFF7ED', border: '1px solid rgba(217,119,6,0.1)' }}>
                  <div className="flex items-center justify-end gap-1.5 mb-2.5">
                    <p className="text-[11px] font-bold text-amber-700">شروط المرونة</p>
                    <Star className="w-3.5 h-3.5 text-amber-400" />
                  </div>
                  <div className="flex flex-wrap gap-2 justify-end">
                    {flexItems.map((f) => (
                      <span key={f.label} className="text-[11px] font-semibold px-2.5 py-1 rounded-xl" style={{ background: f.bg, color: f.color, border: `1px solid ${f.border}` }}>
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
            </div>

            <div className="px-5 mt-4">
              <CommentsSection userPhone={card.phone} maxComments={5} refreshTrigger={refreshKey} />
            </div>
          </div>
        </div>

        <div className="md:hidden flex-shrink-0 px-4 pb-5 pt-3" style={{ background: 'linear-gradient(to top, #ffffff 0%, #fffaf0 100%)', borderTop: '1px solid rgba(217,119,6,0.1)' }}>
          <div className="grid grid-cols-3 gap-2">
            <button onClick={onClose} className="flex flex-col items-center justify-center py-3.5 rounded-2xl transition-all active:scale-95" style={{ background: 'linear-gradient(135deg, #1a4a5e, #2c5f73)', boxShadow: '0 4px 12px rgba(26,74,94,0.25)' }}>
              <Home className="w-5 h-5 text-white mb-1" />
              <span className="text-[11px] font-bold text-white">الرئيسية</span>
            </button>
            <button onClick={() => setShowRatingDialog(true)} className="flex flex-col items-center justify-center py-3.5 rounded-2xl transition-all active:scale-95" style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)', boxShadow: '0 4px 12px rgba(245,158,11,0.25)' }}>
              <Star className="w-5 h-5 text-white mb-1" />
              <span className="text-[11px] font-bold text-white">تقييم</span>
            </button>
            <button onClick={handleFavorite} className="flex flex-col items-center justify-center py-3.5 rounded-2xl transition-all active:scale-95" style={{ background: isFavorited ? 'linear-gradient(135deg, #DC2626, #EF4444)' : 'linear-gradient(135deg, #ffffff, #fffaf0)', color: isFavorited ? 'white' : '#1a4a5e', border: isFavorited ? 'none' : '1.5px solid rgba(217,119,6,0.15)', boxShadow: isFavorited ? '0 4px 12px rgba(220,38,38,0.3)' : '0 2px 8px rgba(217,119,6,0.12)' }}>
              <Heart className={`w-5 h-5 mb-1 ${isFavorited ? 'fill-white text-white' : ''}`} />
              <span className={`text-[11px] font-bold ${isFavorited ? 'text-white' : ''}`}>{isFavorited ? 'مفضل' : 'حفظ'}</span>
            </button>
          </div>
        </div>
      </div>

      {showRatingDialog && (
        <VisitorRatingDialog
          isOpen={showRatingDialog}
          onClose={() => setShowRatingDialog(false)}
          ratedUserPhone={card.phone}
          ratedUserName="المشتري"
          itemType="demand"
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
