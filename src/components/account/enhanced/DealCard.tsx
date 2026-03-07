import { Calendar, MapPin, Package } from 'lucide-react';

interface Props {
  deal: {
    id: string;
    type: 'supplier' | 'buyer';
    status: string;
    pallet_type: string;
    quantity: number;
    price: number;
    city: string;
    created_at: string;
  };
  statusConfig: {
    label: string;
    color: string;
    bg: string;
  };
}

export default function DealCard({ deal, statusConfig }: Props) {
  return (
    <div className="group rounded-2xl bg-white border-2 border-gray-100 p-4 shadow-md hover:shadow-xl hover:border-[#2c5f7c]/30 transition-all duration-200" dir="rtl">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <div
            className="px-3 py-1.5 rounded-xl text-[11px] font-bold shadow-sm"
            style={{ backgroundColor: statusConfig.bg, color: statusConfig.color }}
          >
            {statusConfig.label}
          </div>
          <div
            className={`px-3 py-1.5 rounded-xl text-[11px] font-bold shadow-sm ${
              deal.type === 'supplier'
                ? 'bg-gradient-to-br from-green-50 to-green-100 text-[#27AE60]'
                : 'bg-gradient-to-br from-blue-50 to-blue-100 text-[#2196F3]'
            }`}
          >
            {deal.type === 'supplier' ? 'مورّد' : 'مشتري'}
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-gray-400">
          <Calendar className="w-3.5 h-3.5" />
          <p className="text-[10px] font-medium">
            {new Date(deal.created_at).toLocaleDateString('ar-SA', {
              month: 'short',
              day: 'numeric'
            })}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
          <Package className="w-5 h-5 text-gray-600" />
        </div>
        <div className="text-right flex-1">
          <p className="text-[15px] font-black text-gray-900 mb-0.5">{deal.pallet_type}</p>
          <p className="text-[11px] text-gray-500">{deal.quantity.toLocaleString('ar-SA')} طبلية</p>
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <div className="flex items-center gap-1.5 text-gray-500">
          <MapPin className="w-3.5 h-3.5" />
          <p className="text-[11px] font-medium">{deal.city}</p>
        </div>

        <div className="text-left">
          <p className="text-[18px] font-black text-[#2c5f7c]">
            {(deal.price || 0).toLocaleString('ar-SA')}
          </p>
          <p className="text-[9px] text-gray-500 font-medium">ريال</p>
        </div>
      </div>
    </div>
  );
}
