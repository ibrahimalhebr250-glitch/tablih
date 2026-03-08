import { useState, useEffect } from 'react';
import {
  Brain, Zap, TrendingUp, Activity, Target, Clock,
  CheckCircle2, AlertCircle, Sparkles, RefreshCw,
  ArrowRight, Package, ShoppingCart, BarChart3
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import LoadingSkeleton from '../shared/LoadingSkeleton';
import LiveMatchingMonitor from './LiveMatchingMonitor';
import MatchingAnalytics from './MatchingAnalytics';
import PendingMatchesQueue from './PendingMatchesQueue';
import MatchingPerformanceChart from './MatchingPerformanceChart';

interface MatchingStats {
  total_matches_today: number;
  success_rate: number;
  avg_match_time_seconds: number;
  pending_orders: number;
  active_inventory: number;
  potential_matches: number;
}

interface MatchingHubProps {
  phone?: string;
  isAdmin?: boolean;
}

export default function MatchingHub({ phone, isAdmin }: MatchingHubProps) {
  const [stats, setStats] = useState<MatchingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'live' | 'analytics' | 'pending' | 'performance'>('live');
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadStats();

    const interval = setInterval(loadStats, 30000);

    const channel = supabase
      .channel('matching-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'deals' },
        () => loadStats()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => loadStats()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'inventory_batches' },
        () => loadStats()
      )
      .subscribe();

    return () => {
      interval && clearInterval(interval);
      channel.unsubscribe();
    };
  }, []);

  const loadStats = async () => {
    try {
      const { data, error } = await supabase.rpc('get_matching_hub_stats');
      if (error) throw error;
      setStats(data);
    } catch (err) {
      console.error('Error loading matching stats:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadStats();
  };

  if (loading) {
    return (
      <div className="p-6">
        <LoadingSkeleton variant="card" count={3} icon="radar" />
      </div>
    );
  }

  const tabs = [
    { id: 'live', label: 'المراقبة الحية', icon: Activity, color: '#10B981' },
    { id: 'analytics', label: 'التحليلات', icon: BarChart3, color: '#3B82F6' },
    { id: 'pending', label: 'قائمة الانتظار', icon: Clock, color: '#F59E0B' },
    { id: 'performance', label: 'الأداء', icon: TrendingUp, color: '#8B5CF6' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-start justify-between mb-8">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Brain className="w-7 h-7" />
                </div>
                <div>
                  <h1 className="text-3xl font-black">مركز المطابقة الذكية</h1>
                  <p className="text-blue-100 text-sm">نظام مطابقة متطور يعمل بالذكاء الاصطناعي</p>
                </div>
              </div>
            </div>

            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-white/30 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              تحديث
            </button>
          </div>

          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-4 h-4 text-yellow-300" />
                  <span className="text-xs font-bold text-blue-100">مطابقات اليوم</span>
                </div>
                <p className="text-3xl font-black">{stats.total_matches_today}</p>
              </div>

              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4 text-green-300" />
                  <span className="text-xs font-bold text-blue-100">نسبة النجاح</span>
                </div>
                <p className="text-3xl font-black">{stats.success_rate}%</p>
              </div>

              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-purple-300" />
                  <span className="text-xs font-bold text-blue-100">متوسط الوقت</span>
                </div>
                <p className="text-3xl font-black">{stats.avg_match_time_seconds}ث</p>
              </div>

              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20">
                <div className="flex items-center gap-2 mb-2">
                  <ShoppingCart className="w-4 h-4 text-orange-300" />
                  <span className="text-xs font-bold text-blue-100">طلبات معلقة</span>
                </div>
                <p className="text-3xl font-black">{stats.pending_orders}</p>
              </div>

              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20">
                <div className="flex items-center gap-2 mb-2">
                  <Package className="w-4 h-4 text-cyan-300" />
                  <span className="text-xs font-bold text-blue-100">مخزون نشط</span>
                </div>
                <p className="text-3xl font-black">{stats.active_inventory}</p>
              </div>

              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-pink-300" />
                  <span className="text-xs font-bold text-blue-100">مطابقات محتملة</span>
                </div>
                <p className="text-3xl font-black">{stats.potential_matches}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-2 overflow-x-auto py-4 scrollbar-hide">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-200'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {activeTab === 'live' && <LiveMatchingMonitor phone={phone} isAdmin={isAdmin} />}
        {activeTab === 'analytics' && <MatchingAnalytics />}
        {activeTab === 'pending' && <PendingMatchesQueue phone={phone} isAdmin={isAdmin} />}
        {activeTab === 'performance' && <MatchingPerformanceChart />}
      </div>
    </div>
  );
}
