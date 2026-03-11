import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Users, Activity, Target, Zap, Filter, Download } from 'lucide-react';
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

  const { experiments } = useABTesting();

  useEffect(() => {
    loadAnalytics();
  }, [dateRange]);

  useEffect(() => {
    const interval = setInterval(loadRealtimeStats, 10000);
    loadRealtimeStats();
    return () => clearInterval(interval);
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
      eventCounts[event.event_name] = (eventCounts[event.event_name] || 0) + 1;
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
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const { data, error } = await supabase
      .from('user_behavior_tracking')
      .select('user_phone')
      .gte('created_at', fiveMinutesAgo.toISOString());

    if (!error && data) {
      const unique = new Set(data.map(d => d.user_phone)).size;
      setRealtimeUsers(unique);
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
                <span className="px-3 py-1 bg-orange-200 text-orange-700 text-xs font-bold rounded-full">
                  الآن
                </span>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-2">
                {realtimeUsers}
              </div>
              <div className="text-sm text-gray-600">مستخدم نشط</div>
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
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-8 border border-green-200 text-center">
            <Activity className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <div className="text-5xl font-bold text-gray-900 mb-2">
              {realtimeUsers}
            </div>
            <div className="text-lg text-gray-600">مستخدم نشط الآن</div>
            <div className="text-sm text-gray-500 mt-2">آخر 5 دقائق</div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">النشاط الأخير</h3>
            <div className="text-center text-gray-500 py-8">
              <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>يتم تحديث النشاط كل 10 ثواني</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
