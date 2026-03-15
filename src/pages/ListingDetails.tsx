import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  Box,
  Layers,
  Package,
  MapPin,
  Tag,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  ShoppingBag,
  User,
  Phone,
  Hash,
  MessageSquare,
  X,
  Send,
} from 'lucide-react';
import { supabase } from '../lib/supabase';

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
}

const conditionConfig: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  new:     { label: 'جديد',    bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  good:    { label: 'جيد',     bg: 'bg-sky-50',     text: 'text-sky-700',     dot: 'bg-sky-500'     },
  used:    { label: 'مستعمل',  bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-500'   },
  damaged: { label: 'تالف',    bg: 'bg-red-50',     text: 'text-red-700',     dot: 'bg-red-500'     },
};

const palletTypeLabel: Record<string, string> = {
  wooden:    'طبلية خشبية',
  plastic:   'طبلية بلاستيكية',
  metal:     'طبلية معدنية',
  cardboard: 'طبلية كرتونية',
};

interface Props {
  listingId: string;
  onBack: () => void;
}

function DetailRow({
  icon,
  label,
  value,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between py-4 border-b border-gray-100 last:border-0 ${highlight ? 'bg-[#1a4a5e]/5 -mx-5 px-5 rounded-xl' : ''}`}>
      <div className="flex items-center gap-3 text-gray-500">
        <span className="w-8 h-8 rounded-lg bg-[#1a4a5e]/10 flex items-center justify-center text-[#1a4a5e]">
          {icon}
        </span>
        <span className="text-sm font-medium">{label}</span>
      </div>
      <div className={`text-sm font-semibold ${highlight ? 'text-[#1a4a5e] text-base' : 'text-gray-700'}`}>
        {value}
      </div>
    </div>
  );
}

function InputField({
  icon,
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  required,
  inputMode,
  min,
  max,
  error,
}: {
  icon: React.ReactNode;
  label: string;
  type?: string;
  placeholder: string;
  value: string | number;
  onChange: (v: string) => void;
  required?: boolean;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
  min?: number;
  max?: number;
  error?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
        {label}
        {required && <span className="text-red-500 text-xs">*</span>}
      </label>
      <div className={`flex items-center gap-2.5 bg-gray-50 border rounded-xl px-3.5 py-2.5 focus-within:ring-2 focus-within:ring-[#1a4a5e]/30 focus-within:border-[#1a4a5e] transition-all ${error ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}>
        <span className="text-gray-400 shrink-0">{icon}</span>
        <input
          type={type}
          inputMode={inputMode}
          placeholder={placeholder}
          value={value}
          min={min}
          max={max}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 bg-transparent outline-none text-sm text-gray-800 placeholder-gray-400"
        />
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

export default function ListingDetails({ listingId, onBack }: Props) {
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [buyerName, setBuyerName]   = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [qty, setQty]               = useState('1');
  const [message, setMessage]       = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const formRef = useRef<HTMLDivElement>(null);

  async function fetchListing() {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from('listings')
      .select('*')
      .eq('id', listingId)
      .maybeSingle();

    if (err) {
      setError('تعذّر تحميل بيانات العرض، يرجى المحاولة مجدداً.');
    } else if (!data) {
      setError('العرض غير موجود أو لم يعد متاحاً.');
    } else {
      setListing(data);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchListing();
  }, [listingId]);

  useEffect(() => {
    if (showForm && formRef.current) {
      setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    }
  }, [showForm]);

  function validate() {
    const errors: Record<string, string> = {};
    if (!buyerName.trim()) errors.buyerName = 'الاسم مطلوب';
    const phoneClean = buyerPhone.replace(/\s/g, '');
    if (!phoneClean) errors.buyerPhone = 'رقم الجوال مطلوب';
    else if (!/^05\d{8}$/.test(phoneClean)) errors.buyerPhone = 'رقم الجوال غير صحيح (مثال: 0512345678)';
    const qtyNum = parseInt(qty, 10);
    if (!qty || isNaN(qtyNum) || qtyNum < 1) errors.qty = 'الكمية يجب أن تكون 1 على الأقل';
    else if (listing && qtyNum > listing.quantity) errors.qty = `الكمية لا تتجاوز ${listing.quantity} طبلية`;
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setSubmitError(null);

    const { error: err } = await supabase.from('purchase_requests').insert({
      listing_id:  listingId,
      buyer_name:  buyerName.trim(),
      buyer_phone: buyerPhone.replace(/\s/g, ''),
      quantity:    parseInt(qty, 10),
      message:     message.trim() || null,
      request_type: 'quick',
      status:      'pending',
    });

    setSubmitting(false);

    if (err) {
      setSubmitError('حدث خطأ أثناء إرسال الطلب، يرجى المحاولة مجدداً.');
    } else {
      setSubmitted(true);
    }
  }

  const condition = listing ? (conditionConfig[listing.condition] ?? { label: listing.condition, bg: 'bg-gray-50', text: 'text-gray-600', dot: 'bg-gray-400' }) : null;
  const palletType = listing ? (palletTypeLabel[listing.pallet_type] ?? listing.pallet_type) : '';

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
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-[#1a4a5e] rounded-lg flex items-center justify-center shadow">
              <svg viewBox="0 0 20 20" className="w-4.5 h-4.5" fill="none">
                <rect x="2" y="2" width="6.5" height="6.5" rx="1.5" fill="white" />
                <rect x="11.5" y="2" width="6.5" height="6.5" rx="1.5" fill="white" />
                <rect x="2" y="11.5" width="6.5" height="6.5" rx="1.5" fill="white" />
                <rect x="11.5" y="11.5" width="6.5" height="6.5" rx="1.5" fill="white" />
              </svg>
            </div>
            <span className="text-[#1a4a5e] font-bold text-base">تفاصيل العرض</span>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8 flex flex-col gap-5 pb-32">

        {loading && (
          <div className="flex flex-col gap-4 animate-pulse">
            <div className="h-36 bg-gray-200 rounded-2xl" />
            <div className="bg-white rounded-2xl p-5 flex flex-col gap-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex justify-between items-center py-3 border-b border-gray-100 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-100 rounded-lg" />
                    <div className="w-20 h-4 bg-gray-100 rounded" />
                  </div>
                  <div className="w-24 h-4 bg-gray-100 rounded" />
                </div>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center flex-1 py-20 gap-4">
            <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center">
              <AlertCircle className="w-7 h-7 text-red-400" />
            </div>
            <p className="text-gray-600 font-medium text-center">{error}</p>
            <button
              onClick={fetchListing}
              className="flex items-center gap-2 bg-[#1a4a5e] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#153d50] transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              إعادة المحاولة
            </button>
          </div>
        )}

        {!loading && !error && listing && (
          <>
            <div className="bg-gradient-to-br from-[#1a4a5e] to-[#2a6a82] rounded-2xl p-6 flex items-start justify-between shadow-md">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <Box className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-white font-bold text-lg">{palletType}</span>
                </div>
                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold w-fit ${condition!.bg} ${condition!.text}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${condition!.dot}`} />
                  {condition!.label}
                </div>
              </div>
              <div className="text-left flex flex-col items-end">
                <span className="text-white/60 text-xs">السعر للطبلية</span>
                <span className="text-white font-bold text-2xl">{Number(listing.price).toLocaleString('ar-SA')}</span>
                <span className="text-white/60 text-xs">ريال سعودي</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-5 py-2">
              <DetailRow icon={<Layers className="w-4 h-4" />} label="المقاس" value={listing.size} />
              <DetailRow icon={<Package className="w-4 h-4" />} label="الكمية المتوفرة" value={`${listing.quantity} طبلية`} highlight />
              <DetailRow
                icon={<Tag className="w-4 h-4" />}
                label="السعر للطبلية"
                value={
                  <span>
                    {Number(listing.price).toLocaleString('ar-SA')}
                    <span className="text-gray-400 font-normal text-xs mr-1">ر.س</span>
                  </span>
                }
              />
              {listing.city_id && (
                <DetailRow icon={<MapPin className="w-4 h-4" />} label="المدينة" value={listing.city_id} />
              )}
              <DetailRow
                icon={<CheckCircle className="w-4 h-4" />}
                label="حالة العرض"
                value={
                  <span className="flex items-center gap-1.5 text-emerald-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    متاح
                  </span>
                }
              />
            </div>

            <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-amber-700 text-sm">
              سيتم التواصل مع المورد بعد إرسال الطلب لتأكيد التفاصيل وموعد التسليم.
            </div>

            {showForm && !submitted && (
              <div ref={formRef} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-[#1a4a5e] to-[#2a6a82] px-5 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                      <Send className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-white font-bold">إرسال طلب الشراء</span>
                  </div>
                  <button
                    onClick={() => setShowForm(false)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} noValidate className="p-5 flex flex-col gap-4">
                  <InputField
                    icon={<User className="w-4 h-4" />}
                    label="الاسم"
                    placeholder="أدخل اسمك الكامل"
                    value={buyerName}
                    onChange={setBuyerName}
                    required
                    error={fieldErrors.buyerName}
                  />
                  <InputField
                    icon={<Phone className="w-4 h-4" />}
                    label="رقم الجوال"
                    type="tel"
                    inputMode="tel"
                    placeholder="05xxxxxxxx"
                    value={buyerPhone}
                    onChange={setBuyerPhone}
                    required
                    error={fieldErrors.buyerPhone}
                  />
                  <InputField
                    icon={<Hash className="w-4 h-4" />}
                    label="الكمية المطلوبة"
                    type="number"
                    inputMode="numeric"
                    placeholder="أدخل الكمية"
                    value={qty}
                    onChange={setQty}
                    required
                    min={1}
                    max={listing.quantity}
                    error={fieldErrors.qty}
                  />
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                      <MessageSquare className="w-4 h-4 text-gray-400" />
                      ملاحظات
                      <span className="text-gray-400 font-normal text-xs">(اختياري)</span>
                    </label>
                    <textarea
                      rows={3}
                      placeholder="أي تفاصيل إضافية تريد إبلاغ المورد بها..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-[#1a4a5e]/30 focus:border-[#1a4a5e] transition-all resize-none"
                    />
                  </div>

                  {submitError && (
                    <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-red-600 text-sm">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {submitError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full flex items-center justify-center gap-2 bg-[#1a4a5e] hover:bg-[#153d50] active:scale-[0.98] disabled:opacity-60 text-white rounded-2xl py-3.5 text-base font-bold transition-all duration-150 shadow-md mt-1"
                  >
                    {submitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        جارٍ الإرسال...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        إرسال الطلب
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}

            {submitted && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-6 py-8 flex flex-col items-center gap-4 text-center shadow-sm">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-emerald-600" />
                </div>
                <div className="flex flex-col gap-1">
                  <p className="text-emerald-800 font-bold text-lg">تم إرسال طلبك بنجاح</p>
                  <p className="text-emerald-600 text-sm">سيتم مراجعة طلبك والتواصل معك قريباً</p>
                </div>
                <button
                  onClick={onBack}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                >
                  <ArrowRight className="w-4 h-4" />
                  العودة للسوق
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {!loading && !error && listing && !showForm && !submitted && (
        <div className="sticky bottom-0 bg-white/90 backdrop-blur-md border-t border-gray-200 px-4 py-4">
          <div className="max-w-2xl mx-auto">
            <button
              onClick={() => setShowForm(true)}
              className="w-full flex items-center justify-center gap-2 bg-[#1a4a5e] hover:bg-[#153d50] active:scale-[0.98] text-white rounded-2xl py-3.5 text-base font-bold transition-all duration-150 shadow-md"
            >
              <ShoppingBag className="w-5 h-5" />
              إرسال طلب
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
