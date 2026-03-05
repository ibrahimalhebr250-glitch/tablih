import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, X, User, Building2, CircleUser as UserCircle, Phone, Lock, ShieldCheck, Handshake, CheckCircle2 } from 'lucide-react';
import PinPad from './PinPad';

interface Props {
  onComplete: (data: { phone: string; name: string; userType: 'company' | 'individual'; pin: string }) => void | Promise<void>;
  onClose?: () => void;
  onSwitchToLogin?: () => void;
}

type Step = 'type' | 'info' | 'pin' | 'confirmPin';

function DesktopBranding() {
  return (
    <div
      className="hidden lg:flex flex-col justify-between h-full p-10 xl:p-14"
      style={{ background: 'linear-gradient(160deg, #0d2d3e 0%, #1a4a5e 50%, #2c6b85 100%)' }}
    >
      <div>
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl mb-8"
          style={{ background: 'linear-gradient(135deg, #27AE60, #1a8448)' }}
        >
          <svg viewBox="0 0 20 20" className="w-8 h-8" fill="none">
            <rect x="2" y="2" width="6.5" height="6.5" rx="1.5" fill="white" />
            <rect x="11.5" y="2" width="6.5" height="6.5" rx="1.5" fill="white" />
            <rect x="2" y="11.5" width="6.5" height="6.5" rx="1.5" fill="white" />
            <rect x="11.5" y="11.5" width="6.5" height="6.5" rx="1.5" fill="white" />
            <line x1="8.5" y1="5.25" x2="11.5" y2="5.25" stroke="white" strokeWidth="1.2" />
            <line x1="5.25" y1="8.5" x2="5.25" y2="11.5" stroke="white" strokeWidth="1.2" />
            <line x1="14.75" y1="8.5" x2="14.75" y2="11.5" stroke="white" strokeWidth="1.2" />
          </svg>
        </div>
        <h1 className="text-[32px] xl:text-[38px] font-black text-white leading-tight mb-3">
          انضم إلى<br />الشبكة
        </h1>
        <p className="text-white/60 text-[15px] leading-relaxed">
          سجّل حسابك في شبكة الطبليات<br />وابدأ التداول اليوم
        </p>
      </div>

      <div className="space-y-4">
        {[
          { icon: Handshake, label: 'تداول موثوق', sub: 'موردون ومشترون معتمدون', color: '#4ECCA3' },
          { icon: CheckCircle2, label: 'إنشاء سريع', sub: 'أقل من دقيقتين للتسجيل', color: '#64b5f6' },
          { icon: ShieldCheck, label: 'بيانات محمية', sub: 'تشفير كامل وأمان عالٍ', color: '#fbbf24' },
        ].map(({ icon: Icon, label, sub, color }) => (
          <div key={label} className="flex items-center gap-4">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: `${color}18`, border: `1px solid ${color}30` }}
            >
              <Icon className="w-5 h-5" style={{ color }} />
            </div>
            <div>
              <p className="text-white font-bold text-[14px]">{label}</p>
              <p className="text-white/40 text-[12px]">{sub}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-[#4ECCA3] animate-pulse" />
        <p className="text-white/30 text-[11px]">الشبكة الوطنية — نشطة الآن</p>
      </div>
    </div>
  );
}

const STEP_LABELS: Record<Step, string> = {
  type: 'نوع الحساب',
  info: 'البيانات',
  pin: 'الرقم السري',
  confirmPin: 'تأكيد الرقم',
};

export default function PhoneRegistration({ onComplete, onClose, onSwitchToLogin }: Props) {
  const [step, setStep] = useState<Step>('type');
  const [userType, setUserType] = useState<'company' | 'individual' | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState(['', '', '', '']);
  const [confirmPin, setConfirmPin] = useState(['', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleTypeSelect = (type: 'company' | 'individual') => {
    setUserType(type);
    setStep('info');
    setError('');
  };

  const handleInfoSubmit = () => {
    if (!name.trim()) {
      setError(userType === 'company' ? 'يرجى إدخال اسم الشركة' : 'يرجى إدخال الاسم');
      return;
    }
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length < 9) {
      setError('يرجى إدخال رقم جوال سعودي صحيح');
      return;
    }
    setError('');
    setStep('pin');
  };

  const handlePinDigit = (digit: string) => {
    const idx = pin.findIndex((d) => d === '');
    if (idx === -1) return;
    const next = [...pin];
    next[idx] = digit;
    setPin(next);
    setError('');
    if (next.every((d) => d !== '')) {
      setTimeout(() => { setStep('confirmPin'); setError(''); }, 200);
    }
  };

  const handlePinDelete = () => {
    const lastFilled = pin.map((d, i) => (d !== '' ? i : -1)).filter((i) => i !== -1);
    if (lastFilled.length === 0) return;
    const next = [...pin];
    next[lastFilled[lastFilled.length - 1]] = '';
    setPin(next);
    setError('');
  };

  const handleConfirmDigit = (digit: string) => {
    const idx = confirmPin.findIndex((d) => d === '');
    if (idx === -1) return;
    const next = [...confirmPin];
    next[idx] = digit;
    setConfirmPin(next);
    setError('');
    if (next.every((d) => d !== '')) {
      setTimeout(() => verifyAndSubmit(next), 200);
    }
  };

  const handleConfirmDelete = () => {
    const lastFilled = confirmPin.map((d, i) => (d !== '' ? i : -1)).filter((i) => i !== -1);
    if (lastFilled.length === 0) return;
    const next = [...confirmPin];
    next[lastFilled[lastFilled.length - 1]] = '';
    setConfirmPin(next);
    setError('');
  };

  const verifyAndSubmit = async (cPin: string[]) => {
    const pinStr = pin.join('');
    const cPinStr = cPin.join('');
    if (pinStr !== cPinStr) {
      setError('الرقم السري غير متطابق. يرجى المحاولة مرة أخرى.');
      setConfirmPin(['', '', '', '']);
      setTimeout(() => document.getElementById('reg-cpin-0')?.focus(), 100);
      return;
    }
    setLoading(true);
    const formatted = phone.replace(/\D/g, '');
    const final = formatted.startsWith('0') ? formatted : `0${formatted}`;
    try {
      await Promise.resolve(onComplete({ phone: final, name: name.trim(), userType: userType!, pin: pinStr }));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'حدث خطأ أثناء التسجيل';
      setError(msg);
      setConfirmPin(['', '', '', '']);
      setLoading(false);
    }
  };

  const stepIndex = step === 'type' ? 0 : step === 'info' ? 1 : step === 'pin' ? 2 : 3;
  const steps: Step[] = ['type', 'info', 'pin', 'confirmPin'];

  const goBack = () => {
    setError('');
    if (step === 'info') setStep('type');
    else if (step === 'pin') setStep('info');
    else if (step === 'confirmPin') { setConfirmPin(['', '', '', '']); setStep('pin'); }
  };

  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (step === 'info' && nameRef.current) {
      const timer = setTimeout(() => nameRef.current?.focus(), 150);
      return () => clearTimeout(timer);
    }
  }, [step]);

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex flex-col lg:flex-row slide-up"
      style={{
        background: 'linear-gradient(180deg, #1a4a5e 0%, #2c6b85 40%, #3d8ba8 80%, #4fa3c0 100%)',
        overflow: 'hidden',
      }}
    >
      <div className="lg:flex-1 lg:min-w-0">
        <DesktopBranding />
      </div>

      <div className="flex-1 lg:flex-none lg:w-[480px] xl:w-[520px] flex flex-col lg:bg-white lg:shadow-2xl overflow-hidden">

        <div className="flex-shrink-0 px-4 flex items-center justify-between lg:hidden" style={{ paddingTop: 'max(12px, env(safe-area-inset-top))' }}>
          {step !== 'type' ? (
            <button
              onClick={goBack}
              className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center active:bg-white/25 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-white rotate-180" />
            </button>
          ) : (
            <div className="w-9" />
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center active:bg-white/25 transition-colors"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          )}
        </div>

        <div className="hidden lg:flex flex-shrink-0 items-center justify-between px-8 py-5 border-b border-gray-100">
          <div>
            {step !== 'type' && (
              <button
                onClick={goBack}
                className="flex items-center gap-1.5 text-[13px] font-semibold text-[#4a7a94] hover:text-[#1a4a5e] transition-colors"
              >
                <ArrowLeft className="w-4 h-4 rotate-180" />
                رجوع
              </button>
            )}
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          )}
        </div>

        <div className="flex-1 flex flex-col overflow-y-auto" style={{ overscrollBehavior: 'contain' }}>
          <div className="flex-1 flex flex-col justify-center">

            <div className="lg:hidden px-6 pt-3 pb-3 text-center">
              <div className="w-14 h-14 bg-white/15 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-xl">
                <svg viewBox="0 0 20 20" className="w-8 h-8" fill="none">
                  <rect x="2" y="2" width="6.5" height="6.5" rx="1.5" fill="white" />
                  <rect x="11.5" y="2" width="6.5" height="6.5" rx="1.5" fill="white" />
                  <rect x="2" y="11.5" width="6.5" height="6.5" rx="1.5" fill="white" />
                  <rect x="11.5" y="11.5" width="6.5" height="6.5" rx="1.5" fill="white" />
                </svg>
              </div>
              <h1 className="text-[20px] font-bold text-white">إنشاء حساب جديد</h1>
              <p className="text-[12px] text-white/70 mt-0.5">شبكة الطبليات</p>
            </div>

            <div className="px-6 lg:px-10 xl:px-14 mb-4">
              <div className="lg:hidden flex justify-center gap-2">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-1 rounded-full transition-all duration-300"
                    style={{
                      width: i <= stepIndex ? 36 : 18,
                      background: i <= stepIndex ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.25)',
                    }}
                  />
                ))}
              </div>
              <div className="hidden lg:flex items-center gap-0 mt-2">
                {steps.map((s, i) => (
                  <div key={s} className="flex items-center flex-1">
                    <div className="flex flex-col items-center flex-shrink-0">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold transition-all"
                        style={{
                          background: i < stepIndex ? '#27AE60' : i === stepIndex ? '#1a4a5e' : '#e8f0f5',
                          color: i <= stepIndex ? 'white' : '#7a9aab',
                        }}
                      >
                        {i < stepIndex ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                      </div>
                      <p
                        className="text-[10px] font-semibold mt-1 whitespace-nowrap"
                        style={{ color: i <= stepIndex ? '#1a4a5e' : '#a0b5c5' }}
                      >
                        {STEP_LABELS[s]}
                      </p>
                    </div>
                    {i < steps.length - 1 && (
                      <div
                        className="flex-1 h-0.5 mx-1 mb-4 rounded-full transition-all"
                        style={{ background: i < stepIndex ? '#27AE60' : '#e8f0f5' }}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="mx-4 lg:mx-0 mb-4 lg:mb-0 bg-white rounded-3xl lg:rounded-none shadow-2xl lg:shadow-none overflow-hidden">
              <div className="px-5 lg:px-10 xl:px-14 pt-5 pb-6 lg:pt-2 lg:pb-0">

                <div className="hidden lg:block text-right mb-6">
                  <h2 className="text-[26px] font-black text-[#1a2f3e]">إنشاء حساب جديد</h2>
                  <p className="text-[13px] text-[#7a9aab] mt-1">{STEP_LABELS[step]}</p>
                </div>

                {step === 'type' && (
                  <>
                    <div className="flex flex-col items-center lg:items-start mb-4">
                      <div className="lg:hidden w-10 h-10 bg-[#EBF5FF] rounded-full flex items-center justify-center mb-2">
                        <User className="w-5 h-5 text-[#2196F3]" />
                      </div>
                      <h2 className="lg:hidden text-[16px] font-bold text-[#1a4a5e] text-center">نوع الحساب</h2>
                      <p className="lg:hidden text-[11px] text-[#7a9aab] text-center mt-0.5">اختر نوع حسابك للمتابعة</p>
                    </div>

                    <div className="space-y-2.5">
                      <button
                        onClick={() => handleTypeSelect('company')}
                        className="w-full flex items-center gap-3 p-3.5 rounded-2xl border-2 border-gray-100 bg-gray-50/50 hover:border-[#2196F3] hover:bg-[#EBF5FF]/30 active:scale-[0.98] transition-all group"
                      >
                        <div className="w-11 h-11 bg-[#EBF5FF] rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-[#2196F3]/15">
                          <Building2 className="w-5 h-5 text-[#2196F3]" />
                        </div>
                        <div className="text-right flex-1">
                          <p className="text-[14px] font-bold text-[#1a4a5e]">شركة / منشأة</p>
                          <p className="text-[10px] text-[#7a9aab] mt-0.5">حساب تجاري باسم المنشأة</p>
                        </div>
                      </button>

                      <button
                        onClick={() => handleTypeSelect('individual')}
                        className="w-full flex items-center gap-3 p-3.5 rounded-2xl border-2 border-gray-100 bg-gray-50/50 hover:border-[#27AE60] hover:bg-[#E8F8F0]/30 active:scale-[0.98] transition-all group"
                      >
                        <div className="w-11 h-11 bg-[#E8F8F0] rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-[#27AE60]/15">
                          <UserCircle className="w-5 h-5 text-[#27AE60]" />
                        </div>
                        <div className="text-right flex-1">
                          <p className="text-[14px] font-bold text-[#1a4a5e]">فرد / شخصي</p>
                          <p className="text-[10px] text-[#7a9aab] mt-0.5">حساب شخصي باسمك</p>
                        </div>
                      </button>
                    </div>

                    {onSwitchToLogin && (
                      <button onClick={onSwitchToLogin} className="w-full text-center mt-4 py-2">
                        <span className="text-[12px] text-[#7a9aab]">لديك حساب؟ </span>
                        <span className="text-[12px] font-bold text-[#2196F3]">تسجيل الدخول</span>
                      </button>
                    )}
                  </>
                )}

                {step === 'info' && (
                  <>
                    <div className="flex flex-col items-center lg:hidden mb-4">
                      <div className="w-10 h-10 bg-[#EBF5FF] rounded-full flex items-center justify-center mb-2">
                        {userType === 'company' ? (
                          <Building2 className="w-5 h-5 text-[#2196F3]" />
                        ) : (
                          <UserCircle className="w-5 h-5 text-[#27AE60]" />
                        )}
                      </div>
                      <h2 className="text-[16px] font-bold text-[#1a4a5e] text-center">البيانات الأساسية</h2>
                      <p className="text-[11px] text-[#7a9aab] text-center mt-0.5">
                        {userType === 'company' ? 'أدخل بيانات المنشأة' : 'أدخل بياناتك الشخصية'}
                      </p>
                    </div>

                    <div className="space-y-3 mb-4">
                      <div>
                        <label className="block text-[12px] font-bold text-[#1a4a5e] mb-1.5 text-right">
                          {userType === 'company' ? 'اسم الشركة / المنشأة' : 'الاسم الكامل'}
                        </label>
                        <div className="relative">
                          <input
                            ref={nameRef}
                            type="text"
                            value={name}
                            onChange={(e) => { setName(e.target.value); setError(''); }}
                            placeholder={userType === 'company' ? 'مثال: شركة النقل السريع' : 'مثال: محمد أحمد'}
                            className="w-full pr-10 pl-4 py-3 rounded-xl border-2 border-gray-200 bg-gray-50 text-right text-[14px] font-medium outline-none transition-colors focus:border-[#2196F3] focus:bg-white"
                          />
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            {userType === 'company' ? (
                              <Building2 className="w-4 h-4 text-gray-300" />
                            ) : (
                              <User className="w-4 h-4 text-gray-300" />
                            )}
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[12px] font-bold text-[#1a4a5e] mb-1.5 text-right">
                          رقم الجوال
                        </label>
                        <div className="relative">
                          <input
                            type="tel"
                            value={phone}
                            onChange={(e) => { setPhone(e.target.value); setError(''); }}
                            onKeyDown={(e) => e.key === 'Enter' && handleInfoSubmit()}
                            placeholder="05XXXXXXXX"
                            className="w-full pr-20 pl-4 py-3 rounded-xl border-2 border-gray-200 bg-gray-50 text-right text-[14px] font-medium outline-none transition-colors focus:border-[#2196F3] focus:bg-white"
                            dir="ltr"
                          />
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none flex items-center gap-1">
                            <Phone className="w-4 h-4 text-gray-300" />
                            <span className="text-[11px] text-gray-400">+966</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {error && (
                      <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-2 mb-3">
                        <p className="text-[12px] text-red-500 text-right">{error}</p>
                      </div>
                    )}

                    <button
                      onClick={handleInfoSubmit}
                      className="w-full py-3.5 rounded-2xl bg-[#1a4a5e] text-white font-bold text-[14px] flex items-center justify-center gap-2 shadow-lg hover:bg-[#153d50] active:scale-[0.98] transition-all"
                    >
                      <ArrowLeft className="w-5 h-5" />
                      متابعة
                    </button>
                  </>
                )}

                {step === 'pin' && (
                  <>
                    <div className="lg:hidden flex flex-col items-center mb-3">
                      <div className="w-10 h-10 bg-[#FFF8E1] rounded-full flex items-center justify-center mb-2">
                        <Lock className="w-5 h-5 text-[#F59E0B]" />
                      </div>
                    </div>
                    <PinPad
                      pin={pin}
                      onDigit={handlePinDigit}
                      onDelete={handlePinDelete}
                      color="amber"
                      label="إنشاء رقم سري"
                      sublabel="أدخل رقم سري مكون من 4 أرقام"
                    />
                  </>
                )}

                {step === 'confirmPin' && (
                  <>
                    <div className="lg:hidden flex flex-col items-center mb-3">
                      <div className="w-10 h-10 bg-[#E8F8F0] rounded-full flex items-center justify-center mb-2">
                        <Lock className="w-5 h-5 text-[#27AE60]" />
                      </div>
                    </div>
                    <PinPad
                      pin={confirmPin}
                      onDigit={handleConfirmDigit}
                      onDelete={handleConfirmDelete}
                      color="green"
                      label="تأكيد الرقم السري"
                      sublabel="أعد إدخال الرقم السري للتأكيد"
                      error={error}
                      loading={loading}
                      loadingText="جاري إنشاء الحساب..."
                    />
                  </>
                )}
              </div>
            </div>

            <div className="hidden lg:flex items-center justify-center gap-2 pb-8 mt-4">
              <ShieldCheck className="w-4 h-4 text-[#c0d0da]" />
              <p className="text-[12px] text-[#b0c5d5]">اتصال آمن ومشفر</p>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
