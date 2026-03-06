import { useState, useEffect } from 'react';
import { X, MapPin, Package, Star, ShoppingBag, Heart } from 'lucide-react';
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
  const flexItems = [
    { active: card.accept_close_quality, label: 'يقبل جودة قريبة', bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
    { active: card.accept_close_city, label: 'يقبل مدينة قريبة', bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
    { active: card.accept_partial_delivery, label: 'يقبل توريد جزئي', bg: '#FFF7ED', color: '#b45309', border: '#FED7AA' },
  ].filter((f) => f.active);

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

            <TrustRatingBadge rating={card.trust_rating ?? 3} size="md" showLabel={true} variant="detailed" />

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

        <div className="flex-shrink-0 px-5 pb-6 pt-3 space-y-3" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
          <button
            onClick={() => setShowRatingDialog(true)}
            className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl text-[14px] font-bold transition-all active:scale-95 bg-amber-50 border-2 border-amber-200 text-amber-700 hover:bg-amber-100"
          >
            <Star className="w-4.5 h-4.5" />
            تقييم هذا الطلب
          </button>

          <button
            onClick={handleFavorite}
            className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl text-[15px] font-black text-white transition-all active:scale-95"
            style={{
              background: isFavorited ? 'linear-gradient(135deg, #DC2626, #EF4444)' : 'linear-gradient(135deg, #B45309, #D97706)',
              boxShadow: isFavorited ? '0 6px 20px rgba(220,38,38,0.3)' : '0 6px 20px rgba(217,119,6,0.3)',
            }}
          >
            <Heart className={`w-5 h-5 ${isFavorited ? 'fill-white' : ''}`} />
            {isFavorited ? 'تمت الإضافة للمفضلة' : 'إضافة للمفضلة'}
          </button>
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
