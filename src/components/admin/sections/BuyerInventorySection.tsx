import { useState } from 'react';
import {
  Package, Users, TrendingUp, DollarSign, ShoppingBag,
  Clock, AlertTriangle, Eye, X, Filter, RefreshCw, Download
} from 'lucide-react';
import { useAdminBuyerInventory } from '../../../hooks/useAdminBuyerInventory';
import type { BuyerInventoryItem } from '../../../hooks/useAdminBuyerInventory';

interface Props {
  adminEmail: string;
}

interface MetricCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
}

function MetricCard({ label, value, sub, icon, color, bg }: MetricCardProps) {
  return (
    <div
      className="flex flex-col items-start gap-2 rounded-2xl p-4 border-2"
      style={{
        background: 'white',
        borderColor: '#e8f0f5',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      }}
    >
      <div className="flex items-center justify-between w-full">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: bg, color }}
        >
          {icon}
        </div>
      </div>
      <p className="text-[26px] font-black leading-none" style={{ color: '#1a2f3e' }}>{value}</p>
      <div>
        <p className="text-[12px] font-semibold text-[#3a5a6e]">{label}</p>
        {sub && <p className="text-[10px] text-[#7a9aab] mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

const TYPE_MAP: Record<string, string> = {
  wooden: 'خشبية',
  plastic: 'بلاستيكية',
  recycled: 'معاد تدويرها',
};

const QUALITY_MAP: Record<string, string> = {
  A: 'A',
  B: 'B',
  C: 'C',
  scrap: 'خردة',
};

interface ItemDetailSheetProps {
  item: BuyerInventoryItem;
  onClose: () => void;
}

function ItemDetailSheet({ item, onClose }: ItemDetailSheetProps) {
  const withdrawnQty = item.quantity - item.quantity_available;
  const withdrawnPercent = item.quantity > 0 ? (withdrawnQty / item.quantity) * 100 : 0;

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
            <p className="text-[14px] font-bold text-white">تفاصيل المخزون</p>
            <p className="text-[10px] text-white/60 font-mono">{item.deal_ref}</p>
          </div>
        </div>

        <div className="overflow-y-auto p-5 space-y-4" style={{ maxHeight: 'calc(85vh - 60px)' }}>
          {item.images && item.images.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {item.images.slice(0, 4).map((img, idx) => (
                <img
                  key={idx}
                  src={img}
                  alt=""
                  className="w-full h-32 object-cover rounded-xl border border-[#e2edf5]"
                />
              ))}
            </div>
          )}

          <div className="bg-white rounded-2xl border border-[#e2edf5] p-4 space-y-2.5 text-[12px]">
            <p className="text-[13px] font-bold text-[#1a2f3e] text-right mb-3">معلومات المشتري</p>
            <InfoRow label="المشتري" value={item.buyer_name} />
            <InfoRow label="رقم الجوال" value={item.buyer_phone} />
          </div>

          <div className="bg-white rounded-2xl border border-[#e2edf5] p-4 space-y-2.5 text-[12px]">
            <p className="text-[13px] font-bold text-[#1a2f3e] text-right mb-3">معلومات الطبليات</p>
            <InfoRow label="النوع" value={TYPE_MAP[item.pallet_type] || item.pallet_type} />
            <InfoRow label="المقاس" value={item.size} />
            <InfoRow label="الجودة" value={`درجة ${QUALITY_MAP[item.quality] || item.quality}`} />
            {item.condition && <InfoRow label="الحالة" value={item.condition} />}
            <InfoRow label="المدينة" value={item.city} />
            {item.description && (
              <div className="pt-2 border-t border-[#e8f0f5]">
                <p className="text-[10px] text-[#7a9aab] mb-1 text-right">الوصف</p>
                <p className="text-[11px] text-[#1a2f3e] text-right">{item.description}</p>
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-[#e2edf5] p-4 space-y-2.5 text-[12px]">
            <p className="text-[13px] font-bold text-[#1a2f3e] text-right mb-3">الكمية والأسعار</p>
            <InfoRow label="الكمية الأصلية" value={`${item.quantity.toLocaleString('ar-SA')} طبلية`} />
            <InfoRow label="الكمية المتاحة" value={`${item.quantity_available.toLocaleString('ar-SA')} طبلية`} />
            <InfoRow label="تم سحبه" value={`${withdrawnQty.toLocaleString('ar-SA')} طبلية (${withdrawnPercent.toFixed(0)}%)`} />
            <div className="pt-2 border-t border-[#e8f0f5]">
              <InfoRow label="سعر الوحدة (شامل الرسوم)" value={`${item.unit_price.toLocaleString('ar-SA')} ر.س`} />
              <InfoRow label="الإجمالي المدفوع" value={`${item.total_paid.toLocaleString('ar-SA')} ر.س`} highlight />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#e2edf5] p-4 space-y-2.5 text-[12px]">
            <p className="text-[13px] font-bold text-[#1a2f3e] text-right mb-3">المورد الأصلي</p>
            <InfoRow label="اسم المورد" value={item.original_supplier_name || 'غير متوفر'} />
            <InfoRow label="رقم الجوال" value={item.original_supplier_phone} />
          </div>

          <div className="bg-white rounded-2xl border border-[#e2edf5] p-4 space-y-2.5 text-[12px]">
            <p className="text-[13px] font-bold text-[#1a2f3e] text-right mb-3">التواريخ</p>
            <InfoRow label="تاريخ الشراء" value={new Date(item.acquired_at).toLocaleDateString('ar-SA')} />
            <InfoRow label="تاريخ الإضافة" value={new Date(item.created_at).toLocaleDateString('ar-SA')} />
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className={`font-medium ${highlight ? 'text-[#0e7490] text-[13px]' : 'text-[#1a2f3e]'}`}>{value}</span>
      <span className="text-[#7a9aab] flex-shrink-0">{label}</span>
    </div>
  );
}

function ItemRow({ item, onView }: { item: BuyerInventoryItem; onView: () => void }) {
  const withdrawnQty = item.quantity - item.quantity_available;

  return (
    <tr className="border-t border-[#edf4f9] hover:bg-[#f7fbfd] transition-colors">
      <td className="px-4 py-3">
        <div className="flex flex-col items-start gap-0.5">
          <span className="text-[12px] font-medium text-[#1a2f3e]">{item.buyer_name}</span>
          <span className="text-[10px] text-[#7a9aab] font-mono">{item.buyer_phone}</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className="text-[12px] text-[#4a7a94]">{TYPE_MAP[item.pallet_type] || item.pallet_type}</span>
      </td>
      <td className="px-4 py-3">
        <span className="text-[12px] text-[#4a7a94]">{item.size}</span>
      </td>
      <td className="px-4 py-3">
        <span className="text-[12px] text-[#4a7a94]">{QUALITY_MAP[item.quality] || item.quality}</span>
      </td>
      <td className="px-4 py-3">
        <span className="text-[12px] text-[#4a7a94]">{item.city}</span>
      </td>
      <td className="px-4 py-3">
        <span className="text-[12px] font-bold text-[#1a2f3e]">{item.quantity.toLocaleString('ar-SA')}</span>
      </td>
      <td className="px-4 py-3">
        <span className="text-[12px] font-bold text-[#16a34a]">{item.quantity_available.toLocaleString('ar-SA')}</span>
      </td>
      <td className="px-4 py-3">
        <span className="text-[12px] text-[#dc2626]">{withdrawnQty.toLocaleString('ar-SA')}</span>
      </td>
      <td className="px-4 py-3">
        <span className="text-[12px] text-[#1a2f3e]">{item.unit_price.toLocaleString('ar-SA')}</span>
      </td>
      <td className="px-4 py-3">
        <span className="text-[12px] font-bold text-[#0e7490]">{item.total_paid.toLocaleString('ar-SA')}</span>
      </td>
      <td className="px-4 py-3">
        <span className="text-[11px] text-[#7a9aab]">
          {new Date(item.acquired_at).toLocaleDateString('ar-SA')}
        </span>
      </td>
      <td className="px-4 py-3">
        <button
          onClick={onView}
          className="p-1.5 rounded-lg bg-[#e8f4fd] text-[#2563eb] hover:bg-[#dbeafe] transition-colors"
          title="عرض التفاصيل"
        >
          <Eye className="w-3.5 h-3.5" />
        </button>
      </td>
    </tr>
  );
}

export default function BuyerInventorySection({ adminEmail }: Props) {
  const {
    stats,
    items,
    expiredReservations,
    loadingStats,
    loadingItems,
    loadingExpired,
    selectedCity,
    selectedType,
    onlyAvailable,
    setSelectedCity,
    setSelectedType,
    setOnlyAvailable,
    clearFilters,
    loadExpiredReservations,
    refresh
  } = useAdminBuyerInventory(adminEmail);

  const [selectedItem, setSelectedItem] = useState<BuyerInventoryItem | null>(null);
  const [showExpired, setShowExpired] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const hasFilters = selectedCity || selectedType || onlyAvailable;

  const handleShowExpired = () => {
    setShowExpired(true);
    loadExpiredReservations();
  };

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={handleShowExpired}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#fef2f2] text-[#dc2626] text-[12px] font-bold hover:bg-[#fee2e2] transition-colors border border-[#fecaca]"
          >
            <Clock className="w-3.5 h-3.5" />
            الصفقات المنتهية
            {expiredReservations.length > 0 && (
              <span className="bg-[#dc2626] text-white text-[10px] px-1.5 py-0.5 rounded-full">
                {expiredReservations.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#f0f6fa] text-[#4a7a94] text-[12px] font-bold hover:bg-[#e2edf5] transition-colors"
          >
            <Filter className="w-3.5 h-3.5" />
            تصفية
          </button>
          <button
            onClick={refresh}
            className="w-8 h-8 rounded-xl bg-[#f0f6fa] text-[#4a7a94] hover:bg-[#e2edf5] flex items-center justify-center transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loadingItems ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <div>
          <h2 className="text-[20px] font-black text-[#1a2f3e]">مشتريات المشترين</h2>
          <p className="text-[12px] text-[#7a9aab]">متابعة المخزون المنقول للمشترين</p>
        </div>
      </div>

      {showFilters && (
        <div className="bg-white rounded-2xl border border-[#e2edf5] p-4">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => {
                clearFilters();
                setShowFilters(false);
              }}
              className="text-[11px] text-[#dc2626] hover:underline"
            >
              إلغاء الكل
            </button>
            <p className="text-[13px] font-bold text-[#1a2f3e]">الفلاتر</p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] text-[#7a9aab] block mb-1 text-right">المدينة</label>
              <select
                value={selectedCity || ''}
                onChange={e => setSelectedCity(e.target.value || null)}
                className="w-full px-3 py-2 rounded-xl border border-[#e2edf5] text-[12px] text-right"
              >
                <option value="">الكل</option>
                {stats?.by_city.map(c => (
                  <option key={c.city} value={c.city}>{c.city}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] text-[#7a9aab] block mb-1 text-right">النوع</label>
              <select
                value={selectedType || ''}
                onChange={e => setSelectedType(e.target.value || null)}
                className="w-full px-3 py-2 rounded-xl border border-[#e2edf5] text-[12px] text-right"
              >
                <option value="">الكل</option>
                {stats?.by_type.map(t => (
                  <option key={t.pallet_type} value={t.pallet_type}>{TYPE_MAP[t.pallet_type] || t.pallet_type}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] text-[#7a9aab] block mb-1 text-right">الحالة</label>
              <label className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[#e2edf5] cursor-pointer">
                <span className="text-[12px] text-[#1a2f3e]">متاح فقط</span>
                <input
                  type="checkbox"
                  checked={onlyAvailable}
                  onChange={e => setOnlyAvailable(e.target.checked)}
                  className="rounded"
                />
              </label>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard
          label="إجمالي المشترين"
          value={loadingStats ? '...' : stats?.total_buyers.toLocaleString('ar-SA') || 0}
          icon={<Users className="w-5 h-5" />}
          color="#2563eb"
          bg="#eff6ff"
        />
        <MetricCard
          label="إجمالي الطبليات"
          value={loadingStats ? '...' : stats?.total_pallets.toLocaleString('ar-SA') || 0}
          sub={`متاح: ${stats?.available_pallets.toLocaleString('ar-SA') || 0}`}
          icon={<Package className="w-5 h-5" />}
          color="#16a34a"
          bg="#f0fdf4"
        />
        <MetricCard
          label="تم سحبه"
          value={loadingStats ? '...' : stats?.withdrawn_pallets.toLocaleString('ar-SA') || 0}
          icon={<Download className="w-5 h-5" />}
          color="#f59e0b"
          bg="#fffbeb"
        />
        <MetricCard
          label="القيمة الإجمالية"
          value={loadingStats ? '...' : `${stats?.total_value.toLocaleString('ar-SA') || 0} ر.س`}
          sub="شامل رسوم المنصة"
          icon={<DollarSign className="w-5 h-5" />}
          color="#0e7490"
          bg="#ecfeff"
        />
      </div>

      {!loadingStats && stats && stats.by_type.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#e2edf5] p-4">
          <p className="text-[13px] font-bold text-[#1a2f3e] text-right mb-3">التوزيع حسب النوع</p>
          <div className="space-y-2">
            {stats.by_type.map(t => (
              <div key={t.pallet_type} className="flex items-center justify-between text-[12px]">
                <div className="flex items-center gap-2">
                  <span className="text-[#7a9aab]">{t.total_pallets.toLocaleString('ar-SA')} طبلية</span>
                  <div className="w-24 h-2 bg-[#f0f6fa] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#2563eb] rounded-full"
                      style={{ width: `${((t.total_pallets / stats.total_pallets) * 100).toFixed(0)}%` }}
                    />
                  </div>
                </div>
                <span className="font-medium text-[#1a2f3e]">{TYPE_MAP[t.pallet_type] || t.pallet_type}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-3">
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 text-[11px] text-[#7a9aab] hover:text-[#1a4a5e] transition-colors"
            >
              <X className="w-3 h-3" />
              إلغاء التصفية
            </button>
          )}
          <h3 className="text-[14px] font-bold text-[#1a2f3e]">
            قائمة المخزون
            <span className="text-[11px] font-normal text-[#7a9aab] mr-2">({items.length})</span>
          </h3>
        </div>

        {loadingItems ? (
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
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#d0e6f0] bg-white py-16 flex flex-col items-center gap-3">
            <ShoppingBag className="w-10 h-10 text-[#c0d5e0]" />
            <p className="text-[13px] font-bold text-[#a0b5c0]">لا توجد مشتريات</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-[#e2edf5] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[1200px]">
                <thead>
                  <tr className="bg-[#f0f6fa]">
                    {['المشتري', 'النوع', 'المقاس', 'الجودة', 'المدينة', 'الكمية', 'متاح', 'مسحوب', 'سعر الوحدة', 'الإجمالي', 'التاريخ', 'إجراءات'].map(col => (
                      <th key={col} className="px-4 py-3 text-right text-[11px] font-bold text-[#4a7a94] whitespace-nowrap">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map(item => (
                    <ItemRow
                      key={item.id}
                      item={item}
                      onView={() => setSelectedItem(item)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {showExpired && expiredReservations.length > 0 && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center" onClick={() => setShowExpired(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-2xl rounded-t-3xl overflow-hidden"
            style={{ background: '#f4f9fc', maxHeight: '85vh' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#e2edf5]" style={{ background: '#dc2626' }}>
              <button onClick={() => setShowExpired(false)} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <X className="w-4 h-4 text-white" />
              </button>
              <div className="text-right">
                <p className="text-[14px] font-bold text-white">الصفقات المنتهية</p>
                <p className="text-[10px] text-white/60">صفقات تجاوزت مدة الحجز</p>
              </div>
            </div>

            <div className="overflow-y-auto p-5 space-y-3" style={{ maxHeight: 'calc(85vh - 60px)' }}>
              {loadingExpired ? (
                <p className="text-center text-[12px] text-[#7a9aab] py-8">جارٍ التحميل...</p>
              ) : (
                expiredReservations.map(res => (
                  <div key={res.deal_id} className="bg-white rounded-xl border border-[#fee2e2] p-4">
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-[10px] font-mono text-[#dc2626] bg-red-50 px-2 py-1 rounded-full">
                        {res.hours_expired.toFixed(0)} ساعة متأخرة
                      </span>
                      <span className="text-[11px] font-bold text-[#1a2f3e]">{res.deal_ref}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div className="text-right">
                        <span className="text-[#7a9aab]">المشتري: </span>
                        <span className="text-[#1a2f3e] font-medium">{res.buyer_name}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[#7a9aab]">المورد: </span>
                        <span className="text-[#1a2f3e] font-medium">{res.supplier_name}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[#7a9aab]">النوع: </span>
                        <span className="text-[#1a2f3e]">{TYPE_MAP[res.pallet_type] || res.pallet_type}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[#7a9aab]">الكمية: </span>
                        <span className="text-[#1a2f3e] font-bold">{res.quantity.toLocaleString('ar-SA')}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {selectedItem && (
        <ItemDetailSheet
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </div>
  );
}
