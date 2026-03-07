import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Brain, TrendingUp, Award, MapPin, DollarSign,
  Package, Clock, Star, ChevronRight, Sparkles,
  AlertCircle, CheckCircle2
} from 'lucide-react';
import LoadingSkeleton from '../shared/LoadingSkeleton';

interface MatchScore {
  batch_id: string;
  score: number;
  quality_score: number;
  price_score: number;
  location_score: number;
  quantity_score: number;
  supplier_rating_score: number;
  freshness_score: number;
  match_reasons: Array<{
    factor: string;
    score: number;
    reason: string;
  }>;
  batch_details: {
    pallet_type: string;
    size: string;
    quality: string;
    city: string;
    available_quantity: number;
    price_per_pallet: number;
    pallet_condition: string;
    supplier_phone: string;
    image_urls: string[];
    description: string;
  };
}

interface SmartMatchingPanelProps {
  orderId: string;
  onSelectMatch: (batchId: string, score: number) => void;
}

const SCORE_COLORS = {
  excellent: { bg: '#D1FAE5', color: '#059669', label: 'Excellent Match' },
  good: { bg: '#DBEAFE', color: '#2563EB', label: 'Good Match' },
  fair: { bg: '#FEF3C7', color: '#D97706', label: 'Fair Match' },
  poor: { bg: '#FEE2E2', color: '#DC2626', label: 'Weak Match' },
};

const getScoreConfig = (score: number) => {
  if (score >= 85) return SCORE_COLORS.excellent;
  if (score >= 75) return SCORE_COLORS.good;
  if (score >= 65) return SCORE_COLORS.fair;
  return SCORE_COLORS.poor;
};

const FACTOR_ICONS: Record<string, any> = {
  quality: Award,
  price: DollarSign,
  location: MapPin,
  quantity: Package,
  supplier: Star,
  freshness: Clock,
};

export default function SmartMatchingPanel({ orderId, onSelectMatch }: SmartMatchingPanelProps) {
  const [matches, setMatches] = useState<MatchScore[]>([]);
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

      const { data, error: err } = await supabase.rpc('get_best_matches_for_order', {
        p_order_id: orderId,
        p_limit: 5
      });

      if (err) throw err;
      setMatches(data || []);
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
          <p className="text-sm">Error loading matches: {error}</p>
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
        <h3 className="text-lg font-bold text-gray-900 mb-2">No Matches Found</h3>
        <p className="text-sm text-gray-600">
          Our AI couldn't find suitable inventory matches for this order yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
          <Brain className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900">AI-Powered Matches</h3>
          <p className="text-xs text-gray-600">Top {matches.length} recommendations based on intelligent scoring</p>
        </div>
      </div>

      <div className="space-y-3">
        {matches.map((match, idx) => {
          const scoreConfig = getScoreConfig(match.score);
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
                        {match.batch_details.pallet_type} - {match.batch_details.quality}
                      </h4>
                      {idx === 0 && (
                        <span
                          className="text-[10px] font-bold px-2 py-1 rounded-full"
                          style={{ background: scoreConfig.bg, color: scoreConfig.color }}
                        >
                          Best Match
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-xs text-gray-600 mb-3">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {match.batch_details.city}
                      </div>
                      <div className="flex items-center gap-1">
                        <Package className="w-3 h-3" />
                        {match.batch_details.available_quantity} pallets
                      </div>
                      <div className="flex items-center gap-1">
                        <DollarSign className="w-3 h-3" />
                        {match.batch_details.price_per_pallet} SAR
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
                            width: `${match.score}%`,
                            background: scoreConfig.color,
                          }}
                        />
                      </div>
                      <span className="text-sm font-black" style={{ color: scoreConfig.color }}>
                        {Math.round(match.score)}%
                      </span>
                    </div>
                  </div>

                  <div className="flex-shrink-0 flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectMatch(match.batch_id, match.score);
                      }}
                      className="px-4 py-2 rounded-xl font-bold text-white text-sm transition-all hover:scale-105 active:scale-95"
                      style={{ background: scoreConfig.color }}
                    >
                      Select
                    </button>
                    <ChevronRight
                      className={`w-5 h-5 text-gray-400 transition-transform ${
                        isExpanded ? 'rotate-90' : ''
                      }`}
                    />
                  </div>
                </div>
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 pt-0 border-t border-gray-100 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="mt-4 space-y-3">
                    <h5 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Match Analysis
                    </h5>
                    <div className="grid grid-cols-2 gap-3">
                      {match.match_reasons.map((reason, idx) => {
                        const Icon = FACTOR_ICONS[reason.factor] || TrendingUp;
                        const factorScore = reason.score;
                        const factorColor = factorScore >= 80 ? '#059669' : factorScore >= 60 ? '#2563EB' : '#D97706';

                        return (
                          <div
                            key={idx}
                            className="p-3 rounded-xl border border-gray-100 bg-gray-50"
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <Icon className="w-4 h-4" style={{ color: factorColor }} />
                              <span className="text-xs font-bold capitalize text-gray-700">
                                {reason.factor}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mb-1">
                              <div className="flex-1 h-1.5 rounded-full bg-gray-200">
                                <div
                                  className="h-full rounded-full transition-all"
                                  style={{
                                    width: `${factorScore}%`,
                                    background: factorColor,
                                  }}
                                />
                              </div>
                              <span className="text-xs font-bold" style={{ color: factorColor }}>
                                {Math.round(factorScore)}
                              </span>
                            </div>
                            <p className="text-[10px] text-gray-600">{reason.reason}</p>
                          </div>
                        );
                      })}
                    </div>

                    {match.batch_details.description && (
                      <div className="pt-3 border-t border-gray-100">
                        <h5 className="text-xs font-bold text-gray-700 mb-2">Description</h5>
                        <p className="text-xs text-gray-600">{match.batch_details.description}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-100">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold text-gray-900 mb-1">
              AI-Powered Matching
            </h4>
            <p className="text-xs text-gray-600">
              Scores are calculated based on quality, price, location, quantity, supplier rating, and inventory freshness.
              Higher scores indicate better matches for your order requirements.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
