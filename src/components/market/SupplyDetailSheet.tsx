import { useState, useEffect } from 'react';
import { MapPin, Package, Wrench, ChevronLeft, ChevronRight, Warehouse, ImageOff, Heart, Star, Home, Handshake, CheckCircle, LogIn, X, Send, Clock, CheckCircle2, XCircle, MessageSquare } from 'lucide-react';
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

function WelcomeMessageDialog({ card, onClose, onLogin }: {
  card: SupplyCard;
  onClose: () => void;
  onLogin: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div
        className="w-full rounded-t-3xl overflow-hidden"
        style={{ maxWidth: 480, background: 'white' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-1 w-12 rounded-full mx-auto mt-3 mb-0" style={{ background: '#d1d5db' }} />

        <div className="px-5 pt-4 pb-6 space-y-4" dir="rtl">
          <div className="flex items-start justify-between">
            <button onClick={onClose} className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center mt-0.5">
              <X className="w-3.5 h-3.5 text-gray-500" />
            </button>
            <div className="flex items-center gap-2">
              <div>
                <p className="text-[15px] font-black text-[#1a3a4a]">رسالة من المورد</p>
                <p className="text-[11px] text-[#7a9aab]">{card.pallet_type} — {card.city}</p>
              </div>
              <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #0f2535, #1a3d56)' }}
              >
                <Handshake className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>

          <div
            className="rounded-2xl p-4 space-y-2"
            style={{ background: '#f8fbfd', border: '1.5px solid #e2edf5' }}
          >
            <div className="flex items-start gap-2">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: 'linear-gradient(135deg, #0369A1, #0284C7)' }}
              >
                <span className="text-[10px] font-black text-white">م</span>
              </div>
              <div
                className="flex-1 rounded-2xl rounded-tr-none px-3.5 py-3"
                style={{ background: 'white', border: '1px solid #e2edf5', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
              >
                <p className="text-[13px] text-[#1a3a4a] leading-relaxed">
                  شكراً لتواصلك معي بخصوص هذا العرض.
                </p>
                <p className="text-[13px] text-[#1a3a4a] leading-relaxed mt-1">
                  يسعدني إتمام الصفقة معك.
                </p>
                <p className="text-[13px] text-[#1a3a4a] leading-relaxed mt-1">
                  يرجى تسجيل الدخول للمنصة لبدء طلب التفاوض.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 px-1 pt-1">
              <div className="flex-1 h-px" style={{ background: '#e2edf5' }} />
              <span className="text-[10px] text-[#a0b5c0]">يتطلب تسجيل الدخول</span>
              <div className="flex-1 h-px" style={{ background: '#e2edf5' }} />
            </div>
          </div>

          <div
            className="rounded-2xl p-3.5 flex items-start gap-3"
            style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}
          >
            <CheckCircle className="w-4 h-4 text-[#1d4ed8] flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-[#1e40af] leading-relaxed">
              بعد تسجيل الدخول يمكنك إرسال طلب تفاوض للمورد وستُنشأ الصفقة بعد موافقته في <span className="font-black">حسابي ← طلباتي</span>
            </p>
          </div>

          <button
            onClick={onLogin}
            className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl text-[14px] font-black text-white transition-transform active:scale-[0.97]"
            style={{
              background: 'linear-gradient(135deg, #0369A1, #0284C7)',
              boxShadow: '0 6px 20px rgba(3,105,161,0.3)',
            }}
          >
            <LogIn className="w-5 h-5" />
            تسجيل الدخول وإرسال طلب التفاوض
          </button>

          <button
            onClick={onClose}
            className="w-full py-3 rounded-2xl text-[13px] font-bold text-[#4a6a7e]"
            style={{ background: '#f0f6fa', border: '1px solid #e2edf5' }}
          >
            ليس الآن
          </button>
        </div>
      </div>
    </div>
  );
}

function NegotiationRequestDialog({ card, buyerPhone, existingRequest: rawExisting, onClose, onSent }: {
  card: SupplyCard;
  buyerPhone: string;
  existingRequest: { id: string; status: string; created_at: string; supplier_response?: string } | null;
  onClose: () => void;
  onSent: () => void;
}) {
  const existingRequest = rawExisting?.status === 'rejected' ? null : rawExisting;
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSend = async () => {
    if (loading) return;
    setLoading(true);
    setError('');
    try {
      const { error: err } = await supabase.from('negotiation_requests').insert({
        inventory_batch_id: card.id,
        buyer_phone: buyerPhone,
        supplier_phone: card.phone,
        pallet_type: card.pallet_type,
        size: card.size,
        quality: card.quality,
        pallet_condition: card.pallet_condition,
        available_quantity: card.available_quantity,
        city: card.city,
        price_per_pallet: card.price_per_pallet,
        buyer_message: message.trim() || null,
        status: 'pending',
      });
      if (err) throw err;
      onSent();
    } catch {
      setError('حدث خطأ أثناء إرسال الطلب. حاول مرة أخرى.');
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
      className="fixed inset-0 z-[200] flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div
        className="w-full rounded-t-3xl overflow-hidden"
        style={{ maxWidth: 480, background: 'white' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-1 w-12 rounded-full mx-auto mt-3" style={{ background: '#d1d5db' }} />

        <div className="px-5 pt-4 pb-6 space-y-4" dir="rtl">
          <div className="flex items-start justify-between">
            <button onClick={onClose} className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center mt-0.5">
              <X className="w-3.5 h-3.5 text-gray-500" />
            </button>
            <div className="flex items-center gap-2">
              <div>
                <p className="text-[15px] font-black text-[#1a3a4a]">طلب التفاوض</p>
                <p className="text-[11px] text-[#7a9aab]">{card.pallet_type} — {card.city}</p>
              </div>
              <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #059669, #10b981)' }}
              >
                <Handshake className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>

          {existingRequest ? (
            <div className="space-y-3">
              <div
                className="rounded-2xl p-4"
                style={{ background: statusConfig[existingRequest.status as keyof typeof statusConfig]?.bg || '#f3f4f6', border: '1px solid rgba(0,0,0,0.06)' }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span style={{ color: statusConfig[existingRequest.status as keyof typeof statusConfig]?.color || '#6b7280' }}>
                    {statusConfig[existingRequest.status as keyof typeof statusConfig]?.icon}
                  </span>
                  <span className="text-[13px] font-black" style={{ color: statusConfig[existingRequest.status as keyof typeof statusConfig]?.color || '#6b7280' }}>
                    {statusConfig[existingRequest.status as keyof typeof statusConfig]?.label}
                  </span>
                </div>
                <p className="text-[11px] text-[#7a9aab]">أُرسل {timeAgo(existingRequest.created_at)}</p>
                {existingRequest.supplier_response && (
                  <div className="mt-3 p-3 rounded-xl" style={{ background: 'white', border: '1px solid rgba(0,0,0,0.06)' }}>
                    <p className="text-[11px] font-bold text-[#4a6a7e] mb-1">رد المورد:</p>
                    <p className="text-[12px] text-[#1a3a4a] leading-relaxed">{existingRequest.supplier_response}</p>
                  </div>
                )}
              </div>
              {existingRequest.status === 'pending' && (
                <div
                  className="rounded-2xl p-3.5 flex items-start gap-3"
                  style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}
                >
                  <Clock className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-[11px] text-[#92400E] leading-relaxed">
                    طلبك قيد الانتظار. ستصلك إشعار عند رد المورد. يمكنك متابعة الطلب في <span className="font-black">حسابي ← طلباتي</span>
                  </p>
                </div>
              )}
              {existingRequest.status === 'accepted' && (
                <div
                  className="rounded-2xl p-3.5 flex items-start gap-3"
                  style={{ background: '#ECFDF5', border: '1px solid #A7F3D0' }}
                >
                  <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <p className="text-[11px] text-[#065F46] leading-relaxed">
                    وافق المورد على طلبك! توجّه إلى <span className="font-black">حسابي ← صفقاتي</span> لمتابعة الصفقة.
                  </p>
                </div>
              )}
              {existingRequest.status === 'rejected' && (
                <div
                  className="rounded-2xl p-3.5 flex items-start gap-3"
                  style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}
                >
                  <XCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-[11px] text-[#991B1B] leading-relaxed">
                    رفض المورد طلبك. يمكنك البحث عن عروض أخرى في السوق.
                  </p>
                </div>
              )}
              <button
                onClick={onClose}
                className="w-full py-3 rounded-2xl text-[13px] font-bold text-[#4a6a7e]"
                style={{ background: '#f0f6fa', border: '1px solid #e2edf5' }}
              >
                إغلاق
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-2xl p-3.5 space-y-2" style={{ background: '#f8fbfd', border: '1px solid #e2edf5' }}>
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-bold text-[#15803d]">{card.available_quantity} طبلية</span>
                  <span className="text-[11px] text-[#7a9aab]">الكمية المتاحة</span>
                </div>
                {card.price_per_pallet > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-bold text-[#1a3a4a]">{card.price_per_pallet} ريال/طبلية</span>
                    <span className="text-[11px] text-[#7a9aab]">السعر</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-bold text-[#1a3a4a]">{card.city}</span>
                  <span className="text-[11px] text-[#7a9aab]">المدينة</span>
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-bold text-[#1a3a4a] mb-2 text-right">
                  رسالة للمورد (اختياري)
                </label>
                <div className="relative">
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="أضف ملاحظاتك أو متطلباتك الخاصة..."
                    rows={3}
                    maxLength={300}
                    dir="rtl"
                    className="w-full rounded-2xl px-4 py-3 text-[13px] text-[#1a3a4a] resize-none outline-none"
                    style={{ background: '#f8fbfd', border: '1.5px solid #e2edf5' }}
                  />
                  <span className="absolute bottom-2 left-3 text-[10px] text-[#a0b5c0]">
                    {message.length}/300
                  </span>
                </div>
              </div>

              {error && (
                <p className="text-[12px] text-red-600 text-center font-semibold">{error}</p>
              )}

              <div
                className="rounded-2xl p-3.5 flex items-start gap-3"
                style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}
              >
                <CheckCircle className="w-4 h-4 text-[#1d4ed8] flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-[#1e40af] leading-relaxed">
                  سيصل طلبك إلى المورد وسيظهر في <span className="font-black">طلباتي</span>. بعد موافقة المورد تُنشأ الصفقة تلقائياً.
                </p>
              </div>

              <button
                onClick={handleSend}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl text-[14px] font-black text-white transition-transform active:scale-[0.97] disabled:opacity-70"
                style={{
                  background: 'linear-gradient(135deg, #059669, #10b981)',
                  boxShadow: '0 6px 20px rgba(5,150,105,0.3)',
                }}
              >
                {loading ? (
                  <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
                {loading ? 'جاري الإرسال...' : 'إرسال طلب التفاوض'}
              </button>

              <button
                onClick={onClose}
                className="w-full py-3 rounded-2xl text-[13px] font-bold text-[#4a6a7e]"
                style={{ background: '#f0f6fa', border: '1px solid #e2edf5' }}
              >
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
  card: SupplyCard;
  onClose: () => void;
  isAuthenticated: boolean;
  buyerPhone?: string;
  onShowAuthPrompt: () => void;
}

export default function SupplyDetailSheet({ card, onClose, isAuthenticated, buyerPhone, onShowAuthPrompt }: Props) {
  const [imgIndex, setImgIndex] = useState(0);
  const [isFavorited, setIsFavorited] = useState(false);
  const [showRatingDialog, setShowRatingDialog] = useState(false);
  const [showWelcomeMessage, setShowWelcomeMessage] = useState(false);
  const [showNegotiationDialog, setShowNegotiationDialog] = useState(false);
  const [ratingSummary, setRatingSummary] = useState<{ average_rating: number; total_ratings: number } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [existingRequest, setExistingRequest] = useState<{ id: string; status: string; created_at: string; supplier_response?: string } | null>(null);
  const [requestSent, setRequestSent] = useState(false);

  const isSelf = isAuthenticated && buyerPhone === card.phone;

  useEffect(() => {
    loadRatingSummary();
  }, [card.phone]);

  useEffect(() => {
    if (isAuthenticated && buyerPhone && !isSelf) {
      loadExistingRequest();
    }
  }, [isAuthenticated, buyerPhone, card.id]);

  const loadRatingSummary = async () => {
    try {
      const { data } = await supabase.rpc('get_visitor_ratings_summary', { p_user_phone: card.phone });
      setRatingSummary(data);
    } catch {}
  };

  const loadExistingRequest = async () => {
    if (!buyerPhone) return;
    const { data } = await supabase
      .from('negotiation_requests')
      .select('id, status, created_at, supplier_response')
      .eq('inventory_batch_id', card.id)
      .eq('buyer_phone', buyerPhone)
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    setExistingRequest(data);
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

  const handleStartDeal = () => {
    if (!isAuthenticated) {
      setShowWelcomeMessage(true);
    } else if (isSelf) {
      return;
    } else {
      setShowNegotiationDialog(true);
    }
  };

  const handleLoginFromWelcome = () => {
    setShowWelcomeMessage(false);
    onClose();
    onShowAuthPrompt();
  };

  const handleRequestSent = () => {
    setRequestSent(true);
    setShowNegotiationDialog(false);
    loadExistingRequest();
  };

  const getButtonState = () => {
    if (isSelf) return { label: 'عرضك الخاص', disabled: true, color: '#6b7280', bg: '#f3f4f6' };
    if (!isAuthenticated) return { label: 'بدء الصفقة', disabled: false, color: 'white', bg: 'linear-gradient(135deg, #0369A1, #0284C7)' };
    if (existingRequest || requestSent) {
      const status = existingRequest?.status;
      if (status === 'pending') return { label: 'طلب التفاوض قيد الانتظار', disabled: false, color: 'white', bg: 'linear-gradient(135deg, #b45309, #d97706)' };
      if (status === 'accepted' || status === 'deal_created') return { label: 'تم القبول — تابع في صفقاتك', disabled: false, color: 'white', bg: 'linear-gradient(135deg, #059669, #10b981)' };
      if (status === 'rejected') return { label: 'تم الرفض — إرسال طلب جديد', disabled: false, color: 'white', bg: 'linear-gradient(135deg, #dc2626, #ef4444)' };
    }
    return { label: 'طلب التفاوض', disabled: false, color: 'white', bg: 'linear-gradient(135deg, #059669, #10b981)' };
  };

  const btnState = getButtonState();

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

            {isAuthenticated && !isSelf && (existingRequest || requestSent) && (
              <div
                className="rounded-2xl p-3.5 flex items-start gap-3"
                style={{
                  background: existingRequest?.status === 'accepted' || existingRequest?.status === 'deal_created' ? '#ECFDF5' : '#FFFBEB',
                  border: `1px solid ${existingRequest?.status === 'accepted' || existingRequest?.status === 'deal_created' ? '#A7F3D0' : '#FDE68A'}`,
                }}
                dir="rtl"
              >
                <MessageSquare className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: existingRequest?.status === 'accepted' || existingRequest?.status === 'deal_created' ? '#059669' : '#b45309' }} />
                <div>
                  <p className="text-[12px] font-black" style={{ color: existingRequest?.status === 'accepted' || existingRequest?.status === 'deal_created' ? '#059669' : '#b45309' }}>
                    {existingRequest?.status === 'pending' && 'طلب تفاوض مرسل — بانتظار رد المورد'}
                    {(existingRequest?.status === 'accepted' || existingRequest?.status === 'deal_created') && 'وافق المورد! الصفقة جارية'}
                    {existingRequest?.status === 'rejected' && 'رفض المورد طلبك'}
                    {requestSent && !existingRequest && 'تم إرسال طلب التفاوض'}
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: existingRequest?.status === 'accepted' || existingRequest?.status === 'deal_created' ? '#065F46' : '#92400E' }}>
                    تابع التفاصيل في حسابي ← طلباتي
                  </p>
                </div>
              </div>
            )}

            <div
              className="rounded-2xl p-3.5 flex items-start gap-3"
              style={{ background: '#FFF7ED', border: '1px solid #FED7AA' }}
              dir="rtl"
            >
              <CheckCircle className="w-4 h-4 text-[#b45309] flex-shrink-0 mt-0.5" />
              <p className="text-[11px] text-[#92400E] leading-relaxed">
                التواصل مع المورد والاتفاق يتمان <span className="font-black">داخل المنصة فقط</span> لضمان حقوق الطرفين وحفظ سجل الصفقة.
              </p>
            </div>
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
            onClick={btnState.disabled ? undefined : handleStartDeal}
            disabled={btnState.disabled}
            className="w-full relative overflow-hidden group mb-3 rounded-2xl disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <div
              className="absolute inset-0 rounded-2xl transition-transform duration-300 group-active:scale-95"
              style={{ background: btnState.bg, boxShadow: '0 6px 20px rgba(5,150,105,0.3)' }}
            />
            <div className="relative flex items-center justify-center gap-2.5 py-4">
              <Handshake className="w-5 h-5" style={{ color: btnState.color }} strokeWidth={2.5} />
              <span className="text-[15px] font-black" style={{ color: btnState.color }}>{btnState.label}</span>
              {!btnState.disabled && !existingRequest && !requestSent && (
                <div
                  className="absolute left-3 w-2 h-2 rounded-full animate-pulse"
                  style={{ background: '#bfdbfe', boxShadow: '0 0 8px #60b4e0' }}
                />
              )}
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

      {showWelcomeMessage && (
        <WelcomeMessageDialog
          card={card}
          onClose={() => setShowWelcomeMessage(false)}
          onLogin={handleLoginFromWelcome}
        />
      )}

      {showNegotiationDialog && (
        <NegotiationRequestDialog
          card={card}
          buyerPhone={buyerPhone!}
          existingRequest={existingRequest}
          onClose={() => setShowNegotiationDialog(false)}
          onSent={handleRequestSent}
        />
      )}
    </div>
  );
}
