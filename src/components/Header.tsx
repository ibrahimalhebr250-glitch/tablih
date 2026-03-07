import { ShieldCheck, LayoutGrid, Sparkles } from 'lucide-react';
import type { AppSession } from '../types/session';
import AccountDropdown from './Header/AccountDropdown';

interface Props {
  session: AppSession | null;
  onOpenAccount: () => void;
  onOpenAdmin: () => void;
  onOpenSupplierDeals?: () => void;
  onOpenBuyerDeals?: () => void;
  onOpenSupplierInventory?: () => void;
  onOpenPurchasedInventory?: () => void;
  onOpenDashboard?: () => void;
  onLogout: () => void;
}

export default function Header({
  session,
  onOpenAccount,
  onOpenAdmin,
  onOpenSupplierDeals,
  onOpenBuyerDeals,
  onOpenSupplierInventory,
  onOpenPurchasedInventory,
  onOpenDashboard,
  onLogout
}: Props) {
  return (
    <header
      className="flex items-center justify-between px-4 py-3 sticky top-0 z-50 border-b-2"
      style={{
        background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
        borderColor: '#e2e8f0',
        boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
      }}
    >
      <AccountDropdown
        session={session}
        onOpenAccount={onOpenAccount}
        onOpenSupplierDeals={onOpenSupplierDeals}
        onOpenBuyerDeals={onOpenBuyerDeals}
        onOpenSupplierInventory={onOpenSupplierInventory}
        onOpenPurchasedInventory={onOpenPurchasedInventory}
        onOpenDashboard={onOpenDashboard}
        onLogout={onLogout}
      />

      <div className="flex items-center gap-3">
        <div className="text-right">
          <div className="flex items-center gap-1.5">
            <span className="text-[17px] font-black text-[#0a1f2e] tracking-tight">شبكة الطبليات</span>
            <Sparkles className="w-4 h-4 text-[#F59E0B]" />
          </div>
          <p className="text-[9px] text-[#64748b] font-medium">منصة توريد الطبليات</p>
        </div>
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, #0f2535 0%, #1a4a5e 50%, #2c6f8a 100%)',
            boxShadow: '0 6px 20px rgba(15,37,53,0.25)',
          }}
        >
          <LayoutGrid className="w-5 h-5 text-white" />
        </div>
      </div>

      <button
        onClick={onOpenAdmin}
        className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 active:scale-95 transition-all border-2 group"
        style={{
          background: 'linear-gradient(135deg, #7f1d1d, #991b1b)',
          borderColor: '#7f1d1d',
          boxShadow: '0 4px 12px rgba(127,29,29,0.3)',
        }}
        aria-label="لوحة التحكم"
      >
        <ShieldCheck className="w-5 h-5 text-white group-active:scale-90 transition-transform" />
      </button>
    </header>
  );
}
