import { Warehouse, ShoppingBag, User } from 'lucide-react';

interface Props {
  onAddInventory: () => void;
  onCreateOrder: () => void;
  onOpenAccount?: () => void;
}

export default function BottomNavigation({ onAddInventory, onCreateOrder, onOpenAccount }: Props) {
  return (
    <nav
      className="fixed left-0 right-0 z-50 lg:hidden"
      style={{
        bottom: 'env(safe-area-inset-bottom, 0px)',
        WebkitTransform: 'translateZ(0)',
        transform: 'translateZ(0)',
      }}
    >
      <div className="w-full">
        <div
          className="px-5 pt-1.5"
          style={{
            paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
            background: 'linear-gradient(to top, white 70%, rgba(255,255,255,0.95) 85%, rgba(255,255,255,0) 100%)'
          }}
        >
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={onAddInventory}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl active:scale-95 transition-all"
              style={{ background: 'linear-gradient(135deg, #1565C0, #1E88E5)' }}
            >
              <Warehouse className="w-[18px] h-[18px] text-white" />
              <span className="text-[12px] font-bold text-white">إضافة مخزون</span>
            </button>

            <button
              onClick={onOpenAccount}
              className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0 border-2 active:scale-95 transition-all"
              style={{
                background: 'linear-gradient(135deg, #0f2535, #1a4a5e)',
                borderColor: '#1a4a5e'
              }}
            >
              <User className="w-5 h-5 text-white" />
            </button>

            <button
              onClick={onCreateOrder}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl active:scale-95 transition-all"
              style={{ background: 'linear-gradient(135deg, #B45309, #D97706)' }}
            >
              <ShoppingBag className="w-[18px] h-[18px] text-white" />
              <span className="text-[12px] font-bold text-white">إنشاء طلب</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
