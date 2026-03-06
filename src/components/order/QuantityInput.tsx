import { Minus, Plus } from 'lucide-react';
import type { QuantitySettings } from '../../hooks/useDynamicOrderBuilder';

interface Props {
  value: number;
  onChange: (quantity: number) => void;
  settings: QuantitySettings;
}

export default function QuantityInput({ value, onChange, settings }: Props) {
  const { min_quantity, max_quantity, step, default_quantity } = settings;
  const outOfRange = value > 0 && (value < min_quantity || value > max_quantity);

  const quickQuantities = [
    default_quantity,
    default_quantity * 2,
    default_quantity * 3,
    default_quantity * 5
  ].filter(q => q >= min_quantity && q <= max_quantity);

  return (
    <div>
      <h3 className="text-[13px] font-bold text-[#1a4a5e] mb-3 uppercase tracking-wide">
        الكمية (طبلية)
      </h3>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        {outOfRange && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2 mb-3 text-[11px] text-red-600 text-right" dir="rtl">
            الكمية يجب أن تكون بين {min_quantity.toLocaleString()} و {max_quantity.toLocaleString()} طبلية
          </div>
        )}
        <div className="flex items-center justify-between gap-4 mb-4">
          <button
            onClick={() => onChange(Math.max(min_quantity, value - step))}
            className="w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center active:scale-90 transition-transform"
          >
            <Minus className="w-5 h-5 text-[#2c5f7c]" strokeWidth={2.5} />
          </button>

          <div className="flex-1 text-center">
            <input
              type="number"
              value={value}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                if (!isNaN(v)) onChange(v);
              }}
              className="w-full text-center text-[28px] font-bold text-[#1a4a5e] bg-transparent border-none outline-none"
              min={min_quantity}
              max={max_quantity}
            />
            <span className="text-[11px] text-[#a0b5c0]">طبلية</span>
          </div>

          <button
            onClick={() => onChange(Math.min(max_quantity, value + step))}
            className="w-11 h-11 rounded-full bg-[#2196F3] flex items-center justify-center active:scale-90 transition-transform shadow-md"
          >
            <Plus className="w-5 h-5 text-white" strokeWidth={2.5} />
          </button>
        </div>

        {quickQuantities.length > 0 && (
          <div className="flex gap-2 justify-center flex-wrap">
            {quickQuantities.map((q) => (
              <button
                key={q}
                onClick={() => onChange(q)}
                className={`px-3.5 py-1.5 rounded-full text-[12px] font-bold transition-all duration-150 ${
                  value === q
                    ? 'bg-[#2196F3] text-white shadow-sm'
                    : 'bg-gray-100 text-[#2c5f7c]'
                }`}
              >
                {q.toLocaleString('ar-SA')}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
