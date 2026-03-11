import { useState, useEffect } from 'react';
import {
  MapPin, Package, Wrench, ChevronLeft, ChevronRight, Warehouse, ImageOff,
  Star, Home, Handshake, X, CheckCircle, MessageSquare, Phone,
  AlertCircle, TrendingDown, Award, ShieldCheck
} from 'lucide-react';
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

function LoginPromptDialog({ card, onClose, onLogin }: {
  card: SupplyCard;
  onClose: () => void;
  onLogin: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div
        className="w-full rounded-3xl overflow-hidden"
        style={{ maxWidth: 420, background: 'white' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 pt-5 pb-6 space-y-4" dir="rtl">
          <div className="flex items-start justify-between">
            <button onClick={onClose} className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center">
              <X className="w-3.5 h-3.5 text-gray-500" />
            </button>
            <div className="flex items-center gap-2">
              <div>
                <p className="text-[15px] font-black text-gray-900">سجّل دخولك لبدء الصفقة</p>
                <p className="text-[11px] text-gray-500">{card.pallet_type} — {card.city}</p>
              </div>
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #15803d, #16a34a)' }}>
                <Handshake className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl p-4 space-y-3" style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0' }}>
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-[13px] font-black text-green-800">شكراً لاهتمامك بهذا العرض</p>
                <p className="text-[11px] text-green-700 mt-0.5 leading-relaxed">
                  سجّل دخولك وحدد الكمية التي تريدها — سيصلك رد المورد خلال دقائق.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-right">
            <div className="rounded-xl p-3" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <p className="text-[10px] text-gray-500 mb-0.5">الكمية المتاحة</p>
              <p className="text-[14px] font-black text-green-700">{card.available_quantity.toLocaleString()} طبلية</p>
            </div>
            <div className="rounded-xl p-3" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <p className="text-[10px] text-gray-500 mb-0.5">السعر</p>
              <p className="text-[14px] font-black text-gray-800">
                {card.price_per_pallet > 0 ? `${card.price_per_pallet} ر.س` : 'قابل للتفاوض'}
              </p>
            </div>
          </div>

          <button
            onClick={onLogin}
            className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl text-[14px] font-black text-white transition-transform active:scale-[0.97]"
            style={{ background: 'linear-gradient(135deg, #15803d, #16a34a)', boxShadow: '0 6px 20px rgba(21,128,61,0.3)' }}
          >
            <Handshake className="w-5 h-5" />
            تسجيل الدخول وطلب الصفقة
          </button>
          <button onClick={onClose} className="w-full py-3 rounded-2xl text-[13px] font-bold text-gray-500" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
            ليس الآن
          </button>
        </div>
      </div>
    </div>
  );
}

function DealRequestDialog({ card, buyerPhone, existingDeal, onClose, onCreated, platformFee }: {
  card: SupplyCard;
  buyerPhone: string;
  existingDeal: { id: string; status: string; quantity: number; deal_ref: string } | null;
  platformFee: number;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [quantity, setQuantity] = useState(Math.min(card.available_quantity, 100));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const totalPrice = card.price_per_pallet > 0 ? card.price_per_pallet * quantity : 0;
  const commission = platformFee * quantity;

  const handleCreate = async () => {
    if (loading) return;
    if (quantity < 1) { setError('الكمية يجب أن تكون 1 على الأقل'); return; }
    if (quantity > card.available_quantity) { setError('الكمية أكبر من المتاح'); return; }
    setLoading(true);
    setError('');
    try {
      const { data, error: err } = await supabase.rpc('create_deal_from_supply_card', {
        p_buyer_phone: buyerPhone,
        p_inventory_batch_id: card.id,
        p_quantity: quantity,
      });
      if (err) throw err;
      if (data && !data.success) { setError(data.error || 'حدث خطأ'); return; }
      onCreated();
    } catch {
      setError('حدث خطأ أثناء إنشاء الصفقة. حاول مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  if (existingDeal) {
    const statusLabels: Record<string, { label: string; color: string; bg: string; desc: string }> = {
      pending_supplier: { label: 'بانتظار موافقة المورد', color: '#b45309', bg: '#fffbeb', desc: 'تم إرسال طلبك للمورد. ستصلك إشعار عند الرد.' },
      in_delivery:      { label: 'جاري التفاوض', color: '#0369a1', bg: '#eff6ff', desc: 'قبل المورد طلبك — تواصل معه عبر واتساب.' },
      completed:        { label: 'مكتملة', color: '#059669', bg: '#ecfdf5', desc: 'تم إتمام الصفقة بنجاح.' },
      cancelled:        { label: 'ملغاة', color: '#dc2626', bg: '#fef2f2', desc: 'تم إلغاء الصفقة.' },
    };
    const sc = statusLabels[existingDeal.status] || statusLabels['pending_supplier'];

    return (
      <div
        className="fixed inset-0 z-[200] flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)' }}
        onClick={onClose}
      >
        <div
          className="w-full rounded-3xl overflow-hidden"
          style={{ maxWidth: 420, background: 'white' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-5 pt-5 pb-6 space-y-4" dir="rtl">
            <div className="flex items-start justify-between">
              <button onClick={onClose} className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center">
                <X className="w-3.5 h-3.5 text-gray-500" />
              </button>
              <p className="text-[15px] font-black text-gray-900">حالة الصفقة</p>
            </div>
            <div className="rounded-2xl p-4" style={{ background: sc.bg, border: `1px solid ${sc.color}30` }}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[13px] font-black" style={{ color: sc.color }}>{sc.label}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${sc.color}20`, color: sc.color }}>
                  {existingDeal.deal_ref}
                </span>
              </div>
              <p className="text-[11px] leading-relaxed" style={{ color: sc.color }}>{sc.desc}</p>
            </div>
            <div className="rounded-xl p-3 flex items-center justify-between" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <span className="text-[13px] font-black text-gray-800">{existingDeal.quantity.toLocaleString()} طبلية</span>
              <span className="text-[11px] text-gray-500">الكمية المطلوبة</span>
            </div>
            <div className="rounded-2xl p-3 flex items-start gap-2" style={{ background: '#eff6ff', border: '1px solid #bfdbfe' }}>
              <MessageSquare className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-[11px] text-blue-700 leading-relaxed">
                تابع تفاصيل الصفقة من: <span className="font-black">حسابي ← صفقاتي</span>
              </p>
            </div>
            <button onClick={onClose} className="w-full py-3 rounded-2xl text-[13px] font-bold text-gray-500" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              إغلاق
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div
        className="w-full rounded-3xl overflow-hidden"
        style={{ maxWidth: 420, background: 'white' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 pt-5 pb-6 space-y-4" dir="rtl">
          <div className="flex items-start justify-between">
            <button onClick={onClose} className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center">
              <X className="w-3.5 h-3.5 text-gray-500" />
            </button>
            <div className="flex items-center gap-2">
              <div>
                <p className="text-[15px] font-black text-gray-900">طلب عقد صفقة</p>
                <p className="text-[11px] text-gray-500">{card.pallet_type} — {card.city}</p>
              </div>
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #15803d, #16a34a)' }}>
                <Handshake className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl p-3 flex items-start gap-3" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
            <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-green-700 leading-relaxed">
              شكراً لتواصلك مع صاحب هذا العرض. سيتلقى المورد إشعاراً فورياً وسيرد عليك بالقبول أو الرفض.
            </p>
          </div>

          <div className="rounded-2xl p-3 space-y-2.5" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-black text-green-700">{card.available_quantity.toLocaleString()} طبلية</span>
              <span className="text-[11px] text-gray-500">الكمية المتاحة</span>
            </div>
            {card.price_per_pallet > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-black text-gray-800">{card.price_per_pallet} ريال/طبلية</span>
                <span className="text-[11px] text-gray-500">السعر المعلن</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-bold text-gray-700">{card.city}</span>
              <span className="text-[11px] text-gray-500">المدينة</span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] text-gray-500">الحد الأقصى: {card.available_quantity.toLocaleString()}</span>
              <label className="text-[12px] font-black text-gray-800">الكمية المطلوبة</label>
            </div>
            <div className="flex items-center gap-2" dir="ltr">
              <button
                onClick={() => setQuantity(q => Math.max(1, q - 10))}
                className="w-11 h-11 rounded-xl flex items-center justify-center text-[18px] font-black transition-all active:scale-90"
                style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0', color: '#15803d' }}
              >-</button>
              <input
                type="number"
                value={quantity}
                onChange={(e) => {
                  const v = parseInt(e.target.value) || 0;
                  setQuantity(Math.min(card.available_quantity, Math.max(0, v)));
                }}
                className="flex-1 text-center text-[18px] font-black text-gray-800 rounded-xl py-2.5 outline-none"
                style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0' }}
                min={1}
                max={card.available_quantity}
              />
              <button
                onClick={() => setQuantity(q => Math.min(card.available_quantity, q + 10))}
                className="w-11 h-11 rounded-xl flex items-center justify-center text-[18px] font-black transition-all active:scale-90"
                style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0', color: '#15803d' }}
              >+</button>
            </div>
          </div>

          {(totalPrice > 0 || commission > 0) && (
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #e2e8f0' }}>
              {totalPrice > 0 && (
                <div className="flex items-center justify-between px-3 py-2.5" style={{ background: '#f8fafc' }}>
                  <span className="text-[12px] font-black text-gray-800">{totalPrice.toLocaleString()} ريال</span>
                  <span className="text-[11px] text-gray-500">الإجمالي التقديري</span>
                </div>
              )}
              {commission > 0 && (
                <div className="flex items-center justify-between px-3 py-2" style={{ background: '#fffbeb', borderTop: '1px solid #fde68a' }}>
                  <span className="text-[11px] font-bold text-amber-700">{commission.toLocaleString()} ريال</span>
                  <span className="text-[10px] text-amber-600">عمولة المنصة ({platformFee} ر.س/طبلية)</span>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <p className="text-[11px] text-red-600 font-semibold">{error}</p>
            </div>
          )}

          <button
            onClick={handleCreate}
            disabled={loading || quantity < 1}
            className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl text-[14px] font-black text-white transition-transform active:scale-[0.97] disabled:opacity-70"
            style={{ background: 'linear-gradient(135deg, #15803d, #16a34a)', boxShadow: '0 6px 20px rgba(21,128,61,0.3)' }}
          >
            {loading
              ? <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              : <Handshake className="w-5 h-5" />
            }
            {loading ? 'جاري إنشاء الصفقة...' : 'طلب عقد صفقة'}
          </button>
          <button onClick={onClose} className="w-full py-3 rounded-2xl text-[13px] font-bold text-gray-500" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}

interface Props {
  card: SupplyCard;
  onClose: () => void;
  sessionPhone?: string | null;
  onLoginRequired?: () => void;
}

export default function SupplyDetailSheet({ card, onClose, sessionPhone, onLoginRequired }: Props) {
  const isAuthenticated = !!sessionPhone;
  const buyerPhone = sessionPhone ?? undefined;
  const [imgIndex, setImgIndex] = useState(0);
  const [showRatingDialog, setShowRatingDialog] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [showDealDialog, setShowDealDialog] = useState(false);
  const [ratingSummary, setRatingSummary] = useState<{ average_rating: number; total_ratings: number } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [existingDeal, setExistingDeal] = useState<{ id: string; status: string; quantity: number; deal_ref: string } | null>(null);
  const [dealCreated, setDealCreated] = useState(false);
  const [platformFee, setPlatformFee] = useState(0.25);

  const isSelf = isAuthenticated && buyerPhone === card.phone;

  useEffect(() => { loadRatingSummary(); loadPlatformFee(); }, [card.phone]);
  useEffect(() => { if (isAuthenticated && buyerPhone && !isSelf) loadExistingDeal(); }, [isAuthenticated, buyerPhone, card.id]);

  const loadRatingSummary = async () => {
    try {
      const { data } = await supabase.rpc('get_visitor_ratings_summary', { p_user_phone: card.phone });
      setRatingSummary(data);
    } catch {}
  };

  const loadPlatformFee = async () => {
    try {
      const { data } = await supabase.from('platform_settings').select('platform_fee_per_pallet').maybeSingle();
      if (data?.platform_fee_per_pallet) setPlatformFee(data.platform_fee_per_pallet);
    } catch {}
  };

  const loadExistingDeal = async () => {
    if (!buyerPhone) return;
    const { data } = await supabase
      .from('deals')
      .select('id, status, quantity, deal_ref')
      .eq('inventory_batch_id', card.id)
      .eq('buyer_phone', buyerPhone)
      .eq('source', 'supply_card')
      .not('status', 'in', '("cancelled")')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    setExistingDeal(data);
  };

  const q = QUALITY_COLORS[card.quality] || QUALITY_COLORS.C;
  const cond = CONDITION_MAP[card.pallet_condition] || CONDITION_MAP.used;
  const hasImages = card.image_urls.length > 0;

  const goNext = () => setImgIndex((i) => (i + 1) % card.image_urls.length);
  const goPrev = () => setImgIndex((i) => (i - 1 + card.image_urls.length) % card.image_urls.length);

  const handleStartDeal = () => {
    if (!isAuthenticated) {
      setShowLoginPrompt(true);
    } else if (isSelf) {
      return;
    } else {
      setShowDealDialog(true);
    }
  };

  const handleLoginFromPrompt = () => {
    sessionStorage.setItem('pending_supply_card_deal', JSON.stringify({
      inventory_batch_id: card.id,
    }));
    setShowLoginPrompt(false);
    onClose();
    onLoginRequired?.();
  };

  const handleDealCreated = () => {
    setDealCreated(true);
    setShowDealDialog(false);
    loadExistingDeal();
  };

  const getDealStatusInfo = () => {
    if (isSelf) return null;
    if (!isAuthenticated) return null;
    if (!existingDeal && !dealCreated) return null;
    const status = existingDeal?.status;
    if (status === 'pending_supplier' || dealCreated)
      return { label: 'طلبك قيد انتظار موافقة المورد', color: '#b45309', bg: '#fffbeb', border: '#fde68a' };
    if (status === 'in_delivery')
      return { label: 'المورد قبل طلبك — جاري التفاوض', color: '#0369a1', bg: '#eff6ff', border: '#bfdbfe' };
    if (status === 'completed')
      return { label: 'تمت الصفقة بنجاح', color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' };
    return null;
  };

  const statusInfo = getDealStatusInfo();

  const getButtonState = () => {
    if (isSelf) return { label: 'عرضك الخاص', disabled: true, bg: '#f3f4f6', color: '#6b7280' };
    if (!isAuthenticated) return { label: 'طلب عقد صفقة', disabled: false, bg: 'linear-gradient(135deg, #15803d, #16a34a)', color: 'white' };
    if (existingDeal?.status === 'pending_supplier' || dealCreated)
      return { label: 'طلبك قيد الانتظار — عرض التفاصيل', disabled: false, bg: 'linear-gradient(135deg, #b45309, #d97706)', color: 'white' };
    if (existingDeal?.status === 'in_delivery')
      return { label: 'جاري التفاوض — عرض التفاصيل', disabled: false, bg: 'linear-gradient(135deg, #0369a1, #0284c7)', color: 'white' };
    if (existingDeal?.status === 'completed')
      return { label: 'تمت الصفقة', disabled: true, bg: '#ecfdf5', color: '#059669' };
    return { label: 'طلب عقد صفقة', disabled: false, bg: 'linear-gradient(135deg, #15803d, #16a34a)', color: 'white' };
  };

  const btnState = getButtonState();

  const handleBtnClick = () => {
    if (btnState.disabled) return;
    if ((existingDeal?.status === 'pending_supplier' || dealCreated || existingDeal?.status === 'in_delivery') && isAuthenticated) {
      setShowDealDialog(true);
    } else {
      handleStartDeal();
    }
  };

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
              <button
                onClick={handleBtnClick}
                disabled={btnState.disabled}
                className="w-full relative overflow-hidden rounded-2xl disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <div className="absolute inset-0 rounded-2xl" style={{ background: btnState.bg, boxShadow: '0 6px 20px rgba(21,128,61,0.3)' }} />
                <div className="relative flex items-center justify-center gap-2.5 py-3.5">
                  <Handshake className="w-5 h-5" style={{ color: btnState.color }} strokeWidth={2.5} />
                  <span className="text-[14px] font-black" style={{ color: btnState.color }}>{btnState.label}</span>
                </div>
              </button>
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

              {statusInfo && (
                <div className="rounded-2xl p-3.5 flex items-start gap-3" style={{ background: statusInfo.bg, border: `1px solid ${statusInfo.border}` }} dir="rtl">
                  <MessageSquare className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: statusInfo.color }} />
                  <div>
                    <p className="text-[12px] font-black" style={{ color: statusInfo.color }}>{statusInfo.label}</p>
                    <p className="text-[10px] mt-0.5 text-gray-500">تابع التفاصيل في حسابي ← صفقاتي</p>
                  </div>
                </div>
              )}

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
                  <p className="text-[12px] font-black text-green-800">كيف تسير الصفقة؟</p>
                </div>
                <div className="space-y-1.5">
                  {[
                    'اختر الكمية وأرسل طلب الصفقة',
                    'المورد يقبل ويتعهد بالعمولة',
                    'تواصل مع المورد عبر واتساب للتفاوض',
                    'عند التسليم ينقل المخزون لحسابك',
                  ].map((step, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black flex-shrink-0" style={{ background: '#15803d', color: 'white' }}>{i + 1}</span>
                      <p className="text-[11px] text-green-700">{step}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl p-3.5 flex items-start gap-3" style={{ background: '#fff7ed', border: '1px solid #fed7aa' }} dir="rtl">
                <CheckCircle className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-orange-700 leading-relaxed">
                  عمولة المنصة <span className="font-black">{platformFee} ريال / طبلية</span> — يتحصل عليها المورد من المشتري عند إتمام الصفقة.
                </p>
              </div>
            </div>

            <div className="px-5 mt-4">
              <CommentsSection userPhone={card.phone} maxComments={5} refreshTrigger={refreshKey} />
            </div>
          </div>
        </div>

        <div className="md:hidden flex-shrink-0 px-4 pb-5 pt-3" style={{ background: 'linear-gradient(to top, #ffffff 0%, #f8fafb 100%)', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
          <button
            onClick={handleBtnClick}
            disabled={btnState.disabled}
            className="w-full relative overflow-hidden group mb-3 rounded-2xl disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <div className="absolute inset-0 rounded-2xl" style={{ background: btnState.bg, boxShadow: '0 6px 20px rgba(21,128,61,0.3)' }} />
            <div className="relative flex items-center justify-center gap-2.5 py-4">
              <Handshake className="w-5 h-5" style={{ color: btnState.color }} strokeWidth={2.5} />
              <span className="text-[15px] font-black" style={{ color: btnState.color }}>{btnState.label}</span>
              {!btnState.disabled && !existingDeal && !dealCreated && (
                <div className="absolute left-3 w-2 h-2 rounded-full animate-pulse" style={{ background: '#86efac' }} />
              )}
            </div>
          </button>
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
      {showLoginPrompt && (
        <LoginPromptDialog card={card} onClose={() => setShowLoginPrompt(false)} onLogin={handleLoginFromPrompt} />
      )}
      {showDealDialog && buyerPhone && (
        <DealRequestDialog
          card={card}
          buyerPhone={buyerPhone}
          existingDeal={existingDeal}
          platformFee={platformFee}
          onClose={() => setShowDealDialog(false)}
          onCreated={handleDealCreated}
        />
      )}
    </div>
  );
}
