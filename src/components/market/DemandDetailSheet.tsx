import { useState, useEffect } from 'react';
import { MapPin, Package, Star, ShoppingBag, Heart, Home, X, Handshake, LogIn, CheckCircle, Send, Clock, CheckCircle2, XCircle, MessageSquare } from 'lucide-react';
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

function SupplierLoginPromptDialog({ card, onClose, onLogin }: {
  card: DemandCard;
  onClose: () => void;
  onLogin: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-8"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div
        className="w-full rounded-3xl overflow-hidden"
        style={{ maxWidth: 480, background: 'white' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 pt-5 pb-6 space-y-4" dir="rtl">
          <div className="flex items-start justify-between">
            <button onClick={onClose} className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center mt-0.5">
              <X className="w-3.5 h-3.5 text-gray-500" />
            </button>
            <div className="flex items-center gap-2">
              <div>
                <p className="text-[15px] font-black text-[#1a3a4a]">رسالة للمورد</p>
                <p className="text-[11px] text-[#7a9aab]">{card.pallet_type} — {card.city}</p>
              </div>
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #b45309, #d97706)' }}>
                <Handshake className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>
          <div className="rounded-2xl p-4 space-y-2" style={{ background: '#f8fbfd', border: '1.5px solid #e2edf5' }}>
            <div className="flex items-start gap-2">
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: 'linear-gradient(135deg, #b45309, #d97706)' }}>
                <span className="text-[10px] font-black text-white">ع</span>
              </div>
              <div className="flex-1 rounded-2xl rounded-tr-none px-3.5 py-3" style={{ background: 'white', border: '1px solid #e2edf5', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                <p className="text-[13px] text-[#1a3a4a] leading-relaxed">هذا المشتري يبحث عن طبليات مشابهة لما لديك.</p>
                <p className="text-[13px] text-[#1a3a4a] leading-relaxed mt-1">سجّل دخولك لتقديم عرضك مباشرة.</p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-1 pt-1">
              <div className="flex-1 h-px" style={{ background: '#e2edf5' }} />
              <span className="text-[10px] text-[#a0b5c0]">يتطلب تسجيل الدخول</span>
              <div className="flex-1 h-px" style={{ background: '#e2edf5' }} />
            </div>
          </div>
          <div className="rounded-2xl p-3.5 flex items-start gap-3" style={{ background: '#FFF7ED', border: '1px solid #FED7AA' }}>
            <CheckCircle className="w-4 h-4 text-[#b45309] flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-[#92400E] leading-relaxed">
              بعد تسجيل الدخول يمكنك إرسال عرضك للمشتري. عند قبوله تُنشأ الصفقة تلقائياً في <span className="font-black">حسابي ← صفقاتي</span>
            </p>
          </div>
          <button onClick={onLogin} className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl text-[14px] font-black text-white transition-transform active:scale-[0.97]" style={{ background: 'linear-gradient(135deg, #b45309, #d97706)', boxShadow: '0 6px 20px rgba(180,83,9,0.3)' }}>
            <LogIn className="w-5 h-5" />
            تسجيل الدخول وتقديم العرض
          </button>
          <button onClick={onClose} className="w-full py-3 rounded-2xl text-[13px] font-bold text-[#4a6a7e]" style={{ background: '#f0f6fa', border: '1px solid #e2edf5' }}>
            ليس الآن
          </button>
        </div>
      </div>
    </div>
  );
}

function SupplierOfferDialog({ card, supplierPhone, existingOffer: rawExisting, onClose, onSent }: {
  card: DemandCard;
  supplierPhone: string;
  existingOffer: { id: string; status: string; created_at: string; quantity: number; price_per_pallet: number } | null;
  onClose: () => void;
  onSent: () => void;
}) {
  const existingOffer = rawExisting?.status === 'rejected' ? null : rawExisting;
  const [message, setMessage] = useState('');
  const [quantity, setQuantity] = useState(card.quantity);
  const [price, setPrice] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSend = async () => {
    if (loading) return;
    if (quantity < 1) { setError('الكمية يجب أن تكون 1 على الأقل'); return; }
    setLoading(true);
    setError('');
    try {
      const { data, error: err } = await supabase.rpc('create_supplier_offer_for_demand', {
        p_supplier_phone: supplierPhone,
        p_order_id: card.id,
        p_quantity: quantity,
        p_price_per_pallet: price,
        p_supplier_message: message.trim() || null,
      });
      if (err) throw err;
      if (data && !data.success) { setError(data.error || 'حدث خطأ'); return; }
      onSent();
    } catch {
      setError('حدث خطأ أثناء إرسال العرض. حاول مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  const statusConfig = {
    pending: { label: 'قيد الانتظار', color: '#b45309', bg: '#FFFBEB', icon: <Clock className="w-4 h-4" /> },
    accepted: { label: 'تم القبول', color: '#059669', bg: '#ECFDF5', icon: <CheckCircle2 className="w-4 h-4" /> },
    rejected: { label: 'تم الرفض', color: '#dc2626', bg: '#FEF2F2', icon: <XCircle className="w-4 h-4" /> },
    deal_created: { label: 'تم إنشاء الصفقة', color: '#1d4ed8', bg: '#EFF6FF', icon: <Handshake className="w-4 h-4" /> },
    cancelled: { label: 'ملغي', color: '#6b7280', bg: '#f3f4f6', icon: <XCircle className="w-4 h-4" /> },
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-8"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div
        className="w-full rounded-3xl overflow-hidden"
        style={{ maxWidth: 480, background: 'white' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 pt-5 pb-6 space-y-4" dir="rtl">
          <div className="flex items-start justify-between">
            <button onClick={onClose} className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center mt-0.5">
              <X className="w-3.5 h-3.5 text-gray-500" />
            </button>
            <div className="flex items-center gap-2">
              <div>
                <p className="text-[15px] font-black text-[#1a3a4a]">تقديم عرض للمشتري</p>
                <p className="text-[11px] text-[#7a9aab]">{card.pallet_type} — {card.city}</p>
              </div>
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #b45309, #d97706)' }}>
                <Handshake className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>

          {existingOffer ? (
            <div className="space-y-3">
              <div className="rounded-2xl p-4" style={{ background: statusConfig[existingOffer.status as keyof typeof statusConfig]?.bg || '#f3f4f6', border: '1px solid rgba(0,0,0,0.06)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <span style={{ color: statusConfig[existingOffer.status as keyof typeof statusConfig]?.color || '#6b7280' }}>
                    {statusConfig[existingOffer.status as keyof typeof statusConfig]?.icon}
                  </span>
                  <span className="text-[13px] font-black" style={{ color: statusConfig[existingOffer.status as keyof typeof statusConfig]?.color || '#6b7280' }}>
                    {statusConfig[existingOffer.status as keyof typeof statusConfig]?.label}
                  </span>
                </div>
                <p className="text-[11px] text-[#7a9aab]">أُرسل {timeAgo(existingOffer.created_at)}</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[12px] font-bold text-[#1a3a4a]">{existingOffer.quantity} طبلية</span>
                  <span className="text-[11px] text-[#7a9aab]">الكمية المعروضة</span>
                </div>
              </div>
              {existingOffer.status === 'pending' && (
                <div className="rounded-2xl p-3.5 flex items-start gap-3" style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
                  <Clock className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-[11px] text-[#92400E] leading-relaxed">عرضك قيد الانتظار. ستصلك إشعار عند رد المشتري. يمكنك متابعته في <span className="font-black">حسابي ← طلباتي</span></p>
                </div>
              )}
              {(existingOffer.status === 'accepted' || existingOffer.status === 'deal_created') && (
                <div className="rounded-2xl p-3.5 flex items-start gap-3" style={{ background: '#ECFDF5', border: '1px solid #A7F3D0' }}>
                  <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <p className="text-[11px] text-[#065F46] leading-relaxed">وافق المشتري على عرضك! توجّه إلى <span className="font-black">حسابي ← صفقاتي</span> لمتابعة الصفقة.</p>
                </div>
              )}
              <button onClick={onClose} className="w-full py-3 rounded-2xl text-[13px] font-bold text-[#4a6a7e]" style={{ background: '#f0f6fa', border: '1px solid #e2edf5' }}>
                إغلاق
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-2xl p-3.5 space-y-2" style={{ background: '#f8fbfd', border: '1px solid #e2edf5' }}>
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-bold text-[#b45309]">{card.quantity.toLocaleString()} طبلية</span>
                  <span className="text-[11px] text-[#7a9aab]">الكمية المطلوبة</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-bold text-[#1a3a4a]">{card.city}</span>
                  <span className="text-[11px] text-[#7a9aab]">المدينة</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-bold text-[#1a3a4a]">{card.quality}</span>
                  <span className="text-[11px] text-[#7a9aab]">الجودة المطلوبة</span>
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-bold text-[#1a3a4a] mb-2 text-right">الكمية التي يمكنك توريدها</label>
                <div className="flex items-center gap-2" dir="rtl">
                  <button onClick={() => setQuantity(q => Math.max(1, q - 10))} className="w-10 h-10 rounded-xl flex items-center justify-center text-[16px] font-black transition-all active:scale-90" style={{ background: '#FFF7ED', border: '1.5px solid #FED7AA', color: '#b45309' }}>-</button>
                  <input type="number" value={quantity} onChange={(e) => { const v = parseInt(e.target.value) || 0; setQuantity(Math.max(1, v)); }} className="flex-1 text-center text-[16px] font-black text-[#1a3a4a] rounded-xl py-2.5 outline-none" style={{ background: '#f8fbfd', border: '1.5px solid #e2edf5' }} min={1} />
                  <button onClick={() => setQuantity(q => q + 10)} className="w-10 h-10 rounded-xl flex items-center justify-center text-[16px] font-black transition-all active:scale-90" style={{ background: '#FFF7ED', border: '1.5px solid #FED7AA', color: '#b45309' }}>+</button>
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-bold text-[#1a3a4a] mb-2 text-right">السعر المقترح للطبلية (ريال) — اختياري</label>
                <input
                  type="number"
                  value={price || ''}
                  onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                  placeholder="0 — اتركه فارغاً للتفاوض"
                  dir="rtl"
                  className="w-full rounded-2xl px-4 py-3 text-[13px] text-[#1a3a4a] outline-none"
                  style={{ background: '#f8fbfd', border: '1.5px solid #e2edf5' }}
                />
              </div>

              <div>
                <label className="block text-[12px] font-bold text-[#1a3a4a] mb-2 text-right">رسالة للمشتري (اختياري)</label>
                <div className="relative">
                  <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="أضف تفاصيل عرضك أو ملاحظاتك..." rows={3} maxLength={300} dir="rtl" className="w-full rounded-2xl px-4 py-3 text-[13px] text-[#1a3a4a] resize-none outline-none" style={{ background: '#f8fbfd', border: '1.5px solid #e2edf5' }} />
                  <span className="absolute bottom-2 left-3 text-[10px] text-[#a0b5c0]">{message.length}/300</span>
                </div>
              </div>

              {error && <p className="text-[12px] text-red-600 text-center font-semibold">{error}</p>}

              <div className="rounded-2xl p-3.5 flex items-start gap-3" style={{ background: '#FFF7ED', border: '1px solid #FED7AA' }}>
                <CheckCircle className="w-4 h-4 text-[#b45309] flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-[#92400E] leading-relaxed">سيتم إرسال عرضك للمشتري. عند قبوله تُنشأ الصفقة تلقائياً وتظهر في <span className="font-black">حسابي ← صفقاتي</span>.</p>
              </div>

              <button onClick={handleSend} disabled={loading} className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl text-[14px] font-black text-white transition-transform active:scale-[0.97] disabled:opacity-70" style={{ background: 'linear-gradient(135deg, #b45309, #d97706)', boxShadow: '0 6px 20px rgba(180,83,9,0.3)' }}>
                {loading ? <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : <Send className="w-5 h-5" />}
                {loading ? 'جاري إرسال العرض...' : 'تقديم العرض للمشتري'}
              </button>
              <button onClick={onClose} className="w-full py-3 rounded-2xl text-[13px] font-bold text-[#4a6a7e]" style={{ background: '#f0f6fa', border: '1px solid #e2edf5' }}>
                إلغاء
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface Props {
  card: DemandCard;
  onClose: () => void;
  sessionPhone?: string | null;
}

export default function DemandDetailSheet({ card, onClose, sessionPhone }: Props) {
  const isAuthenticated = !!sessionPhone;
  const supplierPhone = sessionPhone ?? undefined;
  const [isFavorited, setIsFavorited] = useState(false);
  const [showRatingDialog, setShowRatingDialog] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [showOfferDialog, setShowOfferDialog] = useState(false);
  const [ratingSummary, setRatingSummary] = useState<{ average_rating: number; total_ratings: number } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [existingOffer, setExistingOffer] = useState<{ id: string; status: string; created_at: string; quantity: number; price_per_pallet: number } | null>(null);
  const [offerSent, setOfferSent] = useState(false);

  const isSelf = isAuthenticated && supplierPhone === card.phone;

  useEffect(() => { loadRatingSummary(); }, [card.phone]);
  useEffect(() => { if (isAuthenticated && supplierPhone && !isSelf) loadExistingOffer(); }, [isAuthenticated, supplierPhone, card.id]);

  const loadRatingSummary = async () => {
    try {
      const { data } = await supabase.rpc('get_visitor_ratings_summary', { p_user_phone: card.phone });
      setRatingSummary(data);
    } catch {}
  };

  const loadExistingOffer = async () => {
    if (!supplierPhone) return;
    try {
      const { data } = await supabase.rpc('get_supplier_offer_for_demand', {
        p_supplier_phone: supplierPhone,
        p_order_id: card.id,
      });
      setExistingOffer(data);
    } catch {}
  };

  const q = QUALITY_COLORS[card.quality] || QUALITY_COLORS.C;
  const flexItems = [
    { active: card.accept_close_quality, label: 'يقبل جودة قريبة', bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
    { active: card.accept_close_city, label: 'يقبل مدينة قريبة', bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
    { active: card.accept_partial_delivery, label: 'يقبل توريد جزئي', bg: '#FFF7ED', color: '#b45309', border: '#FED7AA' },
  ].filter((f) => f.active);

  const handleFavorite = () => setIsFavorited(!isFavorited);

  const handleStartDeal = () => {
    if (!isAuthenticated) setShowLoginPrompt(true);
    else if (isSelf) return;
    else setShowOfferDialog(true);
  };

  const handleLoginFromPrompt = () => {
    setShowLoginPrompt(false);
    onClose();
    window.location.hash = '#/account';
  };

  const handleOfferSent = () => {
    setOfferSent(true);
    setShowOfferDialog(false);
    loadExistingOffer();
  };

  const getButtonState = () => {
    if (isSelf) return { label: 'طلبك الخاص', disabled: true, color: '#6b7280', bg: '#f3f4f6' };
    if (!isAuthenticated) return { label: 'بدء الصفقة', disabled: false, color: 'white', bg: 'linear-gradient(135deg, #b45309, #d97706)' };
    if (existingOffer || offerSent) {
      const status = existingOffer?.status;
      if (status === 'pending') return { label: 'عرضك قيد الانتظار', disabled: false, color: 'white', bg: 'linear-gradient(135deg, #b45309, #d97706)' };
      if (status === 'accepted' || status === 'deal_created') return { label: 'تم القبول — تابع في صفقاتك', disabled: false, color: 'white', bg: 'linear-gradient(135deg, #059669, #10b981)' };
      if (status === 'rejected') return { label: 'تم الرفض — تقديم عرض جديد', disabled: false, color: 'white', bg: 'linear-gradient(135deg, #dc2626, #ef4444)' };
    }
    return { label: 'بدء الصفقة', disabled: false, color: 'white', bg: 'linear-gradient(135deg, #b45309, #d97706)' };
  };

  const btnState = getButtonState();

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
              <button
                onClick={btnState.disabled ? undefined : handleStartDeal}
                disabled={btnState.disabled}
                className="w-full relative overflow-hidden group rounded-2xl disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <div className="absolute inset-0 rounded-2xl" style={{ background: btnState.bg, boxShadow: '0 6px 20px rgba(180,83,9,0.25)' }} />
                <div className="relative flex items-center justify-center gap-2.5 py-3.5">
                  <Handshake className="w-5 h-5" style={{ color: btnState.color }} strokeWidth={2.5} />
                  <span className="text-[14px] font-black" style={{ color: btnState.color }}>{btnState.label}</span>
                </div>
              </button>
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

              {isAuthenticated && !isSelf && (existingOffer || offerSent) && (
                <div className="rounded-2xl p-3.5 flex items-start gap-3" style={{ background: existingOffer?.status === 'accepted' || existingOffer?.status === 'deal_created' ? '#ECFDF5' : '#FFFBEB', border: `1px solid ${existingOffer?.status === 'accepted' || existingOffer?.status === 'deal_created' ? '#A7F3D0' : '#FDE68A'}` }} dir="rtl">
                  <MessageSquare className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: existingOffer?.status === 'accepted' || existingOffer?.status === 'deal_created' ? '#059669' : '#b45309' }} />
                  <div>
                    <p className="text-[12px] font-black" style={{ color: existingOffer?.status === 'accepted' || existingOffer?.status === 'deal_created' ? '#059669' : '#b45309' }}>
                      {existingOffer?.status === 'pending' && 'عرضك مرسل — بانتظار رد المشتري'}
                      {(existingOffer?.status === 'accepted' || existingOffer?.status === 'deal_created') && 'وافق المشتري! الصفقة جارية'}
                      {existingOffer?.status === 'rejected' && 'رفض المشتري عرضك'}
                      {offerSent && !existingOffer && 'تم إرسال عرضك'}
                    </p>
                    <p className="text-[10px] mt-0.5" style={{ color: existingOffer?.status === 'accepted' || existingOffer?.status === 'deal_created' ? '#065F46' : '#92400E' }}>تابع التفاصيل في حسابي ← طلباتي</p>
                  </div>
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

              <div className="rounded-2xl p-3.5 flex items-start gap-3" style={{ background: '#FFF7ED', border: '1px solid #FED7AA' }} dir="rtl">
                <CheckCircle className="w-4 h-4 text-[#b45309] flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-[#92400E] leading-relaxed">
                  التواصل مع المشتري والاتفاق يتمان <span className="font-black">داخل المنصة فقط</span> لضمان حقوق الطرفين وحفظ سجل الصفقة.
                </p>
              </div>
            </div>

            <div className="px-5 mt-4">
              <CommentsSection userPhone={card.phone} maxComments={5} refreshTrigger={refreshKey} />
            </div>
          </div>
        </div>

        <div className="md:hidden flex-shrink-0 px-4 pb-5 pt-3" style={{ background: 'linear-gradient(to top, #ffffff 0%, #fffaf0 100%)', borderTop: '1px solid rgba(217,119,6,0.1)' }}>
          <button
            onClick={btnState.disabled ? undefined : handleStartDeal}
            disabled={btnState.disabled}
            className="w-full relative overflow-hidden group mb-3 rounded-2xl disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <div className="absolute inset-0 rounded-2xl transition-transform duration-300 group-active:scale-95" style={{ background: btnState.bg, boxShadow: '0 6px 20px rgba(180,83,9,0.25)' }} />
            <div className="relative flex items-center justify-center gap-2.5 py-4">
              <Handshake className="w-5 h-5" style={{ color: btnState.color }} strokeWidth={2.5} />
              <span className="text-[15px] font-black" style={{ color: btnState.color }}>{btnState.label}</span>
              {!btnState.disabled && !existingOffer && !offerSent && (
                <div className="absolute left-3 w-2 h-2 rounded-full animate-pulse" style={{ background: '#fde68a', boxShadow: '0 0 8px #f59e0b' }} />
              )}
            </div>
          </button>
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
      {showLoginPrompt && (
        <SupplierLoginPromptDialog card={card} onClose={() => setShowLoginPrompt(false)} onLogin={handleLoginFromPrompt} />
      )}
      {showOfferDialog && (
        <SupplierOfferDialog card={card} supplierPhone={supplierPhone!} existingOffer={existingOffer} onClose={() => setShowOfferDialog(false)} onSent={handleOfferSent} />
      )}
    </div>
  );
}
