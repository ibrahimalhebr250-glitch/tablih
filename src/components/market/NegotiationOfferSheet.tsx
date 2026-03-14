import { useState, useEffect } from 'react';
import {
  X, Package, MapPin, Layers,
  Minus, Plus, CheckCircle2, Loader, AlertTriangle,
  Handshake, ChevronDown, MessageSquare, LogIn
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useSession } from '../../hooks/useSession';
import AuthSheet from '../account/AuthSheet';
import type { DemandCardData } from './PalletCards';

interface Props {
  card: DemandCardData;
  onClose: () => void;
  onSuccess: () => void;
}

const QUALITY_MAP: Record<string, { label: string; color: string; bg: string }> = {
  A: { label: 'درجة A - ممتاز', color: '#15803d', bg: '#dcfce7' },
  B: { label: 'درجة B - جيد جداً', color: '#1d4ed8', bg: '#dbeafe' },
  C: { label: 'درجة C - جيد', color: '#b45309', bg: '#fef3c7' },
  Scrap: { label: 'خردة', color: '#b91c1c', bg: '#fee2e2' },
};

const CITIES = [
  'الرياض', 'جدة', 'مكة المكرمة', 'المدينة المنورة', 'الدمام',
  'الخبر', 'الطائف', 'بريدة', 'تبوك', 'أبها',
  'خميس مشيط', 'الجبيل', 'نجران', 'ينبع', 'القصيم',
];

export default function NegotiationOfferSheet({ card, onClose, onSuccess }: Props) {
  const quality = QUALITY_MAP[card.quality] || { label: card.quality, color: '#374151', bg: '#f3f4f6' };

  const { session, register, login } = useSession();

  const [showAuth, setShowAuth] = useState(false);
  const [authError, setAuthError] = useState('');
  const [qtyInput, setQtyInput] = useState(String(card.quantity));
  const [qty, setQty] = useState(card.quantity);
  const [city, setCity] = useState(card.city || CITIES[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const isLoggedIn = !!session?.profile?.phone;

  useEffect(() => {
    if (isLoggedIn && showAuth) {
      setShowAuth(false);
    }
  }, [isLoggedIn]);

  const handleQtyInputChange = (val: string) => {
    const cleaned = val.replace(/[^0-9]/g, '');
    setQtyInput(cleaned);
    const n = parseInt(cleaned, 10);
    if (!isNaN(n) && n >= 1) setQty(n);
  };

  const handleQtyBlur = () => {
    const n = parseInt(qtyInput, 10);
    if (isNaN(n) || n < 1) {
      setQty(1);
      setQtyInput('1');
    } else {
      setQty(n);
      setQtyInput(String(n));
    }
  };

  const adjustQty = (delta: number) => {
    const next = Math.max(1, qty + delta);
    setQty(next);
    setQtyInput(String(next));
  };

  const submitOffer = async (phone: string) => {
    setLoading(true);
    setError(null);

    try {
      const formattedPhone = phone.startsWith('0') ? phone : `0${phone}`;

      const { data, error: rpcErr } = await supabase.rpc('create_negotiation_request', {
        p_supplier_phone: formattedPhone,
        p_order_id: card.id,
        p_requested_quantity: qty,
        p_city: city,
      });

      if (rpcErr) {
        setError(rpcErr.message || 'حدث خطأ، يرجى المحاولة مجدداً');
        setLoading(false);
        return;
      }

      const result = data as { success: boolean; error?: string } | null;
      if (!result?.success) {
        setError(result?.error || 'تعذّر إرسال العرض');
        setLoading(false);
        return;
      }

      setDone(true);
      setTimeout(() => { onSuccess(); }, 1800);
    } catch {
      setError('حدث خطأ غير متوقع');
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!isLoggedIn) {
      setShowAuth(true);
      return;
    }
    await submitOffer(session!.profile!.phone);
  };

  const handleRegisterComplete = async (data: { phone: string; name: string; userType: 'company' | 'individual'; pin: string }) => {
    setAuthError('');
    const result = await register(data);
    if (!result.success) {
      setAuthError(result.error || 'فشل إنشاء الحساب');
      return;
    }
    setShowAuth(false);
    const formattedPhone = data.phone.startsWith('0') ? data.phone : `0${data.phone}`;
    await submitOffer(formattedPhone);
  };

  const handleLoginComplete = async (phone: string, pin: string) => {
    setAuthError('');
    const result = await login(phone, pin);
    if (!result.success) {
      setAuthError(result.error || 'فشل تسجيل الدخول');
      return;
    }
    setShowAuth(false);
    const formattedPhone = phone.startsWith('0') ? phone : `0${phone}`;
    await submitOffer(formattedPhone);
  };

  if (showAuth) {
    return (
      <AuthSheet
        title="سجّل دخولك لإرسال عرضك"
        subtitle="أنشئ حسابك أو سجّل دخولك وسيُرسل عرض التوريد تلقائياً"
        onRegisterComplete={handleRegisterComplete}
        onLoginComplete={handleLoginComplete}
        onClose={() => setShowAuth(false)}
        externalError={authError}
      />
    );
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col justify-end"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="rounded-t-3xl overflow-hidden flex flex-col max-h-[90vh]"
        style={{ background: 'white', boxShadow: '0 -8px 40px rgba(0,0,0,0.25)' }}
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        <div className="w-10 h-1 rounded-full bg-gray-300 mx-auto mt-3 mb-1" />

        <div
          className="flex items-center justify-between px-5 py-3 flex-shrink-0"
          style={{ borderBottom: '1px solid #f1f5f9' }}
        >
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-all active:scale-90"
            style={{ background: '#f3f4f6' }}
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
          <div className="flex items-center gap-2">
            <Handshake className="w-4 h-4 text-orange-500" />
            <span className="text-[15px] font-black text-gray-800">تقديم عرض توريد</span>
          </div>
          <div className="w-8" />
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {done ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <div
                className="w-20 h-20 rounded-3xl flex items-center justify-center animate-bounce"
                style={{ background: '#fff7ed', border: '2px solid #fed7aa' }}
              >
                <CheckCircle2 className="w-10 h-10 text-orange-500" />
              </div>
              <div className="text-center">
                <p className="text-[18px] font-black text-gray-800">تم إرسال عرضك!</p>
                <p className="text-[13px] text-gray-500 mt-1">سيتم إشعار المشتري بعرضك فوراً</p>
              </div>
            </div>
          ) : (
            <>
              {!isLoggedIn && (
                <button
                  onClick={() => setShowAuth(true)}
                  className="w-full flex items-center justify-between rounded-2xl px-4 py-3 transition-all active:scale-[0.98]"
                  style={{ background: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)', border: '1.5px solid #fed7aa' }}
                >
                  <div className="flex items-center gap-2">
                    <LogIn className="w-4 h-4 text-orange-500" />
                    <span className="text-[13px] font-black text-orange-800">سجّل دخولك أو أنشئ حساباً</span>
                  </div>
                  <span className="text-[11px] text-orange-500 font-bold">مطلوب للإرسال</span>
                </button>
              )}

              {isLoggedIn && (
                <div
                  className="flex items-center gap-2 rounded-2xl px-4 py-2.5"
                  style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}
                >
                  <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <div>
                    <p className="text-[12px] font-black text-green-800">{session!.profile!.display_name || session!.profile!.company_name}</p>
                    <p className="text-[10px] text-green-600">{session!.profile!.phone}</p>
                  </div>
                </div>
              )}

              <div
                className="rounded-2xl p-4"
                style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', border: '1px solid #e2e8f0' }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <Package className="w-4 h-4 text-gray-500" />
                  <span className="text-[13px] font-black text-gray-700">تفاصيل طلب المشتري</span>
                </div>
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-bold text-gray-800">{card.pallet_type}</span>
                    <span className="text-[11px] text-gray-500">نوع الطبلية</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold"
                        style={{ background: quality.bg, color: quality.color }}
                      >
                        {quality.label}
                      </span>
                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold" style={{ background: '#f1f5f9', color: '#475569' }}>
                        {card.size}
                      </span>
                    </div>
                    <span className="text-[11px] text-gray-500">الجودة والمقاس</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-[12px] font-bold text-gray-700">{card.city}</span>
                    </div>
                    <span className="text-[11px] text-gray-500">المدينة المطلوبة</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-orange-500" />
                      <span className="text-[16px] font-black text-orange-700">{card.quantity}</span>
                      <span className="text-[11px] text-orange-500 font-bold">طبلية</span>
                    </div>
                    <span className="text-[11px] text-gray-500">الكمية المطلوبة</span>
                  </div>
                  {(card.accept_close_quality || card.accept_close_city || card.accept_partial_delivery) && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {card.accept_close_quality && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold" style={{ background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0' }}>يقبل جودة قريبة</span>
                      )}
                      {card.accept_close_city && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold" style={{ background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0' }}>يقبل مدينة قريبة</span>
                      )}
                      {card.accept_partial_delivery && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold" style={{ background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0' }}>يقبل توريد جزئي</span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[12px] font-black text-gray-700 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-orange-500" />
                  الكمية التي ستوردها
                </label>
                <div
                  className="flex items-center gap-3 rounded-2xl px-4 py-3"
                  style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0' }}
                >
                  <button
                    onClick={() => adjustQty(-1)}
                    disabled={qty <= 1}
                    className="w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-90 disabled:opacity-30 flex-shrink-0"
                    style={{ background: qty <= 1 ? '#f1f5f9' : '#fff7ed', border: '1.5px solid #fed7aa' }}
                  >
                    <Minus className="w-4 h-4 text-orange-600" />
                  </button>
                  <div className="flex-1 flex items-center justify-center gap-1">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={qtyInput}
                      onChange={(e) => handleQtyInputChange(e.target.value)}
                      onBlur={handleQtyBlur}
                      onFocus={(e) => e.target.select()}
                      className="w-20 text-center text-[28px] font-black text-gray-800 bg-transparent outline-none border-b-2 border-transparent focus:border-orange-400 transition-colors"
                      dir="ltr"
                    />
                    <span className="text-[13px] text-gray-500">طبلية</span>
                  </div>
                  <button
                    onClick={() => adjustQty(1)}
                    className="w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-90 flex-shrink-0"
                    style={{ background: '#fff7ed', border: '1.5px solid #fed7aa' }}
                  >
                    <Plus className="w-4 h-4 text-orange-600" />
                  </button>
                </div>
                {qty < card.quantity && card.accept_partial_delivery && (
                  <p className="text-[11px] text-amber-600 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    عرض توريد جزئي ({qty} من {card.quantity} المطلوبة)
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-[12px] font-black text-gray-700 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-orange-500" />
                  مدينة التوريد
                </label>
                <div
                  className="relative rounded-2xl"
                  style={{ border: '1.5px solid #e2e8f0', background: '#f8fafc' }}
                >
                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full py-3.5 pr-4 pl-10 text-[14px] font-bold text-gray-800 bg-transparent outline-none appearance-none rounded-2xl"
                  >
                    {CITIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              <div
                className="flex items-start gap-2.5 rounded-2xl px-4 py-3"
                style={{ background: '#eff6ff', border: '1px solid #bfdbfe' }}
              >
                <MessageSquare className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-blue-700 leading-relaxed">
                  سيصل عرضك للمشتري فوراً. في حال قبوله سيتم إنشاء صفقة تلقائياً وستجدها في حسابك.
                </p>
              </div>

              {error && (
                <div
                  className="flex items-center gap-2 rounded-xl px-3 py-2.5"
                  style={{ background: '#fef2f2', border: '1px solid #fecaca' }}
                >
                  <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <p className="text-[12px] text-red-600 font-bold">{error}</p>
                </div>
              )}
            </>
          )}
        </div>

        {!done && (
          <div
            className="flex-shrink-0 px-5 pb-8 pt-4"
            style={{ borderTop: '1px solid #f1f5f9', background: 'white' }}
          >
            <button
              onClick={handleSubmit}
              disabled={loading || qty < 1}
              className="w-full py-4 rounded-2xl text-[16px] font-black text-white transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-60"
              style={{
                background: isLoggedIn
                  ? 'linear-gradient(135deg, #ea580c 0%, #f97316 100%)'
                  : 'linear-gradient(135deg, #374151 0%, #4b5563 100%)',
                boxShadow: isLoggedIn
                  ? '0 4px 20px rgba(234,88,12,0.35)'
                  : '0 4px 20px rgba(55,65,81,0.25)',
              }}
            >
              {loading ? (
                <Loader className="w-5 h-5 animate-spin" />
              ) : isLoggedIn ? (
                <>
                  <Handshake className="w-5 h-5" />
                  إرسال عرض التوريد
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  سجّل دخولك وأرسل العرض
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
