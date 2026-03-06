import { SlidersHorizontal } from 'lucide-react';
import type { FlexibilityOption } from '../../hooks/useDynamicOrderBuilder';

interface Props {
  flexibilityOptions: FlexibilityOption[];
  selectedOptions: Record<string, boolean>;
  onChange: (code: string, value: boolean) => void;
}

export default function FlexibilityToggle({ flexibilityOptions, selectedOptions, onChange }: Props) {
  if (flexibilityOptions.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-4 pt-3.5 pb-2.5 border-b border-gray-50">
        <SlidersHorizontal className="w-4 h-4 text-[#2196F3]" />
        <span className="text-[13px] font-bold text-[#1a4a5e]">مرونة الطلب</span>
      </div>
      {flexibilityOptions.map((option) => {
        const isOn = selectedOptions[option.code] || false;
        return (
          <button
            key={option.id}
            onClick={() => onChange(option.code, !isOn)}
            className="w-full flex items-center justify-between px-4 py-3 border-b border-gray-50 last:border-0"
          >
            <div
              className={`w-11 h-6 rounded-full relative transition-colors duration-200 ${
                isOn ? 'bg-[#27AE60]' : 'bg-gray-200'
              }`}
            >
              <div
                className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-all duration-200 ${
                  isOn ? 'left-0.5' : 'right-0.5'
                }`}
              />
            </div>
            <span className={`text-[13px] font-medium ${isOn ? 'text-[#1a4a5e]' : 'text-[#7a9aab]'}`}>
              {option.name_ar}
            </span>
          </button>
        );
      })}
    </div>
  );
}
