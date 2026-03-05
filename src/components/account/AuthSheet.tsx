import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Phone, Lock, User, Building2, CircleUser as UserCircle, ArrowLeft } from 'lucide-react';
import PinPad from './PinPad';

interface Props {
  onRegisterComplete: (data: { phone: string; name: string; userType: 'company' | 'individual'; pin: string }) => void | Promise<void>;
  onLoginComplete: (phone: string, pin: string) => void | Promise<void>;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  externalError?: string;
}

type Mode = 'choose' | 'register' | 'login';
type RegisterStep = 'type' | 'info' | 'pin' | 'confirmPin';
type LoginStep = 'phone' | 'pin';

export default function AuthSheet({ onRegisterComplete, onLoginComplete, onClose, title, subtitle, externalError }: Props) {
  const [mode, setMode] = useState<Mode>('choose');

  const [regStep, setRegStep] = useState<RegisterStep>('type');
  const [userType, setUserType] = useState<'company' | 'individual' | null>(null);
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPin, setRegPin] = useState(['', '', '', '']);
  const [regConfirmPin, setRegConfirmPin] = useState(['', '', '', '']);

  const [loginStep, setLoginStep] = useState<LoginStep>('phone');
  const [loginPhone, setLoginPhone] = useState('');
  const [loginPin, setLoginPin] = useState(['', '', '', '']);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [dismissedExternalError, setDismissedExternalError] = useState('');

  const resetAll = () => {
    setError('');
    setLoading(false);
    if (externalError) setDismissedExternalError(externalError);
  };

  const goBack = () => {
    setError('');
    setLoading(false);
    if (externalError) setDismissedExternalError(externalError);
    if (mode === 'register') {
      if (regStep === 'type') { setMode('choose'); return; }
      if (regStep === 'info') { setRegStep('type'); return; }
      if (regStep === 'pin') { setRegStep('info'); return; }
      if (regStep === 'confirmPin') { setRegConfirmPin(['', '', '', '']); setRegStep('pin'); return; }
    }
    if (mode === 'login') {
      if (loginStep === 'phone') { setMode('choose'); return; }
      if (loginStep === 'pin') { setLoginPin(['', '', '', '']); setLoginStep('phone'); return; }
    }
  };

  const showBack = mode !== 'choose';

  const handleRegInfoSubmit = () => {
    if (!regName.trim()) {
      setError(userType === 'company' ? 'يرجى إدخال اسم الشركة' : 'يرجى إدخال الاسم');
      return;
    }
    const cleaned = regPhone.replace(/\D/g, '');
    if (cleaned.length < 9) {
      setError('يرجى إدخال رقم جوال سعودي صحيح');
      return;
    }
    setError('');
    setRegStep('pin');
  };

  const handleRegPinDigit = (digit: string) => {
    const idx = regPin.findIndex((d) => d === '');
    if (idx === -1) return;
    const next = [...regPin];
    next[idx] = digit;
    setRegPin(next);
    setError('');
    if (next.every((d) => d !== '')) {
      setTimeout(() => { setRegStep('confirmPin'); setError(''); }, 200);
    }
  };

  const handleRegPinDelete = () => {
    const lastFilled = regPin.map((d, i) => (d !== '' ? i : -1)).filter((i) => i !== -1);
    if (lastFilled.length === 0) return;
    const next = [...regPin];
    next[lastFilled[lastFilled.length - 1]] = '';
    setRegPin(next);
    setError('');
  };

  const handleRegConfirmDigit = (digit: string) => {
    const idx = regConfirmPin.findIndex((d) => d === '');
    if (idx === -1) return;
    const next = [...regConfirmPin];
    next[idx] = digit;
    setRegConfirmPin(next);
    setError('');
    if (next.every((d) => d !== '')) {
      const pinStr = regPin.join('');
      const cPinStr = next.join('');
      if (pinStr !== cPinStr) {
        setError('الرقم السري غير متطابق');
        setRegConfirmPin(['', '', '', '']);
        return;
      }
      setLoading(true);
      const formatted = regPhone.replace(/\D/g, '');
      const final = formatted.startsWith('0') ? formatted : `0${formatted}`;
      Promise.resolve(onRegisterComplete({ phone: final, name: regName.trim(), userType: userType!, pin: pinStr }))
        .catch((err) => {
          setError(err?.message || 'حدث خطأ أثناء التسجيل');
          setRegConfirmPin(['', '', '', '']);
          setLoading(false);
        });
    }
  };

  const handleRegConfirmDelete = () => {
    const lastFilled = regConfirmPin.map((d, i) => (d !== '' ? i : -1)).filter((i) => i !== -1);
    if (lastFilled.length === 0) return;
    const next = [...regConfirmPin];
    next[lastFilled[lastFilled.length - 1]] = '';
    setRegConfirmPin(next);
    setError('');
  };

  const handleLoginPhoneSubmit = () => {
    const cleaned = loginPhone.replace(/\D/g, '');
    if (cleaned.length < 9) {
      setError('يرجى إدخال رقم جوال سعودي صحيح');
      return;
    }
    setError('');
    setLoginStep('pin');
  };

  const handleLoginPinDigit = (digit: string) => {
    const idx = loginPin.findIndex((d) => d === '');
    if (idx === -1) return;
    const next = [...loginPin];
    next[idx] = digit;
    setLoginPin(next);
    setError('');
    if (next.every((d) => d !== '')) {
      setLoading(true);
      const formatted = loginPhone.replace(/\D/g, '');
      const final = formatted.startsWith('0') ? formatted : `0${formatted}`;
      Promise.resolve(onLoginComplete(final, next.join('')))
        .catch((err) => {
          setError(err?.message || 'حدث خطأ أثناء تسجيل الدخول');
          setLoginPin(['', '', '', '']);
          setLoading(false);
        });
    }
  };

  const handleLoginPinDelete = () => {
    const lastFilled = loginPin.map((d, i) => (d !== '' ? i : -1)).filter((i) => i !== -1);
    if (lastFilled.length === 0) return;
    const next = [...loginPin];
    next[lastFilled[lastFilled.length - 1]] = '';
    setLoginPin(next);
    setError('');
  };

  const activeExternalError = externalError && externalError !== dismissedExternalError ? externalError : '';
  const displayError = activeExternalError || error;

  useEffect(() => {
    if (externalError && externalError !== dismissedExternalError) {
      setDismissedExternalError('');
      setLoading(false);
      if (mode === 'login') {
        setLoginPin(['', '', '', '']);
      }
      if (mode === 'register' && regStep === 'confirmPin') {
        setRegConfirmPin(['', '', '', '']);
      }
    }
  }, [externalError]);

  const regNameRef = useRef<HTMLInputElement>(null);
  const loginPhoneRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (mode === 'register' && regStep === 'info' && regNameRef.current) {
      const t = setTimeout(() => regNameRef.current?.focus(), 150);
      return () => clearTimeout(t);
    }
  }, [mode, regStep]);

  useEffect(() => {
    if (mode === 'login' && loginStep === 'phone' && loginPhoneRef.current) {
      const t = setTimeout(() => loginPhoneRef.current?.focus(), 150);
      return () => clearTimeout(t);
    }
  }, [mode, loginStep]);

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex flex-col items-end lg:items-center justify-end lg:justify-center"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)', overflow: 'hidden' }}
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-t-3xl lg:rounded-3xl lg:max-w-[520px] w-full slide-up flex flex-col"
        style={{ maxHeight: '90dvh', overflow: 'hidden' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        <div className="absolute top-3 left-4 right-4 flex justify-between z-10">
          {showBack ? (
            <button onClick={goBack} className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
              <ArrowLeft className="w-4 h-4 text-gray-500 rotate-180" />
            </button>
          ) : <div />}
          <button onClick={onClose} className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="px-5 pt-5 pb-6 overflow-y-auto flex-1" style={{ overscrollBehavior: 'contain' }}>
          {mode === 'choose' && (
            <>
              <div className="flex flex-col items-center mb-5">
                <div className="w-12 h-12 bg-[#EBF5FF] rounded-2xl flex items-center justify-center mb-3 shadow-sm">
                  <User className="w-6 h-6 text-[#2196F3]" />
                </div>
                <h3 className="text-[16px] font-bold text-[#1a4a5e] text-center mb-1">
                  {title || 'تسجيل الدخول مطلوب'}
                </h3>
                <p className="text-[12px] text-[#7a9aab] text-center leading-relaxed">
                  {subtitle || 'سجّل دخولك أو أنشئ حساباً جديداً للمتابعة'}
                </p>
              </div>

              <div className="space-y-2.5">
                <button
                  onClick={() => { resetAll(); setMode('login'); }}
                  className="w-full py-3.5 rounded-2xl bg-[#1a4a5e] text-white font-bold text-[14px] flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition-transform"
                >
                  تسجيل الدخول
                </button>
                <button
                  onClick={() => { resetAll(); setMode('register'); }}
                  className="w-full py-3.5 rounded-2xl bg-white border-2 border-[#1a4a5e] text-[#1a4a5e] font-bold text-[14px] flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                >
                  إنشاء حساب جديد
                </button>
              </div>
            </>
          )}

          {mode === 'register' && regStep === 'type' && (
            <>
              <div className="flex flex-col items-center mb-4">
                <h3 className="text-[16px] font-bold text-[#1a4a5e] text-center">نوع الحساب</h3>
                <p className="text-[11px] text-[#7a9aab] text-center mt-1">اختر نوع حسابك</p>
              </div>
              <div className="space-y-2.5">
                <button
                  onClick={() => { setUserType('company'); setRegStep('info'); }}
                  className="w-full flex items-center gap-3 p-3.5 rounded-2xl border-2 border-gray-100 bg-gray-50/50 hover:border-[#2196F3] active:scale-[0.98] transition-all"
                >
                  <div className="w-10 h-10 bg-[#EBF5FF] rounded-xl flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-5 h-5 text-[#2196F3]" />
                  </div>
                  <div className="text-right flex-1">
                    <p className="text-[13px] font-bold text-[#1a4a5e]">شركة / منشأة</p>
                    <p className="text-[10px] text-[#7a9aab]">حساب تجاري</p>
                  </div>
                </button>
                <button
                  onClick={() => { setUserType('individual'); setRegStep('info'); }}
                  className="w-full flex items-center gap-3 p-3.5 rounded-2xl border-2 border-gray-100 bg-gray-50/50 hover:border-[#27AE60] active:scale-[0.98] transition-all"
                >
                  <div className="w-10 h-10 bg-[#E8F8F0] rounded-xl flex items-center justify-center flex-shrink-0">
                    <UserCircle className="w-5 h-5 text-[#27AE60]" />
                  </div>
                  <div className="text-right flex-1">
                    <p className="text-[13px] font-bold text-[#1a4a5e]">فرد / شخصي</p>
                    <p className="text-[10px] text-[#7a9aab]">حساب شخصي</p>
                  </div>
                </button>
              </div>
            </>
          )}

          {mode === 'register' && regStep === 'info' && (
            <>
              <div className="flex flex-col items-center mb-4">
                <h3 className="text-[16px] font-bold text-[#1a4a5e] text-center">البيانات الأساسية</h3>
              </div>
              <div className="space-y-3 mb-4">
                <div>
                  <label className="block text-[12px] font-bold text-[#1a4a5e] mb-1.5 text-right">
                    {userType === 'company' ? 'اسم الشركة' : 'الاسم'}
                  </label>
                  <input
                    ref={regNameRef}
                    type="text"
                    value={regName}
                    onChange={(e) => { setRegName(e.target.value); setError(''); }}
                    placeholder={userType === 'company' ? 'اسم المنشأة' : 'الاسم الكامل'}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-gray-50 text-right text-[14px] font-medium outline-none focus:border-[#2196F3] focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-bold text-[#1a4a5e] mb-1.5 text-right">رقم الجوال</label>
                  <div className="relative">
                    <input
                      type="tel"
                      value={regPhone}
                      onChange={(e) => { setRegPhone(e.target.value); setError(''); }}
                      onKeyDown={(e) => e.key === 'Enter' && handleRegInfoSubmit()}
                      placeholder="05XXXXXXXX"
                      className="w-full pr-20 pl-4 py-3 rounded-xl border-2 border-gray-200 bg-gray-50 text-right text-[14px] font-medium outline-none focus:border-[#2196F3] focus:bg-white"
                      dir="ltr"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none flex items-center gap-1">
                      <Phone className="w-4 h-4 text-gray-300" />
                      <span className="text-[11px] text-gray-400">+966</span>
                    </div>
                  </div>
                </div>
              </div>
              {displayError && (
                <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-2 mb-3">
                  <p className="text-[12px] text-red-500 text-right">{displayError}</p>
                </div>
              )}
              <button
                onClick={handleRegInfoSubmit}
                className="w-full py-3.5 rounded-2xl bg-[#1a4a5e] text-white font-bold text-[14px] active:scale-[0.98] transition-transform"
              >
                متابعة
              </button>
            </>
          )}

          {mode === 'register' && regStep === 'pin' && (
            <>
              <div className="flex flex-col items-center mb-3">
                <div className="w-10 h-10 bg-[#FFF8E1] rounded-full flex items-center justify-center mb-2">
                  <Lock className="w-5 h-5 text-[#F59E0B]" />
                </div>
              </div>
              <PinPad
                pin={regPin}
                onDigit={handleRegPinDigit}
                onDelete={handleRegPinDelete}
                color="amber"
                label="إنشاء رقم سري"
                sublabel="4 أرقام لتسجيل الدخول لاحقاً"
              />
            </>
          )}

          {mode === 'register' && regStep === 'confirmPin' && (
            <>
              <div className="flex flex-col items-center mb-3">
                <div className="w-10 h-10 bg-[#E8F8F0] rounded-full flex items-center justify-center mb-2">
                  <Lock className="w-5 h-5 text-[#27AE60]" />
                </div>
              </div>
              <PinPad
                pin={regConfirmPin}
                onDigit={handleRegConfirmDigit}
                onDelete={handleRegConfirmDelete}
                color="green"
                label="تأكيد الرقم السري"
                sublabel="أعد إدخال الرقم السري للتأكيد"
                error={displayError}
                loading={loading}
                loadingText="جاري إنشاء الحساب..."
              />
            </>
          )}

          {mode === 'login' && loginStep === 'phone' && (
            <>
              <div className="flex flex-col items-center mb-4">
                <div className="w-10 h-10 bg-[#EBF5FF] rounded-full flex items-center justify-center mb-2">
                  <Phone className="w-5 h-5 text-[#2196F3]" />
                </div>
                <h3 className="text-[16px] font-bold text-[#1a4a5e] text-center">رقم الجوال</h3>
                <p className="text-[11px] text-[#7a9aab] text-center mt-1">أدخل رقم جوالك المسجل</p>
              </div>
              <div className="mb-4">
                <div className="relative">
                  <input
                    ref={loginPhoneRef}
                    type="tel"
                    value={loginPhone}
                    onChange={(e) => { setLoginPhone(e.target.value); setError(''); }}
                    onKeyDown={(e) => e.key === 'Enter' && handleLoginPhoneSubmit()}
                    placeholder="05XXXXXXXX"
                    className={`w-full pr-20 pl-4 py-3 rounded-xl border-2 text-right text-[14px] font-medium outline-none transition-colors ${
                      error ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50 focus:border-[#2196F3] focus:bg-white'
                    }`}
                    dir="ltr"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none flex items-center gap-1">
                    <Phone className="w-4 h-4 text-gray-300" />
                    <span className="text-[11px] text-gray-400">+966</span>
                  </div>
                </div>
                {error && <p className="text-[11px] text-red-500 mt-1.5 text-right">{error}</p>}
              </div>
              <button
                onClick={handleLoginPhoneSubmit}
                className="w-full py-3.5 rounded-2xl bg-[#1a4a5e] text-white font-bold text-[14px] active:scale-[0.98] transition-transform"
              >
                متابعة
              </button>
            </>
          )}

          {mode === 'login' && loginStep === 'pin' && (
            <>
              <div className="flex flex-col items-center mb-3">
                <div className="w-10 h-10 bg-[#FFF8E1] rounded-full flex items-center justify-center mb-2">
                  <Lock className="w-5 h-5 text-[#F59E0B]" />
                </div>
                <p className="text-[13px] font-bold text-[#2196F3]" dir="ltr">{loginPhone}</p>
              </div>
              <PinPad
                pin={loginPin}
                onDigit={handleLoginPinDigit}
                onDelete={handleLoginPinDelete}
                color="amber"
                label="الرقم السري"
                sublabel="أدخل الرقم السري المكون من 4 أرقام"
                error={displayError}
                loading={loading}
                loadingText="جاري تسجيل الدخول..."
              />
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
