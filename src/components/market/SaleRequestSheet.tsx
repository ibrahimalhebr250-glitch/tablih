import { useState } from 'react';
import { X, Package, MapPin, CheckCircle, Loader, Minus, Plus, ShoppingBag } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { sessionManager } from '../../lib/sessionManager';

interface SupplyCard {
  id: string;
  phone: string;
  pallet_type: string;
  size: string;
  quality: string;
  available_quantity: number;
  price_per_pallet: number;
  city: string;
}

interface Props {
  card: SupplyCard;
  onClose: () => void;
  onSuccess: () => void;
}

const QUALITY_LABELS: Record<string, string> = {
  A: 'درجة A',
  B: 'درجة B',
  C: 'درجة C',
  Scrap: 'خردة',
};

export default function SaleRequestSheet({ card, onClose, onSuccess }: Props) {
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const maxQty = card.available_quantity;

  const increment = () => setQuantity(q => Math.min(q + 1, maxQty));
  const decrement = () => setQuantity(q => Math.max(q - 1, 1));

  const handleSubmit = async () => {
    if (quantity < 1 || quantity > maxQty) {
      setError('الكمية غير صحيحة');
      return;
    }
    setLoading(true);
    setError(null);
    const token = sessionManager.getSessionToken();
    if (!token) {
      setError('جلسة غير صالحة. يرجى تسجيل الدخول مجدداً.');
      setLoading(false);
      return;
    }
    const { data } = await supabase.rpc('create_sale_request', {
      p_session_token: token,
      p_inventory_batch_id: card.id,
      p_requested_quantity: quantity,
    });
    setLoading(false);
    if (data?.success) {
      setSuccess(true);
      setTimeout(() => { onSuccess(); }, 1800);
    } else {
      setError(data?.error || 'حدث خطأ أثناء إرسال الطلب');
    }
  };

  if (success) {
    return (
      <div
        className="fixed inset-0 z-[80] flex items-end md:items-center justify-center"
        style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)' }}
      >
        <div
          className="w-full md:rounded-3xl rounded-t-3xl p-8 flex flex-col items-center gap-4 text-center"
          style={{ background: 'white', maxWidth: 440 }}
        >
          <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: '#f0fdf4' }}>
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <h3 className="text-[20px] font-black text-gray-900">تم إرسال طلبك!</h3>
          <p className="text-[14px] text-gray-500 leading-relaxed">
            سيتم إشعار المورد بطلبك وسيرد عليك قريباً
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end md:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div
        className="w-full md:rounded-3xl rounded-t-3xl overflow-hidden"
        style={{ background: 'white', maxWidth: 480, maxHeight: '92vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex-shrink-0 h-1 w-12 rounded-full mx-auto mt-3 mb-1 md:hidden" style={{ background: '#d1d5db' }} />

        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100" dir="rtl">
          <h2 className="text-[16px] font-black text-gray-900">طلب شراء طبليات</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="px-5 py-5 space-y-5" dir="rtl">
          <div className="rounded-2xl p-4" style={{ background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)', border: '1px solid #bbf7d0' }}>
            <p className="text-[13px] font-bold text-green-700 mb-1">شكراً لتواصلك مع صاحب العرض</p>
            <p className="text-[12px] text-green-600/70">يرجى تحديد الكمية المطلوبة وإرسال طلبك</p>
          </div>

          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #e5e7eb' }}>
            <div className="px-4 py-3 border-b border-gray-100" style={{ background: '#f9fafb' }}>
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">ملخص العرض</p>
            </div>
            <div className="divide-y divide-gray-50">
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-[13px] font-bold text-gray-800">{card.pallet_type}</span>
                <span className="text-[11px] text-gray-400">نوع الطبلية</span>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-[13px] font-bold text-gray-800">{card.size || '-'}</span>
                <span className="text-[11px] text-gray-400">المقاس</span>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-[13px] font-bold text-gray-800">{QUALITY_LABELS[card.quality] || card.quality}</span>
                <span className="text-[11px] text-gray-400">الجودة</span>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-green-500" />
                  <span className="text-[13px] font-bold text-gray-800">{card.city}</span>
                </div>
                <span className="text-[11px] text-gray-400">المدينة</span>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-1">
                  <span className="text-[15px] font-black text-green-700">{card.price_per_pallet > 0 ? card.price_per_pallet.toLocaleString() : '-'}</span>
                  {card.price_per_pallet > 0 && <span className="text-[11px] text-gray-400">ريال</span>}
                </div>
                <span className="text-[11px] text-gray-400">السعر / طبلية</span>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-1">
                  <Package className="w-3.5 h-3.5 text-green-500" />
                  <span className="text-[13px] font-bold text-green-700">{card.available_quantity.toLocaleString()}</span>
                  <span className="text-[11px] text-gray-400">طبلية</span>
                </div>
                <span className="text-[11px] text-gray-400">الكمية المتوفرة</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-[13px] font-bold text-gray-700">عدد الطبليات المطلوبة</p>
            <div className="flex items-center gap-4">
              <button
                onClick={decrement}
                disabled={quantity <= 1}
                className="w-11 h-11 rounded-2xl flex items-center justify-center transition-all active:scale-95 disabled:opacity-40"
                style={{ background: quantity <= 1 ? '#f3f4f6' : '#f0fdf4', border: '1px solid #d1d5db' }}
              >
                <Minus className="w-4 h-4 text-gray-600" />
              </button>
              <div className="flex-1 text-center">
                <input
                  type="number"
                  min={1}
                  max={maxQty}
                  value={quantity}
                  onChange={e => {
                    const v = parseInt(e.target.value);
                    if (!isNaN(v)) setQuantity(Math.max(1, Math.min(v, maxQty)));
                  }}
                  className="w-full text-center text-[24px] font-black text-gray-900 border-0 outline-none bg-transparent"
                />
                <p className="text-[11px] text-gray-400">من أصل {maxQty.toLocaleString()} طبلية</p>
              </div>
              <button
                onClick={increment}
                disabled={quantity >= maxQty}
                className="w-11 h-11 rounded-2xl flex items-center justify-center transition-all active:scale-95 disabled:opacity-40"
                style={{ background: quantity >= maxQty ? '#f3f4f6' : '#f0fdf4', border: '1px solid #d1d5db' }}
              >
                <Plus className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            {card.price_per_pallet > 0 && (
              <div className="rounded-xl px-4 py-3 flex items-center justify-between" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                <span className="text-[14px] font-black text-green-700">
                  {(card.price_per_pallet * quantity).toLocaleString()} ريال
                </span>
                <span className="text-[12px] text-green-600/70">الإجمالي التقديري</span>
              </div>
            )}
          </div>

          {error && (
            <div className="rounded-xl px-4 py-3" style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
              <p className="text-[13px] font-semibold text-red-600">{error}</p>
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading || quantity < 1 || quantity > maxQty}
            className="w-full py-4 rounded-2xl flex items-center justify-center gap-2 font-black text-[15px] text-white transition-all active:scale-[0.98] disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)', boxShadow: '0 6px 20px rgba(22,163,74,0.35)' }}
          >
            {loading ? (
              <Loader className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <ShoppingBag className="w-5 h-5" />
                إرسال الطلب
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
