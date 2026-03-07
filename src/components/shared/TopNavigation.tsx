import { Home, ShoppingCart, Package, Handshake, User, LogOut } from 'lucide-react';
import type { AppSession } from '../../types/session';

interface Props {
  session: AppSession;
  currentView: 'marketplace' | 'orders' | 'inventory' | 'deals' | 'account';
  onNavigate: (view: 'marketplace' | 'orders' | 'inventory' | 'deals' | 'account') => void;
  onLogout: () => void;
}

export default function TopNavigation({ session, currentView, onNavigate, onLogout }: Props) {
  const navItems = [
    { id: 'marketplace' as const, label: 'Marketplace', icon: Home },
    { id: 'orders' as const, label: 'My Orders', icon: ShoppingCart },
    { id: 'inventory' as const, label: 'My Inventory', icon: Package },
    { id: 'deals' as const, label: 'Deals', icon: Handshake },
    { id: 'account' as const, label: 'My Account', icon: User },
  ];

  return (
    <div className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#1a4a5e] to-[#2d6a82] rounded-xl flex items-center justify-center shadow-lg">
              <svg viewBox="0 0 20 20" className="w-6 h-6" fill="none">
                <rect x="2" y="2" width="6.5" height="6.5" rx="1.5" fill="white" />
                <rect x="11.5" y="2" width="6.5" height="6.5" rx="1.5" fill="white" />
                <rect x="2" y="11.5" width="6.5" height="6.5" rx="1.5" fill="white" />
                <rect x="11.5" y="11.5" width="6.5" height="6.5" rx="1.5" fill="white" />
              </svg>
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-bold text-[#1a4a5e]">Pallet Platform</p>
              <p className="text-xs text-gray-500">{session.profile.display_name || session.profile.phone}</p>
            </div>
          </div>

          {/* Navigation Items */}
          <div className="flex items-center gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`
                    flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg font-medium text-sm
                    transition-all duration-200
                    ${isActive
                      ? 'bg-[#1a4a5e] text-white shadow-lg'
                      : 'text-gray-600 hover:bg-gray-100'
                    }
                  `}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-gray-500'}`} />
                  <span className="hidden md:inline">{item.label}</span>
                </button>
              );
            })}

            {/* Logout Button */}
            <button
              onClick={onLogout}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg font-medium text-sm text-red-600 hover:bg-red-50 transition-all duration-200"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden md:inline">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
