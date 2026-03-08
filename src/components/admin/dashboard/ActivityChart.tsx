import { BarChart3, Handshake, ShoppingCart, Package } from 'lucide-react';
import type { DailyActivity } from '../../../hooks/useAdminDashboard';

interface Props {
  dailyActivity: DailyActivity[];
  loading: boolean;
}

function getMaxValue(data: DailyActivity[]): number {
  let max = 1;
  for (const d of data) {
    if (d.deals > max) max = d.deals;
    if (d.orders > max) max = d.orders;
    if (d.inventory > max) max = d.inventory;
  }
  return max;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' });
}

export default function ActivityChart({ dailyActivity, loading }: Props) {
  const maxVal = getMaxValue(dailyActivity);
  const totalDeals = dailyActivity.reduce((s, d) => s + d.deals, 0);
  const totalOrders = dailyActivity.reduce((s, d) => s + d.orders, 0);
  const totalInventory = dailyActivity.reduce((s, d) => s + d.inventory, 0);

  const legends = [
    { label: 'صفقات', color: '#16a34a', icon: Handshake, total: totalDeals },
    { label: 'طلبات', color: '#2563eb', icon: ShoppingCart, total: totalOrders },
    { label: 'مخزون', color: '#d97706', icon: Package, total: totalInventory },
  ];

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/60">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-blue-600" />
          <p className="text-sm font-black text-slate-900">نشاط المنصة</p>
        </div>
        <div className="h-48 bg-slate-50 rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/60">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-blue-600" />
          <div>
            <p className="text-sm font-black text-slate-900">نشاط المنصة - آخر 14 يوم</p>
            <p className="text-xs text-slate-500">الصفقات والطلبات والمخزون المضاف يومياً</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {legends.map(l => {
            const Icon = l.icon;
            return (
              <div key={l.label} className="flex items-center gap-1.5">
                <Icon className="w-3.5 h-3.5" style={{ color: l.color }} />
                <span className="text-[10px] font-bold text-slate-600">{l.label}</span>
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md" style={{ background: `${l.color}10`, color: l.color }}>{l.total}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="relative">
        <div className="flex items-end gap-1 h-48" dir="ltr">
          {dailyActivity.map((day, i) => {
            const dealH = maxVal > 0 ? (day.deals / maxVal) * 100 : 0;
            const orderH = maxVal > 0 ? (day.orders / maxVal) * 100 : 0;
            const invH = maxVal > 0 ? (day.inventory / maxVal) * 100 : 0;
            const isToday = i === dailyActivity.length - 1;

            return (
              <div key={day.date} className="flex-1 flex flex-col items-center gap-0.5 group">
                <div className="w-full flex items-end justify-center gap-px h-40">
                  <div
                    className="flex-1 max-w-2 rounded-t transition-all group-hover:opacity-100 opacity-80"
                    style={{ height: `${Math.max(dealH, 4)}%`, background: '#16a34a' }}
                    title={`صفقات: ${day.deals}`}
                  />
                  <div
                    className="flex-1 max-w-2 rounded-t transition-all group-hover:opacity-100 opacity-80"
                    style={{ height: `${Math.max(orderH, 4)}%`, background: '#2563eb' }}
                    title={`طلبات: ${day.orders}`}
                  />
                  <div
                    className="flex-1 max-w-2 rounded-t transition-all group-hover:opacity-100 opacity-80"
                    style={{ height: `${Math.max(invH, 4)}%`, background: '#d97706' }}
                    title={`مخزون: ${day.inventory}`}
                  />
                </div>
                <span className={`text-[8px] leading-none ${isToday ? 'font-black text-blue-600' : 'text-slate-400'}`}>
                  {formatDate(day.date)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
