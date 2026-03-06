import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { Flag, Trash2, Check, X, MessageSquare, AlertCircle, RefreshCw, CreditCard as Edit2, Eye, Search, TrendingUp, BarChart3, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';

interface Comment {
  comment_id: string;
  rating_id: string;
  deal_id: string | null;
  deal_ref: string | null;
  commenter_phone: string;
  commenter_name: string;
  rated_phone: string;
  rated_name: string;
  comment_text: string;
  is_visible: boolean;
  moderation_status: string;
  flagged_reason: string | null;
  moderated_by: string | null;
  moderated_at: string | null;
  created_at: string;
  rating_value: number;
}

interface Analytics {
  total_comments: number;
  approved_comments: number;
  pending_comments: number;
  flagged_comments: number;
  rejected_comments: number;
  visible_comments: number;
  hidden_comments: number;
  comments_today: number;
  comments_this_week: number;
  comments_this_month: number;
  avg_comment_length: number;
  moderation_status_distribution: Record<string, number>;
  most_active_commenters: Array<{
    phone: string;
    display_name: string;
    comment_count: number;
    approved_count: number;
    rejected_count: number;
  }>;
}

export function CommentsModeration() {
  const [view, setView] = useState<'list' | 'analytics'>('list');
  const [comments, setComments] = useState<Comment[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [selectedComment, setSelectedComment] = useState<Comment | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  const [filters, setFilters] = useState({
    status: 'all',
    searchText: '',
    searchPhone: '',
  });

  const [pagination, setPagination] = useState({
    limit: 20,
    offset: 0,
  });

  const [editForm, setEditForm] = useState({
    comment_text: '',
    moderation_status: 'approved',
    is_visible: true,
    flagged_reason: '',
  });

  useEffect(() => {
    fetchComments();
  }, [filters, pagination.offset]);

  useEffect(() => {
    if (view === 'analytics') {
      fetchAnalytics();
    }
  }, [view]);

  const fetchComments = async () => {
    try {
      setLoading(true);
      const phone = sessionStorage.getItem('phone');
      if (!phone) {
        setComments([]);
        return;
      }

      const { data, error } = await supabase.rpc('admin_get_all_comments', {
        p_caller_phone: phone,
        p_filter_status: filters.status,
        p_search_text: filters.searchText || null,
        p_search_phone: filters.searchPhone || null,
        p_limit: pagination.limit,
        p_offset: pagination.offset,
      });

      if (error) {
        console.error('Error loading comments:', error);
        if (error.message?.includes('غير مصرح') || error.code === 'P0001') {
          setComments([]);
          return;
        }
        throw error;
      }
      setComments(data || []);
    } catch (err) {
      console.error('Error loading comments:', err);
      setComments([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const phone = sessionStorage.getItem('phone');
      if (!phone) return;

      const { data, error } = await supabase.rpc('admin_get_comments_analytics', {
        p_caller_phone: phone,
      });
      if (error) throw error;
      if (data?.success) {
        setAnalytics(data.analytics);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  const handleEdit = (comment: Comment) => {
    setSelectedComment(comment);
    setEditForm({
      comment_text: comment.comment_text,
      moderation_status: comment.moderation_status,
      is_visible: comment.is_visible,
      flagged_reason: comment.flagged_reason || '',
    });
    setShowEditDialog(true);
  };

  const handleViewDetails = (comment: Comment) => {
    setSelectedComment(comment);
    setShowDetailsDialog(true);
  };

  const handleUpdateComment = async () => {
    if (!selectedComment) return;

    try {
      setActioningId(selectedComment.comment_id);
      const phone = sessionStorage.getItem('phone');
      if (!phone) {
        alert('يجب تسجيل الدخول');
        return;
      }

      const { data, error } = await supabase.rpc('admin_update_comment', {
        p_caller_phone: phone,
        p_comment_id: selectedComment.comment_id,
        p_comment_text: editForm.comment_text,
        p_moderation_status: editForm.moderation_status,
        p_is_visible: editForm.is_visible,
        p_flagged_reason: editForm.flagged_reason || null,
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'فشل في تحديث التعليق');

      setShowEditDialog(false);
      await fetchComments();
      alert('تم تحديث التعليق بنجاح');
    } catch (err: any) {
      console.error('Error updating comment:', err);
      alert(err.message || 'حدث خطأ أثناء تحديث التعليق');
    } finally {
      setActioningId(null);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا التعليق نهائياً؟ لا يمكن التراجع عن هذه العملية.')) {
      return;
    }

    try {
      setActioningId(commentId);
      const phone = sessionStorage.getItem('phone');
      if (!phone) {
        alert('يجب تسجيل الدخول');
        return;
      }

      const { data, error } = await supabase.rpc('admin_delete_comment', {
        p_caller_phone: phone,
        p_comment_id: commentId,
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'فشل في حذف التعليق');

      await fetchComments();
      alert('تم حذف التعليق بنجاح');
    } catch (err: any) {
      console.error('Error deleting comment:', err);
      alert(err.message || 'حدث خطأ أثناء حذف التعليق');
    } finally {
      setActioningId(null);
    }
  };

  const handleRestore = async (commentId: string) => {
    try {
      setActioningId(commentId);
      const phone = sessionStorage.getItem('phone');
      if (!phone) {
        alert('يجب تسجيل الدخول');
        return;
      }

      const { data, error } = await supabase.rpc('admin_restore_comment', {
        p_caller_phone: phone,
        p_comment_id: commentId,
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'فشل في استعادة التعليق');

      await fetchComments();
      alert('تم استعادة التعليق بنجاح');
    } catch (err: any) {
      console.error('Error restoring comment:', err);
      alert(err.message || 'حدث خطأ أثناء استعادة التعليق');
    } finally {
      setActioningId(null);
    }
  };

  const handleModerate = async (commentId: string, action: 'approve' | 'reject' | 'flag') => {
    let reason: string | null = null;
    if (action === 'reject' || action === 'flag') {
      reason = prompt(`سبب ${action === 'reject' ? 'الرفض' : 'الإبلاغ'} (اختياري):`);
    }

    try {
      setActioningId(commentId);
      const phone = sessionStorage.getItem('phone');
      if (!phone) {
        alert('يجب تسجيل الدخول');
        return;
      }

      const { data, error } = await supabase.rpc('admin_bulk_moderate_comments', {
        p_caller_phone: phone,
        p_comment_ids: [commentId],
        p_action: action,
        p_reason: reason,
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'فشلت العملية');

      await fetchComments();
    } catch (err: any) {
      console.error('Error moderating comment:', err);
      alert(err.message || 'حدث خطأ أثناء معالجة التعليق');
    } finally {
      setActioningId(null);
    }
  };

  const getStatusBadge = (status: string, isVisible: boolean) => {
    if (!isVisible) {
      return { bg: 'bg-gray-100', text: 'text-gray-700', label: 'مخفي' };
    }

    switch (status) {
      case 'approved':
        return { bg: 'bg-green-100', text: 'text-green-700', label: 'موافق عليه' };
      case 'pending':
        return { bg: 'bg-amber-100', text: 'text-amber-700', label: 'معلق' };
      case 'flagged':
        return { bg: 'bg-orange-100', text: 'text-orange-700', label: 'مُبلغ عنه' };
      case 'rejected':
        return { bg: 'bg-red-100', text: 'text-red-700', label: 'مرفوض' };
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-700', label: status };
    }
  };

  if (loading && comments.length === 0) {
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
          <h2 className="text-2xl font-bold text-gray-900">إدارة التعليقات</h2>
          <p className="text-sm text-gray-600 mt-1">
            إدارة شاملة لجميع تعليقات المستخدمين
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
            onClick={fetchComments}
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
                <p className="text-sm text-gray-600">إجمالي التعليقات</p>
                <MessageSquare className="w-5 h-5 text-blue-500" />
              </div>
              <p className="text-3xl font-black text-gray-900">{analytics.total_comments}</p>
              <p className="text-xs text-gray-500 mt-1">
                {analytics.visible_comments} ظاهر / {analytics.hidden_comments} مخفي
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">موافق عليها</p>
                <Check className="w-5 h-5 text-green-500" />
              </div>
              <p className="text-3xl font-black text-gray-900">{analytics.approved_comments}</p>
              <p className="text-xs text-gray-500 mt-1">
                {Math.round((analytics.approved_comments / analytics.total_comments) * 100)}% من الإجمالي
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">تحتاج مراجعة</p>
                <AlertCircle className="w-5 h-5 text-orange-500" />
              </div>
              <p className="text-3xl font-black text-gray-900">
                {analytics.pending_comments + analytics.flagged_comments}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {analytics.flagged_comments} مُبلغ عنها
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">تعليقات اليوم</p>
                <TrendingUp className="w-5 h-5 text-purple-500" />
              </div>
              <p className="text-3xl font-black text-gray-900">{analytics.comments_today}</p>
              <p className="text-xs text-gray-500 mt-1">
                {analytics.comments_this_week} هذا الأسبوع
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <h3 className="text-lg font-bold text-gray-900 mb-4">توزيع حالات التعليقات</h3>
              <div className="space-y-3">
                {Object.entries({
                  approved: { label: 'موافق عليها', color: 'from-green-400 to-green-500' },
                  pending: { label: 'معلقة', color: 'from-amber-400 to-amber-500' },
                  flagged: { label: 'مُبلغ عنها', color: 'from-orange-400 to-orange-500' },
                  rejected: { label: 'مرفوضة', color: 'from-red-400 to-red-500' },
                }).map(([status, config]) => {
                  const count = analytics.moderation_status_distribution?.[status] || 0;
                  const percentage = analytics.total_comments > 0
                    ? (count / analytics.total_comments) * 100
                    : 0;

                  return (
                    <div key={status} className="flex items-center gap-3">
                      <div className="w-24">
                        <span className="text-sm font-bold text-gray-700">{config.label}</span>
                      </div>
                      <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full bg-gradient-to-r ${config.color} rounded-full transition-all`}
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
              <h3 className="text-lg font-bold text-gray-900 mb-4">أكثر المعلقين نشاطاً</h3>
              <div className="space-y-3">
                {analytics.most_active_commenters?.slice(0, 5).map((user, idx) => (
                  <div key={user.phone} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-gray-900">{user.display_name}</p>
                      <p className="text-xs text-gray-500">
                        {user.comment_count} تعليق ({user.approved_count} موافق / {user.rejected_count} مرفوض)
                      </p>
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-700 mb-2 block">الحالة</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm"
                >
                  <option value="all">الكل</option>
                  <option value="approved">موافق عليها</option>
                  <option value="pending">معلقة</option>
                  <option value="flagged">مُبلغ عنها</option>
                  <option value="rejected">مرفوضة</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 mb-2 block">بحث في النص</label>
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={filters.searchText}
                    onChange={(e) => setFilters({ ...filters, searchText: e.target.value })}
                    placeholder="ابحث في التعليقات..."
                    className="w-full pr-10 px-3 py-2 rounded-lg border border-gray-300 text-sm"
                  />
                </div>
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

          {comments.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">لا توجد تعليقات</h3>
              <p className="text-sm text-gray-600">لم يتم العثور على تعليقات بهذه الفلاتر</p>
            </div>
          ) : (
            <>
              <div className="grid gap-4">
                {comments.map((comment) => {
                  const statusBadge = getStatusBadge(comment.moderation_status, comment.is_visible);

                  return (
                    <div
                      key={comment.comment_id}
                      className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
                    >
                      <div className={`px-4 py-3 border-b flex items-center justify-between ${statusBadge.bg}`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${statusBadge.bg}`}>
                            {comment.moderation_status === 'approved' ? (
                              <Check className={`w-5 h-5 ${statusBadge.text}`} />
                            ) : comment.moderation_status === 'flagged' ? (
                              <Flag className={`w-5 h-5 ${statusBadge.text}`} />
                            ) : comment.moderation_status === 'rejected' ? (
                              <X className={`w-5 h-5 ${statusBadge.text}`} />
                            ) : (
                              <AlertCircle className={`w-5 h-5 ${statusBadge.text}`} />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${statusBadge.bg} ${statusBadge.text}`}>
                                {statusBadge.label}
                              </span>
                              <span className="text-xs text-gray-500">
                                تقييم {comment.rating_value} نجوم
                              </span>
                            </div>
                            {comment.deal_ref && (
                              <p className="text-xs text-gray-600 font-mono mt-1">{comment.deal_ref}</p>
                            )}
                          </div>
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(comment.created_at).toLocaleDateString('ar-SA', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </div>
                      </div>

                      <div className="p-4 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-gray-50 rounded-lg p-3">
                            <p className="text-xs text-gray-600 mb-1">المعلق</p>
                            <p className="text-sm font-bold text-gray-900">{comment.commenter_name}</p>
                            <p className="text-xs text-gray-500 font-mono">{comment.commenter_phone}</p>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-3">
                            <p className="text-xs text-gray-600 mb-1">المقيَّم</p>
                            <p className="text-sm font-bold text-gray-900">{comment.rated_name}</p>
                            <p className="text-xs text-gray-500 font-mono">{comment.rated_phone}</p>
                          </div>
                        </div>

                        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                          <p className="text-sm text-gray-800">{comment.comment_text}</p>
                        </div>

                        {comment.flagged_reason && (
                          <div className="bg-orange-50 rounded-lg p-3 border border-orange-200">
                            <div className="flex items-start gap-2">
                              <Flag className="w-4 h-4 text-orange-600 mt-0.5" />
                              <div>
                                <p className="text-xs font-bold text-orange-700 mb-1">سبب الإبلاغ:</p>
                                <p className="text-sm text-orange-900">{comment.flagged_reason}</p>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="flex gap-2 pt-2 border-t border-gray-100">
                          <button
                            onClick={() => handleViewDetails(comment)}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 text-gray-700 font-bold text-xs hover:bg-gray-100 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                            عرض
                          </button>
                          <button
                            onClick={() => handleEdit(comment)}
                            disabled={actioningId === comment.comment_id}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 text-blue-700 font-bold text-xs hover:bg-blue-100 transition-colors disabled:opacity-50"
                          >
                            <Edit2 className="w-4 h-4" />
                            تعديل
                          </button>
                          {comment.moderation_status !== 'approved' && (
                            <button
                              onClick={() => handleModerate(comment.comment_id, 'approve')}
                              disabled={actioningId === comment.comment_id}
                              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-50 text-green-700 font-bold text-xs hover:bg-green-100 transition-colors disabled:opacity-50"
                            >
                              <Check className="w-4 h-4" />
                              موافقة
                            </button>
                          )}
                          {comment.moderation_status !== 'rejected' && (
                            <button
                              onClick={() => handleModerate(comment.comment_id, 'reject')}
                              disabled={actioningId === comment.comment_id}
                              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 text-red-700 font-bold text-xs hover:bg-red-100 transition-colors disabled:opacity-50"
                            >
                              <X className="w-4 h-4" />
                              رفض
                            </button>
                          )}
                          {!comment.is_visible && (
                            <button
                              onClick={() => handleRestore(comment.comment_id)}
                              disabled={actioningId === comment.comment_id}
                              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-50 text-purple-700 font-bold text-xs hover:bg-purple-100 transition-colors disabled:opacity-50"
                            >
                              <RotateCcw className="w-4 h-4" />
                              استعادة
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(comment.comment_id)}
                            disabled={actioningId === comment.comment_id}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 text-red-700 font-bold text-xs hover:bg-red-100 transition-colors disabled:opacity-50 mr-auto"
                          >
                            <Trash2 className="w-4 h-4" />
                            حذف نهائي
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
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
                  عرض {pagination.offset + 1} - {Math.min(pagination.offset + pagination.limit, comments.length)} من {comments.length}
                </span>
                <button
                  onClick={() => setPagination({ ...pagination, offset: pagination.offset + pagination.limit })}
                  disabled={comments.length < pagination.limit}
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

      {showEditDialog && selectedComment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">تعديل التعليق</h3>
              <button
                onClick={() => setShowEditDialog(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div>
              <label className="text-sm font-bold text-gray-700 mb-2 block">نص التعليق</label>
              <textarea
                value={editForm.comment_text}
                onChange={(e) => setEditForm({ ...editForm, comment_text: e.target.value })}
                rows={4}
                maxLength={500}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm resize-none"
                placeholder="نص التعليق..."
              />
              <p className="text-xs text-gray-500 mt-1">
                {editForm.comment_text.length}/500 حرف
              </p>
            </div>

            <div>
              <label className="text-sm font-bold text-gray-700 mb-2 block">حالة المراجعة</label>
              <select
                value={editForm.moderation_status}
                onChange={(e) => setEditForm({ ...editForm, moderation_status: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm"
              >
                <option value="approved">موافق عليه</option>
                <option value="pending">معلق</option>
                <option value="flagged">مُبلغ عنه</option>
                <option value="rejected">مرفوض</option>
              </select>
            </div>

            {(editForm.moderation_status === 'rejected' || editForm.moderation_status === 'flagged') && (
              <div>
                <label className="text-sm font-bold text-gray-700 mb-2 block">
                  سبب {editForm.moderation_status === 'rejected' ? 'الرفض' : 'الإبلاغ'}
                </label>
                <textarea
                  value={editForm.flagged_reason}
                  onChange={(e) => setEditForm({ ...editForm, flagged_reason: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm resize-none"
                  placeholder="اكتب السبب..."
                />
              </div>
            )}

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_visible"
                checked={editForm.is_visible}
                onChange={(e) => setEditForm({ ...editForm, is_visible: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300"
              />
              <label htmlFor="is_visible" className="text-sm font-bold text-gray-700">
                التعليق ظاهر
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
                onClick={handleUpdateComment}
                disabled={actioningId === selectedComment.comment_id}
                className="flex-1 px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {actioningId === selectedComment.comment_id ? 'جاري الحفظ...' : 'حفظ التغييرات'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDetailsDialog && selectedComment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">تفاصيل التعليق</h3>
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
                  <p className="text-xs text-gray-600 mb-1">المعلق</p>
                  <p className="text-lg font-bold text-gray-900">{selectedComment.commenter_name}</p>
                  <p className="text-sm text-gray-500 font-mono">{selectedComment.commenter_phone}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-600 mb-1">المقيَّم</p>
                  <p className="text-lg font-bold text-gray-900">{selectedComment.rated_name}</p>
                  <p className="text-sm text-gray-500 font-mono">{selectedComment.rated_phone}</p>
                </div>
              </div>

              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <p className="text-sm text-gray-700 mb-2 font-bold">نص التعليق</p>
                <p className="text-gray-800">{selectedComment.comment_text}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-600 mb-1">حالة المراجعة</p>
                  <p className="text-sm font-bold text-gray-900">
                    {getStatusBadge(selectedComment.moderation_status, selectedComment.is_visible).label}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-600 mb-1">الرؤية</p>
                  <p className="text-sm font-bold text-gray-900">
                    {selectedComment.is_visible ? 'ظاهر' : 'مخفي'}
                  </p>
                </div>
              </div>

              {selectedComment.flagged_reason && (
                <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                  <p className="text-sm text-orange-700 mb-2 font-bold">سبب الإبلاغ/الرفض</p>
                  <p className="text-orange-900">{selectedComment.flagged_reason}</p>
                </div>
              )}

              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-600 mb-1">تاريخ الإنشاء</p>
                <p className="text-sm font-bold text-gray-900">
                  {new Date(selectedComment.created_at).toLocaleString('ar-SA', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>

              {selectedComment.moderated_by && (
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <p className="text-xs text-blue-700 mb-1">تمت المراجعة من قبل</p>
                  <p className="text-sm font-bold text-blue-900">{selectedComment.moderated_by}</p>
                  {selectedComment.moderated_at && (
                    <p className="text-xs text-blue-600 mt-1">
                      {new Date(selectedComment.moderated_at).toLocaleString('ar-SA')}
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
