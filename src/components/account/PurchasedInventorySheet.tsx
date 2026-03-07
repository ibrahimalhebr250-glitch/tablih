import { useState } from 'react';
import { ArrowRight, Package, MapPin, DollarSign, Warehouse, X, Image as ImageIcon } from 'lucide-react';
import { useBuyerInventory } from '../../hooks/useBuyerInventory';

interface Props {
  phone: string;
  onClose: () => void;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="text-sm font-semibold text-slate-900">{value}</span>
    </div>
  );
}

export default function PurchasedInventorySheet({ phone, onClose }: Props) {
  const { items: purchasedItems, summary, loading } = useBuyerInventory(phone);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  return (
    <>
      <div className="fixed inset-0 z-[100] flex items-end lg:items-center justify-center">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-md" onClick={onClose} />

        <div
          className="relative w-full lg:w-[720px] xl:w-[840px] lg:max-h-[90vh] max-h-[100vh] flex flex-col slide-up lg:rounded-3xl overflow-hidden"
          style={{ background: '#f0f6fa', boxShadow: '0 40px 100px rgba(0,0,0,0.35)' }}
        >
          <header
            className="flex items-center justify-between px-5 py-3.5 flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #064e3b, #047857, #10b981)' }}
          >
            <button onClick={onClose} className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center transition-colors">
              <ArrowRight className="w-4 h-4 text-white" />
            </button>
            <h2 className="text-[16px] font-bold text-white">مشترياتي من المنصة</h2>
            <div className="w-9 h-9" />
          </header>

          {summary && (
            <div className="grid grid-cols-2 gap-3 px-4 py-4" style={{ background: '#e8f7f3' }}>
              <div className="bg-white rounded-xl p-3 border border-emerald-200">
                <div className="flex items-center gap-2 text-emerald-700 mb-1">
                  <Package className="w-4 h-4" />
                  <span className="text-xs font-medium">إجمالي الطبليات</span>
                </div>
                <p className="text-2xl font-bold text-emerald-900">{summary.total_pallets.toLocaleString()}</p>
                <p className="text-xs text-emerald-600 mt-1">من {summary.total_items} صفقة</p>
              </div>

              <div className="bg-white rounded-xl p-3 border border-emerald-200">
                <div className="flex items-center gap-2 text-emerald-700 mb-1">
                  <DollarSign className="w-4 h-4" />
                  <span className="text-xs font-medium">القيمة الإجمالية</span>
                </div>
                <p className="text-2xl font-bold text-emerald-900">{summary.total_value.toLocaleString()}</p>
                <p className="text-xs text-emerald-600 mt-1">ريال سعودي</p>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto px-4 pb-6">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : purchasedItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Warehouse className="w-16 h-16 text-gray-300 mb-3" />
                <p className="text-[14px] font-bold text-[#1a4a5e] mb-1">لا توجد مشتريات</p>
                <p className="text-[12px] text-[#7a9aab]">سيظهر هنا المخزون المشترى من الموردين</p>
              </div>
            ) : (
              <div className="space-y-3 pt-3">
                {purchasedItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-lg transition-all cursor-pointer"
                    dir="rtl"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Package className="w-4 h-4 text-emerald-600" />
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

                    <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                      <div className="flex items-center gap-2 text-slate-600">
                        <MapPin className="w-3.5 h-3.5" />
                        <span>{item.city}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600">
                        <DollarSign className="w-3.5 h-3.5" />
                        <span>{item.unit_price} ر.س / طبلية</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                      <div className="text-xs text-slate-500">
                        صفقة #{item.deal_ref}
                      </div>
                      <div className="text-sm font-bold text-emerald-600">
                        {item.total_paid.toLocaleString()} ر.س
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedItem && (
        <div
          className="fixed inset-0 z-[110] flex items-end lg:items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={() => setSelectedItem(null)}
        >
          <div
            className="relative bg-white rounded-t-3xl lg:rounded-3xl lg:max-w-[540px] w-full overflow-hidden"
            style={{ maxHeight: '85vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-center pt-3 pb-0 lg:hidden">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>

            <div className="sticky top-0 bg-white border-b border-slate-200 px-4 py-4 flex items-center justify-between z-10">
              <h2 className="text-lg font-bold text-slate-900">تفاصيل المخزون المشترى</h2>
              <button
                onClick={() => setSelectedItem(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto" style={{ maxHeight: 'calc(85vh - 70px)' }}>
              {selectedItem.images && selectedItem.images.length > 0 && (
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-2 block flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" />
                    صور المنتج
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedItem.images.map((img: string, idx: number) => (
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

              {selectedItem.description && (
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-2 block">الوصف</label>
                  <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-lg">
                    {selectedItem.description}
                  </p>
                </div>
              )}

              <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                <DetailRow label="النوع" value={selectedItem.pallet_type} />
                <DetailRow label="الحجم" value={selectedItem.size} />
                <DetailRow label="الدرجة" value={selectedItem.quality} />
                {selectedItem.condition && (
                  <DetailRow label="الحالة" value={selectedItem.condition} />
                )}
                <DetailRow label="الكمية" value={`${selectedItem.quantity} طبلية`} />
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
    </>
  );
}
