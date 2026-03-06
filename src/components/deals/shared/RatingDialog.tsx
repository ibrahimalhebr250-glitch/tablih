import { useState } from 'react';
import { Star, X, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { validateComment } from '../../../utils/profanityFilter';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  dealId: string;
  ratedUserPhone: string;
  ratedUserName: string;
  userType: 'supplier' | 'buyer';
  onRatingSubmitted?: () => void;
}

export default function RatingDialog({
  isOpen,
  onClose,
  dealId,
  ratedUserPhone,
  ratedUserName,
  userType,
  onRatingSubmitted,
}: Props) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (rating === 0) {
      setError('الرجاء اختيار تقييم');
      return;
    }

    if (comment.trim()) {
      const validation = validateComment(comment.trim());
      if (!validation.isValid) {
        setError(validation.reason || 'التعليق غير صالح');
        return;
      }
    }

    setIsSubmitting(true);
    setError('');

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) {
        throw new Error('يجب تسجيل الدخول أولاً');
      }

      const { data, error: rpcError } = await supabase.rpc('create_user_rating', {
        p_deal_id: dealId,
        p_rated_phone: ratedUserPhone,
        p_rating: rating,
        p_comment: comment.trim() || null,
      });

      if (rpcError) throw rpcError;
      if (!data?.success) throw new Error(data?.error || 'فشل إضافة التقييم');

      setSuccess(true);
      setTimeout(() => {
        onRatingSubmitted?.();
        onClose();
        setSuccess(false);
        setRating(0);
        setComment('');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء إضافة التقييم');
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayRating = hoveredRating || rating;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-bold text-gray-900">تقييم {userType === 'supplier' ? 'المورد' : 'المشتري'}</h3>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
          <p className="text-sm text-gray-600">{ratedUserName}</p>
        </div>

        {success ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <p className="text-lg font-bold text-gray-900 mb-2">تم إضافة التقييم بنجاح</p>
            <p className="text-sm text-gray-600">سيظهر التقييم بعد مراجعة الإدارة</p>
          </div>
        ) : (
          <>
            <div className="p-6">
              <div className="text-center mb-6">
                <p className="text-sm text-gray-600 mb-4">كيف كانت تجربتك مع هذا {userType === 'supplier' ? 'المورد' : 'المشتري'}؟</p>
                <div className="flex items-center justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      onClick={() => setRating(value)}
                      onMouseEnter={() => setHoveredRating(value)}
                      onMouseLeave={() => setHoveredRating(0)}
                      className="transition-transform hover:scale-110"
                      disabled={isSubmitting}
                    >
                      <Star
                        className="w-10 h-10"
                        style={{
                          color: value <= displayRating ? '#F59E0B' : '#D1D5DB',
                          fill: value <= displayRating ? '#F59E0B' : 'none',
                        }}
                      />
                    </button>
                  ))}
                </div>
                {rating > 0 && (
                  <p className="text-sm font-bold text-gray-700 mt-3">
                    {rating === 1 && 'سيء جداً'}
                    {rating === 2 && 'سيء'}
                    {rating === 3 && 'مقبول'}
                    {rating === 4 && 'جيد'}
                    {rating === 5 && 'ممتاز'}
                  </p>
                )}
              </div>

              <div className="mb-4">
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  ملاحظات إضافية (اختياري)
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="شارك تجربتك مع هذا المستخدم..."
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm"
                  disabled={isSubmitting}
                  dir="rtl"
                />
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-100 flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-3 rounded-xl border border-gray-300 font-bold text-gray-700 hover:bg-gray-50 transition-colors"
                disabled={isSubmitting}
              >
                إلغاء
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || rating === 0}
                className="flex-1 px-4 py-3 rounded-xl bg-blue-600 font-bold text-white hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'جاري الإرسال...' : 'إرسال التقييم'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
