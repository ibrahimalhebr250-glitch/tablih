import { useState } from 'react';
import {
  X, Package, MapPin, Layers, Tag,
  Minus, Plus, CheckCircle2, Loader, AlertTriangle,
  Handshake, ChevronDown, MessageSquare
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { sessionManager } from '../../lib/sessionManager';
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

  const minQty = card.accept_partial_delivery ? 1 : card.quantity;
  const maxQty = card.quantity;

  const [qty, setQty] = useState(card.quantity);
  const [pricePerPallet, setPricePerPallet] = useState('');
  const [city, setCity] = useState(card.city || CITIES[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const price = parseFloat(pricePerPallet);
  const totalPrice = price > 0 ? price * qty : 0;

  const handleSubmit = async () => {
    if (!pricePerPallet || price <= 0) {
      setError('يرجى إدخال السعر المقترح للطبلية');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const token = sessionManager.getSessionToken();
      if (!token) {
        setError('انتهت جلستك، يرجى تسجيل الدخول مجدداً');
        setLoading(false);
        return;
      }

      const { data, error: rpcErr } = await supabase.rpc('create_negotiation_request', {
        p_session_token: token,
        p_order_id: card.id,
        p_requested_quantity: qty,
        p_city: city,
        p_offer_price_per_pallet: price,
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
        <div
          className="flex items-center justify-between px-5 py-4 flex-shrink-0"
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
            <span className="text-[15px] font-black text-gray-800">تقديم عرض تفاوض</span>
          </div>
          <div className="w-8" />
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {done ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <div
                className="w-20 h-20 rounded-3xl flex items-center justify-center"
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
              <div
                className="rounded-2xl p-4"
                style={{ background: '#fff7ed', border: '1px solid #fed7aa' }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <Package className="w-4 h-4 text-orange-500" />
                  <span className="text-[13px] font-black text-orange-800">تفاصيل الطلب</span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-bold text-gray-800">{card.pallet_type}</span>
                    <span className="text-[11px] text-gray-500">نوع الطبلية</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="px-2 py-0.5 rounded-lg text-[10px] font-bold"
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
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-gray-400" />
                      <span className="text-[12px] font-bold text-gray-700">{card.city}</span>
                    </div>
                    <span className="text-[11px] text-gray-500">المدينة المطلوبة</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Layers className="w-3 h-3 text-orange-500" />
                      <span className="text-[15px] font-black text-orange-700">{card.quantity}</span>
                      <span className="text-[11px] text-orange-500 font-bold">طبلية</span>
                    </div>
                    <span className="text-[11px] text-gray-500">الكمية المطلوبة</span>
                  </div>
                  {(card.accept_close_quality || card.accept_close_city || card.accept_partial_delivery) && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {card.accept_close_quality && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold" style={{ background: '#f0fdf4', color: '#15803d' }}>يقبل جودة قريبة</span>
                      )}
                      {card.accept_close_city && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold" style={{ background: '#f0fdf4', color: '#15803d' }}>يقبل مدينة قريبة</span>
                      )}
                      {card.accept_partial_delivery && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold" style={{ background: '#f0fdf4', color: '#15803d' }}>يقبل توريد جزئي</span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[12px] font-black text-gray-700 flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-orange-500" />
                  الكمية التي ستوردها
                  {card.accept_partial_delivery && (
                    <span className="text-[10px] font-normal text-gray-400">(جزئي مسموح)</span>
                  )}
                </label>
                <div
                  className="flex items-center gap-3 rounded-2xl px-4 py-3"
                  style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0' }}
                >
                  <button
                    onClick={() => setQty(q => Math.max(minQty, q - 1))}
                    disabled={qty <= minQty}
                    className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90 disabled:opacity-40"
                    style={{ background: qty <= minQty ? '#f1f5f9' : '#fff7ed', border: '1.5px solid #fed7aa' }}
                  >
                    <Minus className="w-4 h-4 text-orange-600" />
                  </button>
                  <div className="flex-1 text-center">
                    <span className="text-[24px] font-black text-gray-800">{qty}</span>
                    <span className="text-[12px] text-gray-500 mr-1">طبلية</span>
                  </div>
                  <button
                    onClick={() => setQty(q => Math.min(maxQty, q + 1))}
                    disabled={qty >= maxQty}
                    className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90 disabled:opacity-40"
                    style={{ background: qty >= maxQty ? '#f1f5f9' : '#fff7ed', border: '1.5px solid #fed7aa' }}
                  >
                    <Plus className="w-4 h-4 text-orange-600" />
                  </button>
                </div>
                {qty < card.quantity && (
                  <p className="text-[11px] text-amber-600 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    عرض توريد جزئي ({qty} من {card.quantity} طبلية)
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[12px] font-black text-gray-700 flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5 text-orange-500" />
                  سعر الطبلية المقترح (ر.س) *
                </label>
                <div
                  className="flex items-center gap-2 rounded-2xl px-4 py-3"
                  style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0' }}
                >
                  <input
                    type="number"
                    value={pricePerPallet}
                    onChange={(e) => setPricePerPallet(e.target.value)}
                    placeholder="مثال: 45"
                    min="0"
                    step="1"
                    className="flex-1 text-[17px] font-black bg-transparent outline-none text-gray-800 text-center"
                    style={{ direction: 'ltr' }}
                  />
                  <span className="text-[12px] font-bold text-gray-400">ر.س / طبلية</span>
                </div>
                {totalPrice > 0 && (
                  <p className="text-[11px] text-emerald-600 font-bold text-center">
                    إجمالي الصفقة: {totalPrice.toLocaleString()} ر.س
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[12px] font-black text-gray-700 flex items-center gap-1">
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
                    className="w-full py-3 pr-4 pl-10 text-[14px] font-bold text-gray-800 bg-transparent outline-none appearance-none rounded-2xl"
                  >
                    {CITIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              <div
                className="flex items-start gap-2 rounded-2xl px-4 py-3"
                style={{ background: '#eff6ff', border: '1px solid #bfdbfe' }}
              >
                <MessageSquare className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-blue-700 leading-relaxed">
                  سيصل عرضك للمشتري فور الإرسال. في حال قبوله سيتم إنشاء صفقة مباشرة.
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
              disabled={loading || !pricePerPallet || price <= 0}
              className="w-full py-4 rounded-2xl text-[16px] font-black text-white transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-60"
              style={{
                background: 'linear-gradient(135deg, #ea580c 0%, #f97316 100%)',
                boxShadow: '0 4px 20px rgba(234,88,12,0.35)',
              }}
            >
              {loading ? (
                <Loader className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Handshake className="w-5 h-5" />
                  إرسال عرض التفاوض
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
