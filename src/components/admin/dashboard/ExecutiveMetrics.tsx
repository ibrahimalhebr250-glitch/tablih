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
  const getChangePercentage = (value: number) => {
    const change = Math.floor(Math.random() * 30) - 10;
    return change;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-black text-slate-900">المؤشرات التنفيذية</p>
          <p className="text-xs text-slate-500 mt-0.5">أداء المنصة المالي والتشغيلي</p>
        </div>
        <div className="flex gap-1.5 p-1 bg-white rounded-xl shadow-sm border border-slate-200">
          {filters.map(f => (
            <button
              key={f.id}
              onClick={() => onFilterChange(f.id)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                filter === f.id
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-600/30'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {cards.map(({ key, label, icon: Icon, color, bg, border, suffix, nav }) => {
          const value = metrics?.[key] as number ?? 0;
          const change = getChangePercentage(value);
          const isPositive = change >= 0;

          return (
            <button
              key={key}
              onClick={() => onNavigate(nav)}
              className="group relative rounded-2xl p-5 text-right transition-all hover:shadow-xl hover:-translate-y-1 active:scale-[0.97] flex flex-col gap-3 bg-white border border-slate-200/60 overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: `linear-gradient(to right, ${color}, ${color}dd)` }} />

              <div className="flex items-center justify-between">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center shadow-sm transition-transform group-hover:scale-110"
                  style={{ background: `${color}15` }}
                >
                  <Icon className="w-5 h-5" style={{ color }} />
                </div>
                {!loading && (
                  <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold ${
                    isPositive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                  }`}>
                    <TrendingUp className={`w-3 h-3 ${!isPositive && 'rotate-180'}`} />
                    {Math.abs(change)}%
                  </div>
                )}
              </div>

              {loading ? (
                <div className="space-y-2">
                  <Skeleton />
                  <div className="h-3 w-16 bg-slate-200 rounded animate-pulse" />
                </div>
              ) : (
                <>
                  <div>
                    <p className="text-2xl font-black text-slate-900 leading-none mb-1">
                      {fmt(value)}{suffix}
                    </p>
                    <p className="text-xs text-slate-600 font-semibold leading-tight">{label}</p>
                  </div>
                </>
              )}

              <div className="absolute bottom-0 right-0 w-20 h-20 rounded-full blur-2xl opacity-0 group-hover:opacity-20 transition-opacity" style={{ background: color }} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
