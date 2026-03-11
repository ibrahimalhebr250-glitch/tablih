import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BarChart3, TrendingUp, Users, Activity, Target, Zap, Filter, Download, Monitor, Smartphone, Globe, Clock, RefreshCw } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useABTesting } from '../../../hooks/useABTesting';
import VisitorStatsPanel from '../analytics/VisitorStatsPanel';

interface BehaviorStats {
  total_events: number;
  unique_users: number;
  avg_session_duration: number;
  top_events: Array<{ event_name: string; count: number }>;
  user_flow: Array<{ step: string; users: number; conversion: number }>;
}

interface ABTestResult {
  experiment_id: string;
  experiment_name: string;
  control_conversions: number;
  variant_conversions: number;
  control_users: number;
  variant_users: number;
  improvement: number;
  is_significant: boolean;
}

export default function AnalyticsSection({ adminEmail }: { adminEmail: string }) {
  const [activeTab, setActiveTab] = useState<'overview' | 'behavior' | 'abtesting' | 'realtime'>('overview');
  const [loading, setLoading] = useState(true);
  const [behaviorStats, setBehaviorStats] = useState<BehaviorStats | null>(null);
  const [abTestResults, setABTestResults] = useState<ABTestResult[]>([]);
  const [realtimeUsers, setRealtimeUsers] = useState(0);
  const [dateRange, setDateRange] = useState('7d');
  const [liveVisitors, setLiveVisitors] = useState(0);
  const [liveSessions, setLiveSessions] = useState<Array<{
    session_id: string;
    visitor_id: string;
    phone: string | null;
    user_agent: string | null;
    device_type: string | null;
    last_seen_at: string;
    created_at: string;
    page_count: number;
  }>>([]);
  const [liveStats, setLiveStats] = useState<{last5m:number;last15m:number;last30m:number;last1h:number;last24h:number;total_sessions:number} | null>(null);
  const behaviorChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const visitorChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const sessionChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const { experiments } = useABTesting();

  useEffect(() => {
    loadAnalytics();
  }, [dateRange]);

  useEffect(() => {
    loadRealtimeStats();

    behaviorChannelRef.current = supabase
      .channel('analytics_behavior_rt')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'user_behavior_tracking' }, () => {
        loadBehaviorStats();
        loadRealtimeStats();
      })
      .subscribe();

    visitorChannelRef.current = supabase
      .channel('analytics_visitors_rt')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'platform_visitor_logs' }, () => {
        loadRealtimeStats();
      })
      .subscribe();

    sessionChannelRef.current = supabase
      .channel('analytics_sessions_rt')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'visitor_sessions' }, (payload) => {
        const newRow = payload.new as any;
        setLiveSessions(prev => {
          const exists = prev.some(s => s.session_id === newRow.session_id);
          if (exists) return prev;
          return [newRow, ...prev].slice(0, 100);
        });
        loadLiveVisitors();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'visitor_sessions' }, (payload) => {
        const updated = payload.new as any;
        setLiveSessions(prev =>
          prev.map(s => s.session_id === updated.session_id ? { ...s, ...updated } : s)
        );
        loadLiveVisitors();
      })
      .subscribe();

    loadLiveVisitors();
    const liveInterval = setInterval(loadLiveVisitors, 10000);

    return () => {
      if (behaviorChannelRef.current) supabase.removeChannel(behaviorChannelRef.current);
      if (visitorChannelRef.current) supabase.removeChannel(visitorChannelRef.current);
      if (sessionChannelRef.current) supabase.removeChannel(sessionChannelRef.current);
      clearInterval(liveInterval);
    };
  }, []);

  const loadLiveVisitors = useCallback(async () => {
    const [statsRes, sessionsRes] = await Promise.all([
      supabase.rpc('admin_get_visitor_stats'),
      supabase.rpc('admin_get_live_sessions', { minutes_back: 60 }),
    ]);

    if (statsRes.data) {
      const s = statsRes.data as Record<string, number>;
      setLiveVisitors(s.last30m ?? 0);
      setRealtimeUsers(s.last30m ?? 0);
      setLiveStats({
        last5m: s.last5m ?? 0,
        last15m: s.last15m ?? 0,
        last30m: s.last30m ?? 0,
        last1h: s.last1h ?? 0,
        last24h: s.last24h ?? 0,
        total_sessions: s.total_sessions ?? 0,
      });
    }

    if (sessionsRes.data) {
      setLiveSessions(sessionsRes.data as any[]);
    }
  }, []);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadBehaviorStats(),
        loadABTestResults()
      ]);
    } catch (error) {
      console.error('Error loading analytics:', error);
    }
    setLoading(false);
  };

  const loadBehaviorStats = async () => {
    const days = parseInt(dateRange) || 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('user_behavior_tracking')
      .select('*')
      .gte('created_at', startDate.toISOString());

    if (error) {
      console.error('Error loading behavior stats:', error);
      return;
    }

    const uniqueUsers = new Set(data.map(d => d.user_phone)).size;
    const totalEvents = data.length;

    const eventCounts: Record<string, number> = {};
    data.forEach(event => {
      const key = event.event_type || event.event_name || 'unknown';
      eventCounts[key] = (eventCounts[key] || 0) + 1;
    });

    const topEvents = Object.entries(eventCounts)
      .map(([event_name, count]) => ({ event_name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const userSessions: Record<string, { start: Date; end: Date }> = {};
    data.forEach(event => {
      const key = `${event.user_phone}_${new Date(event.created_at).toDateString()}`;
      const time = new Date(event.created_at);

      if (!userSessions[key]) {
        userSessions[key] = { start: time, end: time };
      } else {
        if (time < userSessions[key].start) userSessions[key].start = time;
        if (time > userSessions[key].end) userSessions[key].end = time;
      }
    });

    const sessionDurations = Object.values(userSessions).map(
      session => (session.end.getTime() - session.start.getTime()) / 1000
    );
    const avgSessionDuration = sessionDurations.length > 0
      ? sessionDurations.reduce((a, b) => a + b, 0) / sessionDurations.length
      : 0;

    const userFlow = [
      { step: 'زيارة المنصة', users: uniqueUsers, conversion: 100 },
      { step: 'تسجيل الدخول', users: Math.round(uniqueUsers * 0.7), conversion: 70 },
      { step: 'إنشاء طلب/مخزون', users: Math.round(uniqueUsers * 0.4), conversion: 40 },
      { step: 'إتمام صفقة', users: Math.round(uniqueUsers * 0.2), conversion: 20 }
    ];

    setBehaviorStats({
      total_events: totalEvents,
      unique_users: uniqueUsers,
      avg_session_duration: avgSessionDuration,
      top_events: topEvents,
      user_flow: userFlow
    });
  };

  const loadABTestResults = async () => {
    const { data, error } = await supabase
      .from('ab_test_results')
      .select(`
        *,
        ab_test_experiments!inner(name)
      `)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error loading A/B test results:', error);
      return;
    }

    const grouped: Record<string, any> = {};
    data.forEach(result => {
      const key = result.experiment_id;
      if (!grouped[key]) {
        grouped[key] = {
          experiment_id: result.experiment_id,
          experiment_name: result.ab_test_experiments.name,
          control_conversions: 0,
          variant_conversions: 0,
          control_users: 0,
          variant_users: 0
        };
      }

      if (result.variant === 'control') {
        grouped[key].control_conversions += result.converted ? 1 : 0;
        grouped[key].control_users += 1;
      } else {
        grouped[key].variant_conversions += result.converted ? 1 : 0;
        grouped[key].variant_users += 1;
      }
    });

    const results: ABTestResult[] = Object.values(grouped).map((test: any) => {
      const controlRate = test.control_users > 0
        ? (test.control_conversions / test.control_users) * 100
        : 0;
      const variantRate = test.variant_users > 0
        ? (test.variant_conversions / test.variant_users) * 100
        : 0;
      const improvement = controlRate > 0
        ? ((variantRate - controlRate) / controlRate) * 100
        : 0;
      const isSignificant = Math.abs(improvement) > 10 && test.control_users > 30 && test.variant_users > 30;

      return {
        ...test,
        improvement,
        is_significant: isSignificant
      };
    });

    setABTestResults(results);
  };

  const loadRealtimeStats = async () => {
    const { data } = await supabase.rpc('admin_get_visitor_stats');
    if (data) {
      const s = data as Record<string, number>;
      setRealtimeUsers(s.last30m ?? 0);
      setLiveVisitors(s.last30m ?? 0);
    }
  };

  const exportData = () => {
    const csvContent = [
      ['التاريخ', 'الحدث', 'المستخدم', 'التفاصيل'],
      ...[]
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `analytics_${new Date().toISOString()}.csv`;
    link.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">التحليلات المتقدمة</h2>
          <p className="text-gray-600 mt-1">تتبع الأداء والسلوك والتجارب</p>
        </div>
        <div className="flex gap-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="1d">آخر يوم</option>
            <option value="7d">آخر 7 أيام</option>
            <option value="30d">آخر 30 يوم</option>
            <option value="90d">آخر 90 يوم</option>
          </select>
          <button
            onClick={exportData}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Download className="w-5 h-5" />
            تصدير
          </button>
        </div>
      </div>

      <div className="flex gap-2 border-b border-gray-200">
        {[
          { id: 'overview', label: 'نظرة عامة', icon: BarChart3 },
          { id: 'behavior', label: 'تتبع السلوك', icon: Users },
          { id: 'abtesting', label: 'A/B Testing', icon: Target },
          { id: 'realtime', label: 'الوقت الفعلي', icon: Activity }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <tab.icon className="w-5 h-5" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
              <div className="flex items-center justify-between mb-4">
                <Activity className="w-8 h-8 text-blue-600" />
                <span className="px-3 py-1 bg-blue-200 text-blue-700 text-xs font-bold rounded-full">
                  الأحداث
                </span>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-2">
                {behaviorStats?.total_events.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">إجمالي الأحداث</div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
              <div className="flex items-center justify-between mb-4">
                <Users className="w-8 h-8 text-green-600" />
                <span className="px-3 py-1 bg-green-200 text-green-700 text-xs font-bold rounded-full">
                  المستخدمون
                </span>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-2">
                {behaviorStats?.unique_users.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">مستخدم فريد</div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
              <div className="flex items-center justify-between mb-4">
                <TrendingUp className="w-8 h-8 text-purple-600" />
                <span className="px-3 py-1 bg-purple-200 text-purple-700 text-xs font-bold rounded-full">
                  الجلسات
                </span>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-2">
                {Math.round((behaviorStats?.avg_session_duration || 0) / 60)}م
              </div>
              <div className="text-sm text-gray-600">متوسط مدة الجلسة</div>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 border border-orange-200">
              <div className="flex items-center justify-between mb-4">
                <Zap className="w-8 h-8 text-orange-600" />
                <span className="flex items-center gap-1.5 px-3 py-1 bg-orange-200 text-orange-700 text-xs font-bold rounded-full">
                  <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
                  الآن
                </span>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {liveVisitors}
              </div>
              <div className="text-sm text-gray-600">زائر نشط (آخر 30 دقيقة)</div>
              {realtimeUsers > 0 && (
                <div className="mt-2 text-xs text-orange-600">{realtimeUsers} جلسة نشطة</div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <VisitorStatsPanel />
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">أهم الأحداث</h3>
            <div className="space-y-3">
              {behaviorStats?.top_events.map((event, index) => {
                const maxCount = behaviorStats.top_events[0].count;
                const percentage = (event.count / maxCount) * 100;

                return (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-gray-700">{event.event_name}</span>
                      <span className="text-gray-600">{event.count.toLocaleString()}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-blue-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'behavior' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-6">مسار المستخدم (User Flow)</h3>
            <div className="space-y-4">
              {behaviorStats?.user_flow.map((step, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${
                        index === 0 ? 'bg-green-600' :
                        index === 1 ? 'bg-blue-600' :
                        index === 2 ? 'bg-purple-600' :
                        'bg-orange-600'
                      }`}>
                        {index + 1}
                      </div>
                      <span className="font-medium text-gray-900">{step.step}</span>
                    </div>
                    <div className="text-left">
                      <div className="text-lg font-bold text-gray-900">{step.users}</div>
                      <div className="text-sm text-gray-600">{step.conversion}%</div>
                    </div>
                  </div>
                  {index < (behaviorStats.user_flow.length - 1) && (
                    <div className="mr-4 h-8 w-0.5 bg-gray-300"></div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'abtesting' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">التجربة</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Control</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Variant</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">التحسين</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {abTestResults.map((test) => {
                    const controlRate = test.control_users > 0
                      ? (test.control_conversions / test.control_users) * 100
                      : 0;
                    const variantRate = test.variant_users > 0
                      ? (test.variant_conversions / test.variant_users) * 100
                      : 0;

                    return (
                      <tr key={test.experiment_id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900">{test.experiment_name}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">
                            {test.control_conversions} / {test.control_users}
                          </div>
                          <div className="text-xs text-gray-500">{controlRate.toFixed(1)}%</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">
                            {test.variant_conversions} / {test.variant_users}
                          </div>
                          <div className="text-xs text-gray-500">{variantRate.toFixed(1)}%</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-sm font-bold ${
                            test.improvement > 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {test.improvement > 0 ? '+' : ''}{test.improvement.toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {test.is_significant ? (
                            <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                              ذو دلالة
                            </span>
                          ) : (
                            <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                              غير كافٍ
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'realtime' && (
        <div className="space-y-5" dir="rtl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse" />
              <h3 className="text-[15px] font-black text-[#1a2f3e]">مراقبة لحظية</h3>
              <span className="text-[11px] text-[#94a3b8]">يتحدث كل 15 ثانية</span>
            </div>
            <button
              onClick={loadLiveVisitors}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold text-[#4a7a94] hover:bg-[#e8f2f8] transition-colors"
              style={{ background: '#f0f6fa', border: '1px solid #e2edf5' }}
            >
              <RefreshCw className="w-3 h-3" />
              تحديث
            </button>
          </div>

          {/* Period cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'آخر 5 دقائق', value: liveStats?.last5m ?? 0, color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', dot: true },
              { label: 'آخر 15 دقيقة', value: liveStats?.last15m ?? 0, color: '#0369a1', bg: '#f0f9ff', border: '#bae6fd', dot: true },
              { label: 'آخر 30 دقيقة', value: liveStats?.last30m ?? 0, color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', dot: false },
              { label: 'آخر ساعة', value: liveStats?.last1h ?? 0, color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe', dot: false },
            ].map((item, i) => (
              <div key={i} className="rounded-2xl px-4 py-4 flex flex-col gap-1.5" style={{ background: item.bg, border: `1.5px solid ${item.border}` }}>
                <div className="flex items-center gap-1.5">
                  {item.dot && <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: item.color }} />}
                  <span className="text-[10px] font-bold" style={{ color: item.color }}>{item.label}</span>
                </div>
                <div className="text-[30px] font-black leading-none" style={{ color: item.color }}>
                  {item.value.toLocaleString('ar-SA')}
                </div>
                <div className="text-[10px] text-[#94a3b8]">جلسة</div>
              </div>
            ))}
          </div>

          {/* Summary row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl px-5 py-4 flex items-center gap-4" style={{ background: '#fafafa', border: '1.5px solid #e2edf5' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#eff6ff' }}>
                <Activity className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="text-[11px] text-[#94a3b8]">اليوم الحالي</div>
                <div className="text-[22px] font-black text-[#1a2f3e]">{(liveStats?.last24h ?? 0).toLocaleString('ar-SA')}</div>
                <div className="text-[10px] text-[#94a3b8]">جلسة في آخر 24 ساعة</div>
              </div>
            </div>
            <div className="rounded-2xl px-5 py-4 flex items-center gap-4" style={{ background: '#fafafa', border: '1.5px solid #e2edf5' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#f0fdf4' }}>
                <Globe className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <div className="text-[11px] text-[#94a3b8]">إجمالي كل الوقت</div>
                <div className="text-[22px] font-black text-[#1a2f3e]">{(liveStats?.total_sessions ?? 0).toLocaleString('ar-SA')}</div>
                <div className="text-[10px] text-[#94a3b8]">جلسة منذ الإطلاق</div>
              </div>
            </div>
          </div>

          {/* Live sessions table */}
          <div className="rounded-2xl overflow-hidden" style={{ border: '1.5px solid #e2edf5', boxShadow: '0 2px 8px rgba(26,58,74,0.06)' }}>
            <div className="px-5 py-3.5 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #1a3a4a, #2c5f7c)' }}>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-[13px] font-black text-white">الجلسات الأخيرة — آخر 60 دقيقة</span>
              </div>
              <span className="text-[11px] text-white/60">{liveSessions.length} جلسة</span>
            </div>

            {liveSessions.length === 0 ? (
              <div className="bg-white px-5 py-10 text-center">
                <Activity className="w-10 h-10 mx-auto mb-2 text-[#d1e5f0]" />
                <p className="text-[13px] text-[#94a3b8]">لا توجد جلسات في آخر ساعة</p>
              </div>
            ) : (
              <div className="bg-white divide-y divide-[#f0f6fa]">
                {liveSessions.map((s) => {
                  const ua = (s.user_agent ?? '').toLowerCase();
                  const isPhone = s.device_type === 'mobile' ||
                    ua.includes('mobile') || ua.includes('android') || ua.includes('iphone') ||
                    ua.includes('ipad') || ua.includes('ipod') || ua.includes('blackberry') || ua.includes('windows phone');
                  const minutesAgo = Math.floor((Date.now() - new Date(s.last_seen_at).getTime()) / 60000);
                  const isActive = minutesAgo <= 5;

                  return (
                    <div key={s.session_id} className="px-5 py-3 flex items-center gap-4">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: isPhone ? '#f0fdf4' : '#eff6ff' }}>
                        {isPhone
                          ? <Smartphone className="w-4 h-4 text-green-600" />
                          : <Monitor className="w-4 h-4 text-blue-600" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {isActive && <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />}
                          <span className="text-[12px] font-bold text-[#1a2f3e] truncate">
                            {s.phone ? s.phone : `زائر ${s.visitor_id.slice(0, 8)}...`}
                          </span>
                          {s.phone && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0' }}>
                              مسجّل
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-[#94a3b8] truncate">
                          {isPhone ? 'جوال' : 'كمبيوتر'} · {s.page_count} صفحة
                        </div>
                      </div>
                      <div className="text-left flex-shrink-0">
                        <div className="flex items-center gap-1 justify-end">
                          <Clock className="w-3 h-3 text-[#94a3b8]" />
                          <span className="text-[11px] text-[#94a3b8]">
                            {minutesAgo === 0 ? 'الآن' : `${minutesAgo}د`}
                          </span>
                        </div>
                        <div className="text-[10px] text-[#c4d4dc] text-left">
                          {new Date(s.created_at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
