import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { MessageSquare, MapPin, User, Star } from 'lucide-react';

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
  refreshTrigger?: number;
}

export function CommentsSection({ userPhone, maxComments = 10, refreshTrigger = 0 }: Props) {
  const [comments, setComments] = useState<UserComment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadComments();
  }, [userPhone, maxComments, refreshTrigger]);

  const loadComments = async () => {
    setLoading(true);
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
            className={`w-3.5 h-3.5 ${
              star <= rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'
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
      <div className="rounded-2xl p-4 text-center" style={{ background: '#f5f9fc', border: '1px solid rgba(0,0,0,0.04)' }}>
        <div className="text-[13px] text-[#7a9aab]">جاري تحميل التعليقات...</div>
      </div>
    );
  }

  if (comments.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 justify-end mb-3">
        <span className="text-[12px] font-bold text-[#4a7a8a]">التعليقات ({comments.length})</span>
        <MessageSquare className="w-4 h-4 text-[#4a7a8a]" />
      </div>

      <div className="space-y-2.5">
        {comments.map((comment) => (
          <div
            key={comment.comment_id}
            className="rounded-2xl p-3.5 text-right"
            style={{ background: '#f5f9fc', border: '1px solid rgba(0,0,0,0.04)' }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-[#7a9aab]">
                {formatDate(comment.created_at)}
              </span>
              {renderStars(comment.rating_value)}
            </div>

            <div className="flex items-center gap-3 justify-end text-[11px] text-[#7a9aab] mb-2">
              <div className="flex items-center gap-1">
                <span>
                  {comment.commenter_type === 'supplier' ? 'مورد' : 'مشتري'}
                </span>
                <User className="w-3 h-3" />
              </div>
              <div className="flex items-center gap-1">
                <span>{comment.commenter_city || 'غير محدد'}</span>
                <MapPin className="w-3 h-3" />
              </div>
            </div>

            <p className="text-[13px] text-[#1a3a4a] leading-relaxed">{comment.comment_text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}