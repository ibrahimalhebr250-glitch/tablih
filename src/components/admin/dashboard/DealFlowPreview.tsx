import { Clock, ArrowLeft } from 'lucide-react';
import type { DealCard, DealFlow } from '../../../hooks/useAdminDashboard';

interface Props {
  dealFlow: DealFlow | null;
  loading: boolean;
  onViewAll: (status: string) => void;
}

const COLUMNS: { key: keyof DealFlow; label: string; color: string; bg: string; border: string }[] = [
  { key: 'awaiting_payment', label: 'بانتظار الدفع', color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
  { key: 'paid', label: 'مدفوعة', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
  { key: 'preparing', label: 'قيد التجهيز', color: '#ca8a04', bg: '#fefce8', border: '#fde68a' },
  { key: 'delivered', label: 'مسلّمة', color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
  { key: 'settlement_pending', label: 'تسوية معلقة', color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
];

function waitingTime(createdAt: string): string {
  const diff = Date.now() - new Date(createdAt).getTime();
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 1) return `< ١ س`;
  if (hours < 24) return `${hours} س`;
  return `${Math.floor(hours / 24)} ي`;
}

function MiniDealCard({ deal, color }: { deal: DealCard; color: string }) {
  return (
    <div className="bg-white rounded-xl p-3 border border-[#e8f0f5] space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold" style={{ color }}>{deal.deal_ref ?? deal.id.slice(0, 8)}</span>
        <div className="flex items-center gap-1 text-[#7a9aab]">
          <Clock className="w-3 h-3" />
          <span className="text-[9px]">{waitingTime(deal.created_at)}</span>
        </div>
      </div>
      <p className="text-[12px] font-bold text-[#1a2f3e]">{deal.city}</p>
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-[#7a9aab]">{deal.quantity?.toLocaleString('ar-SA') ?? 0} طبلية</span>
        <span className="text-[11px] font-bold text-[#1a2f3e]">{(deal.buyer_price ?? 0).toLocaleString('ar-SA')} ر.س</span>
      </div>
    </div>
  );
}

function Column({
  col,
  deals,
  loading,
  onViewAll,
}: {
  col: (typeof COLUMNS)[0];
  deals: DealCard[];
  loading: boolean;
  onViewAll: (s: string) => void;
}) {
  return (
    <div
      className="flex-1 min-w-[160px] rounded-2xl p-3 space-y-2"
      style={{ background: col.bg, border: `1px solid ${col.border}` }}
    >
      <div className="flex items-center justify-between mb-1">
        <p className="text-[12px] font-bold" style={{ color: col.color }}>{col.label}</p>
        <span
          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
          style={{ background: col.color + '18', color: col.color }}
        >
          {loading ? '—' : deals.length}
        </span>
      </div>

      {loading ? (
        Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-16 bg-white rounded-xl animate-pulse" />
        ))
      ) : deals.length === 0 ? (
        <div className="h-16 flex items-center justify-center">
          <p className="text-[10px] text-[#7a9aab]">لا توجد صفقات</p>
        </div>
      ) : (
        deals.map(d => <MiniDealCard key={d.id} deal={d} color={col.color} />)
      )}

      <button
        onClick={() => onViewAll(col.key)}
        className="w-full flex items-center justify-center gap-1 py-1.5 rounded-xl text-[10px] font-bold transition-all hover:opacity-80"
        style={{ color: col.color, background: col.color + '10' }}
      >
        عرض الكل
        <ArrowLeft className="w-3 h-3" />
      </button>
    </div>
  );
}

export default function DealFlowPreview({ dealFlow, loading, onViewAll }: Props) {
  return (
    <div className="space-y-3">
      <p className="text-[13px] font-bold text-[#4a7a94] uppercase tracking-wide">تدفق الصفقات</p>
      <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'thin' }}>
        {COLUMNS.map(col => (
          <Column
            key={col.key}
            col={col}
            deals={dealFlow?.[col.key] ?? []}
            loading={loading}
            onViewAll={onViewAll}
          />
        ))}
      </div>
    </div>
  );
}
