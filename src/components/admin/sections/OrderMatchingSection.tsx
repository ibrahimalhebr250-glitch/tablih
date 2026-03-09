import { RefreshCw, Radar, Handshake, AlertTriangle, BarChart3, SearchX } from 'lucide-react';
import { useOrderMatching } from '../../../hooks/useOrderMatching';
import MatchingBoard from '../order-matching/MatchingBoard';
import MarketOpportunities from '../order-matching/MarketOpportunities';
import MarketAnalysis from '../order-matching/MarketAnalysis';
import NearMatchesDiagnostics from '../order-matching/NearMatchesDiagnostics';

type Tab = 'board' | 'opportunities' | 'analysis' | 'near_matches';

const TABS: { id: Tab; label: string; icon: typeof Handshake }[] = [
  { id: 'board', label: 'لوحة المطابقات', icon: Handshake },
  { id: 'near_matches', label: 'تطابقات قريبة', icon: SearchX },
  { id: 'opportunities', label: 'فرص السوق', icon: AlertTriangle },
  { id: 'analysis', label: 'تحليل السوق', icon: BarChart3 },
];

export default function OrderMatchingSection() {
  const {
    candidates,
    opportunities,
    analysis,
    nearMatches,
    loading,
    activeTab,
    setActiveTab,
    fetchCandidates,
    createDealFromCandidate,
    refreshAll,
  } = useOrderMatching();

  const highScoreCount = candidates.filter((c) => c.match_score >= 90).length;
  const unmatchedOrders = opportunities?.unmatched_orders.length ?? 0;
  const unmatchedInventory = opportunities?.unmatched_inventory.length ?? 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50" dir="rtl">
      <div className="max-w-[1400px] mx-auto p-4 lg:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white rounded-2xl p-4 lg:p-5 shadow-sm border border-slate-200/60">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-gradient-to-br from-cyan-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-600/25">
              <Radar className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900">مطابقة الطلبات</h1>
              <p className="text-xs text-slate-500">نظام ذكي لمطابقة الطلبات مع العروض تلقائياً</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                يعمل تلقائياً
              </span>
            </div>
            <button
              onClick={refreshAll}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all shadow-md shadow-blue-600/25 disabled:opacity-50 active:scale-95"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'جارٍ...' : 'تحديث'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl border border-slate-200/60 p-4">
            <p className="text-2xl font-black text-slate-900">{candidates.length}</p>
            <p className="text-[11px] text-slate-500 mt-1">مطابقات محتملة</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200/60 p-4">
            <p className="text-2xl font-black text-green-600">{highScoreCount}</p>
            <p className="text-[11px] text-slate-500 mt-1">تطابق عالي (90%+)</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200/60 p-4">
            <p className="text-2xl font-black text-red-600">{unmatchedOrders}</p>
            <p className="text-[11px] text-slate-500 mt-1">طلبات بدون عرض</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200/60 p-4">
            <p className="text-2xl font-black text-amber-600">{unmatchedInventory}</p>
            <p className="text-[11px] text-slate-500 mt-1">عروض بدون طلب</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
          <div className="flex border-b border-slate-200/60 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2 px-5 py-3.5 text-xs font-bold whitespace-nowrap transition-all border-b-2 ${
                  activeTab === id
                    ? 'text-blue-600 border-blue-600 bg-blue-50/40'
                    : 'text-slate-500 border-transparent hover:text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
                {id === 'board' && candidates.length > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${
                    activeTab === id ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                  }`}>{candidates.length}</span>
                )}
                {id === 'near_matches' && nearMatches.length > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${
                    activeTab === id ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                  }`}>{nearMatches.length}</span>
                )}
              </button>
            ))}
          </div>

          <div className="p-4 lg:p-5">
            {activeTab === 'board' && (
              <MatchingBoard
                candidates={candidates}
                loading={loading}
                onCreateDeal={createDealFromCandidate}
                onRefresh={() => fetchCandidates()}
              />
            )}
            {activeTab === 'opportunities' && (
              <MarketOpportunities data={opportunities} loading={loading} />
            )}
            {activeTab === 'near_matches' && (
              <NearMatchesDiagnostics data={nearMatches} loading={loading} />
            )}
            {activeTab === 'analysis' && (
              <MarketAnalysis data={analysis} loading={loading} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
