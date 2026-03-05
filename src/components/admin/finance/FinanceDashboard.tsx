import { Package, Coins, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import type { FinanceMetrics } from '../../../types/admin';

interface Props {
  metrics: FinanceMetrics;
  loading: boolean;
  onRefresh: () => void;
}

const cards = [
  {
    key: 'total_pallets' as const,
    label: 'إجمالي الطبليات المتداولة',
    icon: Package,
    color: '#1a4a5e',
    bg: '#EBF5FF',
    format: (v: number) => `${v.toLocaleString('ar-SA')} طبلية`,
  },
  {
    key: 'total_commission' as const,
    label: 'إيرادات عمولة المنصة',
    icon: Coins,
    color: '#0d7c3e',
    bg: '#E8F8F0',
    format: (v: number) => `${v.toLocaleString('ar-SA')} ريال`,
  },
  {
    key: 'outstanding_commission' as const,
    label: 'عمولات مستحقة التحصيل',
    icon: AlertCircle,
    color: '#B8860B',
    bg: '#FFFBEB',
    format: (v: number) => `${v.toLocaleString('ar-SA')} ريال`,
  },
  {
    key: 'settled_commission' as const,
    label: 'عمولات تم تحصيلها',
    icon: CheckCircle,
    color: '#16a34a',
    bg: '#F0FDF4',
    format: (v: number) => `${v.toLocaleString('ar-SA')} ريال`,
  },
];

export default function FinanceDashboard({ metrics, loading, onRefresh }: Props) {
  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-[16px] font-bold text-[#1a2f3e]">نظرة عامة</h3>
          <p className="text-[12px] text-[#7a9aab]">مؤشرات الأداء المالي للمنصة</p>
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold text-[#1a4a5e] bg-[#EBF5FF] rounded-lg hover:bg-[#d6ecff] transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          تحديث
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {cards.map(({ key, label, icon: Icon, color, bg, format }) => (
          <div
            key={key}
            className="relative overflow-hidden rounded-2xl border border-[#e2edf5] bg-white p-5 transition-all hover:shadow-md"
          >
            <div className="absolute top-0 left-0 w-full h-1" style={{ background: color }} />
            <div className="flex items-start justify-between mb-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: bg }}
              >
                <Icon className="w-5 h-5" style={{ color }} />
              </div>
            </div>
            {loading ? (
              <div className="space-y-2">
                <div className="h-7 bg-gray-100 rounded-lg w-28 animate-pulse" />
                <div className="h-4 bg-gray-50 rounded w-20 animate-pulse" />
              </div>
            ) : (
              <>
                <p className="text-[22px] font-bold text-[#1a2f3e] leading-none mb-1">
                  {format(metrics[key])}
                </p>
                <p className="text-[11px] text-[#7a9aab]">{label}</p>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
