import { DollarSign, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { CommissionRecord } from '../../../hooks/useAccountData';

interface Props {
  commissions: CommissionRecord[];
  pendingCommissions: CommissionRecord[];
  totalPendingCommission: number;
  loading: boolean;
}

function CommissionCard({ record }: { record: CommissionRecord }) {
  const isPending = record.status === 'pending';

  return (
    <div
      className="bg-white rounded-2xl shadow-sm overflow-hidden"
      style={{ border: `1.5px solid ${isPending ? '#fed7aa' : '#bbf7d0'}` }}
    >
      <div
        className="flex items-center justify-between px-4 py-2.5"
        style={{
          background: isPending ? 'linear-gradient(135deg, #b45309, #d97706)' : 'linear-gradient(135deg, #059669, #047857)',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <span className="text-[10px] font-mono text-white/60">
          {record.deal_ref ?? record.deal_id?.slice(0, 8)}
        </span>
        <div className="flex items-center gap-1.5">
          {isPending ? (
            <AlertCircle className="w-3 h-3 text-yellow-200" />
          ) : (
            <CheckCircle2 className="w-3 h-3 text-white" />
          )}
          <span className="text-[10px] font-bold text-white">{isPending ? 'عمولة معلقة' : 'عمولة مسددة'}</span>
        </div>
      </div>

      <div className="p-4 space-y-2" dir="rtl">
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-bold text-[#1a2f3e]">{record.quantity.toLocaleString()} طبلية</span>
          <span className="text-[11px] text-[#7a9aab]">الكمية</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-bold text-[#1a2f3e]">{record.commission_per_unit.toLocaleString()} ر.س / طبلية</span>
          <span className="text-[11px] text-[#7a9aab]">عمولة الوحدة</span>
        </div>
        <div className="border-t border-[#f0f6fa] pt-2.5">
          <div
            className="flex items-center justify-between rounded-xl px-3 py-2.5"
            style={{ background: isPending ? '#FFF7ED' : '#f0fdf4', border: `1px solid ${isPending ? '#FED7AA' : '#bbf7d0'}` }}
          >
            <span className="text-[16px] font-black" style={{ color: isPending ? '#b45309' : '#059669' }}>
              {record.total_commission.toLocaleString()} ر.س
            </span>
            <span className="text-[11px]" style={{ color: isPending ? '#d97706' : '#047857' }}>إجمالي العمولة</span>
          </div>
        </div>
        <p className="text-[10px] text-[#9ab0bf] text-center">
          {new Date(record.created_at).toLocaleDateString('ar-SA', { day: 'numeric', month: 'short', year: 'numeric' })}
        </p>
      </div>
    </div>
  );
}

export default function CommissionsTab({ commissions, pendingCommissions, totalPendingCommission, loading }: Props) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2].map(i => (
          <div key={i} className="h-40 bg-white rounded-2xl animate-pulse border border-gray-100" />
        ))}
      </div>
    );
  }

  const paidCommissions = commissions.filter(c => c.status !== 'pending');
  const totalPaid = paidCommissions.reduce((s, c) => s + (c.total_commission ?? 0), 0);
  const totalAll = commissions.reduce((s, c) => s + (c.total_commission ?? 0), 0);

  return (
    <div className="space-y-4" dir="rtl">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl p-4" style={{ background: 'linear-gradient(135deg, #b45309, #d97706)', boxShadow: '0 4px 20px rgba(180,83,9,0.25)' }}>
          <AlertCircle className="w-5 h-5 text-yellow-200 mb-2" />
          <p className="text-[11px] text-white/70">عمولات معلقة</p>
          <p className="text-[20px] font-black text-white">{totalPendingCommission.toLocaleString()}<span className="text-[11px] font-normal text-white/60 mr-1">ر.س</span></p>
          <p className="text-[10px] text-white/50 mt-0.5">{pendingCommissions.length} صفقة</p>
        </div>
        <div className="rounded-2xl p-4" style={{ background: 'linear-gradient(135deg, #059669, #047857)', boxShadow: '0 4px 20px rgba(5,150,105,0.25)' }}>
          <CheckCircle2 className="w-5 h-5 text-white mb-2" />
          <p className="text-[11px] text-white/70">عمولات مسددة</p>
          <p className="text-[20px] font-black text-white">{totalPaid.toLocaleString()}<span className="text-[11px] font-normal text-white/60 mr-1">ر.س</span></p>
          <p className="text-[10px] text-white/50 mt-0.5">{paidCommissions.length} صفقة</p>
        </div>
      </div>

      {totalAll > 0 && (
        <div className="flex items-center justify-between px-4 py-3 rounded-2xl" style={{ background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(255,255,255,0.9)' }}>
          <span className="text-[15px] font-black text-[#1a2f3e]">{totalAll.toLocaleString()} ر.س</span>
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-[#7a9aab]" />
            <span className="text-[12px] font-bold text-[#7a9aab]">إجمالي العمولات</span>
          </div>
        </div>
      )}

      {pendingCommissions.length > 0 && (
        <div>
          <p className="text-[12px] font-black text-[#1a2f3e] mb-2 px-1">عمولات معلقة ({pendingCommissions.length})</p>
          <div className="space-y-3">
            {pendingCommissions.map(c => <CommissionCard key={c.id} record={c} />)}
          </div>
        </div>
      )}

      {paidCommissions.length > 0 && (
        <div>
          <p className="text-[12px] font-black text-[#1a2f3e] mb-2 px-1">عمولات مسددة ({paidCommissions.length})</p>
          <div className="space-y-3">
            {paidCommissions.map(c => <CommissionCard key={c.id} record={c} />)}
          </div>
        </div>
      )}

      {commissions.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="w-16 h-16 rounded-2xl bg-white border border-dashed border-[#d0e6f0] flex items-center justify-center">
            <DollarSign className="w-7 h-7 text-[#c0d5e0]" />
          </div>
          <p className="text-[13px] font-bold text-[#a0b5c0]">لا توجد عمولات</p>
          <p className="text-[11px] text-[#c0d0da] text-center px-8">
            عند إتمام صفقة ناجحة والضغط على "تم التسليم" يتم تسجيل العمولة هنا
          </p>
        </div>
      )}
    </div>
  );
}
