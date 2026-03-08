import { Warehouse, ShoppingBag, Handshake, ClipboardList } from 'lucide-react';

interface Props {
  stats: {
    inventory: number;
    purchases: number;
    activeDeals: number;
    orders: number;
  };
}

const CARDS = [
  {
    key: 'inventory',
    label: 'مخزوني',
    unit: 'طبلية',
    icon: Warehouse,
    gradient: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
    iconBg: 'rgba(255,255,255,0.2)',
    shadow: '0 4px 14px rgba(5,150,105,0.25)',
  },
  {
    key: 'purchases',
    label: 'مشترياتي',
    unit: 'صفقة',
    icon: ShoppingBag,
    gradient: 'linear-gradient(135deg, #0369a1 0%, #0ea5e9 100%)',
    iconBg: 'rgba(255,255,255,0.2)',
    shadow: '0 4px 14px rgba(3,105,161,0.25)',
  },
  {
    key: 'activeDeals',
    label: 'صفقات نشطة',
    unit: 'صفقة',
    icon: Handshake,
    gradient: 'linear-gradient(135deg, #b45309 0%, #f59e0b 100%)',
    iconBg: 'rgba(255,255,255,0.2)',
    shadow: '0 4px 14px rgba(180,83,9,0.25)',
  },
  {
    key: 'orders',
    label: 'طلباتي',
    unit: 'طلب',
    icon: ClipboardList,
    gradient: 'linear-gradient(135deg, #1a4a5e 0%, #2c6f8a 100%)',
    iconBg: 'rgba(255,255,255,0.2)',
    shadow: '0 4px 14px rgba(26,74,94,0.25)',
  },
] as const;

export default function AccountSummaryCards({ stats }: Props) {
  return (
    <div className="px-4 pt-4 pb-1" dir="rtl">
      <div className="grid grid-cols-4 gap-2">
        {CARDS.map(card => {
          const Icon = card.icon;
          const value = stats[card.key as keyof typeof stats] || 0;
          return (
            <div
              key={card.key}
              className="rounded-2xl p-3 text-center relative overflow-hidden"
              style={{ background: card.gradient, boxShadow: card.shadow }}
            >
              <div className="absolute top-0 right-0 w-12 h-12 rounded-full opacity-10" style={{ background: 'white', transform: 'translate(30%, -30%)' }} />
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center mx-auto mb-1.5"
                style={{ background: card.iconBg }}
              >
                <Icon className="w-4 h-4 text-white" />
              </div>
              <p className="text-[18px] font-black text-white leading-none">
                {value.toLocaleString('ar-SA')}
              </p>
              <p className="text-[9px] text-white/70 font-medium mt-1">{card.label}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
