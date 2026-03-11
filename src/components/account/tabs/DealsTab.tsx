import { useState, useEffect, type ReactNode } from 'react';
import {
  Handshake,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Zap,
  MessageSquare,
  Clock,
  Check,
  X,
  Send,
  ShoppingBag,
  MapPin,
  AlertTriangle,
  Warehouse,
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAccountDeals } from '../../../hooks/useAccountDeals';
import { ActiveDealCard, CompletedDealCard, CancelledDealCard } from '../deals/DealCards';
import DealDetailSheet from '../deals/DealDetailSheet';
import RatingDialog from '../../deals/shared/RatingDialog';
import { ActionToast } from '../../shared/ActionToast';
import type { ToastConfig } from '../../shared/ActionToast';
import type { Deal } from '../../../types/deal';

type DealFilter = 'active' | 'completed' | 'cancelled';

interface PendingDemandOffer {
  order_id: string;
  pallet_type: string;
  size: string;
  quality: string;
  city: string;
  quantity: number;
}

interface Props {
  phone: string;
  pendingDemandOffer?: PendingDemandOffer | null;
  onPendingDemandOfferCleared?: () => void;
}

const FILTERS: { key: DealFilter; label: string; icon: typeof Handshake; color: string; activeColor: string }[] = [
  { key: 'active', label: 'النشطة', icon: Zap, color: '#B45309', activeColor: '#FFFBEB' },
  { key: 'completed', label: 'المكتملة', icon: CheckCircle2, color: '#059669', activeColor: '#ECFDF5' },
  { key: 'cancelled', label: 'الملغاة', icon: XCircle, color: '#dc2626', activeColor: '#FEF2F2' },
];

interface NegotiationRequest {
  id: string;
  inventory_batch_id: string;
  buyer_phone: string;
  pallet_type: string;
  size: string;
  quality: string;
  city: string;
  available_quantity: number;
  price_per_pallet: number;
  buyer_message?: string;
  status: string;
  created_at: string;
}

interface SentOffer {
  id: string;
  order_id: string;
  quantity: number;
  price_per_pallet: number;
  supplier_message: string | null;
  status: string;
  deal_id: string | null;
  created_at: string;
  pallet_type: string;
  city: string;
  quality: string;
}

function SupplierSentOffers({ phone }: { phone: string }) {
  const [offers, setOffers] = useState<SentOffer[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('supplier_demand_offers')
        .select(`
          id, order_id, quantity, price_per_pallet, supplier_message, status, deal_id, created_at,
          orders!inner(pallet_type, city, quality)
        `)
        .eq('supplier_phone', phone)
        .in('status', ['pending', 'accepted', 'deal_created', 'rejected'])
        .order('created_at', { ascending: false })
        .limit(20);

      if (data) {
        const mapped: SentOffer[] = data.map((row: any) => ({
          id: row.id,
          order_id: row.order_id,
          quantity: row.quantity,
          price_per_pallet: row.price_per_pallet,
          supplier_message: row.supplier_message,
          status: row.status,
          deal_id: row.deal_id,
          created_at: row.created_at,
          pallet_type: row.orders?.pallet_type || '',
          city: row.orders?.city || '',
          quality: row.orders?.quality || '',
        }));
        setOffers(mapped);
      }
    } catch {
      setOffers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel('sent_offers_' + phone)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'supplier_demand_offers', filter: `supplier_phone=eq.${phone}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [phone]);

  if (loading || offers.length === 0) return null;

  const statusMap: Record<string, { label: string; color: string; bg: string; border: string; icon: ReactNode }> = {
    pending: {
      label: 'قيد الانتظار',
      color: '#b45309', bg: '#FFFBEB', border: '#FDE68A',
      icon: <Clock className="w-3.5 h-3.5" />,
    },
    accepted: {
      label: 'قبله المشتري',
      color: '#059669', bg: '#ECFDF5', border: '#A7F3D0',
      icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    },
    deal_created: {
      label: 'تم إنشاء الصفقة',
      color: '#1d4ed8', bg: '#EFF6FF', border: '#BFDBFE',
      icon: <Handshake className="w-3.5 h-3.5" />,
    },
    rejected: {
      label: 'رفضه المشتري',
      color: '#dc2626', bg: '#FEF2F2', border: '#FECACA',
      icon: <XCircle className="w-3.5 h-3.5" />,
    },
  };

  const activeOffers = offers.filter(o => o.status === 'pending');
  const otherOffers = offers.filter(o => o.status !== 'pending');

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
        <h3 className="text-[13px] font-black text-[#1a3a4a]">عروضي المرسلة للمشترين</h3>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#EFF6FF', color: '#1d4ed8', border: '1px solid #BFDBFE' }}>
          {offers.length}
        </span>
      </div>

      {activeOffers.map(offer => {
        const st = statusMap[offer.status] || statusMap.pending;
        return (
          <div
            key={offer.id}
            className="rounded-2xl p-4"
            style={{ background: 'white', border: `1.5px solid ${st.border}`, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
          >
            <div className="flex items-start justify-between mb-3" dir="rtl">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl" style={{ background: st.bg, color: st.color }}>
                {st.icon}
                <span className="text-[11px] font-black">{st.label}</span>
              </div>
              <div className="text-right">
                <p className="text-[14px] font-black text-[#1a3a4a]">{offer.pallet_type}</p>
                <p className="text-[10px] text-[#7a9aab]">{offer.city}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap" dir="rtl">
              <span className="text-[11px] font-bold px-2 py-1 rounded-xl" style={{ background: '#f0f9f4', color: '#15803d' }}>
                {offer.quantity.toLocaleString()} طبلية
              </span>
              {offer.price_per_pallet > 0 && (
                <span className="text-[11px] font-bold px-2 py-1 rounded-xl" style={{ background: '#f0f9f4', color: '#15803d' }}>
                  {offer.price_per_pallet} ر.س / طبلية
                </span>
              )}
              <span className="text-[10px] text-[#a0b5c0]">
                {new Date(offer.created_at).toLocaleDateString('ar-SA', { day: 'numeric', month: 'short' })}
              </span>
            </div>
            {offer.status === 'pending' && (
              <div className="mt-3 rounded-xl p-2.5 flex items-center gap-2" style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }} dir="rtl">
                <Clock className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                <p className="text-[11px] text-[#92400E]">في انتظار رد المشتري — ستصلك إشعار فور ردّه</p>
              </div>
            )}
            {(offer.status === 'accepted' || offer.status === 'deal_created') && (
              <div className="mt-3 rounded-xl p-2.5 flex items-center gap-2" style={{ background: '#ECFDF5', border: '1px solid #A7F3D0' }} dir="rtl">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                <p className="text-[11px] text-[#065F46]">
                  {offer.status === 'deal_created' ? 'تمت الصفقة! تابعها في الصفقات النشطة أدناه' : 'وافق المشتري على عرضك'}
                </p>
              </div>
            )}
          </div>
        );
      })}

      {otherOffers.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer text-[11px] font-bold text-[#7a9aab] py-1 list-none flex items-center gap-1.5 select-none" dir="rtl">
            <span className="w-4 h-4 rounded-full bg-gray-100 flex items-center justify-center text-[8px] group-open:rotate-90 transition-transform">▶</span>
            {otherOffers.length} عرض سابق
          </summary>
          <div className="space-y-2 mt-2">
            {otherOffers.map(offer => {
              const st = statusMap[offer.status] || statusMap.rejected;
              return (
                <div
                  key={offer.id}
                  className="rounded-2xl p-3"
                  style={{ background: '#f8fbfd', border: '1px solid #e2edf5' }}
                >
                  <div className="flex items-center justify-between" dir="rtl">
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg" style={{ background: st.bg, color: st.color }}>
                      {st.icon}
                      <span className="text-[10px] font-bold">{st.label}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-[12px] font-bold text-[#1a3a4a]">{offer.pallet_type} — {offer.city}</p>
                      <p className="text-[10px] text-[#a0b5c0]">{offer.quantity} طبلية</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </details>
      )}

      <div className="h-px" style={{ background: '#e2edf5' }} />
    </div>
  );
}

function SupplierNegotiationRequests({ phone }: { phone: string }) {
  const [requests, setRequests] = useState<NegotiationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [responseText, setResponseText] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('negotiation_requests')
      .select('id, inventory_batch_id, buyer_phone, pallet_type, size, quality, city, available_quantity, price_per_pallet, buyer_message, status, created_at')
      .eq('supplier_phone', phone)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    setRequests(data || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel('supplier_negotiation_' + phone)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'negotiation_requests', filter: `supplier_phone=eq.${phone}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [phone]);

  const [acceptResult, setAcceptResult] = useState<{ dealRef: string; quantity: number } | null>(null);

  const handleAccept = async (req: NegotiationRequest) => {
    setActionId(req.id);
    try {
      const { data, error } = await supabase.rpc('accept_negotiation_and_create_deal', {
        p_request_id: req.id,
        p_supplier_phone: phone,
        p_supplier_response: responseText[req.id] || null,
        p_quantity: req.available_quantity,
      });
      if (error) throw error;
      if (data?.success) {
        setAcceptResult({ dealRef: data.deal_ref, quantity: data.quantity });
        setTimeout(() => setAcceptResult(null), 4000);
        load();
      }
    } finally {
      setActionId(null);
    }
  };

  const handleReject = async (req: NegotiationRequest) => {
    setActionId(req.id);
    try {
      const { error } = await supabase
        .from('negotiation_requests')
        .update({ status: 'rejected', supplier_response: responseText[req.id] || null, updated_at: new Date().toISOString() })
        .eq('id', req.id);
      if (!error) load();
    } finally {
      setActionId(null);
    }
  };

  if (loading) return null;
  if (requests.length === 0 && !acceptResult) return null;

  return (
    <div className="space-y-2">
      {acceptResult && (
        <div
          className="rounded-2xl p-4 flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300"
          style={{ background: '#ECFDF5', border: '1.5px solid #A7F3D0', boxShadow: '0 4px 12px rgba(5,150,105,0.12)' }}
          dir="rtl"
        >
          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-[13px] font-black text-green-700">تم إنشاء الصفقة بنجاح</p>
            <p className="text-[11px] text-green-600 mt-0.5">
              رقم الصفقة: {acceptResult.dealRef} — الكمية: {acceptResult.quantity} طبلية
            </p>
            <p className="text-[10px] text-green-500 mt-1">ستظهر في الصفقات النشطة أدناه</p>
          </div>
        </div>
      )}

      {requests.length > 0 && (
      <>
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
        <h3 className="text-[13px] font-black text-[#1a3a4a]">طلبات تفاوض واردة</h3>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#FFFBEB', color: '#b45309', border: '1px solid #FDE68A' }}>
          {requests.length}
        </span>
      </div>
      {requests.map(req => (
        <div
          key={req.id}
          className="rounded-2xl p-4 space-y-3"
          style={{ background: 'white', border: '1.5px solid #FDE68A', boxShadow: '0 2px 8px rgba(245,158,11,0.08)' }}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-[10px] text-[#a0b5c0]">
                {new Date(req.created_at).toLocaleDateString('ar-SA', { day: 'numeric', month: 'short' })}
              </span>
            </div>
            <div className="text-right">
              <p className="text-[14px] font-black text-[#1a3a4a]">{req.pallet_type}</p>
              <p className="text-[10px] text-[#7a9aab]">{req.city} — {req.size}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 justify-end flex-wrap">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#f0f9f4', color: '#15803d' }}>
              {req.available_quantity} طبلية
            </span>
            {req.price_per_pallet > 0 && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#f0f9f4', color: '#15803d' }}>
                {req.price_per_pallet} ر.س
              </span>
            )}
            <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: '#f0f4f8', color: '#4a7a8a' }}>
              {req.buyer_phone}
            </span>
          </div>

          {req.buyer_message && (
            <div className="rounded-xl p-2.5 text-right" style={{ background: '#f8fbfd', border: '1px solid #e2edf5' }}>
              <div className="flex items-center gap-1.5 mb-1">
                <MessageSquare className="w-3 h-3 text-[#7a9aab]" />
                <span className="text-[10px] font-bold text-[#7a9aab]">رسالة المشتري</span>
              </div>
              <p className="text-[12px] text-[#1a3a4a] leading-relaxed">{req.buyer_message}</p>
            </div>
          )}

          <textarea
            value={responseText[req.id] || ''}
            onChange={(e) => setResponseText(prev => ({ ...prev, [req.id]: e.target.value }))}
            placeholder="رد اختياري للمشتري..."
            rows={2}
            maxLength={200}
            dir="rtl"
            className="w-full rounded-xl px-3 py-2 text-[12px] text-[#1a3a4a] resize-none outline-none"
            style={{ background: '#f8fbfd', border: '1px solid #e2edf5' }}
          />

          <div className="flex gap-2">
            <button
              onClick={() => handleReject(req)}
              disabled={actionId === req.id}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[12px] font-bold text-[#dc2626] disabled:opacity-50"
              style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}
            >
              <X className="w-3.5 h-3.5" />
              رفض
            </button>
            <button
              onClick={() => handleAccept(req)}
              disabled={actionId === req.id}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[12px] font-black text-white disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #059669, #10b981)', boxShadow: '0 3px 10px rgba(5,150,105,0.25)' }}
            >
              {actionId === req.id ? (
                <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              قبول وبدء الصفقة
            </button>
          </div>
        </div>
      ))}
      <div className="h-px" style={{ background: '#e2edf5' }} />
      </>
      )}
    </div>
  );
}

interface InventoryBatch {
  id: string;
  batch_id: string;
  pallet_type: string;
  size: string;
  quality: string;
  city: string;
  available_quantity: number;
  price_per_pallet: number;
}

function InlinePendingOfferCard({ offer, supplierPhone, onClose, onSent }: {
  offer: PendingDemandOffer;
  supplierPhone: string;
  onClose: () => void;
  onSent: () => void;
}) {
  const [quantity, setQuantity] = useState(offer.quantity);
  const [price, setPrice] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [batches, setBatches] = useState<InventoryBatch[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(true);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);

  useEffect(() => {
    loadInventory();
  }, []);

  const loadInventory = async () => {
    setLoadingBatches(true);
    try {
      const { data } = await supabase.rpc('get_supplier_matching_inventory', {
        p_supplier_phone: supplierPhone,
        p_order_id: offer.order_id,
      });
      if (data?.success && data.batches) {
        setBatches(data.batches);
        if (data.batches.length === 1) {
          setSelectedBatchId(data.batches[0].id);
          setQuantity(Math.min(offer.quantity, data.batches[0].available_quantity));
          if (data.batches[0].price_per_pallet > 0) setPrice(data.batches[0].price_per_pallet);
        }
      }
    } catch { /* ignore */ }
    setLoadingBatches(false);
  };

  const selectedBatch = batches.find(b => b.id === selectedBatchId);

  const handleSelectBatch = (batch: InventoryBatch) => {
    setSelectedBatchId(batch.id);
    setQuantity(Math.min(offer.quantity, batch.available_quantity));
    if (batch.price_per_pallet > 0) setPrice(batch.price_per_pallet);
    setError('');
  };

  const handleSend = async () => {
    if (loading) return;
    if (!selectedBatchId) { setError('اختر دفعة من مخزونك أولاً'); return; }
    if (quantity < 1) { setError('الكمية يجب أن تكون 1 على الأقل'); return; }
    if (selectedBatch && quantity > selectedBatch.available_quantity) {
      setError('الكمية المتوفرة في هذه الدفعة ' + selectedBatch.available_quantity + ' فقط');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { data, error: err } = await supabase.rpc('create_supplier_offer_for_demand', {
        p_supplier_phone: supplierPhone,
        p_order_id: offer.order_id,
        p_quantity: quantity,
        p_price_per_pallet: price,
        p_supplier_message: null,
        p_inventory_batch_id: selectedBatchId,
      });
      if (err) throw err;
      if (data && !data.success) { setError(data.error || 'حدث خطأ'); return; }
      setSent(true);
      setTimeout(() => { onSent(); }, 2500);
    } catch {
      setError('حدث خطأ أثناء إرسال العرض. حاول مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)', border: '2px solid #A7F3D0', boxShadow: '0 4px 16px rgba(5,150,105,0.15)' }}
        dir="rtl"
      >
        <div className="px-5 py-6 flex flex-col items-center text-center gap-3">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.7)' }}>
            <CheckCircle2 className="w-7 h-7 text-green-600" />
          </div>
          <div>
            <p className="text-[15px] font-black text-green-800">تم إرسال عرضك بنجاح</p>
            <p className="text-[12px] text-green-600 mt-1">ستُشعَر عند رد المشتري — تابع هنا في صفقاتك</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: 'white', border: '2px solid #b45309', boxShadow: '0 4px 20px rgba(180,83,9,0.12), 0 1px 4px rgba(0,0,0,0.06)' }}
      dir="rtl"
    >
      <div className="px-4 py-3 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #b45309, #d97706)' }}>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-lg flex items-center justify-center bg-white/20 hover:bg-white/30 transition-colors"
        >
          <X className="w-3.5 h-3.5 text-white" />
        </button>
        <div className="flex items-center gap-2">
          <div>
            <p className="text-[14px] font-black text-white">تقديم عرضك للمشتري</p>
            <p className="text-[11px] text-white/70">{offer.pallet_type} — {offer.city}</p>
          </div>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/20">
            <Handshake className="w-5 h-5 text-white" />
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 pb-5 space-y-3.5">
        {loadingBatches ? (
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <div className="w-7 h-7 rounded-full border-2 border-amber-200 border-t-amber-600 animate-spin" />
            <p className="text-[12px] text-[#7a9aab]">جاري تحميل مخزونك...</p>
          </div>
        ) : batches.length === 0 ? (
          <div className="space-y-3">
            <div className="rounded-2xl p-4 text-center" style={{ background: '#FEF2F2', border: '1.5px solid #FECACA' }}>
              <div className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center" style={{ background: 'rgba(220,38,38,0.1)' }}>
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
              <p className="text-[13px] font-black text-[#991B1B] mb-1.5">لا يوجد مخزون {offer.pallet_type} مسجّل</p>
              <p className="text-[11px] text-[#B91C1C] leading-relaxed">
                المشتري يطلب <span className="font-black">{offer.pallet_type}</span>. يجب أن يكون لديك مخزون من نفس النوع لتقديم عرض.
              </p>
            </div>
            <div className="rounded-xl p-3 flex items-start gap-2.5" style={{ background: '#FFF7ED', border: '1px solid #FED7AA' }}>
              <Warehouse className="w-3.5 h-3.5 text-[#b45309] flex-shrink-0 mt-0.5" />
              <p className="text-[11px] text-[#92400E] leading-relaxed">
                سجّل مخزون <span className="font-black">{offer.pallet_type}</span> في مستودعك السحابي أولاً ثم عُد لتقديم عرضك.
              </p>
            </div>
            <button onClick={onClose} className="w-full py-2.5 rounded-xl text-[12px] font-bold text-[#4a6a7e]" style={{ background: '#f0f6fa', border: '1px solid #e2edf5' }}>
              إغلاق
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl p-2.5 text-center" style={{ background: '#FFF7ED', border: '1px solid #FED7AA' }}>
                <p className="text-[9px] text-amber-600 mb-0.5">النوع</p>
                <p className="text-[11px] font-black text-[#1a3a4a]">{offer.pallet_type}</p>
              </div>
              <div className="rounded-xl p-2.5 text-center" style={{ background: '#FFF7ED', border: '1px solid #FED7AA' }}>
                <div className="flex items-center justify-center gap-1">
                  <MapPin className="w-3 h-3 text-amber-600" />
                  <p className="text-[11px] font-black text-[#1a3a4a]">{offer.city}</p>
                </div>
              </div>
              <div className="rounded-xl p-2.5 text-center" style={{ background: '#FFF7ED', border: '1px solid #FED7AA' }}>
                <div className="flex items-center justify-center gap-1">
                  <ShoppingBag className="w-3 h-3 text-amber-600" />
                  <p className="text-[11px] font-black text-[#1a3a4a]">{offer.quantity}</p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[12px] font-bold text-[#1a3a4a] mb-2">
                <Warehouse className="w-3.5 h-3.5 inline-block ml-1" />
                اختر من مخزونك ({offer.pallet_type})
              </label>
              <div className="space-y-2 max-h-[160px] overflow-y-auto">
                {batches.map((batch) => {
                  const isExact = batch.quality === offer.quality && batch.city === offer.city;
                  const selected = selectedBatchId === batch.id;
                  return (
                    <button
                      key={batch.id}
                      onClick={() => handleSelectBatch(batch)}
                      className="w-full rounded-xl p-2.5 text-right transition-all"
                      style={{
                        background: selected ? '#FFF7ED' : '#f8fbfd',
                        border: selected ? '2px solid #d97706' : '1.5px solid #e2edf5',
                        boxShadow: selected ? '0 2px 8px rgba(217,119,6,0.15)' : 'none',
                      }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          {isExact && (
                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded-lg" style={{ background: '#dcfce7', color: '#15803d' }}>
                              تطابق تام
                            </span>
                          )}
                          <span className="text-[10px] text-[#a0b5c0]">{batch.batch_id}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[12px] font-black text-[#1a3a4a]">{batch.pallet_type}</span>
                          {selected && (
                            <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ background: '#d97706' }}>
                              <Check className="w-2.5 h-2.5 text-white" />
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between flex-wrap gap-1">
                        <span className="text-[10px] text-[#7a9aab]">{batch.city} — {batch.quality}</span>
                        <span className="text-[11px] font-bold" style={{ color: '#0d7c66' }}>{batch.available_quantity} متوفرة</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {selectedBatch && (
              <>
                <div>
                  <label className="block text-[12px] font-bold text-[#1a3a4a] mb-1.5">الكمية التي يمكنك توريدها</label>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setQuantity(q => Math.max(1, q - 10))} className="w-9 h-9 rounded-xl flex items-center justify-center text-[15px] font-black transition-all active:scale-90" style={{ background: '#FFF7ED', border: '1.5px solid #FED7AA', color: '#b45309' }}>-</button>
                    <input type="number" value={quantity} onChange={(e) => { const v = parseInt(e.target.value) || 0; setQuantity(Math.max(1, Math.min(v, selectedBatch.available_quantity))); }} className="flex-1 text-center text-[15px] font-black text-[#1a3a4a] rounded-xl py-2 outline-none" style={{ background: '#f8fbfd', border: '1.5px solid #e2edf5' }} min={1} max={selectedBatch.available_quantity} />
                    <button onClick={() => setQuantity(q => Math.min(q + 10, selectedBatch.available_quantity))} className="w-9 h-9 rounded-xl flex items-center justify-center text-[15px] font-black transition-all active:scale-90" style={{ background: '#FFF7ED', border: '1.5px solid #FED7AA', color: '#b45309' }}>+</button>
                  </div>
                  <p className="text-[10px] text-[#a0b5c0] text-center mt-1">الحد الأقصى: {selectedBatch.available_quantity} طبلية</p>
                </div>

                <div>
                  <label className="block text-[12px] font-bold text-[#1a3a4a] mb-1.5">السعر المقترح للطبلية (ريال) — اختياري</label>
                  <input
                    type="number"
                    value={price || ''}
                    onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                    placeholder="0 — اتركه فارغاً للتفاوض"
                    className="w-full rounded-xl px-3.5 py-2.5 text-[13px] text-[#1a3a4a] outline-none"
                    style={{ background: '#f8fbfd', border: '1.5px solid #e2edf5' }}
                  />
                </div>

              </>
            )}

            {error && <p className="text-[12px] text-red-600 text-center font-semibold">{error}</p>}

            <div className="flex gap-2">
              <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-[12px] font-bold text-[#4a6a7e] flex-shrink-0" style={{ background: '#f0f6fa', border: '1px solid #e2edf5' }}>
                لاحقاً
              </button>
              <button
                onClick={handleSend}
                disabled={loading || !selectedBatchId}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-black text-white transition-transform active:scale-[0.97] disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #b45309, #d97706)', boxShadow: '0 4px 14px rgba(180,83,9,0.3)' }}
              >
                {loading ? <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : <Send className="w-4 h-4" />}
                {loading ? 'جاري الإرسال...' : !selectedBatchId ? 'اختر من مخزونك أولاً' : 'إرسال العرض'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function DealsTab({ phone, pendingDemandOffer, onPendingDemandOfferCleared }: Props) {
  const {
    activeDeals, completedDeals, cancelledDeals,
    loading, actionLoading,
    getCounterparty, isBuyer,
    supplierConfirm, buyerConfirm, buyerConfirmWithDeadline,
    startDelivery, confirmDelivery, failDelivery, cancelDeal,
    refresh,
  } = useAccountDeals(phone);

  const [filter, setFilter] = useState<DealFilter>('active');
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [toast, setToast] = useState<ToastConfig | null>(null);
  const [showPendingOfferDialog, setShowPendingOfferDialog] = useState(!!pendingDemandOffer);
  const [ratingDialog, setRatingDialog] = useState<{
    dealId: string; ratedPhone: string; ratedName: string; userType: 'supplier' | 'buyer';
  } | null>(null);

  useEffect(() => {
    if (pendingDemandOffer) {
      setShowPendingOfferDialog(true);
    }
  }, [pendingDemandOffer]);

  const counts = {
    active: activeDeals.length,
    completed: completedDeals.length,
    cancelled: cancelledDeals.length,
  };
  const totalDeals = counts.active + counts.completed + counts.cancelled;

  const currentDeals = filter === 'active' ? activeDeals
    : filter === 'completed' ? completedDeals
    : cancelledDeals;

  const handleAction = async (
    action: (id: string) => Promise<{ success: boolean; error?: string }>,
    dealId: string,
    successMsg: { title: string; message: string },
  ) => {
    const result = await action(dealId);
    if (result.success) {
      setToast({ ...successMsg, variant: 'success' });
      setSelectedDeal(null);
    }
    return result;
  };

  const handleBuyerConfirmDeadline = async (dealId: string, hours: number) => {
    const result = await buyerConfirmWithDeadline(dealId, hours);
    if (result.success) {
      setToast({ title: 'تم تأكيد الشراء', message: `بدأ مؤقت ${hours} ساعة — تواصل مع المورد عبر واتساب`, variant: 'success' });
      setSelectedDeal(null);
    }
    return result;
  };

  const handleRate = (deal: Deal) => {
    const buyer = isBuyer(deal);
    const cp = getCounterparty(deal);
    const ratedName = cp?.company_name || cp?.display_name || (buyer ? 'المورد' : 'المشتري');
    setRatingDialog({
      dealId: deal.id,
      ratedPhone: buyer ? deal.supplier_phone : deal.buyer_phone,
      ratedName,
      userType: buyer ? 'supplier' : 'buyer',
    });
  };

  return (
    <div className="space-y-3" dir="rtl">
      {toast && (
        <ActionToast
          title={toast.title}
          message={toast.message}
          variant={toast.variant}
          onClose={() => setToast(null)}
        />
      )}

      {showPendingOfferDialog && pendingDemandOffer && (
        <InlinePendingOfferCard
          offer={pendingDemandOffer}
          supplierPhone={phone}
          onClose={() => {
            setShowPendingOfferDialog(false);
            onPendingDemandOfferCleared?.();
          }}
          onSent={() => {
            setShowPendingOfferDialog(false);
            onPendingDemandOfferCleared?.();
            setToast({ title: 'تم إرسال العرض', message: 'ستُشعَر فور رد المشتري — تابع هنا في صفقاتك', variant: 'success' });
            refresh();
          }}
        />
      )}

      <SupplierSentOffers phone={phone} />

      <SupplierNegotiationRequests phone={phone} />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-[#7a9aab]">{totalDeals} صفقة</span>
          <button
            onClick={refresh}
            className={`w-7 h-7 rounded-lg bg-white/80 border border-[#e2edf5] flex items-center justify-center ${loading ? 'animate-spin' : ''}`}
          >
            <RefreshCw className="w-3 h-3 text-[#7a9aab]" />
          </button>
        </div>
      </div>

      <div
        className="flex gap-1 p-1 rounded-2xl"
        style={{ background: 'rgba(255,255,255,0.7)', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', border: '1px solid rgba(255,255,255,0.9)' }}
      >
        {FILTERS.map(f => {
          const Icon = f.icon;
          const isActive = filter === f.key;
          const count = counts[f.key];
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[11px] font-bold transition-all ${
                isActive
                  ? 'text-white shadow-lg'
                  : 'text-[#5a7a8a] hover:text-[#1a4a5e] hover:bg-white/50'
              }`}
              style={isActive ? {
                background: 'linear-gradient(135deg, #1a4a5e 0%, #2c6f8a 100%)',
                boxShadow: '0 4px 12px rgba(26,74,94,0.3)',
              } : undefined}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{f.label}</span>
              {count > 0 && (
                <span
                  className="text-[9px] font-black w-4.5 h-4.5 min-w-[18px] rounded-full flex items-center justify-center"
                  style={{
                    background: isActive ? 'rgba(255,255,255,0.25)' : f.key === 'active' ? '#F59E0B' : '#e2ecf3',
                    color: isActive ? 'white' : f.key === 'active' ? 'white' : '#2c5f7c',
                  }}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white/60 rounded-2xl p-5 animate-pulse">
              <div className="h-3 bg-gray-200 rounded w-1/3 mb-3" />
              <div className="space-y-2">
                <div className="h-2.5 bg-gray-200 rounded w-2/3" />
                <div className="h-2.5 bg-gray-200 rounded w-1/2" />
                <div className="h-2.5 bg-gray-200 rounded w-3/4" />
              </div>
              <div className="h-10 bg-gray-200 rounded-xl mt-3" />
            </div>
          ))}
        </div>
      ) : currentDeals.length === 0 ? (
        <EmptyDeals filter={filter} />
      ) : (
        <div className="space-y-3">
          {currentDeals.map(deal => {
            const buyer = isBuyer(deal);
            const cp = getCounterparty(deal);

            if (filter === 'active') {
              return (
                <ActiveDealCard
                  key={deal.id}
                  deal={deal}
                  isBuyer={buyer}
                  counterparty={cp}
                  onViewDetail={setSelectedDeal}
                />
              );
            }
            if (filter === 'completed') {
              return (
                <CompletedDealCard
                  key={deal.id}
                  deal={deal}
                  isBuyer={buyer}
                  counterparty={cp}
                  onViewDetail={setSelectedDeal}
                />
              );
            }
            return (
              <CancelledDealCard
                key={deal.id}
                deal={deal}
                isBuyer={buyer}
                counterparty={cp}
                onViewDetail={setSelectedDeal}
              />
            );
          })}
        </div>
      )}

      {selectedDeal && (
        <DealDetailSheet
          deal={selectedDeal}
          isBuyer={isBuyer(selectedDeal)}
          counterparty={getCounterparty(selectedDeal)}
          actionLoading={actionLoading}
          onClose={() => setSelectedDeal(null)}
          onSupplierConfirm={(id) => handleAction(supplierConfirm, id, { title: 'تم اعتماد الصفقة', message: 'في انتظار تأكيد المشتري واختيار المهلة' })}
          onBuyerConfirm={(id) => handleAction(buyerConfirm, id, { title: 'تم تأكيد الشراء', message: 'سيتواصل معك المورد لإتمام التسليم' })}
          onBuyerConfirmWithDeadline={handleBuyerConfirmDeadline}
          onStartDelivery={(id) => handleAction(startDelivery, id, { title: 'تم بدء التسليم', message: 'تواصل مع المشتري عبر واتساب لتنسيق الاستلام' })}
          onConfirmDelivery={(id) => handleAction(confirmDelivery, id, { title: 'تم تأكيد التسليم', message: 'الصفقة مكتملة — شكرا لتعاملك مع منصة العاديات' })}
          onFailDelivery={(id) => handleAction(failDelivery, id, { title: 'تم تسجيل فشل التسليم', message: 'تم إلغاء الصفقة وإعادة المخزون' })}
          onCancelDeal={(id) => handleAction(cancelDeal, id, { title: 'تم إلغاء الصفقة', message: 'تم إعادة المخزون كما كان' })}
          onRate={handleRate}
        />
      )}

      {ratingDialog && (
        <RatingDialog
          isOpen={true}
          onClose={() => setRatingDialog(null)}
          dealId={ratingDialog.dealId}
          raterPhone={phone}
          ratedUserPhone={ratingDialog.ratedPhone}
          ratedUserName={ratingDialog.ratedName}
          userType={ratingDialog.userType}
          onRatingSubmitted={refresh}
        />
      )}
    </div>
  );
}

function EmptyDeals({ filter }: { filter: DealFilter }) {
  const config = {
    active: {
      title: 'لا توجد صفقات نشطة',
      desc: 'عند إنشاء صفقات جديدة بعد المطابقة بين الطلبات والمخزون ستظهر هنا',
      color: '#B45309',
      bgFrom: '#FFFBEB',
      border: '#FDE68A',
      icon: Zap,
    },
    completed: {
      title: 'لا توجد صفقات مكتملة',
      desc: 'الصفقات التي تم إتمامها بنجاح وتسليم الطبليات ستظهر هنا',
      color: '#059669',
      bgFrom: '#ECFDF5',
      border: '#A7F3D0',
      icon: CheckCircle2,
    },
    cancelled: {
      title: 'لا توجد صفقات ملغاة',
      desc: 'الصفقات التي تم إلغاؤها ستظهر هنا مع سبب الإلغاء',
      color: '#6b7280',
      bgFrom: '#f3f4f6',
      border: '#e5e7eb',
      icon: XCircle,
    },
  };

  const c = config[filter];
  const Icon = c.icon;

  return (
    <div
      className="rounded-2xl p-8 text-center"
      style={{ background: `linear-gradient(135deg, rgba(255,255,255,0.8) 0%, ${c.bgFrom}80 100%)`, border: `2px dashed ${c.border}` }}
    >
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
        style={{ background: c.bgFrom }}
      >
        <Icon className="w-7 h-7" style={{ color: c.color }} />
      </div>
      <h3 className="text-[15px] font-bold text-[#1a3a4a] mb-1.5">{c.title}</h3>
      <p className="text-[12px] text-[#7a9aab] leading-relaxed max-w-[260px] mx-auto">{c.desc}</p>
    </div>
  );
}
