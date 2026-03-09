import { useState, useEffect, useCallback, useRef } from 'react';
import { Wifi, ChevronLeft, ChevronRight, ArrowLeftRight, TrendingUp, Shield } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface HeroSlide {
  id: string;
  title: string;
  subtitle: string;
  image_url: string;
  sort_order: number;
}

const DEFAULT_SLIDES: HeroSlide[] = [
  {
    id: 'default-1',
    title: 'شبكة تدفق الطلبات',
    subtitle: 'ربط الموردين بالمشترين عبر شبكة وطنية ذكية',
    image_url: 'https://images.pexels.com/photos/1267338/pexels-photo-1267338.jpeg?auto=compress&cs=tinysrgb&w=1200&h=400&fit=crop',
    sort_order: 1,
  },
  {
    id: 'default-2',
    title: 'مطابقة فورية وذكية',
    subtitle: 'نظام ذكي متقدم يربط العروض بالطلبات في ثوانٍ',
    image_url: 'https://images.pexels.com/photos/4481259/pexels-photo-4481259.jpeg?auto=compress&cs=tinysrgb&w=1200&h=400&fit=crop',
    sort_order: 2,
  },
  {
    id: 'default-3',
    title: 'سوق موثوق وآمن',
    subtitle: 'معاملات مضمونة وتقييمات شفافة لجميع الأطراف',
    image_url: 'https://images.pexels.com/photos/906494/pexels-photo-906494.jpeg?auto=compress&cs=tinysrgb&w=1200&h=400&fit=crop',
    sort_order: 3,
  },
];

const SLIDE_ICONS = [
  { icon: ArrowLeftRight, label: 'مطابقة فورية', color: 'text-blue-300' },
  { icon: TrendingUp, label: 'سوق نشط', color: 'text-emerald-300' },
  { icon: Shield, label: 'معاملات آمنة', color: 'text-amber-300' },
];

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

function useHeroSlides() {
  const [slides, setSlides] = useState<HeroSlide[]>(DEFAULT_SLIDES);

  useEffect(() => {
    supabase
      .from('hero_slides')
      .select('id, title, subtitle, image_url, sort_order')
      .eq('is_active', true)
      .order('sort_order')
      .then(({ data }) => {
        if (data && data.length > 0) setSlides(data);
      });
  }, []);

  return slides;
}

interface Props {
  desktop?: boolean;
}

export default function HeroSection({ desktop }: Props) {
  const time = useLiveTime();
  const slides = useHeroSlides();
  const [current, setCurrent] = useState(0);
  const [animDir, setAnimDir] = useState<'left' | 'right' | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const goTo = useCallback((index: number, dir: 'left' | 'right') => {
    if (isAnimating || slides.length <= 1) return;
    setAnimDir(dir);
    setIsAnimating(true);
    setTimeout(() => {
      setCurrent(index);
      setIsAnimating(false);
      setAnimDir(null);
    }, 450);
  }, [isAnimating, slides.length]);

  const next = useCallback(() => {
    goTo((current + 1) % slides.length, 'left');
  }, [current, slides.length, goTo]);

  const prev = useCallback(() => {
    goTo((current - 1 + slides.length) % slides.length, 'right');
  }, [current, slides.length, goTo]);

  useEffect(() => {
    if (isPaused || slides.length <= 1) return;
    timerRef.current = setInterval(next, 4500);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [next, isPaused, slides.length]);

  const slide = slides[current];
  const nextSlide = slides[(current + 1) % slides.length];
  const icon = SLIDE_ICONS[current % SLIDE_ICONS.length];
  const IconComp = icon.icon;

  if (desktop) {
    return (
      <section
        className="relative mx-6 mt-6 rounded-3xl overflow-hidden select-none"
        style={{ height: '200px' }}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <div className="absolute inset-0">
          {slides.map((s, i) => (
            <img
              key={s.id}
              src={s.image_url}
              alt={s.title}
              className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700"
              style={{ opacity: i === current ? 1 : 0 }}
            />
          ))}
        </div>

        <div
          className="absolute inset-0 transition-opacity duration-700"
          style={{ background: 'linear-gradient(120deg, rgba(8,20,32,0.95) 0%, rgba(12,30,46,0.80) 50%, rgba(8,20,32,0.55) 100%)' }}
        />

        <div
          className="absolute inset-0 z-10 flex flex-col justify-center px-8"
          style={{
            transform: isAnimating
              ? `translateX(${animDir === 'left' ? '-24px' : '24px'})`
              : 'translateX(0)',
            opacity: isAnimating ? 0 : 1,
            transition: 'transform 0.45s cubic-bezier(0.4,0,0.2,1), opacity 0.45s ease',
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex flex-col items-end gap-3">
              <div
                className="flex items-center gap-2 px-3 py-1.5 rounded-full"
                style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.25)' }}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse" />
                <span className="text-[11px] font-bold text-[#4ade80]">الشبكة متصلة</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.08)' }}>
                <IconComp className={`w-3.5 h-3.5 ${icon.color}`} />
                <span className={`text-[10px] font-semibold ${icon.color}`}>{icon.label}</span>
              </div>
            </div>

            <div className="text-right">
              <p className="text-white/40 text-[10px] font-semibold uppercase tracking-[0.2em] mb-1.5">منصة تجارة الطبليات</p>
              <h1 className="text-[28px] font-black text-white leading-tight" style={{ letterSpacing: '-0.5px' }}>
                {slide.title}
              </h1>
              <p className="text-[13px] text-white/50 mt-1 leading-relaxed">
                {slide.subtitle}
              </p>
            </div>
          </div>
        </div>

        {slides.length > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110"
              style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.15)' }}
            >
              <ChevronLeft className="w-4 h-4 text-white" />
            </button>
            <button
              onClick={next}
              className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110"
              style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.15)' }}
            >
              <ChevronRight className="w-4 h-4 text-white" />
            </button>

            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i, i > current ? 'left' : 'right')}
                  className="transition-all duration-300 rounded-full"
                  style={{
                    width: i === current ? 20 : 6,
                    height: 6,
                    background: i === current ? 'rgba(34,197,94,0.9)' : 'rgba(255,255,255,0.3)',
                  }}
                />
              ))}
            </div>

            <div
              className="absolute bottom-0 left-0 h-[3px] z-20 transition-all duration-300"
              style={{
                background: 'linear-gradient(90deg, rgba(34,197,94,0.0), rgba(34,197,94,0.8), rgba(34,197,94,0.0))',
                width: `${((current + 1) / slides.length) * 100}%`,
                transition: 'width 0.5s ease',
              }}
            />
          </>
        )}

        <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(34,197,94,0.25), transparent)' }} />
      </section>
    );
  }

  return (
    <section
      className="relative mt-3 rounded-2xl overflow-hidden select-none"
      style={{ height: '150px', margin: '12px 16px 0', maxWidth: 'calc(100vw - 32px)' }}
      onTouchStart={(e) => {
        const x = e.touches[0].clientX;
        const onEnd = (ev: TouchEvent) => {
          const dx = ev.changedTouches[0].clientX - x;
          if (Math.abs(dx) > 40) dx < 0 ? next() : prev();
          document.removeEventListener('touchend', onEnd);
        };
        document.addEventListener('touchend', onEnd);
      }}
    >
      <div className="absolute inset-0">
        {slides.map((s, i) => (
          <img
            key={s.id}
            src={s.image_url}
            alt={s.title}
            className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700"
            style={{ opacity: i === current ? 1 : 0 }}
          />
        ))}
      </div>

      <div
        className="absolute inset-0 transition-opacity duration-700"
        style={{ background: 'linear-gradient(180deg, rgba(8,20,32,0.88) 0%, rgba(10,28,42,0.72) 55%, rgba(8,20,32,0.90) 100%)' }}
      />

      <div
        className="absolute inset-0 flex flex-col justify-between p-4 z-10"
        style={{
          transform: isAnimating
            ? `translateX(${animDir === 'left' ? '-20px' : '20px'})`
            : 'translateX(0)',
          opacity: isAnimating ? 0 : 1,
          transition: 'transform 0.45s cubic-bezier(0.4,0,0.2,1), opacity 0.45s ease',
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <span className="text-[10px] font-semibold text-white/50">{time}</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.2)' }}>
            <Wifi className="w-3 h-3 text-[#4ade80]" />
            <span className="text-[10px] font-bold text-[#4ade80]">متصل</span>
          </div>
        </div>

        <div className="text-center">
          <h1 className="text-[19px] font-black text-white leading-tight">
            {slide.title}
          </h1>
          <p className="text-[11px] text-white/50 mt-1 leading-relaxed">
            {slide.subtitle}
          </p>
        </div>

        {slides.length > 1 && (
          <div className="flex items-center justify-center gap-1.5">
            {slides.map((_, i) => (
              <div
                key={i}
                className="rounded-full transition-all duration-300"
                style={{
                  width: i === current ? 18 : 5,
                  height: 5,
                  background: i === current ? 'rgba(34,197,94,0.9)' : 'rgba(255,255,255,0.3)',
                }}
              />
            ))}
          </div>
        )}
      </div>

      {slides.length > 1 && (
        <div
          className="absolute bottom-0 left-0 h-[2px] z-20"
          style={{
            background: 'linear-gradient(90deg, rgba(34,197,94,0.0), rgba(34,197,94,0.8), rgba(34,197,94,0.0))',
            width: `${((current + 1) / slides.length) * 100}%`,
            transition: 'width 4.5s linear',
          }}
        />
      )}

      <div className="absolute bottom-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(34,197,94,0.3), transparent)' }} />

      {slides.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-6 h-6 rounded-full flex items-center justify-center opacity-60"
            style={{ background: 'rgba(255,255,255,0.15)' }}
          >
            <ChevronLeft className="w-3.5 h-3.5 text-white" />
          </button>
          <button
            onClick={next}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-6 h-6 rounded-full flex items-center justify-center opacity-60"
            style={{ background: 'rgba(255,255,255,0.15)' }}
          >
            <ChevronRight className="w-3.5 h-3.5 text-white" />
          </button>
        </>
      )}
    </section>
  );
}
