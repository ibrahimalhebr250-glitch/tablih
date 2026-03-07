import { useState } from 'react';
import { ArrowRight, Package, MapPin, DollarSign, Warehouse, X, Image as ImageIcon, TrendingDown } from 'lucide-react';
import { useBuyerInventory } from '../../hooks/useBuyerInventory';
import { ActionToast } from '../shared/ActionToast';

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
  const { items: purchasedItems, summary, loading, withdrawQuantity } = useBuyerInventory(phone);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [toast, setToast] = useState<{ title: string; message: string; variant: 'success' | 'info' } | null>(null);

  const handleWithdraw = async () => {
    if (!selectedItem) return;

    const amount = parseInt(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      setToast({ title: 'خطأ', message: 'الرجاء إدخال كمية صحيحة', variant: 'info' });
      return;
    }

    if (amount > selectedItem.quantity_available) {
      setToast({ title: 'خطأ', message: `الكمية المتاحة فقط ${selectedItem.quantity_available} طبلية`, variant: 'info' });
      return;
    }

    setIsWithdrawing(true);
    try {
      const result = await withdrawQuantity(selectedItem.id, amount);
      setToast({ title: 'تم بنجاح', message: result.message || 'تم سحب الكمية بنجاح', variant: 'success' });
      setShowWithdrawDialog(false);
      setWithdrawAmount('');
      setSelectedItem(null);
    } catch (error) {
      setToast({
        title: 'خطأ',
        message: error instanceof Error ? error.message : 'فشل سحب الكمية',
        variant: 'info'
      });
    } finally {
      setIsWithdrawing(false);
    }
  };

  return (
    <>
      {toast && (
        <ActionToast
          title={toast.title}
          message={toast.message}
          variant={toast.variant}
          onClose={() => setToast(null)}
        />
      )}

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
                    className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-md transition-all"
                    dir="rtl"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Package className="w-4 h-4 text-emerald-600" />
                          <h3 className="font-bold text-slate-900">{item.pallet_type}</h3>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                          <span className="bg-slate-100 px-2 py-0.5 rounded">{item.size}</span>
                          <span className="bg-slate-100 px-2 py-0.5 rounded">درجة {item.quality}</span>
                          {item.condition && (
                            <span className="bg-slate-100 px-2 py-0.5 rounded">{item.condition}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-left">
                        <p className="text-xs text-slate-500">المتاح</p>
                        <p className="text-xl font-bold text-emerald-600">{item.quantity_available}</p>
                        {item.quantity_available < item.quantity && (
                          <p className="text-[10px] text-orange-600">من {item.quantity}</p>
                        )}
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

                    <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-100">
                      <div className="text-xs text-slate-500">
                        صفقة #{item.deal_ref}
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-bold text-emerald-600">
                          {(item.quantity_available * item.unit_price).toLocaleString()} ر.س
                        </div>
                        {item.quantity_available < item.quantity && (
                          <div className="text-[10px] text-slate-400 line-through">
                            {item.total_paid.toLocaleString()} ر.س
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => setSelectedItem(item)}
                        className="flex-1 bg-slate-100 text-slate-700 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-200 transition-colors"
                      >
                        عرض التفاصيل
                      </button>
                      {item.quantity_available > 0 && (
                        <button
                          onClick={() => {
                            setSelectedItem(item);
                            setShowWithdrawDialog(true);
                          }}
                          className="flex-1 bg-gradient-to-l from-orange-500 to-orange-600 text-white py-2.5 rounded-xl text-sm font-medium hover:from-orange-600 hover:to-orange-700 transition-all flex items-center justify-center gap-2 shadow-md"
                        >
                          <TrendingDown className="w-4 h-4" />
                          سحب كمية
                        </button>
                      )}
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
                <DetailRow label="الكمية المشتراة" value={`${selectedItem.quantity} طبلية`} />
                <DetailRow label="المتاحة للتصرف" value={`${selectedItem.quantity_available} طبلية`} />
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
                className="w-full bg-emerald-600 text-white py-3 rounded-xl font-medium hover:bg-emerald-700 transition-colors"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {showWithdrawDialog && selectedItem && (
        <div
          className="fixed inset-0 z-[120] flex items-end lg:items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
          onClick={() => !isWithdrawing && setShowWithdrawDialog(false)}
        >
          <div
            className="relative bg-white rounded-t-3xl lg:rounded-3xl max-w-lg w-full mx-0 lg:mx-4 overflow-hidden slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-center pt-3 pb-0 lg:hidden">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>

            <div className="p-6">
              <div className="flex items-start gap-4 mb-5">
                <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg">
                  <TrendingDown className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-slate-900 mb-1">سحب كمية من المخزون</h3>
                  <p className="text-sm text-slate-600">
                    {selectedItem.pallet_type} • {selectedItem.size} • درجة {selectedItem.quality}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-lg">
                      <span className="text-xs text-emerald-600 font-medium">المتاح: </span>
                      <span className="text-sm font-bold text-emerald-700">{selectedItem.quantity_available}</span>
                      <span className="text-xs text-emerald-600"> طبلية</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200 rounded-2xl p-4 mb-5">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-blue-900 mb-1.5">بإمكانك إعادة بيع المخزون</h4>
                    <p className="text-xs text-blue-700 leading-relaxed">
                      بعد السحب، يمكنك إضافة هذا المخزون للبيع في المنصة بسعر جديد من حسابك أو من الواجهة الرئيسية عبر زر "إضافة مخزون"
                    </p>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <label className="text-sm font-bold text-slate-900 mb-3 block">
                  الكمية المراد سحبها
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder="أدخل الكمية..."
                    className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-200 rounded-2xl text-2xl font-bold text-slate-900 text-center focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                    disabled={isWithdrawing}
                    min="1"
                    max={selectedItem.quantity_available}
                  />
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">
                    طبلية
                  </div>
                </div>
                <div className="flex items-center justify-center gap-2 mt-3">
                  <button
                    onClick={() => setWithdrawAmount(Math.floor(selectedItem.quantity_available / 2).toString())}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg transition-colors"
                    disabled={isWithdrawing}
                  >
                    النصف
                  </button>
                  <button
                    onClick={() => setWithdrawAmount(selectedItem.quantity_available.toString())}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg transition-colors"
                    disabled={isWithdrawing}
                  >
                    الكل
                  </button>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowWithdrawDialog(false);
                    setWithdrawAmount('');
                  }}
                  disabled={isWithdrawing}
                  className="flex-1 bg-slate-100 text-slate-700 py-3.5 rounded-xl font-semibold hover:bg-slate-200 disabled:opacity-50 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleWithdraw}
                  disabled={isWithdrawing || !withdrawAmount || parseInt(withdrawAmount) <= 0}
                  className="flex-1 bg-gradient-to-l from-orange-500 to-orange-600 text-white py-3.5 rounded-xl font-semibold hover:from-orange-600 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg transition-all"
                >
                  {isWithdrawing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      جاري السحب...
                    </>
                  ) : (
                    <>
                      <TrendingDown className="w-5 h-5" />
                      تأكيد السحب
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
