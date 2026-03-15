import { useEffect, useState } from 'react';
import {
  ArrowRight,
  ClipboardList,
  User,
  Package,
  MessageSquare,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  Phone,
  LogIn,
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface PurchaseRequest {
  id: string;
  listing_id: string;
  buyer_name: string;
  quantity: number;
  message: string | null;
  status: string;
  created_at: string;
  listing: {
    pallet_type: string;
    size: string;
    condition: string;
  } | null;
}

const palletTypeLabel: Record<string, string> = {
  wooden:    'طبلية خشبية',
  plastic:   'طبلية بلاستيكية',
  metal:     'طبلية معدنية',
  cardboard: 'طبلية كرتونية',
};

const conditionLabel: Record<string, string> = {
  new:     'جديد',
  good:    'جيد',
  used:    'مستعمل',
  damaged: 'تالف',
};

const statusConfig: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  pending:  { label: 'قيد الانتظار', bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-500'   },
  accepted: { label: 'مقبول',        bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  rejected: { label: 'مرفوض',        bg: 'bg-red-50',     text: 'text-red-700',     dot: 'bg-red-500'     },
  completed:{ label: 'مكتمل',        bg: 'bg-sky-50',     text: 'text-sky-700',     dot: 'bg-sky-500'     },
};

interface Props {
  onBack: () => void;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ar-SA', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function SupplierRequests({ onBack }: Props) {
  const [phone, setPhone]         = useState('');
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  const [requests, setRequests]   = useState<PurchaseRequest[]>([]);
  const [loading, setLoading]     = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    const cleaned = phone.replace(/\s/g, '');
    if (!cleaned) return;

    setLoginLoading(true);
    setLoginError(null);

    const { data, error } = await supabase
      .from('platform_users')
      .select('id, user_type')
      .eq('phone', cleaned)
      .maybeSingle();

    setLoginLoading(false);

    if (error || !data) {
      setLoginError('رقم الجوال غير مسجل في المنصة.');
      return;
    }
    if (data.user_type !== 'supplier') {
      setLoginError('هذا الحساب ليس حساب مورد.');
      return;
    }

    setSupplierId(data.id);
  }

  async function fetchRequests(sId: string) {
    setLoading(true);
    setFetchError(null);

    const { data: listingRows, error: listingErr } = await supabase
      .from('listings')
      .select('id')
      .eq('supplier_id', sId);

    if (listingErr || !listingRows) {
      setFetchError('تعذّر تحميل البيانات.');
      setLoading(false);
      return;
    }

    const listingIds = listingRows.map((l) => l.id);

    if (listingIds.length === 0) {
      setRequests([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('purchase_requests')
      .select(`
        id, listing_id, buyer_name, quantity, message, status, created_at,
        listing:listing_id ( pallet_type, size, condition )
      `)
      .in('listing_id', listingIds)
      .order('created_at', { ascending: false });

    if (error) {
      setFetchError('تعذّر تحميل الطلبات، يرجى المحاولة مجدداً.');
    } else {
      setRequests((data as unknown as PurchaseRequest[]) ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    if (supplierId) fetchRequests(supplierId);
  }, [supplierId]);

  async function updateStatus(requestId: string, newStatus: 'accepted' | 'rejected') {
    setUpdatingId(requestId);
    const { error } = await supabase
      .from('purchase_requests')
      .update({ status: newStatus })
      .eq('id', requestId);

    if (!error) {
      setRequests((prev) =>
        prev.map((r) => (r.id === requestId ? { ...r, status: newStatus } : r))
      );
    }
    setUpdatingId(null);
  }

  const pendingCount = requests.filter((r) => r.status === 'pending').length;

  return (
    <div className="min-h-screen flex flex-col" dir="rtl" style={{ background: 'linear-gradient(135deg, #eef4f8 0%, #f5f9fc 60%, #eaf2f7 100%)' }}>
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors text-[#1a4a5e]"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2.5 flex-1">
            <div className="w-8 h-8 bg-[#1a4a5e] rounded-lg flex items-center justify-center shadow">
              <ClipboardList className="w-4 h-4 text-white" />
            </div>
            <span className="text-[#1a4a5e] font-bold text-base">لوحة المورد</span>
          </div>
          {supplierId && pendingCount > 0 && (
            <span className="bg-amber-500 text-white text-xs font-bold px-2.5 py-0.5 rounded-full">
              {pendingCount} جديد
            </span>
          )}
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8 flex flex-col gap-5">

        {!supplierId && (
          <div className="flex flex-col gap-6">
            <div className="bg-gradient-to-br from-[#1a4a5e] to-[#2a6a82] rounded-2xl p-6 shadow-md">
              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <ClipboardList className="w-5 h-5 text-white" />
                </div>
                <span className="text-white font-bold text-lg">لوحة المورد</span>
              </div>
              <p className="text-white/70 text-sm mt-2">أدخل رقم جوالك المسجل لعرض طلبات الشراء الواردة على عروضك.</p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <form onSubmit={handleLogin} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                    <Phone className="w-4 h-4 text-gray-400" />
                    رقم الجوال
                  </label>
                  <div className={`flex items-center gap-2.5 bg-gray-50 border rounded-xl px-3.5 py-2.5 focus-within:ring-2 focus-within:ring-[#1a4a5e]/30 focus-within:border-[#1a4a5e] transition-all ${loginError ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}>
                    <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                    <input
                      type="tel"
                      inputMode="tel"
                      placeholder="05xxxxxxxx"
                      value={phone}
                      onChange={(e) => { setPhone(e.target.value); setLoginError(null); }}
                      className="flex-1 bg-transparent outline-none text-sm text-gray-800 placeholder-gray-400"
                    />
                  </div>
                  {loginError && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {loginError}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loginLoading}
                  className="w-full flex items-center justify-center gap-2 bg-[#1a4a5e] hover:bg-[#153d50] active:scale-[0.98] disabled:opacity-60 text-white rounded-2xl py-3 text-sm font-bold transition-all shadow-md"
                >
                  {loginLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" />
                      عرض طلباتي
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        )}

        {supplierId && loading && (
          <div className="flex flex-col gap-4 animate-pulse">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-5 flex flex-col gap-3">
                <div className="h-4 bg-gray-100 rounded w-1/2" />
                <div className="h-4 bg-gray-100 rounded w-1/3" />
                <div className="h-4 bg-gray-100 rounded w-2/3" />
                <div className="flex gap-2 mt-2">
                  <div className="flex-1 h-10 bg-gray-100 rounded-xl" />
                  <div className="flex-1 h-10 bg-gray-100 rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        )}

        {supplierId && fetchError && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center">
              <AlertCircle className="w-7 h-7 text-red-400" />
            </div>
            <p className="text-gray-600 font-medium text-center">{fetchError}</p>
            <button
              onClick={() => fetchRequests(supplierId)}
              className="flex items-center gap-2 bg-[#1a4a5e] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#153d50] transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              إعادة المحاولة
            </button>
          </div>
        )}

        {supplierId && !loading && !fetchError && requests.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center">
              <ClipboardList className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-gray-500 font-medium text-center">لا توجد طلبات شراء حتى الآن</p>
            <p className="text-gray-400 text-sm text-center">ستظهر هنا الطلبات الواردة على عروضك</p>
          </div>
        )}

        {supplierId && !loading && !fetchError && requests.length > 0 && (
          <>
            <div className="flex items-center justify-between">
              <p className="text-gray-500 text-sm">{requests.length} طلب</p>
              <button
                onClick={() => fetchRequests(supplierId)}
                className="flex items-center gap-1.5 text-[#1a4a5e] text-sm font-medium hover:underline"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                تحديث
              </button>
            </div>

            {requests.map((req) => {
              const st = statusConfig[req.status] ?? statusConfig.pending;
              const listing = req.listing;
              const isBusy = updatingId === req.id;

              return (
                <div key={req.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="px-5 pt-5 pb-4 flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 bg-[#1a4a5e]/10 rounded-xl flex items-center justify-center shrink-0">
                          <User className="w-4 h-4 text-[#1a4a5e]" />
                        </div>
                        <div>
                          <p className="font-bold text-gray-800 text-sm">{req.buyer_name}</p>
                          <p className="text-gray-400 text-xs flex items-center gap-1 mt-0.5">
                            <Calendar className="w-3 h-3" />
                            {formatDate(req.created_at)}
                          </p>
                        </div>
                      </div>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 ${st.bg} ${st.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                        {st.label}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-gray-50 rounded-xl px-3 py-2.5 flex items-center gap-2">
                        <Package className="w-4 h-4 text-[#1a4a5e] shrink-0" />
                        <div>
                          <p className="text-[10px] text-gray-400">الكمية المطلوبة</p>
                          <p className="text-sm font-bold text-gray-800">{req.quantity} طبلية</p>
                        </div>
                      </div>
                      {listing && (
                        <div className="bg-gray-50 rounded-xl px-3 py-2.5 flex items-center gap-2">
                          <Package className="w-4 h-4 text-gray-400 shrink-0" />
                          <div>
                            <p className="text-[10px] text-gray-400">نوع الطبلية</p>
                            <p className="text-sm font-bold text-gray-800 truncate">
                              {palletTypeLabel[listing.pallet_type] ?? listing.pallet_type}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {listing && (
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span className="bg-gray-100 px-2.5 py-1 rounded-lg font-medium">{listing.size}</span>
                        <span className="bg-gray-100 px-2.5 py-1 rounded-lg font-medium">{conditionLabel[listing.condition] ?? listing.condition}</span>
                      </div>
                    )}

                    {req.message && (
                      <div className="bg-sky-50 border border-sky-100 rounded-xl px-3.5 py-2.5 flex gap-2">
                        <MessageSquare className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
                        <p className="text-sm text-sky-800 leading-relaxed">{req.message}</p>
                      </div>
                    )}
                  </div>

                  {req.status === 'pending' && (
                    <div className="border-t border-gray-100 px-5 py-3.5 flex gap-2.5">
                      <button
                        onClick={() => updateStatus(req.id, 'accepted')}
                        disabled={isBusy}
                        className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-60 text-white rounded-xl py-2.5 text-sm font-bold transition-all"
                      >
                        {isBusy ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4" />
                            قبول الطلب
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => updateStatus(req.id, 'rejected')}
                        disabled={isBusy}
                        className="flex-1 flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 active:scale-[0.98] disabled:opacity-60 text-red-600 border border-red-200 rounded-xl py-2.5 text-sm font-bold transition-all"
                      >
                        {isBusy ? (
                          <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <XCircle className="w-4 h-4" />
                            رفض الطلب
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {req.status !== 'pending' && (
                    <div className={`border-t px-5 py-3 flex items-center gap-2 text-sm font-medium ${
                      req.status === 'accepted' ? 'border-emerald-100 bg-emerald-50 text-emerald-700' :
                      req.status === 'rejected' ? 'border-red-100 bg-red-50 text-red-600' :
                      'border-sky-100 bg-sky-50 text-sky-700'
                    }`}>
                      {req.status === 'accepted' && <CheckCircle className="w-4 h-4" />}
                      {req.status === 'rejected' && <XCircle className="w-4 h-4" />}
                      {req.status === 'completed' && <CheckCircle className="w-4 h-4" />}
                      {req.status !== 'accepted' && req.status !== 'rejected' && req.status !== 'completed' && <Clock className="w-4 h-4" />}
                      {st.label}
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}
      </main>
    </div>
  );
}
