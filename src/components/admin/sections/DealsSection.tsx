import { useState } from 'react';
import {
  BarChart2, Zap, ShoppingBag, Lock,
  AlertTriangle, CheckCircle2, XCircle, Package,
  RefreshCw, Eye, Trash2, Ban, BellRing, Send, ChevronDown, X
} from 'lucide-react';
import { useAdminDeals } from '../../../hooks/useAdminDeals';
import type { AdminDealFilter, AdminDealRow } from '../../../hooks/useAdminDeals';
import { DEAL_STATUS_CONFIG } from '../../../types/deal';

interface MetricCardProps {
  label: string;
  value: number | string;
  sub?: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
  active?: boolean;
  badge?: string;
  badgeColor?: string;
  onClick: () => void;
  loading?: boolean;
}

function MetricCard({ label, value, sub, icon, color, bg, active, badge, badgeColor, onClick, loading }: MetricCardProps) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-start gap-2 rounded-2xl p-4 transition-all w-full text-left border-2"
      style={{
        background: active ? bg : 'white',
        borderColor: active ? color : '#e8f0f5',
        boxShadow: active ? `0 0 0 3px ${color}22` : '0 1px 3px rgba(0,0,0,0.06)',
      }}
    >
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-1.5">
          {badge && (
            <span
              className="text-[9px] font-black px-1.5 py-0.5 rounded-full"
              style={{ background: badgeColor ?? color, color: 'white' }}
            >
              {badge}
            </span>
          )}
        </div>
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{ background: bg, color }}
        >
          {icon}
        </div>
      </div>
      {loading ? (
        <div className="h-7 w-12 bg-gray-100 rounded-lg animate-pulse" />
      ) : (
        <p className="text-[22px] font-black leading-none" style={{ color: '#1a2f3e' }}>{value}</p>
      )}
      <div>
        <p className="text-[11px] font-semibold text-[#3a5a6e]">{label}</p>
        {sub && <p className="text-[10px] text-[#7a9aab] mt-0.5">{sub}</p>}
      </div>
    </button>
  );
}

const FILTER_LABELS: Record<AdminDealFilter, string> = {
  all:              'جميع الصفقات',
  pending_supplier: 'بانتظار المورد',
  awaiting_buyer:   'بانتظار المشتري',
  active_deals:     'صفقات نشطة',
  stalled_deals:    'صفقات متأخرة',
  completed_deals:  'صفقات مكتملة',
  cancelled_deals:  'صفقات ملغاة',
};

const TYPE_MAP: Record<string, string> = {
  wooden: 'خشبية', plastic: 'بلاستيكية', recycled: 'معاد تدويرها',
};
const QUALITY_MAP: Record<string, string> = {
  A: 'A', B: 'B', C: 'C', scrap: 'خردة',
};

interface DealDetailSheetProps {
  deal: AdminDealRow;
  onClose: () => void;
  onFreeze: (id: string) => void;
  onCancel: (id: string) => void;
  onDelete: (id: string) => void;
  onReminder: (id: string) => void;
  busy: boolean;
}

function DealDetailSheet({ deal, onClose, onFreeze, onCancel, onDelete, onReminder, busy }: DealDetailSheetProps) {
  const [confirmAction, setConfirmAction] = useState<'cancel' | 'delete' | null>(null);
  const cfg = DEAL_STATUS_CONFIG[deal.status as keyof typeof DEAL_STATUS_CONFIG];

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg rounded-t-3xl overflow-hidden"
        style={{ background: '#f4f9fc', maxHeight: '85vh' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#e2edf5]" style={{ background: '#1a4a5e' }}>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
            <X className="w-4 h-4 text-white" />
          </button>
          <div className="text-right">
            <p className="text-[14px] font-bold text-white">تفاصيل الصفقة</p>
            <p className="text-[10px] text-white/60 font-mono">{deal.deal_ref}</p>
          </div>
        </div>

        <div className="overflow-y-auto p-5 space-y-4" style={{ maxHeight: 'calc(85vh - 60px)' }}>
          {cfg && (
            <div className="flex justify-end">
              <span
                className="text-[11px] font-bold px-3 py-1 rounded-full"
                style={{ background: cfg.bg, color: cfg.color }}
              >
                {cfg.label}
              </span>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-[#e2edf5] p-4 space-y-2.5 text-[12px]">
            <p className="text-[13px] font-bold text-[#1a2f3e] text-right mb-3">معلومات الصفقة</p>
            <InfoRow label="المشتري" value={deal.buyer_name} />
            <InfoRow label="المورد" value={deal.supplier_name} />
            <InfoRow label="المدينة" value={deal.city} />
            <InfoRow label="النوع" value={`${TYPE_MAP[deal.pallet_type] ?? deal.pallet_type} · ${deal.size}`} />
            <InfoRow label="الجودة" value={`درجة ${QUALITY_MAP[deal.quality] ?? deal.quality}`} />
            <InfoRow label="الكمية" value={`${deal.quantity.toLocaleString('ar-SA')} طبلية`} />
            {deal.supplier_price != null && (
              <InfoRow label="سعر المورد" value={`${deal.supplier_price.toLocaleString('ar-SA')} ر.س`} />
            )}
            {deal.platform_fee != null && (
              <InfoRow label="رسوم المنصة" value={`${deal.platform_fee.toLocaleString('ar-SA')} ر.س`} />
            )}
            <InfoRow label="إجمالي الوحدة" value={`${deal.final_price.toLocaleString('ar-SA')} ر.س`} />
            <InfoRow label="التاريخ" value={new Date(deal.created_at).toLocaleDateString('ar-SA')} />
            {deal.cancel_reason && <InfoRow label="سبب الإلغاء" value={deal.cancel_reason} red />}
            {deal.admin_notes && <InfoRow label="ملاحظات الإدارة" value={deal.admin_notes} />}
          </div>

          {deal.is_suspended && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 flex items-center gap-2 justify-end" dir="rtl">
              <Lock className="w-3.5 h-3.5 text-amber-600" />
              <span className="text-[11px] font-bold text-amber-700">هذه الصفقة مجمّدة من الإدارة</span>
            </div>
          )}

          {confirmAction ? (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 space-y-3">
              <p className="text-[13px] font-bold text-[#dc2626] text-right">
                {confirmAction === 'cancel' ? 'تأكيد إلغاء الصفقة؟' : 'تأكيد حذف الصفقة نهائياً؟'}
              </p>
              <p className="text-[11px] text-[#7a9aab] text-right">
                {confirmAction === 'cancel'
                  ? 'سيتم إلغاء الصفقة وتحرير المخزون المحجوز.'
                  : 'سيتم حذف الصفقة بشكل دائم ولا يمكن التراجع عنه.'}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmAction(null)}
                  className="flex-1 py-2.5 rounded-xl bg-white border border-gray-200 text-[12px] font-bold text-[#4a6a7e]"
                >
                  تراجع
                </button>
                <button
                  disabled={busy}
                  onClick={() => {
                    if (confirmAction === 'cancel') onCancel(deal.id);
                    else onDelete(deal.id);
                    setConfirmAction(null);
                    onClose();
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-[#dc2626] text-white text-[12px] font-bold disabled:opacity-50"
                >
                  {busy ? 'جارٍ...' : 'تأكيد'}
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <ActionBtn
                icon={<Lock className="w-3.5 h-3.5" />}
                label={deal.is_suspended ? 'رفع التجميد' : 'تجميد'}
                color={deal.is_suspended ? '#16a34a' : '#f59e0b'}
                bg={deal.is_suspended ? '#f0fdf4' : '#fffbeb'}
                onClick={() => { onFreeze(deal.id); onClose(); }}
                busy={busy}
              />
              {deal.status !== 'cancelled' && (
                <ActionBtn
                  icon={<Ban className="w-3.5 h-3.5" />}
                  label="إلغاء"
                  color="#dc2626"
                  bg="#fef2f2"
                  onClick={() => setConfirmAction('cancel')}
                  busy={false}
                />
              )}
              <ActionBtn
                icon={<BellRing className="w-3.5 h-3.5" />}
                label="تذكير المورد"
                color="#2563eb"
                bg="#eff6ff"
                onClick={() => { onReminder(deal.id); onClose(); }}
                busy={busy}
              />
              <ActionBtn
                icon={<Trash2 className="w-3.5 h-3.5" />}
                label="حذف نهائي"
                color="#7f1d1d"
                bg="#fff1f2"
                onClick={() => setConfirmAction('delete')}
                busy={false}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value, red }: { label: string; value: string; red?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className={`font-medium ${red ? 'text-[#dc2626]' : 'text-[#1a2f3e]'}`}>{value}</span>
      <span className="text-[#7a9aab] flex-shrink-0">{label}</span>
    </div>
  );
}

function ActionBtn({ icon, label, color, bg, onClick, busy }: {
  icon: React.ReactNode; label: string; color: string; bg: string;
  onClick: () => void; busy: boolean;
}) {
  return (
    <button
      disabled={busy}
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-[12px] font-bold transition-all hover:opacity-80 disabled:opacity-40 justify-center"
      style={{ background: bg, color }}
    >
      {icon}{label}
    </button>
  );
}

function DealRow({ deal, onView, onFreeze, onCancel, onDelete, onReminder, busy }: {
  deal: AdminDealRow;
  onView: () => void;
  onFreeze: () => void;
  onCancel: () => void;
  onDelete: () => void;
  onReminder: () => void;
  busy: boolean;
}) {
  const cfg = DEAL_STATUS_CONFIG[deal.status as keyof typeof DEAL_STATUS_CONFIG];
  const [showActions, setShowActions] = useState(false);
  const isStalled = ['inventory_reserved', 'execution_in_progress', 'in_delivery'].includes(deal.status) &&
    deal.reserved_at != null &&
    new Date(deal.reserved_at).getTime() < Date.now() - 3 * 24 * 60 * 60 * 1000;

  return (
    <tr
      className="border-t border-[#edf4f9] hover:bg-[#f7fbfd] transition-colors"
      style={{ opacity: deal.is_suspended ? 0.6 : 1 }}
    >
      <td className="px-4 py-3">
        <div className="flex flex-col items-start gap-0.5">
          <span className="text-[11px] font-mono text-[#4a7a94]">{deal.deal_ref}</span>
          {deal.is_suspended && (
            <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">مجمّد</span>
          )}
          {isStalled && (
            <span className="text-[9px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full">متأخر</span>
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        <span className="text-[12px] font-medium text-[#1a2f3e] block max-w-[100px] truncate">{deal.buyer_name}</span>
      </td>
      <td className="px-4 py-3">
        <span className="text-[12px] font-medium text-[#1a2f3e] block max-w-[100px] truncate">{deal.supplier_name}</span>
      </td>
      <td className="px-4 py-3">
        <span className="text-[12px] text-[#4a7a94]">{deal.city}</span>
      </td>
      <td className="px-4 py-3">
        <span className="text-[12px] text-[#4a7a94]">{deal.size}</span>
      </td>
      <td className="px-4 py-3">
        <span className="text-[12px] font-bold text-[#1a2f3e]">{deal.quantity.toLocaleString('ar-SA')}</span>
      </td>
      <td className="px-4 py-3">
        {deal.supplier_price != null
          ? <span className="text-[12px] text-[#1a2f3e]">{deal.supplier_price.toLocaleString('ar-SA')}</span>
          : <span className="text-[11px] text-[#c0d0da]">—</span>
        }
      </td>
      <td className="px-4 py-3">
        {deal.platform_fee != null
          ? <span className="text-[12px] text-[#f97316]">{deal.platform_fee.toLocaleString('ar-SA')}</span>
          : <span className="text-[11px] text-[#c0d0da]">—</span>
        }
      </td>
      <td className="px-4 py-3">
        {cfg ? (
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap"
            style={{ background: cfg.bg, color: cfg.color }}
          >
            {cfg.label}
          </span>
        ) : (
          <span className="text-[11px] text-[#c0d0da]">{deal.status}</span>
        )}
      </td>
      <td className="px-4 py-3">
        <span className="text-[11px] text-[#7a9aab]">
          {new Date(deal.created_at).toLocaleDateString('ar-SA')}
        </span>
      </td>
      <td className="px-4 py-3 relative">
        <div className="flex items-center gap-1">
          <button
            onClick={onView}
            className="p-1.5 rounded-lg bg-[#e8f4fd] text-[#2563eb] hover:bg-[#dbeafe] transition-colors"
            title="عرض"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setShowActions(!showActions)}
            className="p-1.5 rounded-lg bg-[#f0f6fa] text-[#4a7a94] hover:bg-[#e2edf5] transition-colors"
            title="المزيد"
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showActions ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {showActions && (
          <div
            className="absolute left-0 top-full z-10 mt-1 rounded-xl border border-[#e2edf5] shadow-lg overflow-hidden"
            style={{ background: 'white', minWidth: '140px' }}
          >
            <button
              disabled={busy}
              onClick={() => { onFreeze(); setShowActions(false); }}
              className="flex items-center gap-2 w-full px-3 py-2 text-[12px] font-medium text-[#f59e0b] hover:bg-amber-50 transition-colors disabled:opacity-40"
            >
              <Lock className="w-3.5 h-3.5" />
              {deal.is_suspended ? 'رفع التجميد' : 'تجميد'}
            </button>
            {deal.status !== 'cancelled' && (
              <button
                disabled={busy}
                onClick={() => { onCancel(); setShowActions(false); }}
                className="flex items-center gap-2 w-full px-3 py-2 text-[12px] font-medium text-[#dc2626] hover:bg-red-50 transition-colors disabled:opacity-40"
              >
                <Ban className="w-3.5 h-3.5" />
                إلغاء
              </button>
            )}
            <button
              disabled={busy}
              onClick={() => { onReminder(); setShowActions(false); }}
              className="flex items-center gap-2 w-full px-3 py-2 text-[12px] font-medium text-[#2563eb] hover:bg-blue-50 transition-colors disabled:opacity-40"
            >
              <BellRing className="w-3.5 h-3.5" />
              تذكير
            </button>
            <button
              disabled={busy}
              onClick={() => { onDelete(); setShowActions(false); }}
              className="flex items-center gap-2 w-full px-3 py-2 text-[12px] font-medium text-[#7f1d1d] hover:bg-red-50 transition-colors disabled:opacity-40 border-t border-[#f0f6fa]"
            >
              <Trash2 className="w-3.5 h-3.5" />
              حذف نهائي
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}

export default function DealsSection() {
  const {
    metrics, deals, activeFilter,
    loadingMetrics, loadingDeals, actionBusy,
    selectFilter, freezeDeal, cancelDeal, deleteDeal, sendReminder, sendBatchReminders, refresh,
  } = useAdminDeals();

  const [selectedDeal, setSelectedDeal] = useState<AdminDealRow | null>(null);

  const metricCards = [
    {
      id: 'pending_supplier' as AdminDealFilter,
      label: 'بانتظار المورد',
      sub: 'صفقات جديدة تنتظر اعتماد المورد',
      value: metrics?.pending_supplier ?? 0,
      icon: <Zap className="w-4 h-4" />,
      color: '#d97706', bg: '#fffbeb',
      badge: (metrics?.pending_supplier ?? 0) > 0 ? 'جديد' : undefined,
      badgeColor: '#d97706',
    },
    {
      id: 'awaiting_buyer' as AdminDealFilter,
      label: 'بانتظار المشتري',
      sub: 'المورد أكّد، ينتظر المشتري',
      value: metrics?.awaiting_buyer ?? 0,
      icon: <ShoppingBag className="w-4 h-4" />,
      color: '#2563eb', bg: '#eff6ff',
    },
    {
      id: 'active_deals' as AdminDealFilter,
      label: 'قيد التنفيذ',
      sub: 'صفقات نشطة قيد التنفيذ',
      value: metrics?.active_deals ?? 0,
      icon: <BarChart2 className="w-4 h-4" />,
      color: '#16a34a', bg: '#f0fdf4',
    },
    {
      id: 'stalled_deals' as AdminDealFilter,
      label: 'صفقات متأخرة',
      sub: 'أكثر من 3 أيام بدون تقدم',
      value: metrics?.stalled_deals ?? 0,
      icon: <AlertTriangle className="w-4 h-4" />,
      color: '#dc2626', bg: '#fef2f2',
      badge: (metrics?.stalled_deals ?? 0) > 0 ? '!' : undefined,
      badgeColor: '#dc2626',
    },
    {
      id: 'completed_deals' as AdminDealFilter,
      label: 'مكتملة',
      sub: 'تمت بنجاح',
      value: metrics?.completed_deals ?? 0,
      icon: <CheckCircle2 className="w-4 h-4" />,
      color: '#4b5563', bg: '#f9fafb',
    },
    {
      id: 'cancelled_deals' as AdminDealFilter,
      label: 'ملغاة',
      sub: 'تم إلغاؤها',
      value: metrics?.cancelled_deals ?? 0,
      icon: <XCircle className="w-4 h-4" />,
      color: '#991b1b', bg: '#fef2f2',
    },
    {
      id: 'all' as AdminDealFilter,
      label: 'إجمالي الصفقات',
      sub: `${(metrics?.volume_today ?? 0).toLocaleString('ar-SA')} طبلية اليوم`,
      value: metrics?.total_deals ?? 0,
      icon: <Package className="w-4 h-4" />,
      color: '#0e7490', bg: '#ecfeff',
    },
  ];

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => sendBatchReminders()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#fef3c7] text-[#b45309] text-[12px] font-bold hover:bg-[#fde68a] transition-colors border border-[#fde68a]"
          >
            <Send className="w-3.5 h-3.5" />
            تذكير جماعي للمتأخرين
          </button>
          <button
            onClick={refresh}
            className="w-8 h-8 rounded-xl bg-[#f0f6fa] text-[#4a7a94] hover:bg-[#e2edf5] flex items-center justify-center transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loadingDeals ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <div>
          <h2 className="text-[20px] font-black text-[#1a2f3e]">الصفقات</h2>
          <p className="text-[12px] text-[#7a9aab]">مراقبة وإدارة جميع الصفقات على المنصة</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {metricCards.map(card => (
          <MetricCard
            key={card.id}
            label={card.label}
            sub={card.sub}
            value={card.value}
            icon={card.icon}
            color={card.color}
            bg={card.bg}
            badge={card.badge}
            badgeColor={card.badgeColor}
            active={activeFilter === card.id}
            onClick={() => selectFilter(card.id)}
            loading={loadingMetrics}
          />
        ))}
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {activeFilter !== 'all' && (
              <button
                onClick={() => selectFilter('all')}
                className="flex items-center gap-1 text-[11px] text-[#7a9aab] hover:text-[#1a4a5e] transition-colors"
              >
                <X className="w-3 h-3" />
                إلغاء التصفية
              </button>
            )}
          </div>
          <h3 className="text-[14px] font-bold text-[#1a2f3e]">
            {FILTER_LABELS[activeFilter]}
            <span className="text-[11px] font-normal text-[#7a9aab] mr-2">({deals.length})</span>
          </h3>
        </div>

        {loadingDeals ? (
          <div className="rounded-2xl border border-[#e2edf5] overflow-hidden">
            <div className="h-12 bg-[#f0f6fa]" />
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-14 border-t border-[#edf4f9] px-4 py-3 flex gap-4">
                {[1, 2, 3, 4, 5, 6].map(j => (
                  <div key={j} className="h-4 bg-gray-100 rounded w-20 animate-pulse" />
                ))}
              </div>
            ))}
          </div>
        ) : deals.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#d0e6f0] bg-white py-16 flex flex-col items-center gap-3">
            <BarChart2 className="w-10 h-10 text-[#c0d5e0]" />
            <p className="text-[13px] font-bold text-[#a0b5c0]">لا توجد صفقات في هذا التصنيف</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-[#e2edf5] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[900px]">
                <thead>
                  <tr className="bg-[#f0f6fa]">
                    {['رقم الصفقة', 'المشتري', 'المورد', 'المدينة', 'المقاس', 'الكمية', 'سعر المورد', 'رسوم المنصة', 'الحالة', 'التاريخ', 'إجراءات'].map(col => (
                      <th key={col} className="px-4 py-3 text-right text-[11px] font-bold text-[#4a7a94] whitespace-nowrap">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {deals.map(deal => (
                    <DealRow
                      key={deal.id}
                      deal={deal}
                      onView={() => setSelectedDeal(deal)}
                      onFreeze={() => freezeDeal(deal.id)}
                      onCancel={() => cancelDeal(deal.id)}
                      onDelete={() => deleteDeal(deal.id)}
                      onReminder={() => sendReminder(deal.id)}
                      busy={!!actionBusy[deal.id]}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {selectedDeal && (
        <DealDetailSheet
          deal={selectedDeal}
          onClose={() => setSelectedDeal(null)}
          onFreeze={freezeDeal}
          onCancel={cancelDeal}
          onDelete={deleteDeal}
          onReminder={sendReminder}
          busy={!!actionBusy[selectedDeal.id]}
        />
      )}
    </div>
  );
}
