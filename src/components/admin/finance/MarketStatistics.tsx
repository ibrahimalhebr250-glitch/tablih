import { MapPin, Users, Ruler, Loader2, Package, DollarSign, BarChart3, TrendingUp, Building2 } from 'lucide-react';
import { useMarketStats } from '../../../hooks/useFinance';
import type { MarketSummary, CityPalletStat, TopSupplier, SizeDistribution } from '../../../types/admin';

interface Props {
  onViewSupplier: (phone: string) => void;
}

function fmt(n: number) {
  return n.toLocaleString('ar-SA');
}

function fmtSAR(n: number) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M ريال`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K ريال`;
  return `${fmt(n)} ريال`;
}

export default function MarketStatistics({ onViewSupplier }: Props) {
  const { citySales, topSuppliers, sizeDistribution, summary, loading } = useMarketStats();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-7 h-7 text-[#1a4a5e] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <MarketOverview summary={summary} />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <CityRanking cities={citySales} />
        <TopSuppliersCard suppliers={topSuppliers} onView={onViewSupplier} />
      </div>

      <SizeDistributionCard sizes={sizeDistribution} />
    </div>
  );
}

function MarketOverview({ summary }: { summary: MarketSummary }) {
  const cards = [
    { label: 'إجمالي الطبليات', value: `${fmt(summary.totalPallets)}`, sub: 'طبلية', icon: Package, color: '#1a4a5e', bg: '#EBF5FF' },
    { label: 'حجم المبيعات', value: fmtSAR(summary.totalSalesVolume), sub: '', icon: DollarSign, color: '#0d7c3e', bg: '#E8F8F0' },
    { label: 'عدد الصفقات', value: `${fmt(summary.totalDeals)}`, sub: 'صفقة', icon: BarChart3, color: '#0369A1', bg: '#E0F2FE' },
    { label: 'المدن النشطة', value: `${fmt(summary.activeCities)}`, sub: 'مدينة', icon: Building2, color: '#B8860B', bg: '#FFFBEB' },
    { label: 'الموردين النشطين', value: `${fmt(summary.activeSuppliers)}`, sub: 'مورد', icon: Users, color: '#7C3AED', bg: '#F3E8FF' },
    { label: 'متوسط حجم الصفقة', value: `${fmt(summary.avgDealSize)}`, sub: 'طبلية/صفقة', icon: TrendingUp, color: '#0891B2', bg: '#ECFEFF' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
      {cards.map(({ label, value, sub, icon: Icon, color, bg }) => (
        <div key={label} className="bg-white rounded-xl border border-[#e2edf5] p-4 hover:shadow-sm transition-shadow">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3" style={{ background: bg }}>
            <Icon className="w-4 h-4" style={{ color }} />
          </div>
          <p className="text-[17px] font-bold text-[#1a2f3e] leading-tight">{value}</p>
          {sub && <p className="text-[10px] text-[#7a9aab] -mt-0.5">{sub}</p>}
          <p className="text-[10px] text-[#7a9aab] mt-1.5 leading-tight">{label}</p>
        </div>
      ))}
    </div>
  );
}

function CityRanking({ cities }: { cities: CityPalletStat[] }) {
  const maxPallets = cities.length > 0 ? cities[0].pallets : 1;

  return (
    <div className="bg-white rounded-2xl border border-[#e2edf5] overflow-hidden flex flex-col">
      <div className="flex items-center gap-2.5 p-5 border-b border-[#e2edf5]">
        <div className="w-9 h-9 rounded-xl bg-[#EBF5FF] flex items-center justify-center">
          <MapPin className="w-4.5 h-4.5 text-[#1a4a5e]" />
        </div>
        <div>
          <h4 className="text-[14px] font-bold text-[#1a2f3e]">أعلى المدن مبيعات للطبليات</h4>
          <p className="text-[11px] text-[#7a9aab]">ترتيب المدن حسب عدد الطبليات وحجم المبيعات</p>
        </div>
      </div>

      {cities.length === 0 ? (
        <p className="text-center text-[13px] text-[#7a9aab] py-12">لا توجد بيانات بعد</p>
      ) : (
        <div className="flex-1 overflow-x-auto">
          <table className="w-full text-sm min-w-[400px]">
            <thead>
              <tr className="bg-[#f8fafb]">
                <th className="px-5 py-2.5 text-right text-[11px] font-semibold text-[#4a7a94] w-10">#</th>
                <th className="px-3 py-2.5 text-right text-[11px] font-semibold text-[#4a7a94]">المدينة</th>
                <th className="px-3 py-2.5 text-right text-[11px] font-semibold text-[#4a7a94]">الطبليات</th>
                <th className="px-3 py-2.5 text-right text-[11px] font-semibold text-[#4a7a94]">حجم المبيعات</th>
                <th className="px-5 py-2.5 text-right text-[11px] font-semibold text-[#4a7a94] hidden lg:table-cell w-[140px]">النسبة</th>
              </tr>
            </thead>
            <tbody>
              {cities.map((city, i) => {
                const barColor = i === 0 ? '#1a4a5e' : i === 1 ? '#2c6f8a' : i === 2 ? '#4a9ab5' : '#8cc4d8';
                return (
                  <tr key={city.city} className="border-t border-[#f0f4f7] hover:bg-[#f7fbfd] transition-colors">
                    <td className="px-5 py-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        i < 3 ? 'bg-[#1a4a5e] text-white' : 'bg-[#e2edf5] text-[#4a7a94]'
                      }`}>
                        {i + 1}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-[13px] font-semibold text-[#1a2f3e]">{city.city}</td>
                    <td className="px-3 py-3">
                      <span className="text-[13px] font-bold text-[#1a2f3e]">{fmt(city.pallets)}</span>
                      <span className="text-[10px] text-[#7a9aab] mr-1">طبلية</span>
                    </td>
                    <td className="px-3 py-3">
                      <span className="text-[12px] font-semibold text-[#0d7c3e]">{fmtSAR(city.salesVolume)}</span>
                    </td>
                    <td className="px-5 py-3 hidden lg:table-cell">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-[#f0f6fa] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${(city.pallets / maxPallets) * 100}%`, background: barColor }}
                          />
                        </div>
                        <span className="text-[10px] font-semibold text-[#7a9aab] w-8 text-left">{city.percentage}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
          <p className="text-[11px] text-[#7a9aab]">ترتيب حسب الطبليات المباعة وحجم المبيعات</p>
        </div>
      </div>

      {suppliers.length === 0 ? (
        <p className="text-center text-[13px] text-[#7a9aab] py-12">لا توجد بيانات بعد</p>
      ) : (
        <div className="flex-1 overflow-x-auto">
          <table className="w-full text-sm min-w-[500px]">
            <thead>
              <tr className="bg-[#f8fafb]">
                <th className="px-5 py-2.5 text-right text-[11px] font-semibold text-[#4a7a94] w-10">#</th>
                <th className="px-3 py-2.5 text-right text-[11px] font-semibold text-[#4a7a94]">المورد</th>
                <th className="px-3 py-2.5 text-right text-[11px] font-semibold text-[#4a7a94]">المدينة</th>
                <th className="px-3 py-2.5 text-right text-[11px] font-semibold text-[#4a7a94]">الطبليات</th>
                <th className="px-3 py-2.5 text-right text-[11px] font-semibold text-[#4a7a94]">المبيعات</th>
                <th className="px-5 py-2.5 text-right text-[11px] font-semibold text-[#4a7a94]">العمولة</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((s, i) => (
                <tr key={s.phone} className="border-t border-[#f0f4f7] hover:bg-[#f7fbfd] transition-colors">
                  <td className="px-5 py-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      i < 3 ? 'bg-[#1a4a5e] text-white' : 'bg-[#e2edf5] text-[#4a7a94]'
                    }`}>
                      {i + 1}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <button onClick={() => onView(s.phone)} className="text-[13px] font-semibold text-[#1a4a5e] hover:underline">
                      {s.display_name}
                    </button>
                  </td>
                  <td className="px-3 py-3 text-[12px] text-[#4a7a94]">{s.city || '-'}</td>
                  <td className="px-3 py-3 text-[13px] font-bold text-[#1a2f3e]">{fmt(s.pallets)}</td>
                  <td className="px-3 py-3 text-[12px] font-semibold text-[#0d7c3e]">{fmtSAR(s.salesVolume)}</td>
                  <td className="px-5 py-3 text-[12px] font-semibold text-[#B8860B]">{fmt(s.commission)} ريال</td>
                </tr>
              ))}
            </tbody>
          </table>
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
          <p className="text-[11px] text-[#7a9aab]">المقاسات الأكثر تداولاً حسب عدد الطبليات وحجم المبيعات</p>
        </div>
      </div>

      {sizes.length === 0 ? (
        <p className="text-center text-[13px] text-[#7a9aab] py-12">لا توجد بيانات بعد</p>
      ) : (
        <div className="p-5">
          <div className="flex h-5 rounded-full overflow-hidden mb-5">
            {sizes.map((s, i) => (
              <div
                key={s.size}
                className="transition-all duration-500 relative group"
                style={{
                  width: `${s.percentage}%`,
                  background: colors[i % colors.length],
                  minWidth: s.percentage > 0 ? '4px' : '0',
                }}
              >
                <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-[#1a2f3e] text-white text-[10px] px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                  {s.size} - {s.percentage}%
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {sizes.map((s, i) => (
              <div
                key={s.size}
                className="flex items-start gap-3 p-3 rounded-xl border border-[#f0f4f7] hover:border-[#e2edf5] hover:bg-[#f9fbfc] transition-all"
              >
                <div className="w-3 h-3 rounded-sm flex-shrink-0 mt-1" style={{ background: colors[i % colors.length] }} />
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
                        className="h-full rounded-full"
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
