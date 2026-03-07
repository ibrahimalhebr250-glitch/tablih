import { useEffect, useRef, useState } from 'react';
import {
  User, ShoppingBag, Handshake, Warehouse, LogOut, Settings,
  ChevronDown, Star, Sparkles, LayoutDashboard, Package,
  TrendingUp, Award, Crown
} from 'lucide-react';
import type { AppSession } from '../../types/session';
import { getTrustConfig } from '../shared/TrustRatingBadge';

interface Props {
  session: AppSession | null;
  onOpenAccount: () => void;
  onOpenSupplierDeals?: () => void;
  onOpenBuyerDeals?: () => void;
  onOpenSupplierInventory?: () => void;
  onOpenPurchasedInventory?: () => void;
  onOpenDashboard?: () => void;
  onLogout: () => void;
}

export default function AccountDropdown({
  session,
  onOpenAccount,
  onOpenSupplierDeals,
  onOpenBuyerDeals,
  onOpenSupplierInventory,
  onOpenPurchasedInventory,
  onOpenDashboard,
  onLogout
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [trustRating, setTrustRating] = useState(3);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  if (!session) {
    return (
      <button
        onClick={onOpenAccount}
        className="relative w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 active:scale-95 transition-all border-2"
        style={{
          background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)',
          borderColor: '#e2e8f0',
        }}
        aria-label="حسابي"
      >
        <User className="w-5 h-5 text-[#94a3b8]" />
      </button>
    );
  }

  const initials = session.profile.company_name
    ? session.profile.company_name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('')
    : session.profile.display_name
    ? session.profile.display_name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('')
    : 'م';

  const isCompany = session.profile.user_type === 'company';
  const isSupplier = session.roles.includes('supplier');
  const isBuyer = session.roles.includes('buyer');
  const displayName = (isCompany ? session.profile.company_name : session.profile.display_name) || 'مستخدم';

  const trustConfig = getTrustConfig(trustRating);
  const TrustIcon = trustConfig.icon;

  const menuItems = [
    {
      icon: LayoutDashboard,
      label: 'لوحة التحكم',
      color: '#2196F3',
      bg: '#EBF5FF',
      action: () => { onOpenDashboard?.(); setIsOpen(false); },
      show: true
    },
    {
      icon: Settings,
      label: 'إعدادات الحساب',
      color: '#64748b',
      bg: '#f1f5f9',
      action: () => { onOpenAccount(); setIsOpen(false); },
      show: true
    },
    {
      icon: Warehouse,
      label: 'مستودعي السحابي',
      color: '#1565C0',
      bg: '#E3F2FD',
      action: () => { onOpenSupplierInventory?.(); setIsOpen(false); },
      show: isSupplier && onOpenSupplierInventory,
      badge: 'مورّد'
    },
    {
      icon: Handshake,
      label: 'صفقات التوريد',
      color: '#27AE60',
      bg: '#E8F8F0',
      action: () => { onOpenSupplierDeals?.(); setIsOpen(false); },
      show: isSupplier && onOpenSupplierDeals,
      badge: 'مورّد'
    },
    {
      icon: Package,
      label: 'مشترياتي',
      color: '#059669',
      bg: '#D1FAE5',
      action: () => { onOpenPurchasedInventory?.(); setIsOpen(false); },
      show: isBuyer && onOpenPurchasedInventory,
      badge: 'مشتري'
    },
    {
      icon: ShoppingBag,
      label: 'طلباتي وصفقاتي',
      color: '#2563eb',
      bg: '#dbeafe',
      action: () => { onOpenBuyerDeals?.(); setIsOpen(false); },
      show: isBuyer && onOpenBuyerDeals,
      badge: 'مشتري'
    },
  ].filter(item => item.show);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative group"
        aria-label="القائمة"
      >
        <div
          className="relative w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all border-2 group-active:scale-95"
          style={{
            background: isCompany
              ? 'linear-gradient(135deg, #0f2535 0%, #1a4a5e 50%, #2c6f8a 100%)'
              : 'linear-gradient(135deg, #1a6640 0%, #27AE60 50%, #34d399 100%)',
            borderColor: isCompany ? '#1a4a5e' : '#27AE60',
            boxShadow: isOpen
              ? isCompany
                ? '0 8px 24px rgba(26,74,94,0.4)'
                : '0 8px 24px rgba(39,174,96,0.4)'
              : isCompany
                ? '0 4px 12px rgba(26,74,94,0.2)'
                : '0 4px 12px rgba(39,174,96,0.2)',
          }}
        >
          <span className="text-[13px] font-black text-white leading-none tracking-tight">
            {initials}
          </span>
          <div className="absolute -bottom-1 -right-1 flex items-center justify-center">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center border-2 border-white"
              style={{ background: trustConfig.color }}
            >
              <TrustIcon className="w-3 h-3 text-white" />
            </div>
          </div>
          <div
            className={`absolute -top-1 -left-1 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            style={{
              width: 20,
              height: 20,
              borderRadius: '6px',
              background: 'rgba(255,255,255,0.95)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ChevronDown className="w-3 h-3 text-[#1a4a5e]" />
          </div>
        </div>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div
            className="absolute left-0 top-[calc(100%+8px)] z-50 w-80 rounded-3xl overflow-hidden shadow-2xl animate-in slide-in-from-top-2 duration-200"
            style={{
              background: 'white',
              border: '2px solid #e5e7eb',
            }}
          >
            {/* Header */}
            <div
              className="relative px-5 py-6 overflow-hidden"
              style={{
                background: isCompany
                  ? 'linear-gradient(135deg, #0a1f2e 0%, #1a4a5e 60%, #2c6f8a 100%)'
                  : 'linear-gradient(135deg, #1a6640 0%, #27AE60 60%, #34d399 100%)',
              }}
            >
              <div
                className="absolute inset-0 opacity-10"
                style={{
                  backgroundImage: 'radial-gradient(circle at 20% 30%, #fff 0%, transparent 50%)',
                }}
              />
              <div className="relative" dir="rtl">
                <div className="flex items-start gap-3 mb-4">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                    style={{
                      background: 'rgba(255,255,255,0.15)',
                      backdropFilter: 'blur(12px)',
                    }}
                  >
                    <span className="text-[18px] font-black text-white tracking-tight">{initials}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[16px] font-black text-white leading-tight mb-1 truncate">
                      {displayName}
                    </h3>
                    <p className="text-[11px] text-white/60 font-mono mb-2">{session.profile.phone}</p>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {isCompany && (
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-white/20 text-white">
                          شركة
                        </span>
                      )}
                      {isSupplier && (
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-white/20 text-white">
                          مورّد
                        </span>
                      )}
                      {isBuyer && (
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-white/20 text-white">
                          مشتري
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div
                  className="flex items-center justify-between px-4 py-3 rounded-2xl"
                  style={{
                    background: 'rgba(255,255,255,0.15)',
                    backdropFilter: 'blur(12px)',
                  }}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center"
                      style={{ background: `${trustConfig.color}30` }}
                    >
                      <TrustIcon className="w-4 h-4" style={{ color: trustConfig.color }} />
                    </div>
                    <div>
                      <p className="text-[11px] font-black mb-0.5" style={{ color: trustConfig.color }}>
                        {trustConfig.label}
                      </p>
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <Star
                            key={i}
                            className="w-2.5 h-2.5"
                            style={{
                              color: i <= trustRating ? trustConfig.color : 'rgba(255,255,255,0.3)',
                              fill: i <= trustRating ? trustConfig.color : 'none',
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  <Sparkles className="w-5 h-5 text-white/60" />
                </div>
              </div>
            </div>

            {/* Menu Items */}
            <div className="py-2" dir="rtl">
              {menuItems.map((item, index) => {
                const Icon = item.icon;
                return (
                  <button
                    key={index}
                    onClick={item.action}
                    className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                  >
                    <div className="flex-1 flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
                        style={{ background: item.bg }}
                      >
                        <Icon className="w-5 h-5" style={{ color: item.color }} />
                      </div>
                      <div className="flex-1 text-right">
                        <p className="text-[13px] font-bold text-[#1a4a5e]">{item.label}</p>
                      </div>
                    </div>
                    {item.badge && (
                      <span
                        className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                        style={{
                          background: item.badge === 'مورّد' ? '#E8F8F0' : '#dbeafe',
                          color: item.badge === 'مورّد' ? '#27AE60' : '#2563eb',
                        }}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Logout */}
            <div className="border-t-2 border-gray-100 p-3">
              <button
                onClick={() => { onLogout(); setIsOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all active:scale-[0.98]"
                style={{
                  background: 'linear-gradient(135deg, #fef2f2, #fee2e2)',
                  border: '1px solid #fecaca',
                }}
              >
                <LogOut className="w-5 h-5 text-[#dc2626] flex-shrink-0" />
                <div className="flex-1 text-right">
                  <p className="text-[13px] font-bold text-[#dc2626]">تسجيل الخروج</p>
                </div>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
