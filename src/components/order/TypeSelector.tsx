import type { DynamicPalletType } from '../../hooks/useDynamicOrderBuilder';

interface Props {
  palletTypes: DynamicPalletType[];
  selected: string | null;
  onSelect: (code: string) => void;
}

const defaultIcon = '📦';

export default function TypeSelector({ palletTypes, selected, onSelect }: Props) {
  if (palletTypes.length === 0) {
    return (
      <div className="text-center py-4 text-gray-500">
        <p>لا توجد أنواع طبليات متاحة</p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-[13px] font-bold text-[#1a4a5e] mb-3 uppercase tracking-wide">
        نوع الطبلية
      </h3>
      <div className="grid grid-cols-3 gap-2.5">
        {palletTypes.map((type) => {
          const isSelected = selected === type.code;
          return (
            <button
              key={type.id}
              onClick={() => onSelect(type.code)}
              className={`relative flex flex-col items-center justify-center py-4 px-2 rounded-2xl border-2 transition-all duration-200 ${
                isSelected
                  ? 'border-[#2196F3] bg-[#EBF5FF] shadow-[0_0_0_3px_rgba(33,150,243,0.12)]'
                  : 'border-gray-100 bg-white active:scale-95'
              }`}
            >
              {isSelected && (
                <span className="absolute top-2 left-2 w-4 h-4 bg-[#2196F3] rounded-full flex items-center justify-center">
                  <svg viewBox="0 0 10 10" className="w-2.5 h-2.5" fill="none">
                    <path d="M2 5.5L4 7.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </span>
              )}
              <span className="text-2xl mb-1.5">{defaultIcon}</span>
              <span className={`text-[13px] font-bold ${isSelected ? 'text-[#2196F3]' : 'text-[#1a4a5e]'}`}>
                {type.name_ar}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
