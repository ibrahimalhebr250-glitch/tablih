import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Phone, Lock, ArrowLeft, ShieldCheck, TrendingUp, Package, Zap } from 'lucide-react';
import PinPad from './PinPad';

interface Props {
  onComplete: (phone: string, pin: string) => void | Promise<void>;
  onClose?: () => void;
  onSwitchToRegister?: () => void;
  externalError?: string;
}

type Step = 'phone' | 'pin';

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
          شبكة<br />الطبليات
        </h1>
        <p className="text-white/60 text-[15px] leading-relaxed">
          الشبكة الوطنية لتداول الطبليات<br />بين الموردين والمشترين
        </p>
      </div>

      <div className="space-y-4">
        {[
          { icon: TrendingUp, label: 'صفقات حية', sub: 'تتابع في الوقت الفعلي', color: '#4ECCA3' },
          { icon: Package, label: 'إدارة المخزون', sub: 'تتبع كامل للطبليات', color: '#64b5f6' },
          { icon: Zap, label: 'تطابق فوري', sub: 'ربط العرض بالطلب', color: '#fbbf24' },
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

export default function LoginPage({ onComplete, onClose, onSwitchToRegister, externalError }: Props) {
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState(['', '', '', '']);
  const [phoneError, setPhoneError] = useState('');
  const [pinError, setPinError] = useState('');
  const [loading, setLoading] = useState(false);

  const phoneRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (externalError) {
      setPinError(externalError);
      setPin(['', '', '', '']);
      setLoading(false);
    }
  }, [externalError]);

  useEffect(() => {
    if (step === 'phone' && phoneRef.current) {
      const t = setTimeout(() => phoneRef.current?.focus(), 150);
      return () => clearTimeout(t);
    }
  }, [step]);

  const handlePhoneSubmit = () => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length < 9) {
      setPhoneError('يرجى إدخال رقم جوال سعودي صحيح');
      return;
    }
    setPhoneError('');
    setStep('pin');
  };

  const handlePinDigit = (digit: string) => {
    const idx = pin.findIndex((d) => d === '');
    if (idx === -1) return;
    const next = [...pin];
    next[idx] = digit;
    setPin(next);
    setPinError('');
    if (next.every((d) => d !== '')) {
      setTimeout(() => {
        setLoading(true);
        const formatted = phone.replace(/\D/g, '');
        const final = formatted.startsWith('0') ? formatted : `0${formatted}`;
        Promise.resolve(onComplete(final, next.join('')))
          .catch((err) => {
            setPinError(err instanceof Error ? err.message : 'حدث خطأ أثناء تسجيل الدخول');
            setPin(['', '', '', '']);
            setLoading(false);
          });
      }, 200);
    }
  };

  const handlePinDelete = () => {
    const lastFilled = pin.map((d, i) => (d !== '' ? i : -1)).filter((i) => i !== -1);
    if (lastFilled.length === 0) return;
    const next = [...pin];
    next[lastFilled[lastFilled.length - 1]] = '';
    setPin(next);
    setPinError('');
  };

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
          {step === 'pin' ? (
            <button
              onClick={() => { setStep('phone'); setPinError(''); setPin(['', '', '', '']); setLoading(false); }}
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
          <div className="flex items-center gap-2">
            {step === 'pin' && (
              <button
                onClick={() => { setStep('phone'); setPinError(''); setPin(['', '', '', '']); setLoading(false); }}
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
              <h1 className="text-[20px] font-bold text-white">تسجيل الدخول</h1>
              <p className="text-[12px] text-white/70 mt-0.5">شبكة الطبليات</p>
            </div>

            <div className="mx-4 lg:mx-0 mb-4 lg:mb-0 bg-white rounded-3xl lg:rounded-none shadow-2xl lg:shadow-none overflow-hidden">
              <div className="px-5 lg:px-10 xl:px-14 pt-5 pb-6 lg:pt-0 lg:pb-0">

                <div className="hidden lg:block text-right mb-6">
                  <h2 className="text-[26px] font-black text-[#1a2f3e]">
                    {step === 'phone' ? 'تسجيل الدخول' : 'أدخل رقمك السري'}
                  </h2>
                  <p className="text-[13px] text-[#7a9aab] mt-1">
                    {step === 'phone' ? 'أدخل رقم جوالك للمتابعة' : `رمز التحقق لـ ${phone}`}
                  </p>
                </div>

                {step === 'phone' ? (
                  <>
                    <div className="flex flex-col items-center lg:items-start mb-4 lg:mb-4">
                      <div className="lg:hidden w-10 h-10 bg-[#EBF5FF] rounded-full flex items-center justify-center mb-2">
                        <Phone className="w-5 h-5 text-[#2196F3]" />
                      </div>
                      <h2 className="lg:hidden text-[16px] font-bold text-[#1a4a5e] text-center">رقم الجوال</h2>
                      <p className="lg:hidden text-[11px] text-[#7a9aab] text-center mt-0.5">
                        أدخل رقم جوالك المسجل للدخول
                      </p>
                    </div>

                    <div className="mb-4">
                      <label className="block text-[12px] font-bold text-[#1a4a5e] mb-1.5 text-right">
                        رقم الجوال
                      </label>
                      <div className="relative">
                        <input
                          ref={phoneRef}
                          type="tel"
                          value={phone}
                          onChange={(e) => { setPhone(e.target.value); setPhoneError(''); }}
                          onKeyDown={(e) => e.key === 'Enter' && handlePhoneSubmit()}
                          placeholder="05XXXXXXXX"
                          className={`w-full pr-20 pl-4 py-3 rounded-xl border-2 text-right text-[14px] font-medium outline-none transition-colors ${
                            phoneError ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50 focus:border-[#2196F3] focus:bg-white'
                          }`}
                          dir="ltr"
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none flex items-center gap-1">
                          <Phone className="w-4 h-4 text-gray-300" />
                          <span className="text-[11px] text-gray-400">+966</span>
                        </div>
                      </div>
                      {phoneError && <p className="text-[11px] text-red-500 mt-1.5 text-right">{phoneError}</p>}
                    </div>

                    <button
                      onClick={handlePhoneSubmit}
                      className="w-full py-3.5 rounded-2xl bg-[#1a4a5e] text-white font-bold text-[14px] flex items-center justify-center gap-2 shadow-lg hover:bg-[#153d50] active:scale-[0.98] transition-all"
                    >
                      <ArrowLeft className="w-5 h-5" />
                      متابعة
                    </button>

                    {onSwitchToRegister && (
                      <button onClick={onSwitchToRegister} className="w-full text-center mt-4 py-2">
                        <span className="text-[12px] text-[#7a9aab]">ليس لديك حساب؟ </span>
                        <span className="text-[12px] font-bold text-[#2196F3]">إنشاء حساب جديد</span>
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <div className="lg:hidden flex flex-col items-center mb-3">
                      <div className="w-10 h-10 bg-[#FFF8E1] rounded-full flex items-center justify-center mb-2">
                        <Lock className="w-5 h-5 text-[#F59E0B]" />
                      </div>
                      <p className="text-[13px] font-bold text-[#2196F3]" dir="ltr">{phone}</p>
                    </div>
                    <PinPad
                      pin={pin}
                      onDigit={handlePinDigit}
                      onDelete={handlePinDelete}
                      color="amber"
                      label="الرقم السري"
                      sublabel="أدخل الرقم السري المكون من 4 أرقام"
                      error={pinError}
                      loading={loading}
                      loadingText="جاري تسجيل الدخول..."
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
