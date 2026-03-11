import { CheckCircle, Store, User, Plus, Home, Copy } from 'lucide-react';

interface Props {
  requestId: string | null;
  form: {
    palletType: string | null;
    size: string | null;
    quality: string | null;
    quantity: number;
    city: string;
  };
  onClose: () => void;
  onGoToAccount?: () => void;
  onNewOrder?: () => void;
}

export default function OrderResultScreen({ requestId, form, onClose, onGoToAccount, onNewOrder }: Props) {
  const handleCopy = () => {
    if (requestId) navigator.clipboard?.writeText(requestId).catch(() => {});
  };

  return (
    <div className="px-4 pt-6 pb-36 flex flex-col" dir="rtl">
      <div className="flex flex-col items-center mb-6">
        <div className="w-20 h-20 rounded-full bg-[#E8F8F0] flex items-center justify-center mb-4">
          <CheckCircle className="w-10 h-10 text-[#27AE60]" />
        </div>
        <h2 className="text-[22px] font-bold text-[#1a4a5e] text-center mb-2 leading-snug">
          تم نشر طلبك في السوق
        </h2>
        <p className="text-[13px] text-[#7a9aab] text-center leading-relaxed max-w-[300px]">
          طلبك الآن ظاهر للموردين — سيصلك عرض توريد عند اهتمام أي مورد
        </p>
      </div>

      {requestId && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
          <div className="flex justify-between items-center mb-3 pb-3 border-b border-gray-50">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 text-[#2196F3]"
            >
              <Copy className="w-3.5 h-3.5" />
              <span className="text-[11px]">نسخ</span>
            </button>
            <div className="flex items-center gap-2">
              <span className="text-[14px] font-bold text-[#1a3a4a]" dir="ltr">
                {requestId}
              </span>
              <span className="text-[12px] text-[#7a9aab]">رقم الطلب</span>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-[#27AE60] rounded-full animate-pulse" />
              <span className="text-[12px] text-[#27AE60] font-bold">منشور في السوق</span>
            </span>
            <span className="text-[12px] text-[#7a9aab]">الحالة</span>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4 space-y-2.5">
        <p className="text-[12px] font-bold text-[#1a3a4a] text-right mb-1">تفاصيل الطلب</p>
        {form.palletType && (
          <div className="flex justify-between items-center">
            <span className="text-[13px] font-bold text-[#1a2f3e]">{form.palletType}</span>
            <span className="text-[11px] text-[#7a9aab]">نوع الطبلية</span>
          </div>
        )}
        {form.size && (
          <div className="flex justify-between items-center">
            <span className="text-[12px] font-semibold text-[#1a2f3e]" dir="ltr">{form.size}</span>
            <span className="text-[11px] text-[#7a9aab]">المقاس</span>
          </div>
        )}
        {form.quality && (
          <div className="flex justify-between items-center">
            <span className="text-[12px] font-semibold text-[#1a2f3e]">درجة {form.quality}</span>
            <span className="text-[11px] text-[#7a9aab]">الجودة</span>
          </div>
        )}
        {form.city && (
          <div className="flex justify-between items-center">
            <span className="text-[12px] font-semibold text-[#1a2f3e]">{form.city}</span>
            <span className="text-[11px] text-[#7a9aab]">المدينة</span>
          </div>
        )}
        <div className="border-t border-gray-50 pt-2">
          <div className="flex justify-between items-center bg-blue-50 rounded-xl px-3 py-2">
            <span className="text-[16px] font-black text-blue-800">{form.quantity.toLocaleString()} طبلية</span>
            <span className="text-[11px] text-blue-600">الكمية المطلوبة</span>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-[#EFF6FF] to-[#F0F9FF] rounded-2xl p-4 mb-4 border border-[#BFDBFE] space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center flex-shrink-0 shadow-sm">
            <Store className="w-4 h-4 text-[#1565C0]" />
          </div>
          <div>
            <p className="text-[12px] font-bold text-[#1a3a4a] mb-0.5">بطاقة الطلب في السوق</p>
            <p className="text-[11px] text-[#5a7a99] leading-relaxed">
              طلبك يظهر الآن في تبويب "الطلبات" في سوق الطبليات للموردين
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center flex-shrink-0 shadow-sm">
            <User className="w-4 h-4 text-[#27AE60]" />
          </div>
          <div>
            <p className="text-[12px] font-bold text-[#1a3a4a] mb-0.5">متابعة العروض الواردة</p>
            <p className="text-[11px] text-[#5a7a99] leading-relaxed">
              اذهب إلى حسابي ← طلبات التفاوض لمتابعة عروض الموردين وقبول أو رفض كل عرض
            </p>
          </div>
        </div>
      </div>

      <div className="bg-[#FFFBEB] rounded-2xl border border-[#FDE68A] p-4 mb-4">
        <p className="text-[12px] text-[#92400E] leading-relaxed font-medium">
          يمكن للموردين تقديم عروض جزئية — مثلاً: طلبت 2000 طبلية ويمكن أن تصلك عروض لـ 500 أو 800 طبلية
        </p>
      </div>

      <div className="sticky bottom-0 left-0 right-0 px-4 pb-6 pt-3 bg-white border-t border-gray-100 -mx-4">
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={onGoToAccount}
            className="py-3.5 border-2 border-[#1a4a5e] text-[#1a4a5e] font-bold text-[12px] rounded-2xl active:scale-[0.98] transition-transform"
          >
            حسابي
          </button>
          <button
            onClick={onClose}
            className="py-3.5 bg-[#2196F3] text-white font-bold text-[12px] rounded-2xl active:scale-[0.98] transition-transform flex items-center justify-center gap-1"
          >
            <Home className="w-3.5 h-3.5" />
            الرئيسية
          </button>
          <button
            onClick={onNewOrder}
            className="py-3.5 bg-[#1a4a5e] text-white font-bold text-[12px] rounded-2xl active:scale-[0.98] transition-transform flex items-center justify-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            طلب جديد
          </button>
        </div>
      </div>
    </div>
  );
}
