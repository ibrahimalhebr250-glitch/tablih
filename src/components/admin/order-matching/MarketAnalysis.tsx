import { TrendingUp, BarChart3, MapPin, Layers, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import type { MarketAnalysis as MarketAnalysisData } from '../../../hooks/useOrderMatching';

interface Props {
  data: MarketAnalysisData | null;
  loading: boolean;
}

function ChartBar({ value, max, color, label }: { value: number; max: number; color: string; label: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-[11px] text-slate-500 w-20 text-left truncate">{label}</span>
      <div className="flex-1 h-5 bg-slate-50 rounded-md overflow-hidden relative">
        <div
          className="h-full rounded-md transition-all duration-500"
          style={{ width: `${Math.max(pct, 2)}%`, background: color }}
        />
        <span className="absolute inset-0 flex items-center pr-2 text-[10px] font-bold text-slate-700">
          {value.toLocaleString('ar-SA')}
        </span>
      </div>
    </div>
  );
}

function DailyChart({ stats }: { stats: MarketAnalysisData['daily_stats'] }) {
  const maxMatches = Math.max(...stats.map((s) => s.matches), 1);
  const maxDeals = Math.max(...stats.map((s) => s.deals), 1);
  const maxVal = Math.max(maxMatches, maxDeals, 1);

  return (
    <div className="flex items-end gap-1 h-32">
      {stats.map((s, i) => {
        const mH = Math.max((s.matches / maxVal) * 100, 2);
        const dH = Math.max((s.deals / maxVal) * 100, 2);
        const dayLabel = new Date(s.day).toLocaleDateString('ar-SA', { weekday: 'short' });
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
            <div className="flex gap-0.5 items-end w-full justify-center" style={{ height: '100px' }}>
              <div
                className="w-2.5 rounded-t-sm bg-blue-400 transition-all duration-300"
                style={{ height: `${mH}%` }}
                title={`مطابقات: ${s.matches}`}
              />
              <div
                className="w-2.5 rounded-t-sm bg-emerald-400 transition-all duration-300"
                style={{ height: `${dH}%` }}
                title={`صفقات: ${s.deals}`}
              />
            </div>
            <span className="text-[8px] text-slate-400 truncate w-full text-center">{dayLabel}</span>
          </div>
        );
      })}
    </div>
  );
}

function GapCard({ city, demand, supply, gap }: { city: string; demand: number; supply: number; gap: number }) {
  const isDeficit = gap > 0;
  return (
    <div className="flex items-center gap-3 p-3 bg-slate-50/80 rounded-lg">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
        isDeficit ? 'bg-red-50' : 'bg-green-50'
      }`}>
        {isDeficit
          ? <ArrowUpRight className="w-4 h-4 text-red-500" />
          : <ArrowDownRight className="w-4 h-4 text-green-500" />
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-slate-800 truncate">{city}</p>
        <div className="flex gap-3 text-[10px] text-slate-500">
          <span>طلب: {demand.toLocaleString('ar-SA')}</span>
          <span>عرض: {supply.toLocaleString('ar-SA')}</span>
        </div>
      </div>
      <div className={`text-xs font-black ${isDeficit ? 'text-red-600' : 'text-green-600'}`}>
        {isDeficit ? '+' : ''}{gap.toLocaleString('ar-SA')}
      </div>
    </div>
  );
}

export default function MarketAnalysis({ data, loading }: Props) {
  if (loading || !data) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200/60 p-5 animate-pulse">
            <div className="h-5 bg-slate-100 rounded w-1/3 mb-4" />
            <div className="space-y-3">
              <div className="h-3 bg-slate-50 rounded w-full" />
              <div className="h-3 bg-slate-50 rounded w-3/4" />
              <div className="h-3 bg-slate-50 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const maxSizeDemand = Math.max(...data.size_demand.map((s) => s.order_count), 1);
  const maxQualityDemand = Math.max(...data.quality_demand.map((q) => q.count), 1);
  const maxTypeDemand = Math.max(...data.type_demand.map((t) => t.count), 1);

  const totalMatches = data.daily_stats.reduce((sum, d) => sum + d.matches, 0);
  const totalDeals = data.daily_stats.reduce((sum, d) => sum + d.deals, 0);
  const avgScore = data.daily_stats.length > 0
    ? Math.round(data.daily_stats.reduce((sum, d) => sum + d.avg_score, 0) / data.daily_stats.filter(d => d.avg_score > 0).length || 1)
    : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-slate-200/60 p-4 text-center">
          <p className="text-2xl font-black text-blue-600">{totalMatches.toLocaleString('ar-SA')}</p>
          <p className="text-[11px] text-slate-500 mt-1">مطابقات (14 يوم)</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200/60 p-4 text-center">
          <p className="text-2xl font-black text-emerald-600">{totalDeals.toLocaleString('ar-SA')}</p>
          <p className="text-[11px] text-slate-500 mt-1">صفقات (14 يوم)</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200/60 p-4 text-center">
          <p className="text-2xl font-black text-amber-600">{avgScore}%</p>
          <p className="text-[11px] text-slate-500 mt-1">متوسط التطابق</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200/60 p-5">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-blue-600" />
          <h3 className="text-sm font-black text-slate-900">المطابقات والصفقات اليومية</h3>
        </div>
        <DailyChart stats={data.daily_stats} />
        <div className="flex justify-center gap-4 mt-3">
          <span className="flex items-center gap-1.5 text-[10px] text-slate-500">
            <span className="w-3 h-2 bg-blue-400 rounded-sm" /> مطابقات
          </span>
          <span className="flex items-center gap-1.5 text-[10px] text-slate-500">
            <span className="w-3 h-2 bg-emerald-400 rounded-sm" /> صفقات
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200/60 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Layers className="w-5 h-5 text-cyan-600" />
            <h3 className="text-sm font-black text-slate-900">أكثر المقاسات طلباً</h3>
          </div>
          <div className="space-y-2.5">
            {data.size_demand.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">لا توجد بيانات</p>
            ) : (
              data.size_demand.map((s) => (
                <ChartBar key={s.size} value={s.order_count} max={maxSizeDemand} color="#0891b2" label={s.size} />
              ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/60 p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-amber-600" />
            <h3 className="text-sm font-black text-slate-900">الجودة الأكثر طلباً</h3>
          </div>
          <div className="space-y-2.5">
            {data.quality_demand.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">لا توجد بيانات</p>
            ) : (
              data.quality_demand.map((q) => (
                <ChartBar key={q.quality} value={q.count} max={maxQualityDemand} color="#d97706" label={q.quality} />
              ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/60 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Layers className="w-5 h-5 text-blue-600" />
            <h3 className="text-sm font-black text-slate-900">أنواع الطبليات الأكثر طلباً</h3>
          </div>
          <div className="space-y-2.5">
            {data.type_demand.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">لا توجد بيانات</p>
            ) : (
              data.type_demand.map((t) => (
                <ChartBar key={t.pallet_type} value={t.count} max={maxTypeDemand} color="#2563eb" label={t.pallet_type} />
              ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/60 p-5">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="w-5 h-5 text-emerald-600" />
            <h3 className="text-sm font-black text-slate-900">أكثر المدن نشاطاً</h3>
          </div>
          <div className="space-y-2">
            {data.city_activity.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">لا توجد بيانات</p>
            ) : (
              data.city_activity.slice(0, 8).map((c) => (
                <div key={c.city} className="flex items-center justify-between p-2.5 bg-slate-50/80 rounded-lg">
                  <span className="text-xs font-bold text-slate-800">{c.city}</span>
                  <div className="flex gap-3 text-[10px]">
                    <span className="text-blue-600">{c.orders} طلب</span>
                    <span className="text-emerald-600">{c.inventory} عرض</span>
                    <span className="text-amber-600">{c.deals} صفقة</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200/60 p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-red-600" />
          <h3 className="text-sm font-black text-slate-900">فجوة العرض والطلب حسب المدينة</h3>
          <span className="text-[10px] text-slate-400 mr-auto">الموجب = نقص في العرض</span>
        </div>
        <div className="space-y-2">
          {data.supply_demand_gap.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-4">لا توجد بيانات</p>
          ) : (
            data.supply_demand_gap.slice(0, 10).map((g) => (
              <GapCard
                key={g.city}
                city={g.city}
                demand={g.demand_qty}
                supply={g.supply_qty}
                gap={g.gap}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
