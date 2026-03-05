import { Users, Package, UserPlus, UserX, MapPin, TrendingUp, Loader2 } from 'lucide-react';
import { useUserAnalytics } from '../../../hooks/useStaffManagement';

function fmt(n: number) {
  return n.toLocaleString('ar-SA');
}

function monthLabel(key: string) {
  const [y, m] = key.split('-');
  const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  return `${months[parseInt(m) - 1]} ${y}`;
}

export default function UserAnalytics() {
  const { data, loading } = useUserAnalytics();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-7 h-7 text-[#1a4a5e] animate-spin" />
      </div>
    );
  }

  const kpis = [
    { label: 'إجمالي المستخدمين', value: fmt(data.totalUsers), icon: Users, color: '#1a4a5e', bg: '#EBF5FF' },
    { label: 'الموردين النشطين', value: fmt(data.activeSuppliers), icon: Package, color: '#16a34a', bg: '#f0fdf4' },
    { label: 'مستخدمون جدد هذا الشهر', value: fmt(data.newUsersThisMonth), icon: UserPlus, color: '#0369A1', bg: '#E0F2FE' },
    { label: 'مستخدمون غير نشطين', value: fmt(data.inactiveUsers), icon: UserX, color: '#dc2626', bg: '#fef2f2' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white rounded-xl border border-[#e2edf5] p-4 hover:shadow-sm transition-shadow">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: bg }}>
              <Icon className="w-4.5 h-4.5" style={{ color }} />
            </div>
            <p className="text-[20px] font-bold text-[#1a2f3e]">{value}</p>
            <p className="text-[11px] text-[#7a9aab] mt-1">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <TopSuppliersCard suppliers={data.topSuppliers} />
        <CityDistributionCard cities={data.cityDistribution} />
      </div>

      <GrowthChart months={data.monthlyGrowth} />
    </div>
  );
}

function TopSuppliersCard({ suppliers }: { suppliers: { phone: string; display_name: string; city: string; pallets: number }[] }) {
  return (
    <div className="bg-white rounded-2xl border border-[#e2edf5] overflow-hidden">
      <div className="flex items-center gap-2.5 p-5 border-b border-[#e2edf5]">
        <div className="w-9 h-9 rounded-xl bg-[#f0fdf4] flex items-center justify-center">
          <TrendingUp className="w-4 h-4 text-[#16a34a]" />
        </div>
        <div>
          <h4 className="text-[14px] font-bold text-[#1a2f3e]">أفضل الموردين</h4>
          <p className="text-[11px] text-[#7a9aab]">ترتيب حسب الطبليات المباعة</p>
        </div>
      </div>
      {suppliers.length === 0 ? (
        <p className="text-center text-[13px] text-[#7a9aab] py-10">لا توجد بيانات بعد</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#f8fafb]">
                <th className="px-5 py-2.5 text-right text-[11px] font-semibold text-[#4a7a94] w-10">#</th>
                <th className="px-3 py-2.5 text-right text-[11px] font-semibold text-[#4a7a94]">المورد</th>
                <th className="px-3 py-2.5 text-right text-[11px] font-semibold text-[#4a7a94]">المدينة</th>
                <th className="px-5 py-2.5 text-right text-[11px] font-semibold text-[#4a7a94]">الطبليات المباعة</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((s, i) => (
                <tr key={s.phone} className="border-t border-[#f0f4f7] hover:bg-[#f7fbfd] transition-colors">
                  <td className="px-5 py-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      i < 3 ? 'bg-[#1a4a5e] text-white' : 'bg-[#e2edf5] text-[#4a7a94]'
                    }`}>{i + 1}</span>
                  </td>
                  <td className="px-3 py-3 text-[13px] font-semibold text-[#1a2f3e]">{s.display_name}</td>
                  <td className="px-3 py-3 text-[12px] text-[#4a7a94]">{s.city || '-'}</td>
                  <td className="px-5 py-3 text-[13px] font-bold text-[#1a2f3e]">{fmt(s.pallets)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function CityDistributionCard({ cities }: { cities: { city: string; count: number; percentage: number }[] }) {
  const maxCount = cities.length > 0 ? cities[0].count : 1;
  const colors = ['#1a4a5e', '#2c6f8a', '#4a9ab5', '#6ab3cc', '#8cc4d8', '#b0dcea'];

  return (
    <div className="bg-white rounded-2xl border border-[#e2edf5] overflow-hidden">
      <div className="flex items-center gap-2.5 p-5 border-b border-[#e2edf5]">
        <div className="w-9 h-9 rounded-xl bg-[#EBF5FF] flex items-center justify-center">
          <MapPin className="w-4 h-4 text-[#1a4a5e]" />
        </div>
        <div>
          <h4 className="text-[14px] font-bold text-[#1a2f3e]">توزيع المستخدمين حسب المدينة</h4>
          <p className="text-[11px] text-[#7a9aab]">عدد المستخدمين المسجلين في كل مدينة</p>
        </div>
      </div>
      {cities.length === 0 ? (
        <p className="text-center text-[13px] text-[#7a9aab] py-10">لا توجد بيانات بعد</p>
      ) : (
        <div className="p-5 space-y-3">
          {cities.slice(0, 10).map((c, i) => (
            <div key={c.city} className="flex items-center gap-3">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                i < 3 ? 'bg-[#1a4a5e] text-white' : 'bg-[#e2edf5] text-[#4a7a94]'
              }`}>{i + 1}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] text-[#7a9aab]">{fmt(c.count)} مستخدم ({c.percentage}%)</span>
                  <span className="text-[13px] font-semibold text-[#1a2f3e]">{c.city}</span>
                </div>
                <div className="h-2 bg-[#f0f6fa] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${(c.count / maxCount) * 100}%`, background: colors[i % colors.length] }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function GrowthChart({ months }: { months: { month: string; count: number }[] }) {
  const maxCount = Math.max(...months.map(m => m.count), 1);

  return (
    <div className="bg-white rounded-2xl border border-[#e2edf5] overflow-hidden">
      <div className="flex items-center gap-2.5 p-5 border-b border-[#e2edf5]">
        <div className="w-9 h-9 rounded-xl bg-[#E0F2FE] flex items-center justify-center">
          <TrendingUp className="w-4 h-4 text-[#0369A1]" />
        </div>
        <div>
          <h4 className="text-[14px] font-bold text-[#1a2f3e]">نمو المستخدمين الشهري</h4>
          <p className="text-[11px] text-[#7a9aab]">عدد المستخدمين الجدد المسجلين كل شهر</p>
        </div>
      </div>

      {months.length === 0 ? (
        <p className="text-center text-[13px] text-[#7a9aab] py-10">لا توجد بيانات بعد</p>
      ) : (
        <div className="p-5">
          <div className="flex items-end gap-2 h-48">
            {months.map((m, i) => {
              const height = maxCount > 0 ? (m.count / maxCount) * 100 : 0;
              const isLast = i === months.length - 1;
              return (
                <div key={m.month} className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
                  <span className="text-[10px] font-bold text-[#1a2f3e]">{fmt(m.count)}</span>
                  <div
                    className="w-full rounded-t-lg transition-all duration-500"
                    style={{
                      height: `${Math.max(height, 4)}%`,
                      background: isLast ? '#1a4a5e' : '#8cc4d8',
                      minHeight: '4px',
                    }}
                  />
                  <span className="text-[8px] text-[#7a9aab] truncate w-full text-center">{monthLabel(m.month)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
