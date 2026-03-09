import type { DynamicPalletSize } from '../../hooks/useDynamicOrderBuilder';

interface Props {
  palletSizes: DynamicPalletSize[];
  selected: string | null;
  onSelect: (code: string) => void;
}

function getLoadColor(kg: number): string {
  if (kg <= 500) return 'text-green-600';
  if (kg <= 1200) return 'text-blue-600';
  if (kg <= 1800) return 'text-orange-500';
  if (kg <= 2500) return 'text-red-500';
  return 'text-gray-700';
}

export default function SizeSelector({ palletSizes, selected, onSelect }: Props) {
  if (palletSizes.length === 0) {
    return (
      <div className="text-center py-4 text-gray-500 text-sm">
        لا توجد مقاسات متاحة
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-[13px] font-bold text-[#1a4a5e] mb-3 uppercase tracking-wide">
        المقاس (سم)
      </h3>
      <div className="flex gap-2.5 overflow-x-auto pb-1 no-scrollbar">
        {palletSizes.map((size) => {
          const isSelected = selected === size.code;
          const loadKg = size.max_load_kg ? Number(size.max_load_kg) : null;
          return (
            <button
              key={size.id}
              onClick={() => onSelect(size.code)}
              className={`flex-shrink-0 px-4 py-2.5 rounded-2xl border-2 font-semibold text-[13px] transition-all duration-200 whitespace-nowrap min-w-[80px] ${
                isSelected
                  ? 'border-[#2196F3] bg-[#2196F3] text-white shadow-md shadow-blue-200'
                  : 'border-gray-200 bg-white text-[#2c5f7c] hover:border-blue-300 active:scale-95'
              }`}
            >
              <div className="flex flex-col items-center gap-0.5">
                <span>{size.name_ar}</span>
                {loadKg && (
                  <span className={`text-[10px] font-medium ${isSelected ? 'text-white/80' : getLoadColor(loadKg)}`}>
                    {loadKg >= 1000 ? `${(loadKg / 1000).toFixed(1)}T` : `${loadKg}كجم`}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
