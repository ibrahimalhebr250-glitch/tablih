import { useState, useEffect } from 'react';
import {
  MapPin, Users, Ruler, Package, DollarSign, BarChart3, TrendingUp,
  Building2, Calendar, RefreshCw, Loader2, ChevronDown, ChevronUp
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';

type PeriodFilter = 'today' | 'week' | 'month' | 'year' | 'all';
type SortBy = 'pallets' | 'revenue' | 'deals';

interface CityPalletStat {
  city: string;
  pallets: number;
  salesVolume: number;
  percentage: number;
}

interface TopSupplier {
  phone: string;
  display_name: string;
  city: string;
  pallets: number;
  salesVolume: number;
  commission: number;
}

interface SizeDistribution {
  size: string;
  count: number;
  salesVolume: number;
  percentage: number;
}

interface MarketSummary {
  totalPallets: number;
  totalSalesVolume: number;
  totalDeals: number;
  activeCities: number;
  activeSuppliers: number;
  avgDealSize: number;
}

function fmt(n: number) {
  return n.toLocaleString('ar-SA');
}

function fmtSAR(n: number) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M ريال`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K ريال`;
  return `${fmt(n)} ريال`;
}

export default function EnhancedMarketStatistics({ onViewSupplier }: { onViewSupplier: (phone: string) => void }) {
  const [period, setPeriod] = useState<PeriodFilter>('month');
  const [loading, setLoading] = useState(true);
  const [citySales, setCitySales] = useState<CityPalletStat[]>([]);
  const [topSuppliers, setTopSuppliers] = useState<TopSupplier[]>([]);
  const [sizeDistribution, setSizeDistribution] = useState<SizeDistribution[]>([]);
  const [summary, setSummary] = useState<MarketSummary>({
    totalPallets: 0, totalSalesVolume: 0, totalDeals: 0,
    activeCities: 0, activeSuppliers: 0, avgDealSize: 0,
  });
  const [expandedCity, setExpandedCity] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortBy>('pallets');

  const loadData = async () => {
    setLoading(true);

    const startDate = getStartDate(period);

    const { data: deals } = await supabase
      .from('deals')
      .select('city, supplier_phone, quantity, size, platform_fee_per_pallet, final_price, created_at')
      .not('status', 'eq', 'cancelled')
      .gte('created_at', startDate);

    const { data: users } = await supabase
      .from('platform_users')
      .select('phone, display_name, city');

    const userMap = new Map((users || []).map(u => [u.phone, u]));

    const cityMap = new Map<string, { pallets: number; sales: number; deals: number }>();
    const supplierMap = new Map<string, { pallets: number; sales: number; commission: number }>();
    const sizeMap = new Map<string, { count: number; sales: number }>();
    let totalPallets = 0;
    let totalSales = 0;
    const allDeals = deals || [];

    for (const d of allDeals) {
      const qty = d.quantity;
      const price = Number(d.final_price) || 0;
      const dealSales = qty * price;
      totalPallets += qty;
      totalSales += dealSales;
      const fee = Number(d.platform_fee_per_pallet) || 1;

      const cityEntry = cityMap.get(d.city);
      if (cityEntry) {
        cityEntry.pallets += qty;
        cityEntry.sales += dealSales;
        cityEntry.deals += 1;
      } else {
        cityMap.set(d.city, { pallets: qty, sales: dealSales, deals: 1 });
      }

      const supEntry = supplierMap.get(d.supplier_phone);
      if (supEntry) {
        supEntry.pallets += qty;
        supEntry.sales += dealSales;
        supEntry.commission += qty * fee;
      } else {
        supplierMap.set(d.supplier_phone, { pallets: qty, sales: dealSales, commission: qty * fee });
      }

      const sizeEntry = sizeMap.get(d.size);
      if (sizeEntry) {
        sizeEntry.count += qty;
        sizeEntry.sales += dealSales;
      } else {
        sizeMap.set(d.size, { count: qty, sales: dealSales });
      }
    }

    const cityStats: CityPalletStat[] = Array.from(cityMap.entries())
      .map(([city, data]) => ({
        city,
        pallets: data.pallets,
        salesVolume: data.sales,
        percentage: totalPallets > 0 ? Math.round((data.pallets / totalPallets) * 100) : 0,
      }))
      .sort((a, b) => {
        if (sortBy === 'pallets') return b.pallets - a.pallets;
        if (sortBy === 'revenue') return b.salesVolume - a.salesVolume;
        return 0;
      })
      .slice(0, 10);

    const topSup: TopSupplier[] = Array.from(supplierMap.entries())
      .map(([phone, data]) => {
        const user = userMap.get(phone);
        return {
          phone,
          display_name: user?.display_name || phone,
          city: user?.city || '',
          pallets: data.pallets,
          salesVolume: data.sales,
          commission: data.commission,
        };
      })
      .sort((a, b) => b.pallets - a.pallets)
      .slice(0, 10);

    const sizeDist: SizeDistribution[] = Array.from(sizeMap.entries())
      .map(([size, data]) => ({
        size,
        count: data.count,
        salesVolume: data.sales,
        percentage: totalPallets > 0 ? Math.round((data.count / totalPallets) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    setSummary({
      totalPallets,
      totalSalesVolume: totalSales,
      totalDeals: allDeals.length,
      activeCities: cityMap.size,
      activeSuppliers: supplierMap.size,
      avgDealSize: allDeals.length > 0 ? Math.round(totalPallets / allDeals.length) : 0,
    });
    setCitySales(cityStats);
    setTopSuppliers(topSup);
    setSizeDistribution(sizeDist);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [period, sortBy]);

  const getStartDate = (p: PeriodFilter) => {
    switch (p) {
      case 'today': return new Date().toISOString().split('T')[0];
      case 'week': {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        return d.toISOString();
      }
      case 'month': {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        return d.toISOString();
      }
      case 'year': {
        const d = new Date();
        d.setDate(d.getDate() - 365);
        return d.toISOString();
      }
      default: return '2000-01-01';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-7 h-7 text-[#1a4a5e] animate-spin" />
      </div>
    );
  }

  const periods: { value: PeriodFilter; label: string }[] = [
    { value: 'today', label: 'اليوم' },
    { value: 'week', label: 'الأسبوع' },
    { value: 'month', label: 'الشهر' },
    { value: 'year', label: 'السنة' },
    { value: 'all', label: 'الكل' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-[17px] font-bold text-[#1a2f3e]">إحصائيات السوق</h3>
          <p className="text-[12px] text-[#7a9aab]">تحليل شامل لنشاط السوق والأداء</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex gap-1 bg-[#f0f6fa] rounded-xl p-1">
            {periods.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setPeriod(value)}
                className={`px-3 py-1.5 text-[11px] font-semibold rounded-lg transition-all ${
                  period === value
                    ? 'bg-white text-[#1a4a5e] shadow-sm'
                    : 'text-[#7a9aab] hover:text-[#1a4a5e]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <button
            onClick={loadData}
            className="p-2 rounded-xl bg-[#EBF5FF] text-[#1a4a5e] hover:bg-[#d6ecff] transition-colors"
            title="تحديث"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        <SummaryCard label="إجمالي الطبليات" value={`${fmt(summary.totalPallets)}`} sub="طبلية" icon={Package} color="#1a4a5e" bg="#EBF5FF" />
        <SummaryCard label="حجم المبيعات" value={fmtSAR(summary.totalSalesVolume)} sub="" icon={DollarSign} color="#0d7c3e" bg="#E8F8F0" />
        <SummaryCard label="عدد الصفقات" value={`${fmt(summary.totalDeals)}`} sub="صفقة" icon={BarChart3} color="#0369A1" bg="#E0F2FE" />
        <SummaryCard label="المدن النشطة" value={`${fmt(summary.activeCities)}`} sub="مدينة" icon={Building2} color="#B8860B" bg="#FFFBEB" />
        <SummaryCard label="الموردين" value={`${fmt(summary.activeSuppliers)}`} sub="مورد" icon={Users} color="#7C3AED" bg="#F3E8FF" />
        <SummaryCard label="متوسط الصفقة" value={`${fmt(summary.avgDealSize)}`} sub="طبلية" icon={TrendingUp} color="#0891B2" bg="#ECFEFF" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <CityRankingCard cities={citySales} sortBy={sortBy} onSortChange={setSortBy} expandedCity={expandedCity} onToggleExpand={setExpandedCity} />
        <TopSuppliersCard suppliers={topSuppliers} onView={onViewSupplier} />
      </div>

      <SizeDistributionCard sizes={sizeDistribution} />
    </div>
  );
}

function SummaryCard({ label, value, sub, icon: Icon, color, bg }: {
  label: string; value: string; sub: string; icon: typeof Package; color: string; bg: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-[#e2edf5] p-4 hover:shadow-sm transition-all">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3" style={{ background: bg }}>
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <p className="text-[17px] font-bold text-[#1a2f3e] leading-tight">{value}</p>
      {sub && <p className="text-[10px] text-[#7a9aab] -mt-0.5">{sub}</p>}
      <p className="text-[10px] text-[#7a9aab] mt-1.5 leading-tight">{label}</p>
    </div>
  );
}

function CityRankingCard({ cities, sortBy, onSortChange, expandedCity, onToggleExpand }: {
  cities: CityPalletStat[];
  sortBy: SortBy;
  onSortChange: (s: SortBy) => void;
  expandedCity: string | null;
  onToggleExpand: (city: string | null) => void;
}) {
  const maxPallets = cities.length > 0 ? cities[0].pallets : 1;

  return (
    <div className="bg-white rounded-2xl border border-[#e2edf5] overflow-hidden flex flex-col">
      <div className="p-5 border-b border-[#e2edf5]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#EBF5FF] flex items-center justify-center">
              <MapPin className="w-4.5 h-4.5 text-[#1a4a5e]" />
            </div>
            <div>
              <h4 className="text-[14px] font-bold text-[#1a2f3e]">أعلى المدن</h4>
              <p className="text-[11px] text-[#7a9aab]">ترتيب المدن حسب الأداء</p>
            </div>
          </div>

          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as SortBy)}
            className="px-3 py-1.5 text-[11px] font-semibold border border-[#e2edf5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a4a5e]/20"
          >
            <option value="pallets">حسب الطبليات</option>
            <option value="revenue">حسب المبيعات</option>
          </select>
        </div>
      </div>

      {cities.length === 0 ? (
        <p className="text-center text-[13px] text-[#7a9aab] py-12">لا توجد بيانات بعد</p>
      ) : (
        <div className="flex-1 overflow-y-auto max-h-[500px]">
          {cities.map((city, i) => {
            const isExpanded = expandedCity === city.city;
            const barColor = i === 0 ? '#1a4a5e' : i === 1 ? '#2c6f8a' : i === 2 ? '#4a9ab5' : '#8cc4d8';

            return (
              <div key={city.city} className="border-t border-[#f0f4f7]">
                <button
                  onClick={() => onToggleExpand(isExpanded ? null : city.city)}
                  className="w-full hover:bg-[#f7fbfd] transition-colors p-4"
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 ${
                      i < 3 ? 'bg-[#1a4a5e] text-white' : 'bg-[#e2edf5] text-[#4a7a94]'
                    }`}>
                      {i + 1}
                    </span>
                    <div className="flex-1 text-right">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[14px] font-bold text-[#1a2f3e]">{city.city}</span>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-[#7a9aab]" /> : <ChevronDown className="w-4 h-4 text-[#7a9aab]" />}
                      </div>
                      <div className="flex items-center gap-4 text-[11px]">
                        <span className="font-semibold text-[#1a2f3e]">{fmt(city.pallets)} طبلية</span>
                        <span className="font-semibold text-[#0d7c3e]">{fmtSAR(city.salesVolume)}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex-1 h-2 bg-[#f0f6fa] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${(city.pallets / maxPallets) * 100}%`, background: barColor }}
                          />
                        </div>
                        <span className="text-[10px] font-bold text-[#7a9aab] w-10">{city.percentage}%</span>
                      </div>
                    </div>
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 bg-[#f9fbfc] border-t border-[#f0f4f7]">
                    <div className="grid grid-cols-2 gap-3 pt-3">
                      <div className="bg-white rounded-lg p-3 border border-[#e2edf5]">
                        <p className="text-[10px] text-[#7a9aab] mb-1">الطبليات</p>
                        <p className="text-[16px] font-bold text-[#1a2f3e]">{fmt(city.pallets)}</p>
                      </div>
                      <div className="bg-white rounded-lg p-3 border border-[#e2edf5]">
                        <p className="text-[10px] text-[#7a9aab] mb-1">المبيعات</p>
                        <p className="text-[14px] font-bold text-[#0d7c3e]">{fmtSAR(city.salesVolume)}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TopSuppliersCard({ suppliers, onView }: {
  suppliers: TopSupplier[];
  onView: (phone: string) => void;
}) {
  return (
    <div className="bg-white rounded-2xl border border-[#e2edf5] overflow-hidden flex flex-col">
      <div className="flex items-center gap-2.5 p-5 border-b border-[#e2edf5]">
        <div className="w-9 h-9 rounded-xl bg-[#E8F8F0] flex items-center justify-center">
          <Users className="w-4.5 h-4.5 text-[#16a34a]" />
        </div>
        <div>
          <h4 className="text-[14px] font-bold text-[#1a2f3e]">أفضل الموردين</h4>
          <p className="text-[11px] text-[#7a9aab]">ترتيب حسب الطبليات المباعة</p>
        </div>
      </div>

      {suppliers.length === 0 ? (
        <p className="text-center text-[13px] text-[#7a9aab] py-12">لا توجد بيانات بعد</p>
      ) : (
        <div className="flex-1 overflow-y-auto max-h-[500px]">
          {suppliers.map((s, i) => (
            <div key={s.phone} className="border-t border-[#f0f4f7] hover:bg-[#f7fbfd] transition-colors p-4">
              <div className="flex items-center gap-3">
                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 ${
                  i < 3 ? 'bg-[#1a4a5e] text-white' : 'bg-[#e2edf5] text-[#4a7a94]'
                }`}>
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <button onClick={() => onView(s.phone)} className="text-[13px] font-bold text-[#1a4a5e] hover:underline truncate block max-w-full">
                    {s.display_name}
                  </button>
                  <p className="text-[11px] text-[#7a9aab]">{s.city || '-'}</p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-[11px] font-semibold text-[#1a2f3e]">{fmt(s.pallets)} طبلية</span>
                    <span className="text-[11px] font-semibold text-[#0d7c3e]">{fmtSAR(s.salesVolume)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SizeDistributionCard({ sizes }: { sizes: SizeDistribution[] }) {
  const colors = ['#1a4a5e', '#2c6f8a', '#4a9ab5', '#6ab3cc', '#8cc4d8', '#b0dcea', '#d0ecf4'];

  return (
    <div className="bg-white rounded-2xl border border-[#e2edf5] overflow-hidden">
      <div className="flex items-center gap-2.5 p-5 border-b border-[#e2edf5]">
        <div className="w-9 h-9 rounded-xl bg-[#FFFBEB] flex items-center justify-center">
          <Ruler className="w-4.5 h-4.5 text-[#B8860B]" />
        </div>
        <div>
          <h4 className="text-[14px] font-bold text-[#1a2f3e]">توزيع مقاسات الطبليات</h4>
          <p className="text-[11px] text-[#7a9aab]">المقاسات الأكثر تداولاً</p>
        </div>
      </div>

      {sizes.length === 0 ? (
        <p className="text-center text-[13px] text-[#7a9aab] py-12">لا توجد بيانات بعد</p>
      ) : (
        <div className="p-5">
          <div className="flex h-6 rounded-full overflow-hidden mb-5 shadow-inner">
            {sizes.map((s, i) => (
              <div
                key={s.size}
                className="transition-all duration-500 relative group cursor-pointer"
                style={{
                  width: `${s.percentage}%`,
                  background: colors[i % colors.length],
                  minWidth: s.percentage > 0 ? '4px' : '0',
                }}
              >
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-[#1a2f3e] text-white text-[10px] px-2.5 py-1.5 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-lg">
                  <div className="font-bold">{s.size}</div>
                  <div className="text-[9px] opacity-80">{s.percentage}%</div>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-0.5 border-4 border-transparent border-t-[#1a2f3e]" />
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {sizes.map((s, i) => (
              <div
                key={s.size}
                className="flex items-start gap-3 p-3 rounded-xl border border-[#f0f4f7] hover:border-[#e2edf5] hover:bg-[#f9fbfc] hover:shadow-sm transition-all"
              >
                <div className="w-3 h-3 rounded-sm flex-shrink-0 mt-1 shadow-sm" style={{ background: colors[i % colors.length] }} />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-bold text-[#1a2f3e]">{s.size}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[11px] text-[#4a7a94]">
                      {fmt(s.count)} طبلية
                    </span>
                    <span className="text-[11px] font-semibold text-[#0d7c3e]">
                      {fmtSAR(s.salesVolume)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className="flex-1 h-1.5 bg-[#f0f6fa] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{ width: `${s.percentage}%`, background: colors[i % colors.length] }}
                      />
                    </div>
                    <span className="text-[10px] font-bold text-[#7a9aab]">{s.percentage}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
