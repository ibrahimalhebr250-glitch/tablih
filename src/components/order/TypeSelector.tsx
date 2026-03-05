import type { PalletType } from '../../types/order';

interface Props {
  selected: PalletType | null;
  onSelect: (type: PalletType) => void;
}

const types: { value: PalletType; icon: string; desc: string }[] = [
  { value: 'خشبية', icon: '🪵', desc: 'الأكثر شيوعاً' },
  { value: 'بلاستيكية', icon: '🔷', desc: 'داين ومتين' },
  { value: 'إعادة تدوير', icon: '♻️', desc: 'اقتصادية' },
];

export default function TypeSelector({ selected, onSelect }: Props) {
  return (
    <div>
      <h3 className="text-[13px] font-bold text-[#1a4a5e] mb-3 uppercase tracking-wide">
        نوع الطبلية
      </h3>
      <div className="grid grid-cols-3 gap-2.5">
        {types.map((t) => {
          const isSelected = selected === t.value;
          return (
            <button
              key={t.value}
              onClick={() => onSelect(t.value)}
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
              <span className="text-2xl mb-1.5">{t.icon}</span>
              <span className={`text-[13px] font-bold ${isSelected ? 'text-[#2196F3]' : 'text-[#1a4a5e]'}`}>
                {t.value}
              </span>
              <span className="text-[10px] text-[#a0b5c0] mt-0.5">{t.desc}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
