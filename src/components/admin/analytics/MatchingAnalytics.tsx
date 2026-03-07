import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import {
  Brain, TrendingUp, TrendingDown, Target, Activity,
  CheckCircle2, XCircle, Clock, BarChart3, PieChart,
  Zap, Award, AlertCircle
} from 'lucide-react';
import LoadingSkeleton from '../../shared/LoadingSkeleton';

interface MatchingStats {
  total_matches: number;
  successful_matches: number;
  failed_matches: number;
  avg_match_score: number;
  avg_quality_score: number;
  avg_price_score: number;
  avg_location_score: number;
  avg_quantity_score: number;
  avg_supplier_score: number;
  avg_freshness_score: number;
  matches_by_score_range: Array<{
    range: string;
    count: number;
  }>;
}

export default function MatchingAnalytics() {
  const [stats, setStats] = useState<MatchingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('7d');

  useEffect(() => {
    fetchStats();
  }, [timeRange]);

  const fetchStats = async () => {
    try {
      setLoading(true);

      const hoursAgo = timeRange === '24h' ? 24 : timeRange === '7d' ? 168 : 720;
      const since = new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString();

      // Get matching scores
      const { data: scores, error: scoresErr } = await supabase
        .from('matching_scores')
        .select('*')
        .gte('created_at', since);

      if (scoresErr) throw scoresErr;

      // Get match history
      const { data: history, error: historyErr } = await supabase
        .from('match_history')
        .select('*')
        .gte('created_at', since);

      if (historyErr) throw historyErr;

      // Calculate statistics
      const totalMatches = history?.length || 0;
      const successfulMatches = history?.filter(h => h.was_accepted).length || 0;
      const failedMatches = totalMatches - successfulMatches;

      const avgScore = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

      const matchScores = scores?.map(s => s.score) || [];
      const qualityScores = scores?.map(s => s.quality_score) || [];
      const priceScores = scores?.map(s => s.price_score) || [];
      const locationScores = scores?.map(s => s.location_score) || [];
      const quantityScores = scores?.map(s => s.quantity_score) || [];
      const supplierScores = scores?.map(s => s.supplier_rating_score) || [];
      const freshnessScores = scores?.map(s => s.freshness_score) || [];

      // Group by score ranges
      const scoreRanges = [
        { range: '90-100', min: 90, max: 100 },
        { range: '80-89', min: 80, max: 89 },
        { range: '70-79', min: 70, max: 79 },
        { range: '60-69', min: 60, max: 69 },
        { range: '0-59', min: 0, max: 59 },
      ];

      const matchesByRange = scoreRanges.map(range => ({
        range: range.range,
        count: matchScores.filter(s => s >= range.min && s <= range.max).length,
      }));

      setStats({
        total_matches: totalMatches,
        successful_matches: successfulMatches,
        failed_matches: failedMatches,
        avg_match_score: avgScore(matchScores),
        avg_quality_score: avgScore(qualityScores),
        avg_price_score: avgScore(priceScores),
        avg_location_score: avgScore(locationScores),
        avg_quantity_score: avgScore(quantityScores),
        avg_supplier_score: avgScore(supplierScores),
        avg_freshness_score: avgScore(freshnessScores),
        matches_by_score_range: matchesByRange,
      });
    } catch (err) {
      console.error('Error fetching matching stats:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSkeleton variant="dashboard" count={4} />;
  }

  if (!stats) {
    return (
      <div className="p-8 text-center">
        <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-600">Unable to load analytics</p>
      </div>
    );
  }

  const successRate = stats.total_matches > 0
    ? (stats.successful_matches / stats.total_matches) * 100
    : 0;

  const factorScores = [
    { label: 'Quality', score: stats.avg_quality_score, icon: Award, color: '#7C3AED' },
    { label: 'Price', score: stats.avg_price_score, icon: TrendingDown, color: '#059669' },
    { label: 'Location', score: stats.avg_location_score, icon: Target, color: '#2563EB' },
    { label: 'Quantity', score: stats.avg_quantity_score, icon: Activity, color: '#D97706' },
    { label: 'Supplier', score: stats.avg_supplier_score, icon: CheckCircle2, color: '#DC2626' },
    { label: 'Freshness', score: stats.avg_freshness_score, icon: Clock, color: '#059669' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-gray-900">AI Matching Analytics</h2>
            <p className="text-sm text-gray-600">Performance metrics and insights</p>
          </div>
        </div>

        <div className="flex gap-2">
          {(['24h', '7d', '30d'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                timeRange === range
                  ? 'bg-purple-600 text-white shadow-lg'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-purple-300'
              }`}
            >
              {range === '24h' ? 'Last 24h' : range === '7d' ? 'Last 7 days' : 'Last 30 days'}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
              <Brain className="w-6 h-6 text-purple-600" />
            </div>
            <TrendingUp className="w-5 h-5 text-green-500" />
          </div>
          <h3 className="text-3xl font-black text-gray-900 mb-1">{stats.total_matches}</h3>
          <p className="text-sm text-gray-600">Total Matches Analyzed</p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            </div>
            <span className="text-xs font-bold px-2 py-1 rounded-full bg-green-100 text-green-600">
              {Math.round(successRate)}%
            </span>
          </div>
          <h3 className="text-3xl font-black text-gray-900 mb-1">{stats.successful_matches}</h3>
          <p className="text-sm text-gray-600">Successful Matches</p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <Zap className="w-6 h-6 text-blue-600" />
            </div>
            <Target className="w-5 h-5 text-blue-500" />
          </div>
          <h3 className="text-3xl font-black text-gray-900 mb-1">
            {Math.round(stats.avg_match_score)}
          </h3>
          <p className="text-sm text-gray-600">Average Match Score</p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
              <XCircle className="w-6 h-6 text-red-600" />
            </div>
            <TrendingDown className="w-5 h-5 text-red-500" />
          </div>
          <h3 className="text-3xl font-black text-gray-900 mb-1">{stats.failed_matches}</h3>
          <p className="text-sm text-gray-600">Failed/Rejected Matches</p>
        </div>
      </div>

      {/* Factor Scores */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100">
        <div className="flex items-center gap-2 mb-6">
          <BarChart3 className="w-5 h-5 text-gray-700" />
          <h3 className="text-lg font-bold text-gray-900">Average Score by Factor</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {factorScores.map((factor) => (
            <div key={factor.label} className="p-4 rounded-xl border border-gray-100 bg-gray-50">
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ background: `${factor.color}20` }}
                >
                  <factor.icon className="w-5 h-5" style={{ color: factor.color }} />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium text-gray-600">{factor.label}</p>
                  <p className="text-xl font-black text-gray-900">
                    {Math.round(factor.score)}
                  </p>
                </div>
              </div>
              <div className="h-2 rounded-full bg-gray-200">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${factor.score}%`,
                    background: factor.color,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Score Distribution */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100">
        <div className="flex items-center gap-2 mb-6">
          <PieChart className="w-5 h-5 text-gray-700" />
          <h3 className="text-lg font-bold text-gray-900">Match Score Distribution</h3>
        </div>
        <div className="space-y-3">
          {stats.matches_by_score_range.map((range, idx) => {
            const colors = ['#059669', '#2563EB', '#7C3AED', '#D97706', '#DC2626'];
            const percentage = stats.total_matches > 0
              ? (range.count / stats.total_matches) * 100
              : 0;

            return (
              <div key={range.range} className="flex items-center gap-4">
                <div className="w-20 text-sm font-bold text-gray-700">{range.range}%</div>
                <div className="flex-1 h-8 rounded-lg bg-gray-100 overflow-hidden">
                  <div
                    className="h-full flex items-center justify-end px-3 text-white text-sm font-bold transition-all"
                    style={{
                      width: `${percentage}%`,
                      background: colors[idx],
                      minWidth: range.count > 0 ? '40px' : '0',
                    }}
                  >
                    {range.count > 0 && range.count}
                  </div>
                </div>
                <div className="w-16 text-sm text-gray-600 text-right">
                  {Math.round(percentage)}%
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Insights */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-100">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-500 flex items-center justify-center flex-shrink-0">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">AI Insights</h3>
            <ul className="space-y-2 text-sm text-gray-700">
              {stats.avg_match_score >= 80 && (
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" />
                  <span>Excellent matching performance - AI is finding high-quality matches</span>
                </li>
              )}
              {stats.avg_quality_score < 70 && (
                <li className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5" />
                  <span>Consider reviewing quality matching criteria</span>
                </li>
              )}
              {successRate < 60 && (
                <li className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
                  <span>Low success rate - investigate rejection reasons</span>
                </li>
              )}
              {stats.avg_price_score >= 85 && (
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" />
                  <span>Competitive pricing is driving successful matches</span>
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
