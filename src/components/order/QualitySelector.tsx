import type { PalletQuality } from '../../types/order';
import { PALLET_QUALITY_LABELS } from '../../types/order';

interface Props {
  selected: PalletQuality | null;
  onSelect: (quality: PalletQuality) => void;
}

const grades: PalletQuality[] = ['A', 'B', 'C', 'Scrap'];

const gradeColors: Record<PalletQuality, { border: string; bg: string; badge: string; text: string }> = {
  A: { border: 'border-[#27AE60]', bg: 'bg-[#E8F8F0]', badge: 'bg-[#27AE60]', text: 'text-[#27AE60]' },
  B: { border: 'border-[#2196F3]', bg: 'bg-[#EBF5FF]', badge: 'bg-[#2196F3]', text: 'text-[#2196F3]' },
  C: { border: 'border-[#F59E0B]', bg: 'bg-[#FFFBEB]', badge: 'bg-[#F59E0B]', text: 'text-[#F59E0B]' },
  Scrap: { border: 'border-gray-300', bg: 'bg-gray-50', badge: 'bg-gray-400', text: 'text-gray-500' },
};

export default function QualitySelector({ selected, onSelect }: Props) {
  return (
    <div>
      <h3 className="text-[13px] font-bold text-[#1a4a5e] mb-3 uppercase tracking-wide">
        الجودة
      </h3>
      <div className="grid grid-cols-2 gap-2.5">
        {grades.map((g) => {
          const isSelected = selected === g;
          const colors = gradeColors[g];
          const label = PALLET_QUALITY_LABELS[g];
          return (
            <button
              key={g}
              onClick={() => onSelect(g)}
              className={`relative flex flex-col items-start p-3.5 rounded-2xl border-2 transition-all duration-200 text-right ${
                isSelected
                  ? `${colors.border} ${colors.bg} shadow-sm`
                  : 'border-gray-100 bg-white active:scale-[0.98]'
              }`}
            >
              {isSelected && (
                <span className="absolute top-2 left-2 w-4 h-4 bg-[#2196F3] rounded-full flex items-center justify-center">
                  <svg viewBox="0 0 10 10" className="w-2.5 h-2.5" fill="none">
                    <path d="M2 5.5L4 7.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </span>
              )}
              <span
                className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-bold text-white mb-1.5 ${
                  isSelected ? colors.badge : 'bg-gray-300'
                }`}
              >
                Grade {g}
              </span>
              <span className={`text-[13px] font-bold ${isSelected ? colors.text : 'text-[#1a4a5e]'}`}>
                {label.ar}
              </span>
              <span className="text-[11px] text-[#a0b5c0] mt-0.5 text-right">{label.desc}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
