import type { PalletSize } from '../../types/order';

const SIZES: PalletSize[] = ['120×100', '110×110', '120×80', '80×60', 'أخرى'];

interface Props {
  selected: PalletSize | null;
  onSelect: (size: PalletSize) => void;
}

export default function SizeSelector({ selected, onSelect }: Props) {
  return (
    <div>
      <h3 className="text-[13px] font-bold text-[#1a4a5e] mb-3 uppercase tracking-wide">
        المقاس (سم)
      </h3>
      <div className="flex gap-2.5 overflow-x-auto pb-1 no-scrollbar">
        {SIZES.map((size) => {
          const isSelected = selected === size;
          return (
            <button
              key={size}
              onClick={() => onSelect(size)}
              className={`flex-shrink-0 px-5 py-2.5 rounded-full border-2 font-bold text-[13px] transition-all duration-200 whitespace-nowrap ${
                isSelected
                  ? 'border-[#2196F3] bg-[#2196F3] text-white shadow-md'
                  : 'border-gray-200 bg-white text-[#2c5f7c] active:scale-95'
              }`}
            >
              {size}
            </button>
          );
        })}
      </div>
    </div>
  );
}
