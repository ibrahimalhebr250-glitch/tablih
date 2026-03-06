import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { MessageSquare, MapPin, User, Star, Flag } from 'lucide-react';

interface UserComment {
  comment_id: string;
  rating_id: string;
  commenter_city: string;
  commenter_type: string;
  rating_value: number;
  comment_text: string;
  created_at: string;
}

interface Props {
  userPhone: string;
  maxComments?: number;
}

export function CommentsSection({ userPhone, maxComments = 10 }: Props) {
  const [comments, setComments] = useState<UserComment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadComments();
  }, [userPhone]);

  const loadComments = async () => {
    try {
      const { data, error } = await supabase.rpc('get_user_comments', {
        p_user_phone: userPhone,
        p_limit: maxComments
      });

      if (error) throw error;
      setComments(data || []);
    } catch (err) {
      console.error('Error loading comments:', err);
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) return 'اليوم';
    if (diffInDays === 1) return 'أمس';
    if (diffInDays < 7) return `منذ ${diffInDays} أيام`;
    if (diffInDays < 30) return `منذ ${Math.floor(diffInDays / 7)} أسابيع`;
    if (diffInDays < 365) return `منذ ${Math.floor(diffInDays / 30)} أشهر`;
    return date.toLocaleDateString('ar-SA');
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="w-5 h-5 text-gray-600" />
          <h3 className="font-bold text-gray-900">التعليقات</h3>
        </div>
        <div className="text-center text-gray-500 py-4">جاري التحميل...</div>
      </div>
    );
  }

  if (comments.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="w-5 h-5 text-gray-600" />
          <h3 className="font-bold text-gray-900">التعليقات</h3>
        </div>
        <div className="text-center py-8">
          <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600">لا توجد تعليقات بعد</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-gray-600" />
          <h3 className="font-bold text-gray-900">التعليقات</h3>
          <span className="text-sm text-gray-500">({comments.length})</span>
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
                  {renderStars(comment.rating_value)}
                  <span className="text-xs text-gray-500">
                    {formatDate(comment.created_at)}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-sm text-gray-600 mb-2">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{comment.commenter_city || 'غير محدد'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5" />
                    <span>
                      {comment.commenter_type === 'supplier' ? 'مورد' : 'مشتري'}
                    </span>
                  </div>
                </div>

                <p className="text-gray-900 leading-relaxed">{comment.comment_text}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}