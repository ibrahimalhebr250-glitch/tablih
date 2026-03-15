import { useEffect, useState } from 'react';
import {
  ArrowRight,
  Box,
  MapPin,
  Banknote,
  Package,
  CheckCircle,
  User,
  Phone,
  Lock,
  Eye,
  EyeOff,
  Layers,
  Weight,
  ChevronDown,
  LogIn,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useSession } from '../hooks/useSession';

interface City {
  id: string;
  name: string;
}

interface ListingForm {
  pallet_type: string;
  size: string;
  condition: string;
  city_id: string;
  quantity: string;
  price: string;
}

interface RegisterForm {
  name: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

interface ListingFieldErrors {
  pallet_type?: string;
  size?: string;
  condition?: string;
  city_id?: string;
  quantity?: string;
  price?: string;
}

interface RegisterFieldErrors {
  name?: string;
  phone?: string;
  password?: string;
  confirmPassword?: string;
}

const PALLET_TYPES = [
  { value: 'wooden',    label: 'خشبية' },
  { value: 'plastic',   label: 'بلاستيكية' },
  { value: 'metal',     label: 'معدنية' },
  { value: 'cardboard', label: 'كرتونية' },
];

const PALLET_SIZES = [
  { value: '120x80',  label: '120×80 سم' },
  { value: '120x100', label: '120×100 سم' },
  { value: '120x120', label: '120×120 سم' },
  { value: '80x60',   label: '80×60 سم' },
  { value: 'other',   label: 'أخرى' },
];

const PALLET_CONDITIONS = [
  { value: 'new',     label: 'جديد' },
  { value: 'good',    label: 'جيد' },
  { value: 'used',    label: 'مستعمل' },
  { value: 'damaged', label: 'تالف' },
];

interface SelectFieldProps {
  label: string;
  icon: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
  error?: string;
}

function SelectField({ label, icon, value, onChange, options, placeholder, error }: SelectFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-gray-600 flex items-center gap-1.5">
        {icon}
        {label}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full appearance-none bg-gray-50 border rounded-xl px-4 py-3 text-sm text-gray-800 focus:outline-none focus:ring-2 transition-all pr-10 ${
            error
              ? 'border-red-300 focus:ring-red-200'
              : 'border-gray-200 focus:ring-[#1a4a5e]/20 focus:border-[#1a4a5e]'
          } ${!value ? 'text-gray-400' : ''}`}
        >
          <option value="">{placeholder}</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      </div>
      {error && <p className="text-xs text-red-500 flex items-center gap-1">{error}</p>}
    </div>
  );
}

interface InputFieldProps {
  label: string;
  icon: React.ReactNode;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  error?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
  suffix?: string;
  rightSlot?: React.ReactNode;
}

function InputField({ label, icon, type = 'text', value, onChange, placeholder, error, inputMode, suffix, rightSlot }: InputFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-gray-600 flex items-center gap-1.5">
        {icon}
        {label}
      </label>
      <div className="relative">
        <input
          type={type}
          inputMode={inputMode}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full bg-gray-50 border rounded-xl px-4 py-3 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-all ${
            error
              ? 'border-red-300 focus:ring-red-200'
              : 'border-gray-200 focus:ring-[#1a4a5e]/20 focus:border-[#1a4a5e]'
          } ${suffix ? 'pl-14' : ''} ${rightSlot ? 'pl-10' : ''}`}
          dir="rtl"
        />
        {suffix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400">{suffix}</span>
        )}
        {rightSlot && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2">{rightSlot}</span>
        )}
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

interface Props {
  onBack: () => void;
  onSuccess: () => void;
}

export default function CreateListing({ onBack, onSuccess }: Props) {
  const { session, loading: sessionLoading, register, login } = useSession();

  const [cities, setCities] = useState<City[]>([]);
  const [citiesLoading, setCitiesLoading] = useState(true);

  const [form, setForm] = useState<ListingForm>({
    pallet_type: '',
    size: '',
    condition: '',
    city_id: '',
    quantity: '',
    price: '',
  });
  const [fieldErrors, setFieldErrors] = useState<ListingFieldErrors>({});

  const [showRegister, setShowRegister] = useState(false);
  const [authMode, setAuthMode] = useState<'register' | 'login'>('register');
  const [regForm, setRegForm] = useState<RegisterForm>({ name: '', phone: '', password: '', confirmPassword: '' });
  const [loginForm, setLoginForm] = useState({ phone: '', password: '' });
  const [regErrors, setRegErrors] = useState<RegisterFieldErrors>({});
  const [loginErrors, setLoginErrors] = useState<{ phone?: string; password?: string }>({});
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [submitLoading, setSubmitLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    supabase
      .from('cities')
      .select('id, name')
      .order('name')
      .then(({ data }) => {
        setCities((data as City[]) ?? []);
        setCitiesLoading(false);
      });
  }, []);

  function setField(key: keyof ListingForm, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function validateListing(): boolean {
    const errors: ListingFieldErrors = {};
    if (!form.pallet_type) errors.pallet_type = 'يرجى اختيار نوع الطبلية';
    if (!form.size)         errors.size        = 'يرجى اختيار المقاس';
    if (!form.condition)    errors.condition   = 'يرجى اختيار الحالة';
    if (!form.city_id)      errors.city_id     = 'يرجى اختيار المدينة';
    const qty = parseInt(form.quantity, 10);
    if (!form.quantity || isNaN(qty) || qty <= 0) errors.quantity = 'يرجى إدخال كمية صحيحة';
    const price = parseFloat(form.price);
    if (!form.price || isNaN(price) || price <= 0) errors.price = 'يرجى إدخال سعر صحيح';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function saveListing(userId: string) {
    const { error } = await supabase.from('listings').insert({
      supplier_id: userId,
      pallet_type: form.pallet_type,
      size: form.size,
      condition: form.condition,
      city_id: form.city_id || null,
      quantity: parseInt(form.quantity, 10),
      price: parseFloat(form.price),
      status: 'active',
    });
    return error;
  }

  async function handleSubmit() {
    if (!validateListing()) return;
    if (sessionLoading) return;
    setShowRegister(true);
  }

  function setRegField(key: keyof RegisterForm, value: string) {
    setRegForm((prev) => ({ ...prev, [key]: value }));
    setRegErrors((prev) => ({ ...prev, [key]: undefined }));
    setRegError(null);
  }

  function validateRegister(): boolean {
    const errors: RegisterFieldErrors = {};
    if (!regForm.name.trim())  errors.name = 'يرجى إدخال الاسم';
    const phone = regForm.phone.trim();
    if (!phone) errors.phone = 'يرجى إدخال رقم الجوال';
    else if (!/^05\d{8}$/.test(phone)) errors.phone = 'رقم الجوال غير صحيح (مثال: 05XXXXXXXX)';
    if (!regForm.password) errors.password = 'يرجى إدخال كلمة المرور';
    else if (regForm.password.length < 6) errors.password = 'كلمة المرور يجب أن تكون 6 أحرف على الأقل';
    if (!regForm.confirmPassword) errors.confirmPassword = 'يرجى تأكيد كلمة المرور';
    else if (regForm.confirmPassword !== regForm.password) errors.confirmPassword = 'كلمتا المرور غير متطابقتين';
    setRegErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleRegisterAndSave() {
    if (!validateRegister()) return;
    setRegLoading(true);
    setRegError(null);

    const result = await register({
      phone: regForm.phone.trim(),
      name: regForm.name.trim(),
      userType: 'individual',
      pin: regForm.password,
    });

    if (!result.success || !result.session) {
      setRegError(result.error ?? 'حدث خطأ أثناء التسجيل. يرجى المحاولة مرة أخرى.');
      setRegLoading(false);
      return;
    }

    const error = await saveListing(result.session.profile.id);
    setRegLoading(false);

    if (error) {
      setRegError('تم إنشاء الحساب، لكن حدث خطأ أثناء حفظ العرض. يرجى المحاولة مرة أخرى.');
      return;
    }

    setShowRegister(false);
    setDone(true);
  }

  function validateLogin(): boolean {
    const errors: { phone?: string; password?: string } = {};
    const phone = loginForm.phone.trim();
    if (!phone) errors.phone = 'يرجى إدخال رقم الجوال';
    else if (!/^05\d{8}$/.test(phone)) errors.phone = 'رقم الجوال غير صحيح (مثال: 05XXXXXXXX)';
    if (!loginForm.password) errors.password = 'يرجى إدخال كلمة المرور';
    setLoginErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleLoginAndSave() {
    if (!validateLogin()) return;
    setRegLoading(true);
    setRegError(null);

    const result = await login(loginForm.phone.trim(), loginForm.password);

    if (!result.success || !result.session) {
      setRegError(result.error ?? 'بيانات الدخول غير صحيحة. يرجى المحاولة مرة أخرى.');
      setRegLoading(false);
      return;
    }

    const error = await saveListing(result.session.profile.id);
    setRegLoading(false);

    if (error) {
      setRegError('تم تسجيل الدخول، لكن حدث خطأ أثناء حفظ العرض. يرجى المحاولة مرة أخرى.');
      return;
    }

    setShowRegister(false);
    setDone(true);
  }

  if (done) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 gap-6" dir="rtl" style={{ background: 'linear-gradient(135deg, #eef4f8 0%, #f5f9fc 60%, #eaf2f7 100%)' }}>
        <div className="w-20 h-20 bg-emerald-100 rounded-3xl flex items-center justify-center shadow-lg">
          <CheckCircle className="w-10 h-10 text-emerald-600" />
        </div>
        <div className="text-center flex flex-col gap-2">
          <h2 className="text-xl font-bold text-gray-800">تم الحفظ بنجاح!</h2>
          <p className="text-gray-500 text-sm leading-relaxed max-w-xs">
            تم حفظ عرض الطبليات بنجاح، وهو الآن ظاهر في سوق الطبليات.
          </p>
        </div>
        <button
          onClick={onSuccess}
          className="bg-[#1a4a5e] hover:bg-[#153d50] text-white px-8 py-3.5 rounded-2xl text-sm font-bold transition-all active:scale-[0.98] shadow-md"
        >
          العودة إلى السوق
        </button>
      </div>
    );
  }

  return (
    <>
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
                <Box className="w-4 h-4 text-white" />
              </div>
              <span className="text-[#1a4a5e] font-bold text-base">نشر عرض طبليات</span>
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6 flex flex-col gap-5">
          <div className="bg-gradient-to-br from-[#1a4a5e] to-[#2a6a82] rounded-2xl px-5 py-4 flex items-start gap-3">
            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
              <Box className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-sm">أضف عرض الطبليات</p>
              <p className="text-white/60 text-xs mt-0.5 leading-relaxed">
                املأ التفاصيل أدناه لنشر عرضك في سوق الطبليات
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">تفاصيل الطبلية</p>

            <SelectField
              label="نوع الطبلية"
              icon={<Box className="w-3.5 h-3.5 text-gray-400" />}
              value={form.pallet_type}
              onChange={(v) => setField('pallet_type', v)}
              options={PALLET_TYPES}
              placeholder="اختر نوع الطبلية"
              error={fieldErrors.pallet_type}
            />

            <SelectField
              label="المقاس"
              icon={<Layers className="w-3.5 h-3.5 text-gray-400" />}
              value={form.size}
              onChange={(v) => setField('size', v)}
              options={PALLET_SIZES}
              placeholder="اختر المقاس"
              error={fieldErrors.size}
            />

            <SelectField
              label="الحالة"
              icon={<Weight className="w-3.5 h-3.5 text-gray-400" />}
              value={form.condition}
              onChange={(v) => setField('condition', v)}
              options={PALLET_CONDITIONS}
              placeholder="اختر الحالة"
              error={fieldErrors.condition}
            />
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">الكمية والسعر</p>

            <InputField
              label="عدد الطبليات"
              icon={<Package className="w-3.5 h-3.5 text-gray-400" />}
              value={form.quantity}
              onChange={(v) => setField('quantity', v)}
              placeholder="مثال: 50"
              inputMode="numeric"
              suffix="طبلية"
              error={fieldErrors.quantity}
            />

            <InputField
              label="السعر للطبلية الواحدة"
              icon={<Banknote className="w-3.5 h-3.5 text-gray-400" />}
              value={form.price}
              onChange={(v) => setField('price', v)}
              placeholder="مثال: 25"
              inputMode="decimal"
              suffix="ر.س"
              error={fieldErrors.price}
            />
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">الموقع</p>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-600 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-gray-400" />
                المدينة
              </label>
              <div className="relative">
                <select
                  value={form.city_id}
                  onChange={(e) => setField('city_id', e.target.value)}
                  disabled={citiesLoading}
                  className={`w-full appearance-none bg-gray-50 border rounded-xl px-4 py-3 text-sm text-gray-800 focus:outline-none focus:ring-2 transition-all pr-10 ${
                    fieldErrors.city_id
                      ? 'border-red-300 focus:ring-red-200'
                      : 'border-gray-200 focus:ring-[#1a4a5e]/20 focus:border-[#1a4a5e]'
                  } ${!form.city_id ? 'text-gray-400' : ''}`}
                >
                  <option value="">اختر المدينة</option>
                  {cities.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
              {fieldErrors.city_id && <p className="text-xs text-red-500">{fieldErrors.city_id}</p>}
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={submitLoading || sessionLoading}
            className="w-full flex items-center justify-center gap-2.5 bg-[#1a4a5e] hover:bg-[#153d50] disabled:opacity-60 text-white py-4 rounded-2xl text-sm font-bold transition-all active:scale-[0.98] shadow-md"
          >
            {(submitLoading || sessionLoading) ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Box className="w-5 h-5" />
            )}
            نشر عرض الطبليات
          </button>
        </main>
      </div>

      {showRegister && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" dir="rtl">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowRegister(false)} />
          <div className="relative w-full sm:max-w-md bg-white sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-br from-[#1a4a5e] to-[#2a6a82] px-5 py-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
                  <Box className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-white font-bold text-sm">نشر عرض الطبليات</p>
                  <p className="text-white/60 text-xs mt-0.5">
                    {authMode === 'register' ? 'أنشئ حساباً لنشر عرضك ومتابعة الطلبات' : 'سجّل دخولك لنشر عرضك'}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex bg-white/10 rounded-xl p-1 gap-1">
                <button
                  onClick={() => { setAuthMode('register'); setRegError(null); }}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${authMode === 'register' ? 'bg-white text-[#1a4a5e] shadow' : 'text-white/70 hover:text-white'}`}
                >
                  حساب جديد
                </button>
                <button
                  onClick={() => { setAuthMode('login'); setRegError(null); }}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${authMode === 'login' ? 'bg-white text-[#1a4a5e] shadow' : 'text-white/70 hover:text-white'}`}
                >
                  تسجيل دخول
                </button>
              </div>
            </div>

            <div className="px-5 py-5 flex flex-col gap-3.5">
              {regError && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  <p className="text-sm text-red-700 font-medium">{regError}</p>
                </div>
              )}

              {authMode === 'register' ? (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-gray-600 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-gray-400" />
                      الاسم
                    </label>
                    <input
                      type="text"
                      value={regForm.name}
                      onChange={(e) => setRegField('name', e.target.value)}
                      placeholder="الاسم الكامل"
                      dir="rtl"
                      className={`w-full bg-gray-50 border rounded-xl px-4 py-3 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-all ${
                        regErrors.name ? 'border-red-300 focus:ring-red-200' : 'border-gray-200 focus:ring-[#1a4a5e]/20 focus:border-[#1a4a5e]'
                      }`}
                    />
                    {regErrors.name && <p className="text-xs text-red-500">{regErrors.name}</p>}
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-gray-600 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-gray-400" />
                      رقم الجوال
                    </label>
                    <input
                      type="tel"
                      inputMode="numeric"
                      value={regForm.phone}
                      onChange={(e) => setRegField('phone', e.target.value)}
                      placeholder="05XXXXXXXX"
                      dir="ltr"
                      className={`w-full bg-gray-50 border rounded-xl px-4 py-3 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-all text-right ${
                        regErrors.phone ? 'border-red-300 focus:ring-red-200' : 'border-gray-200 focus:ring-[#1a4a5e]/20 focus:border-[#1a4a5e]'
                      }`}
                    />
                    {regErrors.phone && <p className="text-xs text-red-500">{regErrors.phone}</p>}
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-gray-600 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-gray-400" />
                      كلمة المرور
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={regForm.password}
                        onChange={(e) => setRegField('password', e.target.value)}
                        placeholder="6 أحرف على الأقل"
                        dir="ltr"
                        className={`w-full bg-gray-50 border rounded-xl px-4 py-3 pl-10 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-all ${
                          regErrors.password ? 'border-red-300 focus:ring-red-200' : 'border-gray-200 focus:ring-[#1a4a5e]/20 focus:border-[#1a4a5e]'
                        }`}
                      />
                      <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {regErrors.password && <p className="text-xs text-red-500">{regErrors.password}</p>}
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-gray-600 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-gray-400" />
                      تأكيد كلمة المرور
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirm ? 'text' : 'password'}
                        value={regForm.confirmPassword}
                        onChange={(e) => setRegField('confirmPassword', e.target.value)}
                        placeholder="أعد إدخال كلمة المرور"
                        dir="ltr"
                        className={`w-full bg-gray-50 border rounded-xl px-4 py-3 pl-10 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-all ${
                          regErrors.confirmPassword ? 'border-red-300 focus:ring-red-200' : 'border-gray-200 focus:ring-[#1a4a5e]/20 focus:border-[#1a4a5e]'
                        }`}
                      />
                      <button type="button" onClick={() => setShowConfirm((v) => !v)} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {regErrors.confirmPassword && <p className="text-xs text-red-500">{regErrors.confirmPassword}</p>}
                  </div>

                  <button
                    onClick={handleRegisterAndSave}
                    disabled={regLoading}
                    className="w-full flex items-center justify-center gap-2 bg-[#1a4a5e] hover:bg-[#153d50] disabled:opacity-60 text-white py-3.5 rounded-2xl text-sm font-bold transition-all active:scale-[0.98] mt-1"
                  >
                    {regLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    إنشاء الحساب ونشر العرض
                  </button>

                  <p className="text-center text-xs text-gray-400 pb-1">
                    بالتسجيل، أنت توافق على شروط استخدام المنصة
                  </p>
                </>
              ) : (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-gray-600 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-gray-400" />
                      رقم الجوال
                    </label>
                    <input
                      type="tel"
                      inputMode="numeric"
                      value={loginForm.phone}
                      onChange={(e) => { setLoginForm((p) => ({ ...p, phone: e.target.value })); setLoginErrors((p) => ({ ...p, phone: undefined })); setRegError(null); }}
                      placeholder="05XXXXXXXX"
                      dir="ltr"
                      className={`w-full bg-gray-50 border rounded-xl px-4 py-3 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-all text-right ${
                        loginErrors.phone ? 'border-red-300 focus:ring-red-200' : 'border-gray-200 focus:ring-[#1a4a5e]/20 focus:border-[#1a4a5e]'
                      }`}
                    />
                    {loginErrors.phone && <p className="text-xs text-red-500">{loginErrors.phone}</p>}
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-gray-600 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-gray-400" />
                      كلمة المرور
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={loginForm.password}
                        onChange={(e) => { setLoginForm((p) => ({ ...p, password: e.target.value })); setLoginErrors((p) => ({ ...p, password: undefined })); setRegError(null); }}
                        placeholder="أدخل كلمة المرور"
                        dir="ltr"
                        className={`w-full bg-gray-50 border rounded-xl px-4 py-3 pl-10 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-all ${
                          loginErrors.password ? 'border-red-300 focus:ring-red-200' : 'border-gray-200 focus:ring-[#1a4a5e]/20 focus:border-[#1a4a5e]'
                        }`}
                      />
                      <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {loginErrors.password && <p className="text-xs text-red-500">{loginErrors.password}</p>}
                  </div>

                  <button
                    onClick={handleLoginAndSave}
                    disabled={regLoading}
                    className="w-full flex items-center justify-center gap-2 bg-[#1a4a5e] hover:bg-[#153d50] disabled:opacity-60 text-white py-3.5 rounded-2xl text-sm font-bold transition-all active:scale-[0.98] mt-1"
                  >
                    {regLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <LogIn className="w-4 h-4" />}
                    تسجيل الدخول ونشر العرض
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
