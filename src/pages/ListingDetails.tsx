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
  ShoppingCart,
  User,
  Phone,
  Hash,
  MessageSquare,
  X,
  Zap,
  UserCheck,
  Lock,
  Eye,
  EyeOff,
  LogIn,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useSession } from '../hooks/useSession';

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

interface RegisterForm {
  name: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

function DetailRow({
  icon, label, value, highlight,
}: {
  icon: React.ReactNode; label: string; value: React.ReactNode; highlight?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between py-4 border-b border-gray-100 last:border-0 ${highlight ? 'bg-[#1a4a5e]/5 -mx-5 px-5 rounded-xl' : ''}`}>
      <div className="flex items-center gap-3 text-gray-500">
        <span className="w-8 h-8 rounded-lg bg-[#1a4a5e]/10 flex items-center justify-center text-[#1a4a5e]">{icon}</span>
        <span className="text-sm font-medium">{label}</span>
      </div>
      <div className={`text-sm font-semibold ${highlight ? 'text-[#1a4a5e] text-base' : 'text-gray-700'}`}>{value}</div>
    </div>
  );
}

export default function ListingDetails({ listingId, onBack }: Props) {
  const { session, register, login } = useSession();

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

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'register' | 'login'>('register');
  const [regForm, setRegForm] = useState<RegisterForm>({ name: '', phone: '', password: '', confirmPassword: '' });
  const [loginForm, setLoginForm] = useState({ phone: '', password: '' });
  const [regErrors, setRegErrors] = useState<Partial<RegisterForm>>({});
  const [loginErrors, setLoginErrors] = useState<{ phone?: string; password?: string }>({});
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [pendingAccountSend, setPendingAccountSend] = useState(false);

  const formRef = useRef<HTMLDivElement>(null);

  async function fetchListing() {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from('listings')
      .select('*, city:city_id(name)')
      .eq('id', listingId)
      .maybeSingle();

    if (err) setError('تعذّر تحميل بيانات العرض، يرجى المحاولة مجدداً.');
    else if (!data) setError('العرض غير موجود أو لم يعد متاحاً.');
    else setListing(data as unknown as Listing);
    setLoading(false);
  }

  useEffect(() => { fetchListing(); }, [listingId]);

  useEffect(() => {
    if (showForm && formRef.current) {
      setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    }
  }, [showForm]);

  function validateForm() {
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

  async function saveRequest(requestType: 'quick' | 'account', _userId?: string) {
    setSubmitting(true);
    setSubmitError(null);
    const { error: err } = await supabase.from('purchase_requests').insert({
      listing_id:   listingId,
      buyer_name:   buyerName.trim(),
      buyer_phone:  buyerPhone.replace(/\s/g, ''),
      quantity:     parseInt(qty, 10),
      message:      message.trim() || null,
      request_type: requestType,
      status:       'pending',
    });
    setSubmitting(false);
    if (err) {
      setSubmitError('حدث خطأ أثناء إرسال الطلب، يرجى المحاولة مجدداً.');
      return false;
    }
    return true;
  }

  async function handleQuickSend() {
    if (!validateForm()) return;
    const ok = await saveRequest('quick');
    if (ok) setSubmitted(true);
  }

  async function handleAccountSend() {
    if (!validateForm()) return;
    if (session) {
      const ok = await saveRequest('account', session.profile.id);
      if (ok) setSubmitted(true);
    } else {
      setPendingAccountSend(true);
      setShowAuthModal(true);
    }
  }

  function validateRegister() {
    const errors: Partial<RegisterForm> = {};
    if (!regForm.name.trim()) errors.name = 'يرجى إدخال الاسم';
    const phone = regForm.phone.trim();
    if (!phone) errors.phone = 'يرجى إدخال رقم الجوال';
    else if (!/^05\d{8}$/.test(phone)) errors.phone = 'رقم الجوال غير صحيح (مثال: 05XXXXXXXX)';
    if (!regForm.password) errors.password = 'يرجى إدخال كلمة المرور';
    else if (regForm.password.length < 6) errors.password = 'كلمة المرور 6 أحرف على الأقل';
    if (regForm.confirmPassword !== regForm.password) errors.confirmPassword = 'كلمتا المرور غير متطابقتين';
    setRegErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function validateLogin() {
    const errors: { phone?: string; password?: string } = {};
    const phone = loginForm.phone.trim();
    if (!phone) errors.phone = 'يرجى إدخال رقم الجوال';
    else if (!/^05\d{8}$/.test(phone)) errors.phone = 'رقم الجوال غير صحيح';
    if (!loginForm.password) errors.password = 'يرجى إدخال كلمة المرور';
    setLoginErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleRegisterAndSend() {
    if (!validateRegister()) return;
    setAuthLoading(true);
    setAuthError(null);
    const result = await register({
      phone: regForm.phone.trim(),
      name: regForm.name.trim(),
      userType: 'individual',
      pin: regForm.password,
    });
    if (!result.success || !result.session) {
      setAuthError(result.error ?? 'حدث خطأ أثناء التسجيل.');
      setAuthLoading(false);
      return;
    }
    if (pendingAccountSend) {
      const ok = await saveRequest('account', result.session.profile.id);
      setAuthLoading(false);
      if (ok) { setShowAuthModal(false); setPendingAccountSend(false); setSubmitted(true); }
      else setAuthError('تم إنشاء الحساب، لكن حدث خطأ أثناء حفظ الطلب.');
    } else {
      setAuthLoading(false);
      setShowAuthModal(false);
    }
  }

  async function handleLoginAndSend() {
    if (!validateLogin()) return;
    setAuthLoading(true);
    setAuthError(null);
    const result = await login(loginForm.phone.trim(), loginForm.password);
    if (!result.success || !result.session) {
      setAuthError(result.error ?? 'بيانات الدخول غير صحيحة.');
      setAuthLoading(false);
      return;
    }
    if (pendingAccountSend) {
      const ok = await saveRequest('account', result.session.profile.id);
      setAuthLoading(false);
      if (ok) { setShowAuthModal(false); setPendingAccountSend(false); setSubmitted(true); }
      else setAuthError('تم تسجيل الدخول، لكن حدث خطأ أثناء حفظ الطلب.');
    } else {
      setAuthLoading(false);
      setShowAuthModal(false);
    }
  }

  const condition = listing ? (conditionConfig[listing.condition] ?? { label: listing.condition, bg: 'bg-gray-50', text: 'text-gray-600', dot: 'bg-gray-400' }) : null;
  const palletType = listing ? (palletTypeLabel[listing.pallet_type] ?? listing.pallet_type) : '';

  return (
    <>
      <div className="min-h-screen flex flex-col" dir="rtl" style={{ background: 'linear-gradient(135deg, #eef4f8 0%, #f5f9fc 60%, #eaf2f7 100%)' }}>
        <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm">
          <div className="max-w-2xl mx-auto px-4 h-16 flex items-center gap-3">
            <button onClick={onBack} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors text-[#1a4a5e]">
              <ArrowRight className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-[#1a4a5e] rounded-lg flex items-center justify-center shadow">
                <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none">
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
              <button onClick={fetchListing} className="flex items-center gap-2 bg-[#1a4a5e] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#153d50] transition-colors">
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
                {listing.city && (
                  <DetailRow icon={<MapPin className="w-4 h-4" />} label="المدينة" value={listing.city.name} />
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
                        <ShoppingCart className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-white font-bold">بيانات طلب الشراء</span>
                    </div>
                    <button
                      onClick={() => setShowForm(false)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="p-5 flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                        <User className="w-4 h-4 text-gray-400" />
                        الاسم <span className="text-red-500 text-xs">*</span>
                      </label>
                      <div className={`flex items-center gap-2.5 bg-gray-50 border rounded-xl px-3.5 py-2.5 focus-within:ring-2 focus-within:ring-[#1a4a5e]/30 focus-within:border-[#1a4a5e] transition-all ${fieldErrors.buyerName ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}>
                        <User className="w-4 h-4 text-gray-400 shrink-0" />
                        <input
                          type="text"
                          placeholder="أدخل اسمك الكامل"
                          value={buyerName}
                          onChange={(e) => { setBuyerName(e.target.value); setFieldErrors((p) => ({ ...p, buyerName: '' })); }}
                          className="flex-1 bg-transparent outline-none text-sm text-gray-800 placeholder-gray-400"
                        />
                      </div>
                      {fieldErrors.buyerName && <p className="text-xs text-red-500">{fieldErrors.buyerName}</p>}
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                        <Phone className="w-4 h-4 text-gray-400" />
                        رقم الجوال <span className="text-red-500 text-xs">*</span>
                      </label>
                      <div className={`flex items-center gap-2.5 bg-gray-50 border rounded-xl px-3.5 py-2.5 focus-within:ring-2 focus-within:ring-[#1a4a5e]/30 focus-within:border-[#1a4a5e] transition-all ${fieldErrors.buyerPhone ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}>
                        <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                        <input
                          type="tel"
                          inputMode="tel"
                          placeholder="05xxxxxxxx"
                          value={buyerPhone}
                          onChange={(e) => { setBuyerPhone(e.target.value); setFieldErrors((p) => ({ ...p, buyerPhone: '' })); }}
                          className="flex-1 bg-transparent outline-none text-sm text-gray-800 placeholder-gray-400"
                          dir="ltr"
                        />
                      </div>
                      {fieldErrors.buyerPhone && <p className="text-xs text-red-500">{fieldErrors.buyerPhone}</p>}
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                        <Hash className="w-4 h-4 text-gray-400" />
                        الكمية المطلوبة <span className="text-red-500 text-xs">*</span>
                      </label>
                      <div className={`flex items-center gap-2.5 bg-gray-50 border rounded-xl px-3.5 py-2.5 focus-within:ring-2 focus-within:ring-[#1a4a5e]/30 focus-within:border-[#1a4a5e] transition-all ${fieldErrors.qty ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}>
                        <Hash className="w-4 h-4 text-gray-400 shrink-0" />
                        <input
                          type="number"
                          inputMode="numeric"
                          placeholder="أدخل الكمية"
                          value={qty}
                          min={1}
                          max={listing.quantity}
                          onChange={(e) => { setQty(e.target.value); setFieldErrors((p) => ({ ...p, qty: '' })); }}
                          className="flex-1 bg-transparent outline-none text-sm text-gray-800 placeholder-gray-400"
                        />
                        <span className="text-xs text-gray-400 shrink-0">طبلية</span>
                      </div>
                      {fieldErrors.qty && <p className="text-xs text-red-500">{fieldErrors.qty}</p>}
                    </div>

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

                    <div className="bg-gray-50 rounded-2xl p-4 flex flex-col gap-3 border border-gray-100">
                      <p className="text-xs font-bold text-gray-500 text-center">اختر طريقة الإرسال</p>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={handleQuickSend}
                          disabled={submitting}
                          className="flex flex-col items-center gap-2 bg-white border-2 border-[#1a4a5e]/20 hover:border-[#1a4a5e] hover:bg-[#1a4a5e]/5 active:scale-[0.97] disabled:opacity-60 rounded-2xl py-4 px-3 transition-all group"
                        >
                          {submitting ? (
                            <div className="w-5 h-5 border-2 border-[#1a4a5e] border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Zap className="w-6 h-6 text-amber-500 group-hover:scale-110 transition-transform" />
                          )}
                          <span className="text-xs font-bold text-gray-700">إرسال سريع</span>
                          <span className="text-[10px] text-gray-400 text-center leading-tight">بدون حساب</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleAccountSend}
                          disabled={submitting}
                          className="flex flex-col items-center gap-2 bg-[#1a4a5e] hover:bg-[#153d50] active:scale-[0.97] disabled:opacity-60 rounded-2xl py-4 px-3 transition-all group shadow-md"
                        >
                          {submitting ? (
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <UserCheck className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
                          )}
                          <span className="text-xs font-bold text-white">عبر الحساب</span>
                          <span className="text-[10px] text-white/60 text-center leading-tight">
                            {session ? 'مسجّل دخولك' : 'سجّل أو أنشئ حساب'}
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
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
                <ShoppingCart className="w-5 h-5" />
                بدء طلب شراء
              </button>
            </div>
          </div>
        )}
      </div>

      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" dir="rtl">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { setShowAuthModal(false); setPendingAccountSend(false); }} />
          <div className="relative w-full sm:max-w-md bg-white sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-br from-[#1a4a5e] to-[#2a6a82] px-5 py-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
                  <ShoppingCart className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-white font-bold text-sm">إرسال الطلب عبر الحساب</p>
                  <p className="text-white/60 text-xs mt-0.5">
                    {authMode === 'register' ? 'أنشئ حساباً لمتابعة طلباتك' : 'سجّل دخولك لإرسال الطلب'}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex bg-white/10 rounded-xl p-1 gap-1">
                <button
                  onClick={() => { setAuthMode('register'); setAuthError(null); }}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${authMode === 'register' ? 'bg-white text-[#1a4a5e] shadow' : 'text-white/70 hover:text-white'}`}
                >
                  حساب جديد
                </button>
                <button
                  onClick={() => { setAuthMode('login'); setAuthError(null); }}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${authMode === 'login' ? 'bg-white text-[#1a4a5e] shadow' : 'text-white/70 hover:text-white'}`}
                >
                  تسجيل دخول
                </button>
              </div>
            </div>

            <div className="px-5 py-5 flex flex-col gap-3.5">
              {authError && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  <p className="text-sm text-red-700 font-medium">{authError}</p>
                </div>
              )}

              {authMode === 'register' ? (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-gray-600 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-gray-400" />الاسم
                    </label>
                    <input
                      type="text"
                      value={regForm.name}
                      onChange={(e) => { setRegForm((p) => ({ ...p, name: e.target.value })); setRegErrors((p) => ({ ...p, name: '' })); setAuthError(null); }}
                      placeholder="الاسم الكامل"
                      dir="rtl"
                      className={`w-full bg-gray-50 border rounded-xl px-4 py-3 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-all ${regErrors.name ? 'border-red-300 focus:ring-red-200' : 'border-gray-200 focus:ring-[#1a4a5e]/20 focus:border-[#1a4a5e]'}`}
                    />
                    {regErrors.name && <p className="text-xs text-red-500">{regErrors.name}</p>}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-gray-600 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-gray-400" />رقم الجوال
                    </label>
                    <input
                      type="tel"
                      inputMode="numeric"
                      value={regForm.phone}
                      onChange={(e) => { setRegForm((p) => ({ ...p, phone: e.target.value })); setRegErrors((p) => ({ ...p, phone: '' })); setAuthError(null); }}
                      placeholder="05XXXXXXXX"
                      dir="ltr"
                      className={`w-full bg-gray-50 border rounded-xl px-4 py-3 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-all text-right ${regErrors.phone ? 'border-red-300 focus:ring-red-200' : 'border-gray-200 focus:ring-[#1a4a5e]/20 focus:border-[#1a4a5e]'}`}
                    />
                    {regErrors.phone && <p className="text-xs text-red-500">{regErrors.phone}</p>}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-gray-600 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-gray-400" />كلمة المرور
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={regForm.password}
                        onChange={(e) => { setRegForm((p) => ({ ...p, password: e.target.value })); setRegErrors((p) => ({ ...p, password: '' })); setAuthError(null); }}
                        placeholder="6 أحرف على الأقل"
                        dir="ltr"
                        className={`w-full bg-gray-50 border rounded-xl px-4 py-3 pl-10 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-all ${regErrors.password ? 'border-red-300 focus:ring-red-200' : 'border-gray-200 focus:ring-[#1a4a5e]/20 focus:border-[#1a4a5e]'}`}
                      />
                      <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {regErrors.password && <p className="text-xs text-red-500">{regErrors.password}</p>}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-gray-600 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-gray-400" />تأكيد كلمة المرور
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirm ? 'text' : 'password'}
                        value={regForm.confirmPassword}
                        onChange={(e) => { setRegForm((p) => ({ ...p, confirmPassword: e.target.value })); setRegErrors((p) => ({ ...p, confirmPassword: '' })); setAuthError(null); }}
                        placeholder="أعد إدخال كلمة المرور"
                        dir="ltr"
                        className={`w-full bg-gray-50 border rounded-xl px-4 py-3 pl-10 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-all ${regErrors.confirmPassword ? 'border-red-300 focus:ring-red-200' : 'border-gray-200 focus:ring-[#1a4a5e]/20 focus:border-[#1a4a5e]'}`}
                      />
                      <button type="button" onClick={() => setShowConfirm((v) => !v)} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {regErrors.confirmPassword && <p className="text-xs text-red-500">{regErrors.confirmPassword}</p>}
                  </div>
                  <button
                    onClick={handleRegisterAndSend}
                    disabled={authLoading}
                    className="w-full flex items-center justify-center gap-2 bg-[#1a4a5e] hover:bg-[#153d50] disabled:opacity-60 text-white py-3.5 rounded-2xl text-sm font-bold transition-all active:scale-[0.98] mt-1"
                  >
                    {authLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <UserCheck className="w-4 h-4" />}
                    إنشاء الحساب وإرسال الطلب
                  </button>
                  <p className="text-center text-xs text-gray-400 pb-1">بالتسجيل، أنت توافق على شروط استخدام المنصة</p>
                </>
              ) : (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-gray-600 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-gray-400" />رقم الجوال
                    </label>
                    <input
                      type="tel"
                      inputMode="numeric"
                      value={loginForm.phone}
                      onChange={(e) => { setLoginForm((p) => ({ ...p, phone: e.target.value })); setLoginErrors((p) => ({ ...p, phone: undefined })); setAuthError(null); }}
                      placeholder="05XXXXXXXX"
                      dir="ltr"
                      className={`w-full bg-gray-50 border rounded-xl px-4 py-3 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-all text-right ${loginErrors.phone ? 'border-red-300 focus:ring-red-200' : 'border-gray-200 focus:ring-[#1a4a5e]/20 focus:border-[#1a4a5e]'}`}
                    />
                    {loginErrors.phone && <p className="text-xs text-red-500">{loginErrors.phone}</p>}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-gray-600 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-gray-400" />كلمة المرور
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={loginForm.password}
                        onChange={(e) => { setLoginForm((p) => ({ ...p, password: e.target.value })); setLoginErrors((p) => ({ ...p, password: undefined })); setAuthError(null); }}
                        placeholder="أدخل كلمة المرور"
                        dir="ltr"
                        className={`w-full bg-gray-50 border rounded-xl px-4 py-3 pl-10 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-all ${loginErrors.password ? 'border-red-300 focus:ring-red-200' : 'border-gray-200 focus:ring-[#1a4a5e]/20 focus:border-[#1a4a5e]'}`}
                      />
                      <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {loginErrors.password && <p className="text-xs text-red-500">{loginErrors.password}</p>}
                  </div>
                  <button
                    onClick={handleLoginAndSend}
                    disabled={authLoading}
                    className="w-full flex items-center justify-center gap-2 bg-[#1a4a5e] hover:bg-[#153d50] disabled:opacity-60 text-white py-3.5 rounded-2xl text-sm font-bold transition-all active:scale-[0.98] mt-1"
                  >
                    {authLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <LogIn className="w-4 h-4" />}
                    تسجيل الدخول وإرسال الطلب
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
