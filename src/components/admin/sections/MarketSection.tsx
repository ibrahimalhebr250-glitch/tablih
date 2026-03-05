import { useState } from 'react';
import { MapPin, Package, ShoppingCart } from 'lucide-react';
import CitiesTab from '../market/cities/CitiesTab';
import InventoryTab from '../market/inventory/InventoryTab';
import RequestsTab from '../market/requests/RequestsTab';
import type { MarketTab } from '../../../types/admin';

const TABS: { id: MarketTab; label: string; icon: typeof MapPin }[] = [
  { id: 'cities', label: 'المدن', icon: MapPin },
  { id: 'inventory', label: 'المخزون', icon: Package },
  { id: 'requests', label: 'الطلبات', icon: ShoppingCart },
];

export default function MarketSection() {
  const [tab, setTab] = useState<MarketTab>('cities');

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div>
        <h2 className="text-xl font-black text-[#1a2f3e]">إدارة السوق</h2>
        <p className="text-sm text-[#7a9aab] mt-0.5">إدارة المدن والمخزون والطلبات</p>
      </div>

      <div className="flex gap-1 p-1 bg-[#f0f6fa] rounded-2xl w-fit">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold transition-all ${
              tab === id
                ? 'bg-white text-[#1a4a5e] shadow-sm'
                : 'text-[#7a9aab] hover:text-[#1a4a5e]'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      <div>
        {tab === 'cities' && <CitiesTab />}
        {tab === 'inventory' && <InventoryTab />}
        {tab === 'requests' && <RequestsTab />}
      </div>
    </div>
  );
}
