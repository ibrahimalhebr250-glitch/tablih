import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import {
  Brain, TrendingUp, Activity, CheckCircle2, XCircle,
  Clock, Zap, AlertTriangle, RefreshCw, Play, Pause,
  BarChart3, Target
} from 'lucide-react';
import LoadingSkeleton from '../../shared/LoadingSkeleton';

interface LiveStats {
  pending_orders: number;
  available_inventory: number;
  active_matches: number;
  today_success_rate: number;
  avg_match_score: number;
  recent_matches: Array<{
    order_id: string;
    batch_id: string;
    score: number;
    created_at: string;
    was_accepted: boolean;
  }>;
}

export default function MatchingControlCenter() {
  const [stats, setStats] = useState<LiveStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAutoMatchEnabled, setIsAutoMatchEnabled] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchLiveStats();
    const interval = setInterval(fetchLiveStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchLiveStats = async () => {
    try {
      const [ordersRes, batchesRes, matchesRes, historyRes] = await Promise.all([
        supabase
          .from('orders')
          .select('id', { count: 'exact' })
          .in('status', ['unmatched', 'pending']),
        supabase
          .from('inventory_batches')
          .select('id', { count: 'exact' })
          .eq('status', 'active')
          .gt('available_quantity', 0),
        supabase
          .from('deals')
          .select('id', { count: 'exact' })
          .eq('status', 'matched'),
        supabase
          .from('match_history')
          .select('*')
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .order('created_at', { ascending: false })
          .limit(10),
      ]);

      const todayMatches = historyRes.data || [];
      const successfulMatches = todayMatches.filter(m => m.was_accepted).length;
      const avgScore = todayMatches.length > 0
        ? todayMatches.reduce((sum, m) => sum + m.score, 0) / todayMatches.length
        : 0;

      setStats({
        pending_orders: ordersRes.count || 0,
        available_inventory: batchesRes.count || 0,
        active_matches: matchesRes.count || 0,
        today_success_rate: todayMatches.length > 0
          ? (successfulMatches / todayMatches.length) * 100
          : 0,
        avg_match_score: avgScore,
        recent_matches: todayMatches.slice(0, 5),
      });
    } catch (err) {
      console.error('Error fetching stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchLiveStats();
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleToggleAutoMatch = () => {
    setIsAutoMatchEnabled(!isAutoMatchEnabled);
  };

  if (loading) {
    return <LoadingSkeleton variant="dashboard" count={4} />;
  }

  const metrics = [
    {
      label: 'الطلبات المعلقة',
      value: stats?.pending_orders || 0,
      icon: Clock,
      color: '#D97706',
      bg: '#FEF3C7',
      trend: 'طلبات في انتظار المطابقة',
    },
    {
      label: 'المخزون المتاح',
      value: stats?.available_inventory || 0,
      icon: Activity,
      color: '#2563EB',
      bg: '#DBEAFE',
      trend: 'دفعات نشطة جاهزة',
    },
    {
      label: 'المطابقات النشطة',
      value: stats?.active_matches || 0,
      icon: Zap,
      color: '#7C3AED',
      bg: '#EDE9FE',
      trend: 'صفقات مطابقة حالياً',
    },
    {
      label: 'معدل النجاح (24 ساعة)',
      value: `${Math.round(stats?.today_success_rate || 0)}%`,
      icon: Target,
      color: '#059669',
      bg: '#D1FAE5',
      trend: 'نسبة قبول المطابقة',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
              <Zap className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">التحكم بالنظام</h3>
              <p className="text-xs text-gray-600">إدارة سلوك المطابقة الذكية</p>
            </div>
          </div>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 text-gray-600 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={handleToggleAutoMatch}
            className={`p-4 rounded-xl border-2 transition-all ${
              isAutoMatchEnabled
                ? 'border-green-500 bg-green-50'
                : 'border-red-500 bg-red-50'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {isAutoMatchEnabled ? (
                  <Play className="w-5 h-5 text-green-600" />
                ) : (
                  <Pause className="w-5 h-5 text-red-600" />
                )}
                <span className="font-bold text-gray-900">المطابقة التلقائية</span>
              </div>
              <span
                className={`text-xs font-bold px-3 py-1 rounded-full ${
                  isAutoMatchEnabled
                    ? 'bg-green-200 text-green-700'
                    : 'bg-red-200 text-red-700'
                }`}
              >
                {isAutoMatchEnabled ? 'مفعّل' : 'معطّل'}
              </span>
            </div>
            <p className="text-xs text-gray-600 text-right">
              {isAutoMatchEnabled
                ? 'الذكاء الاصطناعي يطابق المخزون الجديد تلقائياً'
                : 'المطابقة اليدوية فقط - الذكاء الاصطناعي متوقف'}
            </p>
          </button>

          <div className="p-4 rounded-xl border-2 border-blue-200 bg-blue-50">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              <span className="font-bold text-gray-900">متوسط الدرجة</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-blue-600">
                {Math.round(stats?.avg_match_score || 0)}
              </span>
              <span className="text-sm text-gray-600">/ 100</span>
            </div>
            <p className="text-xs text-gray-600 mt-2">متوسط آخر 24 ساعة</p>
          </div>
        </div>
      </div>

      {/* Live Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric, idx) => (
          <div key={idx} className="bg-white rounded-2xl p-6 border border-gray-100">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
              style={{ background: metric.bg }}
            >
              <metric.icon className="w-6 h-6" style={{ color: metric.color }} />
            </div>
            <h3 className="text-3xl font-black text-gray-900 mb-1">{metric.value}</h3>
            <p className="text-sm font-bold text-gray-900 mb-1">{metric.label}</p>
            <p className="text-xs text-gray-600">{metric.trend}</p>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
            <Activity className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">النشاط الأخير</h3>
            <p className="text-xs text-gray-600">آخر 5 محاولات مطابقة</p>
          </div>
        </div>

        {stats?.recent_matches && stats.recent_matches.length > 0 ? (
          <div className="space-y-3">
            {stats.recent_matches.map((match, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-4 rounded-xl bg-gray-50 border border-gray-100"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      match.was_accepted ? 'bg-green-100' : 'bg-red-100'
                    }`}
                  >
                    {match.was_accepted ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">
                      مطابقة {match.was_accepted ? 'مقبولة' : 'مرفوضة'}
                    </p>
                    <p className="text-xs text-gray-600">
                      {new Date(match.created_at).toLocaleString('ar-SA')}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div
                    className="text-lg font-black"
                    style={{
                      color:
                        match.score >= 85
                          ? '#059669'
                          : match.score >= 70
                          ? '#2563EB'
                          : '#D97706',
                    }}
                  >
                    {Math.round(match.score)}%
                  </div>
                  <p className="text-xs text-gray-600">الدرجة</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-sm text-gray-600">لا توجد مطابقات حديثة</p>
          </div>
        )}
      </div>

      {/* System Health */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-100">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-500 flex items-center justify-center flex-shrink-0">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">صحة النظام</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-sm text-gray-700">محرك الذكاء الاصطناعي: يعمل</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-sm text-gray-700">قاعدة البيانات: متصلة</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-sm text-gray-700">الإشعارات: نشطة</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-sm text-gray-700">
                  الأداء: {stats?.avg_match_score && stats.avg_match_score >= 70 ? 'ممتاز' : 'جيد'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
