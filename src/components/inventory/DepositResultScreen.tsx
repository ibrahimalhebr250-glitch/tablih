import { CheckCircle, Copy, Zap, Plus, Home, CloudCog, Network, Shield } from 'lucide-react';

interface Props {
  batchRef: string | null;
  matchFound: boolean;
  matchableQty: number;
  onNewDeposit: () => void;
  onClose: () => void;
  onGoHome?: () => void;
}

export default function DepositResultScreen({
  batchRef,
  matchFound,
  matchableQty,
  onNewDeposit,
  onClose,
  onGoHome,
}: Props) {
  return (
    <div className="px-4 pt-6 pb-36">
      <div className="flex flex-col items-center mb-6">
        <div
          className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 ${
            matchFound ? 'bg-[#E8F8F0]' : 'bg-[#EBF5FF]'
          }`}
        >
          {matchFound ? (
            <Zap className="w-10 h-10 text-[#27AE60]" />
          ) : (
            <CheckCircle className="w-10 h-10 text-[#2196F3]" />
          )}
        </div>

        {matchFound ? (
          <>
            <h2 className="text-[20px] font-bold text-[#1a4a5e] text-center mb-1">
              يمكن تصريف الدفعة الآن!
            </h2>
            <p className="text-[13px] text-[#7a9aab] text-center leading-relaxed">
              وُجد طلب نشط مطابق لمواصفات دفعتك
            </p>
          </>
        ) : (
          <>
            <h2 className="text-[22px] font-bold text-[#1a4a5e] text-center mb-2 leading-snug">
              تم إنشاء بطاقة مستودع سحابي
            </h2>
            <p className="text-[13px] text-[#7a9aab] text-center leading-relaxed max-w-[280px]">
              بالكمية والمواصفات المسجلة، وهي الآن نشطة ضمن الشبكة الوطنية
            </p>
          </>
        )}
      </div>

      {matchFound && (
        <div className="bg-gradient-to-l from-[#E8F8F0] to-[#EBF5FF] rounded-2xl p-4 mb-4 border border-[#C3EAD4]">
          <div className="flex items-center justify-between">
            <button className="flex items-center gap-1.5 bg-[#27AE60] text-white text-[12px] font-bold px-3.5 py-2 rounded-xl active:scale-95 transition-transform">
              مراجعة الطلب
            </button>
            <div className="text-right">
              <p className="text-[22px] font-bold text-[#27AE60] leading-none">
                {matchableQty.toLocaleString('ar-SA')}
              </p>
              <p className="text-[11px] text-[#7a9aab] mt-0.5">طبلية قابلة للتصريف الآن</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
        <div className="flex justify-between items-center mb-3 pb-3 border-b border-gray-50">
          <button
            onClick={() => batchRef && navigator.clipboard?.writeText(batchRef)}
            className="flex items-center gap-1.5 text-[#2196F3]"
          >
            <Copy className="w-3.5 h-3.5" />
            <span className="text-[11px]">نسخ</span>
          </button>
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-bold text-[#1a4a5e]" dir="ltr">
              {batchRef}
            </span>
            <span className="text-[12px] text-[#7a9aab]">رقم الدفعة</span>
          </div>
        </div>
        <div className="flex justify-between items-center">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 bg-[#27AE60] rounded-full animate-pulse" />
            <span className="text-[12px] text-[#27AE60] font-bold">نشطة في الشبكة</span>
          </span>
          <span className="text-[12px] text-[#7a9aab]">الحالة</span>
        </div>
      </div>

      <div className="bg-gradient-to-br from-[#E8F8F0] via-[#EBF5FF] to-[#F0F9FF] rounded-2xl p-5 mb-4 border border-[#C3EAD4] shadow-sm">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-white/80 flex items-center justify-center flex-shrink-0 shadow-sm">
            <CloudCog className="w-5 h-5 text-[#2196F3]" />
          </div>
          <div className="flex-1 text-right">
            <h3 className="text-[13px] font-bold text-[#1a4a5e] mb-1">المستودع السحابي</h3>
            <p className="text-[11px] text-[#5a8499] leading-relaxed">
              بطاقتك مسجلة في نظام التتبع الذكي وستُطابق تلقائياً مع الطلبات المناسبة
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white/60 backdrop-blur-sm rounded-xl p-3 border border-white/80">
            <div className="flex items-center justify-end gap-2 mb-1">
              <span className="text-[11px] font-bold text-[#1a4a5e]">حماية متقدمة</span>
              <Shield className="w-4 h-4 text-[#27AE60]" />
            </div>
            <p className="text-[10px] text-[#5a8499] text-right">بيانات مشفرة</p>
          </div>

          <div className="bg-white/60 backdrop-blur-sm rounded-xl p-3 border border-white/80">
            <div className="flex items-center justify-end gap-2 mb-1">
              <span className="text-[11px] font-bold text-[#1a4a5e]">شبكة وطنية</span>
              <Network className="w-4 h-4 text-[#2196F3]" />
            </div>
            <p className="text-[10px] text-[#5a8499] text-right">وصول فوري</p>
          </div>
        </div>
      </div>

      <div className="bg-[#FFFBEB] rounded-2xl border border-[#FDE68A] p-4 mb-4">
        <p className="text-[12px] text-[#92400E] leading-relaxed text-right font-medium">
          ستتلقى إشعاراً فورياً عند مطابقة دفعتك مع طلب مشترٍ من الشبكة
        </p>
      </div>

      <div className="sticky bottom-0 left-0 right-0 px-4 pb-6 pt-3 bg-white border-t border-gray-100">
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={onClose}
            className="py-3.5 border-2 border-[#1a4a5e] text-[#1a4a5e] font-bold text-[13px] rounded-2xl active:scale-[0.98] transition-transform flex items-center justify-center gap-1"
          >
            العودة
          </button>
          {onGoHome && (
            <button
              onClick={onGoHome}
              className="py-3.5 bg-[#2196F3] text-white font-bold text-[13px] rounded-2xl active:scale-[0.98] transition-transform flex items-center justify-center gap-1"
            >
              <Home className="w-4 h-4" />
              الرئيسية
            </button>
          )}
          <button
            onClick={onNewDeposit}
            className="py-3.5 bg-[#1a4a5e] text-white font-bold text-[13px] rounded-2xl active:scale-[0.98] transition-transform flex items-center justify-center gap-1"
          >
            <Plus className="w-4 h-4" />
            دفعة جديدة
          </button>
        </div>
      </div>
    </div>
  );
}
