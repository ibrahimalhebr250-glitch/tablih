import { useState } from 'react';
import { RefreshCw, Activity, Users, Package, ShoppingCart, Handshake, BarChart3, TrendingUp, ArrowLeft, Layers, Store, MessageSquare, ShoppingBag } from 'lucide-react';
import { useAdminDashboard } from '../../../hooks/useAdminDashboard';
import type { TimeFilter, PlatformStats } from '../../../hooks/useAdminDashboard';
import MarketOverview from '../dashboard/MarketOverview';
import DealFlowPreview from '../dashboard/DealFlowPreview';
import FinancialSnapshot from '../dashboard/FinancialSnapshot';
import ActivityFeed from '../dashboard/ActivityFeed';
import ActivityChart from '../dashboard/ActivityChart';

interface Props {
  onNavigate: (section: string) => void;
}

const FILTERS: { id: TimeFilter; label: string }[] = [
  { id: 'today', label: 'اليوم' },
  { id: 'week', label: 'الأسبوع' },
  { id: 'month', label: 'الشهر' },
];

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}م`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}ك`;
  return n.toLocaleString('ar-SA');
}

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  bg: string;
  suffix?: string;
  onClick?: () => void;
  loading: boolean;
}

function StatCard({ label, value, icon, color, bg, suffix, onClick, loading }: StatCardProps) {
  return (
    <button
      onClick={onClick}
      className="group relative rounded-2xl p-4 text-right transition-all hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98] flex flex-col gap-2 bg-white border border-slate-200/60 overflow-hidden"
    >
      <div className="absolute top-0 left-0 w-full h-0.5 opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: color }} />
      <div className="flex items-center justify-between">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110" style={{ background: bg }}>
          {icon}
        </div>
        {onClick && <ArrowLeft className="w-3.5 h-3.5 text-slate-300 opacity-0 group-hover:opacity-100 transition-all" />}
      </div>
      {loading ? (
        <div className="h-7 w-16 bg-slate-100 rounded-lg animate-pulse" />
      ) : (
        <p className="text-xl font-black text-slate-900 leading-none">
          {fmt(value)}{suffix && <span className="text-xs font-bold text-slate-500 mr-1">{suffix}</span>}
        </p>
      )}
      <p className="text-[11px] font-semibold text-slate-500 leading-tight">{label}</p>
    </button>
  );
}

function PlatformOverview({ stats, loading, onNavigate }: { stats: PlatformStats | null; loading: boolean; onNavigate: (s: string) => void }) {
  const cards = [
    { label: 'إجمالي المستخدمين', value: stats?.total_users ?? 0, icon: <Users className="w-5 h-5 text-blue-600" />, color: '#2563eb', bg: '#eff6ff', nav: 'users' },
    { label: 'الموردين', value: stats?.total_suppliers ?? 0, icon: <Package className="w-5 h-5 text-emerald-600" />, color: '#059669', bg: '#ecfdf5', nav: 'users' },
    { label: 'المشترين', value: stats?.total_buyers ?? 0, icon: <ShoppingCart className="w-5 h-5 text-sky-600" />, color: '#0284c7', bg: '#f0f9ff', nav: 'users' },
    { label: 'مخزون نشط', value: stats?.active_inventory ?? 0, icon: <Layers className="w-5 h-5 text-amber-600" />, color: '#d97706', bg: '#fffbeb', nav: 'inventory' },
    { label: 'منشور في السوق', value: stats?.published_to_market ?? 0, icon: <Store className="w-5 h-5 text-teal-600" />, color: '#0d9488', bg: '#f0fdfa', nav: 'market' },
    { label: 'طلبات نشطة', value: stats?.active_orders ?? 0, icon: <ShoppingCart className="w-5 h-5 text-blue-600" />, color: '#2563eb', bg: '#eff6ff', nav: 'orders' },
    { label: 'صفقات جارية', value: stats?.active_deals ?? 0, icon: <Handshake className="w-5 h-5 text-green-600" />, color: '#16a34a', bg: '#f0fdf4', nav: 'deals' },
    { label: 'صفقات مكتملة', value: stats?.completed_deals ?? 0, icon: <BarChart3 className="w-5 h-5 text-slate-600" />, color: '#475569', bg: '#f8fafc', nav: 'deals' },
    { label: 'طبليات متداولة', value: stats?.total_pallets_in_platform ?? 0, icon: <Package className="w-5 h-5 text-orange-600" />, color: '#ea580c', bg: '#fff7ed', suffix: 'طبلية', nav: 'inventory' },
    { label: 'طلبات تفاوض', value: stats?.negotiation_requests ?? 0, icon: <MessageSquare className="w-5 h-5 text-rose-600" />, color: '#e11d48', bg: '#fff1f2', nav: 'market' },
    { label: 'طلبات من بطاقات السوق', value: stats?.orders_from_market ?? 0, icon: <ShoppingBag className="w-5 h-5 text-teal-600" />, color: '#0d9488', bg: '#f0fdfa', nav: 'orders' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-blue-600" />
        <div>
          <p className="text-sm font-black text-slate-900">نظرة عامة على المنصة</p>
          <p className="text-xs text-slate-500">إحصائيات المنصة في الوقت الفعلي</p>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        {cards.map(c => (
          <StatCard
            key={c.label}
            label={c.label}
            value={c.value}
            icon={c.icon}
            color={c.color}
            bg={c.bg}
            suffix={c.suffix}
            onClick={() => onNavigate(c.nav)}
            loading={loading}
          />
        ))}
      </div>
    </div>
  );
}

export default function DashboardSection({ onNavigate }: Props) {
  const [filter, setFilter] = useState<TimeFilter>('month');
  const { stats, cities, dealFlow, financial, activity, dailyActivity, loading, refetch } = useAdminDashboard(filter);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50" dir="rtl">
      <div className="max-w-[1600px] mx-auto p-4 lg:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white rounded-2xl p-4 lg:p-5 shadow-sm border border-slate-200/60">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/25">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900">لوحة القيادة</h1>
              <p className="text-xs text-slate-500">مركز التحكم الشامل للمنصة</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex bg-slate-100 rounded-xl p-1">
              {FILTERS.map(f => (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                    filter === f.id
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <button
              onClick={refetch}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all shadow-md shadow-blue-600/25 disabled:opacity-50 active:scale-95"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'جارٍ...' : 'تحديث'}
            </button>
          </div>
        </div>

        <PlatformOverview stats={stats} loading={loading} onNavigate={onNavigate} />

        <FinancialSnapshot financial={financial} loading={loading} />

        <ActivityChart dailyActivity={dailyActivity} loading={loading} />

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/60">
          <h3 className="text-base font-black text-slate-900 mb-4">تدفق الصفقات</h3>
          <DealFlowPreview dealFlow={dealFlow} loading={loading} onViewAll={() => onNavigate('deals')} />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/60">
            <h3 className="text-base font-black text-slate-900 mb-4">نظرة عامة على السوق</h3>
            <MarketOverview cities={cities} loading={loading} onRefresh={refetch} />
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/60">
            <h3 className="text-base font-black text-slate-900 mb-4">سجل النشاط</h3>
            <ActivityFeed activity={activity} loading={loading} />
          </div>
        </div>
      </div>
    </div>
  );
}
