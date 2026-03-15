import { useEffect, useState, useRef } from 'react';
import {
  Box,
  ShoppingBag,
  Package,
  Layers,
  MapPin,
  Banknote,
  RefreshCw,
  AlertCircle,
  ShoppingCart,
  HandCoins,
  ClipboardList,
  SlidersHorizontal,
  ChevronDown,
  Send,
  CheckCircle2,
  Clock,
  FileText,
  X,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useSession } from '../hooks/useSession';

type Tab = 'listings' | 'supply';

/* ── shared config ── */
const palletTypeLabel: Record<string, string> = {
  wooden:    'خشبية',
  plastic:   'بلاستيكية',
  metal:     'معدنية',
  cardboard: 'كرتونية',
};

const palletTypeBg: Record<string, string> = {
  wooden:    'from-amber-700 to-amber-500',
  plastic:   'from-sky-700 to-sky-500',
  metal:     'from-slate-600 to-slate-400',
  cardboard: 'from-orange-600 to-orange-400',
};

const conditionConfig: Record<string, { label: string; color: string }> = {
  new:     { label: 'جديد',    color: 'bg-emerald-100 text-emerald-700' },
  good:    { label: 'جيد',     color: 'bg-sky-100 text-sky-700' },
  used:    { label: 'مستعمل', color: 'bg-amber-100 text-amber-700' },
  damaged: { label: 'تالف',   color: 'bg-red-100 text-red-700' },
};

const FILTER_OPTIONS = [
  { value: 'all',       label: 'الكل' },
  { value: 'wooden',    label: 'خشبية' },
  { value: 'plastic',   label: 'بلاستيكية' },
  { value: 'metal',     label: 'معدنية' },
  { value: 'cardboard', label: 'كرتونية' },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ar-SA', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

/* ─────────────────── LISTINGS ─────────────────── */

interface Listing {
  id: string;
  pallet_type: string;
  size: string;
  condition: string;
  quantity: number;
  price: number;
  city_id: string | null;
  status: string;
  created_at: string;
  city?: { name: string } | null;
}

function ListingCard({ listing, onRequest }: { listing: Listing; onRequest: (id: string) => void }) {
  const cond      = conditionConfig[listing.condition] ?? { label: listing.condition, color: 'bg-gray-100 text-gray-600' };
  const typeLabel = palletTypeLabel[listing.pallet_type] ?? listing.pallet_type;
  const gradBg    = palletTypeBg[listing.pallet_type] ?? 'from-[#1a4a5e] to-[#2a6a82]';

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
      <div className={`bg-gradient-to-br ${gradBg} p-4 flex items-center justify-between`}>
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
            <Box className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">طباليات {typeLabel}</p>
            <p className="text-white/60 text-xs mt-0.5">{formatDate(listing.created_at)}</p>
          </div>
        </div>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${cond.color}`}>
          {cond.label}
        </span>
      </div>

      <div className="p-4 flex flex-col gap-3 flex-1">
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-gray-50 rounded-xl px-3 py-2.5 flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-[#1a4a5e] shrink-0" />
            <div>
              <p className="text-[10px] text-gray-400">المقاس</p>
              <p className="text-xs font-bold text-gray-700">{listing.size}</p>
            </div>
          </div>
          <div className="bg-gray-50 rounded-xl px-3 py-2.5 flex items-center gap-2">
            <Package className="w-3.5 h-3.5 text-[#1a4a5e] shrink-0" />
            <div>
              <p className="text-[10px] text-gray-400">الكمية المتوفرة</p>
              <p className="text-xs font-bold text-gray-700">{listing.quantity} طبلية</p>
            </div>
          </div>
        </div>

        {listing.city && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <MapPin className="w-3.5 h-3.5 text-[#1a4a5e] shrink-0" />
            <span className="font-medium">{listing.city.name}</span>
          </div>
        )}

        <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-100">
          <div>
            <p className="text-[10px] text-gray-400">السعر للطبلية</p>
            <p className="text-xl font-bold text-[#1a4a5e]">
              {Number(listing.price).toLocaleString('ar-SA')}
              <span className="text-sm font-normal text-gray-400 mr-1">ر.س</span>
            </p>
          </div>
          <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 px-2.5 py-1 rounded-full">متوفر</span>
        </div>
      </div>

      <div className="px-4 pb-4">
        <button
          onClick={() => onRequest(listing.id)}
          className="w-full flex items-center justify-center gap-2 bg-[#1a4a5e] hover:bg-[#153d50] active:scale-[0.98] text-white rounded-xl py-2.5 text-sm font-bold transition-all"
        >
          <ShoppingCart className="w-4 h-4" />
          طلب الآن
        </button>
      </div>
    </div>
  );
}

function ListingSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
      <div className="h-16 bg-gray-200" />
      <div className="p-4 flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="h-12 bg-gray-100 rounded-xl" />
          <div className="h-12 bg-gray-100 rounded-xl" />
        </div>
        <div className="h-4 bg-gray-100 rounded w-2/5" />
        <div className="h-8 bg-gray-100 rounded" />
        <div className="h-10 bg-gray-200 rounded-xl" />
      </div>
    </div>
  );
}

/* ─────────────────── SUPPLY REQUESTS ─────────────────── */

interface SupplyRequest {
  id: string;
  pallet_type: string;
  size: string;
  condition: string;
  quantity: number;
  city_id: string | null;
  target_price: number | null;
  notes: string | null;
  status: string;
  created_at: string;
  city?: { name: string } | null;
}

function SupplyCard({ req, onOffer, onViewOffers }: { req: SupplyRequest; onOffer: () => void; onViewOffers: () => void }) {
  const cond      = conditionConfig[req.condition] ?? { label: req.condition, color: 'bg-gray-100 text-gray-600' };
  const typeLabel = palletTypeLabel[req.pallet_type] ?? req.pallet_type;
  const gradBg    = palletTypeBg[req.pallet_type] ?? 'from-[#1a4a5e] to-[#2a6a82]';

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
      <div className={`bg-gradient-to-br ${gradBg} p-4 flex items-center justify-between`}>
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
            <ShoppingBag className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">طباليات {typeLabel}</p>
            <p className="text-white/60 text-xs mt-0.5">{formatDate(req.created_at)}</p>
          </div>
        </div>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${cond.color}`}>
          {cond.label}
        </span>
      </div>

      <div className="p-4 flex flex-col gap-3 flex-1">
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-gray-50 rounded-xl px-3 py-2.5 flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-[#1a4a5e] shrink-0" />
            <div>
              <p className="text-[10px] text-gray-400">المقاس</p>
              <p className="text-xs font-bold text-gray-700">{req.size}</p>
            </div>
          </div>
          <div className="bg-gray-50 rounded-xl px-3 py-2.5 flex items-center gap-2">
            <Package className="w-3.5 h-3.5 text-[#1a4a5e] shrink-0" />
            <div>
              <p className="text-[10px] text-gray-400">الكمية المطلوبة</p>
              <p className="text-xs font-bold text-gray-700">{req.quantity} طبلية</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          {req.city && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <MapPin className="w-3.5 h-3.5 text-[#1a4a5e] shrink-0" />
              <span className="font-medium">{req.city.name}</span>
            </div>
          )}
          {req.target_price != null && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <Banknote className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>السعر المتوقع: <span className="font-bold text-emerald-700">{req.target_price} ر.س</span></span>
            </div>
          )}
        </div>

        {req.notes && (
          <p className="text-xs text-gray-500 bg-gray-50 rounded-xl px-3 py-2 leading-relaxed line-clamp-2">
            {req.notes}
          </p>
        )}
      </div>

      <div className="border-t border-gray-100 px-4 py-3 flex gap-2">
        <button
          onClick={onViewOffers}
          className="flex-1 flex items-center justify-center gap-1.5 border border-[#1a4a5e]/30 text-[#1a4a5e] hover:bg-[#1a4a5e]/5 active:scale-[0.98] rounded-xl py-2.5 text-sm font-semibold transition-all"
        >
          <Package className="w-3.5 h-3.5" />
          العروض
        </button>
        <button
          onClick={onOffer}
          className="flex-1 flex items-center justify-center gap-2 bg-[#1a4a5e] hover:bg-[#153d50] active:scale-[0.98] text-white rounded-xl py-2.5 text-sm font-bold transition-all"
        >
          <HandCoins className="w-4 h-4" />
          تقديم عرض
        </button>
      </div>
    </div>
  );
}

/* ─────────────────── OFFER MODAL ─────────────────── */

interface OfferForm {
  supplier_name: string;
  supplier_phone: string;
  quantity: string;
  price: string;
  delivery_time: string;
  notes: string;
}

interface OfferModalProps {
  request: SupplyRequest;
  sessionProfile: { id: string; display_name: string; phone: string } | null;
  onClose: () => void;
  onSuccess: () => void;
}

function OfferModal({ request, sessionProfile, onClose, onSuccess }: OfferModalProps) {
  const gradBg    = palletTypeBg[request.pallet_type] ?? 'from-[#1a4a5e] to-[#2a6a82]';
  const typeLabel = palletTypeLabel[request.pallet_type] ?? request.pallet_type;
  const cond      = conditionConfig[request.condition] ?? { label: request.condition, color: 'bg-gray-100 text-gray-600' };

  const [form, setForm] = useState<OfferForm>({
    supplier_name:  sessionProfile?.display_name ?? '',
    supplier_phone: sessionProfile?.phone ?? '',
    quantity:       '',
    price:          '',
    delivery_time:  '',
    notes:          '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [success, setSuccess]       = useState(false);

  function setField(k: keyof OfferForm, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const name  = form.supplier_name.trim();
    const phone = form.supplier_phone.trim();
    const qty   = parseInt(form.quantity, 10);
    const price = parseFloat(form.price);

    if (!name)                          { setError('يرجى إدخال اسمك.'); return; }
    if (!phone || !/^05\d{8}$/.test(phone)) { setError('يرجى إدخال رقم جوال صحيح (05XXXXXXXX).'); return; }
    if (!form.quantity || isNaN(qty) || qty <= 0) { setError('يرجى إدخال كمية صحيحة.'); return; }
    if (!form.price || isNaN(price) || price <= 0) { setError('يرجى إدخال سعر صحيح.'); return; }
    if (!form.delivery_time.trim())     { setError('يرجى تحديد مدة التوريد.'); return; }

    setSubmitting(true);
    const { error: dbErr } = await supabase.from('supplier_offers').insert({
      supply_request_id: request.id,
      supplier_id:       sessionProfile?.id ?? null,
      supplier_name:     name,
      supplier_phone:    phone,
      quantity:          qty,
      price,
      delivery_time:     form.delivery_time.trim(),
      notes:             form.notes.trim() || null,
      status:            'pending',
    });
    setSubmitting(false);

    if (dbErr) {
      setError('حدث خطأ أثناء إرسال العرض، يرجى المحاولة مجدداً.');
    } else {
      setSuccess(true);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" dir="rtl">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={!success ? onClose : undefined}
      />
      <div className="relative w-full sm:max-w-md bg-white sm:rounded-3xl rounded-t-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {success ? (
          <div className="flex flex-col items-center justify-center gap-5 py-12 px-8">
            <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-500" />
            </div>
            <div className="text-center">
              <p className="text-[#1a4a5e] font-bold text-lg">تم إرسال عرضك بنجاح</p>
              <p className="text-gray-500 text-sm mt-1">سيتم إشعارك عند رد المشتري على عرضك</p>
            </div>
            <button
              onClick={() => { onSuccess(); onClose(); }}
              className="w-full bg-[#1a4a5e] hover:bg-[#153d50] text-white rounded-2xl py-3 font-bold text-sm transition-colors"
            >
              حسناً
            </button>
          </div>
        ) : (
          <>
            <div className={`bg-gradient-to-br ${gradBg} px-5 py-4 flex items-center justify-between shrink-0`}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
                  <HandCoins className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-white font-bold text-sm">تقديم عرض</p>
                  <p className="text-white/60 text-xs">طباليات {typeLabel} — {request.quantity} طبلية</p>
                </div>
              </div>
              <button onClick={onClose} className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center transition-colors">
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            <div className="px-5 pt-3 pb-1 shrink-0">
              <div className="bg-gray-50 rounded-xl px-4 py-2.5 flex flex-wrap items-center gap-2">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cond.color}`}>{cond.label}</span>
                <span className="text-xs text-gray-500">المقاس: <span className="font-bold text-gray-700">{request.size}</span></span>
                {request.target_price != null && (
                  <span className="text-xs text-emerald-600 font-medium mr-auto">السعر المتوقع: {request.target_price} ر.س</span>
                )}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-5 py-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-600">اسم المورد</label>
                  <input
                    type="text"
                    placeholder="الاسم"
                    value={form.supplier_name}
                    onChange={(e) => setField('supplier_name', e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a4a5e]/30 focus:border-[#1a4a5e] transition-all"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-600">رقم الجوال</label>
                  <input
                    type="tel"
                    placeholder="05XXXXXXXX"
                    value={form.supplier_phone}
                    onChange={(e) => setField('supplier_phone', e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a4a5e]/30 focus:border-[#1a4a5e] transition-all"
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-600 flex items-center gap-1">
                    <Package className="w-3.5 h-3.5 text-[#1a4a5e]" />
                    الكمية المتوفرة
                  </label>
                  <div className="relative">
                    <input
                      type="number" min="1" placeholder="0"
                      value={form.quantity}
                      onChange={(e) => setField('quantity', e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a4a5e]/30 focus:border-[#1a4a5e] transition-all"
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">طبلية</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-600 flex items-center gap-1">
                    <Banknote className="w-3.5 h-3.5 text-emerald-600" />
                    السعر للطبلية
                  </label>
                  <div className="relative">
                    <input
                      type="number" min="0.01" step="0.01" placeholder="0.00"
                      value={form.price}
                      onChange={(e) => setField('price', e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a4a5e]/30 focus:border-[#1a4a5e] transition-all"
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">ر.س</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-600 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  مدة التوريد
                </label>
                <input
                  type="text" placeholder="مثال: خلال 3 أيام، أو فوري"
                  value={form.delivery_time}
                  onChange={(e) => setField('delivery_time', e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a4a5e]/30 focus:border-[#1a4a5e] transition-all"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-600 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-gray-400" />
                  ملاحظات
                  <span className="text-gray-400 font-normal">(اختياري)</span>
                </label>
                <textarea
                  rows={2} placeholder="أي تفاصيل إضافية..."
                  value={form.notes}
                  onChange={(e) => setField('notes', e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a4a5e]/30 focus:border-[#1a4a5e] transition-all resize-none leading-relaxed"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <p className="text-xs text-red-600 font-medium">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 bg-[#1a4a5e] hover:bg-[#153d50] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl py-3 text-sm font-bold transition-all active:scale-[0.98]"
              >
                {submitting ? (
                  <><RefreshCw className="w-4 h-4 animate-spin" />جاري الإرسال...</>
                ) : (
                  <><Send className="w-4 h-4" />إرسال العرض</>
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

/* ─────────────────── FILTER BAR ─────────────────── */

function FilterBar({ filter, onChange }: { filter: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref             = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const label = FILTER_OPTIONS.find((o) => o.value === filter)?.label ?? 'الكل';

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3.5 py-2 text-sm text-gray-700 font-medium hover:bg-gray-50 transition-colors shadow-sm"
      >
        <SlidersHorizontal className="w-4 h-4 text-[#1a4a5e]" />
        {label}
        <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute top-full mt-1.5 right-0 bg-white border border-gray-100 rounded-2xl shadow-lg overflow-hidden z-10 min-w-[130px]">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`w-full text-right px-4 py-2.5 text-sm font-medium transition-colors ${
                filter === opt.value ? 'bg-[#1a4a5e] text-white' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────── MAIN PAGE ─────────────────── */

interface Props {
  onSelectListing: (id: string) => void;
  onOpenSupplierDashboard: () => void;
  onViewOffers: (requestId: string) => void;
}

export default function MarketplaceHome({ onSelectListing, onOpenSupplierDashboard, onViewOffers }: Props) {
  const { session } = useSession();
  const [tab, setTab] = useState<Tab>('listings');

  /* listings state */
  const [listings, setListings]         = useState<Listing[]>([]);
  const [listLoading, setListLoading]   = useState(true);
  const [listError, setListError]       = useState<string | null>(null);
  const [listFilter, setListFilter]     = useState('all');

  /* supply requests state */
  const [requests, setRequests]         = useState<SupplyRequest[]>([]);
  const [supLoading, setSupLoading]     = useState(true);
  const [supError, setSupError]         = useState<string | null>(null);
  const [supFilter, setSupFilter]       = useState('all');
  const [activeRequest, setActiveRequest] = useState<SupplyRequest | null>(null);

  async function fetchListings() {
    setListLoading(true);
    setListError(null);
    let q = supabase
      .from('listings')
      .select('id, pallet_type, size, condition, quantity, price, city_id, status, created_at, city:city_id(name)')
      .eq('status', 'active')
      .order('created_at', { ascending: false });
    if (listFilter !== 'all') q = q.eq('pallet_type', listFilter);
    const { data, error } = await q;
    if (error) setListError('تعذّر تحميل العروض، يرجى المحاولة مجدداً.');
    else setListings((data as unknown as Listing[]) ?? []);
    setListLoading(false);
  }

  async function fetchRequests() {
    setSupLoading(true);
    setSupError(null);
    let q = supabase
      .from('supply_requests')
      .select('id, pallet_type, size, condition, quantity, city_id, target_price, notes, status, created_at, city:city_id(name)')
      .eq('status', 'active')
      .order('created_at', { ascending: false });
    if (supFilter !== 'all') q = q.eq('pallet_type', supFilter);
    const { data, error } = await q;
    if (error) setSupError('تعذّر تحميل الطلبات، يرجى المحاولة مجدداً.');
    else setRequests((data as unknown as SupplyRequest[]) ?? []);
    setSupLoading(false);
  }

  useEffect(() => { fetchListings(); }, [listFilter]);
  useEffect(() => { fetchRequests(); }, [supFilter]);

  const isLoading = tab === 'listings' ? listLoading : supLoading;
  const hasError  = tab === 'listings' ? listError : supError;
  const count     = tab === 'listings' ? listings.length : requests.length;

  return (
    <>
      <div
        className="min-h-screen flex flex-col"
        dir="rtl"
        style={{ background: 'linear-gradient(135deg, #eef4f8 0%, #f5f9fc 55%, #eaf2f7 100%)' }}
      >
        {/* ── Header ── */}
        <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm">
          <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 shrink-0">
              <div className="w-9 h-9 bg-[#1a4a5e] rounded-xl flex items-center justify-center shadow">
                <svg viewBox="0 0 20 20" className="w-5 h-5" fill="none">
                  <rect x="2" y="2" width="6.5" height="6.5" rx="1.5" fill="white" />
                  <rect x="11.5" y="2" width="6.5" height="6.5" rx="1.5" fill="white" />
                  <rect x="2" y="11.5" width="6.5" height="6.5" rx="1.5" fill="white" />
                  <rect x="11.5" y="11.5" width="6.5" height="6.5" rx="1.5" fill="white" />
                </svg>
              </div>
              <div>
                <h1 className="text-[#1a4a5e] font-bold text-base leading-tight">سوق الطبليات</h1>
                <p className="text-gray-400 text-[11px]">منصة شراء وبيع الطبليات</p>
              </div>
            </div>

            <button
              onClick={onOpenSupplierDashboard}
              className="flex items-center gap-1.5 text-xs text-[#1a4a5e] font-medium hover:bg-[#1a4a5e]/10 px-3 py-1.5 rounded-lg transition-colors border border-[#1a4a5e]/20"
            >
              <ClipboardList className="w-3.5 h-3.5" />
              لوحة المورد
            </button>
          </div>

          {/* ── Tabs ── */}
          <div className="max-w-6xl mx-auto px-4 flex gap-0 border-t border-gray-100">
            <TabButton
              active={tab === 'listings'}
              onClick={() => setTab('listings')}
              icon={<Box className="w-4 h-4" />}
              label="عروض الطبليات"
              count={tab === 'listings' && !listLoading ? listings.length : undefined}
            />
            <TabButton
              active={tab === 'supply'}
              onClick={() => setTab('supply')}
              icon={<ShoppingBag className="w-4 h-4" />}
              label="طلبات التوريد"
              count={tab === 'supply' && !supLoading ? requests.length : undefined}
            />
          </div>
        </header>

        {/* ── Main ── */}
        <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6 flex flex-col gap-5">

          {/* filter + refresh row */}
          <div className="flex items-center justify-between gap-3">
            <FilterBar
              filter={tab === 'listings' ? listFilter : supFilter}
              onChange={tab === 'listings' ? setListFilter : setSupFilter}
            />
            <div className="flex items-center gap-3">
              {!isLoading && !hasError && (
                <span className="text-xs text-gray-400">
                  {count} {tab === 'listings' ? 'عرض' : 'طلب'}
                </span>
              )}
              <button
                onClick={tab === 'listings' ? fetchListings : fetchRequests}
                disabled={isLoading}
                className="flex items-center gap-1.5 text-xs text-[#1a4a5e] font-medium hover:underline disabled:opacity-40"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                تحديث
              </button>
            </div>
          </div>

          {/* error */}
          {hasError && !isLoading && (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center">
                <AlertCircle className="w-7 h-7 text-red-400" />
              </div>
              <p className="text-gray-600 font-medium text-center">{hasError}</p>
              <button
                onClick={tab === 'listings' ? fetchListings : fetchRequests}
                className="flex items-center gap-2 bg-[#1a4a5e] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#153d50] transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                إعادة المحاولة
              </button>
            </div>
          )}

          {/* skeleton */}
          {isLoading && !hasError && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => <ListingSkeleton key={i} />)}
            </div>
          )}

          {/* empty */}
          {!isLoading && !hasError && count === 0 && (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center">
                {tab === 'listings'
                  ? <Box className="w-8 h-8 text-gray-300" />
                  : <ShoppingBag className="w-8 h-8 text-gray-300" />
                }
              </div>
              <p className="text-gray-500 font-semibold">
                {tab === 'listings' ? 'لا توجد عروض متاحة' : 'لا توجد طلبات توريد حالياً'}
              </p>
              <p className="text-gray-400 text-sm">
                {tab === 'listings' ? 'سيتم إضافة عروض قريباً' : 'ستظهر هنا طلبات المشترين عند إضافتها'}
              </p>
            </div>
          )}

          {/* listings grid */}
          {tab === 'listings' && !listLoading && !listError && listings.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {listings.map((l) => (
                <ListingCard key={l.id} listing={l} onRequest={onSelectListing} />
              ))}
            </div>
          )}

          {/* supply requests grid */}
          {tab === 'supply' && !supLoading && !supError && requests.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {requests.map((r) => (
                <SupplyCard
                  key={r.id}
                  req={r}
                  onOffer={() => setActiveRequest(r)}
                  onViewOffers={() => onViewOffers(r.id)}
                />
              ))}
            </div>
          )}
        </main>
      </div>

      {activeRequest && (
        <OfferModal
          request={activeRequest}
          sessionProfile={session?.profile ?? null}
          onClose={() => setActiveRequest(null)}
          onSuccess={() => setActiveRequest(null)}
        />
      )}
    </>
  );
}

/* ─────────────────── TAB BUTTON ─────────────────── */

function TabButton({
  active, onClick, icon, label, count,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all ${
        active
          ? 'border-[#1a4a5e] text-[#1a4a5e]'
          : 'border-transparent text-gray-400 hover:text-gray-600 hover:border-gray-300'
      }`}
    >
      {icon}
      {label}
      {count !== undefined && count > 0 && (
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
          active ? 'bg-[#1a4a5e] text-white' : 'bg-gray-200 text-gray-500'
        }`}>
          {count}
        </span>
      )}
    </button>
  );
}
