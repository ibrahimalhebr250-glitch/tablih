import { DollarSign, TrendingUp, Wallet, Handshake, Clock } from 'lucide-react';
import type { ExecutiveMetrics as IMetrics, TimeFilter } from '../../../hooks/useAdminDashboard';

interface Props {
  metrics: IMetrics | null;
  filter: TimeFilter;
  onFilterChange: (f: TimeFilter) => void;
  loading: boolean;
  onNavigate: (section: string) => void;
}

const filters: { id: TimeFilter; label: string }[] = [
  { id: 'today', label: 'اليوم' },
  { id: 'week', label: 'الأسبوع' },
  { id: 'month', label: 'الشهر' },
];

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}م`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}ك`;
  return n.toLocaleString('ar-SA');
}

const cards = [
  {
    key: 'gmv' as keyof IMetrics,
    label: 'إجمالي GMV',
    icon: TrendingUp,
    color: '#2563eb',
    bg: '#eff6ff',
    border: '#bfdbfe',
    suffix: ' ر.س',
    nav: 'finance',
  },
  {
    key: 'platform_revenue' as keyof IMetrics,
    label: 'إيرادات المنصة',
    icon: DollarSign,
    color: '#16a34a',
    bg: '#f0fdf4',
    border: '#bbf7d0',
    suffix: ' ر.س',
    nav: 'finance',
  },
  {
    key: 'supplier_liabilities' as keyof IMetrics,
    label: 'مستحقات الموردين',
    icon: Wallet,
    color: '#ca8a04',
    bg: '#fefce8',
    border: '#fde68a',
    suffix: ' ر.س',
    nav: 'finance',
  },
  {
    key: 'active_deals' as keyof IMetrics,
    label: 'الصفقات النشطة',
    icon: Handshake,
    color: '#7c3aed',
    bg: '#f5f3ff',
    border: '#ddd6fe',
    suffix: '',
    nav: 'deals',
  },
  {
    key: 'awaiting_payment' as keyof IMetrics,
    label: 'بانتظار الدفع',
    icon: Clock,
    color: '#dc2626',
    bg: '#fef2f2',
    border: '#fecaca',
    suffix: '',
    nav: 'deals',
  },
];

function Skeleton() {
  return <div className="h-8 w-20 bg-gray-200 rounded-lg animate-pulse" />;
}

export default function ExecutiveMetrics({ metrics, filter, onFilterChange, loading, onNavigate }: Props) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-bold text-[#4a7a94] uppercase tracking-wide">المؤشرات التنفيذية</p>
        <div className="flex gap-1 p-1 bg-[#f0f6fa] rounded-xl">
          {filters.map(f => (
            <button
              key={f.id}
              onClick={() => onFilterChange(f.id)}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all ${
                filter === f.id ? 'bg-white text-[#1a4a5e] shadow-sm' : 'text-[#7a9aab] hover:text-[#1a4a5e]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {cards.map(({ key, label, icon: Icon, color, bg, border, suffix, nav }) => (
          <button
            key={key}
            onClick={() => onNavigate(nav)}
            className="rounded-2xl p-4 text-right transition-all hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] flex flex-col gap-2"
            style={{ background: bg, border: `1px solid ${border}` }}
          >
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: `${color}18` }}
            >
              <Icon className="w-4 h-4" style={{ color }} />
            </div>
            {loading ? (
              <Skeleton />
            ) : (
              <p className="text-[20px] font-black text-[#1a2f3e] leading-none">
                {fmt(metrics?.[key] as number ?? 0)}{suffix}
              </p>
            )}
            <p className="text-[11px] text-[#7a9aab] font-semibold leading-tight">{label}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
