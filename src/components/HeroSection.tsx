import { useState, useEffect } from 'react';
import { Wifi, ArrowLeftRight, TrendingUp } from 'lucide-react';

interface Props {
  desktop?: boolean;
}

function useLiveTime() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  const h = time.getHours();
  const m = time.getMinutes().toString().padStart(2, '0');
  const period = h < 12 ? 'ص' : 'م';
  const h12 = h % 12 || 12;
  return `${h12}:${m} ${period}`;
}

export default function HeroSection({ desktop }: Props) {
  const time = useLiveTime();

  if (desktop) {
    return (
      <section className="relative mx-6 mt-6 rounded-3xl overflow-hidden" style={{ height: '210px' }}>
        <img
          src="https://images.pexels.com/photos/1267338/pexels-photo-1267338.jpeg?auto=compress&cs=tinysrgb&w=1200&h=400&fit=crop"
          alt="Warehouse"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(120deg, rgba(10,26,40,0.92) 0%, rgba(15,37,53,0.78) 50%, rgba(10,26,40,0.50) 100%)' }} />

        <div className="absolute inset-0 flex flex-col justify-center px-8 z-10">
          <div className="flex items-center justify-between">
            <div className="flex flex-col items-end gap-3 flex-shrink-0">
              <div
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-full"
                style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.25)' }}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse" />
                <span className="text-[11px] font-bold text-[#4ade80]">الشبكة متصلة</span>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.08)' }}>
                  <ArrowLeftRight className="w-3.5 h-3.5 text-blue-300" />
                  <span className="text-[10px] font-semibold text-blue-200">مطابقة ذكية</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.08)' }}>
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-300" />
                  <span className="text-[10px] font-semibold text-emerald-200">سوق نشط</span>
                </div>
              </div>
            </div>

            <div className="text-right">
              <p className="text-white/40 text-[10px] font-semibold uppercase tracking-[0.2em] mb-2">منصة تجارة الطبليات</p>
              <h1 className="text-[30px] font-black text-white leading-tight" style={{ letterSpacing: '-0.5px' }}>
                شبكة تدفق الطلبات
              </h1>
              <p className="text-[13px] text-white/50 mt-1.5 leading-relaxed">
                ربط الموردين بالمشترين عبر شبكة ذكية وطنية
              </p>
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(34,197,94,0.3), transparent)' }} />
      </section>
    );
  }

  return (
    <section className="relative mx-4 mt-3 rounded-2xl overflow-hidden" style={{ height: '180px' }}>
      <img
        src="https://images.pexels.com/photos/1267338/pexels-photo-1267338.jpeg?auto=compress&cs=tinysrgb&w=600&h=300&fit=crop"
        alt="Warehouse"
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(10,26,40,0.88) 0%, rgba(10,30,45,0.75) 60%, rgba(10,26,40,0.90) 100%)' }} />

      <div className="absolute inset-0 flex flex-col justify-between p-4 z-10">
        {/* Top row - status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <span className="text-[10px] font-semibold text-white/50">{time}</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.2)' }}>
            <Wifi className="w-3 h-3 text-[#4ade80]" />
            <span className="text-[10px] font-bold text-[#4ade80]">متصل</span>
          </div>
        </div>

        {/* Center - main title */}
        <div className="text-center -mt-1">
          <h1 className="text-[21px] font-black text-white leading-tight">
            شبكة تدفق الطلبات
          </h1>
          <p className="text-[12px] text-white/50 mt-1">
            ربط الموردين بالمشترين عبر شبكة وطنية ذكية
          </p>
        </div>

        {/* Bottom row - feature pills */}
        <div className="flex items-center justify-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <ArrowLeftRight className="w-3 h-3 text-blue-300" />
            <span className="text-[9px] font-semibold text-blue-200">مطابقة فورية</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <TrendingUp className="w-3 h-3 text-emerald-300" />
            <span className="text-[9px] font-semibold text-emerald-200">تقييم موثوق</span>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(34,197,94,0.3), transparent)' }} />
    </section>
  );
}
