import { useState, useEffect } from 'react';
import { Star, MessageSquare, Calendar, CheckCircle, Clock, Handshake } from 'lucide-react';
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
    <div className="space-y-3">
      <div className="bg-white rounded-2xl p-3 border-2 border-[#e8f0f5] shadow-sm">
        <div className="flex gap-2" dir="rtl">
          <button
            onClick={() => setActiveTab('deal')}
            className={`flex-1 py-3 rounded-xl text-[13px] font-bold transition-all active:scale-95 ${
              activeTab === 'deal'
                ? 'bg-gradient-to-r from-[#2196F3] to-[#1565C0] text-white shadow-lg'
                : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center justify-center gap-1.5">
              <Handshake className="w-4 h-4" />
              <span>صفقات</span>
              <span className={`text-[11px] px-1.5 py-0.5 rounded-full ${
                activeTab === 'deal' ? 'bg-white/20' : 'bg-gray-200'
              }`}>
                {summary.confirmed_ratings}
              </span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('visitor')}
            className={`flex-1 py-3 rounded-xl text-[13px] font-bold transition-all active:scale-95 ${
              activeTab === 'visitor'
                ? 'bg-gradient-to-r from-[#F59E0B] to-[#D97706] text-white shadow-lg'
                : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center justify-center gap-1.5">
              <Star className="w-4 h-4" />
              <span>زوار</span>
              <span className={`text-[11px] px-1.5 py-0.5 rounded-full ${
                activeTab === 'visitor' ? 'bg-white/20' : 'bg-gray-200'
              }`}>
                {visitorSummary.confirmed_ratings}
              </span>
            </div>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-5 border-2 border-[#e8f0f5] shadow-sm" dir="rtl">
        <div className="flex items-center gap-2 mb-4">
          <div className={`w-2 h-2 rounded-full ${activeTab === 'deal' ? 'bg-[#2196F3]' : 'bg-[#F59E0B]'}`} />
          <h3 className="text-[15px] font-black text-[#1a4a5e]">
            {activeTab === 'deal' ? 'تقييمات الصفقات' : 'تقييمات الزوار'}
          </h3>
        </div>

        <div className="flex items-center gap-6 mb-5">
          <div className="text-center">
            <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-2 ${
              activeTab === 'deal' ? 'bg-gradient-to-br from-blue-50 to-blue-100' : 'bg-gradient-to-br from-amber-50 to-orange-100'
            }`}>
              <div className="text-[32px] font-black" style={{ color: activeTab === 'deal' ? '#2196F3' : '#F59E0B' }}>
                {avgRating > 0 ? avgRating.toFixed(1) : '-'}
              </div>
            </div>
            <div className="flex items-center justify-center gap-0.5 mb-1.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star
                  key={i}
                  className="w-4 h-4"
                  style={{
                    color: i <= Math.round(avgRating) ? (activeTab === 'deal' ? '#2196F3' : '#F59E0B') : '#D1D5DB',
                    fill: i <= Math.round(avgRating) ? (activeTab === 'deal' ? '#2196F3' : '#F59E0B') : 'none',
                  }}
                />
              ))}
            </div>
            <p className="text-[11px] font-bold text-[#7a9aab]">
              {confirmedCount} {confirmedCount === 1 ? 'تقييم' : 'تقييمات'}
            </p>
          </div>

          {confirmedCount > 0 && (
            <div className="flex-1 space-y-1.5">
              {[5, 4, 3, 2, 1].map((rating) => {
                const count = currentSummary.rating_breakdown[rating] || 0;
                const percentage = confirmedCount > 0 ? (count / confirmedCount) * 100 : 0;
                const barColor = activeTab === 'deal' ? '#2196F3' : '#F59E0B';
                return (
                  <div key={rating} className="flex items-center gap-2.5 text-[11px]">
                    <div className="flex items-center gap-0.5 w-10">
                      <span className="text-[#1a4a5e] font-bold">{rating}</span>
                      <Star className="w-3 h-3" style={{ color: barColor, fill: barColor }} />
                    </div>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${percentage}%`, background: barColor }}
                      />
                    </div>
                    <span className="text-[#7a9aab] w-6 text-left font-bold">{count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {currentSummary.pending_ratings > 0 && (
          <div className="bg-blue-50 border-2 border-blue-100 rounded-xl px-3 py-2.5 flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <p className="text-[11px] font-bold text-blue-700">
              {currentSummary.pending_ratings} {currentSummary.pending_ratings === 1 ? 'تقييم' : 'تقييمات'} في انتظار مراجعة الإدارة
            </p>
          </div>
        )}
      </div>

      {currentRatings.length > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border-2 border-[#e8f0f5]" dir="rtl">
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare className="w-4 h-4 text-[#7a9aab]" />
            <h4 className="text-[14px] font-black text-[#1a4a5e]">آخر التقييمات</h4>
          </div>
          <div className="space-y-2.5">
            {currentRatings.map((rating) => (
              <div
                key={rating.id}
                className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-3.5 border border-gray-100"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star
                        key={i}
                        className="w-3.5 h-3.5"
                        style={{
                          color: i <= rating.rating ? (activeTab === 'deal' ? '#2196F3' : '#F59E0B') : '#D1D5DB',
                          fill: i <= rating.rating ? (activeTab === 'deal' ? '#2196F3' : '#F59E0B') : 'none',
                        }}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-[#9ab0bf]">
                    <span>
                      {new Date(rating.created_at).toLocaleDateString('ar-SA', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                    <Calendar className="w-3 h-3" />
                  </div>
                </div>

                {rating.comment && (
                  <div className="flex items-start gap-2 mt-2 bg-white rounded-lg p-2 border border-gray-100">
                    <MessageSquare className="w-3 h-3 text-[#7a9aab] mt-0.5 flex-shrink-0" />
                    <p className="text-[12px] text-[#4a6a7e] leading-relaxed">{rating.comment}</p>
                  </div>
                )}

                <div className="flex items-center gap-1 mt-2 text-[10px] font-bold text-green-600">
                  <CheckCircle className="w-3 h-3" />
                  <span>تقييم موثق</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {confirmedCount === 0 && (
        <div className="bg-white rounded-2xl p-10 text-center border-2 border-[#e8f0f5] shadow-sm">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${
            activeTab === 'deal' ? 'bg-blue-50' : 'bg-amber-50'
          }`}>
            <Star className="w-8 h-8" style={{ color: activeTab === 'deal' ? '#2196F3' : '#F59E0B' }} />
          </div>
          <p className="text-[13px] font-black text-[#7a9aab] mb-1">لا توجد تقييمات بعد</p>
          <p className="text-[11px] text-[#b8cdd8]">
            ستظهر هنا التقييمات التي تحصل عليها
          </p>
        </div>
      )}
    </div>
  );
}
