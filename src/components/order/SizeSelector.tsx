import type { DynamicPalletSize } from '../../hooks/useDynamicOrderBuilder';

interface Props {
  palletSizes: DynamicPalletSize[];
  selected: string | null;
  onSelect: (code: string) => void;
}

export default function SizeSelector({ palletSizes, selected, onSelect }: Props) {
  if (palletSizes.length === 0) {
    return (
      <div className="text-center py-4 text-gray-500">
        <p>لا توجد مقاسات متاحة</p>
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
          return (
            <button
              key={size.id}
              onClick={() => onSelect(size.code)}
              className={`flex-shrink-0 px-5 py-2.5 rounded-full border-2 font-bold text-[13px] transition-all duration-200 whitespace-nowrap ${
                isSelected
                  ? 'border-[#2196F3] bg-[#2196F3] text-white shadow-md'
                  : 'border-gray-200 bg-white text-[#2c5f7c] active:scale-95'
              }`}
            >
              <div className="flex flex-col items-center">
                <span>{size.name_ar}</span>
                {size.max_load_kg && (
                  <span className={`text-[10px] mt-0.5 ${isSelected ? 'text-white/80' : 'text-gray-500'}`}>
                    {size.max_load_kg} كجم
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
