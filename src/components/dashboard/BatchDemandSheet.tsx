import { useState, useEffect } from 'react';
import { X, Users, MapPin, Clock, Package2, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { DashboardBatch } from '../../hooks/useDashboard';

interface MatchingOrder {
  id: string;
  request_id: string;
  quantity: number;
  quality: string;
  city: string;
  status: string;
  created_at: string;
  accept_close_quality: boolean;
  accept_close_city: boolean;
  accept_partial_delivery: boolean;
  phone: string;
}

interface Props {
  batch: DashboardBatch;
  supplierPhone: string;
  onClose: () => void;
  onDealCreated: () => void;
  onOpenDeals?: () => void;
}

const QUALITY_LABELS: Record<string, string> = {
  A: 'ممتازة', B: 'جيدة', C: 'خفيفة', Scrap: 'تدوير',
};

const QUALITY_ORDER: Record<string, number> = { A: 4, B: 3, C: 2, Scrap: 1 };

function isQualityClose(bq: string, rq: string): boolean {
  return Math.abs((QUALITY_ORDER[bq] ?? 0) - (QUALITY_ORDER[rq] ?? 0)) <= 1;
}

function calculatePrice(palletType: string, quality: string, size: string, quantity: number): number {
  const base: Record<string, number> = { 'خشبية': 45, 'بلاستيكية': 65, 'إعادة تدوير': 20 };
  const qm: Record<string, number> = { A: 1.4, B: 1.0, C: 0.75, Scrap: 0.35 };
  const sm: Record<string, number> = { '120×100': 1.0, '110×110': 1.05, '120×80': 0.85, '80×60': 0.7, 'أخرى': 0.9 };
  const vol = quantity >= 2000 ? 0.92 : quantity >= 1000 ? 0.96 : 1.0;
  return Math.round((base[palletType] ?? 45) * (qm[quality] ?? 1.0) * (sm[size] ?? 1.0) * vol);
}

export default function BatchDemandSheet({ batch, supplierPhone, onClose, onDealCreated, onOpenDeals }: Props) {
  const [orders, setOrders] = useState<MatchingOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const fetchDemand = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('orders')
        .select('id, request_id, quantity, quality, city, status, created_at, accept_close_quality, accept_close_city, accept_partial_delivery, phone')
        .eq('pallet_type', batch.pallet_type)
        .eq('size', batch.size)
        .in('status', ['pending', 'unmatched'])
        .order('created_at', { ascending: false });

      if (data) {
        const filtered = data.filter((o) => {
          const qualityExact = o.quality === batch.quality;
          const qualityClose = isQualityClose(batch.quality, o.quality);
          const cityMatch = o.city === batch.city || o.accept_close_city;
          return (qualityExact || qualityClose) && cityMatch;
        });
        setOrders(filtered);
      }
      setLoading(false);
    };
    fetchDemand();
  }, [batch.id]);

  const handleApprove = async (order: MatchingOrder) => {
    setApprovingId(order.id);
    setErrorMsg(null);

    const matchedQty = order.accept_partial_delivery
      ? Math.min(order.quantity, batch.available_quantity)
      : batch.available_quantity >= order.quantity
      ? order.quantity
      : null;

    if (!matchedQty || matchedQty <= 0) {
      setErrorMsg('الكمية المتاحة غير كافية لتنفيذ هذا الطلب');
      setApprovingId(null);
      return;
    }

    const pricePerUnit = calculatePrice(batch.pallet_type, batch.quality, batch.size, matchedQty);

    const { data, error } = await supabase.rpc('create_deal_with_reservation', {
      p_order_id: order.id,
      p_inventory_batch_id: batch.id,
      p_buyer_phone: order.phone,
      p_supplier_phone: supplierPhone,
      p_pallet_type: batch.pallet_type,
      p_size: batch.size,
      p_quality: batch.quality,
      p_city: batch.city,
      p_quantity: matchedQty,
      p_final_price: pricePerUnit,
      p_request_id: order.request_id,
    });

    if (error || !data?.success) {
      setErrorMsg('حدث خطأ أثناء إنشاء الصفقة، حاول مجدداً');
      setApprovingId(null);
      return;
    }

    await supabase
      .from('orders')
      .update({ status: 'matched', matched_quantity: matchedQty, matched_price: pricePerUnit, updated_at: new Date().toISOString() })
      .eq('id', order.id);

    setSuccessId(order.id);
    setApprovingId(null);

    setTimeout(() => {
      onDealCreated();
      if (onOpenDeals) onOpenDeals();
    }, 1200);
  };

  const totalDemand = orders.reduce((s, o) => s + o.quantity, 0);

  const formatDate = (iso: string) =>
    new Intl.DateTimeFormat('ar-SA', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso));

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end lg:items-center justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div
        className="relative w-full lg:w-[600px] bg-white rounded-t-3xl lg:rounded-3xl shadow-2xl overflow-hidden"
        style={{ maxHeight: '88vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ background: '#1a4a5e' }}
        >
          <div className="flex items-center gap-2">
            {!loading && (
              <span className="text-[11px] font-bold bg-white/20 text-white px-2 py-0.5 rounded-full">
                {orders.length} طلب
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right">
              <p className="text-[13px] font-bold text-white">رؤية الطلب</p>
              <p className="text-[10px] text-white/60">{batch.pallet_type} – {batch.size} – {batch.city}</p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto" style={{ maxHeight: 'calc(88vh - 70px)' }}>
          {!loading && orders.length > 0 && (
            <div
              className="mx-4 mt-4 rounded-2xl p-3 flex items-center justify-between"
              style={{ background: '#EBF5FF', border: '1px solid #BFDBFE' }}
            >
              <span className="text-[12px] font-bold text-[#1D4ED8]">
                {totalDemand.toLocaleString('ar-SA')} طبلية
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-[#1D4ED8]">إجمالي الطلب على هذا المخزون</span>
                <Users className="w-3.5 h-3.5 text-[#2196F3]" />
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="mx-4 mt-3 rounded-xl px-3 py-2.5 flex items-center gap-2 bg-red-50 border border-red-100">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <span className="text-[12px] text-red-500 font-medium">{errorMsg}</span>
            </div>
          )}

          <div className="px-4 py-4 space-y-3 pb-8">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : orders.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-12">
                <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-dashed border-gray-200 flex items-center justify-center">
                  <AlertCircle className="w-7 h-7 text-gray-300" />
                </div>
                <p className="text-[13px] font-bold text-[#a0b5c0]">لا توجد طلبات مطابقة</p>
                <p className="text-[11px] text-[#c0d0da] text-center px-6">
                  لا يوجد حالياً طلبات شراء تطابق مواصفات هذه الدفعة
                </p>
              </div>
            ) : (
              orders.map((order) => {
                const isApproving = approvingId === order.id;
                const isDone = successId === order.id;
                const canCover = batch.available_quantity >= order.quantity;
                const partialCoverage = !canCover && order.accept_partial_delivery;
                const coveragePercent = Math.round((batch.available_quantity / order.quantity) * 100);
                const isExact = order.quality === batch.quality;

                return (
                  <div
                    key={order.id}
                    className="bg-white rounded-2xl border shadow-sm overflow-hidden"
                    style={{ borderColor: isDone ? '#BBF7D0' : '#F3F4F6' }}
                  >
                    {isDone && (
                      <div className="flex items-center justify-center gap-2 py-2.5 bg-[#F0FDF4]">
                        <CheckCircle2 className="w-4 h-4 text-[#22C55E]" />
                        <span className="text-[12px] font-bold text-[#16A34A]">تم إنشاء الصفقة بنجاح</span>
                      </div>
                    )}

                    <div className="px-4 py-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="text-left">
                          <span
                            className="text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                            style={{
                              background: order.status === 'pending' ? '#FFFBEB' : '#ECFDF5',
                              color: order.status === 'pending' ? '#B45309' : '#059669',
                            }}
                          >
                            {order.status === 'pending' ? 'انتظار' : 'ينتظر مورد'}
                          </span>
                        </div>
                        <div className="text-right flex-1">
                          <div className="flex items-center justify-end gap-2 mb-1">
                            <span className="text-[12px] font-bold text-[#1a4a5e]">
                              {order.quantity.toLocaleString('ar-SA')} طبلية
                            </span>
                            <span
                              className="text-[10px] px-1.5 py-0.5 rounded-md font-medium"
                              style={{ background: '#F3F4F6', color: '#374151' }}
                            >
                              {QUALITY_LABELS[order.quality] ?? order.quality}
                            </span>
                          </div>
                          <div className="flex items-center justify-end gap-3">
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-[#7a9aab]">{order.city}</span>
                              <MapPin className="w-2.5 h-2.5 text-[#a0b5c0]" />
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-[#7a9aab]">{formatDate(order.created_at)}</span>
                              <Clock className="w-2.5 h-2.5 text-[#a0b5c0]" />
                            </div>
                          </div>
                        </div>
                      </div>

                      {(order.accept_close_quality || order.accept_close_city || order.accept_partial_delivery) && (
                        <div className="mt-2 flex flex-wrap gap-1 justify-end">
                          {order.accept_close_quality && (
                            <span className="text-[9px] bg-[#EFF6FF] text-[#2563EB] px-1.5 py-0.5 rounded-full">جودة قريبة</span>
                          )}
                          {order.accept_close_city && (
                            <span className="text-[9px] bg-[#EFF6FF] text-[#2563EB] px-1.5 py-0.5 rounded-full">مدينة قريبة</span>
                          )}
                          {order.accept_partial_delivery && (
                            <span className="text-[9px] bg-[#EFF6FF] text-[#2563EB] px-1.5 py-0.5 rounded-full">تسليم جزئي</span>
                          )}
                        </div>
                      )}

                      <div className="mt-2 pt-2 border-t border-gray-50 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          {isExact ? (
                            <span className="text-[9px] text-[#22C55E] font-bold bg-[#F0FDF4] px-1.5 py-0.5 rounded-full">جودة مطابقة</span>
                          ) : (
                            <span className="text-[9px] text-[#F59E0B] font-bold bg-[#FFFBEB] px-1.5 py-0.5 rounded-full">جودة قريبة ({order.quality}←{batch.quality})</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <Package2 className="w-2.5 h-2.5 text-[#a0b5c0]" />
                          <span className="text-[9px] text-[#a0b5c0] font-mono">{order.request_id}</span>
                        </div>
                      </div>
                      <div className="mt-1 flex justify-end">
                        {canCover ? (
                          <span className="text-[9px] text-[#22C55E] font-bold">متاح للتغطية الكاملة</span>
                        ) : partialCoverage ? (
                          <span className="text-[9px] text-[#F59E0B] font-bold">يغطي {coveragePercent}% – التسليم الجزئي مقبول</span>
                        ) : (
                          <span className="text-[9px] text-red-400 font-bold">الكمية غير كافية ({coveragePercent}%)</span>
                        )}
                      </div>

                      {!isDone && (canCover || partialCoverage) && (
                        <button
                          disabled={isApproving}
                          onClick={() => handleApprove(order)}
                          className="mt-3 w-full py-2.5 rounded-xl text-[13px] font-bold text-white flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-60"
                          style={{ background: '#1a4a5e' }}
                        >
                          {isApproving ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>جاري إنشاء الصفقة...</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-4 h-4" />
                              <span>الموافقة على تنفيذ الطلب</span>
                            </>
                          )}
                        </button>
                      )}

                      {!isDone && !canCover && !partialCoverage && (
                        <div className="mt-3 w-full py-2 rounded-xl text-[12px] font-medium text-center text-gray-400 bg-gray-50 border border-dashed border-gray-200">
                          الكمية المتاحة لا تكفي لتنفيذ هذا الطلب
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
