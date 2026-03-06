import { useState, useEffect } from 'react';
import { Save, Settings as SettingsIcon, Package, DollarSign, Image, FileText } from 'lucide-react';
import { useInventorySettings } from '../../../hooks/useInventorySettings';
import { useAdminInventory } from '../../../hooks/useAdminInventory';

interface Props {
  adminEmail: string;
}

export default function SettingsTab({ adminEmail }: Props) {
  const { settings: currentSettings, loading } = useInventorySettings();
  const { updateSettings } = useAdminInventory(adminEmail);

  const [formData, setFormData] = useState({
    min_quantity: 100,
    max_quantity: 10000,
    quantity_step: 100,
    min_price: 0,
    max_price: 1000,
    price_step: 5,
    allow_negotiation: true,
    max_images: 5,
    max_image_size_mb: 5,
    max_description_length: 300,
    description_required: false,
    require_approval: false,
    auto_match_enabled: true,
  });

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (currentSettings) {
      setFormData({
        min_quantity: currentSettings.min_quantity,
        max_quantity: currentSettings.max_quantity,
        quantity_step: currentSettings.quantity_step,
        min_price: currentSettings.min_price,
        max_price: currentSettings.max_price,
        price_step: currentSettings.price_step,
        allow_negotiation: currentSettings.allow_negotiation,
        max_images: currentSettings.max_images,
        max_image_size_mb: currentSettings.max_image_size_mb,
        max_description_length: currentSettings.max_description_length,
        description_required: currentSettings.description_required,
        require_approval: currentSettings.require_approval,
        auto_match_enabled: currentSettings.auto_match_enabled,
      });
    }
  }, [currentSettings]);

  const handleSave = async () => {
    try {
      setSaving(true);
      await updateSettings(formData);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('حدث خطأ أثناء حفظ الإعدادات');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Save Button */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-900">الإعدادات العامة</h2>
          <p className="text-sm text-slate-600 mt-1">التحكم في حدود وقواعد إضافة المخزون</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
        </button>
      </div>

      {saveSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <p className="text-green-700 font-medium">تم حفظ الإعدادات بنجاح</p>
        </div>
      )}

      {/* Quantity Settings */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
            <Package className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">إعدادات الكمية</h3>
            <p className="text-sm text-slate-600">تحديد الحدود المسموح بها للكميات</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              أقل كمية مسموحة
            </label>
            <input
              type="number"
              value={formData.min_quantity}
              onChange={(e) => setFormData({ ...formData, min_quantity: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              أكبر كمية مسموحة
            </label>
            <input
              type="number"
              value={formData.max_quantity}
              onChange={(e) => setFormData({ ...formData, max_quantity: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              خطوة الزيادة
            </label>
            <input
              type="number"
              value={formData.quantity_step}
              onChange={(e) => setFormData({ ...formData, quantity_step: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-700">
            سيتمكن الموردون من إضافة كميات من {formData.min_quantity} إلى {formData.max_quantity} طبلية بزيادة قدرها {formData.quantity_step} طبلية
          </p>
        </div>
      </div>

      {/* Price Settings */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">إعدادات السعر</h3>
            <p className="text-sm text-slate-600">تحديد نطاق الأسعار المقترحة</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              أقل سعر مقترح (ر.س)
            </label>
            <input
              type="number"
              value={formData.min_price}
              onChange={(e) => setFormData({ ...formData, min_price: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              أعلى سعر مقترح (ر.س)
            </label>
            <input
              type="number"
              value={formData.max_price}
              onChange={(e) => setFormData({ ...formData, max_price: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              خطوة السعر (ر.س)
            </label>
            <input
              type="number"
              value={formData.price_step}
              onChange={(e) => setFormData({ ...formData, price_step: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.allow_negotiation}
              onChange={(e) => setFormData({ ...formData, allow_negotiation: e.target.checked })}
              className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-slate-700">السماح بخيار التفاوض (السعر = 0)</span>
          </label>
        </div>
      </div>

      {/* Image Settings */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
            <Image className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">إعدادات الصور</h3>
            <p className="text-sm text-slate-600">تحديد قواعد رفع الصور</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              الحد الأقصى لعدد الصور
            </label>
            <input
              type="number"
              value={formData.max_images}
              onChange={(e) => setFormData({ ...formData, max_images: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              الحد الأقصى لحجم الصورة (MB)
            </label>
            <input
              type="number"
              value={formData.max_image_size_mb}
              onChange={(e) => setFormData({ ...formData, max_image_size_mb: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Description Settings */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
            <FileText className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">إعدادات الوصف</h3>
            <p className="text-sm text-slate-600">تحديد قواعد وصف المخزون</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              الحد الأقصى لعدد الأحرف
            </label>
            <input
              type="number"
              value={formData.max_description_length}
              onChange={(e) => setFormData({ ...formData, max_description_length: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.description_required}
                onChange={(e) => setFormData({ ...formData, description_required: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-slate-700">جعل الوصف إلزامياً</span>
            </label>
          </div>
        </div>
      </div>

      {/* General Settings */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
            <SettingsIcon className="w-5 h-5 text-slate-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">إعدادات عامة</h3>
            <p className="text-sm text-slate-600">إعدادات متنوعة للنظام</p>
          </div>
        </div>

        <div className="space-y-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.require_approval}
              onChange={(e) => setFormData({ ...formData, require_approval: e.target.checked })}
              className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-slate-700">يتطلب موافقة الإدارة قبل النشر</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.auto_match_enabled}
              onChange={(e) => setFormData({ ...formData, auto_match_enabled: e.target.checked })}
              className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-slate-700">تفعيل المطابقة التلقائية مع الطلبات</span>
          </label>
        </div>
      </div>
    </div>
  );
}
