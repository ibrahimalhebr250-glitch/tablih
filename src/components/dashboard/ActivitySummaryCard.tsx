import { ClipboardList, Warehouse, Handshake, Plus, FileText } from 'lucide-react';
import type { DashboardSummary } from '../../hooks/useDashboard';

interface Props {
  summary: DashboardSummary;
  onAddInventory: () => void;
  onCreateOrder: () => void;
}

export default function ActivitySummaryCard({ summary, onAddInventory, onCreateOrder }: Props) {
  const stats = [
    { label: 'طلبات نشطة', value: summary.activeOrders, color: '#2196F3', icon: ClipboardList },
    { label: 'دفعات المخزون', value: summary.activeBatches, color: '#27AE60', icon: Warehouse },
    { label: 'صفقات جارية', value: summary.activeDeals, color: '#F59E0B', icon: Handshake },
  ];

  return (
    <div className="mx-4 lg:mx-6 mt-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
          <div />
          <h3 className="text-[13px] font-bold text-[#1a4a5e]">ملخص النشاط</h3>
        </div>

        {/* Stats: 3-col mobile, 6-col desktop */}
        <div className="grid grid-cols-3 lg:grid-cols-6 divide-x divide-x-reverse divide-gray-100">
          {stats.map(({ label, value, color, icon: Icon }) => (
            <div key={label} className="flex flex-col items-center py-4 px-2 lg:py-5">
              <div
                className="w-9 h-9 lg:w-11 lg:h-11 rounded-xl flex items-center justify-center mb-2"
                style={{ background: `${color}15` }}
              >
                <Icon className="w-5 h-5 lg:w-6 lg:h-6" style={{ color }} />
              </div>
              <p className="text-[22px] lg:text-[28px] font-bold text-[#1a4a5e] leading-none">{value}</p>
              <p className="text-[10px] text-[#7a9aab] mt-1 text-center">{label}</p>
            </div>
          ))}

          {/* Desktop: show action buttons inline in the stats row */}
          <button
            onClick={onAddInventory}
            className="hidden lg:flex flex-col items-center py-5 px-2 border-r border-gray-100 gap-2 hover:bg-[#1a4a5e]/5 transition-colors active:scale-95"
          >
            <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: '#1a4a5e15' }}>
              <Plus className="w-6 h-6 text-[#1a4a5e]" strokeWidth={2.5} />
            </div>
            <p className="text-[11px] font-bold text-[#1a4a5e]">إضافة مخزون</p>
          </button>

          <button
            onClick={onCreateOrder}
            className="hidden lg:flex flex-col items-center py-5 px-2 gap-2 hover:bg-[#27AE60]/5 transition-colors active:scale-95"
          >
            <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: '#27AE6015' }}>
              <FileText className="w-6 h-6 text-[#27AE60]" strokeWidth={2} />
            </div>
            <p className="text-[11px] font-bold text-[#27AE60]">إنشاء طلب</p>
          </button>
        </div>

        {/* Mobile action buttons */}
        <div className="lg:hidden grid grid-cols-2 gap-3 px-4 pb-4 pt-1">
          <button
            onClick={onAddInventory}
            className="flex items-center justify-center gap-2 py-3 rounded-xl bg-[#1a4a5e] text-white text-[13px] font-bold shadow-md active:scale-95 transition-transform"
          >
            <Plus className="w-4 h-4" strokeWidth={2.5} />
            إضافة مخزون
          </button>
          <button
            onClick={onCreateOrder}
            className="flex items-center justify-center gap-2 py-3 rounded-xl bg-[#27AE60] text-white text-[13px] font-bold shadow-md active:scale-95 transition-transform"
          >
            <FileText className="w-4 h-4" strokeWidth={2} />
            إنشاء طلب
          </button>
        </div>
      </div>
    </div>
  );
}
