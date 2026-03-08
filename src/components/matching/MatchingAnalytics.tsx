import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
  BarChart3, TrendingUp, TrendingDown, Target, Zap,
  Clock, Package, ShoppingCart, Award, AlertCircle
} from 'lucide-react';

interface AnalyticsData {
  total_matches: number;
  successful_matches: number;
  failed_matches: number;
  avg_score: number;
  avg_processing_time: number;
  matches_by_hour: Array<{ hour: number; count: number }>;
  matches_by_quality: Array<{ quality: string; count: number; success_rate: number }>;
  top_cities: Array<{ city: string; matches: number }>;
  success_rate_trend: number;
}

export default function MatchingAnalytics() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month'>('today');

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_matching_analytics', {
        p_time_range: timeRange
      });

      if (error) throw error;
      setAnalytics(data);
    } catch (err) {
      console.error('Error loading analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !analytics) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-2xl p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-4" />
            <div className="h-24 bg-gray-200 rounded" />
          </div>
        ))}
      </div>
    );
  }

  const successRate = analytics.total_matches > 0
    ? Math.round((analytics.successful_matches / analytics.total_matches) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-black text-gray-900">تحليلات المطابقة</h2>
            <p className="text-sm text-gray-600">رؤى متقدمة حول أداء النظام</p>
          </div>
        </div>

        {/* Time Range Selector */}
        <div className="flex gap-2">
          {[
            { value: 'today', label: 'اليوم' },
            { value: 'week', label: 'هذا الأسبوع' },
            { value: 'month', label: 'هذا الشهر' },
          ].map((range) => (
            <button
              key={range.value}
              onClick={() => setTimeRange(range.value as any)}
              className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                timeRange === range.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-bold text-gray-600">إجمالي المطابقات</span>
          </div>
          <p className="text-3xl font-black text-gray-900">{analytics.total_matches}</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-green-600" />
            <span className="text-xs font-bold text-gray-600">نسبة النجاح</span>
          </div>
          <div className="flex items-center gap-2">
            <p className="text-3xl font-black text-green-600">{successRate}%</p>
            {analytics.success_rate_trend > 0 ? (
              <TrendingUp className="w-5 h-5 text-green-600" />
            ) : (
              <TrendingDown className="w-5 h-5 text-red-600" />
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <Award className="w-4 h-4 text-purple-600" />
            <span className="text-xs font-bold text-gray-600">متوسط النقاط</span>
          </div>
          <p className="text-3xl font-black text-purple-600">
            {Math.round(analytics.avg_score)}%
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-orange-600" />
            <span className="text-xs font-bold text-gray-600">متوسط الوقت</span>
          </div>
          <p className="text-3xl font-black text-orange-600">
            {Math.round(analytics.avg_processing_time)}ms
          </p>
        </div>
      </div>

      {/* Success/Failure Breakdown */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100">
        <h3 className="text-lg font-bold text-gray-900 mb-4">نتائج المطابقة</h3>
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-gray-700">مطابقات ناجحة</span>
              <span className="text-sm font-black text-green-600">
                {analytics.successful_matches}
              </span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all"
                style={{ width: `${successRate}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-gray-700">مطابقات فاشلة</span>
              <span className="text-sm font-black text-red-600">
                {analytics.failed_matches}
              </span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-red-500 rounded-full transition-all"
                style={{ width: `${100 - successRate}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Matches by Quality */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100">
        <h3 className="text-lg font-bold text-gray-900 mb-4">المطابقات حسب الجودة</h3>
        <div className="space-y-3">
          {analytics.matches_by_quality.map((item) => (
            <div key={item.quality}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-gray-700">جودة {item.quality}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">{item.count} مطابقة</span>
                  <span className="text-sm font-black text-blue-600">
                    {Math.round(item.success_rate)}%
                  </span>
                </div>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all"
                  style={{ width: `${item.success_rate}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Cities */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100">
        <h3 className="text-lg font-bold text-gray-900 mb-4">أكثر المدن نشاطاً</h3>
        <div className="space-y-3">
          {analytics.top_cities.map((city, index) => (
            <div
              key={city.city}
              className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-all"
            >
              <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                <span className="text-sm font-black text-blue-600">#{index + 1}</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-gray-900">{city.city}</p>
              </div>
              <span className="text-lg font-black text-blue-600">{city.matches}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
