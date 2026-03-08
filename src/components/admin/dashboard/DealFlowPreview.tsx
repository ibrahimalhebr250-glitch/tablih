import { Clock, ArrowLeft } from 'lucide-react';
import type { DealCard, DealFlow } from '../../../hooks/useAdminDashboard';

interface Props {
  dealFlow: DealFlow | null;
  loading: boolean;
  onViewAll: (status: string) => void;
  compact?: boolean;
}

const COLUMNS: { key: keyof DealFlow; label: string; color: string; bg: string; border: string }[] = [
  { key: 'pending_supplier', label: 'بانتظار المورد', color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  { key: 'awaiting_buyer', label: 'بانتظار المشتري', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
  { key: 'execution_in_progress', label: 'قيد التنفيذ', color: '#0891b2', bg: '#ecfeff', border: '#a5f3fc' },
  { key: 'completed', label: 'مكتملة', color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
  { key: 'cancelled', label: 'ملغاة', color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
];

function waitingTime(createdAt: string): string {
  const diff = Date.now() - new Date(createdAt).getTime();
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 1) return '< 1 س';
  if (hours < 24) return `${hours} س`;
  return `${Math.floor(hours / 24)} ي`;
}

function MiniDealCard({ deal, color }: { deal: DealCard; color: string }) {
  return (
    <div className="bg-white rounded-xl p-3 border border-slate-200/60 space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold" style={{ color }}>{deal.deal_ref ?? deal.id.slice(0, 8)}</span>
        <div className="flex items-center gap-1 text-slate-400">
          <Clock className="w-3 h-3" />
          <span className="text-[9px]">{waitingTime(deal.created_at)}</span>
        </div>
      </div>
      <p className="text-[12px] font-bold text-slate-900">{deal.city}</p>
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-slate-500">{deal.quantity?.toLocaleString('ar-SA') ?? 0} طبلية</span>
      </div>
    </div>
  );
}

function Column({ col, deals, loading }: { col: (typeof COLUMNS)[0]; deals: DealCard[]; loading: boolean }) {
  return (
    <div
      className="flex-1 min-w-[150px] rounded-2xl p-3 space-y-2"
      style={{ background: col.bg, border: `1px solid ${col.border}` }}
    >
      <div className="flex items-center justify-between mb-1">
        <p className="text-[11px] font-bold" style={{ color: col.color }}>{col.label}</p>
        <span
          className="text-[10px] font-black px-2 py-0.5 rounded-full"
          style={{ background: `${col.color}15`, color: col.color }}
        >
          {loading ? '-' : deals.length}
        </span>
      </div>

      {loading ? (
        Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="h-16 bg-white rounded-xl animate-pulse" />
        ))
      ) : deals.length === 0 ? (
        <div className="h-16 flex items-center justify-center">
          <p className="text-[10px] text-slate-400">لا توجد صفقات</p>
        </div>
      ) : (
        deals.map(d => <MiniDealCard key={d.id} deal={d} color={col.color} />)
      )}
    </div>
  );
}

export default function DealFlowPreview({ dealFlow, loading, onViewAll, compact = false }: Props) {
  const totalDeals = dealFlow
    ? Object.values(dealFlow).reduce((sum, deals) => sum + deals.length, 0)
    : 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <button
          onClick={() => onViewAll('deals')}
          className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors"
        >
          عرض جميع الصفقات
          <ArrowLeft className="w-3 h-3" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          <span className="text-xs text-slate-600">
            إجمالي: <span className="font-bold text-slate-900">{totalDeals}</span>
          </span>
        </div>
      </div>
      <div className={`flex gap-3 overflow-x-auto pb-2 ${compact ? 'flex-wrap' : ''}`} style={{ scrollbarWidth: 'thin' }}>
        {COLUMNS.map(col => (
          <Column
            key={col.key}
            col={col}
            deals={dealFlow?.[col.key] ?? []}
            loading={loading}
          />
        ))}
      </div>
    </div>
  );
}
