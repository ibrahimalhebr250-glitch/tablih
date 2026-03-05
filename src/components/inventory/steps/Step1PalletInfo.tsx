import { Package, Layers, CheckCircle, Wrench } from 'lucide-react';
import type { PalletType, PalletSize, PalletQuality, PalletCondition } from '../../../types/inventory';
import { PALLET_TYPES, PALLET_SIZES, QUALITY_LABELS, CONDITION_LABELS } from '../../../types/inventory';

interface Props {
  palletType: PalletType | null;
  size: PalletSize | null;
  quality: PalletQuality | null;
  condition: PalletCondition;
  onSetType: (v: PalletType) => void;
  onSetSize: (v: PalletSize) => void;
  onSetQuality: (v: PalletQuality) => void;
  onSetCondition: (v: PalletCondition) => void;
}

const QUALITY_COLORS: Record<PalletQuality, { border: string; bg: string; badge: string; text: string }> = {
  A:     { border: 'border-[#27AE60]', bg: 'bg-[#E8F8F0]', badge: 'bg-[#27AE60]', text: 'text-[#27AE60]' },
  B:     { border: 'border-[#2196F3]', bg: 'bg-[#EBF5FF]', badge: 'bg-[#2196F3]', text: 'text-[#2196F3]' },
  C:     { border: 'border-[#F59E0B]', bg: 'bg-[#FFFBEB]', badge: 'bg-[#F59E0B]', text: 'text-[#F59E0B]' },
  Scrap: { border: 'border-gray-300',  bg: 'bg-gray-50',   badge: 'bg-gray-400',   text: 'text-gray-500'  },
};

const CONDITION_ICONS: Record<PalletCondition, typeof Package> = {
  new: CheckCircle,
  used: Package,
  repairable: Wrench,
};

export default function Step1PalletInfo({
  palletType, size, quality, condition,
  onSetType, onSetSize, onSetQuality, onSetCondition,
}: Props) {
  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Package className="w-4 h-4 text-[#1a4a5e]" />
          <h3 className="text-[14px] font-bold text-[#1a4a5e]">نوع الطبلية</h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {PALLET_TYPES.map((t) => {
            const sel = palletType === t.value;
            return (
              <button
                key={t.value}
                onClick={() => onSetType(t.value)}
                className={`flex flex-col items-center justify-center py-5 rounded-2xl border-2 transition-all duration-200 ${
                  sel
                    ? 'border-[#1a4a5e] bg-[#f0f6fa] shadow-md'
                    : 'border-gray-100 bg-white hover:border-gray-200 active:scale-95'
                }`}
              >
                <span className="text-2xl mb-2">{t.value === 'خشبية' ? '🪵' : '🔵'}</span>
                <span className={`text-[14px] font-bold ${sel ? 'text-[#1a4a5e]' : 'text-[#4a6a7a]'}`}>
                  {t.value}
                </span>
                <span className="text-[10px] text-[#a0b5c0] mt-0.5">{t.desc}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <Layers className="w-4 h-4 text-[#1a4a5e]" />
          <h3 className="text-[14px] font-bold text-[#1a4a5e]">المقاس (سم)</h3>
        </div>
        <div className="flex gap-2 flex-wrap">
          {PALLET_SIZES.map((s) => {
            const sel = size === s;
            return (
              <button
                key={s}
                onClick={() => onSetSize(s)}
                className={`px-4 py-2.5 rounded-xl border-2 font-bold text-[13px] transition-all duration-200 ${
                  sel
                    ? 'border-[#1a4a5e] bg-[#1a4a5e] text-white shadow-md'
                    : 'border-gray-200 bg-white text-[#2c5f7c] hover:border-gray-300 active:scale-95'
                }`}
              >
                {s}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle className="w-4 h-4 text-[#1a4a5e]" />
          <h3 className="text-[14px] font-bold text-[#1a4a5e]">درجة الجودة</h3>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {(Object.keys(QUALITY_LABELS) as PalletQuality[]).map((g) => {
            const sel = quality === g;
            const c = QUALITY_COLORS[g];
            const lbl = QUALITY_LABELS[g];
            return (
              <button
                key={g}
                onClick={() => onSetQuality(g)}
                className={`relative flex flex-col items-start p-3.5 rounded-2xl border-2 transition-all duration-200 text-right ${
                  sel ? `${c.border} ${c.bg} shadow-sm` : 'border-gray-100 bg-white active:scale-[0.98]'
                }`}
              >
                {sel && (
                  <span className="absolute top-2 left-2 w-5 h-5 bg-[#1a4a5e] rounded-full flex items-center justify-center">
                    <svg viewBox="0 0 10 10" className="w-3 h-3" fill="none">
                      <path d="M2 5.5L4 7.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </span>
                )}
                <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold text-white mb-1.5 ${sel ? c.badge : 'bg-gray-300'}`}>
                  {lbl.en}
                </span>
                <span className={`text-[13px] font-bold ${sel ? c.text : 'text-[#1a4a5e]'}`}>
                  {lbl.ar}
                </span>
                <span className="text-[10px] text-[#a0b5c0] mt-0.5">{lbl.desc}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <Wrench className="w-4 h-4 text-[#1a4a5e]" />
          <h3 className="text-[14px] font-bold text-[#1a4a5e]">حالة الطبلية</h3>
        </div>
        <div className="grid grid-cols-3 gap-2.5">
          {(Object.keys(CONDITION_LABELS) as PalletCondition[]).map((c) => {
            const sel = condition === c;
            const lbl = CONDITION_LABELS[c];
            const Icon = CONDITION_ICONS[c];
            return (
              <button
                key={c}
                onClick={() => onSetCondition(c)}
                className={`flex flex-col items-center py-4 rounded-2xl border-2 transition-all duration-200 ${
                  sel
                    ? 'border-[#1a4a5e] bg-[#f0f6fa] shadow-md'
                    : 'border-gray-100 bg-white hover:border-gray-200 active:scale-95'
                }`}
              >
                <Icon className={`w-5 h-5 mb-1.5 ${sel ? 'text-[#1a4a5e]' : 'text-[#a0b5c0]'}`} />
                <span className={`text-[12px] font-bold ${sel ? 'text-[#1a4a5e]' : 'text-[#4a6a7a]'}`}>
                  {lbl.ar}
                </span>
                <span className="text-[9px] text-[#a0b5c0] mt-0.5">{lbl.desc}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
