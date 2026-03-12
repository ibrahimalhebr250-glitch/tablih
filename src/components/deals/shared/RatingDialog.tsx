import { useState } from 'react';
import { Star, X, AlertCircle, Award, Shield, TrendingUp } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { validateComment } from '../../../utils/profanityFilter';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  dealId: string;
  raterPhone: string;
  ratedUserPhone: string;
  ratedUserName: string;
  userType: 'supplier' | 'buyer';
  onRatingSubmitted?: () => void;
  dealRef?: string;
}

const RATING_LABELS: Record<number, string> = {
  1: 'سيء جداً',
  2: 'سيء',
  3: 'مقبول',
  4: 'جيد',
  5: 'ممتاز',
};

const HONOR_BADGE_THRESHOLDS = [
  { min: 5, label: 'شريك متميز', color: '#F59E0B', bg: '#FEF3C7', border: '#FDE68A', icon: '★' },
  { min: 4, label: 'موثوق', color: '#10B981', bg: '#D1FAE5', border: '#6EE7B7', icon: '✓' },
  { min: 3, label: 'جيد', color: '#3B82F6', bg: '#DBEAFE', border: '#93C5FD', icon: '◆' },
];

function getBadge(rating: number) {
  return HONOR_BADGE_THRESHOLDS.find(b => rating >= b.min) ?? HONOR_BADGE_THRESHOLDS[2];
}

export default function RatingDialog({
  isOpen,
  onClose,
  dealId,
  raterPhone,
  ratedUserPhone,
  ratedUserName,
  userType,
  onRatingSubmitted,
  dealRef,
}: Props) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submittedRating, setSubmittedRating] = useState<number | null>(null);

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
      const { data, error: rpcError } = await supabase.rpc('create_user_rating', {
        p_rater_phone: raterPhone,
        p_deal_id: dealId,
        p_rated_phone: ratedUserPhone,
        p_rating: rating,
        p_comment: comment.trim() || null,
      });

      if (rpcError) throw rpcError;
      if (!data?.success) throw new Error(data?.error || 'فشل إضافة التقييم');

      setSubmittedRating(rating);
      onRatingSubmitted?.();
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء إضافة التقييم');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setRating(0);
    setComment('');
    setError('');
    setSubmittedRating(null);
    onClose();
  };

  const displayRating = hoveredRating || rating;
  const badge = submittedRating !== null ? getBadge(submittedRating) : null;

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-[300] p-4"
      style={{ backdropFilter: 'blur(6px)' }}
      onClick={submittedRating !== null ? handleClose : onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden"
        style={{ boxShadow: '0 32px 80px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.1)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {submittedRating !== null && badge ? (
          <div className="p-8 text-center space-y-6">
            <div className="relative mx-auto w-28 h-28">
              <div
                className="w-28 h-28 rounded-full flex items-center justify-center mx-auto relative"
                style={{
                  background: `radial-gradient(circle, ${badge.bg}, white)`,
                  border: `3px solid ${badge.border}`,
                  boxShadow: `0 0 40px ${badge.color}40, 0 8px 32px rgba(0,0,0,0.12)`,
                }}
              >
                <Award className="w-12 h-12" style={{ color: badge.color }} />
              </div>
              <div
                className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full flex items-center justify-center border-2 border-white"
                style={{ background: badge.color }}
              >
                <Shield className="w-4 h-4 text-white" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-center gap-1 mb-3">
                {[1, 2, 3, 4, 5].map((v) => (
                  <Star
                    key={v}
                    className="w-7 h-7"
                    style={{
                      color: v <= submittedRating ? '#F59E0B' : '#E5E7EB',
                      fill: v <= submittedRating ? '#F59E0B' : 'none',
                    }}
                  />
                ))}
              </div>
              <p className="text-xl font-black text-gray-900 mb-1">
                تم إضافة التقييم بنجاح!
              </p>
              <p className="text-sm text-gray-500">
                منحت <span className="font-bold text-gray-700">{ratedUserName}</span> تقييم{' '}
                <span className="font-bold" style={{ color: badge.color }}>{RATING_LABELS[submittedRating]}</span>
              </p>
            </div>

            <div
              className="rounded-2xl p-4 border-2"
              style={{ background: badge.bg, borderColor: badge.border }}
            >
              <div className="flex items-center justify-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4" style={{ color: badge.color }} />
                <span className="text-xs font-black uppercase tracking-wider" style={{ color: badge.color }}>
                  وسام شرف
                </span>
              </div>
              <p className="text-lg font-black text-gray-900">
                {badge.label}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                هذا التقييم يُضاف إلى سجل{' '}
                {userType === 'supplier' ? 'المورد' : 'المشتري'} ويرفع مستوى ثقته في التعاملات المستقبلية
              </p>
            </div>

            <div className="bg-gray-50 rounded-2xl p-3 border border-gray-100">
              <p className="text-xs text-gray-500 leading-relaxed">
                التقييم سيظهر في قسم التقييمات بلوحة التحكم بعد مراجعة الإدارة، وسيُحسب في درجة الثقة المعروضة للمستخدمين الآخرين.
              </p>
            </div>

            <button
              onClick={handleClose}
              className="w-full py-3.5 rounded-2xl font-bold text-white text-sm transition-all active:scale-[0.97]"
              style={{ background: `linear-gradient(135deg, ${badge.color}, ${badge.color}cc)` }}
            >
              إغلاق
            </button>
          </div>
        ) : (
          <>
            <div
              className="p-5 border-b border-gray-100"
              style={{ background: 'linear-gradient(135deg, #0f2535, #1a3d56)' }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white">
                    تقييم {userType === 'supplier' ? 'المورد' : 'المشتري'}
                  </h3>
                  <p className="text-xs text-white/60 mt-0.5">
                    {ratedUserName}
                    {dealRef && <span className="mr-2 opacity-40">· {dealRef}</span>}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center hover:bg-white/25 transition-colors"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="text-center mb-6">
                <p className="text-sm text-gray-500 mb-5">
                  كيف كانت تجربتك مع هذا {userType === 'supplier' ? 'المورد' : 'المشتري'}؟
                </p>
                <div className="flex items-center justify-center gap-3 mb-3">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      onClick={() => setRating(value)}
                      onMouseEnter={() => setHoveredRating(value)}
                      onMouseLeave={() => setHoveredRating(0)}
                      className="transition-transform hover:scale-125 active:scale-110"
                      disabled={isSubmitting}
                    >
                      <Star
                        className="w-11 h-11 drop-shadow-sm"
                        style={{
                          color: value <= displayRating ? '#F59E0B' : '#D1D5DB',
                          fill: value <= displayRating ? '#F59E0B' : 'none',
                          filter: value <= displayRating ? 'drop-shadow(0 2px 4px rgba(245,158,11,0.4))' : 'none',
                          transition: 'all 0.15s ease',
                        }}
                      />
                    </button>
                  ))}
                </div>
                {displayRating > 0 && (
                  <p className="text-sm font-bold text-gray-700">
                    {RATING_LABELS[displayRating]}
                  </p>
                )}
              </div>

              <div className="mb-4">
                <label className="block text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide">
                  ملاحظات إضافية (اختياري)
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="شارك تجربتك مع هذا المستخدم..."
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm bg-gray-50"
                  disabled={isSubmitting}
                  dir="rtl"
                />
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-800">{error}</p>
                </div>
              )}

              {rating >= 4 && (
                <div
                  className="mb-4 p-3 rounded-xl border flex items-center gap-2"
                  style={{ background: '#FEF3C7', borderColor: '#FDE68A' }}
                >
                  <Award className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <p className="text-xs text-amber-800 font-medium">
                    تقييمك العالي سيمنح المستخدم وسام شرف في التعاملات المستقبلية
                  </p>
                </div>
              )}
            </div>

            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-3 rounded-xl border border-gray-200 font-bold text-gray-600 hover:bg-gray-50 transition-colors text-sm"
                disabled={isSubmitting}
              >
                إلغاء
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || rating === 0}
                className="flex-1 px-4 py-3 rounded-xl font-bold text-white text-sm transition-all active:scale-[0.97] disabled:cursor-not-allowed"
                style={{
                  background: rating > 0
                    ? 'linear-gradient(135deg, #2563eb, #1d4ed8)'
                    : '#D1D5DB',
                  boxShadow: rating > 0 ? '0 4px 16px rgba(37,99,235,0.3)' : 'none',
                }}
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
