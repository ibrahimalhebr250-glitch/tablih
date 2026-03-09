import { Warehouse, ShoppingBag, ChevronLeft } from 'lucide-react';
import { useTranslation } from '../lib/i18n';

interface Props {
  onCreateOrder: () => void;
  onAddInventory: () => void;
}

export default function QuickActions({ onCreateOrder, onAddInventory }: Props) {
  const { t } = useTranslation();

  return (
    <div className="flex gap-3 px-4 lg:px-5 mt-5">
      <button
        onClick={onAddInventory}
        className="flex-1 rounded-2xl overflow-hidden shadow-sm border border-blue-100 active:scale-[0.97] hover:shadow-md hover:-translate-y-0.5 transition-all group"
        style={{ background: 'linear-gradient(160deg, #EFF6FF 0%, #FFFFFF 100%)' }}
      >
        <div className="px-4 py-4 lg:py-5 flex items-center gap-3" dir="rtl">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #1565C0, #1E88E5)' }}
          >
            <Warehouse className="w-5 h-5 text-white" />
          </div>
          <div className="text-right flex-1 min-w-0">
            <p className="text-[13px] font-bold text-[#1a3a4a]">{t('quickActions.addInventoryTitle')}</p>
            <p className="text-[10px] text-[#7a9aab] mt-0.5">{t('quickActions.addInventoryDesc')}</p>
          </div>
          <ChevronLeft className="w-4 h-4 text-[#b0c8d8] group-hover:text-[#1E88E5] group-hover:-translate-x-0.5 transition-all flex-shrink-0" />
        </div>
      </button>

      <button
        onClick={onCreateOrder}
        className="flex-1 rounded-2xl overflow-hidden shadow-sm border border-amber-100 active:scale-[0.97] hover:shadow-md hover:-translate-y-0.5 transition-all group"
        style={{ background: 'linear-gradient(160deg, #FFFBEB 0%, #FFFFFF 100%)' }}
      >
        <div className="px-4 py-4 lg:py-5 flex items-center gap-3" dir="rtl">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #B45309, #D97706)' }}
          >
            <ShoppingBag className="w-5 h-5 text-white" />
          </div>
          <div className="text-right flex-1 min-w-0">
            <p className="text-[13px] font-bold text-[#1a3a4a]">{t('quickActions.createOrderTitle')}</p>
            <p className="text-[10px] text-[#7a9aab] mt-0.5">{t('quickActions.createOrderDesc')}</p>
          </div>
          <ChevronLeft className="w-4 h-4 text-[#b0c8d8] group-hover:text-[#D97706] group-hover:-translate-x-0.5 transition-all flex-shrink-0" />
        </div>
      </button>
    </div>
  );
}
