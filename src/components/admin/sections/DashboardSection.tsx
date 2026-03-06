import { useState } from 'react';
import { RefreshCw, Maximize2, Minimize2, TrendingUp, Activity } from 'lucide-react';
import { useAdminDashboard } from '../../../hooks/useAdminDashboard';
import ExecutiveMetrics from '../dashboard/ExecutiveMetrics';
import MarketOverview from '../dashboard/MarketOverview';
import DealFlowPreview from '../dashboard/DealFlowPreview';
import FinancialSnapshot from '../dashboard/FinancialSnapshot';
import ActivityFeed from '../dashboard/ActivityFeed';
import QuickActionsPanel from '../dashboard/QuickActionsPanel';
import type { TimeFilter } from '../../../hooks/useAdminDashboard';

interface Props {
  onNavigate: (section: string) => void;
}

type LayoutMode = 'default' | 'focus' | 'compact';

export default function DashboardSection({ onNavigate }: Props) {
  const [filter, setFilter] = useState<TimeFilter>('month');
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('default');
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const { metrics, cities, dealFlow, financial, activity, loading, refetch } = useAdminDashboard(filter);

  const lastRefresh = new Date().toLocaleTimeString('ar-SA', {
    hour: '2-digit',
    minute: '2-digit'
  });

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50" dir="rtl">
      <div className="max-w-[1600px] mx-auto p-6 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white rounded-2xl p-6 shadow-sm border border-slate-200/60">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/30">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900">لوحة القيادة التنفيذية</h1>
              <p className="text-sm text-slate-600 mt-0.5 flex items-center gap-2">
                <TrendingUp className="w-3.5 h-3.5" />
                تحليل شامل لأداء المنصة في الوقت الفعلي
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden lg:flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-xl">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs font-bold text-slate-700">آخر تحديث: {lastRefresh}</span>
            </div>

            <div className="flex bg-slate-100 rounded-xl p-1">
              <button
                onClick={() => setLayoutMode('default')}
                className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                  layoutMode === 'default' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                }`}
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setLayoutMode('compact')}
                className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                  layoutMode === 'compact' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                }`}
              >
                <Minimize2 className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              onClick={refetch}
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/30 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-xl hover:shadow-blue-600/40 active:scale-95"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'جاري التحديث...' : 'تحديث البيانات'}
            </button>
          </div>
        </div>

        <ExecutiveMetrics
          metrics={metrics}
          filter={filter}
          onFilterChange={setFilter}
          loading={loading}
          onNavigate={onNavigate}
        />

        <QuickActionsPanel onNavigate={onNavigate} />

        <div className={`grid gap-6 ${layoutMode === 'compact' ? 'lg:grid-cols-2' : 'lg:grid-cols-1'}`}>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/60">
            <button
              onClick={() => toggleSection('deals')}
              className="w-full flex items-center justify-between mb-4"
            >
              <h3 className="text-lg font-black text-slate-900">تدفق الصفقات</h3>
              <Maximize2 className={`w-4 h-4 text-slate-400 transition-transform ${expandedSection === 'deals' ? 'rotate-45' : ''}`} />
            </button>
            <DealFlowPreview
              dealFlow={dealFlow}
              loading={loading}
              onViewAll={onNavigate}
              compact={layoutMode === 'compact'}
            />
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/60">
            <button
              onClick={() => toggleSection('financial')}
              className="w-full flex items-center justify-between mb-4"
            >
              <h3 className="text-lg font-black text-slate-900">اللقطة المالية</h3>
              <Maximize2 className={`w-4 h-4 text-slate-400 transition-transform ${expandedSection === 'financial' ? 'rotate-45' : ''}`} />
            </button>
            <FinancialSnapshot financial={financial} loading={loading} />
          </div>
        </div>

        <div className={`grid gap-6 ${layoutMode === 'compact' ? 'lg:grid-cols-2' : 'lg:grid-cols-1'}`}>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/60">
            <button
              onClick={() => toggleSection('market')}
              className="w-full flex items-center justify-between mb-4"
            >
              <h3 className="text-lg font-black text-slate-900">نظرة عامة على السوق</h3>
              <Maximize2 className={`w-4 h-4 text-slate-400 transition-transform ${expandedSection === 'market' ? 'rotate-45' : ''}`} />
            </button>
            <MarketOverview cities={cities} loading={loading} onRefresh={refetch} />
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/60">
            <button
              onClick={() => toggleSection('activity')}
              className="w-full flex items-center justify-between mb-4"
            >
              <h3 className="text-lg font-black text-slate-900">سجل النشاط</h3>
              <Maximize2 className={`w-4 h-4 text-slate-400 transition-transform ${expandedSection === 'activity' ? 'rotate-45' : ''}`} />
            </button>
            <ActivityFeed activity={activity} loading={loading} />
          </div>
        </div>

        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-6 shadow-xl shadow-blue-600/20">
          <div className="flex items-center justify-between text-white">
            <div>
              <p className="text-sm opacity-90">هل تحتاج مساعدة؟</p>
              <p className="text-lg font-bold mt-1">تواصل مع فريق الدعم الفني</p>
            </div>
            <button
              onClick={() => window.open('mailto:support@palletexchange.com', '_blank')}
              className="px-6 py-3 bg-white text-blue-700 rounded-xl font-bold text-sm hover:bg-blue-50 transition-colors shadow-lg"
            >
              راسلنا الآن
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
