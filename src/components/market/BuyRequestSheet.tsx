import { useState } from 'react';
import {
  X, Package, MapPin, Star, Layers, Tag, Award,
  Minus, Plus, CheckCircle2, Loader, AlertTriangle, Store
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { sessionManager } from '../../lib/sessionManager';
import type { SupplyCardData } from './PalletCards';

interface Props {
  card: SupplyCardData;
  onClose: () => void;
  onSuccess: () => void;
}

const QUALITY_MAP: Record<string, { label: string; color: string; bg: string }> = {
  A: { label: 'درجة A - ممتاز', color: '#15803d', bg: '#dcfce7' },
  B: { label: 'درجة B - جيد جداً', color: '#1d4ed8', bg: '#dbeafe' },
  C: { label: 'درجة C - جيد', color: '#b45309', bg: '#fef3c7' },
  Scrap: { label: 'خردة', color: '#b91c1c', bg: '#fee2e2' },
};

export default function BuyRequestSheet({ card, onClose, onSuccess }: Props) {
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const maxQty = card.available_quantity;
  const quality = QUALITY_MAP[card.quality] || { label: card.quality, color: '#374151', bg: '#f3f4f6' };
  const totalPrice = card.price_per_pallet > 0 ? card.price_per_pallet * qty : 0;

  const decrement = () => setQty(q => Math.max(1, q - 1));
  const increment = () => setQty(q => Math.min(maxQty, q + 1));

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = sessionManager.getSessionToken();
      if (!token) {
        setError('يجب تسجيل الدخول أولاً');
        setLoading(false);
        return;
      }
      const { data, error: rpcErr } = await supabase.rpc('create_sale_request', {
        p_session_token: token,
        p_inventory_batch_id: card.id,
        p_requested_quantity: qty,
      });
      if (rpcErr || !data?.success) {
        setError(data?.error || rpcErr?.message || 'حدث خطأ أثناء إرسال الطلب');
      } else {
        setDone(true);
        setTimeout(() => { onSuccess(); }, 1800);
      }
    } catch {
      setError('حدث خطأ غير متوقع');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex flex-col justify-end"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className="rounded-t-3xl overflow-hidden flex flex-col"
        style={{
          background: 'white',
          maxHeight: '92vh',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.2)',
        }}
        onClick={e => e.stopPropagation()}
        dir="rtl"
      >
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid #f1f5f9' }}>
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: '#dcfce7' }}
            >
              <Store className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <h3 className="text-[15px] font-black text-gray-900">طلب شراء طبليات</h3>
              <p className="text-[11px] text-gray-400">أرسل طلبك إلى المورد</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-all active:scale-90"
            style={{ background: '#f3f4f6' }}
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {done ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 gap-4 text-center">
              <div
                className="w-20 h-20 rounded-3xl flex items-center justify-center"
                style={{ background: '#dcfce7' }}
              >
                <CheckCircle2 className="w-10 h-10 text-green-500" />
              </div>
              <div>
                <h4 className="text-[20px] font-black text-gray-900 mb-1">تم إرسال طلبك</h4>
                <p className="text-[14px] text-gray-500 leading-relaxed">
                  سيصلك رد من المورد قريباً.<br />
                  يمكنك متابعة الطلب في قسم <strong>طلبات الشراء</strong> في حسابك.
                </p>
              </div>
            </div>
          ) : (
            <div className="px-5 py-5 space-y-5">
              <div
                className="rounded-2xl p-4"
                style={{ background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)', border: '1px solid #bbf7d0' }}
              >
                <p className="text-[14px] font-black text-green-800 mb-0.5">
                  شكراً لتواصلك مع صاحب العرض
                </p>
                <p className="text-[12px] text-green-600">
                  سيتم إخطار المورد بطلبك فور الإرسال.
                </p>
              </div>

              <div
                className="rounded-2xl overflow-hidden"
                style={{ border: '1.5px solid rgba(0,0,0,0.07)' }}
              >
                <div
                  className="px-4 py-2.5 flex items-center gap-2"
                  style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}
                >
                  <Package className="w-4 h-4 text-gray-400" />
                  <span className="text-[12px] font-black text-gray-600">ملخص العرض</span>
                </div>
                <div className="px-4 py-1 divide-y divide-gray-50">
                  <div className="flex items-center justify-between py-2.5">
                    <span className="text-[12px] text-gray-500 flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5 text-gray-300" />نوع الطبلية
                    </span>
                    <span className="text-[13px] font-bold text-gray-800">{card.pallet_type}</span>
                  </div>
                  <div className="flex items-center justify-between py-2.5">
                    <span className="text-[12px] text-gray-500 flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-gray-300" />المقاس
                    </span>
                    <span className="text-[13px] font-bold text-gray-800">{card.size}</span>
                  </div>
                  <div className="flex items-center justify-between py-2.5">
                    <span className="text-[12px] text-gray-500 flex items-center gap-1.5">
                      <Star className="w-3.5 h-3.5 text-gray-300" />الجودة
                    </span>
                    <span
                      className="text-[11px] font-black px-2.5 py-1 rounded-full"
                      style={{ background: quality.bg, color: quality.color }}
                    >
                      {quality.label}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2.5">
                    <span className="text-[12px] text-gray-500 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-gray-300" />المدينة
                    </span>
                    <span className="text-[13px] font-bold text-gray-800">{card.city}</span>
                  </div>
                  <div className="flex items-center justify-between py-2.5">
                    <span className="text-[12px] text-gray-500 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-gray-300" />الكمية المتاحة
                    </span>
                    <span className="text-[13px] font-bold text-emerald-700">{maxQty} طبلية</span>
                  </div>
                  <div className="flex items-center justify-between py-2.5">
                    <span className="text-[12px] text-gray-500 flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-gray-300" />سعر الطبلية
                    </span>
                    <span className="text-[14px] font-black text-emerald-700">
                      {card.price_per_pallet > 0 ? `${card.price_per_pallet.toLocaleString()} ر.س` : 'قابل للتفاوض'}
                    </span>
                  </div>
                </div>
              </div>

              <div
                className="rounded-2xl overflow-hidden"
                style={{ border: '1.5px solid rgba(0,0,0,0.07)' }}
              >
                <div
                  className="px-4 py-2.5 flex items-center gap-2"
                  style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}
                >
                  <Layers className="w-4 h-4 text-gray-400" />
                  <span className="text-[12px] font-black text-gray-600">عدد الطبليات المطلوبة</span>
                </div>
                <div className="px-4 py-4">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={decrement}
                      disabled={qty <= 1}
                      className="w-11 h-11 rounded-2xl flex items-center justify-center transition-all active:scale-90 disabled:opacity-40"
                      style={{ background: '#f3f4f6', border: '1.5px solid #e5e7eb' }}
                    >
                      <Minus className="w-4 h-4 text-gray-600" />
                    </button>

                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-[36px] font-black text-gray-900 leading-none">{qty}</span>
                      <span className="text-[11px] text-gray-400">طبلية</span>
                    </div>

                    <button
                      onClick={increment}
                      disabled={qty >= maxQty}
                      className="w-11 h-11 rounded-2xl flex items-center justify-center transition-all active:scale-90 disabled:opacity-40"
                      style={{
                        background: 'linear-gradient(135deg, #059669, #10b981)',
                        boxShadow: qty < maxQty ? '0 4px 12px rgba(5,150,105,0.35)' : 'none',
                      }}
                    >
                      <Plus className="w-4 h-4 text-white" />
                    </button>
                  </div>

                  <div
                    className="mt-3 h-1.5 rounded-full overflow-hidden"
                    style={{ background: '#f3f4f6' }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${(qty / maxQty) * 100}%`,
                        background: 'linear-gradient(90deg, #10b981, #059669)',
                      }}
                    />
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-[10px] text-gray-400">1</span>
                    <span className="text-[10px] text-gray-400">الحد الأقصى: {maxQty}</span>
                  </div>
                </div>
              </div>

              {totalPrice > 0 && (
                <div
                  className="rounded-2xl px-4 py-3 flex items-center justify-between"
                  style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}
                >
                  <span className="text-[13px] text-green-700 font-bold">الإجمالي التقريبي</span>
                  <span className="text-[18px] font-black text-green-800">
                    {totalPrice.toLocaleString()} ر.س
                  </span>
                </div>
              )}

              {error && (
                <div
                  className="rounded-2xl px-4 py-3 flex items-center gap-2"
                  style={{ background: '#fef2f2', border: '1px solid #fecaca' }}
                >
                  <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                  <span className="text-[13px] font-bold text-red-600">{error}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {!done && (
          <div className="px-5 pb-8 pt-3" style={{ borderTop: '1px solid #f1f5f9' }}>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full py-4 rounded-2xl font-black text-[16px] text-white flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-60"
              style={{
                background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                boxShadow: '0 6px 24px rgba(5,150,105,0.4)',
              }}
            >
              {loading ? (
                <Loader className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  إرسال الطلب
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
