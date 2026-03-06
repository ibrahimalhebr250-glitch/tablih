import { useState } from 'react';
import { Plus, CreditCard as Edit2, Trash2, Eye, EyeOff, GripVertical } from 'lucide-react';
import { useInventorySettings } from '../../../hooks/useInventorySettings';
import { useAdminInventory } from '../../../hooks/useAdminInventory';

interface Props {
  adminEmail: string;
}

export default function PalletTypesTab({ adminEmail }: Props) {
  const { palletTypes, loading, refetch } = useInventorySettings();
  const { managePalletType, toggleItemStatus, deleteItem } = useAdminInventory(adminEmail);

  const [showDialog, setShowDialog] = useState(false);
  const [editingType, setEditingType] = useState<any>(null);
  const [formData, setFormData] = useState({
    name_ar: '',
    name_en: '',
    icon: '📦',
    is_active: true,
    display_order: 0,
  });
  const [saving, setSaving] = useState(false);

  const openDialog = (type: any | null = null) => {
    if (type) {
      setEditingType(type);
      setFormData({
        name_ar: type.name_ar,
        name_en: type.name_en,
        icon: type.icon,
        is_active: type.is_active,
        display_order: type.display_order,
      });
    } else {
      setEditingType(null);
      setFormData({
        name_ar: '',
        name_en: '',
        icon: '📦',
        is_active: true,
        display_order: palletTypes.length,
      });
    }
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!formData.name_ar.trim() || !formData.name_en.trim()) {
      alert('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    try {
      setSaving(true);
      await managePalletType({
        id: editingType?.id,
        ...formData,
      });
      await refetch();
      setShowDialog(false);
    } catch (error) {
      console.error('Error saving pallet type:', error);
      alert('حدث خطأ أثناء الحفظ');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (typeId: string, isActive: boolean) => {
    try {
      await toggleItemStatus('inventory_pallet_types', typeId, !isActive);
      await refetch();
    } catch (error) {
      console.error('Error toggling status:', error);
      alert('حدث خطأ أثناء تحديث الحالة');
    }
  };

  const handleDelete = async (typeId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا النوع؟')) return;

    try {
      await deleteItem('inventory_pallet_types', typeId);
      await refetch();
    } catch (error) {
      console.error('Error deleting type:', error);
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
          <h2 className="text-xl font-bold text-slate-900">أنواع الطبليات</h2>
          <p className="text-sm text-slate-600 mt-1">إدارة أنواع الطبليات المتاحة في النظام</p>
        </div>
        <button
          onClick={() => openDialog(null)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          إضافة نوع جديد
        </button>
      </div>

      {/* List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {palletTypes.map((type) => (
          <div
            key={type.id}
            className={`bg-white rounded-lg border-2 p-4 transition-all ${
              type.is_active ? 'border-slate-200' : 'border-slate-100 opacity-60'
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="text-3xl">{type.icon}</div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{type.name_ar}</h3>
                  <p className="text-sm text-slate-500">{type.name_en}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleToggleStatus(type.id, type.is_active)}
                  className={`p-1.5 rounded ${
                    type.is_active
                      ? 'hover:bg-slate-100 text-slate-600'
                      : 'hover:bg-green-50 text-green-600'
                  }`}
                  title={type.is_active ? 'إخفاء' : 'إظهار'}
                >
                  {type.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => openDialog(type)}
                  className="p-1.5 rounded hover:bg-blue-50 text-blue-600"
                  title="تعديل"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(type.id)}
                  className="p-1.5 rounded hover:bg-red-50 text-red-600"
                  title="حذف"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                type.is_active
                  ? 'bg-green-100 text-green-700'
                  : 'bg-slate-100 text-slate-600'
              }`}>
                {type.is_active ? 'نشط' : 'مخفي'}
              </span>
              <span className="text-xs text-slate-500">ترتيب: {type.display_order}</span>
            </div>
          </div>
        ))}
      </div>

      {palletTypes.length === 0 && (
        <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
          <div className="text-6xl mb-4">📦</div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">لا توجد أنواع</h3>
          <p className="text-slate-600 mb-4">ابدأ بإضافة أول نوع من الطبليات</p>
          <button
            onClick={() => openDialog(null)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            إضافة نوع جديد
          </button>
        </div>
      )}

      {/* Dialog */}
      {showDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">
              {editingType ? 'تعديل نوع الطبلية' : 'إضافة نوع جديد'}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  الاسم بالعربية *
                </label>
                <input
                  type="text"
                  value={formData.name_ar}
                  onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="مثال: خشبية"
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
                  placeholder="Example: Wooden"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  الأيقونة (Emoji)
                </label>
                <input
                  type="text"
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="📦"
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
