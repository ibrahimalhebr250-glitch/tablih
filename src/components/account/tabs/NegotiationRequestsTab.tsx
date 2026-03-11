import { useState } from 'react';
import { MessageSquare, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import type { NegotiationRequest } from '../../../hooks/useAccountData';

interface Props {
  requests: NegotiationRequest[];
  getCounterpartyName: (phone: string) => string;
  onAccept: (requestId: string, batchId: string, quantity: number, buyerPhone: string) => Promise<{ success: boolean; error?: string }>;
  onReject: (requestId: string) => Promise<{ success: boolean; error?: string }>;
  loading: boolean;
}

function RequestCard({ request, buyerName, onAccept, onReject }: {
  request: NegotiationRequest;
  buyerName: string;
  onAccept: () => void;
  onReject: () => void;
}) {
  const [actionLoading, setActionLoading] = useState<'accept' | 'reject' | null>(null);

  const handleAccept = async () => {
    setActionLoading('accept');
    await onAccept();
    setActionLoading(null);
  };

  const handleReject = async () => {
    setActionLoading('reject');
    await onReject();
    setActionLoading(null);
  };

  return (
    <div className="bg-white rounded-2xl border-2 border-blue-100 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5" style={{ background: 'linear-gradient(135deg, #1e40af, #2563eb)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <span className="text-[10px] font-mono text-white/60">
          {new Date(request.created_at).toLocaleDateString('ar-SA', { day: 'numeric', month: 'short' })}
        </span>
        <div className="flex items-center gap-1.5">
          <MessageSquare className="w-3 h-3 text-blue-200" />
          <span className="text-[10px] font-bold text-white">طلب تفاوض جديد</span>
        </div>
      </div>

      <div className="mx-4 mt-3.5 flex items-start gap-2.5 rounded-xl px-3 py-2.5" style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }} dir="rtl">
        <MessageSquare className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-[12px] font-black text-blue-800">{buyerName}</p>
          <p className="text-[11px] text-blue-600 mt-0.5">مهتم بمخزونك — راجع التفاصيل واقبل أو ارفض</p>
        </div>
      </div>

      <div className="p-4 space-y-2" dir="rtl">
        {request.pallet_type && (
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-bold text-[#1a2f3e]">{request.pallet_type}</span>
            <span className="text-[11px] text-[#7a9aab]">نوع الطبلية</span>
          </div>
        )}
        {request.size && (
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-bold text-[#1a2f3e]">{request.size}{request.quality ? ` · درجة ${request.quality}` : ''}</span>
            <span className="text-[11px] text-[#7a9aab]">المقاس والجودة</span>
          </div>
        )}
        {request.city && (
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-bold text-[#1a2f3e]">{request.city}</span>
            <span className="text-[11px] text-[#7a9aab]">المدينة</span>
          </div>
        )}
        {request.batch_id && (
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-[#7a9aab]">{request.batch_id}</span>
            <span className="text-[11px] text-[#7a9aab]">رقم الدفعة</span>
          </div>
        )}

        <div className="border-t border-[#f0f6fa] pt-2.5">
          <div className="flex items-center justify-between bg-blue-50 rounded-xl px-3 py-2">
            <span className="text-[15px] font-black text-blue-800">{request.requested_quantity.toLocaleString()} طبلية</span>
            <span className="text-[11px] text-blue-600">الكمية المطلوبة</span>
          </div>
        </div>

        {request.offer_price_per_pallet && (
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-bold text-amber-700">{request.offer_price_per_pallet.toLocaleString()} ر.س / طبلية</span>
            <span className="text-[11px] text-[#7a9aab]">السعر المقترح</span>
          </div>
        )}
      </div>

      <div className="px-4 pb-4 grid grid-cols-2 gap-2">
        <button
          disabled={actionLoading !== null}
          onClick={handleReject}
          className="py-3 rounded-xl text-[12px] font-bold flex items-center justify-center gap-1.5 active:scale-[0.97] transition-transform disabled:opacity-50"
          style={{ background: '#FEF2F2', color: '#dc2626', border: '1.5px solid #FECACA' }}
        >
          {actionLoading === 'reject' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
          رفض
        </button>
        <button
          disabled={actionLoading !== null}
          onClick={handleAccept}
          className="py-3 rounded-xl text-[12px] font-bold text-white flex items-center justify-center gap-1.5 active:scale-[0.97] transition-transform disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #1e40af, #2563eb)', boxShadow: '0 4px 14px rgba(37,99,235,0.3)' }}
        >
          {actionLoading === 'accept' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
          قبول الصفقة
        </button>
      </div>
    </div>
  );
}

export default function NegotiationRequestsTab({ requests, getCounterpartyName, onAccept, onReject, loading }: Props) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2].map(i => (
          <div key={i} className="h-48 bg-white rounded-2xl animate-pulse border border-gray-100" />
        ))}
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3" dir="rtl">
        <div className="w-16 h-16 rounded-2xl bg-white border border-dashed border-[#d0e6f0] flex items-center justify-center">
          <MessageSquare className="w-7 h-7 text-[#c0d5e0]" />
        </div>
        <p className="text-[13px] font-bold text-[#a0b5c0]">لا توجد طلبات تفاوض</p>
        <p className="text-[11px] text-[#c0d0da] text-center px-8">
          عندما يضغط مشتري على "طلب صفقة" من بطاقة عرضك في السوق سيظهر طلبه هنا
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex items-center gap-2 px-4 py-3 rounded-2xl" style={{ background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(255,255,255,0.9)' }}>
        <div className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#EFF6FF' }}>
          <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
        </div>
        <div>
          <p className="text-[12px] font-black text-[#1a2f3e]">{requests.length} طلب تفاوض معلق</p>
          <p className="text-[10px] text-[#7a9aab]">اقبل أو ارفض كل طلب</p>
        </div>
      </div>

      {requests.map(req => (
        <RequestCard
          key={req.id}
          request={req}
          buyerName={getCounterpartyName(req.buyer_phone)}
          onAccept={() => onAccept(req.id, req.inventory_batch_id, req.requested_quantity, req.buyer_phone)}
          onReject={() => onReject(req.id)}
        />
      ))}
    </div>
  );
}
