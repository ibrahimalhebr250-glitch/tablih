import { useState } from 'react';
import type { AppSession } from '../../types/session';
import OperationsRoom from './OperationsRoom';
import SettingsPage from './SettingsPage';

interface Props {
  session: AppSession;
  freshLogin?: boolean;
  onClose: () => void;
  onLogout: () => void;
  onUpdateProfile: (updates: { company_name?: string; display_name?: string; city?: string; activity_type?: string }) => Promise<void>;
  onOpenSupplierDeals?: () => void;
  onOpenBuyerDeals?: () => void;
  onOpenSupplierInventory?: () => void;
  onOpenPurchasedInventory?: () => void;
  onAddInventory?: () => void;
  onCreateOrder?: () => void;
}

export default function EnhancedAccountPage({
  session,
  freshLogin = false,
  onClose,
  onLogout,
  onUpdateProfile,
  onOpenSupplierDeals,
  onOpenBuyerDeals,
  onOpenSupplierInventory,
  onOpenPurchasedInventory,
  onAddInventory,
  onCreateOrder
}: Props) {
  const [currentPage, setCurrentPage] = useState<'operations' | 'settings'>('operations');

  if (currentPage === 'settings') {
    return (
      <SettingsPage
        session={session}
        onClose={() => setCurrentPage('operations')}
        onLogout={onLogout}
        onUpdateProfile={onUpdateProfile}
      />
    );
  }

  return (
    <OperationsRoom
      session={session}
      onClose={onClose}
      onAddInventory={onAddInventory || (() => {})}
      onCreateOrder={onCreateOrder || (() => {})}
      onOpenSupplierDeals={onOpenSupplierDeals || (() => {})}
      onOpenBuyerDeals={onOpenBuyerDeals || (() => {})}
      onOpenSupplierInventory={onOpenSupplierInventory || (() => {})}
      onOpenPurchasedInventory={onOpenPurchasedInventory || (() => {})}
      onOpenSettings={() => setCurrentPage('settings')}
    />
  );
}
