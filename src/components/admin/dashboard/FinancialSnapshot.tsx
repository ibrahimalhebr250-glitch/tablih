import { ArrowDownCircle, ArrowUpCircle, Scale, AlertTriangle } from 'lucide-react';
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
      label: 'مدفوعات اليوم',
      value: financial?.payments_today ?? 0,
      icon: ArrowDownCircle,
      positive: true,
      color: '#16a34a',
      bg: '#f0fdf4',
      border: '#bbf7d0',
    },
    {
      label: 'تسويات اليوم',
      value: financial?.settlements_today ?? 0,
      icon: ArrowUpCircle,
      positive: false,
      color: '#2563eb',
      bg: '#eff6ff',
      border: '#bfdbfe',
    },
    {
      label: 'الرصيد الصافي',
      value: financial?.net_balance ?? 0,
      icon: Scale,
      positive: (financial?.net_balance ?? 0) >= 0,
      color: (financial?.net_balance ?? 0) >= 0 ? '#16a34a' : '#dc2626',
      bg: (financial?.net_balance ?? 0) >= 0 ? '#f0fdf4' : '#fef2f2',
      border: (financial?.net_balance ?? 0) >= 0 ? '#bbf7d0' : '#fecaca',
    },
    {
      label: 'مستحقات الموردين',
      value: financial?.outstanding_liabilities ?? 0,
      icon: AlertTriangle,
      positive: false,
      color: '#ca8a04',
      bg: '#fefce8',
      border: '#fde68a',
    },
  ];

  return (
    <div className="space-y-3">
      <p className="text-[13px] font-bold text-[#4a7a94] uppercase tracking-wide">الملخص المالي</p>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {items.map(({ label, value, icon: Icon, color, bg, border }) => (
          <div
            key={label}
            className="rounded-2xl p-4 space-y-2"
            style={{ background: bg, border: `1px solid ${border}` }}
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: `${color}18` }}
            >
              <Icon className="w-5 h-5" style={{ color }} />
            </div>
            {loading ? (
              <div className="h-7 w-24 bg-white rounded-lg animate-pulse" />
            ) : (
              <p className="text-[22px] font-black leading-none" style={{ color }}>
                {fmt(value)}
                <span className="text-[11px] font-semibold mr-1" style={{ color: color + 'aa' }}>ر.س</span>
              </p>
            )}
            <p className="text-[11px] font-semibold text-[#7a9aab]">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
