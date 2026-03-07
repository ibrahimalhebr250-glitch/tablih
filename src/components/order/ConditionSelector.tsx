import { Package, CheckCircle, Wrench } from 'lucide-react';

const CONDITION_MAP = {
  new: { icon: '✨', label: 'جديد', color: '#10b981', bg: '#d1fae5', border: '#86efac' },
  used: { icon: '📦', label: 'مستعمل', color: '#3b82f6', bg: '#dbeafe', border: '#93c5fd' },
  repairable: { icon: '🔧', label: 'قابل للإصلاح', color: '#f59e0b', bg: '#fef3c7', border: '#fcd34d' },
};

interface Props {
  selected: string;
  onSelect: (condition: string) => void;
}

export default function ConditionSelector({ selected, onSelect }: Props) {
  return (
    <div className="lg:col-span-2">
      <h3 className="text-[13px] font-bold text-[#1a4a5e] mb-3 uppercase tracking-wide">حالة الطبلية</h3>
      <div className="grid grid-cols-3 gap-3">
        {Object.entries(CONDITION_MAP).map(([key, config]) => {
          const sel = selected === key;
          return (
            <button
              key={key}
              onClick={() => onSelect(key)}
              className="flex flex-col items-center justify-center py-4 rounded-xl border-2 transition-all duration-200 active:scale-95"
              style={{
                borderColor: sel ? config.color : '#e5e7eb',
                backgroundColor: sel ? config.bg : 'white',
              }}
            >
              <span className="text-3xl mb-2">{config.icon}</span>
              <span
                className="text-[13px] font-bold"
                style={{ color: sel ? config.color : '#6b7280' }}
              >
                {config.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
