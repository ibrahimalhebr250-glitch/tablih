import { CheckCircle, Send, Package, Snowflake, Trash2, ArrowLeft } from 'lucide-react';

interface Props {
  onNavigate: (section: string) => void;
}

const actions = [
  {
    label: 'تأكيد دفعة',
    desc: 'قسم المالية — المدفوعات',
    icon: CheckCircle,
    color: '#16a34a',
    bg: '#f0fdf4',
    border: '#bbf7d0',
    section: 'finance',
  },
  {
    label: 'تنفيذ تسوية',
    desc: 'قسم المالية — التسويات',
    icon: Send,
    color: '#7c3aed',
    bg: '#f5f3ff',
    border: '#ddd6fe',
    section: 'finance',
  },
  {
    label: 'إضافة مخزون',
    desc: 'قسم السوق — المخزون',
    icon: Package,
    color: '#ca8a04',
    bg: '#fefce8',
    border: '#fde68a',
    section: 'market',
  },
  {
    label: 'تجميد مدينة',
    desc: 'قسم السوق — المدن',
    icon: Snowflake,
    color: '#64748b',
    bg: '#f8fafc',
    border: '#e2e8f0',
    section: 'market',
  },
  {
    label: 'حذف صفقة',
    desc: 'قسم الصفقات',
    icon: Trash2,
    color: '#dc2626',
    bg: '#fef2f2',
    border: '#fecaca',
    section: 'deals',
  },
];

export default function QuickActionsPanel({ onNavigate }: Props) {
  return (
    <div className="space-y-3">
      <p className="text-[13px] font-bold text-[#4a7a94] uppercase tracking-wide">إجراءات سريعة</p>
      <div className="flex flex-wrap gap-2">
        {actions.map(({ label, desc, icon: Icon, color, bg, border, section }) => (
          <button
            key={label}
            onClick={() => onNavigate(section)}
            className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl transition-all hover:shadow-md hover:-translate-y-0.5 active:scale-[0.97]"
            style={{ background: bg, border: `1px solid ${border}` }}
          >
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: `${color}18` }}
            >
              <Icon className="w-3.5 h-3.5" style={{ color }} />
            </div>
            <div className="text-right">
              <p className="text-[12px] font-bold" style={{ color }}>{label}</p>
              <p className="text-[10px] text-[#7a9aab]">{desc}</p>
            </div>
            <ArrowLeft className="w-3 h-3 text-[#7a9aab] mr-1" />
          </button>
        ))}
      </div>
    </div>
  );
}
