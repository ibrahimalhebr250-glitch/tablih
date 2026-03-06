import { Package, Layers, CheckCircle, Wrench } from 'lucide-react';
import { useInventorySettings } from '../../../hooks/useInventorySettings';
import type { PalletType, PalletSize, PalletQuality, PalletCondition } from '../../../types/inventory';

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

const CONDITION_ICONS: Record<string, typeof Package> = {
  new: CheckCircle,
  used: Package,
  repairable: Wrench,
};

export default function DynamicStep1PalletInfo({
  palletType, size, quality, condition,
  onSetType, onSetSize, onSetQuality, onSetCondition,
}: Props) {
  const { palletTypes, palletSizes, qualityGrades, palletConditions, loading } = useInventorySettings();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1a4a5e]"></div>
      </div>
    );
  }

  const qualityColors: Record<string, { border: string; bg: string; badge: string; text: string }> = {};
  qualityGrades.forEach(grade => {
    const baseColor = grade.color;
    qualityColors[grade.code] = {
      border: `border-[${baseColor}]`,
      bg: `bg-[${baseColor}]/10`,
      badge: `bg-[${baseColor}]`,
      text: `text-[${baseColor}]`,
    };
  });

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Package className="w-4 h-4 text-[#1a4a5e]" />
          <h3 className="text-[14px] font-bold text-[#1a4a5e]">نوع الطبلية</h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {palletTypes.map((t) => {
            const sel = palletType === t.name_ar;
            return (
              <button
                key={t.id}
                onClick={() => onSetType(t.name_ar as PalletType)}
                className={`flex flex-col items-center justify-center py-5 rounded-2xl border-2 transition-all duration-200 ${
                  sel
                    ? 'border-[#1a4a5e] bg-[#f0f6fa] shadow-md'
                    : 'border-gray-100 bg-white hover:border-gray-200 active:scale-95'
                }`}
              >
                <span className="text-2xl mb-2">{t.icon}</span>
                <span className={`text-[14px] font-bold ${sel ? 'text-[#1a4a5e]' : 'text-[#4a6a7a]'}`}>
                  {t.name_ar}
                </span>
                <span className="text-[10px] text-[#a0b5c0] mt-0.5">{t.name_en}</span>
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
          {palletSizes.map((s) => {
            const sel = size === s.name_ar;
            return (
              <button
                key={s.id}
                onClick={() => onSetSize(s.name_ar as PalletSize)}
                className={`px-4 py-2.5 rounded-xl border-2 font-bold text-[13px] transition-all duration-200 ${
                  sel
                    ? 'border-[#1a4a5e] bg-[#1a4a5e] text-white shadow-md'
                    : 'border-gray-200 bg-white text-[#2c5f7c] hover:border-gray-300 active:scale-95'
                }`}
              >
                {s.name_ar}
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
          {qualityGrades.map((g) => {
            const sel = quality === g.code;
            return (
              <button
                key={g.id}
                onClick={() => onSetQuality(g.code as PalletQuality)}
                className={`
                  relative p-3 rounded-xl border-2 transition-all duration-200
                  ${sel ? 'shadow-md scale-105' : 'active:scale-95'}
                `}
                style={{
                  borderColor: sel ? g.color : '#e5e7eb',
                  backgroundColor: sel ? `${g.color}15` : '#ffffff',
                }}
              >
                <div className="flex items-start justify-between mb-1">
                  <span
                    className="px-2 py-0.5 rounded text-white text-[10px] font-bold"
                    style={{ backgroundColor: g.color }}
                  >
                    {g.code}
                  </span>
                  {sel && (
                    <div
                      className="w-4 h-4 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: g.color }}
                    >
                      <CheckCircle className="w-2.5 h-2.5 text-white" />
                    </div>
                  )}
                </div>
                <p
                  className="text-[13px] font-bold mb-0.5"
                  style={{ color: sel ? g.color : '#4a6a7a' }}
                >
                  {g.name_ar}
                </p>
                <p className="text-[10px] text-[#a0b5c0]">{g.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle className="w-4 h-4 text-[#1a4a5e]" />
          <h3 className="text-[14px] font-bold text-[#1a4a5e]">حالة الطبلية</h3>
        </div>
        <div className="grid grid-cols-3 gap-2.5">
          {palletConditions.map((c) => {
            const sel = condition === c.code;
            const Icon = CONDITION_ICONS[c.code] || Package;
            return (
              <button
                key={c.id}
                onClick={() => onSetCondition(c.code as PalletCondition)}
                className={`
                  flex flex-col items-center justify-center py-3 rounded-xl border-2 transition-all duration-200
                  ${sel
                    ? 'border-[#1a4a5e] bg-[#f0f6fa] shadow-md'
                    : 'border-gray-100 bg-white hover:border-gray-200 active:scale-95'
                  }
                `}
              >
                <Icon className={`w-4 h-4 mb-1.5 ${sel ? 'text-[#1a4a5e]' : 'text-[#a0b5c0]'}`} />
                <span className={`text-[12px] font-bold ${sel ? 'text-[#1a4a5e]' : 'text-[#4a6a7a]'}`}>
                  {c.name_ar}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
