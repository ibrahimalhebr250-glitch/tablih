import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
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

export default function DashboardSection({ onNavigate }: Props) {
  const [filter, setFilter] = useState<TimeFilter>('month');
  const { metrics, cities, dealFlow, financial, activity, loading, refetch } = useAdminDashboard(filter);

  return (
    <div className="p-6 space-y-8" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-[#1a2f3e]">لوحة القيادة</h2>
          <p className="text-sm text-[#7a9aab] mt-0.5">نظرة شاملة على أداء المنصة</p>
        </div>
        <button
          onClick={refetch}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-[#f0f6fa] text-[#4a7a94] rounded-xl text-sm font-semibold hover:bg-[#e2edf5] transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          تحديث
        </button>
      </div>

      <ExecutiveMetrics
        metrics={metrics}
        filter={filter}
        onFilterChange={setFilter}
        loading={loading}
        onNavigate={onNavigate}
      />

      <div className="h-px bg-[#e2edf5]" />

      <QuickActionsPanel onNavigate={onNavigate} />

      <div className="h-px bg-[#e2edf5]" />

      <DealFlowPreview dealFlow={dealFlow} loading={loading} onViewAll={onNavigate} />

      <div className="h-px bg-[#e2edf5]" />

      <FinancialSnapshot financial={financial} loading={loading} />

      <div className="h-px bg-[#e2edf5]" />

      <MarketOverview cities={cities} loading={loading} />

      <div className="h-px bg-[#e2edf5]" />

      <ActivityFeed activity={activity} loading={loading} />
    </div>
  );
}
