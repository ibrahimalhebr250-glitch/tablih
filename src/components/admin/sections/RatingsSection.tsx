import { useState, useEffect } from 'react';
import { Star, Check, X, Calendar, MessageSquare, Clock, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface PendingRating {
  id: string;
  deal_id: string | null;
  deal_ref: string;
  rater_phone: string;
  rated_phone: string;
  rating: number;
  comment: string | null;
  rating_type: string;
  item_type: string;
  created_at: string;
}

export default function RatingsSection() {
  const [pendingRatings, setPendingRatings] = useState<PendingRating[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchPendingRatings();
  }, []);

  const fetchPendingRatings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_pending_ratings_for_admin');

      if (error) throw error;
      setPendingRatings(data || []);
    } catch (error) {
      console.error('Error fetching pending ratings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (ratingId: string, isConfirmed: boolean) => {
    try {
      setProcessingId(ratingId);

      const { data, error } = await supabase.rpc('admin_confirm_rating', {
        p_rating_id: ratingId,
        p_is_confirmed: isConfirmed,
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'فشل في معالجة التقييم');

      await fetchPendingRatings();
    } catch (error: any) {
      console.error('Error reviewing rating:', error);
      alert(error.message || 'حدث خطأ أثناء معالجة التقييم');
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-8">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-gray-100 rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">إدارة التقييمات</h2>
          <p className="text-sm text-gray-600 mt-1">
            مراجعة وتأكيد التقييمات من المستخدمين
          </p>
        </div>
        <button
          onClick={fetchPendingRatings}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-50 text-blue-700 font-bold text-sm hover:bg-blue-100 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          تحديث
        </button>
      </div>

      {pendingRatings.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">لا توجد تقييمات معلقة</h3>
          <p className="text-sm text-gray-600">
            جميع التقييمات تمت مراجعتها
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {pendingRatings.map((rating) => (
            <div
              key={rating.id}
              className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="bg-amber-50 px-4 py-3 border-b border-amber-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                    <Clock className="w-5 h-5 text-amber-700" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-gray-900">
                        {rating.rating_type === 'deal' ? 'تقييم صفقة' : 'تقييم زائر'}
                      </p>
                      {rating.rating_type === 'visitor' && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold">
                          {rating.item_type === 'supply' ? 'عرض' : 'طلب'}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 font-mono">
                      {rating.deal_ref || `${rating.item_type}-${rating.id.slice(0, 8)}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Calendar className="w-3.5 h-3.5" />
                  {new Date(rating.created_at).toLocaleDateString('ar-SA', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>

              <div className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-600 mb-1">المقيِّم</p>
                    <p className="text-sm font-bold text-gray-900 font-mono">{rating.rater_phone}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-600 mb-1">المقيَّم</p>
                    <p className="text-sm font-bold text-gray-900 font-mono">{rating.rated_phone}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-200">
                  <Star className="w-5 h-5 text-amber-600" fill="#D97706" />
                  <span className="text-lg font-black text-gray-900">التقييم:</span>
                  <div className="flex items-center gap-1 flex-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star
                        key={i}
                        className="w-5 h-5"
                        style={{
                          color: i <= rating.rating ? '#F59E0B' : '#D1D5DB',
                          fill: i <= rating.rating ? '#F59E0B' : 'none',
                        }}
                      />
                    ))}
                    <span className="text-lg font-bold text-gray-700 mr-2">
                      ({rating.rating}/5)
                    </span>
                  </div>
                </div>

                {rating.comment && (
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <div className="flex items-start gap-2 mb-2">
                      <MessageSquare className="w-4 h-4 text-gray-500 mt-0.5" />
                      <p className="text-xs font-bold text-gray-700">الملاحظة:</p>
                    </div>
                    <p className="text-sm text-gray-800 leading-relaxed pr-6">
                      {rating.comment}
                    </p>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => handleReview(rating.id, false)}
                    disabled={processingId === rating.id}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-50 text-red-700 font-bold text-sm hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-red-200"
                  >
                    <XCircle className="w-4 h-4" />
                    {processingId === rating.id ? 'جاري المعالجة...' : 'رفض التقييم'}
                  </button>
                  <button
                    onClick={() => handleReview(rating.id, true)}
                    disabled={processingId === rating.id}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-green-50 text-green-700 font-bold text-sm hover:bg-green-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-green-200"
                  >
                    <CheckCircle className="w-4 h-4" />
                    {processingId === rating.id ? 'جاري المعالجة...' : 'تأكيد التقييم'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
