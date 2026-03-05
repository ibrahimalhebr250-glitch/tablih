import type { ImpactPreview } from '../../types/inventory';

interface Props {
  impact: ImpactPreview;
  isComplete: boolean;
  onDeposit: () => void;
}

export default function LiveImpactPanel({ impact, isComplete, onDeposit }: Props) {
  return (
    <div className="sticky bottom-0 left-0 right-0 z-40 flex-shrink-0">
      <div
        className="mx-0 rounded-t-3xl overflow-hidden"
        style={{
          background: 'rgba(255,255,255,0.97)',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 -8px 32px rgba(26,74,94,0.12)',
        }}
      >
        <div className="px-4 pt-3.5 pb-1">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-1.5">
              {impact.hasMatch ? (
                <span className="w-2 h-2 bg-[#27AE60] rounded-full animate-pulse" />
              ) : (
                <span className="w-2 h-2 bg-[#a0b5c0] rounded-full" />
              )}
              <span className="text-[11px] text-[#7a9aab] font-medium">معاينة الإيداع</span>
            </div>
            <span className="text-[11px] font-bold text-[#1a4a5e]">تأثير فوري</span>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-2.5">
            <div className="bg-[#F5F9FC] rounded-xl p-2.5 text-center">
              <p className="text-[16px] font-bold text-[#1a4a5e] leading-none">
                {impact.totalAfterDeposit.toLocaleString('ar-SA')}
              </p>
              <p className="text-[9px] text-[#7a9aab] mt-0.5">رصيدك بعد الإيداع</p>
            </div>
            <div className="bg-[#F5F9FC] rounded-xl p-2.5 text-center">
              <p className="text-[16px] font-bold text-[#2196F3] leading-none">
                {impact.matchingDemandCount}
              </p>
              <p className="text-[9px] text-[#7a9aab] mt-0.5">طلبات مطابقة</p>
            </div>
            <div className="bg-[#F5F9FC] rounded-xl p-2.5 text-center">
              <p
                className={`text-[16px] font-bold leading-none ${
                  impact.coveragePercent > 0 ? 'text-[#27AE60]' : 'text-[#a0b5c0]'
                }`}
              >
                {impact.coveragePercent}%
              </p>
              <p className="text-[9px] text-[#7a9aab] mt-0.5">نسبة التغطية</p>
            </div>
          </div>

          {impact.hasMatch ? (
            <div className="bg-[#E8F8F0] rounded-xl px-3 py-2 mb-2.5 flex items-center justify-between">
              <span className="text-[12px] font-bold text-[#27AE60]">
                {impact.matchableQty.toLocaleString('ar-SA')} طبلية قابلة للتصريف
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-[#27AE60] rounded-full" />
                <span className="text-[11px] text-[#27AE60] font-medium">
                  تغطية {impact.coveragePercent}% من الطلب
                </span>
              </span>
            </div>
          ) : (
            <div className="bg-[#F5F9FC] rounded-xl px-3 py-2 mb-2.5">
              <p className="text-[11px] text-[#a0b5c0] text-center">
                {impact.matchingDemandCount === 0
                  ? 'اكتمل تحديد المواصفات لرؤية الطلبات المطابقة'
                  : 'لا توجد طلبات مطابقة بهذه المواصفات حاليًا'}
              </p>
            </div>
          )}
        </div>

        <div className="px-4 pb-5">
          <button
            onClick={onDeposit}
            disabled={!isComplete}
            className={`w-full py-4 rounded-2xl text-[15px] font-bold transition-all duration-300 flex items-center justify-center gap-2 ${
              isComplete
                ? 'bg-[#1a4a5e] text-white shadow-xl shadow-[#1a4a5e]/25 active:scale-[0.98]'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            إيداع في المستودع
          </button>
        </div>
      </div>
    </div>
  );
}
