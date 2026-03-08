import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { TrendingUp, Activity, Zap, Clock } from 'lucide-react';

interface PerformanceData {
  log_timestamp: string;
  matches_count: number;
  success_rate: number;
  avg_processing_time: number;
  avg_score: number;
}

export default function MatchingPerformanceChart() {
  const [data, setData] = useState<PerformanceData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPerformanceData();
  }, []);

  const loadPerformanceData = async () => {
    try {
      const { data: perfData, error } = await supabase.rpc('get_matching_performance_timeline');
      if (error) throw error;
      setData(perfData || []);
    } catch (err) {
      console.error('Error loading performance data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <div key={i} className="bg-white rounded-2xl p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-4" />
            <div className="h-48 bg-gray-200 rounded" />
          </div>
        ))}
      </div>
    );
  }

  const maxMatches = Math.max(...data.map((d) => d.matches_count), 1);
  const maxTime = Math.max(...data.map((d) => d.avg_processing_time), 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-teal-50 rounded-2xl p-6 border border-blue-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-black text-gray-900">أداء النظام</h2>
            <p className="text-sm text-gray-600">مراقبة الأداء والسرعة عبر الوقت</p>
          </div>
        </div>
      </div>

      {/* Matches Over Time */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100">
        <div className="flex items-center gap-2 mb-6">
          <Activity className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-bold text-gray-900">عدد المطابقات عبر الوقت</h3>
        </div>

        <div className="h-64 flex items-end gap-2">
          {data.map((point, index) => {
            const height = (point.matches_count / maxMatches) * 100;
            const color = point.success_rate >= 80 ? '#10B981' : point.success_rate >= 60 ? '#3B82F6' : '#F59E0B';

            return (
              <div key={index} className="flex-1 flex flex-col items-center gap-2">
                <div className="relative group w-full">
                  <div
                    className="w-full rounded-t-lg transition-all cursor-pointer hover:opacity-80"
                    style={{ height: `${height}%`, minHeight: '8px', background: color }}
                  />
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block">
                    <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap">
                      <p className="font-bold mb-1">{point.matches_count} مطابقة</p>
                      <p>نجاح: {Math.round(point.success_rate)}%</p>
                      <p>نقاط: {Math.round(point.avg_score)}</p>
                    </div>
                  </div>
                </div>
                <span className="text-[10px] text-gray-500 font-bold">
                  {new Date(point.log_timestamp).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Processing Time */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100">
        <div className="flex items-center gap-2 mb-6">
          <Clock className="w-5 h-5 text-teal-600" />
          <h3 className="text-lg font-bold text-gray-900">زمن المعالجة</h3>
        </div>

        <div className="h-48 flex items-end gap-2">
          {data.map((point, index) => {
            const height = (point.avg_processing_time / maxTime) * 100;

            return (
              <div key={index} className="flex-1 flex flex-col items-center gap-2">
                <div className="relative group w-full">
                  <div
                    className="w-full rounded-t-lg transition-all cursor-pointer hover:opacity-80"
                    style={{
                      height: `${height}%`,
                      minHeight: '8px',
                      background: 'linear-gradient(to top, #0D9488, #5EEAD4)',
                    }}
                  />
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block">
                    <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap">
                      <p className="font-bold">{Math.round(point.avg_processing_time)}ms</p>
                    </div>
                  </div>
                </div>
                <span className="text-[10px] text-gray-500 font-bold">
                  {new Date(point.log_timestamp).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Success Rate Timeline */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100">
        <div className="flex items-center gap-2 mb-6">
          <Zap className="w-5 h-5 text-green-600" />
          <h3 className="text-lg font-bold text-gray-900">نسبة النجاح عبر الوقت</h3>
        </div>

        <div className="h-48 relative">
          {/* Grid lines */}
          <div className="absolute inset-0 flex flex-col justify-between">
            {[100, 75, 50, 25, 0].map((value) => (
              <div key={value} className="flex items-center gap-2">
                <span className="text-xs text-gray-400 w-8">{value}%</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>
            ))}
          </div>

          {/* Line chart */}
          <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
            <polyline
              fill="none"
              stroke="#10B981"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={data
                .map((point, index) => {
                  const x = (index / (data.length - 1)) * 100;
                  const y = 100 - point.success_rate;
                  return `${x}%,${y}%`;
                })
                .join(' ')}
            />
            {data.map((point, index) => {
              const x = (index / (data.length - 1)) * 100;
              const y = 100 - point.success_rate;
              return (
                <circle
                  key={index}
                  cx={`${x}%`}
                  cy={`${y}%`}
                  r="4"
                  fill="#10B981"
                  className="cursor-pointer hover:r-6 transition-all"
                />
              );
            })}
          </svg>
        </div>
      </div>
    </div>
  );
}
