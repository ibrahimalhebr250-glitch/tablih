import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { TrendingUp, Calendar } from 'lucide-react';
import LoadingSkeleton from '../../shared/LoadingSkeleton';

export default function MatchingPerformance() {
  const [metrics, setMetrics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);

  useEffect(() => {
    fetchMetrics();
  }, [days]);

  const fetchMetrics = async () => {
    try {
      const { data, error } = await supabase.rpc('get_matching_performance_metrics', {
        p_days: days,
      });
      if (error) throw error;
      setMetrics(data || []);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSkeleton variant="dashboard" count={4} />;

  const totalSuccess = metrics.reduce((sum, m) => sum + m.successful_matches, 0);
  const totalAttempts = metrics.reduce((sum, m) => sum + m.total_matches_attempted, 0);
  const avgSuccessRate = totalAttempts > 0 ? (totalSuccess / totalAttempts) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <TrendingUp className="w-6 h-6 text-green-600" />
          <h3 className="text-lg font-bold">Performance Metrics</h3>
        </div>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="px-4 py-2 rounded-xl border border-gray-200"
        >
          <option value={7}>Last 7 days</option>
          <option value={14}>Last 14 days</option>
          <option value={30}>Last 30 days</option>
        </select>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-6 border border-gray-100">
          <p className="text-sm text-gray-600 mb-1">Total Attempts</p>
          <h3 className="text-3xl font-black text-gray-900">{totalAttempts}</h3>
        </div>
        <div className="bg-white rounded-xl p-6 border border-gray-100">
          <p className="text-sm text-gray-600 mb-1">Successful</p>
          <h3 className="text-3xl font-black text-green-600">{totalSuccess}</h3>
        </div>
        <div className="bg-white rounded-xl p-6 border border-gray-100">
          <p className="text-sm text-gray-600 mb-1">Success Rate</p>
          <h3 className="text-3xl font-black text-blue-600">{Math.round(avgSuccessRate)}%</h3>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 border border-gray-100">
        <h4 className="font-bold text-gray-900 mb-4">Daily Performance</h4>
        <div className="space-y-3">
          {metrics.map((metric) => (
            <div key={metric.metric_date} className="flex items-center gap-4">
              <div className="w-24 text-sm text-gray-600">
                {new Date(metric.metric_date).toLocaleDateString('ar-SA', {
                  month: 'short',
                  day: 'numeric',
                })}
              </div>
              <div className="flex-1 h-8 bg-gray-100 rounded-lg overflow-hidden">
                <div
                  className="h-full bg-green-500 flex items-center justify-end px-2 text-white text-xs font-bold"
                  style={{ width: `${metric.success_rate}%` }}
                >
                  {metric.success_rate > 20 && `${Math.round(metric.success_rate)}%`}
                </div>
              </div>
              <div className="w-16 text-sm text-gray-600 text-right">
                {metric.successful_matches}/{metric.total_matches_attempted}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
