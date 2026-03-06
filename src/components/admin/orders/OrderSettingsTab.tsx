import { useState } from 'react';
import { Save, Plus, Eye, EyeOff, ArrowUp, ArrowDown } from 'lucide-react';
import type { OrderType, QuantitySettings } from '../../../hooks/useAdminOrders';

interface Props {
  orderTypes: OrderType[];
  quantitySettings: QuantitySettings | null;
  onUpdateOrderType: (typeId: string, updates: Partial<OrderType>) => Promise<{ success: boolean; error?: string }>;
  onCreateOrderType: (newType: Omit<OrderType, 'id' | 'created_at' | 'updated_at'>) => Promise<{ success: boolean; error?: string }>;
  onUpdateQuantitySettings: (updates: Partial<QuantitySettings>) => Promise<{ success: boolean; error?: string }>;
}

export default function OrderSettingsTab({
  orderTypes,
  quantitySettings,
  onUpdateOrderType,
  onCreateOrderType,
  onUpdateQuantitySettings
}: Props) {
  const [minQty, setMinQty] = useState(quantitySettings?.min_quantity || 100);
  const [maxQty, setMaxQty] = useState(quantitySettings?.max_quantity || 10000);
  const [qtyStep, setQtyStep] = useState(quantitySettings?.quantity_step || 100);
  const [quickQtys, setQuickQtys] = useState<string>(
    quantitySettings?.quick_quantities.join(', ') || '500, 1000, 2000, 5000'
  );

  const handleSaveQuantitySettings = async () => {
    const quickQuantitiesArray = quickQtys.split(',').map(q => parseInt(q.trim())).filter(q => !isNaN(q));

    const result = await onUpdateQuantitySettings({
      min_quantity: minQty,
      max_quantity: maxQty,
      quantity_step: qtyStep,
      quick_quantities: quickQuantitiesArray
    });

    if (result.success) {
      alert('تم حفظ الإعدادات بنجاح');
    }
  };

  const handleToggleActive = async (type: OrderType) => {
    await onUpdateOrderType(type.id, { is_active: !type.is_active });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">أنواع الطلبات</h3>

        <div className="space-y-3">
          {orderTypes.map((type) => (
            <div
              key={type.id}
              className="flex items-center gap-4 p-4 border border-gray-200 rounded-xl"
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: type.bg_color }}
              >
                <span className="text-xl">{type.icon === 'shopping-bag' ? '🛍️' : type.icon === 'zap' ? '⚡' : '🔄'}</span>
              </div>

              <div className="flex-1">
                <div className="font-semibold text-gray-900">{type.name_ar}</div>
                <div className="text-xs text-gray-500">{type.name_en}</div>
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

                <button className="p-2 hover:bg-gray-100 rounded-lg">
                  <ArrowUp className="w-4 h-4 text-gray-600" />
                </button>

                <button className="p-2 hover:bg-gray-100 rounded-lg">
                  <ArrowDown className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <button className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-50 text-gray-700 rounded-xl font-semibold hover:bg-gray-100 transition-colors">
          <Plus className="w-4 h-4" />
          إضافة نوع طلب جديد
        </button>
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

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">الكميات السريعة (مفصولة بفواصل)</label>
          <input
            type="text"
            value={quickQtys}
            onChange={(e) => setQuickQtys(e.target.value)}
            placeholder="500, 1000, 2000, 5000"
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl"
          />
          <p className="text-xs text-gray-500 mt-1">مثال: 500, 1000, 2000, 5000</p>
        </div>

        <button
          onClick={handleSaveQuantitySettings}
          className="mt-4 flex items-center justify-center gap-2 px-6 py-3 bg-[#1a4a5e] text-white rounded-xl font-semibold hover:bg-[#152f3d] transition-colors"
        >
          <Save className="w-4 h-4" />
          حفظ الإعدادات
        </button>
      </div>
    </div>
  );
}
