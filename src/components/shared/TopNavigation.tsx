import { Home, ShoppingCart, Package, Handshake, User, LogOut, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import type { AppSession } from '../../types/session';
import { useNotificationCounts } from '../../hooks/useNotificationCounts';

interface Props {
  session: AppSession;
  currentView: 'marketplace' | 'orders' | 'inventory' | 'deals' | 'account';
  onNavigate: (view: 'marketplace' | 'orders' | 'inventory' | 'deals' | 'account') => void;
  onLogout: () => void;
}

export default function TopNavigation({ session, currentView, onNavigate, onLogout }: Props) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { counts } = useNotificationCounts(session.profile.phone);

  const navItems = [
    { id: 'marketplace' as const, label: 'Marketplace', icon: Home, color: '#0369A1', badge: 0 },
    { id: 'orders' as const, label: 'My Orders', icon: ShoppingCart, color: '#7C3AED', badge: counts.activeOrders },
    { id: 'inventory' as const, label: 'My Inventory', icon: Package, color: '#DC2626', badge: counts.availableInventory },
    { id: 'deals' as const, label: 'Deals', icon: Handshake, color: '#059669', badge: counts.activeDeals },
    { id: 'account' as const, label: 'My Account', icon: User, color: '#1a4a5e', badge: 0 },
  ];

  const displayName = session.profile.company_name || session.profile.display_name || session.profile.phone;
  const userType = session.profile.user_type === 'company' ? 'Company' : 'Individual';
  const roles = session.roles.map(r => r.charAt(0).toUpperCase() + r.slice(1)).join(' & ');

  return (
    <div className="bg-white border-b border-gray-200 shadow-sm relative z-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Logo */}
          <button
            onClick={() => onNavigate('marketplace')}
            className="flex items-center gap-2 sm:gap-3 group"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-[#1a4a5e] to-[#2d6a82] rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all">
              <svg viewBox="0 0 20 20" className="w-5 h-5 sm:w-6 sm:h-6" fill="none">
                <rect x="2" y="2" width="6.5" height="6.5" rx="1.5" fill="white" />
                <rect x="11.5" y="2" width="6.5" height="6.5" rx="1.5" fill="white" />
                <rect x="2" y="11.5" width="6.5" height="6.5" rx="1.5" fill="white" />
                <rect x="11.5" y="11.5" width="6.5" height="6.5" rx="1.5" fill="white" />
              </svg>
            </div>
            <div className="hidden lg:block">
              <p className="text-xs sm:text-sm font-bold text-[#1a4a5e] leading-tight">Pallet Platform</p>
              <p className="text-[10px] text-gray-500">{roles}</p>
            </div>
          </button>

          {/* Navigation Items - Desktop */}
          <div className="hidden md:flex items-center gap-1 lg:gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`
                    relative flex items-center gap-2 px-3 lg:px-4 py-2 rounded-xl font-semibold text-sm
                    transition-all duration-300 group
                    ${isActive
                      ? 'text-white shadow-lg scale-105'
                      : 'text-gray-600 hover:bg-gray-50 hover:scale-105'
                    }
                  `}
                  style={isActive ? {
                    background: `linear-gradient(135deg, ${item.color} 0%, ${item.color}dd 100%)`,
                  } : {}}
                >
                  <div className="relative">
                    <Icon className={`w-4 h-4 transition-transform ${isActive ? 'text-white' : 'text-gray-500 group-hover:scale-110'}`} />
                    {item.badge > 0 && (
                      <div className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 flex items-center justify-center shadow-lg">
                        <span className="text-[9px] font-bold text-white">{item.badge > 9 ? '9+' : item.badge}</span>
                      </div>
                    )}
                  </div>
                  <span className="hidden lg:inline">{item.label}</span>
                  {isActive && (
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white shadow-lg" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Mobile Navigation Dropdown */}
          <div className="md:hidden flex items-center gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              if (!isActive) return null;

              return (
                <div
                  key={item.id}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
                  style={{ background: `${item.color}15` }}
                >
                  <Icon className="w-4 h-4" style={{ color: item.color }} />
                  <span className="text-xs font-bold" style={{ color: item.color }}>{item.label}</span>
                </div>
              );
            })}
          </div>

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl hover:bg-gray-50 transition-all"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#1a4a5e] to-[#2d6a82] flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-bold text-gray-800 leading-tight max-w-[120px] truncate">{displayName}</p>
                <p className="text-[10px] text-gray-500">{userType}</p>
              </div>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
            </button>

            {showUserMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowUserMenu(false)}
                />
                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-2xl border border-gray-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  {/* Mobile Navigation Items */}
                  <div className="md:hidden border-b border-gray-100 pb-2 mb-2">
                    {navItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = currentView === item.id;

                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            onNavigate(item.id);
                            setShowUserMenu(false);
                          }}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 transition-all ${
                            isActive ? 'bg-gray-50' : 'hover:bg-gray-50'
                          }`}
                        >
                          <div className="relative">
                            <Icon className="w-4 h-4" style={{ color: isActive ? item.color : '#6B7280' }} />
                            {item.badge > 0 && (
                              <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-red-500 flex items-center justify-center">
                                <span className="text-[8px] font-bold text-white">{item.badge > 9 ? '9+' : item.badge}</span>
                              </div>
                            )}
                          </div>
                          <span className={`flex-1 text-left text-sm font-medium ${isActive ? 'font-bold' : ''}`} style={{ color: isActive ? item.color : '#374151' }}>
                            {item.label}
                          </span>
                          {item.badge > 0 && (
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: `${item.color}20`, color: item.color }}>
                              {item.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => {
                      onLogout();
                      setShowUserMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-red-600 hover:bg-red-50 transition-all"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="text-sm font-medium">Logout</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
