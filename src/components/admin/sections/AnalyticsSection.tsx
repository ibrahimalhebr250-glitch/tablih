import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BarChart3, TrendingUp, Users, Activity, Target, Zap, Filter, Download, Monitor, Smartphone, Globe, Clock, RefreshCw, Eye, MousePointer, Layers, ArrowRight, Hash } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useABTesting } from '../../../hooks/useABTesting';
import VisitorStatsPanel from '../analytics/VisitorStatsPanel';

interface BehaviorSummary {
  total_events: number;
  total_sessions: number;
  total_page_views: number;
  events_today: number;
  events_last_hour: number;
  events_last_5min: number;
  avg_pages_per_session: number;
  peak_hour_today: number | null;
  period_days: number;
}

interface TopPage {
  page_path: string;
  page_title: string;
  views: number;
  unique_sessions: number;
  pct: number;
}

interface HourlyPoint {
  hour_label: string;
  hour_num: number;
  events: number;
  sessions: number;
}

interface LiveEvent {
  id: string;
  event_type: string;
  page_path: string;
  page_title: string;
  session_id: string;
  user_phone: string | null;
  created_at: string;
}

interface SessionDepth {
  depth_range: string;
  session_count: number;
  pct: number;
}

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

  // Behavior tab state
  const [behaviorPeriod, setBehaviorPeriod] = useState(7);
  const [behaviorSummary, setBehaviorSummary] = useState<BehaviorSummary | null>(null);
  const [topPages, setTopPages] = useState<TopPage[]>([]);
  const [hourlyActivity, setHourlyActivity] = useState<HourlyPoint[]>([]);
  const [liveEvents, setLiveEvents] = useState<LiveEvent[]>([]);
  const [sessionDepth, setSessionDepth] = useState<SessionDepth[]>([]);
  const [behaviorLoading, setBehaviorLoading] = useState(false);
  const [behaviorPulse, setBehaviorPulse] = useState(false);

  const behaviorChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const visitorChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const sessionChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const behaviorFeedChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

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
      if (behaviorFeedChannelRef.current) supabase.removeChannel(behaviorFeedChannelRef.current);
      clearInterval(liveInterval);
    };
  }, []);

  useEffect(() => {
    loadBehaviorData();
  }, [behaviorPeriod]);

  useEffect(() => {
    if (activeTab !== 'behavior') return;

    behaviorFeedChannelRef.current = supabase
      .channel('behavior_feed_rt')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'user_behavior_tracking' }, (payload) => {
        const row = payload.new as any;
        const newEvent: LiveEvent = {
          id: row.id,
          event_type: row.event_type,
          page_path: row.event_data?.path ?? '',
          page_title: row.event_data?.title ?? '',
          session_id: row.session_id,
          user_phone: row.user_phone,
          created_at: row.created_at,
        };
        setLiveEvents(prev => [newEvent, ...prev].slice(0, 50));
        setBehaviorPulse(true);
        setTimeout(() => setBehaviorPulse(false), 800);
        // refresh summary + hourly every new event
        loadBehaviorSummary();
        loadHourlyActivity();
      })
      .subscribe();

    const refreshInterval = setInterval(() => {
      loadHourlyActivity();
      loadBehaviorSummary();
    }, 30000);

    return () => {
      if (behaviorFeedChannelRef.current) supabase.removeChannel(behaviorFeedChannelRef.current);
      clearInterval(refreshInterval);
    };
  }, [activeTab, behaviorPeriod]);

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

  const loadBehaviorSummary = useCallback(async () => {
    const { data } = await supabase.rpc('admin_get_behavior_summary', { days_back: behaviorPeriod });
    if (data) setBehaviorSummary(data as BehaviorSummary);
  }, [behaviorPeriod]);

  const loadHourlyActivity = useCallback(async () => {
    const { data } = await supabase.rpc('admin_get_hourly_activity');
    if (data) setHourlyActivity(data as HourlyPoint[]);
  }, []);

  const loadBehaviorData = useCallback(async () => {
    setBehaviorLoading(true);
    const [summaryRes, pagesRes, hourlyRes, feedRes, depthRes] = await Promise.all([
      supabase.rpc('admin_get_behavior_summary', { days_back: behaviorPeriod }),
      supabase.rpc('admin_get_top_pages', { days_back: behaviorPeriod, lim: 15 }),
      supabase.rpc('admin_get_hourly_activity'),
      supabase.rpc('admin_get_live_behavior_feed', { lim: 50 }),
      supabase.rpc('admin_get_session_depth', { days_back: behaviorPeriod }),
    ]);
    if (summaryRes.data) setBehaviorSummary(summaryRes.data as BehaviorSummary);
    if (pagesRes.data) setTopPages(pagesRes.data as TopPage[]);
    if (hourlyRes.data) setHourlyActivity(hourlyRes.data as HourlyPoint[]);
    if (feedRes.data) setLiveEvents(feedRes.data as LiveEvent[]);
    if (depthRes.data) setSessionDepth(depthRes.data as SessionDepth[]);
    setBehaviorLoading(false);
  }, [behaviorPeriod]);

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
        <div className="space-y-4" dir="rtl">

          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
                <MousePointer className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-[15px] font-black text-[#1a2f3e]">تحليل سلوك المستخدمين</h3>
                  <span
                    className="w-2 h-2 rounded-full transition-all duration-300"
                    style={{ background: behaviorPulse ? '#16a34a' : '#94a3b8', transform: behaviorPulse ? 'scale(1.5)' : 'scale(1)' }}
                  />
                </div>
                <p className="text-[11px] text-[#7a9aab]">مراقبة لحظية · يتحدث تلقائياً</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: '#f0f6fa', border: '1px solid #e2edf5' }}>
                {[
                  { label: 'اليوم', val: 1 },
                  { label: '7 أيام', val: 7 },
                  { label: '30 يوم', val: 30 },
                ].map(opt => (
                  <button
                    key={opt.val}
                    onClick={() => setBehaviorPeriod(opt.val)}
                    className="px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all"
                    style={behaviorPeriod === opt.val
                      ? { background: '#1a3a4a', color: 'white' }
                      : { color: '#4a7a94' }
                    }
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <button
                onClick={loadBehaviorData}
                disabled={behaviorLoading}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-[#e8f2f8]"
                style={{ background: '#f0f6fa', border: '1px solid #e2edf5' }}
              >
                <RefreshCw className={`w-3.5 h-3.5 text-[#4a7a94] ${behaviorLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {behaviorLoading && !behaviorSummary ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-24 rounded-2xl bg-[#f0f6fa] animate-pulse" />
              ))}
            </div>
          ) : (
            <>
              {/* KPI Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  {
                    label: 'إجمالي الأحداث',
                    value: (behaviorSummary?.total_events ?? 0).toLocaleString('ar-SA'),
                    sub: `آخر ${behaviorPeriod} يوم`,
                    icon: Activity,
                    color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe',
                  },
                  {
                    label: 'مشاهدات الصفحات',
                    value: (behaviorSummary?.total_page_views ?? 0).toLocaleString('ar-SA'),
                    sub: 'page_view',
                    icon: Eye,
                    color: '#0369a1', bg: '#f0f9ff', border: '#bae6fd',
                  },
                  {
                    label: 'جلسات فريدة',
                    value: (behaviorSummary?.total_sessions ?? 0).toLocaleString('ar-SA'),
                    sub: `متوسط ${behaviorSummary?.avg_pages_per_session ?? 0} صفحة/جلسة`,
                    icon: Layers,
                    color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0',
                  },
                  {
                    label: 'أحداث آخر ساعة',
                    value: (behaviorSummary?.events_last_hour ?? 0).toLocaleString('ar-SA'),
                    sub: `${behaviorSummary?.events_last_5min ?? 0} في آخر 5 دقائق`,
                    icon: Zap,
                    color: '#d97706', bg: '#fffbeb', border: '#fde68a',
                    pulse: (behaviorSummary?.events_last_5min ?? 0) > 0,
                  },
                ].map((card, i) => (
                  <div key={i} className="rounded-2xl px-4 py-4 flex flex-col gap-1" style={{ background: card.bg, border: `1.5px solid ${card.border}` }}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-bold" style={{ color: card.color }}>{card.label}</span>
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center relative" style={{ background: `${card.color}18` }}>
                        <card.icon className="w-3.5 h-3.5" style={{ color: card.color }} />
                        {(card as any).pulse && (
                          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-green-500 animate-pulse border border-white" />
                        )}
                      </div>
                    </div>
                    <div className="text-[26px] font-black leading-none" style={{ color: card.color }}>{card.value}</div>
                    <div className="text-[10px] text-[#94a3b8] mt-0.5">{card.sub}</div>
                  </div>
                ))}
              </div>

              {/* Hourly Activity Bar Chart */}
              {hourlyActivity.length > 0 && (
                <div className="rounded-2xl p-5 space-y-3" style={{ background: 'white', border: '1.5px solid #e2edf5', boxShadow: '0 2px 8px rgba(26,58,74,0.06)' }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-blue-600" />
                      <span className="text-[13px] font-black text-[#1a2f3e]">النشاط بالساعة — آخر 24 ساعة</span>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-[#94a3b8]">
                      <div className="flex items-center gap-1">
                        <span className="w-3 h-3 rounded-sm inline-block" style={{ background: '#3b82f6' }} />
                        أحداث
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="w-3 h-3 rounded-sm inline-block" style={{ background: '#bbf7d0' }} />
                        جلسات
                      </div>
                    </div>
                  </div>
                  {(() => {
                    const maxEvents = Math.max(...hourlyActivity.map(h => h.events), 1);
                    const nowHour = new Date().getHours();
                    return (
                      <div className="flex items-end gap-1 h-28 w-full" dir="ltr">
                        {hourlyActivity.map((h, i) => {
                          const heightPct = Math.max((h.events / maxEvents) * 100, h.events > 0 ? 3 : 0);
                          const isCurrent = h.hour_num === nowHour;
                          return (
                            <div key={i} className="flex-1 flex flex-col items-center justify-end gap-0.5 group relative" style={{ height: '100%' }}>
                              <div
                                className="w-full rounded-t-sm transition-all duration-500"
                                style={{
                                  height: `${heightPct}%`,
                                  background: isCurrent
                                    ? 'linear-gradient(180deg, #16a34a, #15803d)'
                                    : h.events > 0
                                      ? 'linear-gradient(180deg, #60a5fa, #3b82f6)'
                                      : '#e5e7eb',
                                  minHeight: h.events > 0 ? '3px' : '2px',
                                }}
                              />
                              <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-[#1a3a4a] text-white text-[9px] font-bold px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10 shadow-lg">
                                {h.hour_label}: {h.events} حدث · {h.sessions} جلسة
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                  <div className="flex items-center justify-between text-[9px] text-[#94a3b8]" dir="ltr">
                    {hourlyActivity.filter((_, i) => i % 4 === 0).map(h => (
                      <span key={h.hour_label}>{h.hour_label}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Top Pages + Session Depth side by side */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                {/* Top Pages */}
                <div className="rounded-2xl overflow-hidden" style={{ border: '1.5px solid #e2edf5', boxShadow: '0 2px 8px rgba(26,58,74,0.06)' }}>
                  <div className="px-5 py-3.5 flex items-center gap-2" style={{ background: 'linear-gradient(135deg, #1a3a4a, #2c5f7c)' }}>
                    <Eye className="w-4 h-4 text-white/70" />
                    <span className="text-[13px] font-black text-white">أكثر الصفحات زيارةً</span>
                  </div>
                  <div className="bg-white divide-y divide-[#f0f6fa]">
                    {topPages.length === 0 ? (
                      <div className="py-8 text-center text-[12px] text-[#94a3b8]">لا توجد بيانات</div>
                    ) : topPages.map((page, i) => (
                      <div key={i} className="px-4 py-3">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-[11px] font-black text-[#94a3b8] w-4 flex-shrink-0">#{i + 1}</span>
                            <span className="text-[11px] font-bold text-[#1a2f3e] truncate" title={page.page_path}>
                              {page.page_path || '/'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0 mr-2">
                            <span className="text-[11px] font-black text-blue-600">{page.views.toLocaleString('ar-SA')}</span>
                            <span className="text-[9px] text-[#94a3b8]">{page.pct}%</span>
                          </div>
                        </div>
                        <div className="w-full rounded-full overflow-hidden" style={{ height: '4px', background: '#f0f6fa' }}>
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{
                              width: `${page.pct}%`,
                              background: i === 0 ? 'linear-gradient(90deg, #2563eb, #60a5fa)'
                                : i === 1 ? 'linear-gradient(90deg, #0369a1, #38bdf8)'
                                : 'linear-gradient(90deg, #6b7280, #9ca3af)',
                            }}
                          />
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          <Layers className="w-2.5 h-2.5 text-[#b0c4ce]" />
                          <span className="text-[9px] text-[#94a3b8]">{page.unique_sessions} جلسة فريدة</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Session Depth */}
                <div className="rounded-2xl overflow-hidden" style={{ border: '1.5px solid #e2edf5', boxShadow: '0 2px 8px rgba(26,58,74,0.06)' }}>
                  <div className="px-5 py-3.5 flex items-center gap-2" style={{ background: 'linear-gradient(135deg, #1a3a4a, #2c5f7c)' }}>
                    <Hash className="w-4 h-4 text-white/70" />
                    <span className="text-[13px] font-black text-white">عمق التصفح (صفحات/جلسة)</span>
                  </div>
                  <div className="bg-white p-4 space-y-3">
                    {sessionDepth.length === 0 ? (
                      <div className="py-8 text-center text-[12px] text-[#94a3b8]">لا توجد بيانات</div>
                    ) : sessionDepth.map((d, i) => {
                      const colors = ['#2563eb', '#0369a1', '#0891b2', '#0f766e', '#16a34a'];
                      const bgs = ['#eff6ff', '#f0f9ff', '#ecfeff', '#f0fdfa', '#f0fdf4'];
                      return (
                        <div key={i}>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[12px] font-bold text-[#1a2f3e]">{d.depth_range}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-black" style={{ color: colors[i] }}>{d.session_count}</span>
                              <span
                                className="text-[9px] px-2 py-0.5 rounded-full font-bold"
                                style={{ background: bgs[i], color: colors[i], border: `1px solid ${colors[i]}30` }}
                              >
                                {d.pct}%
                              </span>
                            </div>
                          </div>
                          <div className="w-full rounded-full overflow-hidden" style={{ height: '6px', background: '#f0f6fa' }}>
                            <div
                              className="h-full rounded-full transition-all duration-700"
                              style={{ width: `${d.pct}%`, background: colors[i] }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Live Events Feed */}
              <div className="rounded-2xl overflow-hidden" style={{ border: '1.5px solid #e2edf5', boxShadow: '0 2px 8px rgba(26,58,74,0.06)' }}>
                <div className="px-5 py-3.5 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #1a3a4a, #2c5f7c)' }}>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    <span className="text-[13px] font-black text-white">التدفق اللحظي للأحداث</span>
                  </div>
                  <span className="text-[11px] text-white/50">{liveEvents.length} حدث</span>
                </div>
                {liveEvents.length === 0 ? (
                  <div className="bg-white px-5 py-10 text-center">
                    <Activity className="w-10 h-10 mx-auto mb-2 text-[#d1e5f0]" />
                    <p className="text-[13px] text-[#94a3b8]">لا توجد أحداث بعد</p>
                  </div>
                ) : (
                  <div className="bg-white divide-y divide-[#f0f6fa] max-h-80 overflow-y-auto">
                    {liveEvents.map((ev, i) => {
                      const secsAgo = Math.floor((Date.now() - new Date(ev.created_at).getTime()) / 1000);
                      const timeStr = secsAgo < 60
                        ? `${secsAgo}ث`
                        : secsAgo < 3600
                          ? `${Math.floor(secsAgo / 60)}د`
                          : new Date(ev.created_at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
                      const isNew = i === 0 && secsAgo < 5;
                      return (
                        <div
                          key={ev.id}
                          className="px-4 py-2.5 flex items-center gap-3 transition-colors hover:bg-[#fafcfe]"
                          style={isNew ? { background: '#f0fdf4', borderRight: '3px solid #16a34a' } : {}}
                        >
                          <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ background: '#eff6ff', border: '1px solid #bfdbfe' }}
                          >
                            <Eye className="w-3 h-3 text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              {isNew && <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse flex-shrink-0" />}
                              <span className="text-[11px] font-bold text-[#1a2f3e] truncate">{ev.page_path || '/'}</span>
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[9px] text-[#94a3b8]">{ev.session_id.slice(0, 8)}</span>
                              {ev.user_phone && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0' }}>
                                  مسجّل
                                </span>
                              )}
                            </div>
                          </div>
                          <span className="text-[10px] text-[#94a3b8] flex-shrink-0">{timeStr}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
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
              <span className="text-[11px] text-[#94a3b8]">يتحدث كل 10 ثوانٍ · لحظي</span>
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

          {/* Device breakdown */}
          {liveSessions.length > 0 && (() => {
            const mobileCount = liveSessions.filter(s => {
              const ua = (s.user_agent ?? '').toLowerCase();
              return s.device_type === 'mobile' || ua.includes('mobile') || ua.includes('android') || ua.includes('iphone') || ua.includes('ipad');
            }).length;
            const desktopCount = liveSessions.length - mobileCount;
            const mobilePercent = Math.round((mobileCount / liveSessions.length) * 100);
            const desktopPercent = 100 - mobilePercent;
            return (
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl px-5 py-4 flex items-center gap-4" style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0' }}>
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#dcfce7' }}>
                    <Smartphone className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <div className="text-[11px] font-bold text-green-700 mb-0.5">من الجوال</div>
                    <div className="text-[28px] font-black text-green-700 leading-none">{mobileCount}</div>
                    <div className="text-[10px] text-green-600 mt-0.5">{mobilePercent}% من الجلسات</div>
                  </div>
                  <div className="w-12 h-12 flex-shrink-0">
                    <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                      <circle cx="18" cy="18" r="15.9" fill="none" stroke="#bbf7d0" strokeWidth="3" />
                      <circle cx="18" cy="18" r="15.9" fill="none" stroke="#16a34a" strokeWidth="3"
                        strokeDasharray={`${mobilePercent} ${100 - mobilePercent}`}
                        strokeLinecap="round" />
                    </svg>
                  </div>
                </div>
                <div className="rounded-2xl px-5 py-4 flex items-center gap-4" style={{ background: '#eff6ff', border: '1.5px solid #bfdbfe' }}>
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#dbeafe' }}>
                    <Monitor className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <div className="text-[11px] font-bold text-blue-700 mb-0.5">من الكمبيوتر</div>
                    <div className="text-[28px] font-black text-blue-700 leading-none">{desktopCount}</div>
                    <div className="text-[10px] text-blue-600 mt-0.5">{desktopPercent}% من الجلسات</div>
                  </div>
                  <div className="w-12 h-12 flex-shrink-0">
                    <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                      <circle cx="18" cy="18" r="15.9" fill="none" stroke="#bfdbfe" strokeWidth="3" />
                      <circle cx="18" cy="18" r="15.9" fill="none" stroke="#2563eb" strokeWidth="3"
                        strokeDasharray={`${desktopPercent} ${100 - desktopPercent}`}
                        strokeLinecap="round" />
                    </svg>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Live sessions table */}
          <div className="rounded-2xl overflow-hidden" style={{ border: '1.5px solid #e2edf5', boxShadow: '0 2px 8px rgba(26,58,74,0.06)' }}>
            <div className="px-5 py-3.5 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #1a3a4a, #2c5f7c)' }}>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-[13px] font-black text-white">الجلسات الأخيرة — آخر 60 دقيقة</span>
              </div>
              <div className="flex items-center gap-3">
                {liveSessions.length > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <Smartphone className="w-3 h-3 text-green-400" />
                      <span className="text-[11px] text-green-400 font-bold">
                        {liveSessions.filter(s => {
                          const ua = (s.user_agent ?? '').toLowerCase();
                          return s.device_type === 'mobile' || ua.includes('mobile') || ua.includes('android') || ua.includes('iphone') || ua.includes('ipad');
                        }).length}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Monitor className="w-3 h-3 text-blue-300" />
                      <span className="text-[11px] text-blue-300 font-bold">
                        {liveSessions.filter(s => {
                          const ua = (s.user_agent ?? '').toLowerCase();
                          return s.device_type !== 'mobile' && !ua.includes('mobile') && !ua.includes('android') && !ua.includes('iphone') && !ua.includes('ipad');
                        }).length}
                      </span>
                    </div>
                  </div>
                )}
                <span className="text-[11px] text-white/50">{liveSessions.length} جلسة</span>
              </div>
            </div>

            {liveSessions.length === 0 ? (
              <div className="bg-white px-5 py-10 text-center">
                <Activity className="w-10 h-10 mx-auto mb-2 text-[#d1e5f0]" />
                <p className="text-[13px] text-[#94a3b8]">لا توجد جلسات في آخر ساعة</p>
                <p className="text-[11px] text-[#b0c4ce] mt-1">ستظهر الجلسات فور دخول أي زائر</p>
              </div>
            ) : (
              <div className="bg-white divide-y divide-[#f0f6fa] max-h-96 overflow-y-auto">
                {liveSessions.map((s) => {
                  const ua = (s.user_agent ?? '').toLowerCase();
                  const isPhone = s.device_type === 'mobile' ||
                    ua.includes('mobile') || ua.includes('android') || ua.includes('iphone') ||
                    ua.includes('ipad') || ua.includes('ipod') || ua.includes('blackberry') || ua.includes('windows phone');
                  const minutesAgo = Math.floor((Date.now() - new Date(s.last_seen_at).getTime()) / 60000);
                  const isActive = minutesAgo <= 3;
                  const isRecent = minutesAgo <= 10;

                  return (
                    <div
                      key={s.session_id}
                      className="px-5 py-3.5 flex items-center gap-3.5 transition-colors hover:bg-[#fafcfe]"
                      style={isActive ? { borderRight: '3px solid #16a34a' } : {}}
                    >
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 relative"
                        style={{ background: isPhone ? '#f0fdf4' : '#eff6ff', border: `1.5px solid ${isPhone ? '#bbf7d0' : '#bfdbfe'}` }}
                      >
                        {isPhone
                          ? <Smartphone className="w-4 h-4 text-green-600" />
                          : <Monitor className="w-4 h-4 text-blue-600" />
                        }
                        {isActive && (
                          <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white animate-pulse" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[12px] font-bold text-[#1a2f3e] truncate">
                            {s.phone ? s.phone : `زائر ${s.visitor_id.slice(0, 8)}`}
                          </span>
                          {s.phone && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold flex-shrink-0" style={{ background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0' }}>
                              مسجّل
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <div
                            className="flex items-center gap-1 px-2 py-0.5 rounded-full"
                            style={{
                              background: isPhone ? '#f0fdf4' : '#eff6ff',
                              border: `1px solid ${isPhone ? '#bbf7d0' : '#bfdbfe'}`
                            }}
                          >
                            {isPhone
                              ? <Smartphone className="w-2.5 h-2.5 text-green-600" />
                              : <Monitor className="w-2.5 h-2.5 text-blue-600" />
                            }
                            <span className="text-[9px] font-bold" style={{ color: isPhone ? '#16a34a' : '#2563eb' }}>
                              {isPhone ? 'جوال' : 'كمبيوتر'}
                            </span>
                          </div>
                          <span className="text-[10px] text-[#94a3b8]">{s.page_count} صفحة</span>
                        </div>
                      </div>
                      <div className="text-left flex-shrink-0 flex flex-col items-end gap-1">
                        <div className="flex items-center gap-1">
                          {isActive && <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />}
                          <span
                            className="text-[11px] font-bold"
                            style={{ color: isActive ? '#16a34a' : isRecent ? '#0369a1' : '#94a3b8' }}
                          >
                            {minutesAgo === 0 ? 'الآن' : `منذ ${minutesAgo}د`}
                          </span>
                        </div>
                        <div className="text-[10px] text-[#c4d4dc]">
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
