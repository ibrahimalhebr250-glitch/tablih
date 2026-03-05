import { MapPin, Pencil, Trash2, Snowflake, Play, BarChart2 } from 'lucide-react';
import type { CityStats } from '../../../hooks/useAdminDashboard';

interface Props {
  cities: CityStats[];
  loading: boolean;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  active: { label: 'نشطة', color: '#16a34a', bg: '#f0fdf4', dot: '#16a34a' },
  monitoring: { label: 'مراقبة', color: '#ca8a04', bg: '#fefce8', dot: '#ca8a04' },
  pilot: { label: 'تجريبي', color: '#2563eb', bg: '#eff6ff', dot: '#2563eb' },
  frozen: { label: 'مجمدة', color: '#64748b', bg: '#f8fafc', dot: '#64748b' },
};

function ratio(supply: number, demand: number): string {
  if (demand === 0) return supply > 0 ? '∞' : '—';
  return `${Math.round((supply / demand) * 100)}%`;
}

function CityCard({ city }: { city: CityStats }) {
  const cfg = STATUS_CONFIG[city.status] ?? STATUS_CONFIG.monitoring;
  const r = ratio(city.total_supply, city.total_demand);

  return (
    <div className="rounded-2xl bg-white border border-[#e2edf5] p-4 space-y-3 hover:shadow-md transition-all">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#f0f6fa] flex items-center justify-center">
            <MapPin className="w-4 h-4 text-[#1a4a5e]" />
          </div>
          <div>
            <p className="font-bold text-[14px] text-[#1a2f3e]">{city.name}</p>
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
              style={{ background: cfg.bg, color: cfg.color }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.dot }} />
              {cfg.label}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {city.status === 'frozen' ? (
            <button className="p-1.5 rounded-lg bg-[#f0fdf4] text-[#16a34a] hover:bg-[#dcfce7] transition-colors" title="تفعيل">
              <Play className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button className="p-1.5 rounded-lg bg-[#f0f6fa] text-[#64748b] hover:bg-[#e2edf5] transition-colors" title="تجميد">
              <Snowflake className="w-3.5 h-3.5" />
            </button>
          )}
          <button className="p-1.5 rounded-lg bg-[#e8f4fd] text-[#2563eb] hover:bg-[#dbeafe] transition-colors">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button className="p-1.5 rounded-lg bg-[#fef2f2] text-[#dc2626] hover:bg-[#fee2e2] transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-center">
        <div className="bg-[#f7fbfd] rounded-xl p-2">
          <p className="text-[18px] font-black text-[#1a4a5e]">{city.total_supply.toLocaleString('ar-SA')}</p>
          <p className="text-[10px] text-[#7a9aab] font-semibold">العرض</p>
        </div>
        <div className="bg-[#f7fbfd] rounded-xl p-2">
          <p className="text-[18px] font-black text-[#1a4a5e]">{city.total_demand.toLocaleString('ar-SA')}</p>
          <p className="text-[10px] text-[#7a9aab] font-semibold">الطلب</p>
        </div>
      </div>

      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5">
          <BarChart2 className="w-3.5 h-3.5 text-[#7a9aab]" />
          <span className="text-[11px] text-[#7a9aab]">نسبة التغطية:</span>
          <span className="text-[11px] font-bold text-[#1a4a5e]">{r}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-[#7a9aab]">صفقات نشطة:</span>
          <span className="text-[11px] font-bold text-[#1a4a5e]">{city.active_deals}</span>
        </div>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl bg-white border border-[#e2edf5] p-4 space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl bg-gray-100 animate-pulse" />
        <div className="space-y-1.5">
          <div className="h-4 w-20 bg-gray-100 rounded animate-pulse" />
          <div className="h-3 w-12 bg-gray-100 rounded animate-pulse" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="h-14 bg-gray-50 rounded-xl animate-pulse" />
        <div className="h-14 bg-gray-50 rounded-xl animate-pulse" />
      </div>
    </div>
  );
}

export default function MarketOverview({ cities, loading }: Props) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-bold text-[#4a7a94] uppercase tracking-wide">نظرة على السوق</p>
        <span className="text-[11px] text-[#7a9aab]">{cities.length} مدينة</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {loading
          ? Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
          : cities.map(c => <CityCard key={c.id} city={c} />)
        }
      </div>
    </div>
  );
}
