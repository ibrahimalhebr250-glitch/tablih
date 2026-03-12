import { useState } from 'react';
import { CheckCircle, Copy, Plus, Home, CloudCog, Sparkles, Bell, ArrowRight, Package, TrendingUp, Check } from 'lucide-react';

interface Props {
  batchRef: string | null;
  matchFound: boolean;
  matchableQty: number;
  onNewDeposit: () => void;
  onClose: () => void;
  onGoHome?: () => void;
  publishedToMarket?: boolean;
}

export default function DepositResultScreen({
  batchRef,
  matchFound,
  matchableQty,
  onNewDeposit,
  onClose,
  onGoHome,
  publishedToMarket = true,
}: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (batchRef) {
      navigator.clipboard?.writeText(batchRef);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(180deg, #f0f7fc 0%, #e8f2f8 40%, #f4f9fc 100%)' }}>
      <div className="flex-1 overflow-y-auto px-4 pt-10 pb-6">

        <div className="flex flex-col items-center mb-8">
          <div className="relative mb-5">
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center"
              style={{
                background: publishedToMarket
                  ? 'linear-gradient(135deg, #d1fae5, #a7f3d0)'
                  : 'linear-gradient(135deg, #dbeafe, #bfdbfe)',
                boxShadow: publishedToMarket
                  ? '0 0 40px rgba(16,185,129,0.25), 0 8px 32px rgba(0,0,0,0.08)'
                  : '0 0 40px rgba(37,99,235,0.2), 0 8px 32px rgba(0,0,0,0.08)',
              }}
            >
              {publishedToMarket ? (
                <CheckCircle className="w-11 h-11 text-emerald-600" />
              ) : (
                <CloudCog className="w-11 h-11 text-blue-600" />
              )}
            </div>
            <div
              className="absolute -top-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center border-2 border-white"
              style={{ background: publishedToMarket ? '#10b981' : '#3b82f6' }}
            >
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
          </div>

          {publishedToMarket ? (
            <div className="text-center">
              <h2 className="text-[24px] font-black text-[#1a2f3e] mb-2 leading-tight">
                عرضك الآن في السوق!
              </h2>
              <p className="text-[13px] text-[#5a8090] leading-relaxed max-w-[280px]">
                تم نشر الدفعة بنجاح — المشترون يمكنهم الآن مشاهدة عرضك وإنشاء صفقات معك
              </p>
            </div>
          ) : (
            <div className="text-center">
              <h2 className="text-[24px] font-black text-[#1a2f3e] mb-2 leading-tight">
                تم الحفظ في المستودع
              </h2>
              <p className="text-[13px] text-[#5a8090] leading-relaxed max-w-[280px]">
                دفعتك محفوظة في مستودعك السحابي — يمكنك نشرها في السوق متى تشاء
              </p>
            </div>
          )}
        </div>

        {matchFound && matchableQty > 0 && (
          <div
            className="rounded-2xl p-4 mb-4 overflow-hidden relative"
            style={{
              background: 'linear-gradient(135deg, #d1fae5, #a7f3d0)',
              border: '1.5px solid #6ee7b7',
            }}
          >
            <div className="flex items-center justify-between" dir="rtl">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-white/70 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-emerald-700" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wide">تطابق فوري</p>
                  <p className="text-[12px] text-emerald-600">طلبات موجودة تناسب دفعتك</p>
                </div>
              </div>
              <div className="text-left">
                <p className="text-[28px] font-black text-emerald-800 leading-none">
                  {matchableQty.toLocaleString('ar-SA')}
                </p>
                <p className="text-[11px] text-emerald-600">طبلية قابلة للصفقة</p>
              </div>
            </div>
          </div>
        )}

        <div
          className="rounded-2xl p-4 mb-4"
          style={{ background: 'white', border: '1.5px solid #e2edf5', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}
        >
          <div className="flex items-center justify-between mb-3 pb-3" style={{ borderBottom: '1px solid #f0f6fa' }}>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-colors"
              style={{ background: copied ? '#d1fae5' : '#f0f6fa', color: copied ? '#059669' : '#4a7a94' }}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="text-[11px] font-bold">{copied ? 'تم النسخ' : 'نسخ'}</span>
            </button>
            <div className="flex items-center gap-2" dir="rtl">
              <span className="text-[12px] text-[#7a9aab]">رقم الدفعة</span>
              <span className="text-[15px] font-black text-[#1a2f3e] font-mono" dir="ltr">
                {batchRef}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between" dir="rtl">
            <span className="text-[12px] text-[#7a9aab]">الحالة</span>
            <div className="flex items-center gap-2">
              {publishedToMarket ? (
                <>
                  <span className="text-[12px] font-bold text-emerald-600">منشور في السوق</span>
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                </>
              ) : (
                <>
                  <span className="text-[12px] font-bold text-blue-600">محفوظ في المستودع</span>
                  <span className="w-2 h-2 bg-blue-500 rounded-full" />
                </>
              )}
            </div>
          </div>
        </div>

        {publishedToMarket ? (
          <div className="space-y-3 mb-4">
            <div
              className="rounded-2xl p-4"
              style={{ background: 'linear-gradient(135deg, #0f2535, #1a3d56)', boxShadow: '0 4px 20px rgba(15,37,53,0.2)' }}
            >
              <div className="flex items-start gap-3" dir="rtl">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                  <Bell className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-[13px] font-black text-white mb-1">إشعارات فورية</p>
                  <p className="text-[11px] text-white/60 leading-relaxed">
                    ستتلقى إشعاراً مباشراً فور اهتمام أي مشترٍ بعرضك وطلبه إنشاء صفقة
                  </p>
                </div>
              </div>
            </div>

            <div
              className="rounded-2xl p-4"
              style={{ background: 'white', border: '1.5px solid #e2edf5' }}
            >
              <div className="space-y-2.5">
                {[
                  { icon: Package, text: 'الدفعة ظاهرة في صفحة السوق للمشترين' },
                  { icon: TrendingUp, text: 'النظام يطابق تلقائياً مع الطلبات المناسبة' },
                  { icon: CheckCircle, text: 'يمكنك إدارة الدفعة من مستودعك السحابي' },
                ].map(({ icon: Icon, text }, i) => (
                  <div key={i} className="flex items-center gap-2.5" dir="rtl">
                    <div className="w-6 h-6 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-3.5 h-3.5 text-emerald-600" />
                    </div>
                    <span className="text-[12px] text-[#4a6a7e]">{text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div
            className="rounded-2xl p-4 mb-4"
            style={{ background: '#eff6ff', border: '1.5px solid #bfdbfe' }}
          >
            <div className="flex items-start gap-3" dir="rtl">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                <CloudCog className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-[13px] font-black text-blue-900 mb-1">دفعتك محفوظة بأمان</p>
                <p className="text-[11px] text-blue-700 leading-relaxed">
                  لنشرها في السوق توجه إلى: <span className="font-black">حسابي ← مستودعي السحابي</span>
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div
        className="flex-shrink-0 px-4 pb-8 pt-4"
        style={{ background: 'white', borderTop: '1px solid #e8f0f5', boxShadow: '0 -4px 20px rgba(0,0,0,0.04)' }}
      >
        <div className="grid grid-cols-3 gap-2.5">
          <button
            onClick={onGoHome || onClose}
            className="py-3.5 rounded-2xl font-bold text-[12px] flex items-center justify-center gap-1.5 active:scale-[0.97] transition-transform"
            style={{ background: '#f0f6fa', color: '#1a4a5e', border: '1.5px solid #e2edf5' }}
          >
            <ArrowRight className="w-3.5 h-3.5" />
            حسابي
          </button>
          <button
            onClick={onClose}
            className="py-3.5 rounded-2xl font-bold text-[12px] text-white flex items-center justify-center gap-1.5 active:scale-[0.97] transition-transform"
            style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', boxShadow: '0 4px 14px rgba(37,99,235,0.3)' }}
          >
            <Home className="w-3.5 h-3.5" />
            الرئيسية
          </button>
          <button
            onClick={onNewDeposit}
            className="py-3.5 rounded-2xl font-bold text-[12px] text-white flex items-center justify-center gap-1.5 active:scale-[0.97] transition-transform"
            style={{ background: 'linear-gradient(135deg, #0f2535, #1a3d56)', boxShadow: '0 4px 14px rgba(15,37,53,0.25)' }}
          >
            <Plus className="w-3.5 h-3.5" />
            دفعة جديدة
          </button>
        </div>
      </div>
    </div>
  );
}
