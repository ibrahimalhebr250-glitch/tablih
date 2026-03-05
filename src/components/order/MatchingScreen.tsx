import { useEffect, useRef } from 'react';
import type { OrderFormData, MatchResult } from '../../types/order';

interface Props {
  form: OrderFormData;
  phone: string;
  onDone: (orderId: string, requestId: string) => void;
  runMatching: (
    form: OrderFormData,
    phone: string,
    onDone: (orderId: string, requestId: string) => void
  ) => void;
  matchResult: MatchResult | null;
}

export default function MatchingScreen({ form, phone, onDone, runMatching }: Props) {
  const didRun = useRef(false);

  useEffect(() => {
    if (didRun.current) return;
    didRun.current = true;
    runMatching(form, phone, onDone);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-8">
      <div className="relative mb-8">
        <div className="w-24 h-24 rounded-full border-4 border-[#EBF5FF] flex items-center justify-center">
          <div className="w-20 h-20 rounded-full border-4 border-[#2196F3]/20 flex items-center justify-center">
            <div className="w-14 h-14 rounded-full border-4 border-[#2196F3] border-t-transparent animate-spin" />
          </div>
        </div>
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-[#27AE60] rounded-full animate-pulse" />
        <div
          className="absolute -bottom-2 -left-2 w-4 h-4 bg-[#2196F3] rounded-full animate-pulse"
          style={{ animationDelay: '0.5s' }}
        />
        <div
          className="absolute top-1/2 -right-6 w-3 h-3 bg-[#F59E0B] rounded-full animate-pulse"
          style={{ animationDelay: '1s' }}
        />
      </div>

      <h2 className="text-[20px] font-bold text-[#1a4a5e] text-center mb-3">
        جاري مطابقة طلبك مع الشبكة...
      </h2>
      <p className="text-[13px] text-[#7a9aab] text-center leading-relaxed">
        يتم الآن البحث عن أفضل مصدر متاح
        <br />
        في الشبكة الوطنية للطبليات
      </p>

      <div className="mt-8 flex gap-2">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="w-2 h-2 rounded-full bg-[#2196F3]"
            style={{
              animation: 'pulse 1.4s ease-in-out infinite',
              animationDelay: `${i * 0.2}s`,
              opacity: 0.5,
            }}
          />
        ))}
      </div>

      <div className="mt-10 w-full bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
        <p className="text-[11px] text-[#a0b5c0] text-right mb-2">تفاصيل الطلب</p>
        <div className="space-y-1.5">
          {[
            { label: 'النوع', value: form.palletType },
            { label: 'المقاس', value: form.size },
            { label: 'الجودة', value: form.quality ? `Grade ${form.quality}` : '' },
            { label: 'الكمية', value: `${form.quantity?.toLocaleString('ar-SA')} طبلية` },
            { label: 'المدينة', value: form.city },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between items-center">
              <span className="text-[12px] text-[#7a9aab]">{value}</span>
              <span className="text-[12px] font-bold text-[#1a4a5e]">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
