import { Home, ShoppingCart, Warehouse, Handshake, User, ShieldCheck, Sparkles, LayoutGrid } from 'lucide-react';
import type { AppSession } from '../../types/session';
import { getTrustConfig } from './TrustRatingBadge';

interface Props {
  session: AppSession;
  currentView: 'marketplace' | 'orders' | 'inventory' | 'deals' | 'account';
  onNavigate: (view: 'marketplace' | 'orders' | 'inventory' | 'deals' | 'account') => void;
  onLogout: () => void;
}

export default function TopNavigation({ session, currentView, onNavigate }: Props) {
  const isSupplier = session.roles.includes('supplier');
  const isBuyer = session.roles.includes('buyer');
  const isCompany = session.profile.user_type === 'company';

  const displayName = isCompany
    ? (session.profile.company_name || 'مستخدم')
    : (session.profile.display_name || 'مستخدم');

  const initials = displayName.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('');
  const trustConfig = getTrustConfig(session.profile.trust_rating || 3);
  const TrustIcon = trustConfig.icon;

  return (
    <header
      className="flex items-center justify-between px-4 py-3 sticky top-0 z-50 border-b-2"
      style={{
        background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
        borderColor: '#e2e8f0',
        boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
      }}
      dir="rtl"
    >
      {/* Logo Section */}
      <div className="flex items-center gap-3">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{
            background: 'linear-gradient(135deg, #0f2535 0%, #1a4a5e 50%, #2c6f8a 100%)',
            boxShadow: '0 6px 20px rgba(15,37,53,0.25)',
          }}
        >
          <LayoutGrid className="w-5 h-5 text-white" />
        </div>
        <div className="text-right hidden sm:block">
          <div className="flex items-center gap-1.5">
            <span className="text-[17px] font-black text-[#0a1f2e] tracking-tight">شبكة الطبليات</span>
            <Sparkles className="w-4 h-4 text-[#F59E0B]" />
          </div>
          <p className="text-[9px] text-[#64748b] font-medium">منصة توريد الطبليات</p>
        </div>
      </div>

      {/* Navigation Icons */}
      <div className="flex items-center gap-2">
        {/* Home Button */}
        <button
          onClick={() => onNavigate('marketplace')}
          className={`flex flex-col items-center justify-center w-14 h-14 rounded-2xl active:scale-95 transition-all group relative overflow-hidden ${
            currentView === 'marketplace' ? 'ring-2 ring-offset-2 ring-[#2563eb]' : ''
          }`}
          style={{
            background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
            border: '2px solid #93c5fd',
          }}
          aria-label="الرئيسية"
        >
          <div
            className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity"
            style={{
              background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
            }}
          />
          <Home className="w-6 h-6 text-[#2563eb] relative z-10 group-active:scale-90 transition-transform" />
          <span className="text-[8px] font-bold text-[#2563eb] mt-0.5 relative z-10">الرئيسية</span>
        </button>

        {/* Orders / Cart (Buyers) */}
        {isBuyer && (
          <button
            onClick={() => onNavigate('orders')}
            className={`flex flex-col items-center justify-center w-14 h-14 rounded-2xl active:scale-95 transition-all group relative overflow-hidden ${
              currentView === 'orders' ? 'ring-2 ring-offset-2 ring-[#f59e0b]' : ''
            }`}
            style={{
              background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
              border: '2px solid #fbbf24',
            }}
            aria-label="طلباتي"
          >
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity"
              style={{
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              }}
            />
            <ShoppingCart className="w-6 h-6 text-[#f59e0b] relative z-10 group-active:scale-90 transition-transform" />
            <span className="text-[8px] font-bold text-[#f59e0b] mt-0.5 relative z-10">طلباتي</span>
          </button>
        )}

        {/* Inventory (Dynamic for Supplier/Buyer) */}
        <button
          onClick={() => onNavigate('inventory')}
          className={`flex flex-col items-center justify-center w-14 h-14 rounded-2xl active:scale-95 transition-all group relative overflow-hidden ${
            currentView === 'inventory' ? 'ring-2 ring-offset-2 ring-[#10b981]' : ''
          }`}
          style={{
            background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)',
            border: '2px solid #6ee7b7',
          }}
          aria-label={isSupplier ? 'مستودعي' : 'مشترياتي'}
        >
          <div
            className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity"
            style={{
              background: 'linear-gradient(135deg, #10b981, #059669)',
            }}
          />
          <Warehouse className="w-6 h-6 text-[#10b981] relative z-10 group-active:scale-90 transition-transform" />
          <span className="text-[8px] font-bold text-[#10b981] mt-0.5 relative z-10">
            {isSupplier ? 'المستودع' : 'مشترياتي'}
          </span>
        </button>

        {/* Deals */}
        <button
          onClick={() => onNavigate('deals')}
          className={`flex flex-col items-center justify-center w-14 h-14 rounded-2xl active:scale-95 transition-all group relative overflow-hidden ${
            currentView === 'deals' ? 'ring-2 ring-offset-2 ring-[#6366f1]' : ''
          }`}
          style={{
            background: 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)',
            border: '2px solid #a5b4fc',
          }}
          aria-label="الصفقات"
        >
          <div
            className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity"
            style={{
              background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
            }}
          />
          <Handshake className="w-6 h-6 text-[#6366f1] relative z-10 group-active:scale-90 transition-transform" />
          <span className="text-[8px] font-bold text-[#6366f1] mt-0.5 relative z-10">الصفقات</span>
        </button>

        {/* Account Button */}
        <button
          onClick={() => onNavigate('account')}
          className={`flex flex-col items-center justify-center w-14 h-14 rounded-2xl active:scale-95 transition-all group relative overflow-hidden ${
            currentView === 'account' ? 'ring-2 ring-offset-2' : ''
          }`}
          style={{
            background: isCompany
              ? 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)'
              : 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)',
            border: isCompany ? '2px solid #60a5fa' : '2px solid #34d399',
            ...(currentView === 'account' && {
              ringColor: isCompany ? '#60a5fa' : '#34d399',
            }),
          }}
          aria-label="حسابي"
        >
          <div
            className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity"
            style={{
              background: isCompany
                ? 'linear-gradient(135deg, #1a4a5e, #2c6f8a)'
                : 'linear-gradient(135deg, #27ae60, #1e9652)',
            }}
          />
          <div className="relative">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center relative z-10 group-active:scale-90 transition-transform"
              style={{
                background: isCompany
                  ? 'linear-gradient(135deg, #1e3a8a, #1e40af)'
                  : 'linear-gradient(135deg, #065f46, #047857)',
                border: '2px solid white',
              }}
            >
              <span className="text-[11px] font-black text-white">{initials}</span>
            </div>
            <div
              className="absolute -bottom-1 -right-1 w-5 h-5 rounded-lg flex items-center justify-center border-2 border-white z-20"
              style={{ background: trustConfig.color }}
            >
              <TrustIcon className="w-2.5 h-2.5 text-white" />
            </div>
          </div>
          <span
            className="text-[8px] font-bold mt-0.5 relative z-10"
            style={{ color: isCompany ? '#1e40af' : '#047857' }}
          >
            حسابي
          </span>
        </button>
      </div>
    </header>
  );
}
