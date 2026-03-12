import { useState } from 'react';
import {
  Package, MapPin, Clock, CheckCircle, XCircle, PhoneCall,
  Truck, AlertTriangle, ChevronDown, ChevronUp, Loader,
  MessageCircle, ShoppingBag, User
} from 'lucide-react';
import { useSupplierSaleRequests, useBuyerSaleRequests, type SaleRequest } from '../../../hooks/useSaleRequests';

const QUALITY_LABELS: Record<string, string> = {
  A: 'درجة A', B: 'درجة B', C: 'درجة C', Scrap: 'خردة',
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: typeof Clock }> = {
  pending_supplier: { label: 'بانتظار المورد', color: '#b45309', bg: '#fffbeb', icon: Clock },
  accepted: { label: 'مقبول', color: '#15803d', bg: '#f0fdf4', icon: CheckCircle },
  rejected: { label: 'مرفوض', color: '#dc2626', bg: '#fef2f2', icon: XCircle },
  in_contact: { label: 'جاري التواصل', color: '#2563eb', bg: '#eff6ff', icon: PhoneCall },
  completed: { label: 'مكتمل', color: '#15803d', bg: '#f0fdf4', icon: CheckCircle },
  failed: { label: 'فشل التسليم', color: '#dc2626', bg: '#fef2f2', icon: XCircle },
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('ar-SA', { day: 'numeric', month: 'short', year: 'numeric' });
}

function openWhatsApp(phone: string, message: string) {
  const cleaned = phone.replace(/\D/g, '');
  const intl = cleaned.startsWith('0') ? `966${cleaned.slice(1)}` : cleaned;
  window.open(`https://wa.me/${intl}?text=${encodeURIComponent(message)}`, '_blank');
}

interface CommissionPledgeDialogProps {
  request: SaleRequest;
  onConfirm: () => void;
  onClose: () => void;
  loading: boolean;
}

function CommissionPledgeDialog({ request, onConfirm, onClose, loading }: CommissionPledgeDialogProps) {
  const [agreed, setAgreed] = useState(false);
  const total = request.commission_per_pallet * request.requested_quantity;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div
        className="w-full rounded-3xl overflow-hidden"
        style={{ background: 'white', maxWidth: 420, boxShadow: '0 24px 60px rgba(0,0,0,0.3)' }}
        onClick={e => e.stopPropagation()}
        dir="rtl"
      >
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-[16px] font-black text-gray-900">قبول الطلب</h3>
          <p className="text-[12px] text-gray-500 mt-0.5">يرجى الموافقة على تعهد العمولة قبل المتابعة</p>
        </div>

        <div className="px-5 py-5 space-y-4">
          <div className="rounded-2xl p-4 space-y-2" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
            <div className="flex items-center justify-between">
              <span className="text-[15px] font-black text-green-700">{request.commission_per_pallet} ريال</span>
              <span className="text-[12px] text-green-600/70">عمولة المنصة / طبلية</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-bold text-green-700">{request.requested_quantity} طبلية × {request.commission_per_pallet} ريال</span>
              <span className="text-[11px] text-green-600/50">الإجمالي</span>
            </div>
            <div className="pt-2 border-t border-green-200">
              <div className="flex items-center justify-between">
                <span className="text-[18px] font-black text-green-800">{total} ريال</span>
                <span className="text-[11px] text-green-700">إجمالي العمولة</span>
              </div>
            </div>
          </div>

          <label className="flex items-start gap-3 cursor-pointer group">
            <div
              onClick={() => setAgreed(a => !a)}
              className="mt-0.5 w-5 h-5 rounded-lg flex-shrink-0 flex items-center justify-center transition-all"
              style={{ background: agreed ? '#16a34a' : 'white', border: agreed ? '2px solid #16a34a' : '2px solid #d1d5db' }}
            >
              {agreed && <CheckCircle className="w-3 h-3 text-white" />}
            </div>
            <p className="text-[13px] text-gray-700 leading-relaxed">
              أوافق على تحصيل عمولة المنصة البالغة
              <span className="font-bold text-green-700"> {request.commission_per_pallet} ريال </span>
              لكل طبلية من المشتري عند إتمام الصفقة.
            </p>
          </label>

          <button
            onClick={onConfirm}
            disabled={!agreed || loading}
            className="w-full py-3.5 rounded-2xl flex items-center justify-center gap-2 font-black text-[14px] text-white transition-all active:scale-[0.98] disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)', boxShadow: agreed ? '0 6px 20px rgba(22,163,74,0.35)' : 'none' }}
          >
            {loading ? <Loader className="w-4 h-4 animate-spin" /> : <>
              <CheckCircle className="w-4 h-4" />
              بدء التواصل
            </>}
          </button>
        </div>
      </div>
    </div>
  );
}

interface SupplierRequestCardProps {
  req: SaleRequest;
  onAccept: (id: string) => Promise<{ success: boolean; error?: string }>;
  onReject: (id: string) => Promise<{ success: boolean; error?: string }>;
  onStartContact: (id: string) => Promise<{ success: boolean; error?: string; buyer_phone?: string }>;
  onComplete: (id: string) => Promise<{ success: boolean; error?: string }>;
  onFail: (id: string) => Promise<{ success: boolean; error?: string }>;
}

function SupplierRequestCard({ req, onAccept, onReject, onStartContact, onComplete, onFail }: SupplierRequestCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPledge, setShowPledge] = useState(false);
  const [pledgeMode, setPledgeMode] = useState<'accept' | 'contact'>('accept');
  const [err, setErr] = useState<string | null>(null);

  const cfg = STATUS_CONFIG[req.status] || STATUS_CONFIG.pending_supplier;
  const Icon = cfg.icon;

  const act = async (fn: () => Promise<{ success: boolean; error?: string }>) => {
    setLoading(true); setErr(null);
    const res = await fn();
    if (!res.success) setErr(res.error || 'حدث خطأ');
    setLoading(false);
  };

  const handleOpenPledge = (mode: 'accept' | 'contact') => {
    setPledgeMode(mode);
    setShowPledge(true);
  };

  const handlePledgeConfirm = async () => {
    if (pledgeMode === 'accept') {
      setLoading(true); setErr(null);
      const acceptRes = await onAccept(req.id);
      if (!acceptRes.success) { setErr(acceptRes.error || 'حدث خطأ'); setLoading(false); return; }
      const contactRes = await onStartContact(req.id);
      setLoading(false);
      if (!contactRes.success) { setErr(contactRes.error || 'حدث خطأ'); return; }
      setShowPledge(false);
      const buyerPhone = (contactRes as { buyer_phone?: string }).buyer_phone || req.buyer_phone;
      openWhatsApp(buyerPhone, `مرحباً، أنا المورد لطلب الشراء رقم ${req.id.slice(0, 8)}. أنا جاهز للتواصل معك بشأن ${req.requested_quantity} طبلية ${req.pallet_type}.`);
    } else {
      setLoading(true); setErr(null);
      const res = await onStartContact(req.id);
      setLoading(false);
      if (!res.success) { setErr(res.error || 'حدث خطأ'); return; }
      setShowPledge(false);
      const buyerPhone = (res as { buyer_phone?: string }).buyer_phone || req.buyer_phone;
      openWhatsApp(buyerPhone, `مرحباً، أنا المورد لطلب الشراء رقم ${req.id.slice(0, 8)}. أنا جاهز للتواصل معك بشأن ${req.requested_quantity} طبلية ${req.pallet_type}.`);
    }
  };

  return (
    <>
      <div className="rounded-2xl overflow-hidden" style={{ background: 'white', border: '1px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }} dir="rtl">
        <div className="px-4 py-3 flex items-center justify-between border-b border-gray-50">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1" style={{ background: cfg.bg, color: cfg.color }}>
              <Icon className="w-3 h-3" />
              {cfg.label}
            </span>
            <span className="text-[11px] text-gray-400">{formatDate(req.created_at)}</span>
          </div>
          <button onClick={() => setExpanded(e => !e)} className="text-gray-400 hover:text-gray-600 transition-colors">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-green-500" />
              <span className="text-[14px] font-black text-gray-900">{req.pallet_type}</span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-lg" style={{ background: '#f0f4f8', color: '#4a7a8a' }}>{req.size}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[18px] font-black text-green-700">{req.requested_quantity}</span>
              <span className="text-[11px] text-gray-400">طبلية</span>
            </div>
          </div>

          <div className="flex items-center gap-3 text-[12px] text-gray-500">
            <div className="flex items-center gap-1">
              <MapPin className="w-3 h-3 text-green-400" />
              {req.city}
            </div>
            <div className="flex items-center gap-1">
              <User className="w-3 h-3 text-blue-400" />
              {req.buyer_company_name || req.buyer_display_name || req.buyer_phone}
            </div>
          </div>

          {expanded && (
            <div className="mt-3 space-y-2 pt-3 border-t border-gray-50">
              <div className="grid grid-cols-2 gap-2 text-right">
                <div className="rounded-xl p-2.5" style={{ background: '#f9fafb' }}>
                  <p className="text-[10px] text-gray-400">الجودة</p>
                  <p className="text-[12px] font-bold text-gray-700">{QUALITY_LABELS[req.quality] || req.quality}</p>
                </div>
                <div className="rounded-xl p-2.5" style={{ background: '#f9fafb' }}>
                  <p className="text-[10px] text-gray-400">السعر المعروض</p>
                  <p className="text-[12px] font-bold text-gray-700">{req.price_per_pallet > 0 ? `${req.price_per_pallet} ريال` : 'قابل للتفاوض'}</p>
                </div>
                <div className="rounded-xl p-2.5" style={{ background: '#f9fafb' }}>
                  <p className="text-[10px] text-gray-400">عمولة المنصة</p>
                  <p className="text-[12px] font-bold text-gray-700">{req.commission_per_pallet} ريال/طبلية</p>
                </div>
                <div className="rounded-xl p-2.5" style={{ background: '#f9fafb' }}>
                  <p className="text-[10px] text-gray-400">رقم المشتري</p>
                  <p className="text-[12px] font-bold text-gray-700" dir="ltr">{req.buyer_phone}</p>
                </div>
              </div>
            </div>
          )}

          {err && (
            <div className="mt-2 rounded-xl px-3 py-2" style={{ background: '#fef2f2' }}>
              <p className="text-[12px] font-semibold text-red-600 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{err}</p>
            </div>
          )}

          <div className="mt-3 space-y-2">
            {req.status === 'pending_supplier' && (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => act(() => onReject(req.id))}
                  disabled={loading}
                  className="py-2.5 rounded-xl text-[13px] font-bold transition-all active:scale-[0.97] disabled:opacity-50"
                  style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}
                >
                  {loading ? <Loader className="w-4 h-4 animate-spin mx-auto" /> : 'رفض الطلب'}
                </button>
                <button
                  onClick={() => handleOpenPledge('accept')}
                  disabled={loading}
                  className="py-2.5 rounded-xl text-[13px] font-bold text-white transition-all active:scale-[0.97] disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)', boxShadow: '0 4px 12px rgba(22,163,74,0.3)' }}
                >
                  قبول الطلب
                </button>
              </div>
            )}

            {req.status === 'accepted' && (
              <button
                onClick={() => handleOpenPledge('contact')}
                disabled={loading}
                className="w-full py-2.5 rounded-xl text-[13px] font-bold text-white transition-all active:scale-[0.97] disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', boxShadow: '0 4px 12px rgba(37,99,235,0.3)' }}
              >
                <MessageCircle className="w-4 h-4" />
                بدء التواصل
              </button>
            )}

            {req.status === 'in_contact' && (
              <>
                <button
                  onClick={() => openWhatsApp(req.buyer_phone, `مرحباً، متابعة لطلب الشراء — ${req.pallet_type} — ${req.requested_quantity} طبلية`)}
                  className="w-full py-2.5 rounded-xl text-[13px] font-bold text-white flex items-center justify-center gap-2 transition-all active:scale-[0.97]"
                  style={{ background: 'linear-gradient(135deg, #25D366, #128C7E)', boxShadow: '0 4px 12px rgba(37,211,102,0.3)' }}
                >
                  <MessageCircle className="w-4 h-4" />
                  التواصل عبر واتساب
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => act(() => onFail(req.id))}
                    disabled={loading}
                    className="py-2.5 rounded-xl text-[13px] font-bold transition-all active:scale-[0.97] disabled:opacity-50"
                    style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}
                  >
                    {loading ? <Loader className="w-4 h-4 animate-spin mx-auto" /> : 'فشل التسليم'}
                  </button>
                  <button
                    onClick={() => act(() => onComplete(req.id))}
                    disabled={loading}
                    className="py-2.5 rounded-xl text-[13px] font-bold text-white transition-all active:scale-[0.97] disabled:opacity-50 flex items-center justify-center gap-1"
                    style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)', boxShadow: '0 4px 12px rgba(22,163,74,0.3)' }}
                  >
                    {loading ? <Loader className="w-4 h-4 animate-spin" /> : <><Truck className="w-3.5 h-3.5" />تم التسليم</>}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {showPledge && (
        <CommissionPledgeDialog
          request={req}
          onConfirm={handlePledgeConfirm}
          onClose={() => setShowPledge(false)}
          loading={loading}
        />
      )}
    </>
  );
}

interface BuyerRequestCardProps {
  req: SaleRequest;
}

function BuyerRequestCard({ req }: BuyerRequestCardProps) {
  const [expanded, setExpanded] = useState(false);
  const cfg = STATUS_CONFIG[req.status] || STATUS_CONFIG.pending_supplier;
  const Icon = cfg.icon;

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'white', border: '1px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }} dir="rtl">
      <div className="px-4 py-3 flex items-center justify-between border-b border-gray-50">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1" style={{ background: cfg.bg, color: cfg.color }}>
            <Icon className="w-3 h-3" />
            {cfg.label}
          </span>
          <span className="text-[11px] text-gray-400">{formatDate(req.created_at)}</span>
        </div>
        <button onClick={() => setExpanded(e => !e)} className="text-gray-400 hover:text-gray-600 transition-colors">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-green-500" />
            <span className="text-[14px] font-black text-gray-900">{req.pallet_type}</span>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-lg" style={{ background: '#f0f4f8', color: '#4a7a8a' }}>{req.size}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[18px] font-black text-green-700">{req.requested_quantity}</span>
            <span className="text-[11px] text-gray-400">طبلية</span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-[12px] text-gray-500">
          <div className="flex items-center gap-1">
            <MapPin className="w-3 h-3 text-green-400" />
            {req.city}
          </div>
        </div>

        {expanded && (
          <div className="mt-3 grid grid-cols-2 gap-2 text-right pt-3 border-t border-gray-50">
            <div className="rounded-xl p-2.5" style={{ background: '#f9fafb' }}>
              <p className="text-[10px] text-gray-400">الجودة</p>
              <p className="text-[12px] font-bold text-gray-700">{QUALITY_LABELS[req.quality] || req.quality}</p>
            </div>
            <div className="rounded-xl p-2.5" style={{ background: '#f9fafb' }}>
              <p className="text-[10px] text-gray-400">السعر المعروض</p>
              <p className="text-[12px] font-bold text-gray-700">{req.price_per_pallet > 0 ? `${req.price_per_pallet} ريال` : '-'}</p>
            </div>
          </div>
        )}

        {req.status === 'in_contact' && (
          <div className="mt-3">
            <button
              onClick={() => openWhatsApp(req.supplier_phone, `مرحباً، أنا المشتري وأودّ التواصل معك بشأن طلب الشراء — ${req.pallet_type} — ${req.requested_quantity} طبلية`)}
              className="w-full py-2.5 rounded-xl text-[13px] font-bold text-white flex items-center justify-center gap-2 transition-all active:scale-[0.97]"
              style={{ background: 'linear-gradient(135deg, #25D366, #128C7E)', boxShadow: '0 4px 12px rgba(37,211,102,0.3)' }}
            >
              <MessageCircle className="w-4 h-4" />
              التواصل عبر واتساب
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

type ViewMode = 'supplier' | 'buyer';

interface Props {
  phone: string;
}

export default function SaleRequestsTab({ phone }: Props) {
  const [view, setView] = useState<ViewMode>('supplier');

  const {
    requests: supplierRequests,
    loading: supplierLoading,
    accept, reject, startContact, completeDelivery, failDelivery
  } = useSupplierSaleRequests(phone);

  const { requests: buyerRequests, loading: buyerLoading } = useBuyerSaleRequests(phone);

  const pending = supplierRequests.filter(r => r.status === 'pending_supplier').length;
  const buyerActive = buyerRequests.filter(r => !['completed', 'failed', 'rejected'].includes(r.status)).length;

  return (
    <div className="flex flex-col h-full" dir="rtl">
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[16px] font-black text-gray-900 flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-green-600" />
            طلبات شراء الطبليات
          </h2>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setView('supplier')}
            className="flex-1 py-2.5 rounded-xl text-[12px] font-bold transition-all relative"
            style={{
              background: view === 'supplier' ? 'linear-gradient(135deg, #16a34a, #15803d)' : '#f3f4f6',
              color: view === 'supplier' ? 'white' : '#6b7280',
              boxShadow: view === 'supplier' ? '0 4px 12px rgba(22,163,74,0.25)' : 'none',
            }}
          >
            طلبات واردة
            {pending > 0 && (
              <span className="absolute -top-1 -left-1 w-5 h-5 rounded-full text-[10px] font-black text-white flex items-center justify-center" style={{ background: '#dc2626' }}>
                {pending}
              </span>
            )}
          </button>
          <button
            onClick={() => setView('buyer')}
            className="flex-1 py-2.5 rounded-xl text-[12px] font-bold transition-all relative"
            style={{
              background: view === 'buyer' ? 'linear-gradient(135deg, #2563eb, #1d4ed8)' : '#f3f4f6',
              color: view === 'buyer' ? 'white' : '#6b7280',
              boxShadow: view === 'buyer' ? '0 4px 12px rgba(37,99,235,0.25)' : 'none',
            }}
          >
            طلباتي كمشتري
            {buyerActive > 0 && (
              <span className="absolute -top-1 -left-1 w-5 h-5 rounded-full text-[10px] font-black text-white flex items-center justify-center" style={{ background: '#2563eb' }}>
                {buyerActive}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-3">
        {view === 'supplier' && (
          <>
            {supplierLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader className="w-6 h-6 animate-spin text-green-500" />
              </div>
            ) : supplierRequests.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: '#f0fdf4' }}>
                  <ShoppingBag className="w-8 h-8 text-green-300" />
                </div>
                <p className="text-[14px] font-bold text-gray-500">لا توجد طلبات شراء واردة</p>
                <p className="text-[12px] text-gray-400">ستظهر هنا طلبات الشراء من السوق</p>
              </div>
            ) : (
              supplierRequests.map(req => (
                <SupplierRequestCard
                  key={req.id}
                  req={req}
                  onAccept={accept}
                  onReject={reject}
                  onStartContact={startContact}
                  onComplete={completeDelivery}
                  onFail={failDelivery}
                />
              ))
            )}
          </>
        )}

        {view === 'buyer' && (
          <>
            {buyerLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader className="w-6 h-6 animate-spin text-blue-500" />
              </div>
            ) : buyerRequests.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: '#eff6ff' }}>
                  <ShoppingBag className="w-8 h-8 text-blue-300" />
                </div>
                <p className="text-[14px] font-bold text-gray-500">لم ترسل أي طلبات شراء</p>
                <p className="text-[12px] text-gray-400">تصفّح السوق وابحث عن العروض المناسبة</p>
              </div>
            ) : (
              buyerRequests.map(req => (
                <BuyerRequestCard key={req.id} req={req} />
              ))
            )}
          </>
        )}
      </div>
    </div>
  );
}
