import { CheckCircle, Copy, RefreshCw, Handshake, Radar } from 'lucide-react';
import type { MatchResult, OrderFormData } from '../../types/order';

interface Props {
  form: OrderFormData;
  requestId: string | null;
  matchResult: MatchResult;
  onReset: () => void;
  onEdit: () => void;
  onExecute?: () => void;
}

export default function MatchResultScreen({ requestId, matchResult, onReset, onEdit, onExecute }: Props) {
  if (matchResult.found) {
    return (
      <div className="px-4 pt-6 pb-36">
        <div className="flex flex-col items-center mb-6">
          <div className="w-20 h-20 bg-[#E8F8F0] rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-10 h-10 text-[#27AE60]" />
          </div>
          <h2 className="text-[20px] font-bold text-[#1a4a5e] text-center mb-1">
            تم العثور على كمية مطابقة
          </h2>
          <p className="text-[13px] text-[#7a9aab] text-center">
            وجدنا مصدراً متاحاً يطابق مواصفات طلبك
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-4">
          <div className="bg-gradient-to-l from-[#E8F8F0] to-[#EBF5FF] px-4 py-3 border-b border-gray-100">
            <span className="text-[12px] font-bold text-[#1a4a5e]">تفاصيل المطابقة</span>
          </div>
          <div className="p-4 space-y-3">
            <div className="flex justify-between items-center pb-3 border-b border-gray-50">
              <span className="text-[20px] font-bold text-[#27AE60]">
                {matchResult.matchedQuantity?.toLocaleString('ar-SA')}
                <span className="text-[13px] text-[#7a9aab] font-medium mr-1">طبلية</span>
              </span>
              <span className="text-[13px] text-[#7a9aab]">الكمية المتاحة</span>
            </div>

            <div className="flex justify-between items-center pb-3 border-b border-gray-50">
              <span className="text-[18px] font-bold text-[#2196F3]">
                {matchResult.pricePerUnit?.toLocaleString('ar-SA')}
                <span className="text-[12px] font-medium mr-1">ريال / طبلية</span>
              </span>
              <span className="text-[13px] text-[#7a9aab]">السعر</span>
            </div>

            <div className="flex justify-between items-center pb-3 border-b border-gray-50">
              <span className="text-[16px] font-bold text-[#1a4a5e]">
                {matchResult.deliveryDays} أيام
              </span>
              <span className="text-[13px] text-[#7a9aab]">مدة التسليم</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-[16px] font-bold text-[#1a4a5e]">
                {matchResult.totalPrice?.toLocaleString('ar-SA')}
                <span className="text-[12px] font-medium mr-1">ريال</span>
              </span>
              <span className="text-[13px] text-[#7a9aab]">الإجمالي</span>
            </div>
          </div>
        </div>

        {matchResult.conditions && matchResult.conditions.length > 0 && (
          <div className="bg-[#FFFBEB] rounded-2xl border border-[#FDE68A] p-4 mb-4">
            <p className="text-[12px] font-bold text-[#92400E] mb-2">شروط التنفيذ</p>
            {matchResult.conditions.map((c, i) => (
              <div key={i} className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 bg-[#F59E0B] rounded-full mt-1.5 flex-shrink-0" />
                <span className="text-[12px] text-[#92400E]">{c}</span>
              </div>
            ))}
          </div>
        )}

        <div className="sticky bottom-0 left-0 right-0 px-4 pb-6 pt-3 bg-white border-t border-gray-100">
          <div className="flex flex-col gap-2">
            <button
              onClick={onExecute}
              className="w-full py-4 bg-[#27AE60] text-white font-bold text-[15px] rounded-2xl shadow-lg shadow-[#27AE60]/25 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
            >
              <Handshake className="w-5 h-5" />
              متابعة الصفقة في "صفقاتي"
            </button>
            <p className="text-[11px] text-[#7a9aab] text-center">
              الصفقة تم إنشاؤها — يمكنك تأكيدها أو إلغاؤها من قسم "صفقاتي"
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 pb-36">
      <div className="flex flex-col items-center mb-6">
        <div className="relative w-20 h-20 mb-4">
          <div className="absolute inset-0 rounded-full bg-[#E0F2FE] animate-ping opacity-20" />
          <div className="relative w-full h-full bg-[#E0F2FE] rounded-full flex items-center justify-center">
            <Radar className="w-10 h-10 text-[#0369A1]" />
          </div>
        </div>
        <h2 className="text-[20px] font-bold text-[#1a4a5e] text-center mb-1">
          طلبك قيد التتبع التلقائي
        </h2>
        <p className="text-[13px] text-[#7a9aab] text-center leading-relaxed">
          لا يوجد مخزون مطابق حالياً — لكن طلبك يتتبع
          <br />
          المخزون ويُطابق تلقائياً فور توفره
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
        <div className="flex justify-between items-center mb-3 pb-3 border-b border-gray-50">
          <button
            onClick={() => requestId && navigator.clipboard?.writeText(requestId)}
            className="flex items-center gap-1 text-[#2196F3]"
          >
            <Copy className="w-3.5 h-3.5" />
            <span className="text-[11px]">نسخ</span>
          </button>
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-bold text-[#1a4a5e]" dir="ltr">
              {requestId}
            </span>
            <span className="text-[12px] text-[#7a9aab]">رقم الطلب</span>
          </div>
        </div>

        <div className="flex justify-between items-center">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 bg-[#0369A1] rounded-full animate-pulse" />
            <span className="text-[12px] text-[#0369A1] font-bold">يتتبع المخزون</span>
          </span>
          <span className="text-[12px] text-[#7a9aab]">الحالة</span>
        </div>
      </div>

      <div className="bg-[#E0F2FE] rounded-2xl border border-[#BAE6FD] p-4 mb-4 space-y-3">
        <div className="flex items-start gap-2.5">
          <div className="flex-1 text-right">
            <p className="text-[12px] font-bold text-[#0369A1] mb-1">كيف يعمل التتبع؟</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2 justify-end">
                <span className="text-[11px] text-[#0284C7]">طلبك يراقب المخزون على مدار الساعة</span>
                <div className="w-5 h-5 rounded-full bg-[#BAE6FD] flex items-center justify-center flex-shrink-0">
                  <span className="text-[10px] font-black text-[#0369A1]">1</span>
                </div>
              </div>
              <div className="flex items-center gap-2 justify-end">
                <span className="text-[11px] text-[#0284C7]">فور إضافة مورد لمخزون مطابق، يتم الربط فوراً</span>
                <div className="w-5 h-5 rounded-full bg-[#BAE6FD] flex items-center justify-center flex-shrink-0">
                  <span className="text-[10px] font-black text-[#0369A1]">2</span>
                </div>
              </div>
              <div className="flex items-center gap-2 justify-end">
                <span className="text-[11px] text-[#0284C7]">تنتقل الصفقة تلقائياً لتأكيد المورد ثم صفقاتك</span>
                <div className="w-5 h-5 rounded-full bg-[#BAE6FD] flex items-center justify-center flex-shrink-0">
                  <span className="text-[10px] font-black text-[#0369A1]">3</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 px-4 pb-6 pt-3 bg-white border-t border-gray-100 max-w-md mx-auto">
        <div className="flex gap-3">
          <button
            onClick={onEdit}
            className="flex-1 py-3.5 border-2 border-[#1a4a5e] text-[#1a4a5e] font-bold text-[14px] rounded-2xl flex items-center justify-center gap-1.5 active:scale-[0.98] transition-transform"
          >
            <RefreshCw className="w-4 h-4" />
            تعديل الطلب
          </button>
          <button
            onClick={onReset}
            className="flex-1 py-3.5 bg-[#1a4a5e] text-white font-bold text-[14px] rounded-2xl active:scale-[0.98] transition-transform"
          >
            طلب جديد
          </button>
        </div>
      </div>
    </div>
  );
}
