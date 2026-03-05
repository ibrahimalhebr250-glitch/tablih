import { SlidersHorizontal } from 'lucide-react';
import type { OrderFormData } from '../../types/order';

interface Props {
  form: OrderFormData;
  onChange: (key: 'acceptCloseQuality' | 'acceptCloseCity' | 'acceptPartialDelivery', value: boolean) => void;
}

const options: {
  key: 'acceptCloseQuality' | 'acceptCloseCity' | 'acceptPartialDelivery';
  label: string;
}[] = [
  { key: 'acceptCloseQuality', label: 'أقبل جودة قريبة' },
  { key: 'acceptCloseCity', label: 'أقبل مدينة قريبة' },
  { key: 'acceptPartialDelivery', label: 'أقبل تسليم جزئي' },
];

export default function FlexibilityToggle({ form, onChange }: Props) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-4 pt-3.5 pb-2.5 border-b border-gray-50">
        <SlidersHorizontal className="w-4 h-4 text-[#2196F3]" />
        <span className="text-[13px] font-bold text-[#1a4a5e]">مرونة الطلب</span>
      </div>
      {options.map((opt) => {
        const isOn = form[opt.key];
        return (
          <button
            key={opt.key}
            onClick={() => onChange(opt.key, !isOn)}
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
              {opt.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
