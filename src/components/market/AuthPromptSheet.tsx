import { X, UserCheck, Sparkles, Shield, TrendingUp } from 'lucide-react';

interface Props {
  onClose: () => void;
  onRegister: () => void;
}

export default function AuthPromptSheet({ onClose, onRegister }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div
        className="mt-auto rounded-t-[32px] overflow-hidden flex flex-col"
        style={{ background: 'white', maxHeight: '85vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-shrink-0 h-1 w-12 rounded-full mx-auto mt-3 mb-1" style={{ background: '#d1d5db' }} />

        <div className="overflow-y-auto flex-1 pb-4">
          <div
            className="relative w-full overflow-hidden"
            style={{
              background: 'linear-gradient(145deg, #EBF5FF 0%, #E3F2FD 40%, #BBDEFB 100%)',
            }}
          >
            <div
              className="absolute top-0 right-0 w-56 h-56 rounded-full opacity-[0.15] pointer-events-none"
              style={{
                background: 'radial-gradient(circle, #2196F3 0%, transparent 70%)',
                transform: 'translate(25%, -35%)',
              }}
            />
            <div
              className="absolute bottom-0 left-0 w-40 h-40 rounded-full opacity-[0.12] pointer-events-none"
              style={{
                background: 'radial-gradient(circle, #1565C0 0%, transparent 70%)',
                transform: 'translate(-25%, 35%)',
              }}
            />

            <button
              onClick={onClose}
              className="absolute top-3 left-3 w-9 h-9 flex items-center justify-center rounded-full z-10 transition-all active:scale-90"
              style={{ background: 'rgba(0,0,0,0.1)', backdropFilter: 'blur(8px)' }}
            >
              <X className="w-4 h-4 text-[#1a4a5e]" />
            </button>

            <div className="relative flex flex-col items-center justify-center py-10 px-6">
              <div
                className="w-20 h-20 rounded-3xl flex items-center justify-center mb-4 relative"
                style={{ background: 'rgba(33,150,243,0.15)' }}
              >
                <UserCheck className="w-10 h-10 text-[#2196F3]" />
                <div
                  className="absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #F59E0B, #FBBF24)' }}
                >
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                </div>
              </div>
              <h2 className="text-[22px] font-black text-[#1a4a5e] text-center leading-tight mb-2">
                أهلاً بك في شبكة الطبليات
              </h2>
              <p className="text-[13px] text-[#5a7a8a] text-center leading-relaxed">
                في انتظار تواصلك مع الموردين
              </p>
            </div>
          </div>

          <div className="px-6 mt-6">
            <div
              className="rounded-2xl p-5 text-right mb-5"
              style={{
                background: 'linear-gradient(135deg, #FFF7ED 0%, #FFFBEB 100%)',
                border: '1.5px solid rgba(251,191,36,0.2)',
              }}
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="flex-1">
                  <h3 className="text-[15px] font-black text-[#92400e] mb-1">
                    لضمان جدية التعامل
                  </h3>
                  <p className="text-[12px] text-[#b45309] leading-relaxed">
                    نحتاج إلى تأكيد طلبك كحجز مؤقت، لذا يُرجى تسجيل حسابك حتى لا يضيع التفاوض معك
                  </p>
                </div>
                <Shield className="w-6 h-6 text-amber-500 flex-shrink-0" />
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <h4 className="text-[13px] font-bold text-[#1a4a5e] text-right">
                ما الذي ستحصل عليه؟
              </h4>
              <div className="space-y-2.5">
                {[
                  { icon: TrendingUp, text: 'تفاوض مباشر مع الموردين والمشترين', color: '#2196F3' },
                  { icon: Shield, text: 'حماية صفقاتك وتتبع حالتها لحظياً', color: '#22c55e' },
                  { icon: Sparkles, text: 'وصول فوري لآلاف الفرص في السوق', color: '#F59E0B' },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-3 rounded-xl"
                    style={{ background: '#f5f9fc', border: '1px solid rgba(0,0,0,0.04)' }}
                  >
                    <div className="flex-1 text-right">
                      <p className="text-[13px] font-semibold text-[#1a4a5e]">{item.text}</p>
                    </div>
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: `${item.color}15` }}
                    >
                      <item.icon className="w-4.5 h-4.5" style={{ color: item.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex-shrink-0 px-6 pb-6 pt-3 space-y-2.5" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
          <button
            onClick={onRegister}
            className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl text-[15px] font-black text-white transition-all active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, #2196F3, #1976D2)',
              boxShadow: '0 6px 20px rgba(33,150,243,0.4)',
            }}
          >
            <UserCheck className="w-5 h-5" />
            سجّل الآن وابدأ التفاوض
          </button>
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl text-[13px] font-bold text-[#7a9aab] transition-all active:scale-[0.98]"
            style={{ background: '#f5f9fc' }}
          >
            ليس الآن
          </button>
        </div>
      </div>
    </div>
  );
}
