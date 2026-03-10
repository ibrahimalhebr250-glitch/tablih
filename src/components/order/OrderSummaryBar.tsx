import type { OrderFormData } from '../../types/order';
import { ArrowLeft } from 'lucide-react';
import type { ComponentType } from 'react';

interface RequestTypeConfig {
  label: string;
  icon: ComponentType<{ className?: string }>;
  color: string;
  bg: string;
  border: string;
}

interface Props {
  form: OrderFormData;
  isComplete: boolean;
  onSubmit: () => void;
  requestType?: 'standard' | 'urgent' | 'recurring';
  requestTypeConfig?: Record<string, RequestTypeConfig>;
}

export default function OrderSummaryBar({ form, isComplete, onSubmit, requestType, requestTypeConfig }: Props) {
  const fields = [
    form.palletType,
    form.size,
    form.quality ? `Grade ${form.quality}` : null,
    form.quantity ? `${form.quantity.toLocaleString('ar-SA')} طبلية` : null,
    form.city,
  ].filter(Boolean) as string[];

  const typeConfig = requestType && requestTypeConfig ? requestTypeConfig[requestType] : null;
  const TypeIcon = typeConfig?.icon;

  return (
    <div
      className="sticky bottom-0 left-0 right-0 z-40 flex-shrink-0"
      style={{ background: 'linear-gradient(to top, white 55%, rgba(255,255,255,0.85) 80%, transparent 100%)' }}
    >
      <div className="px-4 pt-4 pb-6">
        <div className="flex flex-wrap gap-1.5 justify-end mb-3">
          {typeConfig && TypeIcon && (
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border"
              style={{
                backgroundColor: typeConfig.bg,
                color: typeConfig.color,
                borderColor: typeConfig.border,
              }}
            >
              <TypeIcon className="w-3 h-3" />
              {typeConfig.label}
            </span>
          )}
          {fields.map((f, i) => (
            <span
              key={i}
              className="px-2.5 py-1 bg-[#EBF5FF] text-[#2196F3] rounded-full text-[11px] font-semibold"
            >
              {f}
            </span>
          ))}
        </div>

        <button
          onClick={onSubmit}
          disabled={!isComplete}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-[15px] font-bold transition-all duration-300"
          style={isComplete && typeConfig ? {
            background: `linear-gradient(135deg, ${typeConfig.color}, ${typeConfig.color}cc)`,
            color: 'white',
            boxShadow: `0 8px 24px ${typeConfig.color}40`,
          } : {
            background: isComplete ? '#1a4a5e' : '#e5e7eb',
            color: isComplete ? 'white' : '#9ca3af',
            cursor: isComplete ? 'pointer' : 'not-allowed',
          }}
        >
          <ArrowLeft className="w-5 h-5" />
          {typeConfig && isComplete ? `إكمال ${typeConfig.label}` : 'إكمال الطلب'}
        </button>
      </div>
    </div>
  );
}
