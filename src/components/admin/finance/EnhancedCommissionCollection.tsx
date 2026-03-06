import { useState, useEffect, useCallback } from 'react';
import {
  Clock, AlertTriangle, CheckCircle, MessageCircle, Eye, Loader2, Search,
  Filter, Download, Calendar, MapPin, X, TrendingUp, DollarSign
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import type { SupplierCommission, SettledCommission, SettlementMethod } from '../../../types/admin';
import { settleCommission } from '../../../hooks/useFinance';
import SettlementDialog from './SettlementDialog';

type CommissionTab = 'due' | 'overdue' | 'settled';
type PeriodFilter = 'today' | 'week' | 'month' | 'year' | 'all';

interface CommissionFilters {
  period: PeriodFilter;
  city: string;
  search: string;
  minAmount: number;
}

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

function formatCurrency(amount: number) {
  return `${amount.toLocaleString('ar-SA')} ريال`;
}

export default function EnhancedCommissionCollection({ onViewSupplier }: { onViewSupplier: (phone: string) => void }) {
  const [activeTab, setActiveTab] = useState<CommissionTab>('due');
  const [loading, setLoading] = useState(true);
  const [due, setDue] = useState<SupplierCommission[]>([]);
  const [overdue, setOverdue] = useState<SupplierCommission[]>([]);
  const [settled, setSettled] = useState<SettledCommission[]>([]);
  const [settlementTarget, setSettlementTarget] = useState<SupplierCommission | null>(null);
  const [settling, setSettling] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [availableCities, setAvailableCities] = useState<string[]>([]);

  const [filters, setFilters] = useState<CommissionFilters>({
    period: 'all',
    city: '',
    search: '',
    minAmount: 0,
  });

  const [stats, setStats] = useState({
    totalDue: 0,
    totalOverdue: 0,
    totalSettled: 0,
    countDue: 0,
    countOverdue: 0,
    countSettled: 0,
  });

  const loadData = useCallback(async () => {
    setLoading(true);

    const { data: deals } = await supabase
      .from('deals')
      .select('id, deal_ref, supplier_phone, city, quantity, platform_fee_per_pallet, completed_at, created_at, status')
      .not('status', 'eq', 'cancelled');

    const { data: settlements } = await supabase
      .from('commission_settlements')
      .select('*')
      .eq('status', 'settled');

    const { data: users } = await supabase
      .from('platform_users')
      .select('phone, display_name, city');

    const settledDealIds = new Set((settlements || []).map(s => s.deal_id));
    const userMap = new Map((users || []).map(u => [u.phone, u]));

    const cities = new Set<string>();
    const supplierMap = new Map<string, {
      phone: string;
      pallets: number;
      commission: number;
      lastDate: string;
      dealIds: string[];
      completedAt: string | null;
      city: string;
    }>();

    for (const deal of deals || []) {
      cities.add(deal.city);
      const fee = Number(deal.platform_fee_per_pallet) || 1;
      const comm = deal.quantity * fee;
      const existing = supplierMap.get(deal.supplier_phone);

      if (settledDealIds.has(deal.id)) continue;

      if (existing) {
        existing.pallets += deal.quantity;
        existing.commission += comm;
        existing.dealIds.push(deal.id);
        const d = deal.completed_at || deal.created_at;
        if (d > existing.lastDate) existing.lastDate = d;
        if (deal.completed_at && (!existing.completedAt || deal.completed_at < existing.completedAt)) {
          existing.completedAt = deal.completed_at;
        }
      } else {
        supplierMap.set(deal.supplier_phone, {
          phone: deal.supplier_phone,
          pallets: deal.quantity,
          commission: comm,
          lastDate: deal.completed_at || deal.created_at,
          dealIds: [deal.id],
          completedAt: deal.completed_at || null,
          city: deal.city,
        });
      }
    }

    setAvailableCities(Array.from(cities).sort());

    const now = Date.now();
    const dueList: SupplierCommission[] = [];
    const overdueList: SupplierCommission[] = [];

    for (const s of supplierMap.values()) {
      if (s.commission <= 0) continue;
      const user = userMap.get(s.phone);
      const daysSince = s.completedAt
        ? Math.floor((now - new Date(s.completedAt).getTime()) / 86400000)
        : 0;

      const item: SupplierCommission = {
        supplier_phone: s.phone,
        display_name: user?.display_name || s.phone,
        city: user?.city || s.city,
        total_pallets: s.pallets,
        commission_amount: s.commission,
        last_deal_date: s.lastDate,
        days_overdue: Math.max(0, daysSince - 7),
        deal_ids: s.dealIds,
      };

      if (daysSince > 7) {
        overdueList.push(item);
      } else {
        dueList.push(item);
      }
    }

    overdueList.sort((a, b) => b.days_overdue - a.days_overdue);
    dueList.sort((a, b) => b.commission_amount - a.commission_amount);

    const settledList: SettledCommission[] = (settlements || []).map(s => {
      const user = userMap.get(s.supplier_phone);
      return {
        id: s.id,
        supplier_phone: s.supplier_phone,
        display_name: user?.display_name || s.supplier_phone,
        city: user?.city || '',
        pallet_count: s.pallet_count,
        commission_amount: Number(s.commission_amount),
        settlement_method: s.settlement_method as SettlementMethod,
        settled_by: s.settled_by,
        settled_at: s.settled_at,
      };
    });

    setDue(dueList);
    setOverdue(overdueList);
    setSettled(settledList);

    setStats({
      totalDue: dueList.reduce((sum, item) => sum + item.commission_amount, 0),
      totalOverdue: overdueList.reduce((sum, item) => sum + item.commission_amount, 0),
      totalSettled: settledList.reduce((sum, item) => sum + item.commission_amount, 0),
      countDue: dueList.length,
      countOverdue: overdueList.length,
      countSettled: settledList.length,
    });

    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSettle = async (method: SettlementMethod, staff: string) => {
    if (!settlementTarget) return;
    setSettling(true);
    const result = await settleCommission(settlementTarget.deal_ids, method, staff);
    setSettling(false);
    if (result.success) {
      setSettlementTarget(null);
      loadData();
    }
  };

  const applyFilters = (items: SupplierCommission[]) => {
    return items.filter(item => {
      if (filters.city && item.city !== filters.city) return false;
      if (filters.minAmount && item.commission_amount < filters.minAmount) return false;
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        if (!item.display_name.toLowerCase().includes(searchLower) &&
            !item.supplier_phone.includes(filters.search)) {
          return false;
        }
      }
      return true;
    });
  };

  const applySettledFilters = (items: SettledCommission[]) => {
    return items.filter(item => {
      if (filters.city && item.city !== filters.city) return false;
      if (filters.minAmount && item.commission_amount < filters.minAmount) return false;
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        if (!item.display_name.toLowerCase().includes(searchLower) &&
            !item.supplier_phone.includes(filters.search)) {
          return false;
        }
      }
      return true;
    });
  };

  const filteredDue = applyFilters(due);
  const filteredOverdue = applyFilters(overdue);
  const filteredSettled = applySettledFilters(settled);

  const exportToCSV = () => {
    const data = activeTab === 'due' ? filteredDue : activeTab === 'overdue' ? filteredOverdue : filteredSettled;
    const headers = activeTab === 'settled'
      ? ['المورد', 'المدينة', 'الطبليات', 'المبلغ', 'تاريخ التسوية', 'الطريقة']
      : ['المورد', 'المدينة', 'الطبليات', 'المبلغ', 'آخر صفقة'];

    const rows = data.map(item => {
      if ('settled_at' in item) {
        return [item.display_name, item.city, item.pallet_count, item.commission_amount, formatDate(item.settled_at), item.settlement_method];
      } else {
        return [item.display_name, item.city, item.total_pallets, item.commission_amount, formatDate(item.last_deal_date)];
      }
    });

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `commissions_${activeTab}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const clearFilters = () => {
    setFilters({ period: 'all', city: '', search: '', minAmount: 0 });
  };

  const hasActiveFilters = filters.city || filters.search || filters.minAmount > 0;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="عمولات مستحقة"
          amount={stats.totalDue}
          count={stats.countDue}
          icon={Clock}
          color="#B8860B"
          bg="#FFFBEB"
          active={activeTab === 'due'}
          onClick={() => setActiveTab('due')}
        />
        <StatCard
          label="عمولات متأخرة"
          amount={stats.totalOverdue}
          count={stats.countOverdue}
          icon={AlertTriangle}
          color="#dc2626"
          bg="#FEF2F2"
          active={activeTab === 'overdue'}
          onClick={() => setActiveTab('overdue')}
        />
        <StatCard
          label="عمولات محصلة"
          amount={stats.totalSettled}
          count={stats.countSettled}
          icon={CheckCircle}
          color="#16a34a"
          bg="#F0FDF4"
          active={activeTab === 'settled'}
          onClick={() => setActiveTab('settled')}
        />
      </div>

      <div className="bg-white rounded-2xl border border-[#e2edf5] overflow-hidden">
        <div className="p-5 border-b border-[#e2edf5]">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7a9aab]" />
              <input
                type="text"
                placeholder="بحث بالاسم أو رقم الجوال..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="w-full pr-10 pl-4 py-2.5 text-[13px] border border-[#e2edf5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1a4a5e]/20"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-2.5 text-[12px] font-semibold rounded-xl transition-colors ${
                  showFilters || hasActiveFilters
                    ? 'bg-[#1a4a5e] text-white'
                    : 'bg-[#f0f6fa] text-[#4a7a94] hover:bg-[#e2edf5]'
                }`}
              >
                <Filter className="w-3.5 h-3.5" />
                فلترة
              </button>
              <button
                onClick={exportToCSV}
                className="flex items-center gap-2 px-4 py-2.5 text-[12px] font-semibold bg-[#E8F8F0] text-[#16a34a] rounded-xl hover:bg-[#dcfce7] transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                تصدير
              </button>
            </div>
          </div>

          {showFilters && (
            <div className="flex flex-wrap gap-3 p-4 bg-[#f8fafb] rounded-xl">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-[11px] font-semibold text-[#4a7a94] mb-1.5">المدينة</label>
                <div className="relative">
                  <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#7a9aab]" />
                  <select
                    value={filters.city}
                    onChange={(e) => setFilters({ ...filters, city: e.target.value })}
                    className="w-full pr-10 pl-4 py-2 text-[13px] border border-[#e2edf5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a4a5e]/20"
                  >
                    <option value="">جميع المدن</option>
                    {availableCities.map(city => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex-1 min-w-[200px]">
                <label className="block text-[11px] font-semibold text-[#4a7a94] mb-1.5">الحد الأدنى للمبلغ</label>
                <div className="relative">
                  <DollarSign className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#7a9aab]" />
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={filters.minAmount || ''}
                    onChange={(e) => setFilters({ ...filters, minAmount: Number(e.target.value) || 0 })}
                    className="w-full pr-10 pl-4 py-2 text-[13px] border border-[#e2edf5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a4a5e]/20"
                  />
                </div>
              </div>

              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-semibold text-[#dc2626] bg-[#FEF2F2] rounded-lg hover:bg-[#fecaca] transition-colors self-end"
                >
                  <X className="w-3 h-3" />
                  إزالة الفلاتر
                </button>
              )}
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-[#1a4a5e] animate-spin" />
          </div>
        ) : (
          <>
            {activeTab === 'due' && <DueTable items={filteredDue} onSettle={setSettlementTarget} onView={onViewSupplier} onWhatsApp={sendWhatsApp} />}
            {activeTab === 'overdue' && <OverdueTable items={filteredOverdue} onSettle={setSettlementTarget} onView={onViewSupplier} onWhatsApp={sendWhatsApp} />}
            {activeTab === 'settled' && <SettledTable items={filteredSettled} onView={onViewSupplier} />}
          </>
        )}
      </div>

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

function StatCard({ label, amount, count, icon: Icon, color, bg, active, onClick }: {
  label: string;
  amount: number;
  count: number;
  icon: typeof Clock;
  color: string;
  bg: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative overflow-hidden rounded-2xl border-2 bg-white p-5 text-right transition-all hover:shadow-lg ${
        active ? 'border-[#1a4a5e] shadow-md' : 'border-[#e2edf5]'
      }`}
    >
      <div className="absolute top-0 left-0 w-full h-1" style={{ background: color }} />
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: bg }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        <div className="text-right">
          <p className="text-[11px] text-[#7a9aab] mb-1">{label}</p>
          <p className="text-[20px] font-bold text-[#1a2f3e] leading-none">{formatCurrency(amount)}</p>
          <p className="text-[10px] text-[#7a9aab] mt-1">{count} مورد</p>
        </div>
      </div>
    </button>
  );
}

function DueTable({ items, onSettle, onView, onWhatsApp }: {
  items: SupplierCommission[];
  onSettle: (s: SupplierCommission) => void;
  onView: (phone: string) => void;
  onWhatsApp: (phone: string) => void;
}) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-[#f7fbfd] flex items-center justify-center mb-4">
          <CheckCircle className="w-7 h-7 text-[#c5d8e4]" />
        </div>
        <p className="text-[13px] text-[#7a9aab]">لا توجد عمولات مستحقة حالياً</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
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
                <span className="text-[13px] font-bold text-[#B8860B]">{formatCurrency(item.commission_amount)}</span>
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
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-[#f7fbfd] flex items-center justify-center mb-4">
          <CheckCircle className="w-7 h-7 text-[#c5d8e4]" />
        </div>
        <p className="text-[13px] text-[#7a9aab]">لا توجد عمولات متأخرة</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
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
                <span className="text-[13px] font-bold text-[#dc2626]">{formatCurrency(item.commission_amount)}</span>
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
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-[#f7fbfd] flex items-center justify-center mb-4">
          <CheckCircle className="w-7 h-7 text-[#c5d8e4]" />
        </div>
        <p className="text-[13px] text-[#7a9aab]">لا توجد تسويات مسجلة بعد</p>
      </div>
    );
  }

  const methodLabels: Record<SettlementMethod, string> = {
    bank_transfer: 'تحويل بنكي',
    cash: 'نقدي',
    manual: 'تسوية يدوية',
  };

  return (
    <div className="overflow-x-auto">
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
                <span className="text-[13px] font-bold text-[#16a34a]">{formatCurrency(item.commission_amount)}</span>
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
