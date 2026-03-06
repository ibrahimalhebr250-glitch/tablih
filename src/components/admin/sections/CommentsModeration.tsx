import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { Flag, Trash2, Check, X, MessageSquare, AlertCircle } from 'lucide-react';

interface FlaggedComment {
  comment_id: string;
  rating_id: string;
  commenter_phone: string;
  commenter_name: string;
  rated_phone: string;
  rated_name: string;
  comment_text: string;
  moderation_status: string;
  flagged_reason: string | null;
  created_at: string;
}

export function CommentsModeration() {
  const [comments, setComments] = useState<FlaggedComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState<string | null>(null);

  useEffect(() => {
    loadFlaggedComments();
  }, []);

  const loadFlaggedComments = async () => {
    try {
      const { data, error } = await supabase.rpc('get_flagged_comments');

      if (error) throw error;
      setComments(data || []);
    } catch (err) {
      console.error('Error loading flagged comments:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleModerate = async (commentId: string, action: 'approve' | 'reject' | 'flag' | 'delete', reason?: string) => {
    setActioningId(commentId);
    try {
      const { data, error } = await supabase.rpc('moderate_comment', {
        p_comment_id: commentId,
        p_action: action,
        p_reason: reason
      });

      if (error) throw error;

      if (data?.success) {
        await loadFlaggedComments();
      } else {
        alert(data?.error || 'فشلت العملية');
      }
    } catch (err: any) {
      console.error('Error moderating comment:', err);
      alert(err.message || 'حدث خطأ أثناء معالجة التعليق');
    } finally {
      setActioningId(null);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا التعليق نهائياً؟ لا يمكن التراجع عن هذه العملية.')) {
      return;
    }

    await handleModerate(commentId, 'delete');
  };

  const handleReject = async (commentId: string) => {
    const reason = prompt('سبب الرفض (اختياري):');
    await handleModerate(commentId, 'reject', reason || undefined);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">جاري التحميل...</div>
      </div>
    );
  }

  if (comments.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="text-center">
          <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">لا توجد تعليقات تحتاج للمراجعة</h3>
          <p className="text-gray-600">جميع التعليقات تمت مراجعتها أو موافق عليها</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <AlertCircle className="w-6 h-6 text-orange-600" />
          <div>
            <h2 className="text-xl font-bold text-gray-900">إدارة التعليقات</h2>
            <p className="text-sm text-gray-600">مراجعة التعليقات المبلغ عنها أو المعلقة</p>
          </div>
        </div>

        <div className="space-y-4">
          {comments.map((comment) => (
            <div
              key={comment.comment_id}
              className="border border-gray-200 rounded-lg p-4 bg-gray-50"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-semibold text-gray-900">
                      {comment.commenter_name}
                    </span>
                    <span className="text-xs text-gray-500">
                      {comment.commenter_phone}
                    </span>
                    <span className="text-gray-400">←</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {comment.rated_name}
                    </span>
                  </div>

                  <div className="bg-white rounded-lg p-3 border border-gray-200 mb-2">
                    <p className="text-gray-900">{comment.comment_text}</p>
                  </div>

                  {comment.flagged_reason && (
                    <div className="flex items-start gap-2 bg-orange-50 border border-orange-200 rounded p-2 mb-2">
                      <Flag className="w-4 h-4 text-orange-600 mt-0.5" />
                      <p className="text-sm text-orange-900">
                        <span className="font-semibold">سبب الإبلاغ:</span> {comment.flagged_reason}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>
                      {new Date(comment.created_at).toLocaleDateString('ar-SA')}
                    </span>
                    <span className={`px-2 py-1 rounded-full ${
                      comment.moderation_status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : comment.moderation_status === 'flagged'
                        ? 'bg-orange-100 text-orange-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {comment.moderation_status === 'pending' && 'قيد المراجعة'}
                      {comment.moderation_status === 'flagged' && 'مبلغ عنه'}
                      {comment.moderation_status === 'approved' && 'موافق عليه'}
                      {comment.moderation_status === 'rejected' && 'مرفوض'}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleModerate(comment.comment_id, 'approve')}
                    disabled={actioningId === comment.comment_id}
                    className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                    title="موافقة"
                  >
                    <Check className="w-5 h-5" />
                  </button>

                  <button
                    onClick={() => handleReject(comment.comment_id)}
                    disabled={actioningId === comment.comment_id}
                    className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors disabled:opacity-50"
                    title="رفض"
                  >
                    <X className="w-5 h-5" />
                  </button>

                  <button
                    onClick={() => handleDelete(comment.comment_id)}
                    disabled={actioningId === comment.comment_id}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    title="حذف نهائياً"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-semibold mb-1">إرشادات المراجعة:</p>
            <ul className="space-y-1 list-disc list-inside">
              <li>الموافقة: يظهر التعليق للجميع</li>
              <li>الرفض: يتم إخفاء التعليق مع إمكانية ذكر السبب</li>
              <li>الحذف: إزالة نهائية بدون إمكانية الاسترجاع</li>
              <li>يجب رفض أو حذف أي تعليق يحتوي على إساءة أو معلومات خاطئة</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}