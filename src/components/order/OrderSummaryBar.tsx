import type { OrderFormData } from '../../types/order';
import { ArrowLeft } from 'lucide-react';

interface Props {
  form: OrderFormData;
  isComplete: boolean;
  onSubmit: () => void;
}

export default function OrderSummaryBar({ form, isComplete, onSubmit }: Props) {
  const fields = [
    form.palletType,
    form.size,
    form.quality ? `Grade ${form.quality}` : null,
    form.quantity ? `${form.quantity.toLocaleString('ar-SA')} طبلية` : null,
    form.city,
  ].filter(Boolean) as string[];

  return (
    <div
      className="sticky bottom-0 left-0 right-0 z-40 flex-shrink-0"
      style={{ background: 'linear-gradient(to top, white 55%, rgba(255,255,255,0.85) 80%, transparent 100%)' }}
    >
      <div className="px-4 pt-4 pb-6">
        {fields.length > 0 && (
          <div className="flex flex-wrap gap-1.5 justify-end mb-3">
            {fields.map((f, i) => (
              <span
                key={i}
                className="px-2.5 py-1 bg-[#EBF5FF] text-[#2196F3] rounded-full text-[11px] font-semibold"
              >
                {f}
              </span>
            ))}
          </div>
        )}

        <button
          onClick={onSubmit}
          disabled={!isComplete}
          className={`w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-[15px] font-bold transition-all duration-300 ${
            isComplete
              ? 'bg-[#1a4a5e] text-white shadow-xl shadow-[#1a4a5e]/25 active:scale-[0.98]'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          <ArrowLeft className="w-5 h-5" />
          إكمال الطلب
        </button>
      </div>
    </div>
  );
}
