import { RefreshCw } from 'lucide-react';
import type { AppSession } from '../../types/session';

interface Props {
  session: AppSession;
  onAddInventory: () => void;
  onCreateOrder: () => void;
  onOpenSupplierDeals: () => void;
  onOpenBuyerDeals: () => void;
  refreshRef?: React.MutableRefObject<(() => void) | null>;
}

export default function OperationalDashboard({ session, refreshRef }: Props) {
  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'صباح الخير';
    if (h < 17) return 'مساء الخير';
    return 'مساء النور';
  };

  const displayName = session.profile.company_name || session.profile.display_name || session.profile.phone;

  return (
    <div className="h-full flex items-center justify-center" style={{ minHeight: '60vh' }}>
      <div className="text-center px-8">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ background: '#1a4a5e15' }}
        >
          <RefreshCw className="w-8 h-8 text-[#1a4a5e]" />
        </div>
        <p className="text-[13px] text-[#7a9aab] mb-1">{greeting()}</p>
        <h2 className="text-[18px] font-bold text-[#1a4a5e] mb-3">{displayName}</h2>
        <p className="text-[13px] text-[#7a9aab]">سيتم بناء لوحة التحكم الجديدة قريباً</p>
      </div>
    </div>
  );
}
