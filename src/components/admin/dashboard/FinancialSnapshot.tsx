import { TrendingUp, DollarSign, AlertCircle, Calculator } from 'lucide-react';
import type { FinancialSnapshot as ISnapshot } from '../../../hooks/useAdminDashboard';

interface Props {
  financial: ISnapshot | null;
  loading: boolean;
}

function fmt(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}م`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}ك`;
  return n.toLocaleString('ar-SA');
}

export default function FinancialSnapshot({ financial, loading }: Props) {
  const items = [
    {
      label: 'إجمالي حجم التداول',
      value: financial?.total_gmv ?? 0,
      icon: TrendingUp,
      color: '#16a34a',
      bg: '#f0fdf4',
      border: '#bbf7d0',
    },
    {
      label: 'إيرادات المنصة',
      value: financial?.platform_revenue ?? 0,
      icon: DollarSign,
      color: '#2563eb',
      bg: '#eff6ff',
      border: '#bfdbfe',
    },
    {
      label: 'رسوم معلقة',
      value: financial?.outstanding_fees ?? 0,
      icon: AlertCircle,
      color: '#ca8a04',
      bg: '#fefce8',
      border: '#fde68a',
    },
    {
      label: 'متوسط قيمة الصفقة',
      value: financial?.avg_deal_value ?? 0,
      icon: Calculator,
      color: '#0891b2',
      bg: '#ecfeff',
      border: '#a5f3fc',
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <DollarSign className="w-5 h-5 text-green-600" />
        <div>
          <p className="text-sm font-black text-slate-900">الملخص المالي</p>
          <p className="text-xs text-slate-500">الأداء المالي للمنصة</p>
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {items.map(({ label, value, icon: Icon, color, bg, border }) => (
          <div
            key={label}
            className="rounded-2xl p-4 space-y-2 bg-white border"
            style={{ borderColor: border }}
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: bg }}
            >
              <Icon className="w-5 h-5" style={{ color }} />
            </div>
            {loading ? (
              <div className="h-7 w-24 bg-slate-100 rounded-lg animate-pulse" />
            ) : (
              <p className="text-xl font-black leading-none" style={{ color }}>
                {fmt(value)}
                <span className="text-[10px] font-semibold mr-1 text-slate-400">ر.س</span>
              </p>
            )}
            <p className="text-[11px] font-semibold text-slate-500">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
