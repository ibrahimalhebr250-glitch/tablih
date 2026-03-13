import { useState, useEffect, useCallback } from 'react';
import {
  MapPin, Package, Star, Layers, Tag, Award, Building2,
  CheckCircle2, ArrowLeftCircle, ChevronLeft, Calendar, ZoomIn,
  ShoppingBag, Store
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { sessionManager } from '../../lib/sessionManager';
import { FullscreenGallery } from './ImageGallery';
import BuyRequestSheet from './BuyRequestSheet';
import AuthSheet from '../account/AuthSheet';
import type { SupplyCardData, DemandCardData } from './PalletCards';

async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin + 'tbl_salt_2024');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

type Card = SupplyCardData | DemandCardData;

interface SellerProfile {
  name?: string;
  city?: string;
  listing_count: number;
  trust_rating?: number;
  rating_count: number;
}

interface Props {
  card: Card;
  onClose: () => void;
  onLoginRequired?: (card?: SupplyCardData) => void;
  onGoToInventory?: () => void;
  userPhone?: string;
}

const QUALITY_MAP: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  A: { label: 'درجة A - ممتاز', color: '#15803d', bg: '#dcfce7', dot: '#22c55e' },
  B: { label: 'درجة B - جيد جداً', color: '#1d4ed8', bg: '#dbeafe', dot: '#3b82f6' },
  C: { label: 'درجة C - جيد', color: '#b45309', bg: '#fef3c7', dot: '#f59e0b' },
  Scrap: { label: 'خردة', color: '#b91c1c', bg: '#fee2e2', dot: '#ef4444' },
};

const CONDITION_MAP: Record<string, { label: string; color: string; bg: string }> = {
  new: { label: 'جديد', color: '#15803d', bg: '#dcfce7' },
  used: { label: 'مستعمل', color: '#1d4ed8', bg: '#dbeafe' },
  damaged: { label: 'تالف جزئياً', color: '#b45309', bg: '#fef3c7' },
};

function InfoRow({ icon, label, value, valueStyle }: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  valueStyle?: React.CSSProperties;
}) {
  return (
    <div className="flex items-center justify-between py-3" style={{ borderBottom: '1px solid #f1f5f9' }}>
      <div className="flex items-center gap-2">
        <span className="text-gray-400">{icon}</span>
        <span className="text-[13px] text-gray-500">{label}</span>
      </div>
      <span className="text-[13px] font-bold text-gray-800" style={valueStyle}>{value}</span>
    </div>
  );
}

function StarDisplay({ rating, count }: { rating: number; count: number }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map(i => (
          <Star
            key={i}
            className={`w-4 h-4 ${i <= full ? 'fill-amber-400 text-amber-400' : i === full + 1 && half ? 'fill-amber-200 text-amber-400' : 'text-gray-200 fill-gray-200'}`}
          />
        ))}
      </div>
      <span className="text-[13px] font-black text-amber-600">{rating.toFixed(1)}</span>
      <span className="text-[11px] text-gray-400">({count} تقييم)</span>
    </div>
  );
}

export default function PalletDetailsPage({ card, onClose, onLoginRequired, onGoToInventory, userPhone }: Props) {
  const [profile, setProfile] = useState<SellerProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  const [fullscreenIndex, setFullscreenIndex] = useState(0);
  const [currentImage, setCurrentImage] = useState(0);
  const [imgError, setImgError] = useState<Record<number, boolean>>({});
  const [showBuySheet, setShowBuySheet] = useState(false);
  const [showAuthSheet, setShowAuthSheet] = useState(false);
  const [authError, setAuthError] = useState('');
  const [requestSent, setRequestSent] = useState(false);

  const isSupply = card.kind === 'supply';
  const images = isSupply ? (card as SupplyCardData).image_urls : [];
  const validImages = images.filter(Boolean);

  const loadProfile = useCallback(async () => {
    setLoadingProfile(true);
    try {
      const { data: userData } = await supabase
        .from('platform_users')
        .select('name, city, trust_rating')
        .eq('phone', card.phone)
        .maybeSingle();

      let listingCount = 0;
      if (isSupply) {
        const { count } = await supabase
          .from('inventory_batches')
          .select('id', { count: 'exact', head: true })
          .eq('phone', card.phone)
          .eq('status', 'active')
          .eq('publish_to_market', true);
        listingCount = count || 0;
      } else {
        const { count } = await supabase
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .eq('phone', card.phone)
          .in('status', ['pending', 'unmatched', 'partially_matched']);
        listingCount = count || 0;
      }

      const { count: ratingCount } = await supabase
        .from('marketplace_ratings')
        .select('id', { count: 'exact', head: true })
        .eq('rated_user_phone', card.phone);

      setProfile({
        name: userData?.name,
        city: userData?.city,
        listing_count: listingCount,
        trust_rating: userData?.trust_rating,
        rating_count: ratingCount || 0,
      });
    } catch {
      setProfile({ listing_count: 0, rating_count: 0 });
    } finally {
      setLoadingProfile(false);
    }
  }, [card.phone, isSupply]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const openFullscreen = (index: number) => {
    if (validImages.length === 0) return;
    setFullscreenIndex(index);
    setFullscreenOpen(true);
  };

  const isLoggedIn = () => {
    return !!userPhone || !!sessionManager.getSessionToken();
  };

  const handleBuyAction = () => {
    if (!isLoggedIn()) {
      setAuthError('');
      setShowAuthSheet(true);
      return;
    }
    setShowBuySheet(true);
  };

  const handleAuthLogin = async (phone: string, pin: string) => {
    setAuthError('');
    const formattedPhone = phone.startsWith('0') ? phone : `0${phone}`;
    const { data: user } = await supabase
      .from('platform_users')
      .select('*')
      .eq('phone', formattedPhone)
      .maybeSingle();
    if (!user) {
      const msg = 'رقم الجوال غير مسجل. يرجى إنشاء حساب جديد.';
      setAuthError(msg);
      throw new Error(msg);
    }
    const pinHashed = await hashPin(pin);
    if (user.pin_hash !== pinHashed) {
      const msg = 'الرقم السري غير صحيح.';
      setAuthError(msg);
      throw new Error(msg);
    }
    await sessionManager.createSession({
      phone: formattedPhone,
      user_type: user.user_type === 'company' ? 'supplier' : user.user_type || 'buyer',
      user_name: user.display_name || user.name || formattedPhone,
    });
    setShowAuthSheet(false);
    setTimeout(() => {
      setShowBuySheet(true);
    }, 100);
  };

  const handleAuthRegister = async (data: { phone: string; name: string; userType: 'company' | 'individual'; pin: string }) => {
    setAuthError('');
    const formattedPhone = data.phone.startsWith('0') ? data.phone : `0${data.phone}`;
    const { data: existing } = await supabase
      .from('platform_users')
      .select('id')
      .eq('phone', formattedPhone)
      .maybeSingle();
    if (existing) {
      const msg = 'رقم الجوال مسجل مسبقاً. يرجى تسجيل الدخول.';
      setAuthError(msg);
      throw new Error(msg);
    }
    const pinHashed = await hashPin(data.pin);
    const { data: newUser, error } = await supabase
      .from('platform_users')
      .insert({
        phone: formattedPhone,
        display_name: data.name,
        company_name: data.userType === 'company' ? data.name : '',
        user_type: data.userType,
        pin_hash: pinHashed,
        last_active: new Date().toISOString(),
      })
      .select('*')
      .maybeSingle();
    if (error || !newUser) {
      const msg = error?.code === '23505' ? 'رقم الجوال مسجل مسبقاً. يرجى تسجيل الدخول.' : 'حدث خطأ أثناء التسجيل.';
      setAuthError(msg);
      throw new Error(msg);
    }
    await sessionManager.createSession({
      phone: formattedPhone,
      user_type: data.userType === 'company' ? 'supplier' : 'buyer',
      user_name: data.name,
    });
    setShowAuthSheet(false);
    setTimeout(() => {
      setShowBuySheet(true);
    }, 100);
  };

  const supplyCard = isSupply ? (card as SupplyCardData) : null;
  const demandCard = !isSupply ? (card as DemandCardData) : null;

  const quality = QUALITY_MAP[card.quality] || { label: card.quality, color: '#374151', bg: '#f3f4f6', dot: '#9ca3af' };
  const condition = supplyCard ? (CONDITION_MAP[supplyCard.pallet_condition] || { label: supplyCard.pallet_condition, color: '#374151', bg: '#f3f4f6' }) : null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex flex-col"
        style={{ background: '#f5f7fa', direction: 'rtl' }}
      >
        <div
          className="shrink-0 flex items-center justify-between px-4 py-3 safe-top"
          style={{ background: 'white', borderBottom: '1px solid #f1f5f9', boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}
        >
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90"
            style={{ background: '#f3f4f6' }}
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex items-center gap-2">
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
              style={{
                background: isSupply ? '#dcfce7' : '#ffedd5',
                border: isSupply ? '1px solid #86efac' : '1px solid #fdba74',
              }}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ background: isSupply ? '#22c55e' : '#f97316' }}
              />
              <span
                className="text-[12px] font-black"
                style={{ color: isSupply ? '#15803d' : '#c2410c' }}
              >
                {isSupply ? 'عرض بيع طبليات' : 'طلب شراء طبليات'}
              </span>
            </div>
          </div>
          <div className="w-9" />
        </div>

        <div className="flex-1 overflow-y-auto">
          {isSupply && validImages.length > 0 && (
            <div className="relative" style={{ background: '#111' }}>
              <div
                className="relative cursor-pointer"
                style={{ aspectRatio: '16/10', maxHeight: 280, overflow: 'hidden' }}
                onClick={() => openFullscreen(currentImage)}
              >
                {imgError[currentImage] ? (
                  <div className="w-full h-full flex items-center justify-center bg-gray-800">
                    <Package className="w-12 h-12 text-gray-600" />
                  </div>
                ) : (
                  <img
                    src={validImages[currentImage]}
                    alt="صورة الطبلية"
                    className="w-full h-full object-cover"
                    onError={() => setImgError(p => ({ ...p, [currentImage]: true }))}
                  />
                )}
                <div
                  className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                  style={{ background: 'rgba(0,0,0,0.3)' }}
                >
                  <div
                    className="flex items-center gap-2 px-3 py-2 rounded-xl"
                    style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
                  >
                    <ZoomIn className="w-4 h-4 text-white" />
                    <span className="text-white text-[12px] font-bold">عرض مكبّر</span>
                  </div>
                </div>
              </div>

              {validImages.length > 1 && (
                <div className="flex gap-2 px-3 py-2.5 overflow-x-auto bg-black/80">
                  {validImages.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentImage(i)}
                      className="shrink-0 w-12 h-12 rounded-lg overflow-hidden transition-all"
                      style={{
                        border: i === currentImage ? '2.5px solid white' : '2px solid rgba(255,255,255,0.2)',
                        opacity: i === currentImage ? 1 : 0.6,
                      }}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {!isSupply && (
            <div
              className="flex items-center justify-center"
              style={{
                aspectRatio: '16/8',
                maxHeight: 200,
                background: 'linear-gradient(135deg, #fff7ed 0%, #fed7aa 60%, #fde68a 100%)',
              }}
            >
              <div className="flex flex-col items-center gap-3">
                <div
                  className="w-20 h-20 rounded-3xl flex items-center justify-center"
                  style={{ background: 'rgba(234,88,12,0.12)', border: '2px solid rgba(234,88,12,0.2)' }}
                >
                  <Package className="w-10 h-10 text-orange-500" />
                </div>
                <div className="text-center">
                  <div className="flex items-center gap-2 justify-center">
                    <Layers className="w-5 h-5 text-orange-600" />
                    <span className="text-[28px] font-black text-orange-700">{demandCard?.quantity}</span>
                    <span className="text-[14px] font-bold text-orange-500">طبلية مطلوبة</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="px-4 py-4 space-y-3">
            <div
              className="rounded-2xl overflow-hidden"
              style={{ background: 'white', border: '1.5px solid rgba(0,0,0,0.07)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
            >
              <div className="px-4 py-3" style={{ borderBottom: '1px solid #f1f5f9' }}>
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-gray-400" />
                  <span className="text-[13px] font-black text-gray-700">تفاصيل الطبلية</span>
                </div>
              </div>
              <div className="px-4">
                <InfoRow
                  icon={<Package className="w-4 h-4" />}
                  label="نوع الطبلية"
                  value={card.pallet_type}
                />
                <InfoRow
                  icon={<Award className="w-4 h-4" />}
                  label="المقاس"
                  value={card.size}
                />
                <InfoRow
                  icon={<Star className="w-4 h-4" />}
                  label="الجودة"
                  value={
                    <span
                      className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-black"
                      style={{ background: quality.bg, color: quality.color }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: quality.dot }} />
                      {quality.label}
                    </span>
                  }
                />
                <InfoRow
                  icon={<MapPin className="w-4 h-4" />}
                  label="المدينة"
                  value={card.city}
                />
                {supplyCard && condition && (
                  <InfoRow
                    icon={<CheckCircle2 className="w-4 h-4" />}
                    label="الحالة"
                    value={
                      <span
                        className="px-2 py-0.5 rounded-full text-[11px] font-black"
                        style={{ background: condition.bg, color: condition.color }}
                      >
                        {condition.label}
                      </span>
                    }
                  />
                )}
                <InfoRow
                  icon={<Layers className="w-4 h-4" />}
                  label={isSupply ? 'الكمية المتاحة' : 'الكمية المطلوبة'}
                  value={`${isSupply ? supplyCard?.available_quantity : demandCard?.quantity} طبلية`}
                />
                {supplyCard && (
                  <InfoRow
                    icon={<Tag className="w-4 h-4" />}
                    label="سعر الطبلية"
                    value={
                      supplyCard.price_per_pallet > 0
                        ? `${supplyCard.price_per_pallet.toLocaleString()} ر.س`
                        : 'قابل للتفاوض'
                    }
                    valueStyle={{ color: '#059669', fontWeight: 900 }}
                  />
                )}
              </div>
            </div>

            {demandCard && (demandCard.accept_close_quality || demandCard.accept_close_city || demandCard.accept_partial_delivery) && (
              <div
                className="rounded-2xl overflow-hidden"
                style={{ background: 'white', border: '1.5px solid rgba(0,0,0,0.07)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
              >
                <div className="px-4 py-3" style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <div className="flex items-center gap-2">
                    <ArrowLeftCircle className="w-4 h-4 text-gray-400" />
                    <span className="text-[13px] font-black text-gray-700">مرونة الطلب</span>
                  </div>
                </div>
                <div className="px-4 py-3 flex flex-wrap gap-2">
                  {demandCard.accept_close_quality && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                      <span className="text-[12px] font-bold text-green-700">يقبل جودة قريبة</span>
                    </div>
                  )}
                  {demandCard.accept_close_city && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                      <span className="text-[12px] font-bold text-green-700">يقبل مدينة قريبة</span>
                    </div>
                  )}
                  {demandCard.accept_partial_delivery && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                      <span className="text-[12px] font-bold text-green-700">يقبل توريد جزئي</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {supplyCard?.description && (
              <div
                className="rounded-2xl overflow-hidden"
                style={{ background: 'white', border: '1.5px solid rgba(0,0,0,0.07)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
              >
                <div className="px-4 py-3" style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <span className="text-[13px] font-black text-gray-700">وصف الإعلان</span>
                </div>
                <div className="px-4 py-3">
                  <p className="text-[13px] text-gray-600 leading-relaxed">{supplyCard.description}</p>
                </div>
              </div>
            )}

            <div
              className="rounded-2xl overflow-hidden"
              style={{ background: 'white', border: '1.5px solid rgba(0,0,0,0.07)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
            >
              <div className="px-4 py-3" style={{ borderBottom: '1px solid #f1f5f9' }}>
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-gray-400" />
                  <span className="text-[13px] font-black text-gray-700">معلومات المعلن</span>
                </div>
              </div>
              {loadingProfile ? (
                <div className="px-4 py-4 space-y-2 animate-pulse">
                  <div className="h-4 bg-gray-100 rounded-lg w-1/3" />
                  <div className="h-3 bg-gray-100 rounded-lg w-1/2" />
                </div>
              ) : (
                <div className="px-4 py-3 space-y-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: isSupply ? '#dcfce7' : '#ffedd5' }}
                    >
                      {isSupply
                        ? <Store className="w-5 h-5 text-green-600" />
                        : <ShoppingBag className="w-5 h-5 text-orange-500" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-black text-gray-800">
                        {profile?.name || (isSupply ? 'مورّد' : 'مشترٍ')}
                      </p>
                      {profile?.city && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-gray-400" />
                          <span className="text-[11px] text-gray-500">{profile.city}</span>
                        </div>
                      )}
                    </div>
                    {profile?.trust_rating && (
                      <div
                        className="flex items-center gap-1 px-2 py-1 rounded-xl"
                        style={{ background: '#fefce8', border: '1px solid #fde047' }}
                      >
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span className="text-[12px] font-black text-amber-700">
                          {profile.trust_rating.toFixed(1)}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <div
                      className="flex-1 flex flex-col items-center gap-0.5 py-2.5 rounded-xl"
                      style={{ background: '#f8fafc' }}
                    >
                      <span className="text-[16px] font-black text-gray-800">{profile?.listing_count || 0}</span>
                      <span className="text-[10px] text-gray-500">{isSupply ? 'إعلان نشط' : 'طلب نشط'}</span>
                    </div>
                    <div
                      className="flex-1 flex flex-col items-center gap-0.5 py-2.5 rounded-xl"
                      style={{ background: '#fefce8' }}
                    >
                      <div className="flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span className="text-[16px] font-black text-amber-700">
                          {profile?.trust_rating ? profile.trust_rating.toFixed(1) : '–'}
                        </span>
                      </div>
                      <span className="text-[10px] text-gray-500">{profile?.rating_count || 0} تقييم</span>
                    </div>
                  </div>

                  {profile?.trust_rating && profile.trust_rating > 0 && (
                    <div className="pt-1">
                      <StarDisplay rating={profile.trust_rating} count={profile.rating_count} />
                    </div>
                  )}
                </div>
              )}
            </div>

            <div
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
              style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}
            >
              <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <span className="text-[11px] text-gray-400">
                نُشر في {new Date(card.created_at).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
            </div>

            <div className="h-28" />
          </div>
        </div>

        <div
          className="shrink-0 px-4 pb-6 pt-3 safe-bottom"
          style={{ background: 'white', borderTop: '1px solid #f1f5f9', boxShadow: '0 -4px 20px rgba(0,0,0,0.08)' }}
        >
          {isSupply && (
            requestSent ? (
              <div
                className="w-full py-4 rounded-2xl text-[15px] font-black text-center flex items-center justify-center gap-2"
                style={{ background: '#dcfce7', color: '#15803d' }}
              >
                <CheckCircle2 className="w-5 h-5" />
                تم إرسال طلبك بنجاح
              </div>
            ) : (
              <button
                onClick={handleBuyAction}
                className="w-full py-4 rounded-2xl text-[16px] font-black text-white transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                style={{
                  background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                  boxShadow: '0 4px 20px rgba(5,150,105,0.4)',
                }}
              >
                <Store className="w-5 h-5" />
                طلب شراء طبليات
              </button>
            )
          )}
        </div>
      </div>

      {fullscreenOpen && validImages.length > 0 && (
        <FullscreenGallery
          images={validImages}
          initialIndex={fullscreenIndex}
          onClose={() => setFullscreenOpen(false)}
        />
      )}

      {showBuySheet && supplyCard && (
        <BuyRequestSheet
          card={supplyCard}
          onClose={() => setShowBuySheet(false)}
          onSuccess={() => {
            setShowBuySheet(false);
            setRequestSent(true);
          }}
        />
      )}

      {showAuthSheet && (
        <AuthSheet
          onRegisterComplete={handleAuthRegister}
          onLoginComplete={handleAuthLogin}
          onClose={() => setShowAuthSheet(false)}
          title="سجّل دخولك للمتابعة"
          subtitle="أرسل طلب الشراء للمورد مباشرةً بعد الدخول"
          externalError={authError}
        />
      )}
    </>
  );
}
