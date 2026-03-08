import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Brain, TrendingUp, Award, MapPin, DollarSign,
  Package, Clock, Star, ChevronRight, Sparkles,
  AlertCircle, CheckCircle2, Layers, Cpu
} from 'lucide-react';
import LoadingSkeleton from '../shared/LoadingSkeleton';

interface ScoreBreakdown {
  score: number;
  weight: number;
}

interface MatchCandidate {
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
  score_breakdown: Record<string, ScoreBreakdown>;
  flexibility_used: Record<string, boolean>;
  would_match: boolean;
}

interface SmartMatchingPanelProps {
  orderId: string;
  onSelectMatch: (batchId: string, score: number) => void;
}

const SCORE_COLORS = {
  excellent: { bg: '#D1FAE5', color: '#059669', label: 'تطابق ممتاز' },
  good: { bg: '#DBEAFE', color: '#2563EB', label: 'تطابق جيد' },
  fair: { bg: '#FEF3C7', color: '#D97706', label: 'تطابق مقبول' },
  poor: { bg: '#FEE2E2', color: '#DC2626', label: 'تطابق ضعيف' },
};

const getScoreConfig = (score: number) => {
  if (score >= 85) return SCORE_COLORS.excellent;
  if (score >= 70) return SCORE_COLORS.good;
  if (score >= 60) return SCORE_COLORS.fair;
  return SCORE_COLORS.poor;
};

const FACTOR_LABELS: Record<string, { label: string; icon: typeof Award }> = {
  type: { label: 'النوع', icon: Layers },
  size: { label: 'الحجم', icon: Package },
  quality: { label: 'الجودة', icon: Award },
  city: { label: 'المدينة', icon: MapPin },
  condition: { label: 'الحالة', icon: Star },
  quantity: { label: 'الكمية', icon: Package },
  freshness: { label: 'الحداثة', icon: Clock },
  supplier: { label: 'المورد', icon: Star },
};

export default function SmartMatchingPanel({ orderId, onSelectMatch }: SmartMatchingPanelProps) {
  const [matches, setMatches] = useState<MatchCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedMatch, setExpandedMatch] = useState<string | null>(null);

  useEffect(() => {
    fetchMatches();
  }, [orderId]);

  const fetchMatches = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: err } = await supabase.rpc('ai_preview_matches', {
        p_order_id: orderId,
      });

      if (err) throw err;

      const candidates: MatchCandidate[] = (data?.candidates || [])
        .sort((a: MatchCandidate, b: MatchCandidate) => b.total_score - a.total_score)
        .slice(0, 5);

      setMatches(candidates);
    } catch (err: any) {
      console.error('Error fetching matches:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-gray-100">
        <LoadingSkeleton variant="card" count={3} icon="deal" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-gray-100">
        <div className="flex items-center gap-3 text-red-600">
          <AlertCircle className="w-5 h-5" />
          <p className="text-sm">خطأ في تحميل المطابقات: {error}</p>
        </div>
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-8 border border-gray-100 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 flex items-center justify-center">
          <Brain className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">لا توجد مطابقات</h3>
        <p className="text-sm text-gray-600">
          المحرك الذكي لم يجد مخزون مؤهل حالياً. سيتم المطابقة تلقائياً فور توفر مخزون مناسب.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-teal-500 flex items-center justify-center">
          <Brain className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900">المرشحين الأذكياء</h3>
          <p className="text-xs text-gray-600">أفضل {matches.length} مرشح - تقييم 8 عوامل</p>
        </div>
      </div>

      <div className="space-y-3">
        {matches.map((match, idx) => {
          const scoreConfig = getScoreConfig(match.total_score);
          const isExpanded = expandedMatch === match.batch_id;

          return (
            <div
              key={match.batch_id}
              className="bg-white rounded-2xl border-2 transition-all hover:shadow-lg"
              style={{ borderColor: idx === 0 ? scoreConfig.color : '#E5E7EB' }}
            >
              <button
                onClick={() => setExpandedMatch(isExpanded ? null : match.batch_id)}
                className="w-full p-4 text-left"
              >
                <div className="flex items-start gap-4">
                  {idx === 0 && (
                    <div
                      className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{ background: scoreConfig.bg }}
                    >
                      <Sparkles className="w-6 h-6" style={{ color: scoreConfig.color }} />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-bold text-gray-500">#{idx + 1}</span>
                      <h4 className="font-bold text-gray-900">
                        {match.pallet_type} - {match.quality}
                      </h4>
                      {idx === 0 && (
                        <span
                          className="text-[10px] font-bold px-2 py-1 rounded-full"
                          style={{ background: scoreConfig.bg, color: scoreConfig.color }}
                        >
                          الأفضل
                        </span>
                      )}
                      {!match.would_match && (
                        <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-gray-100 text-gray-500">
                          دون الحد
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-xs text-gray-600 mb-3">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {match.city}
                      </div>
                      <div className="flex items-center gap-1">
                        <Package className="w-3 h-3" />
                        {match.available_quantity} طبلية
                      </div>
                      <div className="flex items-center gap-1">
                        <DollarSign className="w-3 h-3" />
                        {match.price_per_pallet} ر.س
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div
                        className="flex-1 h-2 rounded-full overflow-hidden"
                        style={{ background: `${scoreConfig.color}20` }}
                      >
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${match.total_score}%`,
                            background: scoreConfig.color,
                          }}
                        />
                      </div>
                      <span className="text-sm font-black" style={{ color: scoreConfig.color }}>
                        {Math.round(match.total_score)}
                      </span>
                    </div>
                  </div>

                  <div className="flex-shrink-0 flex items-center gap-2">
                    {match.would_match && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectMatch(match.batch_id, match.total_score);
                        }}
                        className="px-4 py-2 rounded-xl font-bold text-white text-sm transition-all hover:scale-105 active:scale-95"
                        style={{ background: scoreConfig.color }}
                      >
                        اختيار
                      </button>
                    )}
                    <ChevronRight
                      className={`w-5 h-5 text-gray-400 transition-transform ${
                        isExpanded ? 'rotate-90' : ''
                      }`}
                    />
                  </div>
                </div>
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 pt-0 border-t border-gray-100">
                  <div className="mt-4 space-y-3">
                    <h5 className="text-xs font-bold text-gray-700">تحليل العوامل</h5>
                    <div className="grid grid-cols-2 gap-3">
                      {match.score_breakdown &&
                        Object.entries(match.score_breakdown).map(([key, val]) => {
                          const factorInfo = FACTOR_LABELS[key];
                          const Icon = factorInfo?.icon || TrendingUp;
                          const weighted = (val.score * val.weight) / 100;
                          const factorColor =
                            val.score >= 80 ? '#059669' : val.score >= 60 ? '#2563EB' : '#D97706';

                          return (
                            <div
                              key={key}
                              className="p-3 rounded-xl border border-gray-100 bg-gray-50"
                            >
                              <div className="flex items-center gap-2 mb-2">
                                <Icon className="w-4 h-4" style={{ color: factorColor }} />
                                <span className="text-xs font-bold text-gray-700">
                                  {factorInfo?.label || key}
                                </span>
                                <span className="text-[10px] text-gray-400 mr-auto">
                                  وزن: {val.weight}%
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mb-1">
                                <div className="flex-1 h-1.5 rounded-full bg-gray-200">
                                  <div
                                    className="h-full rounded-full transition-all"
                                    style={{
                                      width: `${val.score}%`,
                                      background: factorColor,
                                    }}
                                  />
                                </div>
                                <span
                                  className="text-xs font-bold"
                                  style={{ color: factorColor }}
                                >
                                  {Math.round(weighted)}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                    </div>

                    {Object.values(match.flexibility_used || {}).some(Boolean) && (
                      <div className="pt-3 border-t border-gray-100">
                        <h5 className="text-xs font-bold text-gray-700 mb-2">المرونة المستخدمة</h5>
                        <div className="flex gap-2 flex-wrap">
                          {match.flexibility_used.close_quality && (
                            <span className="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 font-bold">
                              جودة قريبة
                            </span>
                          )}
                          {match.flexibility_used.close_city && (
                            <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 font-bold">
                              مدينة مختلفة
                            </span>
                          )}
                          {match.flexibility_used.partial_delivery && (
                            <span className="text-xs px-2 py-1 rounded-full bg-orange-100 text-orange-700 font-bold">
                              توصيل جزئي
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-blue-50 to-teal-50 border border-blue-100">
        <div className="flex items-start gap-3">
          <Cpu className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold text-gray-900 mb-1">
              محرك المطابقة الذكي v3
            </h4>
            <p className="text-xs text-gray-600">
              تقييم 8 عوامل: النوع، الحجم، الجودة، المدينة، الحالة، الكمية، حداثة المخزون، وتقييم المورد.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
