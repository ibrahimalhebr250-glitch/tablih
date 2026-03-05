import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Smartphone } from 'lucide-react';

interface Props {
  onComplete: (phone: string) => void;
  onClose: () => void;
}

export default function RegistrationSheet({ onComplete, onClose }: Props) {
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length < 9) {
      setError('يرجى إدخال رقم جوال سعودي صحيح');
      return;
    }
    setError('');
    setLoading(true);
    await new Promise((r) => setTimeout(r, 600));
    setLoading(false);
    const formatted = cleaned.startsWith('0') ? cleaned : `0${cleaned}`;
    onComplete(formatted);
  };

  const phoneRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => phoneRef.current?.focus(), 150);
    return () => clearTimeout(t);
  }, []);

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex flex-col items-center justify-end lg:justify-center"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)', overflow: 'hidden' }}
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

        <button
          onClick={onClose}
          className="absolute top-3 left-4 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>

        <div className="px-5 pt-4 pb-6 overflow-y-auto flex-1" style={{ overscrollBehavior: 'contain' }}>
          <div className="flex flex-col items-center mb-5">
            <div className="w-12 h-12 bg-gradient-to-br from-[#EBF5FF] to-[#E8F8F0] rounded-2xl flex items-center justify-center mb-3 shadow-sm">
              <Smartphone className="w-6 h-6 text-[#1a4a5e]" />
            </div>
            <h3 className="text-[16px] font-bold text-[#1a4a5e] text-center mb-1">
              حفظ دفعتك في المستودع السحابي
            </h3>
            <p className="text-[11px] text-[#7a9aab] text-center leading-relaxed">
              لتأكيد الإيداع وربطه بحسابك، يرجى إدخال رقم جوالك.
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
                onChange={(e) => {
                  setPhone(e.target.value);
                  setError('');
                }}
                placeholder="05XXXXXXXX"
                className={`w-full pr-20 pl-4 py-3 rounded-xl border-2 text-right text-[14px] font-medium outline-none transition-colors ${
                  error
                    ? 'border-red-300 bg-red-50'
                    : 'border-gray-200 bg-gray-50 focus:border-[#2196F3] focus:bg-white'
                }`}
                dir="ltr"
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none flex items-center gap-1">
                <span className="text-[12px] text-gray-400">+966</span>
              </div>
            </div>
            {error && <p className="text-[11px] text-red-500 mt-1.5 text-right">{error}</p>}
          </div>

          <div className="bg-[#F5F9FC] rounded-xl px-4 py-2.5 mb-4 text-right">
            <p className="text-[11px] text-[#7a9aab] leading-relaxed">
              سيتم إنشاء حسابك تلقائيًا عند التأكيد.
              لا كلمة مرور، لا رمز تحقق.
            </p>
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full py-3.5 rounded-2xl bg-[#1a4a5e] text-white font-bold text-[14px] flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition-transform disabled:opacity-70"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              'متابعة'
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
