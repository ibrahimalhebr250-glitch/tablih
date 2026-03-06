import { useState, useEffect } from 'react';
import { Star, MessageSquare, Calendar, CheckCircle, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Rating {
  id: string;
  deal_id: string;
  rater_phone: string;
  rated_phone: string;
  rating: number;
  comment: string | null;
  is_confirmed: boolean;
  created_at: string;
}

interface RatingsSummary {
  average_rating: number;
  total_ratings: number;
  confirmed_ratings: number;
  pending_ratings: number;
  rating_breakdown: Record<number, number>;
}

interface Props {
  userPhone: string;
}

export default function RatingsSection({ userPhone }: Props) {
  const [summary, setSummary] = useState<RatingsSummary | null>(null);
  const [visitorSummary, setVisitorSummary] = useState<RatingsSummary | null>(null);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [visitorRatings, setVisitorRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'deal' | 'visitor'>('deal');

  useEffect(() => {
    fetchRatings();
  }, [userPhone]);

  const fetchRatings = async () => {
    try {
      setLoading(true);

      const { data: summaryData, error: summaryError } = await supabase.rpc(
        'get_user_ratings_summary',
        { p_user_phone: userPhone }
      );

      if (summaryError) throw summaryError;
      setSummary(summaryData);

      const { data: visitorSummaryData, error: visitorSummaryError } = await supabase.rpc(
        'get_visitor_ratings_summary',
        { p_user_phone: userPhone }
      );

      if (visitorSummaryError) throw visitorSummaryError;
      setVisitorSummary(visitorSummaryData);

      const { data: ratingsData, error: ratingsError } = await supabase
        .from('user_ratings')
        .select('*')
        .eq('rated_phone', userPhone)
        .eq('rating_type', 'deal')
        .eq('is_confirmed', true)
        .order('created_at', { ascending: false })
        .limit(10);

      if (ratingsError) throw ratingsError;
      setRatings(ratingsData || []);

      const { data: visitorRatingsData, error: visitorRatingsError } = await supabase
        .from('user_ratings')
        .select('*')
        .eq('rated_phone', userPhone)
        .eq('rating_type', 'visitor')
        .eq('is_confirmed', true)
        .order('created_at', { ascending: false })
        .limit(10);

      if (visitorRatingsError) throw visitorRatingsError;
      setVisitorRatings(visitorRatingsData || []);
    } catch (error) {
      console.error('Error fetching ratings:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-32"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!summary || !visitorSummary) {
    return null;
  }

  const currentSummary = activeTab === 'deal' ? summary : visitorSummary;
  const currentRatings = activeTab === 'deal' ? ratings : visitorRatings;
  const avgRating = currentSummary.average_rating || 0;
  const confirmedCount = currentSummary.confirmed_ratings || 0;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl p-4 border border-gray-200">
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveTab('deal')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors ${
              activeTab === 'deal'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            تقييمات الصفقات ({summary.confirmed_ratings})
          </button>
          <button
            onClick={() => setActiveTab('visitor')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors ${
              activeTab === 'visitor'
                ? 'bg-amber-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            تقييمات الزوار ({visitorSummary.confirmed_ratings})
          </button>
        </div>
      </div>

      <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 border border-amber-200/50">
        <h3 className="text-lg font-bold text-gray-900 mb-4">
          {activeTab === 'deal' ? 'تقييمات الصفقات' : 'تقييمات الزوار'}
        </h3>

        <div className="flex items-center gap-6 mb-6">
          <div className="text-center">
            <div className="text-4xl font-black text-gray-900 mb-1">
              {avgRating > 0 ? avgRating.toFixed(1) : '-'}
            </div>
            <div className="flex items-center justify-center gap-0.5 mb-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star
                  key={i}
                  className="w-4 h-4"
                  style={{
                    color: i <= Math.round(avgRating) ? '#F59E0B' : '#D1D5DB',
                    fill: i <= Math.round(avgRating) ? '#F59E0B' : 'none',
                  }}
                />
              ))}
            </div>
            <p className="text-xs text-gray-600">
              {confirmedCount} {confirmedCount === 1 ? 'تقييم' : 'تقييمات'}
            </p>
          </div>

          {confirmedCount > 0 && (
            <div className="flex-1 space-y-2">
              {[5, 4, 3, 2, 1].map((rating) => {
                const count = currentSummary.rating_breakdown[rating] || 0;
                const percentage = confirmedCount > 0 ? (count / confirmedCount) * 100 : 0;
                return (
                  <div key={rating} className="flex items-center gap-2 text-xs">
                    <div className="flex items-center gap-0.5 w-12">
                      <span className="text-gray-700 font-bold">{rating}</span>
                      <Star className="w-3 h-3 text-amber-500" fill="#F59E0B" />
                    </div>
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-500 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-gray-600 w-8 text-left">{count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {currentSummary.pending_ratings > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600" />
            <p className="text-sm text-blue-800">
              {currentSummary.pending_ratings} {currentSummary.pending_ratings === 1 ? 'تقييم' : 'تقييمات'} في انتظار مراجعة الإدارة
            </p>
          </div>
        )}
      </div>

      {currentRatings.length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h4 className="text-md font-bold text-gray-900 mb-4">آخر التقييمات</h4>
          <div className="space-y-3">
            {currentRatings.map((rating) => (
              <div
                key={rating.id}
                className="bg-gray-50 rounded-xl p-4 border border-gray-100"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star
                        key={i}
                        className="w-3.5 h-3.5"
                        style={{
                          color: i <= rating.rating ? '#F59E0B' : '#D1D5DB',
                          fill: i <= rating.rating ? '#F59E0B' : 'none',
                        }}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Calendar className="w-3 h-3" />
                    <span>
                      {new Date(rating.created_at).toLocaleDateString('ar-SA', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                </div>

                {rating.comment && (
                  <div className="flex items-start gap-2 mt-2">
                    <MessageSquare className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-gray-700 leading-relaxed">{rating.comment}</p>
                  </div>
                )}

                <div className="flex items-center gap-1 mt-2 text-xs text-green-600">
                  <CheckCircle className="w-3 h-3" />
                  <span>تقييم موثق</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {confirmedCount === 0 && (
        <div className="bg-white rounded-2xl p-8 text-center border border-gray-100">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Star className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-sm font-bold text-gray-600 mb-2">لا توجد تقييمات بعد</p>
          <p className="text-xs text-gray-500">
            ستظهر هنا التقييمات التي تحصل عليها من صفقاتك
          </p>
        </div>
      )}
    </div>
  );
}
