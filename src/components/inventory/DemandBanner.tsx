import { useState, useEffect } from 'react';
import { Flame, ChevronRight, ChevronLeft, MapPin, Package, Star } from 'lucide-react';
import type { ActiveDemand } from '../../types/inventory';
import { QUALITY_LABELS } from '../../types/inventory';

interface Props {
  demands: ActiveDemand[];
}

const QUALITY_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  A:     { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  B:     { bg: 'bg-blue-100',    text: 'text-blue-700',    dot: 'bg-blue-500'    },
  C:     { bg: 'bg-amber-100',   text: 'text-amber-700',   dot: 'bg-amber-500'   },
  Scrap: { bg: 'bg-gray-100',    text: 'text-gray-600',    dot: 'bg-gray-400'    },
};

export default function DemandBanner({ demands }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (demands.length <= 1) return;
    const timer = setInterval(() => {
      triggerNext((prev) => (prev + 1) % demands.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [demands.length]);

  const triggerNext = (getNext: (prev: number) => number) => {
    setAnimating(true);
    setTimeout(() => {
      setActiveIndex(getNext);
      setAnimating(false);
    }, 200);
  };

  const goTo = (index: number) => {
    if (index === activeIndex) return;
    triggerNext(() => index);
  };

  const goNext = () => triggerNext((prev) => (prev + 1) % demands.length);
  const goPrev = () => triggerNext((prev) => (prev - 1 + demands.length) % demands.length);

  if (demands.length === 0) return null;

  const demand = demands[activeIndex];
  const qualityLabel =
    demand.quality in QUALITY_LABELS
      ? QUALITY_LABELS[demand.quality as keyof typeof QUALITY_LABELS].ar
      : demand.quality;
  const qColors = QUALITY_COLORS[demand.quality] ?? QUALITY_COLORS.Scrap;

  return (
    <div className="rounded-2xl overflow-hidden border border-amber-200 shadow-sm"
      style={{ background: 'linear-gradient(135deg, #FFF8E7 0%, #FFF3D0 50%, #FFEDD0 100%)' }}
    >
      <div className="px-3.5 pt-3 pb-1.5">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-1.5">
            {demands.length > 1 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={goPrev}
                  className="w-5 h-5 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center active:scale-90 transition-transform"
                >
                  <ChevronRight className="w-3 h-3 text-amber-600" />
                </button>
                <button
                  onClick={goNext}
                  className="w-5 h-5 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center active:scale-90 transition-transform"
                >
                  <ChevronLeft className="w-3 h-3 text-amber-600" />
                </button>
              </div>
            )}
            {demands.length > 1 && (
              <span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200">
                {activeIndex + 1} / {demands.length}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[12px] font-bold text-[#B45309]">
              {demands.length === 1 ? 'طلب نشط في الشبكة' : `${demands.length} طلبات نشطة`}
            </span>
            <div className="w-6 h-6 rounded-full bg-amber-400/20 flex items-center justify-center">
              <Flame className="w-3.5 h-3.5 text-[#E67E00]" />
            </div>
          </div>
        </div>

        <div
          className="transition-all duration-200"
          style={{ opacity: animating ? 0 : 1, transform: animating ? 'translateX(8px)' : 'translateX(0)' }}
        >
          <div className="bg-white/60 rounded-xl px-3 py-2.5 border border-amber-100">
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-col items-end gap-1.5">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${qColors.bg} ${qColors.text}`}>
                  {qualityLabel}
                </span>
                <div className="flex items-center gap-1 text-[#92400E]">
                  <span className="text-[13px] font-bold">{demand.quantity_needed.toLocaleString('ar-SA')}</span>
                  <span className="text-[11px]">طبلية</span>
                </div>
              </div>

              <div className="text-right flex-1">
                <div className="flex items-center justify-end gap-1 mb-1">
                  <span className="text-[13px] font-bold text-[#92400E]">{demand.city}</span>
                  <MapPin className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                </div>
                <div className="flex items-center justify-end gap-1.5">
                  <span className="text-[11px] text-[#B45309]">{demand.pallet_type}</span>
                  <span className="text-[#d4a87a]">·</span>
                  <span className="text-[11px] text-[#B45309]">{demand.size}</span>
                  <Package className="w-3 h-3 text-amber-400 flex-shrink-0" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {demands.length > 1 && (
          <div className="flex items-center justify-center gap-1 mt-2 pb-0.5">
            {demands.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className="transition-all duration-300"
              >
                <div
                  className={`rounded-full transition-all duration-300 ${
                    i === activeIndex
                      ? 'w-4 h-1.5 bg-amber-500'
                      : 'w-1.5 h-1.5 bg-amber-300'
                  }`}
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {demands.length > 1 && (
        <div className="px-3.5 py-2 border-t border-amber-100/60 bg-amber-50/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Star className="w-3 h-3 text-amber-400" />
              <span className="text-[10px] text-amber-600 font-medium">
                مخزونك يمكن أن يغطي هذه الطلبات
              </span>
            </div>
            <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
              {demands.reduce((s, d) => s + d.quantity_needed, 0).toLocaleString('ar-SA')} إجمالي
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
