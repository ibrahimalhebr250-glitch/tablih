import { useState } from 'react';
import {
  MessageSquare, CheckCircle, XCircle, Loader2,
  Package, MapPin, Layers, Clock, User, Handshake,
  PartyPopper, AlertTriangle
} from 'lucide-react';
import type { NegotiationRequest } from '../../../hooks/useAccountData';

interface Props {
  requests: NegotiationRequest[];
  getCounterpartyName: (phone: string) => string;
  onAccept: (requestId: string, quantity: number) => Promise<{ success: boolean; error?: string; deal_ref?: string }>;
  onReject: (requestId: string) => Promise<{ success: boolean; error?: string }>;
  loading: boolean;
}

const QUALITY_MAP: Record<string, { label: string; color: string; bg: string }> = {
  A: { label: 'درجة A', color: '#15803d', bg: '#dcfce7' },
  B: { label: 'درجة B', color: '#1d4ed8', bg: '#dbeafe' },
  C: { label: 'درجة C', color: '#b45309', bg: '#fef3c7' },
  Scrap: { label: 'خردة', color: '#b91c1c', bg: '#fee2e2' },
};

function RequestCard({ request, supplierName, onAccept, onReject }: {
  request: NegotiationRequest;
  supplierName: string;
  onAccept: () => Promise<{ success: boolean; error?: string; deal_ref?: string }>;
  onReject: () => Promise<{ success: boolean; error?: string }>;
}) {
  const [actionLoading, setActionLoading] = useState<'accept' | 'reject' | null>(null);
  const [dealCreated, setDealCreated] = useState(false);
  const [dealRef, setDealRef] = useState('');
  const [error, setError] = useState<string | null>(null);

  const quality = QUALITY_MAP[request.quality || ''] || { label: request.quality || '', color: '#374151', bg: '#f3f4f6' };

  const handleAccept = async () => {
    setActionLoading('accept');
    setError(null);
    const result = await onAccept();
    if (result.success) {
      setDealRef(result.deal_ref || '');
      setDealCreated(true);
    } else {
      setError(result.error || 'فشل قبول العرض');
    }
    setActionLoading(null);
  };

  const handleReject = async () => {
    setActionLoading('reject');
    setError(null);
    const result = await onReject();
    if (!result.success) {
      setError(result.error || 'فشل رفض العرض');
    }
    setActionLoading(null);
  };

  if (dealCreated) {
    return (
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)', border: '2px solid #86efac', boxShadow: '0 4px 20px rgba(34,197,94,0.15)' }}
      >
        <div className="flex flex-col items-center justify-center py-8 px-4 gap-3">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: '#22c55e', boxShadow: '0 4px 16px rgba(34,197,94,0.4)' }}
          >
            <PartyPopper className="w-8 h-8 text-white" />
          </div>
          <p className="text-[16px] font-black text-green-800">تم قبول الصفقة بنجاح!</p>
          {dealRef && (
            <p className="text-[12px] font-mono text-green-600">رقم الصفقة: {dealRef}</p>
          )}
          <p className="text-[11px] text-green-600 text-center">
            الصفقة الآن في انتظار تأكيد المورد. تابعها من قسم الصفقات.
          </p>
        </div>
      </div>
    );
  }

  const timeAgo = getTimeAgo(request.created_at);

  return (
    <div
      className="rounded-2xl overflow-hidden transition-all"
      style={{ background: 'white', border: '1.5px solid rgba(0,0,0,0.06)', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
    >
      <div
        className="flex items-center justify-between px-4 py-2.5"
        style={{ background: 'linear-gradient(135deg, #ea580c 0%, #f97316 100%)' }}
      >
        <div className="flex items-center gap-1.5">
          <Clock className="w-3 h-3 text-white/60" />
          <span className="text-[10px] text-white/70">{timeAgo}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Handshake className="w-3.5 h-3.5 text-orange-200" />
          <span className="text-[11px] font-bold text-white">عرض توريد وارد</span>
        </div>
      </div>

      <div className="px-4 pt-3 pb-2" dir="rtl">
        <div
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 mb-3"
          style={{ background: '#fff7ed', border: '1px solid #fed7aa' }}
        >
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #ea580c, #f97316)' }}
          >
            <User className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-black text-orange-900 truncate">{supplierName}</p>
            <p className="text-[10px] text-orange-600">يعرض توريد لطلبك</p>
          </div>
        </div>

        <div className="space-y-2">
          {request.pallet_type && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-[12px] font-bold text-gray-800">{request.pallet_type}</span>
              </div>
              <span className="text-[10px] text-gray-400">نوع الطبلية</span>
            </div>
          )}
          {(request.size || request.quality) && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {request.quality && (
                  <span
                    className="px-2 py-0.5 rounded-lg text-[10px] font-bold"
                    style={{ background: quality.bg, color: quality.color }}
                  >
                    {quality.label}
                  </span>
                )}
                {request.size && (
                  <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold" style={{ background: '#f1f5f9', color: '#475569' }}>
                    {request.size}
                  </span>
                )}
              </div>
              <span className="text-[10px] text-gray-400">الجودة والمقاس</span>
            </div>
          )}
          {request.city && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-[12px] font-bold text-gray-700">{request.city}</span>
              </div>
              <span className="text-[10px] text-gray-400">مدينة التوريد</span>
            </div>
          )}
        </div>

        <div
          className="mt-3 rounded-xl px-3 py-2.5 flex items-center justify-between"
          style={{ background: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)', border: '1.5px solid #fed7aa' }}
        >
          <div className="flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-orange-500" />
            <span className="text-[18px] font-black text-orange-800">{request.requested_quantity}</span>
            <span className="text-[11px] text-orange-600 font-bold">طبلية</span>
          </div>
          <span className="text-[10px] text-orange-500 font-bold">الكمية المعروضة</span>
        </div>

        {error && (
          <div
            className="mt-2 flex items-center gap-2 rounded-xl px-3 py-2"
            style={{ background: '#fef2f2', border: '1px solid #fecaca' }}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
            <p className="text-[11px] text-red-600 font-bold">{error}</p>
          </div>
        )}
      </div>

      <div className="px-4 pb-4 pt-2 grid grid-cols-2 gap-2">
        <button
          disabled={actionLoading !== null}
          onClick={handleReject}
          className="py-3 rounded-xl text-[12px] font-bold flex items-center justify-center gap-1.5 active:scale-[0.97] transition-all disabled:opacity-50"
          style={{ background: '#FEF2F2', color: '#dc2626', border: '1.5px solid #FECACA' }}
        >
          {actionLoading === 'reject' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
          رفض العرض
        </button>
        <button
          disabled={actionLoading !== null}
          onClick={handleAccept}
          className="py-3 rounded-xl text-[12px] font-bold text-white flex items-center justify-center gap-1.5 active:scale-[0.97] transition-all disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)', boxShadow: '0 4px 14px rgba(5,150,105,0.3)' }}
        >
          {actionLoading === 'accept' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
          قبول الصفقة
        </button>
      </div>
    </div>
  );
}

function getTimeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'الآن';
  if (diffMin < 60) return `منذ ${diffMin} دقيقة`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `منذ ${diffHour} ساعة`;
  const diffDay = Math.floor(diffHour / 24);
  return `منذ ${diffDay} يوم`;
}

export default function NegotiationRequestsTab({ requests, getCounterpartyName, onAccept, onReject, loading }: Props) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2].map(i => (
          <div key={i} className="rounded-2xl animate-pulse overflow-hidden" style={{ background: 'white', border: '1px solid #f1f5f9' }}>
            <div className="h-10 bg-orange-100" />
            <div className="p-4 space-y-3">
              <div className="h-4 bg-gray-100 rounded-lg w-2/3" />
              <div className="h-3 bg-gray-100 rounded-lg w-1/2" />
              <div className="h-12 bg-orange-50 rounded-xl" />
              <div className="grid grid-cols-2 gap-2">
                <div className="h-10 bg-gray-100 rounded-xl" />
                <div className="h-10 bg-green-50 rounded-xl" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4" dir="rtl">
        <div
          className="w-20 h-20 rounded-3xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)', border: '2px dashed #fed7aa' }}
        >
          <Handshake className="w-9 h-9 text-orange-300" />
        </div>
        <div className="text-center">
          <p className="text-[15px] font-black text-gray-600">لا توجد عروض توريد واردة</p>
          <p className="text-[12px] text-gray-400 mt-1 px-8 leading-relaxed">
            عندما يقدم مورد عرض توريد على أحد طلباتك في السوق، ستظهر العروض هنا
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4" dir="rtl">
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-2xl"
        style={{ background: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)', border: '1.5px solid #fed7aa' }}
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #ea580c, #f97316)', boxShadow: '0 2px 8px rgba(234,88,12,0.3)' }}
        >
          <MessageSquare className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-[14px] font-black text-orange-900">
            {requests.length} عرض توريد معلق
          </p>
          <p className="text-[11px] text-orange-600">راجع العروض واقبل أو ارفض</p>
        </div>
      </div>

      {requests.map(req => (
        <RequestCard
          key={req.id}
          request={req}
          supplierName={getCounterpartyName(req.supplier_phone)}
          onAccept={() => onAccept(req.id, req.requested_quantity)}
          onReject={() => onReject(req.id)}
        />
      ))}
    </div>
  );
}
