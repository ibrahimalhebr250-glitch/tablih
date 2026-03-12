import { useState, useEffect } from 'react';
import {
  X, Package, MapPin, Star, Layers, Tag, Award,
  Minus, Plus, CheckCircle2, Loader, AlertTriangle,
  Truck, ChevronDown, MessageSquare, Warehouse, PackagePlus, ArrowLeft
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { sessionManager } from '../../lib/sessionManager';
import type { DemandCardData } from './PalletCards';

interface InventoryBatch {
  id: string;
  pallet_type: string;
  size: string;
  quality: string;
  city: string;
  available_quantity: number;
  price_per_pallet: number;
  batch_ref: string;
}

interface Props {
  card: DemandCardData;
  onClose: () => void;
  onSuccess: () => void;
  onGoToInventory?: () => void;
}

const QUALITY_MAP: Record<string, { label: string; color: string; bg: string }> = {
  A: { label: 'درجة A - ممتاز', color: '#15803d', bg: '#dcfce7' },
  B: { label: 'درجة B - جيد جداً', color: '#1d4ed8', bg: '#dbeafe' },
  C: { label: 'درجة C - جيد', color: '#b45309', bg: '#fef3c7' },
  Scrap: { label: 'خردة', color: '#b91c1c', bg: '#fee2e2' },
};

export default function SupplyOfferSheet({ card, onClose, onSuccess, onGoToInventory }: Props) {
  const [batches, setBatches] = useState<InventoryBatch[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(true);
  const [selectedBatch, setSelectedBatch] = useState<InventoryBatch | null>(null);
  const [showBatchPicker, setShowBatchPicker] = useState(false);
  const [qty, setQty] = useState(1);
  const [pricePerPallet, setPricePerPallet] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const quality = QUALITY_MAP[card.quality] || { label: card.quality, color: '#374151', bg: '#f3f4f6' };
  const maxQty = selectedBatch ? Math.min(selectedBatch.available_quantity, card.quantity) : card.quantity;
  const totalPrice = parseFloat(pricePerPallet) > 0 ? parseFloat(pricePerPallet) * qty : 0;

  useEffect(() => {
    const loadBatches = async () => {
      setLoadingBatches(true);
      const token = sessionManager.getSessionToken();
      if (!token) { setLoadingBatches(false); return; }

      const { data: sessionData } = await supabase.rpc('validate_session', { p_token: token });
      if (!sessionData?.valid) { setLoadingBatches(false); return; }

      const { data } = await supabase
        .from('inventory_batches')
        .select('id, pallet_type, size, quality, city, available_quantity, price_per_pallet, batch_ref')
        .eq('phone', sessionData.phone)
        .eq('status', 'active')
        .gt('available_quantity', 0)
        .order('created_at', { ascending: false });

      const list = (data || []) as InventoryBatch[];
      setBatches(list);

      const matching = list.find(b =>
        b.pallet_type?.toLowerCase().trim() === card.pallet_type?.toLowerCase().trim()
      );
      if (matching) {
        setSelectedBatch(matching);
        if (matching.price_per_pallet > 0) {
          setPricePerPallet(String(matching.price_per_pallet));
        }
        setQty(Math.min(matching.available_quantity, card.quantity));
      }
      setLoadingBatches(false);
    };
    loadBatches();
  }, [card.pallet_type, card.quantity]);

  const handleSelectBatch = (batch: InventoryBatch) => {
    setSelectedBatch(batch);
    setShowBatchPicker(false);
    setQty(Math.min(batch.available_quantity, card.quantity));
    if (batch.price_per_pallet > 0) {
      setPricePerPallet(String(batch.price_per_pallet));
    } else {
      setPricePerPallet('');
    }
    setError(null);
  };

  const decrement = () => setQty(q => Math.max(1, q - 1));
  const increment = () => setQty(q => Math.min(maxQty, q + 1));

  const handleSubmit = async () => {
    if (!selectedBatch) {
      setError('يجب اختيار دفعة من مخزونك');
      return;
    }
    const price = parseFloat(pricePerPallet);
    if (!pricePerPallet || isNaN(price) || price <= 0) {
      setError('يجب إدخال سعر الطبلية');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const token = sessionManager.getSessionToken();
      if (!token) { setError('يجب تسجيل الدخول أولاً'); setLoading(false); return; }

      const { data: sessionData } = await supabase.rpc('validate_session', { p_token: token });
      if (!sessionData?.valid) { setError('جلسة منتهية، سجّل دخولك مجدداً'); setLoading(false); return; }

      const { data, error: rpcErr } = await supabase.rpc('create_supplier_offer_for_demand', {
        p_supplier_phone: sessionData.phone,
        p_order_id: card.id,
        p_quantity: qty,
        p_price_per_pallet: price,
        p_supplier_message: message.trim() || null,
        p_inventory_batch_id: selectedBatch.id,
      });

      if (rpcErr || !data?.success) {
        setError(data?.error || rpcErr?.message || 'حدث خطأ أثناء إرسال العرض');
      } else {
        setDone(true);
        setTimeout(() => { onSuccess(); }, 2000);
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
        style={{ background: 'white', maxHeight: '94vh', boxShadow: '0 -8px 40px rgba(0,0,0,0.2)' }}
        onClick={e => e.stopPropagation()}
        dir="rtl"
      >
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid #f1f5f9' }}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: '#ffedd5' }}>
              <Truck className="w-4 h-4 text-orange-500" />
            </div>
            <div>
              <h3 className="text-[15px] font-black text-gray-900">تقديم عرض توريد</h3>
              <p className="text-[11px] text-gray-400">أرسل عرضك للمشتري</p>
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
                style={{ background: '#ffedd5' }}
              >
                <CheckCircle2 className="w-10 h-10 text-orange-500" />
              </div>
              <div>
                <h4 className="text-[20px] font-black text-gray-900 mb-1">تم إرسال عرضك!</h4>
                <p className="text-[14px] text-gray-500 leading-relaxed">
                  سيتم إخطار المشتري بعرضك فوراً.<br />
                  يمكنك متابعة العروض في قسم <strong>صفقاتي</strong> في حسابك.
                </p>
              </div>
            </div>
          ) : (
            <div className="px-5 py-5 space-y-4">

              <div
                className="rounded-2xl p-4"
                style={{ background: 'linear-gradient(135deg, #fff7ed 0%, #fed7aa 100%)', border: '1px solid #fdba74' }}
              >
                <p className="text-[14px] font-black text-orange-800 mb-0.5">
                  أنت تردّ على طلب شراء مشترٍ
                </p>
                <p className="text-[12px] text-orange-600">
                  سيصل عرضك للمشتري وبإمكانه الموافقة وإتمام الصفقة.
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
                  <span className="text-[12px] font-black text-gray-600">تفاصيل الطلب</span>
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
                      <Star className="w-3.5 h-3.5 text-gray-300" />الجودة المطلوبة
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
                      <Layers className="w-3.5 h-3.5 text-gray-300" />الكمية المطلوبة
                    </span>
                    <span className="text-[13px] font-black text-orange-600">{card.quantity} طبلية</span>
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
                  <Warehouse className="w-4 h-4 text-gray-400" />
                  <span className="text-[12px] font-black text-gray-600">اختر دفعة من مخزونك</span>
                </div>
                <div className="p-4">
                  {loadingBatches ? (
                    <div className="flex items-center justify-center py-6 gap-2">
                      <Loader className="w-5 h-5 animate-spin text-gray-400" />
                      <span className="text-[13px] text-gray-400">جاري تحميل مخزونك...</span>
                    </div>
                  ) : batches.length === 0 ? (
                    <div className="flex flex-col items-center text-center gap-5 py-6 px-2">
                      <div
                        className="w-20 h-20 rounded-3xl flex items-center justify-center"
                        style={{ background: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)', border: '2px dashed #fb923c' }}
                      >
                        <PackagePlus className="w-9 h-9 text-orange-400" />
                      </div>
                      <div>
                        <p className="text-[16px] font-black text-gray-900 mb-1">
                          لا يوجد رصيد طبليات في مستودعك
                        </p>
                        <p className="text-[12px] text-gray-500 leading-relaxed">
                          قم بتسجيل مخزونك أولاً في <strong className="text-orange-600">إضافة مخزون</strong>،<br />
                          ثم عُد مرة أخرى لتقديم عرضك للمشتري
                        </p>
                      </div>
                      <div
                        className="w-full rounded-2xl p-3 flex items-center gap-2.5"
                        style={{ background: '#fff7ed', border: '1px solid #fed7aa' }}
                      >
                        <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0" />
                        <p className="text-[11px] text-orange-700 text-right leading-relaxed">
                          المخزون في المستودع السحابي يتيح لك تقديم عروض للمشترين في السوق
                        </p>
                      </div>
                      <button
                        onClick={() => { onClose(); onGoToInventory?.(); }}
                        className="w-full py-4 rounded-2xl font-black text-[15px] text-white flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                        style={{
                          background: 'linear-gradient(135deg, #ea580c 0%, #f97316 100%)',
                          boxShadow: '0 6px 20px rgba(234,88,12,0.35)',
                        }}
                      >
                        <PackagePlus className="w-5 h-5" />
                        الذهاب إلى إضافة مخزون
                        <ArrowLeft className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedBatch ? (
                        <button
                          onClick={() => setShowBatchPicker(p => !p)}
                          className="w-full flex items-center justify-between rounded-2xl px-4 py-3 transition-all active:scale-[0.98]"
                          style={{ background: '#fff7ed', border: '2px solid #fb923c' }}
                        >
                          <ChevronDown className={`w-4 h-4 text-orange-500 transition-transform ${showBatchPicker ? 'rotate-180' : ''}`} />
                          <div className="text-right flex-1 mr-2">
                            <p className="text-[13px] font-black text-gray-900">{selectedBatch.pallet_type} — {selectedBatch.city}</p>
                            <p className="text-[11px] text-orange-600 mt-0.5">
                              {selectedBatch.available_quantity} طبلية متاحة
                              {selectedBatch.price_per_pallet > 0 && ` · ${selectedBatch.price_per_pallet.toLocaleString()} ر.س/طبلية`}
                            </p>
                          </div>
                          <div className="w-8 h-8 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
                            <Warehouse className="w-4 h-4 text-orange-500" />
                          </div>
                        </button>
                      ) : (
                        <button
                          onClick={() => setShowBatchPicker(p => !p)}
                          className="w-full flex items-center justify-between rounded-2xl px-4 py-3 transition-all active:scale-[0.98]"
                          style={{ background: '#f8fafc', border: '1.5px dashed #d1d5db' }}
                        >
                          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showBatchPicker ? 'rotate-180' : ''}`} />
                          <span className="text-[13px] text-gray-500 flex-1 text-right mr-2">اختر دفعة من مخزونك</span>
                          <Warehouse className="w-4 h-4 text-gray-400 shrink-0" />
                        </button>
                      )}

                      {showBatchPicker && (
                        <div
                          className="rounded-2xl overflow-hidden"
                          style={{ border: '1.5px solid #e5e7eb', background: '#fafafa' }}
                        >
                          {batches.map((batch, i) => (
                            <button
                              key={batch.id}
                              onClick={() => handleSelectBatch(batch)}
                              className="w-full flex items-center justify-between px-4 py-3 transition-colors hover:bg-orange-50 active:bg-orange-100 text-right"
                              style={{ borderBottom: i < batches.length - 1 ? '1px solid #f1f5f9' : 'none' }}
                            >
                              <div className="flex items-center gap-2">
                                {selectedBatch?.id === batch.id && (
                                  <CheckCircle2 className="w-4 h-4 text-orange-500" />
                                )}
                                <span className="text-[11px] text-gray-400 font-mono" dir="ltr">{batch.batch_ref}</span>
                              </div>
                              <div className="text-right">
                                <p className="text-[13px] font-bold text-gray-800">
                                  {batch.pallet_type} · {batch.size} · {batch.city}
                                </p>
                                <p className="text-[11px] text-orange-600 mt-0.5">
                                  {batch.available_quantity} طبلية
                                  {batch.price_per_pallet > 0 && ` · ${batch.price_per_pallet.toLocaleString()} ر.س`}
                                </p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {selectedBatch && (
                <>
                  <div
                    className="rounded-2xl overflow-hidden"
                    style={{ border: '1.5px solid rgba(0,0,0,0.07)' }}
                  >
                    <div
                      className="px-4 py-2.5 flex items-center gap-2"
                      style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}
                    >
                      <Layers className="w-4 h-4 text-gray-400" />
                      <span className="text-[12px] font-black text-gray-600">الكمية التي تعرضها</span>
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
                            background: qty < maxQty ? 'linear-gradient(135deg, #ea580c, #f97316)' : '#f3f4f6',
                            boxShadow: qty < maxQty ? '0 4px 12px rgba(234,88,12,0.3)' : 'none',
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
                            background: 'linear-gradient(90deg, #f97316, #ea580c)',
                          }}
                        />
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-[10px] text-gray-400">1</span>
                        <span className="text-[10px] text-gray-400">
                          الحد الأقصى: {maxQty} ({qty >= card.quantity ? 'يغطي الطلب كاملاً' : `${card.quantity - qty} طبلية ناقصة`})
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
                      <Tag className="w-4 h-4 text-gray-400" />
                      <span className="text-[12px] font-black text-gray-600">سعر الطبلية (ر.س)</span>
                    </div>
                    <div className="px-4 py-3">
                      <input
                        type="number"
                        value={pricePerPallet}
                        onChange={e => setPricePerPallet(e.target.value)}
                        placeholder="مثال: 45"
                        className="w-full text-[18px] font-black text-gray-900 text-right outline-none bg-transparent"
                        dir="rtl"
                        inputMode="numeric"
                      />
                      {totalPrice > 0 && (
                        <div className="flex items-center justify-between mt-2 pt-2" style={{ borderTop: '1px solid #f1f5f9' }}>
                          <span className="text-[12px] text-gray-500">الإجمالي التقريبي</span>
                          <span className="text-[16px] font-black text-orange-600">
                            {totalPrice.toLocaleString('ar-SA')} ر.س
                          </span>
                        </div>
                      )}
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
                      <MessageSquare className="w-4 h-4 text-gray-400" />
                      <span className="text-[12px] font-black text-gray-600">رسالة للمشتري (اختياري)</span>
                    </div>
                    <div className="px-4 py-3">
                      <textarea
                        value={message}
                        onChange={e => setMessage(e.target.value)}
                        placeholder="اكتب أي تفاصيل إضافية أو شروط التوريد..."
                        rows={3}
                        className="w-full text-[13px] text-gray-700 text-right outline-none bg-transparent resize-none leading-relaxed"
                        dir="rtl"
                        maxLength={300}
                      />
                      <div className="text-left mt-1">
                        <span className="text-[10px] text-gray-400">{message.length}/300</span>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {error && (
                <div
                  className="rounded-2xl px-4 py-3 flex items-start gap-2"
                  style={{ background: '#fef2f2', border: '1px solid #fecaca' }}
                >
                  <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <span className="text-[13px] font-bold text-red-600">{error}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {!done && selectedBatch && (
          <div className="px-5 pb-8 pt-3" style={{ borderTop: '1px solid #f1f5f9' }}>
            <button
              onClick={handleSubmit}
              disabled={loading || !selectedBatch}
              className="w-full py-4 rounded-2xl font-black text-[16px] text-white flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-60"
              style={{
                background: 'linear-gradient(135deg, #ea580c 0%, #f97316 100%)',
                boxShadow: '0 6px 24px rgba(234,88,12,0.4)',
              }}
            >
              {loading ? (
                <Loader className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Truck className="w-5 h-5" />
                  إرسال عرض التوريد
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
