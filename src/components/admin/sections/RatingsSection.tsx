import { useState, useEffect } from 'react';
import { Star, Check, X, Calendar, MessageSquare, Clock, CheckCircle, XCircle, RefreshCw, CreditCard as Edit2, Trash2, Eye, Filter, Search, TrendingUp, BarChart3, ChevronLeft, ChevronRight, Users } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface Rating {
  rating_id: string;
  deal_id: string | null;
  deal_ref: string | null;
  rater_phone: string;
  rater_name: string;
  rated_phone: string;
  rated_name: string;
  rating_value: number;
  comment_text: string | null;
  rating_type: string;
  item_type: string;
  is_confirmed: boolean;
  admin_reviewed_by: string | null;
  admin_reviewed_at: string | null;
  created_at: string;
  has_comment: boolean;
}

interface Analytics {
  total_ratings: number;
  confirmed_ratings: number;
  pending_ratings: number;
  deal_ratings: number;
  visitor_ratings: number;
  average_rating: number;
  ratings_with_comments: number;
  ratings_today: number;
  ratings_this_week: number;
  ratings_this_month: number;
  rating_distribution: Record<string, number>;
  top_rated_users: Array<{
    phone: string;
    display_name: string;
    trust_rating: number;
    rating_count: number;
    avg_rating: number;
  }>;
}

export default function RatingsSection() {
  const [view, setView] = useState<'list' | 'analytics'>('list');
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedRating, setSelectedRating] = useState<Rating | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  const [filters, setFilters] = useState({
    type: 'all',
    status: 'all',
    ratingType: 'all',
    searchPhone: '',
  });

  const [pagination, setPagination] = useState({
    limit: 20,
    offset: 0,
    total: 0,
  });

  const [editForm, setEditForm] = useState({
    rating_value: 5,
    comment_text: '',
    is_confirmed: true,
  });

  useEffect(() => {
    fetchRatings();
  }, [filters, pagination.offset]);

  useEffect(() => {
    if (view === 'analytics') {
      fetchAnalytics();
    }
  }, [view]);

  const fetchRatings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('admin_get_all_ratings', {
        p_filter_type: filters.type,
        p_filter_status: filters.status,
        p_rating_type: filters.ratingType,
        p_search_phone: filters.searchPhone || null,
        p_limit: pagination.limit,
        p_offset: pagination.offset,
      });

      if (error) {
        if (error.message?.includes('غير مصرح') || error.code === 'P0001') {
          setRatings([]);
          return;
        }
        throw error;
      }
      setRatings(data || []);
    } catch (error) {
      console.error('Error fetching ratings:', error);
      setRatings([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const { data, error } = await supabase.rpc('admin_get_ratings_analytics');
      if (error) throw error;
      if (data?.success) {
        setAnalytics(data.analytics);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  const handleEdit = (rating: Rating) => {
    setSelectedRating(rating);
    setEditForm({
      rating_value: rating.rating_value,
      comment_text: rating.comment_text || '',
      is_confirmed: rating.is_confirmed,
    });
    setShowEditDialog(true);
  };

  const handleViewDetails = async (rating: Rating) => {
    setSelectedRating(rating);
    setShowDetailsDialog(true);
  };

  const handleUpdateRating = async () => {
    if (!selectedRating) return;

    try {
      setProcessingId(selectedRating.rating_id);
      const { data, error } = await supabase.rpc('admin_update_rating', {
        p_rating_id: selectedRating.rating_id,
        p_rating_value: editForm.rating_value,
        p_comment: editForm.comment_text || null,
        p_is_confirmed: editForm.is_confirmed,
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'فشل في تحديث التقييم');

      setShowEditDialog(false);
      await fetchRatings();
      alert('تم تحديث التقييم بنجاح');
    } catch (error: any) {
      console.error('Error updating rating:', error);
      alert(error.message || 'حدث خطأ أثناء تحديث التقييم');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = async (ratingId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا التقييم؟ لا يمكن التراجع عن هذا الإجراء.')) {
      return;
    }

    try {
      setProcessingId(ratingId);
      const { data, error } = await supabase.rpc('admin_delete_rating', {
        p_rating_id: ratingId,
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'فشل في حذف التقييم');

      await fetchRatings();
      alert('تم حذف التقييم بنجاح');
    } catch (error: any) {
      console.error('Error deleting rating:', error);
      alert(error.message || 'حدث خطأ أثناء حذف التقييم');
    } finally {
      setProcessingId(null);
    }
  };

  const handleConfirm = async (ratingId: string, isConfirmed: boolean) => {
    try {
      setProcessingId(ratingId);
      const { data, error } = await supabase.rpc('admin_update_rating', {
        p_rating_id: ratingId,
        p_is_confirmed: isConfirmed,
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'فشل في معالجة التقييم');

      await fetchRatings();
    } catch (error: any) {
      console.error('Error confirming rating:', error);
      alert(error.message || 'حدث خطأ أثناء معالجة التقييم');
    } finally {
      setProcessingId(null);
    }
  };

  if (loading && ratings.length === 0) {
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">إدارة التقييمات</h2>
          <p className="text-sm text-gray-600 mt-1">
            إدارة شاملة لجميع تقييمات المستخدمين
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-gray-100 rounded-xl p-1">
            <button
              onClick={() => setView('list')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                view === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
              }`}
            >
              <BarChart3 className="w-4 h-4 inline-block ml-2" />
              القائمة
            </button>
            <button
              onClick={() => setView('analytics')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                view === 'analytics' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
              }`}
            >
              <TrendingUp className="w-4 h-4 inline-block ml-2" />
              الإحصائيات
            </button>
          </div>
          <button
            onClick={fetchRatings}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-50 text-blue-700 font-bold text-sm hover:bg-blue-100 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            تحديث
          </button>
        </div>
      </div>

      {view === 'analytics' && analytics ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">إجمالي التقييمات</p>
                <Star className="w-5 h-5 text-amber-500" />
              </div>
              <p className="text-3xl font-black text-gray-900">{analytics.total_ratings}</p>
              <p className="text-xs text-gray-500 mt-1">
                {analytics.confirmed_ratings} مؤكد / {analytics.pending_ratings} معلق
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">متوسط التقييمات</p>
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
              <p className="text-3xl font-black text-gray-900">{analytics.average_rating}</p>
              <p className="text-xs text-gray-500 mt-1">من 5 نجوم</p>
            </div>

            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">تقييمات اليوم</p>
                <Calendar className="w-5 h-5 text-blue-500" />
              </div>
              <p className="text-3xl font-black text-gray-900">{analytics.ratings_today}</p>
              <p className="text-xs text-gray-500 mt-1">
                {analytics.ratings_this_week} هذا الأسبوع
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">مع تعليقات</p>
                <MessageSquare className="w-5 h-5 text-purple-500" />
              </div>
              <p className="text-3xl font-black text-gray-900">{analytics.ratings_with_comments}</p>
              <p className="text-xs text-gray-500 mt-1">
                {Math.round((analytics.ratings_with_comments / analytics.total_ratings) * 100)}% من الإجمالي
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <h3 className="text-lg font-bold text-gray-900 mb-4">توزيع التقييمات</h3>
              <div className="space-y-3">
                {[5, 4, 3, 2, 1].map((stars) => {
                  const count = analytics.rating_distribution?.[stars] || 0;
                  const percentage = analytics.total_ratings > 0
                    ? (count / analytics.total_ratings) * 100
                    : 0;

                  return (
                    <div key={stars} className="flex items-center gap-3">
                      <div className="flex items-center gap-1 w-24">
                        <span className="text-sm font-bold text-gray-700">{stars}</span>
                        <Star className="w-4 h-4 text-amber-500" fill="#F59E0B" />
                      </div>
                      <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-sm font-bold text-gray-700 w-16 text-left">
                        {count} ({Math.round(percentage)}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <h3 className="text-lg font-bold text-gray-900 mb-4">أعلى المستخدمين تقييماً</h3>
              <div className="space-y-3">
                {analytics.top_rated_users?.slice(0, 5).map((user, idx) => (
                  <div key={user.phone} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-gray-900">{user.display_name}</p>
                      <p className="text-xs text-gray-500">{user.rating_count} تقييم</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-amber-500" fill="#F59E0B" />
                      <span className="text-sm font-bold text-gray-900">{user.avg_rating}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-700 mb-2 block">نوع العنصر</label>
                <select
                  value={filters.type}
                  onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm"
                >
                  <option value="all">الكل</option>
                  <option value="supply">عرض</option>
                  <option value="demand">طلب</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 mb-2 block">الحالة</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm"
                >
                  <option value="all">الكل</option>
                  <option value="confirmed">مؤكد</option>
                  <option value="pending">معلق</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 mb-2 block">نوع التقييم</label>
                <select
                  value={filters.ratingType}
                  onChange={(e) => setFilters({ ...filters, ratingType: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm"
                >
                  <option value="all">الكل</option>
                  <option value="deal">صفقة</option>
                  <option value="visitor">زائر</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 mb-2 block">بحث برقم الجوال</label>
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={filters.searchPhone}
                    onChange={(e) => setFilters({ ...filters, searchPhone: e.target.value })}
                    placeholder="05xxxxxxxx"
                    className="w-full pr-10 px-3 py-2 rounded-lg border border-gray-300 text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {ratings.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Star className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">لا توجد تقييمات</h3>
              <p className="text-sm text-gray-600">لم يتم العثور على تقييمات بهذه الفلاتر</p>
            </div>
          ) : (
            <>
              <div className="grid gap-4">
                {ratings.map((rating) => (
                  <div
                    key={rating.rating_id}
                    className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
                  >
                    <div className={`px-4 py-3 border-b flex items-center justify-between ${
                      rating.is_confirmed
                        ? 'bg-green-50 border-green-100'
                        : 'bg-amber-50 border-amber-100'
                    }`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          rating.is_confirmed ? 'bg-green-100' : 'bg-amber-100'
                        }`}>
                          {rating.is_confirmed ? (
                            <CheckCircle className="w-5 h-5 text-green-700" />
                          ) : (
                            <Clock className="w-5 h-5 text-amber-700" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-bold text-gray-900">
                              {rating.rating_type === 'deal' ? 'تقييم صفقة' : 'تقييم زائر'}
                            </p>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold">
                              {rating.item_type === 'supply' ? 'عرض' : 'طلب'}
                            </span>
                            {rating.has_comment && (
                              <MessageSquare className="w-4 h-4 text-purple-500" />
                            )}
                          </div>
                          {rating.deal_ref && (
                            <p className="text-xs text-gray-600 font-mono">{rating.deal_ref}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-xs text-gray-500">
                          {new Date(rating.created_at).toLocaleDateString('ar-SA', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="p-4 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="text-xs text-gray-600 mb-1">المقيِّم</p>
                          <p className="text-sm font-bold text-gray-900">{rating.rater_name}</p>
                          <p className="text-xs text-gray-500 font-mono">{rating.rater_phone}</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="text-xs text-gray-600 mb-1">المقيَّم</p>
                          <p className="text-sm font-bold text-gray-900">{rating.rated_name}</p>
                          <p className="text-xs text-gray-500 font-mono">{rating.rated_phone}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg p-3 border border-amber-200">
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((i) => (
                            <Star
                              key={i}
                              className="w-5 h-5"
                              style={{
                                color: i <= rating.rating_value ? '#F59E0B' : '#D1D5DB',
                                fill: i <= rating.rating_value ? '#F59E0B' : 'none',
                              }}
                            />
                          ))}
                        </div>
                        <span className="text-sm font-bold text-gray-700">
                          ({rating.rating_value}/5)
                        </span>
                      </div>

                      {rating.comment_text && (
                        <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                          <p className="text-sm text-gray-800">{rating.comment_text}</p>
                        </div>
                      )}

                      <div className="flex gap-2 pt-2 border-t border-gray-100">
                        <button
                          onClick={() => handleViewDetails(rating)}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 text-gray-700 font-bold text-xs hover:bg-gray-100 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                          عرض
                        </button>
                        <button
                          onClick={() => handleEdit(rating)}
                          disabled={processingId === rating.rating_id}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 text-blue-700 font-bold text-xs hover:bg-blue-100 transition-colors disabled:opacity-50"
                        >
                          <Edit2 className="w-4 h-4" />
                          تعديل
                        </button>
                        {!rating.is_confirmed && (
                          <button
                            onClick={() => handleConfirm(rating.rating_id, true)}
                            disabled={processingId === rating.rating_id}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-50 text-green-700 font-bold text-xs hover:bg-green-100 transition-colors disabled:opacity-50"
                          >
                            <Check className="w-4 h-4" />
                            تأكيد
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(rating.rating_id)}
                          disabled={processingId === rating.rating_id}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 text-red-700 font-bold text-xs hover:bg-red-100 transition-colors disabled:opacity-50 mr-auto"
                        >
                          <Trash2 className="w-4 h-4" />
                          حذف
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between bg-white rounded-xl p-4 border border-gray-200">
                <button
                  onClick={() => setPagination({ ...pagination, offset: Math.max(0, pagination.offset - pagination.limit) })}
                  disabled={pagination.offset === 0}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 text-gray-700 font-bold text-sm hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                  السابق
                </button>
                <span className="text-sm text-gray-600">
                  عرض {pagination.offset + 1} - {Math.min(pagination.offset + pagination.limit, ratings.length)} من {ratings.length}
                </span>
                <button
                  onClick={() => setPagination({ ...pagination, offset: pagination.offset + pagination.limit })}
                  disabled={ratings.length < pagination.limit}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 text-gray-700 font-bold text-sm hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  التالي
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
        </>
      )}

      {showEditDialog && selectedRating && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">تعديل التقييم</h3>
              <button
                onClick={() => setShowEditDialog(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div>
              <label className="text-sm font-bold text-gray-700 mb-2 block">التقييم</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((val) => (
                  <button
                    key={val}
                    onClick={() => setEditForm({ ...editForm, rating_value: val })}
                    className="p-2"
                  >
                    <Star
                      className="w-8 h-8"
                      style={{
                        color: val <= editForm.rating_value ? '#F59E0B' : '#D1D5DB',
                        fill: val <= editForm.rating_value ? '#F59E0B' : 'none',
                      }}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-bold text-gray-700 mb-2 block">التعليق</label>
              <textarea
                value={editForm.comment_text}
                onChange={(e) => setEditForm({ ...editForm, comment_text: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm resize-none"
                placeholder="اكتب التعليق هنا..."
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_confirmed"
                checked={editForm.is_confirmed}
                onChange={(e) => setEditForm({ ...editForm, is_confirmed: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300"
              />
              <label htmlFor="is_confirmed" className="text-sm font-bold text-gray-700">
                تقييم مؤكد
              </label>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={() => setShowEditDialog(false)}
                className="flex-1 px-4 py-2 rounded-xl bg-gray-100 text-gray-700 font-bold text-sm hover:bg-gray-200 transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={handleUpdateRating}
                disabled={processingId === selectedRating.rating_id}
                className="flex-1 px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {processingId === selectedRating.rating_id ? 'جاري الحفظ...' : 'حفظ التغييرات'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDetailsDialog && selectedRating && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">تفاصيل التقييم</h3>
              <button
                onClick={() => setShowDetailsDialog(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-600 mb-1">المقيِّم</p>
                  <p className="text-lg font-bold text-gray-900">{selectedRating.rater_name}</p>
                  <p className="text-sm text-gray-500 font-mono">{selectedRating.rater_phone}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-600 mb-1">المقيَّم</p>
                  <p className="text-lg font-bold text-gray-900">{selectedRating.rated_name}</p>
                  <p className="text-sm text-gray-500 font-mono">{selectedRating.rated_phone}</p>
                </div>
              </div>

              <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg p-4 border border-amber-200">
                <p className="text-sm text-gray-700 mb-2">التقييم</p>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star
                      key={i}
                      className="w-6 h-6"
                      style={{
                        color: i <= selectedRating.rating_value ? '#F59E0B' : '#D1D5DB',
                        fill: i <= selectedRating.rating_value ? '#F59E0B' : 'none',
                      }}
                    />
                  ))}
                  <span className="text-lg font-bold text-gray-900 mr-2">
                    ({selectedRating.rating_value}/5)
                  </span>
                </div>
              </div>

              {selectedRating.comment_text && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-700 mb-2 font-bold">التعليق</p>
                  <p className="text-gray-800">{selectedRating.comment_text}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-600 mb-1">نوع التقييم</p>
                  <p className="text-sm font-bold text-gray-900">
                    {selectedRating.rating_type === 'deal' ? 'تقييم صفقة' : 'تقييم زائر'}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-600 mb-1">نوع العنصر</p>
                  <p className="text-sm font-bold text-gray-900">
                    {selectedRating.item_type === 'supply' ? 'عرض' : 'طلب'}
                  </p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-600 mb-1">الحالة</p>
                <div className="flex items-center gap-2">
                  {selectedRating.is_confirmed ? (
                    <>
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="text-sm font-bold text-green-700">مؤكد</span>
                    </>
                  ) : (
                    <>
                      <Clock className="w-5 h-5 text-amber-600" />
                      <span className="text-sm font-bold text-amber-700">معلق</span>
                    </>
                  )}
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-600 mb-1">تاريخ الإنشاء</p>
                <p className="text-sm font-bold text-gray-900">
                  {new Date(selectedRating.created_at).toLocaleString('ar-SA', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>

              {selectedRating.admin_reviewed_by && (
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <p className="text-xs text-blue-700 mb-1">تمت المراجعة من قبل</p>
                  <p className="text-sm font-bold text-blue-900">{selectedRating.admin_reviewed_by}</p>
                  {selectedRating.admin_reviewed_at && (
                    <p className="text-xs text-blue-600 mt-1">
                      {new Date(selectedRating.admin_reviewed_at).toLocaleString('ar-SA')}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="pt-4">
              <button
                onClick={() => setShowDetailsDialog(false)}
                className="w-full px-4 py-3 rounded-xl bg-gray-100 text-gray-700 font-bold hover:bg-gray-200 transition-colors"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
