import type { AppSession } from '../../types/session';
import OperationsRoom from './OperationsRoom';

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
  return (
    <OperationsRoom
      session={session}
      onClose={onClose}
      onLogout={onLogout}
      onAddInventory={onAddInventory || (() => {})}
      onCreateOrder={onCreateOrder || (() => {})}
      onOpenSupplierDeals={onOpenSupplierDeals || (() => {})}
      onOpenBuyerDeals={onOpenBuyerDeals || (() => {})}
      onOpenSupplierInventory={onOpenSupplierInventory || (() => {})}
      onOpenPurchasedInventory={onOpenPurchasedInventory || (() => {})}
    />
  );
}
