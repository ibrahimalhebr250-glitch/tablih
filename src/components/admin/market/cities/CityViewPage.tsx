import { useEffect, useState } from 'react';
import { ArrowRight, Package, ShoppingCart, Handshake, BarChart2 } from 'lucide-react';
import type { City, CityStats } from '../../../../hooks/useMarket';

interface Props {
  city: City;
  getStats: (name: string) => Promise<CityStats | null>;
  onBack: () => void;
}

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  active: { label: 'نشطة', color: '#16a34a', bg: '#f0fdf4' },
  frozen: { label: 'مجمدة', color: '#64748b', bg: '#f1f5f9' },
  monitoring: { label: 'مراقبة', color: '#ca8a04', bg: '#fefce8' },
  pilot: { label: 'تجريبي', color: '#2563eb', bg: '#eff6ff' },
};

export default function CityViewPage({ city, getStats, onBack }: Props) {
  const [stats, setStats] = useState<CityStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getStats(city.name).then(s => {
      setStats(s);
      setLoading(false);
    });
  }, [city.name, getStats]);

  const st = STATUS_LABELS[city.status] ?? STATUS_LABELS.monitoring;

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 rounded-xl bg-[#f0f6fa] text-[#4a7a94] hover:bg-[#e2edf5] transition-colors"
        >
          <ArrowRight className="w-4 h-4" />
        </button>
        <div>
          <h3 className="text-[17px] font-black text-[#1a2f3e]">{city.name}</h3>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold" style={{ background: st.bg, color: st.color }}>
            {st.label}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {[
          { label: 'إجمالي العرض', value: stats?.total_supply ?? 0, icon: Package, color: '#2563eb', suffix: ' طبلية' },
          { label: 'إجمالي الطلب', value: stats?.total_demand ?? 0, icon: ShoppingCart, color: '#ca8a04', suffix: ' طبلية' },
          { label: 'صفقات نشطة', value: stats?.active_deals ?? 0, icon: Handshake, color: '#16a34a', suffix: '' },
          { label: 'دفعات المخزون', value: stats?.inventory_count ?? 0, icon: Package, color: '#7c3aed', suffix: '' },
          { label: 'طلبات نشطة', value: stats?.request_count ?? 0, icon: ShoppingCart, color: '#dc2626', suffix: '' },
          {
            label: 'نسبة التغطية',
            value: stats && stats.total_demand > 0 ? Math.round((stats.total_supply / stats.total_demand) * 100) : 0,
            icon: BarChart2,
            color: '#0891b2',
            suffix: '%',
          },
        ].map(({ label, value, icon: Icon, color, suffix }) => (
          <div key={label} className="bg-white rounded-2xl border border-[#e2edf5] p-4 space-y-2">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${color}18` }}>
              <Icon className="w-4 h-4" style={{ color }} />
            </div>
            {loading ? (
              <div className="h-7 w-16 bg-gray-100 rounded-lg animate-pulse" />
            ) : (
              <p className="text-[22px] font-black text-[#1a2f3e] leading-none">{value.toLocaleString('ar-SA')}{suffix}</p>
            )}
            <p className="text-[11px] text-[#7a9aab] font-semibold">{label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-[#e2edf5] p-5 space-y-3">
        <p className="text-[13px] font-bold text-[#4a7a94]">إعدادات المدينة</p>
        <div className="grid grid-cols-2 gap-3 text-[13px]">
          <div><span className="text-[#7a9aab]">رسوم مخصصة: </span><span className="font-bold text-[#1a2f3e]">{city.custom_fee_override != null ? `${city.custom_fee_override}%` : 'افتراضي'}</span></div>
          <div><span className="text-[#7a9aab]">الحد الأدنى للكمية: </span><span className="font-bold text-[#1a2f3e]">{city.minimum_quantity} طبلية</span></div>
          <div><span className="text-[#7a9aab]">المطابقة: </span><span className="font-bold" style={{ color: city.matching_enabled ? '#16a34a' : '#dc2626' }}>{city.matching_enabled ? 'مفعلة' : 'متوقفة'}</span></div>
          <div><span className="text-[#7a9aab]">آخر تحديث: </span><span className="font-bold text-[#1a2f3e]">{new Date(city.updated_at).toLocaleDateString('ar-SA')}</span></div>
        </div>
        {city.notes && (
          <div className="pt-2 border-t border-[#f0f6fa]">
            <p className="text-[11px] text-[#7a9aab] mb-1">ملاحظات</p>
            <p className="text-[13px] text-[#1a2f3e]">{city.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}
