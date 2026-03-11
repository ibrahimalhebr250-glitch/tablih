import { useState, useCallback } from 'react';
import { Receipt, DollarSign, TrendingUp, CheckCircle, Clock, Settings2, User, Loader2, Check, AlertTriangle, RefreshCw, X } from 'lucide-react';
import { useFinanceMetrics, useCommissions, settleCommission, getPlatformFee, updatePlatformFee } from '../../../hooks/useFinance';
import { useSupplierFinanceProfile } from '../../../hooks/useFinance';
import SupplierFinancialProfile from '../finance/SupplierFinancialProfile';
import SettlementDialog from '../finance/SettlementDialog';
import type { SupplierCommission, SettlementMethod } from '../../../types/admin';
import { getAdminEmail } from '../../../utils/adminAuth';
import { useEffect } from 'react';

type CommissionTab = 'overview' | 'due' | 'overdue' | 'settled' | 'settings' | 'supplier_profile';

function formatCurrency(n: number) {
  return `${n.toLocaleString('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س`;
}

function formatDate(s: string) {
  return new Date(s).toLocaleDateString('ar-SA');
}

interface SummaryCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
  loading: boolean;
}

function SummaryCard({ label, value, icon, color, bg, loading }: SummaryCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-[#e2edf5] p-4 flex items-center gap-4">
      <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: bg }}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        {loading ? (
          <div className="h-5 w-20 bg-gray-100 rounded animate-pulse mb-1" />
        ) : (
          <p className="text-lg font-black" style={{ color }}>{value}</p>
        )}
        <p className="text-[11px] font-semibold text-[#7a9aab]">{label}</p>
      </div>
    </div>
  );
}

function CommissionFeeSettings() {
  const [fee, setFee] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const feePresets = [0, 1, 2, 3, 5, 10];

  useEffect(() => {
    getPlatformFee().then(v => { setFee(v); setLoading(false); });
  }, []);

  const handleSave = async () => {
    const adminEmail = getAdminEmail();
    if (!adminEmail) { setError('غير مصرح لك بهذا الإجراء'); return; }
    setSaving(true);
    setError(null);
    const result = await updatePlatformFee(fee, adminEmail);
    setSaving(false);
    if (result.success) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } else {
      setError(result.error || 'فشل حفظ العمولة');
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="w-6 h-6 text-[#1a4a5e] animate-spin" />
    </div>
  );

  return (
    <div className="space-y-5" dir="rtl">
      {error && (
        <div className="bg-[#fef2f2] border border-[#fecaca] rounded-xl p-4 flex items-start justify-between">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-[#dc2626] flex-shrink-0 mt-0.5" />
            <p className="text-[13px] text-[#dc2626] font-semibold">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="text-[#dc2626] hover:text-[#991b1b]">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-[#e2edf5] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#e2edf5] bg-[#f7fbfd] flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#EBF5FF] flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-[#1a4a5e]" />
          </div>
          <div>
            <h4 className="text-[14px] font-bold text-[#1a2f3e]">العمولة لكل طبلية</h4>
            <p className="text-[11px] text-[#7a9aab]">المبلغ المقتطع عن كل طبلية في الصفقات الجديدة</p>
          </div>
        </div>
        <div className="p-5 space-y-4">
          <div className="bg-[#fefce8] border border-[#fde68a] rounded-xl px-4 py-3 text-[12px] text-[#92400e] leading-relaxed">
            العمولة المحددة هنا تطبق على الصفقات الجديدة فقط. الصفقات القائمة تحتفظ بالعمولة المسجلة وقت إنشائها.
          </div>

          <div>
            <p className="text-[12px] font-bold text-[#4a7a94] mb-2">قيم سريعة</p>
            <div className="flex flex-wrap gap-2">
              {feePresets.map(p => (
                <button
                  key={p}
                  onClick={() => setFee(p)}
                  className={`px-4 py-2 rounded-xl text-[12px] font-semibold border-2 transition-all ${
                    fee === p
                      ? 'border-[#1a4a5e] bg-[#1a4a5e] text-white'
                      : 'border-[#e2edf5] text-[#4a7a94] hover:border-[#c5d8e4]'
                  }`}
                >
                  {p === 0 ? 'مجاناً' : `${p} ريال`}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.01"
                min="0"
                value={fee}
                onChange={e => setFee(Math.max(0, Number(e.target.value)))}
                className="w-28 px-3 py-2 rounded-lg border border-[#d0e5f2] text-[13px] text-[#1a2f3e] text-right focus:outline-none focus:border-[#1a4a5e] bg-white"
              />
              <span className="text-[12px] text-[#7a9aab] whitespace-nowrap">ريال / طبلية</span>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-5 py-2 text-white text-[12px] font-bold rounded-xl hover:opacity-90 transition-all disabled:opacity-50"
              style={{ background: saved ? '#16a34a' : '#1a4a5e' }}
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : saved ? <Check className="w-3.5 h-3.5" /> : null}
              {saving ? 'جارٍ الحفظ...' : saved ? 'تم الحفظ' : 'حفظ'}
            </button>
          </div>

          <div className="bg-[#EBF5FF] border border-[#c5d8e4] rounded-xl p-4">
            <p className="text-[11px] text-[#4a7a94] leading-relaxed">
              القيمة الحالية المحفوظة: <span className="font-bold text-[#1a2f3e]">{fee} ريال / طبلية</span>. يتم تطبيق هذا المبلغ تلقائياً على كل صفقة جديدة عند الإنشاء.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

interface CommissionTableProps {
  items: SupplierCommission[];
  loading: boolean;
  onSettle: (item: SupplierCommission) => void;
  onViewSupplier: (phone: string) => void;
  overdue?: boolean;
}

function CommissionTable({ items, loading, onSettle, onViewSupplier, overdue }: CommissionTableProps) {
  if (loading) return (
    <div className="bg-white rounded-2xl border border-[#e2edf5] overflow-hidden">
      <div className="p-8 flex justify-center">
        <Loader2 className="w-6 h-6 text-[#1a4a5e] animate-spin" />
      </div>
    </div>
  );

  if (items.length === 0) return (
    <div className="bg-white rounded-2xl border border-[#e2edf5] p-10 text-center">
      <Receipt className="w-10 h-10 text-[#c5d8e4] mx-auto mb-3" />
      <p className="text-[13px] text-[#7a9aab] font-semibold">لا توجد عمولات</p>
    </div>
  );

  return (
    <div className="bg-white rounded-2xl border border-[#e2edf5] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-[#f0f6fa] bg-[#f7fbfd]">
              <th className="px-4 py-3 text-right font-bold text-[#4a7a94]">المورد</th>
              <th className="px-4 py-3 text-right font-bold text-[#4a7a94]">المدينة</th>
              <th className="px-4 py-3 text-right font-bold text-[#4a7a94]">الطبليات</th>
              <th className="px-4 py-3 text-right font-bold text-[#4a7a94]">إجمالي العمولة</th>
              <th className="px-4 py-3 text-right font-bold text-[#4a7a94]">آخر صفقة</th>
              {overdue && <th className="px-4 py-3 text-right font-bold text-[#4a7a94]">أيام التأخير</th>}
              <th className="px-4 py-3 text-right font-bold text-[#4a7a94]">إجراء</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f0f6fa]">
            {items.map(item => (
              <tr key={item.supplier_phone} className="hover:bg-[#f7fbfd] transition-colors">
                <td className="px-4 py-3">
                  <button
                    onClick={() => onViewSupplier(item.supplier_phone)}
                    className="flex items-center gap-2 group text-right"
                  >
                    <div className="w-7 h-7 rounded-lg bg-[#eff6ff] flex items-center justify-center flex-shrink-0">
                      <User className="w-3.5 h-3.5 text-[#2563eb]" />
                    </div>
                    <div>
                      <p className="font-bold text-[#1a2f3e] group-hover:text-[#2563eb] transition-colors">{item.display_name}</p>
                      <p className="text-[10px] text-[#7a9aab]">{item.supplier_phone}</p>
                    </div>
                  </button>
                </td>
                <td className="px-4 py-3 text-[#4a7a94]">{item.city || '—'}</td>
                <td className="px-4 py-3 font-bold text-[#1a2f3e]">{item.total_pallets}</td>
                <td className="px-4 py-3">
                  <span className="font-black text-[#1a2f3e]">{formatCurrency(item.commission_amount)}</span>
                </td>
                <td className="px-4 py-3 text-[#7a9aab]">{formatDate(item.last_deal_date)}</td>
                {overdue && (
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#fef2f2] text-[#dc2626]">
                      {item.days_overdue} يوم
                    </span>
                  </td>
                )}
                <td className="px-4 py-3">
                  <button
                    onClick={() => onSettle(item)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#f0fdf4] text-[#16a34a] text-[11px] font-bold hover:bg-[#dcfce7] transition-colors"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    تسوية
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-2 border-t border-[#f0f6fa] text-[11px] text-[#7a9aab]">{items.length} سجل</div>
    </div>
  );
}

function SettledTable({ items, loading }: { items: any[]; loading: boolean }) {
  if (loading) return (
    <div className="bg-white rounded-2xl border border-[#e2edf5] p-8 flex justify-center">
      <Loader2 className="w-6 h-6 text-[#1a4a5e] animate-spin" />
    </div>
  );

  if (items.length === 0) return (
    <div className="bg-white rounded-2xl border border-[#e2edf5] p-10 text-center">
      <CheckCircle className="w-10 h-10 text-[#c5d8e4] mx-auto mb-3" />
      <p className="text-[13px] text-[#7a9aab] font-semibold">لا توجد عمولات مدفوعة بعد</p>
    </div>
  );

  const METHOD_LABELS: Record<string, string> = {
    bank_transfer: 'تحويل بنكي',
    cash: 'نقداً',
    manual: 'يدوي',
  };

  return (
    <div className="bg-white rounded-2xl border border-[#e2edf5] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-[#f0f6fa] bg-[#f7fbfd]">
              <th className="px-4 py-3 text-right font-bold text-[#4a7a94]">المورد</th>
              <th className="px-4 py-3 text-right font-bold text-[#4a7a94]">المدينة</th>
              <th className="px-4 py-3 text-right font-bold text-[#4a7a94]">الطبليات</th>
              <th className="px-4 py-3 text-right font-bold text-[#4a7a94]">مبلغ العمولة</th>
              <th className="px-4 py-3 text-right font-bold text-[#4a7a94]">طريقة الدفع</th>
              <th className="px-4 py-3 text-right font-bold text-[#4a7a94]">بواسطة</th>
              <th className="px-4 py-3 text-right font-bold text-[#4a7a94]">تاريخ التسوية</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f0f6fa]">
            {items.map(item => (
              <tr key={item.id} className="hover:bg-[#f7fbfd] transition-colors">
                <td className="px-4 py-3">
                  <p className="font-bold text-[#1a2f3e]">{item.display_name}</p>
                  <p className="text-[10px] text-[#7a9aab]">{item.supplier_phone}</p>
                </td>
                <td className="px-4 py-3 text-[#4a7a94]">{item.city || '—'}</td>
                <td className="px-4 py-3 font-bold text-[#1a2f3e]">{item.pallet_count}</td>
                <td className="px-4 py-3 font-black text-[#1a2f3e]">{formatCurrency(item.commission_amount)}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#f0fdf4] text-[#16a34a]">
                    {METHOD_LABELS[item.settlement_method] || item.settlement_method}
                  </span>
                </td>
                <td className="px-4 py-3 text-[#7a9aab]">{item.settled_by}</td>
                <td className="px-4 py-3 text-[#7a9aab]">{formatDate(item.settled_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-2 border-t border-[#f0f6fa] text-[11px] text-[#7a9aab]">{items.length} سجل</div>
    </div>
  );
}

export default function CommissionsSection() {
  const [activeTab, setActiveTab] = useState<CommissionTab>('overview');
  const [selectedSupplier, setSelectedSupplier] = useState<string | null>(null);
  const [settleTarget, setSettleTarget] = useState<SupplierCommission | null>(null);

  const { metrics, loading: metricsLoading, refresh: refreshMetrics } = useFinanceMetrics();
  const { due, overdue, settled, loading: commissionsLoading, refresh: refreshCommissions } = useCommissions();

  const refresh = useCallback(() => {
    refreshMetrics();
    refreshCommissions();
  }, [refreshMetrics, refreshCommissions]);

  const handleViewSupplier = (phone: string) => {
    setSelectedSupplier(phone);
    setActiveTab('supplier_profile');
  };

  const handleBackFromProfile = () => {
    setSelectedSupplier(null);
    setActiveTab('due');
  };

  const handleSettleConfirm = async (method: SettlementMethod, staff: string) => {
    if (!settleTarget) return;
    await settleCommission(settleTarget.deal_ids, method, staff || getAdminEmail() || 'admin');
    setSettleTarget(null);
    refresh();
  };

  if (activeTab === 'supplier_profile' && selectedSupplier) {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        <SupplierFinancialProfile phone={selectedSupplier} onBack={handleBackFromProfile} />
      </div>
    );
  }

  const navItems: { id: CommissionTab; label: string; icon: typeof Receipt; badge?: number }[] = [
    { id: 'overview', label: 'نظرة عامة', icon: TrendingUp },
    { id: 'due', label: 'مستحقة', icon: Clock, badge: due.length },
    { id: 'overdue', label: 'متأخرة', icon: AlertTriangle, badge: overdue.length },
    { id: 'settled', label: 'مدفوعة', icon: CheckCircle },
    { id: 'settings', label: 'الإعداد', icon: Settings2 },
  ];

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5" dir="rtl">
      {settleTarget && (
        <SettlementDialog
          supplierName={settleTarget.display_name}
          commissionAmount={settleTarget.commission_amount}
          onConfirm={handleSettleConfirm}
          onClose={() => setSettleTarget(null)}
        />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-[#1a2f3e]">عمولات الموقع</h2>
          <p className="text-sm text-[#7a9aab]">إدارة ومتابعة عمولات المنصة من الصفقات</p>
        </div>
        <button
          onClick={refresh}
          className="flex items-center gap-2 px-4 py-2 bg-[#1a4a5e] text-white rounded-xl text-[12px] font-bold hover:bg-[#153d50] transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${(metricsLoading || commissionsLoading) ? 'animate-spin' : ''}`} />
          تحديث
        </button>
      </div>

      <div className="flex gap-1.5 border-b border-[#e2edf5] overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {navItems.map(({ id, label, icon: Icon, badge }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`relative flex items-center gap-2 px-4 py-2.5 text-[12px] font-semibold rounded-t-xl transition-all border-b-2 whitespace-nowrap ${
              activeTab === id
                ? 'text-[#1a4a5e] border-[#1a4a5e] bg-white'
                : 'text-[#7a9aab] border-transparent hover:text-[#1a4a5e]'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
            {badge !== undefined && badge > 0 && (
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-black text-white bg-[#e74c3c]">
                {badge > 99 ? '99+' : badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <SummaryCard
              label="إجمالي العمولات"
              value={formatCurrency(metrics.total_commission)}
              icon={<Receipt className="w-5 h-5 text-[#1a4a5e]" />}
              color="#1a4a5e"
              bg="#EBF5FF"
              loading={metricsLoading}
            />
            <SummaryCard
              label="العمولات المعلقة"
              value={formatCurrency(metrics.outstanding_commission)}
              icon={<Clock className="w-5 h-5 text-[#ca8a04]" />}
              color="#ca8a04"
              bg="#fefce8"
              loading={metricsLoading}
            />
            <SummaryCard
              label="العمولات المدفوعة"
              value={formatCurrency(metrics.settled_commission)}
              icon={<CheckCircle className="w-5 h-5 text-[#16a34a]" />}
              color="#16a34a"
              bg="#f0fdf4"
              loading={metricsLoading}
            />
            <SummaryCard
              label="إجمالي الطبليات"
              value={metrics.total_pallets.toLocaleString('ar-SA')}
              icon={<TrendingUp className="w-5 h-5 text-[#0284c7]" />}
              color="#0284c7"
              bg="#f0f9ff"
              loading={metricsLoading}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white rounded-2xl border border-[#e2edf5] p-4 text-center">
              <p className="text-2xl font-black text-[#1a2f3e]">{due.length + overdue.length}</p>
              <p className="text-[12px] text-[#7a9aab] mt-1">موردون بعمولات مستحقة</p>
            </div>
            <div className="bg-white rounded-2xl border border-[#fde68a] p-4 text-center">
              <p className="text-2xl font-black text-[#ca8a04]">{due.length}</p>
              <p className="text-[12px] text-[#7a9aab] mt-1">عمولات مستحقة</p>
            </div>
            <div className="bg-white rounded-2xl border border-[#fecaca] p-4 text-center">
              <p className="text-2xl font-black text-[#dc2626]">{overdue.length}</p>
              <p className="text-[12px] text-[#7a9aab] mt-1">عمولات متأخرة</p>
            </div>
          </div>

          {overdue.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[#dc2626]" />
                <p className="text-[13px] font-bold text-[#1a2f3e]">عمولات متأخرة تحتاج إجراء</p>
              </div>
              <CommissionTable
                items={overdue.slice(0, 5)}
                loading={commissionsLoading}
                onSettle={setSettleTarget}
                onViewSupplier={handleViewSupplier}
                overdue
              />
              {overdue.length > 5 && (
                <button onClick={() => setActiveTab('overdue')} className="text-[12px] font-bold text-[#1a4a5e] underline underline-offset-2">
                  عرض جميع المتأخرة ({overdue.length})
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'due' && (
        <div className="space-y-3">
          <p className="text-[13px] text-[#7a9aab]">{due.length} مورد لديه عمولات مستحقة</p>
          <CommissionTable
            items={due}
            loading={commissionsLoading}
            onSettle={setSettleTarget}
            onViewSupplier={handleViewSupplier}
          />
        </div>
      )}

      {activeTab === 'overdue' && (
        <div className="space-y-3">
          <p className="text-[13px] text-[#7a9aab]">{overdue.length} مورد لديه عمولات متأخرة</p>
          <CommissionTable
            items={overdue}
            loading={commissionsLoading}
            onSettle={setSettleTarget}
            onViewSupplier={handleViewSupplier}
            overdue
          />
        </div>
      )}

      {activeTab === 'settled' && (
        <div className="space-y-3">
          <p className="text-[13px] text-[#7a9aab]">{settled.length} سجل دفع</p>
          <SettledTable items={settled} loading={commissionsLoading} />
        </div>
      )}

      {activeTab === 'settings' && <CommissionFeeSettings />}
    </div>
  );
}
