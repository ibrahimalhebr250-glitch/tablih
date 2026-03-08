import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import {
  Brain, Zap, Target, TrendingUp, Activity, Package,
  ShoppingCart, AlertCircle, CheckCircle2, Clock, Play,
  Pause, RefreshCw, Sparkles, MapPin, BarChart3
} from 'lucide-react';

interface MatchingStats {
  total_matches_today: number;
  success_rate: number;
  avg_match_time_seconds: number;
  pending_orders: number;
  active_inventory: number;
  potential_matches: number;
}

interface RecentMatch {
  id: string;
  order_id: string;
  batch_id: string;
  match_score: number;
  match_status: string;
  pallet_type: string;
  size: string;
  quality: string;
  quantity: number;
  city: string;
  buyer_phone: string;
  supplier_phone: string;
  processing_time_ms: number;
  created_at: string;
}

interface PendingOrder {
  id: string;
  request_id: string;
  pallet_type: string;
  size: string;
  quality: string;
  quantity: number;
  city: string;
  status: string;
  created_at: string;
  potential_matches_count: number;
  waiting_time_hours: number;
}

export default function MatchingControlCenter() {
  const [stats, setStats] = useState<MatchingStats | null>(null);
  const [recentMatches, setRecentMatches] = useState<RecentMatch[]>([]);
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAutoMatching, setIsAutoMatching] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    loadAllData();

    const channel = supabase
      .channel('matching-control-center')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deals' }, () => loadAllData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => loadAllData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_batches' }, () => loadAllData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matching_analytics' }, () => loadRecentMatches())
      .subscribe();

    const interval = setInterval(loadAllData, 30000);

    return () => {
      channel.unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const loadAllData = async () => {
    try {
      await Promise.all([
        loadStats(),
        loadRecentMatches(),
        loadPendingOrders()
      ]);
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    const { data, error } = await supabase.rpc('get_matching_hub_stats');
    if (error) throw error;
    setStats(data);
  };

  const loadRecentMatches = async () => {
    const { data, error } = await supabase
      .from('matching_analytics')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    if (error) throw error;
    setRecentMatches(data || []);
  };

  const loadPendingOrders = async () => {
    const { data, error } = await supabase.rpc('get_pending_orders_with_potential_matches');
    if (error) throw error;
    setPendingOrders((data || []).slice(0, 5));
  };

  const handleManualMatch = async (orderId: string) => {
    try {
      setProcessingId(orderId);
      await supabase.rpc('manual_match_existing_orders', { p_order_id: orderId });
      await loadAllData();
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setProcessingId(null);
    }
  };

  const handleBulkMatch = async () => {
    try {
      setProcessingId('bulk');
      for (const order of pendingOrders) {
        if (order.potential_matches_count > 0) {
          await supabase.rpc('manual_match_existing_orders', { p_order_id: order.id });
        }
      }
      await loadAllData();
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-2xl p-6 border border-gray-200 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-4" />
            <div className="h-24 bg-gray-200 rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-5 border border-blue-200">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="text-xs font-bold text-blue-700">مطابقات اليوم</span>
          </div>
          <p className="text-3xl font-black text-blue-900">{stats?.total_matches_today || 0}</p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-5 border border-green-200">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-green-500 flex items-center justify-center">
              <Target className="w-4 h-4 text-white" />
            </div>
            <span className="text-xs font-bold text-green-700">نسبة النجاح</span>
          </div>
          <p className="text-3xl font-black text-green-900">{stats?.success_rate || 0}%</p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-5 border border-purple-200">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-purple-500 flex items-center justify-center">
              <Clock className="w-4 h-4 text-white" />
            </div>
            <span className="text-xs font-bold text-purple-700">متوسط الوقت</span>
          </div>
          <p className="text-3xl font-black text-purple-900">{stats?.avg_match_time_seconds || 0}ث</p>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-5 border border-orange-200">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center">
              <ShoppingCart className="w-4 h-4 text-white" />
            </div>
            <span className="text-xs font-bold text-orange-700">طلبات معلقة</span>
          </div>
          <p className="text-3xl font-black text-orange-900">{stats?.pending_orders || 0}</p>
        </div>

        <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-2xl p-5 border border-cyan-200">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-500 flex items-center justify-center">
              <Package className="w-4 h-4 text-white" />
            </div>
            <span className="text-xs font-bold text-cyan-700">مخزون نشط</span>
          </div>
          <p className="text-3xl font-black text-cyan-900">{stats?.active_inventory || 0}</p>
        </div>

        <div className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-2xl p-5 border border-pink-200">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-pink-500 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-xs font-bold text-pink-700">مطابقات محتملة</span>
          </div>
          <p className="text-3xl font-black text-pink-900">{stats?.potential_matches || 0}</p>
        </div>
      </div>

      {/* Control Panel */}
      <div className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Brain className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-black">مركز التحكم الذكي</h3>
              <p className="text-sm text-white/80">إدارة عمليات المطابقة التلقائية</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsAutoMatching(!isAutoMatching)}
              className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all ${
                isAutoMatching
                  ? 'bg-white/20 hover:bg-white/30'
                  : 'bg-white/10 hover:bg-white/20'
              }`}
            >
              {isAutoMatching ? (
                <>
                  <Pause className="w-4 h-4" />
                  إيقاف مؤقت
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  تشغيل
                </>
              )}
            </button>

            <button
              onClick={handleBulkMatch}
              disabled={processingId === 'bulk' || pendingOrders.length === 0}
              className="px-6 py-3 bg-white/20 hover:bg-white/30 rounded-xl font-bold flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {processingId === 'bulk' ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  جاري المعالجة
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  مطابقة جماعية
                </>
              )}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4" />
              <span className="text-sm font-bold">حالة النظام</span>
            </div>
            <p className="text-2xl font-black">{isAutoMatching ? 'نشط' : 'متوقف'}</p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4" />
              <span className="text-sm font-bold">الكفاءة</span>
            </div>
            <p className="text-2xl font-black">
              {stats?.success_rate ? `${stats.success_rate}%` : 'جاري الحساب'}
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="w-4 h-4" />
              <span className="text-sm font-bold">الأداء</span>
            </div>
            <p className="text-2xl font-black">ممتاز</p>
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Pending Orders */}
        <div className="bg-white rounded-2xl border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-900">الطلبات المعلقة</h3>
                  <p className="text-sm text-gray-600">{pendingOrders.length} طلب في الانتظار</p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-3 max-h-[500px] overflow-y-auto">
            {pendingOrders.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
                <p className="text-gray-600 font-bold">لا توجد طلبات معلقة</p>
              </div>
            ) : (
              pendingOrders.map((order) => {
                const isUrgent = order.waiting_time_hours >= 24;
                const hasPotential = order.potential_matches_count > 0;

                return (
                  <div
                    key={order.id}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      isUrgent
                        ? 'border-red-200 bg-red-50'
                        : hasPotential
                        ? 'border-green-200 bg-green-50'
                        : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold text-gray-500" dir="ltr">
                            {order.request_id}
                          </span>
                          {isUrgent && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-bold">
                              عاجل
                            </span>
                          )}
                        </div>
                        <h4 className="text-sm font-bold text-gray-900">
                          {order.pallet_type} • {order.quality} • {order.size}
                        </h4>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                      <div className="flex items-center gap-1 text-gray-600">
                        <Package className="w-3 h-3" />
                        <span>{order.quantity} طبلية</span>
                      </div>
                      <div className="flex items-center gap-1 text-gray-600">
                        <MapPin className="w-3 h-3" />
                        <span>{order.city}</span>
                      </div>
                      <div className="flex items-center gap-1 text-gray-600">
                        <Clock className="w-3 h-3" />
                        <span>{Math.floor(order.waiting_time_hours)}ساعة</span>
                      </div>
                      <div className="flex items-center gap-1 text-gray-600">
                        <Sparkles className="w-3 h-3" />
                        <span>{order.potential_matches_count} محتملة</span>
                      </div>
                    </div>

                    {hasPotential && (
                      <button
                        onClick={() => handleManualMatch(order.id)}
                        disabled={processingId === order.id}
                        className="w-full px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                      >
                        {processingId === order.id ? (
                          <>
                            <RefreshCw className="w-3 h-3 animate-spin" />
                            جاري المطابقة
                          </>
                        ) : (
                          <>
                            <Play className="w-3 h-3" />
                            بدء المطابقة
                          </>
                        )}
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Recent Matches */}
        <div className="bg-white rounded-2xl border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <Activity className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-black text-gray-900">المطابقات الأخيرة</h3>
                <p className="text-sm text-gray-600">آخر 10 محاولات مطابقة</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-3 max-h-[500px] overflow-y-auto">
            {recentMatches.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 font-bold">لا توجد مطابقات حديثة</p>
              </div>
            ) : (
              recentMatches.map((match) => {
                const statusConfig = {
                  matched: { bg: 'bg-green-50', border: 'border-green-200', color: 'text-green-700', icon: CheckCircle2, label: 'نجحت' },
                  pending: { bg: 'bg-yellow-50', border: 'border-yellow-200', color: 'text-yellow-700', icon: Clock, label: 'معلقة' },
                  failed: { bg: 'bg-red-50', border: 'border-red-200', color: 'text-red-700', icon: AlertCircle, label: 'فشلت' },
                }[match.match_status] || { bg: 'bg-yellow-50', border: 'border-yellow-200', color: 'text-yellow-700', icon: Clock, label: 'معلقة' };

                const StatusIcon = statusConfig.icon;

                return (
                  <div
                    key={match.id}
                    className={`p-4 rounded-xl border-2 ${statusConfig.bg} ${statusConfig.border}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <StatusIcon className={`w-4 h-4 ${statusConfig.color}`} />
                        <span className={`text-xs font-bold ${statusConfig.color}`}>
                          {statusConfig.label}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(match.created_at).toLocaleTimeString('ar-SA')}
                        </span>
                      </div>
                      <span className={`text-lg font-black ${statusConfig.color}`}>
                        {Math.round(match.match_score)}%
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-gray-900 mb-2">
                      {match.pallet_type} • {match.quality} • {match.size}
                    </h4>

                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <Package className="w-3 h-3" />
                      <span>{match.quantity} طبلية</span>
                      <span>•</span>
                      <MapPin className="w-3 h-3" />
                      <span>{match.city}</span>
                      <span>•</span>
                      <Clock className="w-3 h-3" />
                      <span>{match.processing_time_ms}ms</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
