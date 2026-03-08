import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
  BarChart3, TrendingUp, TrendingDown, Target, Zap,
  Clock, Award, Cpu, Shuffle
} from 'lucide-react';

type TimeRange = '24h' | '7d' | '30d';

interface Totals {
  attempts: number;
  ok: number;
  fail: number;
  rate: number;
  avg_score: number;
  avg_ms: number;
  total_qty: number;
}

interface HourBucket { h: string; t: number; ok: number }
interface QualityBucket { q: string; t: number; ok: number }
interface CityBucket { c: string; t: number; ok: number }
interface EngineBucket { e: string; t: number; ok: number }
interface FlexStats { quality: number; city: number; partial: number }

interface AnalyticsResponse {
  range: string;
  since: string;
  totals: Totals;
  by_hour: HourBucket[];
  by_quality: QualityBucket[];
  by_city: CityBucket[];
  by_engine: EngineBucket[];
  flex: FlexStats;
}

export default function MatchingAnalytics() {
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_matching_analytics', {
        p_range: timeRange
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

  const { totals, by_hour, by_quality, by_city, by_engine, flex } = analytics;

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-50 to-teal-50 rounded-2xl p-6 border border-blue-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-black text-gray-900">تحليلات المطابقة</h2>
            <p className="text-sm text-gray-600">رؤى متقدمة حول أداء المحرك الذكي v3</p>
          </div>
        </div>

        <div className="flex gap-2">
          {([
            { value: '24h' as TimeRange, label: '24 ساعة' },
            { value: '7d' as TimeRange, label: '7 أيام' },
            { value: '30d' as TimeRange, label: '30 يوم' },
          ]).map((range) => (
            <button
              key={range.value}
              onClick={() => setTimeRange(range.value)}
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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-bold text-gray-600">محاولات المطابقة</span>
          </div>
          <p className="text-3xl font-black text-gray-900">{totals.attempts}</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-green-600" />
            <span className="text-xs font-bold text-gray-600">نسبة النجاح</span>
          </div>
          <div className="flex items-center gap-2">
            <p className="text-3xl font-black text-green-600">{totals.rate}%</p>
            {totals.rate >= 50 ? (
              <TrendingUp className="w-5 h-5 text-green-600" />
            ) : (
              <TrendingDown className="w-5 h-5 text-red-600" />
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <Award className="w-4 h-4 text-teal-600" />
            <span className="text-xs font-bold text-gray-600">متوسط النقاط</span>
          </div>
          <p className="text-3xl font-black text-teal-600">
            {Math.round(totals.avg_score)}%
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-orange-600" />
            <span className="text-xs font-bold text-gray-600">متوسط الوقت</span>
          </div>
          <p className="text-3xl font-black text-orange-600">
            {Math.round(totals.avg_ms)}ms
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 border border-gray-100">
        <h3 className="text-lg font-bold text-gray-900 mb-4">نتائج المطابقة</h3>
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-gray-700">مطابقات ناجحة</span>
              <span className="text-sm font-black text-green-600">{totals.ok}</span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all"
                style={{ width: `${totals.rate}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-gray-700">مطابقات فاشلة</span>
              <span className="text-sm font-black text-red-600">{totals.fail}</span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-red-500 rounded-full transition-all"
                style={{ width: `${totals.attempts > 0 ? Math.round((totals.fail / totals.attempts) * 100) : 0}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 border border-gray-100">
        <h3 className="text-lg font-bold text-gray-900 mb-4">المطابقات بالساعة</h3>
        {by_hour.length > 0 ? (
          <div className="h-48 flex items-end gap-1">
            {by_hour.map((bucket, i) => {
              const maxT = Math.max(...by_hour.map(b => b.t), 1);
              const height = (bucket.t / maxT) * 100;
              const rate = bucket.t > 0 ? (bucket.ok / bucket.t) * 100 : 0;
              const color = rate >= 80 ? '#10B981' : rate >= 50 ? '#3B82F6' : '#F59E0B';
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="relative group w-full">
                    <div
                      className="w-full rounded-t-lg transition-all cursor-pointer hover:opacity-80"
                      style={{ height: `${Math.max(height, 4)}%`, minHeight: '4px', background: color }}
                    />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                      <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap">
                        <p className="font-bold mb-1">{bucket.t} محاولة</p>
                        <p>نجاح: {bucket.ok}</p>
                      </div>
                    </div>
                  </div>
                  <span className="text-[9px] text-gray-500 font-bold">{bucket.h}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-gray-500 text-center py-8">لا توجد بيانات في هذه الفترة</p>
        )}
      </div>

      <div className="bg-white rounded-2xl p-6 border border-gray-100">
        <h3 className="text-lg font-bold text-gray-900 mb-4">المطابقات حسب الجودة</h3>
        <div className="space-y-3">
          {by_quality.map((item) => {
            const rate = item.t > 0 ? Math.round((item.ok / item.t) * 100) : 0;
            return (
              <div key={item.q}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-gray-700">جودة {item.q}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">{item.t} محاولة</span>
                    <span className="text-sm font-black text-blue-600">{rate}%</span>
                  </div>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all"
                    style={{ width: `${rate}%` }}
                  />
                </div>
              </div>
            );
          })}
          {by_quality.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-4">لا توجد بيانات</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 border border-gray-100">
        <h3 className="text-lg font-bold text-gray-900 mb-4">أكثر المدن نشاطاً</h3>
        <div className="space-y-3">
          {by_city.map((city, index) => (
            <div
              key={city.c}
              className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-all"
            >
              <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                <span className="text-sm font-black text-blue-600">#{index + 1}</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-gray-900">{city.c}</p>
                <p className="text-xs text-gray-500">نجاح: {city.ok} / {city.t}</p>
              </div>
              <span className="text-lg font-black text-blue-600">{city.t}</span>
            </div>
          ))}
          {by_city.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-4">لا توجد بيانات</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl p-6 border border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <Cpu className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-bold text-gray-900">حسب إصدار المحرك</h3>
          </div>
          <div className="space-y-3">
            {by_engine.map((eng) => (
              <div key={eng.e} className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
                <span className="text-sm font-bold text-gray-700">{eng.e}</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500">{eng.ok}/{eng.t} ناجح</span>
                  <span className="text-sm font-black text-blue-600">
                    {eng.t > 0 ? Math.round((eng.ok / eng.t) * 100) : 0}%
                  </span>
                </div>
              </div>
            ))}
            {by_engine.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">لا توجد بيانات</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <Shuffle className="w-5 h-5 text-teal-600" />
            <h3 className="text-lg font-bold text-gray-900">استخدام المرونة</h3>
          </div>
          <div className="space-y-3">
            {[
              { label: 'جودة قريبة', value: flex.quality, color: '#F59E0B' },
              { label: 'مدينة مختلفة', value: flex.city, color: '#3B82F6' },
              { label: 'توصيل جزئي', value: flex.partial, color: '#10B981' },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ background: item.color }} />
                  <span className="text-sm font-bold text-gray-700">{item.label}</span>
                </div>
                <span className="text-lg font-black" style={{ color: item.color }}>
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
