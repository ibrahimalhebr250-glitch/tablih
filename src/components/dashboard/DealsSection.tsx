import { Handshake, Truck as TruckIcon, ChevronLeft } from 'lucide-react';
import type { DashboardDeal } from '../../hooks/useDashboard';

interface Props {
  deals: DashboardDeal[];
  loading: boolean;
}

export default function DealsSection({ deals, loading }: Props) {
  return (
    <div className="mx-4 mt-5 mb-32">
      <div className="flex items-center justify-between mb-3">
        <div />
        <div className="flex items-center gap-2">
          <Handshake className="w-4 h-4 text-[#1a4a5e]" />
          <h3 className="text-[14px] font-bold text-[#1a4a5e]">صفقاتي</h3>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1].map((i) => (
            <div key={i} className="h-20 bg-white rounded-2xl animate-pulse border border-gray-100" />
          ))}
        </div>
      ) : deals.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 py-8 flex flex-col items-center gap-2">
          <Handshake className="w-8 h-8 text-gray-300" />
          <p className="text-[12px] text-[#a0b5c0]">لا توجد صفقات مكتملة بعد</p>
          <p className="text-[11px] text-[#c0d0da] text-center px-6">
            ستظهر هنا صفقاتك عند مطابقة الطلبات مع المخزون
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {deals.map((deal) => (
            <div
              key={deal.id}
              className="bg-white rounded-2xl border border-gray-100 px-4 py-3 shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <button className="p-1.5 rounded-lg bg-gray-100 flex-shrink-0">
                  <ChevronLeft className="w-3.5 h-3.5 text-[#2c5f7c]" />
                </button>
                <div className="text-right flex-1">
                  <div className="flex items-center justify-end gap-2 mb-1">
                    <span className="text-[12px] font-bold text-[#1a4a5e]">
                      {deal.pallet_type} – {deal.size} – {deal.quality}
                    </span>
                  </div>
                  <div className="flex items-center justify-end gap-3 mb-2">
                    <span className="text-[11px] text-[#7a9aab]">{deal.city}</span>
                    <span className="text-[11px] text-[#7a9aab]">
                      {deal.matched_quantity.toLocaleString('ar-SA')} طبلية
                    </span>
                  </div>
                  <div className="flex items-center justify-end gap-3">
                    <div className="flex items-center gap-1">
                      <TruckIcon className="w-3 h-3 text-[#7a9aab]" />
                      <span className="text-[10px] text-[#7a9aab]">{deal.delivery_days} أيام</span>
                    </div>
                    <span className="text-[12px] font-bold text-[#27AE60]">
                      {(deal.matched_quantity * deal.matched_price).toLocaleString('ar-SA')} ريال
                    </span>
                  </div>
                  <p className="text-[10px] text-[#a0b5c0] mt-1">{deal.request_id}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
