import { useState } from 'react';
import { Handshake, Truck, CheckCircle, XCircle, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import type { Deal } from '../../../types/deal';
import { DEAL_STATUS_CONFIG } from '../../../types/deal';

interface Props {
  deals: Deal[];
  myPhone: string;
  getCounterpartyName: (phone: string) => string;
  loading: boolean;
}

type FilterTab = 'all' | 'pending' | 'negotiation' | 'completed' | 'failed';

const FILTER_TABS: { id: FilterTab; label: string; icon: typeof Handshake }[] = [
  { id: 'all', label: 'الكل', icon: Handshake },
  { id: 'pending', label: 'معلقة', icon: Clock },
  { id: 'negotiation', label: 'جارية', icon: Truck },
  { id: 'completed', label: 'مكتملة', icon: CheckCircle },
  { id: 'failed', label: 'ملغاة', icon: XCircle },
];

const STATUS_TO_FILTER: Record<string, FilterTab> = {
  pending_confirmation: 'pending',
  pending_supplier: 'pending',
  pending_buyer: 'pending',
  matched: 'pending',
  supplier_confirmed: 'negotiation',
  awaiting_buyer: 'negotiation',
  inventory_reserved: 'negotiation',
  in_delivery: 'negotiation',
  execution_in_progress: 'negotiation',
  completed: 'completed',
  cancelled: 'failed',
};

function getSourceLabel(source: string | null, myPhone: string, deal: Deal) {
  if (!source) return 'صفقة';
  if (source === 'supply_card') {
    return deal.buyer_phone === myPhone ? 'بطاقة عرض — طلبت شراء' : 'بطاقة عرض — مورد';
  }
  if (source === 'demand_card') {
    return deal.supplier_phone === myPhone ? 'بطاقة طلب — عرضت توريد' : 'بطاقة طلب — طلبت شراء';
  }
  return source;
}

function getRoleLabel(myPhone: string, deal: Deal) {
  if (deal.buyer_phone === myPhone) return { label: 'مشتري', color: '#2563eb', bg: '#EFF6FF' };
  return { label: 'مورد', color: '#059669', bg: '#ECFDF5' };
}

function DealCard({ deal, myPhone, getCounterpartyName }: { deal: Deal; myPhone: string; getCounterpartyName: (p: string) => string }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = DEAL_STATUS_CONFIG[deal.status];
  const isCompleted = deal.status === 'completed';
  const isCancelled = deal.status === 'cancelled';
  const isInDelivery = deal.status === 'in_delivery' || deal.status === 'execution_in_progress';
  const counterpartyPhone = deal.buyer_phone === myPhone ? deal.supplier_phone : deal.buyer_phone;
  const counterpartyName = getCounterpartyName(counterpartyPhone);
  const roleInfo = getRoleLabel(myPhone, deal);
  const sourceLabel = getSourceLabel(deal.source, myPhone, deal);

  const borderColor = isCompleted ? '#bbf7d0' : isCancelled ? '#fecaca' : isInDelivery ? '#bae6fd' : '#e2edf5';
  const headerBg = isCompleted ? '#f0fdf4' : isCancelled ? '#fef2f2' : isInDelivery ? '#e0f2fe' : '#f8fbfd';

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden" style={{ border: `1.5px solid ${borderColor}` }}>
      <div className="flex items-center justify-between px-4 py-2.5" style={{ background: headerBg, borderBottom: `1px solid ${borderColor}` }}>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-mono text-[#9ab0bf]">{deal.deal_ref}</span>
          <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: roleInfo.bg, color: roleInfo.color }}>
            {roleInfo.label}
          </span>
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: cfg?.bg ?? '#f3f4f6', color: cfg?.color ?? '#6b7280' }}>
          {cfg?.label ?? deal.status}
        </span>
      </div>

      <div className="p-4 space-y-2" dir="rtl">
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-black text-[#1a2f3e]">{deal.pallet_type}</span>
          <span className="text-[10px] text-[#7a9aab]">{sourceLabel}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-bold text-[#1a2f3e]">{deal.size} · درجة {deal.quality}</span>
          <span className="text-[11px] text-[#7a9aab]">المقاس والجودة</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-bold text-[#1a2f3e]">{deal.city}</span>
          <span className="text-[11px] text-[#7a9aab]">المدينة</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-bold text-amber-700">{deal.quantity.toLocaleString()} طبلية</span>
          <span className="text-[11px] text-[#7a9aab]">الكمية</span>
        </div>

        <button
          onClick={() => setExpanded(e => !e)}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 text-[11px] text-[#7a9aab] rounded-xl hover:bg-[#f0f6fa] transition-colors"
        >
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          {expanded ? 'إخفاء التفاصيل' : 'عرض التفاصيل'}
        </button>

        {expanded && (
          <div className="space-y-2 border-t border-[#f0f6fa] pt-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-bold text-[#1a2f3e]">{counterpartyName}</span>
              <span className="text-[11px] text-[#7a9aab]">{deal.buyer_phone === myPhone ? 'المورد' : 'المشتري'}</span>
            </div>
            {(deal.supplier_price || deal.final_price) > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-bold text-[#1a2f3e]">{(deal.supplier_price ?? deal.final_price ?? 0).toLocaleString()} ر.س / طبلية</span>
                <span className="text-[11px] text-[#7a9aab]">سعر الوحدة</span>
              </div>
            )}
            {deal.platform_fee_per_pallet != null && (
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-bold text-amber-600">{deal.platform_fee_per_pallet} ر.س / طبلية</span>
                <span className="text-[11px] text-[#7a9aab]">عمولة المنصة</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-[#9ab0bf]">
                {new Date(deal.created_at).toLocaleDateString('ar-SA', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
              <span className="text-[11px] text-[#7a9aab]">تاريخ الإنشاء</span>
            </div>
            {isCompleted && deal.completed_at && (
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-emerald-600">
                  {new Date(deal.completed_at).toLocaleDateString('ar-SA', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
                <span className="text-[11px] text-[#7a9aab]">تاريخ الإكمال</span>
              </div>
            )}
            {deal.cancel_reason && (
              <div className="bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                <p className="text-[11px] text-red-600 font-bold">{deal.cancel_reason}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function MyDealsTab({ deals, myPhone, getCounterpartyName, loading }: Props) {
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');

  const filteredDeals = activeFilter === 'all'
    ? deals
    : deals.filter(d => STATUS_TO_FILTER[d.status] === activeFilter);

  const counts: Record<FilterTab, number> = {
    all: deals.length,
    pending: deals.filter(d => STATUS_TO_FILTER[d.status] === 'pending').length,
    negotiation: deals.filter(d => STATUS_TO_FILTER[d.status] === 'negotiation').length,
    completed: deals.filter(d => STATUS_TO_FILTER[d.status] === 'completed').length,
    failed: deals.filter(d => STATUS_TO_FILTER[d.status] === 'failed').length,
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-40 bg-white rounded-2xl animate-pulse border border-gray-100" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {FILTER_TABS.map(({ id, label, icon: Icon }) => {
          const count = counts[id];
          const isActive = activeFilter === id;
          return (
            <button
              key={id}
              onClick={() => setActiveFilter(id)}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold transition-all active:scale-[0.96]"
              style={{
                background: isActive ? '#0f2535' : 'rgba(255,255,255,0.8)',
                color: isActive ? 'white' : '#5a7a8a',
                border: `1px solid ${isActive ? 'transparent' : 'rgba(255,255,255,0.9)'}`,
                boxShadow: isActive ? '0 2px 8px rgba(15,37,53,0.2)' : '0 1px 3px rgba(0,0,0,0.04)',
              }}
            >
              <Icon className="w-3 h-3" />
              {label}
              {count > 0 && (
                <span
                  className="text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center"
                  style={{
                    background: isActive ? 'rgba(255,255,255,0.2)' : '#e2ecf3',
                    color: isActive ? 'white' : '#2c5f7c',
                  }}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {filteredDeals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="w-16 h-16 rounded-2xl bg-white border border-dashed border-[#d0e6f0] flex items-center justify-center">
            <Handshake className="w-7 h-7 text-[#c0d5e0]" />
          </div>
          <p className="text-[13px] font-bold text-[#a0b5c0]">لا توجد صفقات</p>
          <p className="text-[11px] text-[#c0d0da] text-center px-8">الصفقات التي تنشأ من بطاقات السوق ستظهر هنا</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredDeals.map(deal => (
            <DealCard key={deal.id} deal={deal} myPhone={myPhone} getCounterpartyName={getCounterpartyName} />
          ))}
        </div>
      )}
    </div>
  );
}
