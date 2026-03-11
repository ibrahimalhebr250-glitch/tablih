import { useState, useEffect } from 'react';
import { MapPin, Package, Star, ShoppingBag, Heart, Home, X, Handshake, LogIn, CheckCircle, Clock, CheckCircle2, XCircle, Warehouse, AlertTriangle, Info, Truck } from 'lucide-react';
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

interface InventoryBatch {
  id: string;
  batch_id: string;
  pallet_type: string;
  size: string;
  quality: string;
  pallet_condition: string;
  city: string;
  available_quantity: number;
  price_per_pallet: number;
  description: string;
  created_at: string;
}

function SupplierDealRequestDialog({ card, supplierPhone, existingDeal, onClose, onCreated }: {
  card: DemandCard;
  supplierPhone: string;
  existingDeal: { id: string; status: string; deal_ref: string; created_at: string; quantity: number } | null;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [quantity, setQuantity] = useState(card.quantity);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [batches, setBatches] = useState<InventoryBatch[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(true);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [pledged, setPledged] = useState(false);

  useEffect(() => {
    if (!existingDeal) loadInventory();
    else setLoadingBatches(false);
  }, []);

  const loadInventory = async () => {
    setLoadingBatches(true);
    try {
      const { data } = await supabase
        .from('inventory_batches')
        .select('id, batch_id, pallet_type, size, quality, pallet_condition, city, available_quantity, quantity_available, price_per_pallet, description, created_at')
        .eq('phone', supplierPhone)
        .eq('pallet_type', card.pallet_type)
        .gt('quantity_available', 0)
        .order('created_at', { ascending: false });

      if (data) {
        const mapped = data.map((b: Record<string, unknown>) => ({
          ...b,
          available_quantity: (b.quantity_available as number) || (b.available_quantity as number) || 0,
        })) as InventoryBatch[];
        setBatches(mapped);
        if (mapped.length === 1) {
          setSelectedBatchId(mapped[0].id);
          setQuantity(Math.min(card.quantity, mapped[0].available_quantity));
        }
      }
    } catch { /* ignore */ }
    setLoadingBatches(false);
  };

  const selectedBatch = batches.find(b => b.id === selectedBatchId);

  const handleSelectBatch = (batch: InventoryBatch) => {
    setSelectedBatchId(batch.id);
    setQuantity(Math.min(card.quantity, batch.available_quantity));
    setError('');
  };

  const handleCreate = async () => {
    if (loading) return;
    if (!selectedBatchId) { setError('اختر دفعة من مخزونك أولاً'); return; }
    if (!pledged) { setError('يجب الموافقة على شروط الصفقة قبل المتابعة'); return; }
    if (quantity < 1) { setError('الكمية يجب أن تكون 1 على الأقل'); return; }
    if (selectedBatch && quantity > selectedBatch.available_quantity) {
      setError('الكمية المتوفرة في هذه الدفعة ' + selectedBatch.available_quantity + ' فقط');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { data, error: err } = await supabase.rpc('create_deal_from_demand_card', {
        p_supplier_phone: supplierPhone,
        p_order_id: card.id,
        p_inventory_batch_id: selectedBatchId,
        p_quantity: quantity,
      });
      if (err) throw err;
      if (data && !data.success) {
        if (data.existing_deal_id) {
          setError('لديك عرض نشط بالفعل لهذا الطلب');
        } else {
          setError(data.error || 'حدث خطأ');
        }
        return;
      }
      onCreated();
    } catch {
      setError('حدث خطأ أثناء إرسال العرض. حاول مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  const dealStatusConfig: Record<string, { label: string; color: string; bg: string; icon: JSX.Element }> = {
    pending_buyer: { label: 'بانتظار موافقة المشتري', color: '#b45309', bg: '#FFFBEB', icon: <Clock className="w-4 h-4" /> },
    in_delivery: { label: 'المشتري وافق — جاري التفاوض', color: '#059669', bg: '#ECFDF5', icon: <CheckCircle2 className="w-4 h-4" /> },
    completed: { label: 'تمت الصفقة', color: '#1d4ed8', bg: '#EFF6FF', icon: <CheckCircle2 className="w-4 h-4" /> },
    cancelled: { label: 'ملغي', color: '#6b7280', bg: '#f3f4f6', icon: <XCircle className="w-4 h-4" /> },
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-8"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div
        className="w-full rounded-3xl overflow-hidden flex flex-col"
        style={{ maxWidth: 480, maxHeight: '90vh', background: 'white' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 pt-5 pb-2 flex-shrink-0" dir="rtl">
          <div className="flex items-start justify-between">
            <button onClick={onClose} className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center mt-0.5">
              <X className="w-3.5 h-3.5 text-gray-500" />
            </button>
            <div className="flex items-center gap-2">
              <div>
                <p className="text-[15px] font-black text-[#1a3a4a]">عرض توريد للمشتري</p>
                <p className="text-[11px] text-[#7a9aab]">{card.pallet_type} — {card.city}</p>
              </div>
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #b45309, #d97706)' }}>
                <Truck className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 px-5 pb-6 pt-2 space-y-4" dir="rtl">
          {existingDeal && existingDeal.status !== 'cancelled' ? (
            <div className="space-y-3">
              <div className="rounded-2xl p-4" style={{ background: dealStatusConfig[existingDeal.status]?.bg || '#f3f4f6', border: '1px solid rgba(0,0,0,0.06)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <span style={{ color: dealStatusConfig[existingDeal.status]?.color || '#6b7280' }}>
                    {dealStatusConfig[existingDeal.status]?.icon}
                  </span>
                  <span className="text-[13px] font-black" style={{ color: dealStatusConfig[existingDeal.status]?.color || '#6b7280' }}>
                    {dealStatusConfig[existingDeal.status]?.label}
                  </span>
                </div>
                <p className="text-[11px] text-[#7a9aab]">مرجع الصفقة: {existingDeal.deal_ref}</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[12px] font-bold text-[#1a3a4a]">{existingDeal.quantity} طبلية</span>
                  <span className="text-[11px] text-[#7a9aab]">الكمية المعروضة</span>
                </div>
              </div>
              {existingDeal.status === 'pending_buyer' && (
                <div className="rounded-2xl p-3.5 flex items-start gap-3" style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
                  <Clock className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-[11px] text-[#92400E] leading-relaxed">عرضك قيد الانتظار. ستُشعَر فور رد المشتري. تابع في <span className="font-black">حسابي ← صفقاتي</span></p>
                </div>
              )}
              {existingDeal.status === 'in_delivery' && (
                <div className="rounded-2xl p-3.5 flex items-start gap-3" style={{ background: '#ECFDF5', border: '1px solid #A7F3D0' }}>
                  <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <p className="text-[11px] text-[#065F46] leading-relaxed">وافق المشتري على عرضك! توجّه إلى <span className="font-black">حسابي ← صفقاتي</span> لتأكيد التسليم.</p>
                </div>
              )}
              <button onClick={onClose} className="w-full py-3 rounded-2xl text-[13px] font-bold text-[#4a6a7e]" style={{ background: '#f0f6fa', border: '1px solid #e2edf5' }}>
                إغلاق
              </button>
            </div>
          ) : loadingBatches ? (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <div className="w-8 h-8 rounded-full border-2 border-amber-200 border-t-amber-600 animate-spin" />
              <p className="text-[13px] text-[#7a9aab]">جاري تحميل مخزونك...</p>
            </div>
          ) : batches.length === 0 ? (
            <div className="space-y-4">
              <div className="rounded-2xl p-5 text-center" style={{ background: '#FEF2F2', border: '1.5px solid #FECACA' }}>
                <div className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center" style={{ background: 'rgba(220,38,38,0.1)' }}>
                  <AlertTriangle className="w-7 h-7 text-red-500" />
                </div>
                <p className="text-[14px] font-black text-[#991B1B] mb-2">لا يوجد مخزون {card.pallet_type} مسجّل</p>
                <p className="text-[12px] text-[#B91C1C] leading-relaxed">
                  المشتري يطلب <span className="font-black">{card.pallet_type}</span>. يجب أن يكون لديك مخزون من نفس النوع لتقديم عرض توريد.
                </p>
              </div>
              <div className="rounded-2xl p-3.5 flex items-start gap-3" style={{ background: '#FFF7ED', border: '1px solid #FED7AA' }}>
                <Warehouse className="w-4 h-4 text-[#b45309] flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-[#92400E] leading-relaxed">
                  سجّل مخزونك من <span className="font-black">{card.pallet_type}</span> أولاً من خلال <span className="font-black">صفحة إيداع المخزون</span> ثم عُد لتقديم عرضك.
                </p>
              </div>
              <button onClick={onClose} className="w-full py-3 rounded-2xl text-[13px] font-bold text-[#4a6a7e]" style={{ background: '#f0f6fa', border: '1px solid #e2edf5' }}>
                إغلاق
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-2xl p-3.5 flex items-start gap-3" style={{ background: '#ECFDF5', border: '1px solid #A7F3D0' }}>
                <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-[#065F46] leading-relaxed">
                  شكراً لتواصلك مع صاحب هذا الطلب. اختر الدفعة وحدد الكمية وسيتم إشعار المشتري فوراً.
                </p>
              </div>

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
                <label className="block text-[12px] font-bold text-[#1a3a4a] mb-2 text-right">
                  <Warehouse className="w-3.5 h-3.5 inline-block ml-1" />
                  اختر من مخزونك ({card.pallet_type})
                </label>
                <div className="space-y-2 max-h-[180px] overflow-y-auto rounded-2xl">
                  {batches.map((batch) => {
                    const selected = selectedBatchId === batch.id;
                    return (
                      <button
                        key={batch.id}
                        onClick={() => handleSelectBatch(batch)}
                        className="w-full rounded-2xl p-3 text-right transition-all"
                        style={{
                          background: selected ? '#FFF7ED' : '#f8fbfd',
                          border: selected ? '2px solid #d97706' : '1.5px solid #e2edf5',
                          boxShadow: selected ? '0 2px 12px rgba(217,119,6,0.15)' : 'none',
                        }}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-[#a0b5c0]">{batch.batch_id}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[13px] font-black text-[#1a3a4a]">{batch.pallet_type}</span>
                            {selected && (
                              <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: '#d97706' }}>
                                <CheckCircle2 className="w-3 h-3 text-white" />
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="text-[11px] text-[#7a9aab]">{batch.city}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold text-[#1a3a4a]">{batch.quality}</span>
                            <span className="text-[10px] text-[#a0b5c0]">|</span>
                            <span className="text-[11px] font-bold" style={{ color: '#0d7c66' }}>{batch.available_quantity} متوفرة</span>
                            {batch.price_per_pallet > 0 && (
                              <>
                                <span className="text-[10px] text-[#a0b5c0]">|</span>
                                <span className="text-[11px] font-bold text-[#b45309]">{batch.price_per_pallet} ر.س</span>
                              </>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {selectedBatch && (
                <div>
                  <label className="block text-[12px] font-bold text-[#1a3a4a] mb-2 text-right">
                    الكمية التي يمكنك توريدها
                  </label>
                  <div className="flex items-center gap-2" dir="rtl">
                    <button onClick={() => setQuantity(q => Math.max(1, q - 10))} className="w-10 h-10 rounded-xl flex items-center justify-center text-[16px] font-black transition-all active:scale-90" style={{ background: '#FFF7ED', border: '1.5px solid #FED7AA', color: '#b45309' }}>-</button>
                    <input type="number" value={quantity} onChange={(e) => { const v = parseInt(e.target.value) || 0; setQuantity(Math.max(1, Math.min(v, selectedBatch.available_quantity))); }} className="flex-1 text-center text-[16px] font-black text-[#1a3a4a] rounded-xl py-2.5 outline-none" style={{ background: '#f8fbfd', border: '1.5px solid #e2edf5' }} min={1} max={selectedBatch.available_quantity} />
                    <button onClick={() => setQuantity(q => Math.min(q + 10, selectedBatch.available_quantity))} className="w-10 h-10 rounded-xl flex items-center justify-center text-[16px] font-black transition-all active:scale-90" style={{ background: '#FFF7ED', border: '1.5px solid #FED7AA', color: '#b45309' }}>+</button>
                  </div>
                  <p className="text-[10px] text-[#a0b5c0] text-center mt-1">الحد الأقصى: {selectedBatch.available_quantity} طبلية — يُسمح بالتوريد الجزئي</p>
                </div>
              )}

              <div className="rounded-2xl p-3.5 flex items-start gap-3" style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
                <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-[#1e40af] leading-relaxed">
                  بعد موافقة المشتري ستظهر معلومات التواصل لتنسيق التسليم مباشرةً داخل المنصة.
                </p>
              </div>

              <button
                onClick={() => setPledged(!pledged)}
                className="w-full flex items-center gap-3 p-3.5 rounded-2xl text-right transition-all"
                style={{ background: pledged ? '#FFF7ED' : '#f8fbfd', border: pledged ? '2px solid #d97706' : '1.5px solid #e2edf5' }}
              >
                <div className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 transition-all" style={{ background: pledged ? '#d97706' : 'white', border: pledged ? '2px solid #d97706' : '2px solid #d1d5db' }}>
                  {pledged && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                </div>
                <p className="text-[11px] text-[#1a3a4a] leading-relaxed flex-1">
                  أتعهد بتوريد الكمية المحددة وسداد عمولة المنصة عند إتمام الصفقة
                </p>
              </button>

              {error && <p className="text-[12px] text-red-600 text-center font-semibold">{error}</p>}

              <button
                onClick={handleCreate}
                disabled={loading || !selectedBatchId}
                className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl text-[14px] font-black text-white transition-transform active:scale-[0.97] disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #b45309, #d97706)', boxShadow: '0 6px 20px rgba(180,83,9,0.3)' }}
              >
                {loading ? <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : <Truck className="w-5 h-5" />}
                {loading ? 'جاري إرسال عرض التوريد...' : !selectedBatchId ? 'اختر من مخزونك أولاً' : 'عرض توريد'}
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
  onLoginRequired?: () => void;
  autoOpenOffer?: boolean;
}

export default function DemandDetailSheet({ card, onClose, sessionPhone, onLoginRequired, autoOpenOffer }: Props) {
  const isAuthenticated = !!sessionPhone;
  const supplierPhone = sessionPhone ?? undefined;
  const [isFavorited, setIsFavorited] = useState(false);
  const [showRatingDialog, setShowRatingDialog] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [ratingSummary, setRatingSummary] = useState<{ average_rating: number; total_ratings: number } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showDealRequestDialog, setShowDealRequestDialog] = useState(false);
  const [existingDemandDeal, setExistingDemandDeal] = useState<{ id: string; status: string; deal_ref: string; created_at: string; quantity: number } | null>(null);
  const [dealCreated, setDealCreated] = useState(false);

  const isSelf = isAuthenticated && supplierPhone === card.phone;

  useEffect(() => { loadRatingSummary(); }, [card.phone]);
  useEffect(() => {
    if (isAuthenticated && supplierPhone && !isSelf) {
      loadExistingDemandDeal();
    }
  }, [isAuthenticated, supplierPhone, card.id]);

  useEffect(() => {
    if (autoOpenOffer && isAuthenticated && !isSelf) {
      const t = setTimeout(() => setShowDealRequestDialog(true), 300);
      return () => clearTimeout(t);
    }
  }, [autoOpenOffer, isAuthenticated, isSelf]);

  const loadRatingSummary = async () => {
    try {
      const { data } = await supabase.rpc('get_visitor_ratings_summary', { p_user_phone: card.phone });
      setRatingSummary(data);
    } catch {}
  };

  const loadExistingDemandDeal = async () => {
    if (!supplierPhone) return;
    try {
      const { data } = await supabase
        .from('deals')
        .select('id, deal_ref, status, quantity, created_at')
        .eq('supplier_phone', supplierPhone)
        .eq('order_id', card.id)
        .eq('source', 'demand_card')
        .not('status', 'eq', 'cancelled')
        .maybeSingle();
      setExistingDemandDeal(data);
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
    else setShowDealRequestDialog(true);
  };

  const handleLoginFromPrompt = () => {
    sessionStorage.setItem('pending_demand_offer', JSON.stringify({
      order_id: card.id,
      pallet_type: card.pallet_type,
      size: card.size,
      quality: card.quality,
      city: card.city,
      quantity: card.quantity,
    }));
    setShowLoginPrompt(false);
    onClose();
    onLoginRequired?.();
  };

  const handleDealCreated = () => {
    setDealCreated(true);
    setShowDealRequestDialog(false);
    loadExistingDemandDeal();
  };

  const getButtonState = () => {
    if (isSelf) return { label: 'طلبك الخاص', disabled: true, color: '#6b7280', bg: '#f3f4f6' };
    if (!isAuthenticated) return { label: 'عرض توريد', disabled: false, color: 'white', bg: 'linear-gradient(135deg, #b45309, #d97706)' };
    if (existingDemandDeal && existingDemandDeal.status !== 'cancelled') {
      if (existingDemandDeal.status === 'pending_buyer') return { label: 'عرضك بانتظار المشتري — عرض التفاصيل', disabled: false, color: 'white', bg: 'linear-gradient(135deg, #b45309, #d97706)' };
      if (existingDemandDeal.status === 'in_delivery') return { label: 'المشتري وافق — جاري التفاوض', disabled: false, color: 'white', bg: 'linear-gradient(135deg, #059669, #10b981)' };
      if (existingDemandDeal.status === 'completed') return { label: 'تمت الصفقة', disabled: true, color: '#6b7280', bg: '#f3f4f6' };
    }
    if (dealCreated) return { label: 'عرضك بانتظار المشتري — عرض التفاصيل', disabled: false, color: 'white', bg: 'linear-gradient(135deg, #b45309, #d97706)' };
    return { label: 'عرض توريد', disabled: false, color: 'white', bg: 'linear-gradient(135deg, #b45309, #d97706)' };
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

              {isAuthenticated && !isSelf && (existingDemandDeal || dealCreated) && existingDemandDeal?.status !== 'cancelled' && (
                <div className="rounded-2xl p-3.5 flex items-start gap-3" style={{ background: existingDemandDeal?.status === 'in_delivery' ? '#ECFDF5' : '#FFFBEB', border: `1px solid ${existingDemandDeal?.status === 'in_delivery' ? '#A7F3D0' : '#FDE68A'}` }} dir="rtl">
                  <Truck className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: existingDemandDeal?.status === 'in_delivery' ? '#059669' : '#b45309' }} />
                  <div>
                    <p className="text-[12px] font-black" style={{ color: existingDemandDeal?.status === 'in_delivery' ? '#059669' : '#b45309' }}>
                      {existingDemandDeal?.status === 'pending_buyer' && 'عرض توريدك مرسل — بانتظار موافقة المشتري'}
                      {existingDemandDeal?.status === 'in_delivery' && 'وافق المشتري! جاري التفاوض والتسليم'}
                      {existingDemandDeal?.status === 'completed' && 'تمت الصفقة بنجاح'}
                      {dealCreated && !existingDemandDeal && 'تم إرسال عرض توريدك'}
                    </p>
                    <p className="text-[10px] mt-0.5" style={{ color: existingDemandDeal?.status === 'in_delivery' ? '#065F46' : '#92400E' }}>تابع التفاصيل في حسابي ← صفقاتي</p>
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
            className="w-full relative overflow-hidden group mb-2 rounded-2xl disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <div className="absolute inset-0 rounded-2xl transition-transform duration-300 group-active:scale-95" style={{ background: btnState.bg, boxShadow: '0 6px 20px rgba(180,83,9,0.25)' }} />
            <div className="relative flex items-center justify-center gap-2.5 py-3.5">
              <Handshake className="w-5 h-5" style={{ color: btnState.color }} strokeWidth={2.5} />
              <span className="text-[15px] font-black" style={{ color: btnState.color }}>{btnState.label}</span>
              {!btnState.disabled && !dealCreated && (
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
      {showDealRequestDialog && (
        <SupplierDealRequestDialog card={card} supplierPhone={supplierPhone!} existingDeal={existingDemandDeal} onClose={() => setShowDealRequestDialog(false)} onCreated={handleDealCreated} />
      )}
    </div>
  );
}
