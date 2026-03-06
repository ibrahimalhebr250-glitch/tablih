import { useState } from 'react';
import { Plus, CreditCard as Edit2, Trash2, Eye, EyeOff, Clipboard } from 'lucide-react';
import { useInventorySettings } from '../../../hooks/useInventorySettings';
import { useAdminInventory } from '../../../hooks/useAdminInventory';

interface Props {
  adminEmail: string;
}

export default function ConditionsTab({ adminEmail }: Props) {
  const { palletConditions, loading, refetch } = useInventorySettings();
  const { managePalletCondition, toggleItemStatus, deleteItem } = useAdminInventory(adminEmail);

  const [showDialog, setShowDialog] = useState(false);
  const [editingCondition, setEditingCondition] = useState<any>(null);
  const [formData, setFormData] = useState({
    code: '',
    name_ar: '',
    name_en: '',
    icon: '📦',
    is_active: true,
    display_order: 0,
  });
  const [saving, setSaving] = useState(false);

  const predefinedIcons = ['✨', '📦', '🔧', '♻️', '🆕', '📋', '⚠️', '✅'];

  const openDialog = (condition: any | null = null) => {
    if (condition) {
      setEditingCondition(condition);
      setFormData({
        code: condition.code,
        name_ar: condition.name_ar,
        name_en: condition.name_en,
        icon: condition.icon,
        is_active: condition.is_active,
        display_order: condition.display_order,
      });
    } else {
      setEditingCondition(null);
      setFormData({
        code: '',
        name_ar: '',
        name_en: '',
        icon: '📦',
        is_active: true,
        display_order: palletConditions.length,
      });
    }
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!formData.code.trim() || !formData.name_ar.trim() || !formData.name_en.trim()) {
      alert('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    try {
      setSaving(true);
      await managePalletCondition({
        id: editingCondition?.id,
        ...formData,
      });
      await refetch();
      setShowDialog(false);
    } catch (error) {
      console.error('Error saving pallet condition:', error);
      alert('حدث خطأ أثناء الحفظ');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (conditionId: string, isActive: boolean) => {
    try {
      await toggleItemStatus('inventory_pallet_conditions', conditionId, !isActive);
      await refetch();
    } catch (error) {
      console.error('Error toggling status:', error);
      alert('حدث خطأ أثناء تحديث الحالة');
    }
  };

  const handleDelete = async (conditionId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه الحالة؟')) return;

    try {
      await deleteItem('inventory_pallet_conditions', conditionId);
      await refetch();
    } catch (error) {
      console.error('Error deleting condition:', error);
      alert('حدث خطأ أثناء الحذف');
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
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-900">حالة الطبلية</h2>
          <p className="text-sm text-slate-600 mt-1">إدارة حالات الطبليات المتاحة</p>
        </div>
        <button
          onClick={() => openDialog(null)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          إضافة حالة جديدة
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">إجمالي الحالات</p>
              <p className="text-2xl font-bold text-slate-900">{palletConditions.length}</p>
            </div>
            <Clipboard className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">النشطة</p>
              <p className="text-2xl font-bold text-green-600">
                {palletConditions.filter(c => c.is_active).length}
              </p>
            </div>
            <Eye className="w-8 h-8 text-green-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">المخفية</p>
              <p className="text-2xl font-bold text-slate-600">
                {palletConditions.filter(c => !c.is_active).length}
              </p>
            </div>
            <EyeOff className="w-8 h-8 text-slate-400" />
          </div>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {palletConditions.map((condition) => (
          <div
            key={condition.id}
            className={`bg-white rounded-lg border-2 p-4 transition-all ${
              condition.is_active ? 'border-slate-200' : 'border-slate-100 opacity-60'
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="text-4xl">{condition.icon}</div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">{condition.name_ar}</h3>
                  <p className="text-sm text-slate-500">{condition.name_en}</p>
                  <span className="inline-block mt-1 px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded">
                    {condition.code}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 pt-3 border-t border-slate-100">
              <button
                onClick={() => handleToggleStatus(condition.id, condition.is_active)}
                className={`p-1.5 rounded ${
                  condition.is_active
                    ? 'hover:bg-slate-100 text-slate-600'
                    : 'hover:bg-green-50 text-green-600'
                }`}
                title={condition.is_active ? 'إخفاء' : 'إظهار'}
              >
                {condition.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              <button
                onClick={() => openDialog(condition)}
                className="p-1.5 rounded hover:bg-blue-50 text-blue-600"
                title="تعديل"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDelete(condition.id)}
                className="p-1.5 rounded hover:bg-red-50 text-red-600"
                title="حذف"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <span className="mr-auto text-xs text-slate-500">ترتيب: {condition.display_order}</span>
            </div>

            <div className="mt-2">
              <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                condition.is_active
                  ? 'bg-green-100 text-green-700'
                  : 'bg-slate-100 text-slate-600'
              }`}>
                {condition.is_active ? 'نشط' : 'مخفي'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {palletConditions.length === 0 && (
        <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
          <Clipboard className="w-16 h-16 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">لا توجد حالات</h3>
          <p className="text-slate-600 mb-4">ابدأ بإضافة أول حالة للطبليات</p>
          <button
            onClick={() => openDialog(null)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            إضافة حالة جديدة
          </button>
        </div>
      )}

      {/* Dialog */}
      {showDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-slate-900 mb-4">
              {editingCondition ? 'تعديل الحالة' : 'إضافة حالة جديدة'}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  رمز الحالة *
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="مثال: NEW"
                  maxLength={20}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  الاسم بالعربية *
                </label>
                <input
                  type="text"
                  value={formData.name_ar}
                  onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="مثال: جديدة"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  الاسم بالإنجليزية *
                </label>
                <input
                  type="text"
                  value={formData.name_en}
                  onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Example: New"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  الأيقونة (Emoji)
                </label>
                <div className="grid grid-cols-8 gap-2 mb-2">
                  {predefinedIcons.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setFormData({ ...formData, icon })}
                      className={`h-12 text-2xl rounded-lg border-2 transition-all ${
                        formData.icon === icon
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-slate-200 hover:border-slate-400'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="أو أدخل emoji مخصص"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  ترتيب العرض
                </label>
                <input
                  type="number"
                  value={formData.display_order}
                  onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700">نشط</span>
                </label>
              </div>

              {/* Preview */}
              {formData.name_ar && (
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="text-xs text-slate-500 mb-2">معاينة:</p>
                  <div className="flex items-center gap-3">
                    <div className="text-4xl">{formData.icon}</div>
                    <div>
                      <p className="font-bold text-slate-900">{formData.name_ar}</p>
                      <p className="text-sm text-slate-500">{formData.name_en}</p>
                      <span className="inline-block mt-1 px-2 py-0.5 bg-slate-200 text-slate-600 text-xs rounded">
                        {formData.code}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {saving ? 'جاري الحفظ...' : 'حفظ'}
              </button>
              <button
                onClick={() => setShowDialog(false)}
                disabled={saving}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors disabled:opacity-50"
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
