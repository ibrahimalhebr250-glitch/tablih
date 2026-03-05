import { Plus, ClipboardList, LogIn, User, ShieldCheck, ChevronRight } from 'lucide-react';
import type { AppSession } from '../../types/session';

interface Props {
  session: AppSession | null;
  onOpenAccount: () => void;
  onCreateOrder: () => void;
  onAddInventory: () => void;
  onOpenAdmin: () => void;
}

export default function DesktopSidebar({ session, onOpenAccount, onCreateOrder, onAddInventory, onOpenAdmin }: Props) {
  const initials = session?.profile.company_name
    ? session.profile.company_name.slice(0, 2)
    : session?.profile.display_name?.slice(0, 2) ?? '';

  const displayName = session?.profile.company_name || session?.profile.display_name || session?.profile.phone || '';

  return (
    <div
      className="flex flex-col h-full overflow-y-auto"
      style={{
        background: 'linear-gradient(160deg, #0b1d2a 0%, #0f2535 60%, #0b1d2a 100%)',
        borderRight: '1px solid rgba(255,255,255,0.05)',
      }}
    >
      {/* Brand */}
      <div className="px-6 pt-7 pb-6 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{
              background: 'linear-gradient(135deg, #22c55e, #16a34a)',
              boxShadow: '0 4px 20px rgba(34,197,94,0.28)',
            }}
          >
            <svg viewBox="0 0 20 20" className="w-6 h-6" fill="none">
              <rect x="2" y="2" width="6.5" height="6.5" rx="1.5" fill="white" />
              <rect x="11.5" y="2" width="6.5" height="6.5" rx="1.5" fill="white" />
              <rect x="2" y="11.5" width="6.5" height="6.5" rx="1.5" fill="white" />
              <rect x="11.5" y="11.5" width="6.5" height="6.5" rx="1.5" fill="white" />
              <line x1="8.5" y1="5.25" x2="11.5" y2="5.25" stroke="white" strokeWidth="1.5" />
              <line x1="5.25" y1="8.5" x2="5.25" y2="11.5" stroke="white" strokeWidth="1.5" />
              <line x1="14.75" y1="8.5" x2="14.75" y2="11.5" stroke="white" strokeWidth="1.5" />
            </svg>
          </div>
          <div>
            <p className="text-white font-bold text-[16px] leading-tight">شبكة الطبليات</p>
            <div className="flex items-center gap-1.5 mt-1">
              <div className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse" />
              <p className="text-white/35 text-[11px]">الشبكة الوطنية</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-5 h-px flex-shrink-0" style={{ background: 'rgba(255,255,255,0.06)' }} />

      {/* User Profile */}
      <div className="px-4 py-5 flex-shrink-0">
        {session ? (
          <button
            onClick={onOpenAccount}
            className="w-full flex items-center gap-3 p-3.5 rounded-2xl transition-all hover:brightness-110 group"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}
            >
              {initials ? (
                <span className="text-[14px] font-bold text-white">{initials}</span>
              ) : (
                <User className="w-5 h-5 text-white" />
              )}
            </div>
            <div className="text-right flex-1 min-w-0">
              <p className="text-white font-semibold text-[13px] truncate">{displayName}</p>
              <div className="flex items-center gap-1.5 justify-end mt-1">
                {session.roles.includes('supplier') && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(34,197,94,0.15)', color: '#4ade80' }}>مورّد</span>
                )}
                {session.roles.includes('buyer') && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(59,130,246,0.15)', color: '#93c5fd' }}>مشتري</span>
                )}
                {session.roles.length === 0 && (
                  <span className="text-[11px] text-white/30">إدارة الحساب</span>
                )}
              </div>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-white/20 group-hover:text-white/50 transition-colors flex-shrink-0" />
          </button>
        ) : (
          <button
            onClick={onOpenAccount}
            className="w-full flex items-center justify-between p-4 rounded-2xl transition-all hover:brightness-110"
            style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}
          >
            <LogIn className="w-4 h-4 text-[#4ade80]" />
            <div className="text-right">
              <p className="text-white font-semibold text-[13px]">تسجيل الدخول</p>
              <p className="text-white/40 text-[11px] mt-0.5">للوصول الكامل</p>
            </div>
          </button>
        )}
      </div>

      <div className="mx-5 h-px flex-shrink-0" style={{ background: 'rgba(255,255,255,0.05)' }} />

      {/* Navigation */}
      <div className="px-4 py-5 flex-1 space-y-2">
        <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest text-right mb-3 px-1">القائمة الرئيسية</p>

        <button
          onClick={onAddInventory}
          className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all active:scale-[0.97]"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(59,130,246,0.08)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
        >
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(59,130,246,0.12)' }}>
            <Plus className="w-[18px] h-[18px] text-[#60a5fa]" />
          </div>
          <div className="text-right flex-1">
            <p className="text-white/85 font-bold text-[14px]">إضافة مخزون</p>
            <p className="text-white/30 text-[11px] mt-0.5">تسجيل طبليات للبيع</p>
          </div>
        </button>

        <button
          onClick={onCreateOrder}
          className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all active:scale-[0.97]"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(245,158,11,0.08)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
        >
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(245,158,11,0.12)' }}>
            <ClipboardList className="w-[18px] h-[18px] text-amber-400" />
          </div>
          <div className="text-right flex-1">
            <p className="text-white/85 font-bold text-[14px]">إنشاء طلب</p>
            <p className="text-white/30 text-[11px] mt-0.5">طلب شراء طبليات</p>
          </div>
        </button>
      </div>

      <div className="mx-5 h-px flex-shrink-0" style={{ background: 'rgba(255,255,255,0.05)' }} />

      {/* Admin */}
      <div className="px-4 py-5 flex-shrink-0">
        <button
          onClick={onOpenAdmin}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all active:scale-[0.97]"
          style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.12)' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.1)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.06)')}
        >
          <div className="w-8 h-8 rounded-xl bg-red-500/10 flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-right flex-1">
            <p className="text-red-400 font-bold text-[13px]">لوحة التحكم</p>
            <p className="text-white/25 text-[10px] mt-0.5">إدارة المنصة</p>
          </div>
        </button>
        <p className="text-[10px] text-white/12 text-center mt-4">شبكة الطبليات الوطنية</p>
      </div>
    </div>
  );
}
