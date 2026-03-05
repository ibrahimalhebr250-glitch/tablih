import { useState } from 'react';
import { Clock, AlertTriangle, CheckCircle, MessageCircle, Eye, Loader2 } from 'lucide-react';
import type { CommissionTab, SupplierCommission, SettledCommission, SettlementMethod } from '../../../types/admin';
import { settleCommission } from '../../../hooks/useFinance';
import SettlementDialog from './SettlementDialog';

interface Props {
  due: SupplierCommission[];
  overdue: SupplierCommission[];
  settled: SettledCommission[];
  loading: boolean;
  onRefresh: () => void;
  onViewSupplier: (phone: string) => void;
}

const tabs: { id: CommissionTab; label: string; icon: typeof Clock }[] = [
  { id: 'due', label: 'العمولات المستحقة', icon: Clock },
  { id: 'overdue', label: 'العمولات المتأخرة', icon: AlertTriangle },
  { id: 'settled', label: 'العمولات المسددة', icon: CheckCircle },
];

const methodLabels: Record<SettlementMethod, string> = {
  bank_transfer: 'تحويل بنكي',
  cash: 'نقدي',
  manual: 'تسوية يدوية',
};

function sendWhatsApp(phone: string) {
  const cleanPhone = phone.replace(/^0/, '966');
  const msg = encodeURIComponent(
    'مرحبًا\nيوجد عمولة مستحقة للمنصة مقابل صفقات الطبليات الأخيرة.\nنرجو تسويتها في أقرب وقت ممكن.\nشاكرين تعاونكم.'
  );
  window.open(`https://wa.me/${cleanPhone}?text=${msg}`, '_blank');
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' });
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-full bg-[#f7fbfd] flex items-center justify-center mb-4">
        <CheckCircle className="w-7 h-7 text-[#c5d8e4]" />
      </div>
      <p className="text-[13px] text-[#7a9aab]">{message}</p>
    </div>
  );
}

export default function CommissionCollection({ due, overdue, settled, loading, onRefresh, onViewSupplier }: Props) {
  const [activeTab, setActiveTab] = useState<CommissionTab>('due');
  const [settlementTarget, setSettlementTarget] = useState<SupplierCommission | null>(null);
  const [settling, setSettling] = useState(false);

  const handleSettle = async (method: SettlementMethod, staff: string) => {
    if (!settlementTarget) return;
    setSettling(true);
    const result = await settleCommission(settlementTarget.deal_ids, method, staff);
    setSettling(false);
    if (result.success) {
      setSettlementTarget(null);
      onRefresh();
    }
  };

  const counts = { due: due.length, overdue: overdue.length, settled: settled.length };

  return (
    <div>
      <div className="flex gap-2 border-b border-[#e2edf5] mb-5 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-[12px] font-semibold rounded-t-xl transition-all border-b-2 whitespace-nowrap ${
              activeTab === id
                ? 'text-[#1a4a5e] border-[#1a4a5e] bg-white'
                : 'text-[#7a9aab] border-transparent hover:text-[#1a4a5e]'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
            {counts[id] > 0 && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                id === 'overdue' ? 'bg-[#FEF2F2] text-[#dc2626]' :
                id === 'due' ? 'bg-[#FFFBEB] text-[#B8860B]' :
                'bg-[#F0FDF4] text-[#16a34a]'
              }`}>
                {counts[id]}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 text-[#1a4a5e] animate-spin" />
        </div>
      ) : (
        <>
          {activeTab === 'due' && (
            due.length === 0 ? <EmptyState message="لا توجد عمولات مستحقة حالياً" /> : (
              <DueTable items={due} onSettle={setSettlementTarget} onView={onViewSupplier} onWhatsApp={sendWhatsApp} />
            )
          )}

          {activeTab === 'overdue' && (
            overdue.length === 0 ? <EmptyState message="لا توجد عمولات متأخرة" /> : (
              <OverdueTable items={overdue} onSettle={setSettlementTarget} onView={onViewSupplier} onWhatsApp={sendWhatsApp} />
            )
          )}

          {activeTab === 'settled' && (
            settled.length === 0 ? <EmptyState message="لا توجد تسويات مسجلة بعد" /> : (
              <SettledTable items={settled} onView={onViewSupplier} />
            )
          )}
        </>
      )}

      {settlementTarget && (
        <SettlementDialog
          supplierName={settlementTarget.display_name}
          commissionAmount={settlementTarget.commission_amount}
          onConfirm={handleSettle}
          onClose={() => setSettlementTarget(null)}
          loading={settling}
        />
      )}
    </div>
  );
}

function DueTable({ items, onSettle, onView, onWhatsApp }: {
  items: SupplierCommission[];
  onSettle: (s: SupplierCommission) => void;
  onView: (phone: string) => void;
  onWhatsApp: (phone: string) => void;
}) {
  return (
    <div className="rounded-xl border border-[#e2edf5] overflow-hidden overflow-x-auto">
      <table className="w-full text-sm min-w-[700px]">
        <thead>
          <tr className="bg-[#f0f6fa]">
            {['المورد', 'المدينة', 'الطبليات المباعة', 'مبلغ العمولة', 'آخر صفقة', 'إجراءات'].map(col => (
              <th key={col} className="px-4 py-3 text-right text-[11px] font-semibold text-[#4a7a94]">{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.supplier_phone} className="border-t border-[#edf4f9] hover:bg-[#f7fbfd] transition-colors">
              <td className="px-4 py-3">
                <button onClick={() => onView(item.supplier_phone)} className="text-[13px] font-semibold text-[#1a4a5e] hover:underline">
                  {item.display_name}
                </button>
              </td>
              <td className="px-4 py-3 text-[12px] text-[#4a7a94]">{item.city || '-'}</td>
              <td className="px-4 py-3 text-[13px] font-bold text-[#1a2f3e]">{item.total_pallets.toLocaleString('ar-SA')}</td>
              <td className="px-4 py-3">
                <span className="text-[13px] font-bold text-[#B8860B]">{item.commission_amount.toLocaleString('ar-SA')} ريال</span>
              </td>
              <td className="px-4 py-3 text-[12px] text-[#7a9aab]">{formatDate(item.last_deal_date)}</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <button onClick={() => onView(item.supplier_phone)} className="p-1.5 rounded-lg bg-[#EBF5FF] text-[#1a4a5e] hover:bg-[#d6ecff] transition-colors" title="عرض التفاصيل">
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => onWhatsApp(item.supplier_phone)} className="p-1.5 rounded-lg bg-[#E8F8F0] text-[#16a34a] hover:bg-[#dcfce7] transition-colors" title="واتساب">
                    <MessageCircle className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => onSettle(item)} className="px-2.5 py-1 rounded-lg bg-[#16a34a] text-white text-[11px] font-semibold hover:bg-[#15803d] transition-colors">
                    تسوية
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function OverdueTable({ items, onSettle, onView, onWhatsApp }: {
  items: SupplierCommission[];
  onSettle: (s: SupplierCommission) => void;
  onView: (phone: string) => void;
  onWhatsApp: (phone: string) => void;
}) {
  return (
    <div className="rounded-xl border border-[#e2edf5] overflow-hidden overflow-x-auto">
      <table className="w-full text-sm min-w-[750px]">
        <thead>
          <tr className="bg-[#FEF2F2]">
            {['المورد', 'المدينة', 'عدد الطبليات', 'مبلغ العمولة', 'أيام التأخر', 'إجراءات'].map(col => (
              <th key={col} className="px-4 py-3 text-right text-[11px] font-semibold text-[#991B1B]">{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.supplier_phone} className="border-t border-[#fecaca]/30 hover:bg-[#FEF2F2]/50 transition-colors">
              <td className="px-4 py-3">
                <button onClick={() => onView(item.supplier_phone)} className="text-[13px] font-semibold text-[#1a4a5e] hover:underline">
                  {item.display_name}
                </button>
              </td>
              <td className="px-4 py-3 text-[12px] text-[#4a7a94]">{item.city || '-'}</td>
              <td className="px-4 py-3 text-[13px] font-bold text-[#1a2f3e]">{item.total_pallets.toLocaleString('ar-SA')}</td>
              <td className="px-4 py-3">
                <span className="text-[13px] font-bold text-[#dc2626]">{item.commission_amount.toLocaleString('ar-SA')} ريال</span>
              </td>
              <td className="px-4 py-3">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FEF2F2] text-[#dc2626] text-[11px] font-bold">
                  <AlertTriangle className="w-3 h-3" />
                  {item.days_overdue} يوم
                </span>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <button onClick={() => onWhatsApp(item.supplier_phone)} className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#E8F8F0] text-[#16a34a] text-[11px] font-semibold hover:bg-[#dcfce7] transition-colors">
                    <MessageCircle className="w-3 h-3" />
                    تذكير
                  </button>
                  <button onClick={() => onView(item.supplier_phone)} className="p-1.5 rounded-lg bg-[#EBF5FF] text-[#1a4a5e] hover:bg-[#d6ecff] transition-colors" title="عرض">
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => onSettle(item)} className="px-2.5 py-1 rounded-lg bg-[#16a34a] text-white text-[11px] font-semibold hover:bg-[#15803d] transition-colors">
                    تسوية
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SettledTable({ items, onView }: {
  items: SettledCommission[];
  onView: (phone: string) => void;
}) {
  return (
    <div className="rounded-xl border border-[#e2edf5] overflow-hidden overflow-x-auto">
      <table className="w-full text-sm min-w-[700px]">
        <thead>
          <tr className="bg-[#f0f6fa]">
            {['المورد', 'المدينة', 'الطبليات', 'مبلغ العمولة', 'تاريخ التسوية', 'طريقة التسوية'].map(col => (
              <th key={col} className="px-4 py-3 text-right text-[11px] font-semibold text-[#4a7a94]">{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-t border-[#edf4f9] hover:bg-[#f7fbfd] transition-colors">
              <td className="px-4 py-3">
                <button onClick={() => onView(item.supplier_phone)} className="text-[13px] font-semibold text-[#1a4a5e] hover:underline">
                  {item.display_name}
                </button>
              </td>
              <td className="px-4 py-3 text-[12px] text-[#4a7a94]">{item.city || '-'}</td>
              <td className="px-4 py-3 text-[13px] font-bold text-[#1a2f3e]">{item.pallet_count.toLocaleString('ar-SA')}</td>
              <td className="px-4 py-3">
                <span className="text-[13px] font-bold text-[#16a34a]">{item.commission_amount.toLocaleString('ar-SA')} ريال</span>
              </td>
              <td className="px-4 py-3 text-[12px] text-[#7a9aab]">{formatDate(item.settled_at)}</td>
              <td className="px-4 py-3">
                <span className="inline-flex px-2.5 py-1 rounded-full bg-[#F0FDF4] text-[#16a34a] text-[11px] font-semibold">
                  {methodLabels[item.settlement_method]}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
