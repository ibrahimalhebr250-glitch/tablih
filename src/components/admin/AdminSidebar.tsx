import { LayoutDashboard, TrendingUp, Handshake, DollarSign, Users, Settings, X } from 'lucide-react';
import type { AdminSection } from '../../types/admin';

interface Props {
  active: AdminSection;
  onChange: (s: AdminSection) => void;
  onClose: () => void;
}

const navItems: { id: AdminSection; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'الرئيسية', icon: LayoutDashboard },
  { id: 'market', label: 'السوق', icon: TrendingUp },
  { id: 'deals', label: 'الصفقات', icon: Handshake },
  { id: 'finance', label: 'المالية', icon: DollarSign },
  { id: 'users', label: 'المستخدمون', icon: Users },
  { id: 'settings', label: 'الإعدادات', icon: Settings },
];

export default function AdminSidebar({ active, onChange, onClose }: Props) {
  return (
    <div
      className="flex flex-col h-full"
      style={{ background: 'linear-gradient(180deg, #0d1f2d 0%, #112332 50%, #0f1e2b 100%)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #e74c3c, #c0392b)' }}
          >
            <svg viewBox="0 0 20 20" className="w-5 h-5" fill="none">
              <rect x="2" y="2" width="6.5" height="6.5" rx="1.5" fill="white" />
              <rect x="11.5" y="2" width="6.5" height="6.5" rx="1.5" fill="white" />
              <rect x="2" y="11.5" width="6.5" height="6.5" rx="1.5" fill="white" />
              <rect x="11.5" y="11.5" width="6.5" height="6.5" rx="1.5" fill="white" />
            </svg>
          </div>
          <div className="hidden lg:block">
            <p className="text-white font-bold text-[14px] leading-tight">لوحة التحكم</p>
            <p className="text-white/35 text-[10px]">إدارة المنصة</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/10 transition-all"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="mx-4 h-px flex-shrink-0" style={{ background: 'rgba(255,255,255,0.06)' }} />

      {/* Nav — horizontal scrollable row on mobile, vertical list on desktop */}
      <nav
        className="
          flex lg:flex-col
          flex-row overflow-x-auto lg:overflow-x-visible lg:overflow-y-auto
          px-3 py-3 lg:py-4
          gap-1 lg:gap-1 lg:space-y-0
          flex-shrink-0 lg:flex-1
        "
        style={{ scrollbarWidth: 'none' }}
      >
        {navItems.map(({ id, label, icon: Icon }) => {
          const isActive = active === id;
          return (
            <button
              key={id}
              onClick={() => onChange(id)}
              className={`
                flex-shrink-0 lg:flex-shrink
                flex items-center gap-2 lg:gap-3
                px-3 lg:px-4 py-2.5 lg:py-3
                rounded-xl transition-all
                text-right whitespace-nowrap lg:whitespace-normal
                lg:w-full
                ${isActive ? 'bg-white/10 text-white' : 'text-white/50 hover:bg-white/5 hover:text-white/80'}
              `}
            >
              <div
                className={`w-7 h-7 lg:w-8 lg:h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${
                  isActive ? 'bg-[#e74c3c]/20' : 'bg-white/5'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 lg:w-4 lg:h-4 ${isActive ? 'text-[#e74c3c]' : 'text-white/50'}`} />
              </div>
              <span className="font-semibold text-[12px] lg:text-[13px]">{label}</span>
              {isActive && (
                <div className="mr-auto w-1.5 h-1.5 rounded-full bg-[#e74c3c] hidden lg:block" />
              )}
            </button>
          );
        })}
      </nav>

      <div className="px-4 py-4 flex-shrink-0 hidden lg:block">
        <div
          className="rounded-xl px-4 py-3 text-center"
          style={{ background: 'rgba(231,76,60,0.08)', border: '1px solid rgba(231,76,60,0.12)' }}
        >
          <p className="text-[10px] text-white/25">لوحة إدارة المنصة</p>
          <p className="text-[9px] text-white/15 mt-0.5">شبكة الطبليات الوطنية</p>
        </div>
      </div>
    </div>
  );
}
