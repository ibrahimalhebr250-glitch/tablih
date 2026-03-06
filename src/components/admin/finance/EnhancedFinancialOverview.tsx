import { useState, useEffect } from 'react';
import {
  Package, Coins, AlertCircle, CheckCircle, TrendingUp, TrendingDown,
  DollarSign, Percent, Calendar, MapPin, RefreshCw, Loader2
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';

type PeriodFilter = 'today' | 'week' | 'month' | 'year' | 'all';

interface FinancialSummary {
  period: string;
  city: string | null;
  total_pallets: number;
  total_revenue: number;
  total_commission: number;
  settled_commission: number;
  pending_commission: number;
  overdue_commission: number;
  total_deals: number;
  active_suppliers: number;
  avg_commission_per_pallet: number;
  collection_rate: number;
}

interface CityBreakdown {
  city: string;
  deals_count: number;
  pallets_count: number;
  revenue: number;
  total_commission: number;
  settled_commission: number;
  pending_commission: number;
  suppliers_count: number;
  buyers_count: number;
  collection_rate: number;
}

function formatCurrency(amount: number) {
  if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M ريال`;
  if (amount >= 1000) return `${(amount / 1000).toFixed(1)}K ريال`;
  return `${amount.toLocaleString('ar-SA')} ريال`;
}

function formatNumber(num: number) {
  return num.toLocaleString('ar-SA');
}

export default function EnhancedFinancialOverview() {
  const [period, setPeriod] = useState<PeriodFilter>('month');
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [cities, setCities] = useState<CityBreakdown[]>([]);
  const [availableCities, setAvailableCities] = useState<string[]>([]);

  const loadData = async () => {
    setLoading(true);

    const cityParam = selectedCity || null;
    const { data: summaryData } = await supabase.rpc('get_financial_summary', {
      p_period: period,
      p_city: cityParam
    });

    if (summaryData) {
      setSummary(summaryData);
    }

    const { data: citiesData } = await supabase.rpc('get_city_financial_breakdown', {
      p_period: period
    });

    if (citiesData && citiesData.cities) {
      setCities(citiesData.cities);
      setAvailableCities(citiesData.cities.map((c: CityBreakdown) => c.city));
    }

    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [period, selectedCity]);

  if (loading || !summary) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-7 h-7 text-[#1a4a5e] animate-spin" />
      </div>
    );
  }

  const periods: { value: PeriodFilter; label: string }[] = [
    { value: 'today', label: 'اليوم' },
    { value: 'week', label: 'هذا الأسبوع' },
    { value: 'month', label: 'هذا الشهر' },
    { value: 'year', label: 'هذه السنة' },
    { value: 'all', label: 'الكل' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-[17px] font-bold text-[#1a2f3e]">النظرة العامة المالية</h3>
          <p className="text-[12px] text-[#7a9aab]">تحليل شامل لأداء المنصة المالي</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
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

          <div className="relative">
            <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#7a9aab] pointer-events-none" />
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="pr-10 pl-4 py-2 text-[12px] font-semibold border border-[#e2edf5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1a4a5e]/20 bg-white"
            >
              <option value="">جميع المدن</option>
              {availableCities.map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="إجمالي الطبليات"
          value={formatNumber(summary.total_pallets)}
          subValue="طبلية"
          icon={Package}
          color="#1a4a5e"
          bg="#EBF5FF"
          change={null}
        />
        <MetricCard
          label="إيرادات المنصة"
          value={formatCurrency(summary.total_commission)}
          subValue=""
          icon={Coins}
          color="#0d7c3e"
          bg="#E8F8F0"
          change={null}
        />
        <MetricCard
          label="معدل التحصيل"
          value={`${summary.collection_rate}%`}
          subValue={`${formatCurrency(summary.settled_commission)} محصل`}
          icon={Percent}
          color="#0369A1"
          bg="#E0F2FE"
          change={null}
        />
        <MetricCard
          label="متوسط العمولة"
          value={formatCurrency(summary.avg_commission_per_pallet)}
          subValue="لكل طبلية"
          icon={TrendingUp}
          color="#B8860B"
          bg="#FFFBEB"
          change={null}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <CommissionCard
          label="عمولات محصلة"
          amount={summary.settled_commission}
          icon={CheckCircle}
          color="#16a34a"
          bg="#F0FDF4"
        />
        <CommissionCard
          label="عمولات معلقة"
          amount={summary.pending_commission}
          icon={AlertCircle}
          color="#B8860B"
          bg="#FFFBEB"
        />
        <CommissionCard
          label="عمولات متأخرة"
          amount={summary.overdue_commission}
          icon={AlertCircle}
          color="#dc2626"
          bg="#FEF2F2"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ActivityCard
          label="إجمالي الصفقات"
          value={formatNumber(summary.total_deals)}
          subLabel="صفقة"
          icon={DollarSign}
          color="#1a4a5e"
          bg="#EBF5FF"
        />
        <ActivityCard
          label="الموردين النشطين"
          value={formatNumber(summary.active_suppliers)}
          subLabel="مورد"
          icon={Package}
          color="#0d7c3e"
          bg="#E8F8F0"
        />
      </div>

      {!selectedCity && cities.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#e2edf5] overflow-hidden">
          <div className="flex items-center gap-2.5 p-5 border-b border-[#e2edf5]">
            <div className="w-9 h-9 rounded-xl bg-[#EBF5FF] flex items-center justify-center">
              <MapPin className="w-4.5 h-4.5 text-[#1a4a5e]" />
            </div>
            <div>
              <h4 className="text-[14px] font-bold text-[#1a2f3e]">التفصيل حسب المدن</h4>
              <p className="text-[11px] text-[#7a9aab]">أداء كل مدينة والعمولات المحصلة</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead>
                <tr className="bg-[#f8fafb]">
                  <th className="px-5 py-3 text-right text-[11px] font-semibold text-[#4a7a94]">المدينة</th>
                  <th className="px-3 py-3 text-right text-[11px] font-semibold text-[#4a7a94]">الصفقات</th>
                  <th className="px-3 py-3 text-right text-[11px] font-semibold text-[#4a7a94]">الطبليات</th>
                  <th className="px-3 py-3 text-right text-[11px] font-semibold text-[#4a7a94]">إجمالي العمولة</th>
                  <th className="px-3 py-3 text-right text-[11px] font-semibold text-[#4a7a94]">محصلة</th>
                  <th className="px-3 py-3 text-right text-[11px] font-semibold text-[#4a7a94]">معلقة</th>
                  <th className="px-3 py-3 text-right text-[11px] font-semibold text-[#4a7a94]">معدل التحصيل</th>
                  <th className="px-5 py-3 text-right text-[11px] font-semibold text-[#4a7a94]">الموردين</th>
                </tr>
              </thead>
              <tbody>
                {cities.map((city, index) => (
                  <tr key={city.city} className="border-t border-[#f0f4f7] hover:bg-[#f7fbfd] transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          index < 3 ? 'bg-[#1a4a5e] text-white' : 'bg-[#e2edf5] text-[#4a7a94]'
                        }`}>
                          {index + 1}
                        </span>
                        <span className="text-[13px] font-semibold text-[#1a2f3e]">{city.city}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-[12px] text-[#4a7a94]">{formatNumber(city.deals_count)}</td>
                    <td className="px-3 py-3 text-[13px] font-bold text-[#1a2f3e]">{formatNumber(city.pallets_count)}</td>
                    <td className="px-3 py-3 text-[12px] font-semibold text-[#0d7c3e]">{formatCurrency(city.total_commission)}</td>
                    <td className="px-3 py-3 text-[12px] font-semibold text-[#16a34a]">{formatCurrency(city.settled_commission)}</td>
                    <td className="px-3 py-3 text-[12px] font-semibold text-[#B8860B]">{formatCurrency(city.pending_commission)}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 max-w-[60px] h-1.5 bg-[#f0f6fa] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[#16a34a]"
                            style={{ width: `${city.collection_rate}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-bold text-[#4a7a94] w-10">{city.collection_rate}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-[12px] text-[#4a7a94]">{formatNumber(city.suppliers_count)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value, subValue, icon: Icon, color, bg, change }: {
  label: string;
  value: string;
  subValue: string;
  icon: typeof Package;
  color: string;
  bg: string;
  change: { value: number; isPositive: boolean } | null;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-[#e2edf5] bg-white p-5 hover:shadow-md transition-all">
      <div className="absolute top-0 left-0 w-full h-1" style={{ background: color }} />
      <div className="flex items-start justify-between mb-3">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: bg }}>
          <Icon className="w-5.5 h-5.5" style={{ color }} />
        </div>
        {change && (
          <div className={`flex items-center gap-1 text-[10px] font-bold ${
            change.isPositive ? 'text-[#16a34a]' : 'text-[#dc2626]'
          }`}>
            {change.isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {Math.abs(change.value)}%
          </div>
        )}
      </div>
      <p className="text-[24px] font-bold text-[#1a2f3e] leading-none mb-1">{value}</p>
      {subValue && <p className="text-[10px] text-[#7a9aab]">{subValue}</p>}
      <p className="text-[11px] text-[#7a9aab] mt-2">{label}</p>
    </div>
  );
}

function CommissionCard({ label, amount, icon: Icon, color, bg }: {
  label: string;
  amount: number;
  icon: typeof CheckCircle;
  color: string;
  bg: string;
}) {
  return (
    <div className="rounded-2xl border border-[#e2edf5] bg-white p-5 hover:shadow-sm transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: bg }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
      </div>
      <p className="text-[20px] font-bold leading-none mb-1" style={{ color }}>{formatCurrency(amount)}</p>
      <p className="text-[11px] text-[#7a9aab]">{label}</p>
    </div>
  );
}

function ActivityCard({ label, value, subLabel, icon: Icon, color, bg }: {
  label: string;
  value: string;
  subLabel: string;
  icon: typeof DollarSign;
  color: string;
  bg: string;
}) {
  return (
    <div className="rounded-2xl border border-[#e2edf5] bg-white p-5 hover:shadow-sm transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] text-[#7a9aab] mb-2">{label}</p>
          <p className="text-[28px] font-bold text-[#1a2f3e] leading-none">{value}</p>
          <p className="text-[11px] text-[#7a9aab] mt-1">{subLabel}</p>
        </div>
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: bg }}>
          <Icon className="w-7 h-7" style={{ color }} />
        </div>
      </div>
    </div>
  );
}
