import { useState, useEffect } from 'react';
import { Save, Plus, Eye, EyeOff, ArrowUp, ArrowDown, CreditCard as Edit2, Trash2, Package, Zap, RefreshCw, Settings } from 'lucide-react';
import { useOrderSettings, type OrderType } from '../../../hooks/useOrderSettings';

const ICON_MAP: Record<string, any> = {
  'Package': Package,
  'Zap': Zap,
  'RefreshCw': RefreshCw
};

export default function OrderSettingsTab() {
  const {
    orderTypes,
    quantitySettings,
    summarySettings,
    palletTypes,
    palletSizes,
    qualityGrades,
    loading,
    error,
    createOrderType,
    updateOrderType,
    deleteOrderType,
    updateQuantitySettings,
    updateSummarySettings
  } = useOrderSettings();

  const [minQty, setMinQty] = useState(10);
  const [maxQty, setMaxQty] = useState(1000);
  const [qtyStep, setQtyStep] = useState(10);
  const [quickQtys, setQuickQtys] = useState<string>('50, 100, 200, 500');

  const [summaryEnabled, setSummaryEnabled] = useState(true);
  const [summaryShowTotal, setSummaryShowTotal] = useState(true);
  const [summaryShowLocation, setSummaryShowLocation] = useState(true);
  const [summaryButtonText, setSummaryButtonText] = useState('إكمال الطلب');

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingType, setEditingType] = useState<OrderType | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const [newType, setNewType] = useState({
    code: '',
    name_ar: '',
    name_en: '',
    description: '',
    icon: 'Package',
    sort_order: orderTypes.length + 1
  });

  useEffect(() => {
    if (quantitySettings) {
      setMinQty(quantitySettings.min_quantity);
      setMaxQty(quantitySettings.max_quantity);
      setQtyStep(quantitySettings.quantity_step);
      setQuickQtys(quantitySettings.quick_quantities.join(', '));
    }
  }, [quantitySettings]);

  useEffect(() => {
    if (summarySettings) {
      setSummaryEnabled(summarySettings.is_enabled);
      setSummaryShowTotal(summarySettings.show_total);
      setSummaryShowLocation(summarySettings.show_location);
      setSummaryButtonText(summarySettings.complete_button_text);
    }
  }, [summarySettings]);

  const handleSaveQuantitySettings = async () => {
    const quickQuantitiesArray = quickQtys.split(',').map(q => parseInt(q.trim())).filter(q => !isNaN(q));

    const result = await updateQuantitySettings({
      min_quantity: minQty,
      max_quantity: maxQty,
      quantity_step: qtyStep,
      quick_quantities: quickQuantitiesArray
    });

    if (result?.success) {
      alert('تم حفظ إعدادات الكميات بنجاح');
    }
  };

  const handleSaveSummarySettings = async () => {
    const result = await updateSummarySettings({
      is_enabled: summaryEnabled,
      show_total: summaryShowTotal,
      show_location: summaryShowLocation,
      complete_button_text: summaryButtonText
    });

    if (result?.success) {
      alert('تم حفظ إعدادات الملخص بنجاح');
    }
  };

  const handleToggleActive = async (type: OrderType) => {
    await updateOrderType(type.id, { is_active: !type.is_active });
  };

  const handleMoveUp = async (type: OrderType, index: number) => {
    if (index === 0) return;
    const prevType = orderTypes[index - 1];
    await updateOrderType(type.id, { sort_order: prevType.sort_order });
    await updateOrderType(prevType.id, { sort_order: type.sort_order });
  };

  const handleMoveDown = async (type: OrderType, index: number) => {
    if (index === orderTypes.length - 1) return;
    const nextType = orderTypes[index + 1];
    await updateOrderType(type.id, { sort_order: nextType.sort_order });
    await updateOrderType(nextType.id, { sort_order: type.sort_order });
  };

  const handleCreateOrderType = async () => {
    if (!newType.code || !newType.name_ar || !newType.name_en) {
      alert('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    const result = await createOrderType({
      code: newType.code,
      name_ar: newType.name_ar,
      name_en: newType.name_en,
      description: newType.description,
      icon: newType.icon,
      is_active: true,
      sort_order: newType.sort_order
    });

    if (result?.success) {
      setShowAddDialog(false);
      setNewType({
        code: '',
        name_ar: '',
        name_en: '',
        description: '',
        icon: 'Package',
        sort_order: orderTypes.length + 2
      });
      alert('تم إضافة نوع الطلب بنجاح');
    }
  };

  const handleDeleteOrderType = async (id: string) => {
    const result = await deleteOrderType(id);
    if (result?.success) {
      setShowDeleteConfirm(null);
      alert('تم حذف نوع الطلب بنجاح');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
        <p className="text-red-700">حدث خطأ: {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">أنواع الطلبات</h3>
          <button
            onClick={() => setShowAddDialog(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#1a4a5e] text-white rounded-xl font-semibold hover:bg-[#152f3d] transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            إضافة نوع جديد
          </button>
        </div>

        <div className="space-y-3">
          {orderTypes.map((type, index) => {
            const IconComponent = ICON_MAP[type.icon] || Package;
            return (
              <div
                key={type.id}
                className="flex items-center gap-4 p-4 border border-gray-200 rounded-xl hover:border-gray-300 transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                  <IconComponent className="w-5 h-5 text-gray-700" />
                </div>

                <div className="flex-1">
                  <div className="font-semibold text-gray-900">{type.name_ar}</div>
                  <div className="text-xs text-gray-500">{type.name_en} | {type.code}</div>
                  {type.description && (
                    <div className="text-xs text-gray-600 mt-1">{type.description}</div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleActive(type)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      type.is_active
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {type.is_active ? (
                      <><Eye className="w-3.5 h-3.5 inline ml-1" />مفعّل</>
                    ) : (
                      <><EyeOff className="w-3.5 h-3.5 inline ml-1" />مخفي</>
                    )}
                  </button>

                  <button
                    onClick={() => handleMoveUp(type, index)}
                    disabled={index === 0}
                    className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-30"
                  >
                    <ArrowUp className="w-4 h-4 text-gray-600" />
                  </button>

                  <button
                    onClick={() => handleMoveDown(type, index)}
                    disabled={index === orderTypes.length - 1}
                    className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-30"
                  >
                    <ArrowDown className="w-4 h-4 text-gray-600" />
                  </button>

                  <button
                    onClick={() => setEditingType(type)}
                    className="p-2 hover:bg-blue-50 rounded-lg"
                  >
                    <Edit2 className="w-4 h-4 text-blue-600" />
                  </button>

                  <button
                    onClick={() => setShowDeleteConfirm(type.id)}
                    className="p-2 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </button>
                </div>
              </div>
            );
          })}

          {orderTypes.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              لا توجد أنواع طلبات. قم بإضافة نوع جديد.
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">إعدادات الكميات</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">أقل كمية للطلب</label>
            <input
              type="number"
              value={minQty}
              onChange={(e) => setMinQty(parseInt(e.target.value))}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">أكبر كمية للطلب</label>
            <input
              type="number"
              value={maxQty}
              onChange={(e) => setMaxQty(parseInt(e.target.value))}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">خطوة زيادة الكمية</label>
            <input
              type="number"
              value={qtyStep}
              onChange={(e) => setQtyStep(parseInt(e.target.value))}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl"
            />
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">الكميات السريعة (مفصولة بفواصل)</label>
          <input
            type="text"
            value={quickQtys}
            onChange={(e) => setQuickQtys(e.target.value)}
            placeholder="50, 100, 200, 500"
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl"
          />
          <p className="text-xs text-gray-500 mt-1">مثال: 50, 100, 200, 500</p>
        </div>

        <button
          onClick={handleSaveQuantitySettings}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-[#1a4a5e] text-white rounded-xl font-semibold hover:bg-[#152f3d] transition-colors"
        >
          <Save className="w-4 h-4" />
          حفظ إعدادات الكميات
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">ربط عناصر الطبليات</h3>

        <div className="space-y-4">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <p className="text-sm text-blue-800">
              <strong>ملاحظة:</strong> صفحة إنشاء الطلب تستخدم نفس عناصر الطبليات الموجودة في نظام إدارة المخزون.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border border-gray-200 rounded-xl">
              <div className="text-sm font-semibold text-gray-700 mb-2">أنواع الطبليات</div>
              <div className="text-2xl font-bold text-gray-900">{palletTypes.length}</div>
              <div className="text-xs text-gray-500 mt-1">نوع نشط</div>
            </div>

            <div className="p-4 border border-gray-200 rounded-xl">
              <div className="text-sm font-semibold text-gray-700 mb-2">مقاسات الطبليات</div>
              <div className="text-2xl font-bold text-gray-900">{palletSizes.length}</div>
              <div className="text-xs text-gray-500 mt-1">مقاس نشط</div>
            </div>

            <div className="p-4 border border-gray-200 rounded-xl">
              <div className="text-sm font-semibold text-gray-700 mb-2">درجات الجودة</div>
              <div className="text-2xl font-bold text-gray-900">{qualityGrades.length}</div>
              <div className="text-xs text-gray-500 mt-1">درجة نشطة</div>
            </div>
          </div>

          <p className="text-sm text-gray-600">
            يمكنك إدارة هذه العناصر من قسم <strong>إدارة المخزون</strong> في لوحة التحكم.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Settings className="w-5 h-5" />
          إعدادات شريط الملخص
        </h3>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="summaryEnabled"
              checked={summaryEnabled}
              onChange={(e) => setSummaryEnabled(e.target.checked)}
              className="w-5 h-5 rounded border-gray-300"
            />
            <label htmlFor="summaryEnabled" className="text-sm font-semibold text-gray-700">
              تفعيل شريط الملخص
            </label>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="summaryShowTotal"
              checked={summaryShowTotal}
              onChange={(e) => setSummaryShowTotal(e.target.checked)}
              className="w-5 h-5 rounded border-gray-300"
            />
            <label htmlFor="summaryShowTotal" className="text-sm font-semibold text-gray-700">
              عرض إجمالي الكمية
            </label>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="summaryShowLocation"
              checked={summaryShowLocation}
              onChange={(e) => setSummaryShowLocation(e.target.checked)}
              className="w-5 h-5 rounded border-gray-300"
            />
            <label htmlFor="summaryShowLocation" className="text-sm font-semibold text-gray-700">
              عرض الموقع
            </label>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">نص زر الإكمال</label>
            <input
              type="text"
              value={summaryButtonText}
              onChange={(e) => setSummaryButtonText(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl"
            />
          </div>

          <button
            onClick={handleSaveSummarySettings}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-[#1a4a5e] text-white rounded-xl font-semibold hover:bg-[#152f3d] transition-colors"
          >
            <Save className="w-4 h-4" />
            حفظ إعدادات الملخص
          </button>
        </div>
      </div>

      {showAddDialog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">إضافة نوع طلب جديد</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">الكود (بالإنجليزية)</label>
                <input
                  type="text"
                  value={newType.code}
                  onChange={(e) => setNewType({...newType, code: e.target.value})}
                  placeholder="مثال: express"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">الاسم بالعربية</label>
                <input
                  type="text"
                  value={newType.name_ar}
                  onChange={(e) => setNewType({...newType, name_ar: e.target.value})}
                  placeholder="مثال: طلب سريع"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">الاسم بالإنجليزية</label>
                <input
                  type="text"
                  value={newType.name_en}
                  onChange={(e) => setNewType({...newType, name_en: e.target.value})}
                  placeholder="مثال: Express Order"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">الوصف</label>
                <textarea
                  value={newType.description}
                  onChange={(e) => setNewType({...newType, description: e.target.value})}
                  placeholder="وصف مختصر لنوع الطلب"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">الأيقونة</label>
                <select
                  value={newType.icon}
                  onChange={(e) => setNewType({...newType, icon: e.target.value})}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl"
                >
                  <option value="Package">Package</option>
                  <option value="Zap">Zap</option>
                  <option value="RefreshCw">RefreshCw</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleCreateOrderType}
                className="flex-1 px-4 py-2.5 bg-[#1a4a5e] text-white rounded-xl font-semibold hover:bg-[#152f3d] transition-colors"
              >
                إضافة
              </button>
              <button
                onClick={() => setShowAddDialog(false)}
                className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">تأكيد الحذف</h3>
            <p className="text-gray-600 mb-6">هل أنت متأكد من حذف هذا النوع؟ لا يمكن التراجع عن هذا الإجراء.</p>
            <div className="flex gap-3">
              <button
                onClick={() => handleDeleteOrderType(showDeleteConfirm)}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors"
              >
                حذف
              </button>
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}