import { useState } from 'react';
import { ArrowRight, Package, TrendingUp, Warehouse, Filter, MapPin, Box, FileText, Calendar, DollarSign, User, ExternalLink, Image as ImageIcon } from 'lucide-react';
import { useBuyerInventory } from '../../hooks/useBuyerInventory';
import type { BuyerInventoryItem } from '../../hooks/useBuyerInventory';

interface Props {
  phone: string;
  onClose: () => void;
}

export default function BuyerCloudWarehouse({ phone, onClose }: Props) {
  const { items, summary, loading, loadItems } = useBuyerInventory(phone);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [selectedItem, setSelectedItem] = useState<BuyerInventoryItem | null>(null);

  const applyFilters = () => {
    loadItems({
      palletType: selectedType || undefined,
      city: selectedCity || undefined,
      onlyAvailable,
    });
  };

  const clearFilters = () => {
    setSelectedType(null);
    setSelectedCity(null);
    setOnlyAvailable(false);
    loadItems({});
  };

  const hasActiveFilters = selectedType || selectedCity || onlyAvailable;

  if (loading && !summary) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <Package className="w-12 h-12 text-emerald-600 animate-pulse mx-auto mb-2" />
          <p className="text-slate-600">جاري تحميل المستودع...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={onClose}
              className="flex items-center gap-2 text-slate-600 hover:text-slate-900"
            >
              <ArrowRight className="w-5 h-5" />
              <span className="font-medium">رجوع</span>
            </button>
            <div className="flex items-center gap-2 text-emerald-600">
              <Warehouse className="w-6 h-6" />
              <h1 className="text-lg font-bold">مستودعي السحابي</h1>
            </div>
          </div>

          {/* Summary Cards */}
          {summary && (
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-3 border border-emerald-200">
                <div className="flex items-center gap-2 text-emerald-700 mb-1">
                  <Package className="w-4 h-4" />
                  <span className="text-xs font-medium">إجمالي الطبليات</span>
                </div>
                <p className="text-2xl font-bold text-emerald-900">{summary.total_pallets.toLocaleString()}</p>
                <p className="text-xs text-emerald-600 mt-1">من {summary.total_items} صفقة</p>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-3 border border-blue-200">
                <div className="flex items-center gap-2 text-blue-700 mb-1">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-xs font-medium">القيمة الإجمالية</span>
                </div>
                <p className="text-2xl font-bold text-blue-900">{summary.total_value.toLocaleString()}</p>
                <p className="text-xs text-blue-600 mt-1">ريال سعودي</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-b border-slate-200 px-4 py-3">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-slate-600" />
          <span className="text-sm font-medium text-slate-700">تصفية النتائج</span>
        </div>

        <div className="space-y-2">
          {/* Type Filter */}
          {summary && summary.by_type.length > 0 && (
            <div>
              <label className="text-xs text-slate-600 mb-1 block">نوع الطبلية</label>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => {
                    setSelectedType(null);
                    if (!selectedCity && !onlyAvailable) loadItems({});
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    !selectedType
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  الكل
                </button>
                {summary.by_type.map((type) => (
                  <button
                    key={type.pallet_type}
                    onClick={() => setSelectedType(type.pallet_type)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      selectedType === type.pallet_type
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {type.pallet_type} ({type.total_pallets})
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* City Filter */}
          {summary && summary.by_city.length > 0 && (
            <div>
              <label className="text-xs text-slate-600 mb-1 block">المدينة</label>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => {
                    setSelectedCity(null);
                    if (!selectedType && !onlyAvailable) loadItems({});
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    !selectedCity
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  الكل
                </button>
                {summary.by_city.map((city) => (
                  <button
                    key={city.city}
                    onClick={() => setSelectedCity(city.city)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      selectedCity === city.city
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {city.city} ({city.total_pallets})
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Available Only Toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={onlyAvailable}
              onChange={(e) => setOnlyAvailable(e.target.checked)}
              className="w-4 h-4 text-emerald-600 rounded"
            />
            <span className="text-xs text-slate-700">المتاح للبيع فقط</span>
          </label>

          {/* Apply/Clear Buttons */}
          {hasActiveFilters && (
            <div className="flex gap-2 pt-2">
              <button
                onClick={applyFilters}
                className="flex-1 bg-emerald-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-emerald-700"
              >
                تطبيق الفلاتر
              </button>
              <button
                onClick={clearFilters}
                className="px-4 bg-slate-200 text-slate-700 py-2 rounded-lg text-sm font-medium hover:bg-slate-300"
              >
                مسح
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Items List */}
      <div className="p-4 space-y-3">
        {items.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
            <Warehouse className="w-16 h-16 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600 font-medium mb-1">المستودع فارغ</p>
            <p className="text-sm text-slate-500">
              {hasActiveFilters
                ? 'لا توجد نتائج للفلاتر المحددة'
                : 'سيظهر هنا المخزون المشترى من الموردين'}
            </p>
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              onClick={() => setSelectedItem(item)}
              className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-lg transition-all cursor-pointer"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Box className="w-4 h-4 text-emerald-600" />
                    <h3 className="font-bold text-slate-900">{item.pallet_type}</h3>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <span className="bg-slate-100 px-2 py-0.5 rounded">{item.size}</span>
                    <span className="bg-slate-100 px-2 py-0.5 rounded">درجة {item.quality}</span>
                    {item.condition && (
                      <span className="bg-slate-100 px-2 py-0.5 rounded">{item.condition}</span>
                    )}
                  </div>
                </div>
                <div className="text-left">
                  <p className="text-xs text-slate-500">الكمية</p>
                  <p className="text-lg font-bold text-slate-900">{item.quantity}</p>
                </div>
              </div>

              {/* Details */}
              <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                <div className="flex items-center gap-2 text-slate-600">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{item.city}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{new Date(item.acquired_at).toLocaleDateString('ar-SA')}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>{item.unit_price} ر.س / طبلية</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <User className="w-3.5 h-3.5" />
                  <span className="truncate">{item.original_supplier_name}</span>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <div className="text-xs text-slate-500">
                  صفقة #{item.deal_ref}
                </div>
                <div className="text-sm font-bold text-emerald-600">
                  {item.total_paid.toLocaleString()} ر.س
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Item Details Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-white rounded-t-3xl w-full max-h-[90vh] overflow-y-auto animate-slide-up">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-4 py-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900">تفاصيل المخزون</h2>
                <button
                  onClick={() => setSelectedItem(null)}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-4 space-y-4">
              {/* Images */}
              {selectedItem.images && selectedItem.images.length > 0 && (
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-2 block flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" />
                    صور المنتج
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedItem.images.map((img, idx) => (
                      <img
                        key={idx}
                        src={img}
                        alt={`صورة ${idx + 1}`}
                        className="w-full h-32 object-cover rounded-lg border border-slate-200"
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Description */}
              {selectedItem.description && (
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-2 block flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    الوصف
                  </label>
                  <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-lg">
                    {selectedItem.description}
                  </p>
                </div>
              )}

              {/* Full Details */}
              <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                <DetailRow label="النوع" value={selectedItem.pallet_type} />
                <DetailRow label="الحجم" value={selectedItem.size} />
                <DetailRow label="الدرجة" value={selectedItem.quality} />
                {selectedItem.condition && (
                  <DetailRow label="الحالة" value={selectedItem.condition} />
                )}
                <DetailRow label="الكمية" value={`${selectedItem.quantity} طبلية`} />
                <DetailRow label="المتاح" value={`${selectedItem.quantity_available} طبلية`} />
                <DetailRow label="المدينة" value={selectedItem.city} />
                <DetailRow label="سعر الوحدة" value={`${selectedItem.unit_price} ر.س`} />
                <DetailRow label="المبلغ الإجمالي" value={`${selectedItem.total_paid} ر.س`} />
                <DetailRow label="المورد" value={selectedItem.original_supplier_name} />
                <DetailRow label="رقم الصفقة" value={selectedItem.deal_ref} />
                <DetailRow
                  label="تاريخ الشراء"
                  value={new Date(selectedItem.acquired_at).toLocaleDateString('ar-SA', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                />
              </div>

              <button
                onClick={() => setSelectedItem(null)}
                className="w-full bg-slate-200 text-slate-700 py-3 rounded-xl font-medium hover:bg-slate-300"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-slate-600">{label}</span>
      <span className="text-sm font-medium text-slate-900">{value}</span>
    </div>
  );
}
