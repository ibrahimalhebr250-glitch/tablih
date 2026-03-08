import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import {
  Brain, Zap, Target, TrendingUp, Activity, Package,
  ShoppingCart, AlertCircle, CheckCircle2, Clock, Play,
  Pause, RefreshCw, Sparkles, MapPin, BarChart3, Eye,
  Layers, Cpu, ArrowUpDown
} from 'lucide-react';

interface MatchingStats {
  total_matches_today: number;
  total_attempts_today: number;
  total_deals_today: number;
  success_rate: number;
  avg_match_time_seconds: number;
  avg_match_score: number;
  pending_orders: number;
  active_inventory: number;
  potential_matches: number;
  engine_version: string;
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
  engine_version: string;
  trigger_source: string;
  candidates_evaluated: number;
  deal_id: string;
  score_breakdown: Record<string, { score: number; weight: number }>;
  match_factors: Record<string, boolean>;
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
  pallet_condition: string;
  status: string;
  accept_partial_delivery: boolean;
  accept_close_quality: boolean;
  accept_close_city: boolean;
  matched_quantity: number;
  created_at: string;
  potential_matches_count: number;
  best_match_score: number;
  waiting_time_hours: number;
}

interface PreviewCandidate {
  batch_id: string;
  batch_ref: string;
  supplier_phone: string;
  pallet_type: string;
  size: string;
  quality: string;
  city: string;
  pallet_condition: string;
  available_quantity: number;
  price_per_pallet: number;
  total_score: number;
  score_breakdown: Record<string, { score: number; weight: number }>;
  flexibility_used: Record<string, boolean>;
  would_match: boolean;
}

export default function MatchingControlCenter() {
  const [stats, setStats] = useState<MatchingStats | null>(null);
  const [recentMatches, setRecentMatches] = useState<RecentMatch[]>([]);
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAutoMatching, setIsAutoMatching] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<{ orderId: string; candidates: PreviewCandidate[] } | null>(null);
  const [bulkResult, setBulkResult] = useState<{ orders_matched: number; deals_created: number } | null>(null);

  useEffect(() => {
    loadAllData();

    const channel = supabase
      .channel('matching-control-center-v3')
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
      await Promise.all([loadStats(), loadRecentMatches(), loadPendingOrders()]);
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
      .limit(15);
    if (error) throw error;
    setRecentMatches(data || []);
  };

  const loadPendingOrders = async () => {
    const { data, error } = await supabase.rpc('get_pending_orders_with_potential_matches');
    if (error) throw error;
    setPendingOrders((data || []).slice(0, 10));
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
      setBulkResult(null);
      const { data, error } = await supabase.rpc('ai_bulk_match_all_pending');
      if (error) throw error;
      if (data) {
        setBulkResult({
          orders_matched: data.orders_matched || 0,
          deals_created: data.deals_created || 0,
        });
      }
      await loadAllData();
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setProcessingId(null);
    }
  };

  const handlePreviewMatches = async (orderId: string) => {
    try {
      setProcessingId(`preview-${orderId}`);
      const { data, error } = await supabase.rpc('ai_preview_matches', { p_order_id: orderId });
      if (error) throw error;
      if (data) {
        setPreviewData({
          orderId,
          candidates: (data.candidates || []).sort(
            (a: PreviewCandidate, b: PreviewCandidate) => b.total_score - a.total_score
          ),
        });
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setProcessingId(null);
    }
  };

  const scoreFactorLabels: Record<string, string> = {
    type: 'النوع',
    size: 'الحجم',
    quality: 'الجودة',
    city: 'المدينة',
    condition: 'الحالة',
    quantity: 'الكمية',
    freshness: 'الحداثة',
    supplier: 'المورد',
  };

  const ScoreBar = ({ score, weight, label }: { score: number; weight: number; label: string }) => {
    const weighted = (score * weight) / 100;
    const color =
      score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-yellow-500' : score >= 40 ? 'bg-orange-500' : 'bg-red-500';

    return (
      <div className="flex items-center gap-2 text-xs">
        <span className="w-12 text-gray-600 font-medium truncate">{label}</span>
        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
        </div>
        <span className="w-8 text-left font-bold text-gray-700">{Math.round(weighted)}</span>
      </div>
    );
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
      {/* Engine Version Badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-blue-600" />
          <span className="text-xs font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
            AI Engine {stats?.engine_version || 'v3'} - 8 Factor Scoring
          </span>
        </div>
        <button
          onClick={loadAllData}
          className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
        >
          <RefreshCw className="w-3 h-3" />
          تحديث
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard icon={Zap} label="مطابقات اليوم" value={stats?.total_matches_today || 0} color="blue" />
        <StatCard icon={Target} label="نسبة النجاح" value={`${stats?.success_rate || 0}%`} color="green" />
        <StatCard icon={BarChart3} label="متوسط النقاط" value={stats?.avg_match_score || 0} color="teal" />
        <StatCard icon={ShoppingCart} label="طلبات معلقة" value={stats?.pending_orders || 0} color="orange" />
        <StatCard icon={Package} label="مخزون نشط" value={stats?.active_inventory || 0} color="cyan" />
        <StatCard icon={Sparkles} label="مطابقات محتملة" value={stats?.potential_matches || 0} color="pink" />
      </div>

      {/* Control Panel */}
      <div className="bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
              <Brain className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-black">محرك المطابقة الذكي</h3>
              <p className="text-sm text-white/60">تقييم متعدد العوامل | قفل ذري | Multi-Batch</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsAutoMatching(!isAutoMatching)}
              className={`px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all ${
                isAutoMatching ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
              }`}
            >
              {isAutoMatching ? <><Play className="w-4 h-4" /> نشط</> : <><Pause className="w-4 h-4" /> متوقف</>}
            </button>

            <button
              onClick={handleBulkMatch}
              disabled={processingId === 'bulk' || (stats?.pending_orders || 0) === 0}
              className="px-5 py-2.5 bg-blue-500 hover:bg-blue-600 rounded-xl font-bold text-sm flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {processingId === 'bulk' ? (
                <><RefreshCw className="w-4 h-4 animate-spin" /> جاري المعالجة</>
              ) : (
                <><Zap className="w-4 h-4" /> مطابقة جماعية</>
              )}
            </button>
          </div>
        </div>

        {bulkResult && (
          <div className="bg-green-500/20 border border-green-500/30 rounded-xl p-4 mb-4">
            <p className="text-sm font-bold text-green-400">
              تم مطابقة {bulkResult.orders_matched} طلب وإنشاء {bulkResult.deals_created} صفقة
            </p>
          </div>
        )}

        <div className="grid grid-cols-4 gap-3">
          <div className="bg-white/5 rounded-xl p-3 border border-white/10">
            <p className="text-xs text-white/50 mb-1">المحاولات اليوم</p>
            <p className="text-xl font-black">{stats?.total_attempts_today || 0}</p>
          </div>
          <div className="bg-white/5 rounded-xl p-3 border border-white/10">
            <p className="text-xs text-white/50 mb-1">صفقات اليوم</p>
            <p className="text-xl font-black">{stats?.total_deals_today || 0}</p>
          </div>
          <div className="bg-white/5 rounded-xl p-3 border border-white/10">
            <p className="text-xs text-white/50 mb-1">سرعة المعالجة</p>
            <p className="text-xl font-black">{stats?.avg_match_time_seconds || 0}ث</p>
          </div>
          <div className="bg-white/5 rounded-xl p-3 border border-white/10">
            <p className="text-xs text-white/50 mb-1">متوسط النقاط</p>
            <p className="text-xl font-black">{stats?.avg_match_score || 0}</p>
          </div>
        </div>
      </div>

      {/* Preview Panel */}
      {previewData && (
        <div className="bg-white rounded-2xl border-2 border-blue-200">
          <div className="p-5 border-b border-blue-100 bg-blue-50 rounded-t-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Eye className="w-5 h-5 text-blue-600" />
              <h3 className="text-base font-black text-blue-900">
                معاينة المرشحين ({previewData.candidates.length})
              </h3>
            </div>
            <button
              onClick={() => setPreviewData(null)}
              className="text-sm text-blue-600 hover:text-blue-800 font-bold"
            >
              إغلاق
            </button>
          </div>
          <div className="p-5 space-y-4 max-h-[500px] overflow-y-auto">
            {previewData.candidates.map((c, idx) => (
              <div
                key={c.batch_id}
                className={`p-4 rounded-xl border-2 ${
                  c.would_match ? 'border-green-200 bg-green-50/50' : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-gray-500" dir="ltr">{c.batch_ref}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                        c.would_match ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {c.would_match ? 'مؤهل' : 'غير مؤهل'}
                      </span>
                      {idx === 0 && c.would_match && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 font-bold">
                          الأفضل
                        </span>
                      )}
                    </div>
                    <h4 className="text-sm font-bold text-gray-900">
                      {c.pallet_type} | {c.quality} | {c.size} | {c.city}
                    </h4>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                      <span>{c.available_quantity} متاح</span>
                      <span>{c.price_per_pallet} ر.س/طبلية</span>
                    </div>
                  </div>
                  <div className="text-left">
                    <p className={`text-2xl font-black ${c.would_match ? 'text-green-700' : 'text-gray-400'}`}>
                      {Math.round(c.total_score)}
                    </p>
                    <p className="text-xs text-gray-500">نقطة</p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  {c.score_breakdown && Object.entries(c.score_breakdown).map(([key, val]) => (
                    <ScoreBar key={key} score={val.score} weight={val.weight} label={scoreFactorLabels[key] || key} />
                  ))}
                </div>

                {Object.values(c.flexibility_used || {}).some(Boolean) && (
                  <div className="flex gap-2 mt-3">
                    {c.flexibility_used.close_quality && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 font-bold">جودة قريبة</span>
                    )}
                    {c.flexibility_used.close_city && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold">مدينة قريبة</span>
                    )}
                    {c.flexibility_used.partial_delivery && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-bold">توصيل جزئي</span>
                    )}
                  </div>
                )}
              </div>
            ))}
            {previewData.candidates.length === 0 && (
              <div className="text-center py-6">
                <AlertCircle className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600 font-bold">لا يوجد مرشحين مؤهلين</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Two Column Layout */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Pending Orders */}
        <div className="bg-white rounded-2xl border border-gray-200">
          <div className="p-5 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h3 className="text-base font-black text-gray-900">الطلبات المعلقة</h3>
                <p className="text-xs text-gray-500">{pendingOrders.length} طلب في الانتظار</p>
              </div>
            </div>
          </div>

          <div className="p-4 space-y-3 max-h-[600px] overflow-y-auto">
            {pendingOrders.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
                <p className="text-gray-600 font-bold">لا توجد طلبات معلقة</p>
              </div>
            ) : (
              pendingOrders.map((order) => {
                const isUrgent = order.waiting_time_hours >= 24;
                const hasPotential = order.potential_matches_count > 0;
                const isPartial = order.status === 'partially_matched';
                const remainingQty = order.quantity - (order.matched_quantity || 0);

                return (
                  <div
                    key={order.id}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      isUrgent ? 'border-red-200 bg-red-50' : isPartial ? 'border-amber-200 bg-amber-50' : hasPotential ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-xs font-bold text-gray-500" dir="ltr">{order.request_id}</span>
                          {isUrgent && <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-bold">عاجل</span>}
                          {isPartial && <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-bold">مطابق جزئياً</span>}
                          {order.accept_close_quality && <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-600">مرن</span>}
                        </div>
                        <h4 className="text-sm font-bold text-gray-900">
                          {order.pallet_type} | {order.quality} | {order.size}
                        </h4>
                      </div>
                      {order.best_match_score > 0 && (
                        <span className="text-xs px-2 py-1 rounded-lg bg-green-100 text-green-700 font-bold">
                          افضل: {Math.round(order.best_match_score)}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-2 mb-3 text-xs">
                      <div className="flex items-center gap-1 text-gray-600">
                        <Package className="w-3 h-3" />
                        <span>{isPartial ? `${remainingQty}/${order.quantity}` : order.quantity} طبلية</span>
                      </div>
                      <div className="flex items-center gap-1 text-gray-600">
                        <MapPin className="w-3 h-3" />
                        <span>{order.city}</span>
                      </div>
                      <div className="flex items-center gap-1 text-gray-600">
                        <Clock className="w-3 h-3" />
                        <span>{Math.floor(order.waiting_time_hours)}ساعة</span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handlePreviewMatches(order.id)}
                        disabled={!!processingId}
                        className="flex-1 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg font-bold text-xs flex items-center justify-center gap-1 transition-all disabled:opacity-50"
                      >
                        {processingId === `preview-${order.id}` ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Eye className="w-3 h-3" />}
                        معاينة ({order.potential_matches_count})
                      </button>

                      {hasPotential && (
                        <button
                          onClick={() => handleManualMatch(order.id)}
                          disabled={!!processingId}
                          className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1 transition-all disabled:opacity-50"
                        >
                          {processingId === order.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                          مطابقة
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Recent Matches */}
        <div className="bg-white rounded-2xl border border-gray-200">
          <div className="p-5 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <Activity className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-base font-black text-gray-900">سجل المطابقات</h3>
                <p className="text-xs text-gray-500">آخر 15 محاولة مطابقة</p>
              </div>
            </div>
          </div>

          <div className="p-4 space-y-3 max-h-[600px] overflow-y-auto">
            {recentMatches.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 font-bold">لا توجد مطابقات حديثة</p>
              </div>
            ) : (
              recentMatches.map((match) => {
                const isSuccess = match.match_status === 'matched';
                const isFailed = match.match_status === 'failed';

                return (
                  <div
                    key={match.id}
                    className={`p-4 rounded-xl border-2 ${
                      isSuccess ? 'bg-green-50 border-green-200' : isFailed ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        {isSuccess ? (
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-red-600" />
                        )}
                        <span className={`text-xs font-bold ${isSuccess ? 'text-green-700' : 'text-red-700'}`}>
                          {isSuccess ? 'نجحت' : 'فشلت'}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(match.created_at).toLocaleTimeString('ar-SA')}
                        </span>
                        {match.engine_version && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-gray-200 text-gray-600 font-mono">
                            {match.engine_version}
                          </span>
                        )}
                        {match.trigger_source && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-600">
                            {match.trigger_source === 'inventory_insert' ? 'مخزون' : match.trigger_source === 'order_insert' ? 'طلب' : match.trigger_source}
                          </span>
                        )}
                      </div>
                      <span className={`text-lg font-black ${isSuccess ? 'text-green-700' : 'text-red-500'}`}>
                        {Math.round(match.match_score)}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-gray-900 mb-2">
                      {match.pallet_type} | {match.quality} | {match.size}
                    </h4>

                    <div className="flex items-center gap-3 text-xs text-gray-500 mb-2">
                      <span className="flex items-center gap-1"><Package className="w-3 h-3" />{match.quantity}</span>
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{match.city}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{match.processing_time_ms}ms</span>
                      {match.candidates_evaluated > 0 && (
                        <span className="flex items-center gap-1"><Layers className="w-3 h-3" />{match.candidates_evaluated} مرشح</span>
                      )}
                    </div>

                    {match.score_breakdown && Object.keys(match.score_breakdown).length > 0 && (
                      <div className="space-y-1 mt-2 pt-2 border-t border-gray-200">
                        {Object.entries(match.score_breakdown).map(([key, val]) => (
                          <ScoreBar key={key} score={val.score} weight={val.weight} label={scoreFactorLabels[key] || key} />
                        ))}
                      </div>
                    )}
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

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color: string;
}) {
  const colorMap: Record<string, { bg: string; border: string; iconBg: string; text: string; value: string }> = {
    blue: { bg: 'from-blue-50 to-blue-100', border: 'border-blue-200', iconBg: 'bg-blue-500', text: 'text-blue-700', value: 'text-blue-900' },
    green: { bg: 'from-green-50 to-green-100', border: 'border-green-200', iconBg: 'bg-green-500', text: 'text-green-700', value: 'text-green-900' },
    teal: { bg: 'from-teal-50 to-teal-100', border: 'border-teal-200', iconBg: 'bg-teal-500', text: 'text-teal-700', value: 'text-teal-900' },
    orange: { bg: 'from-orange-50 to-orange-100', border: 'border-orange-200', iconBg: 'bg-orange-500', text: 'text-orange-700', value: 'text-orange-900' },
    cyan: { bg: 'from-cyan-50 to-cyan-100', border: 'border-cyan-200', iconBg: 'bg-cyan-500', text: 'text-cyan-700', value: 'text-cyan-900' },
    pink: { bg: 'from-pink-50 to-pink-100', border: 'border-pink-200', iconBg: 'bg-pink-500', text: 'text-pink-700', value: 'text-pink-900' },
  };

  const c = colorMap[color] || colorMap.blue;

  return (
    <div className={`bg-gradient-to-br ${c.bg} rounded-2xl p-4 border ${c.border}`}>
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-7 h-7 rounded-lg ${c.iconBg} flex items-center justify-center`}>
          <Icon className="w-3.5 h-3.5 text-white" />
        </div>
        <span className={`text-xs font-bold ${c.text}`}>{label}</span>
      </div>
      <p className={`text-2xl font-black ${c.value}`}>{value}</p>
    </div>
  );
}
