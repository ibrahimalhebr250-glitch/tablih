import { useState } from 'react';
import { Plus, Edit2, Trash2, Eye, EyeOff, Ruler } from 'lucide-react';
import { useInventorySettings } from '../../../hooks/useInventorySettings';
import { useAdminInventory } from '../../../hooks/useAdminInventory';

interface Props {
  adminEmail: string;
}

export default function PalletSizesTab({ adminEmail }: Props) {
  const { palletTypes, palletSizes, loading, refetch } = useInventorySettings();
  const { managePalletSize, toggleItemStatus, deleteItem } = useAdminInventory(adminEmail);

  const [showDialog, setShowDialog] = useState(false);
  const [editingSize, setEditingSize] = useState<any>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [formData, setFormData] = useState({
    pallet_type_id: '',
    length: 0,
    width: 0,
    max_weight_kg: 0,
    name_ar: '',
    name_en: '',
    is_active: true,
    display_order: 0,
  });
  const [saving, setSaving] = useState(false);

  const filteredSizes = filterType === 'all'
    ? palletSizes
    : palletSizes.filter(size => size.pallet_type_id === filterType);

  const openDialog = (size: any | null = null) => {
    if (size) {
      setEditingSize(size);
      setFormData({
        pallet_type_id: size.pallet_type_id,
        length: size.length,
        width: size.width,
        max_weight_kg: size.max_weight_kg,
        name_ar: size.name_ar || '',
        name_en: size.name_en || '',
        is_active: size.is_active,
        display_order: size.display_order,
      });
    } else {
      setEditingSize(null);
      setFormData({
        pallet_type_id: palletTypes.length > 0 ? palletTypes[0].id : '',
        length: 0,
        width: 0,
        max_weight_kg: 0,
        name_ar: '',
        name_en: '',
        is_active: true,
        display_order: palletSizes.length,
      });
    }
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!formData.pallet_type_id || !formData.length || !formData.width) {
      alert('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    try {
      setSaving(true);
      await managePalletSize({
        id: editingSize?.id,
        ...formData,
      });
      await refetch();
      setShowDialog(false);
    } catch (error) {
      console.error('Error saving pallet size:', error);
      alert('حدث خطأ أثناء الحفظ');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (sizeId: string, isActive: boolean) => {
    try {
      await toggleItemStatus('inventory_pallet_sizes', sizeId, !isActive);
      await refetch();
    } catch (error) {
      console.error('Error toggling status:', error);
      alert('حدث خطأ أثناء تحديث الحالة');
    }
  };

  const handleDelete = async (sizeId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا المقاس؟')) return;

    try {
      await deleteItem('inventory_pallet_sizes', sizeId);
      await refetch();
    } catch (error) {
      console.error('Error deleting size:', error);
      alert('حدث خطأ أثناء الحذف');
    }
  };

  const getPalletTypeName = (typeId: string) => {
    return palletTypes.find(t => t.id === typeId)?.name_ar || 'غير معروف';
  };

  const getPalletTypeIcon = (typeId: string) => {
    return palletTypes.find(t => t.id === typeId)?.icon || '📦';
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
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">مقاسات الطبليات</h2>
          <p className="text-sm text-slate-600 mt-1">إدارة مقاسات الطبليات والأبعاد والأوزان</p>
        </div>
        <div className="flex gap-3 w-full lg:w-auto">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="flex-1 lg:flex-none px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">جميع الأنواع</option>
            {palletTypes.map(type => (
              <option key={type.id} value={type.id}>{type.icon} {type.name_ar}</option>
            ))}
          </select>
          <button
            onClick={() => openDialog(null)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            إضافة مقاس
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">إجمالي المقاسات</p>
              <p className="text-2xl font-bold text-slate-900">{filteredSizes.length}</p>
            </div>
            <Ruler className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">النشطة</p>
              <p className="text-2xl font-bold text-green-600">
                {filteredSizes.filter(s => s.is_active).length}
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
                {filteredSizes.filter(s => !s.is_active).length}
              </p>
            </div>
            <EyeOff className="w-8 h-8 text-slate-400" />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-600">نوع الطبلية</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-600">المقاس</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-600">الطول (سم)</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-600">العرض (سم)</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-600">قدرة التحمل</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-600">الترتيب</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-600">الحالة</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-600">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredSizes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                    لا توجد مقاسات
                  </td>
                </tr>
              ) : (
                filteredSizes.map((size) => (
                  <tr key={size.id} className={`hover:bg-slate-50 ${!size.is_active ? 'opacity-60' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{getPalletTypeIcon(size.pallet_type_id)}</span>
                        <span className="text-sm font-medium text-slate-900">
                          {getPalletTypeName(size.pallet_type_id)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-bold text-slate-900">
                        {size.length}×{size.width}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-slate-700">{size.length} سم</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-slate-700">{size.width} سم</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-slate-900">
                        {size.max_weight_kg >= 1000
                          ? `${(size.max_weight_kg / 1000).toFixed(1)} طن`
                          : `${size.max_weight_kg} كجم`
                        }
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-slate-600">{size.display_order}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        size.is_active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {size.is_active ? 'نشط' : 'مخفي'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleToggleStatus(size.id, size.is_active)}
                          className={`p-1.5 rounded ${
                            size.is_active
                              ? 'hover:bg-slate-100 text-slate-600'
                              : 'hover:bg-green-50 text-green-600'
                          }`}
                          title={size.is_active ? 'إخفاء' : 'إظهار'}
                        >
                          {size.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => openDialog(size)}
                          className="p-1.5 rounded hover:bg-blue-50 text-blue-600"
                          title="تعديل"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(size.id)}
                          className="p-1.5 rounded hover:bg-red-50 text-red-600"
                          title="حذف"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dialog */}
      {showDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-slate-900 mb-4">
              {editingSize ? 'تعديل المقاس' : 'إضافة مقاس جديد'}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  نوع الطبلية *
                </label>
                <select
                  value={formData.pallet_type_id}
                  onChange={(e) => setFormData({ ...formData, pallet_type_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">اختر نوع الطبلية</option>
                  {palletTypes.filter(t => t.is_active).map(type => (
                    <option key={type.id} value={type.id}>
                      {type.icon} {type.name_ar}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    الطول (سم) *
                  </label>
                  <input
                    type="number"
                    value={formData.length}
                    onChange={(e) => setFormData({ ...formData, length: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="120"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    العرض (سم) *
                  </label>
                  <input
                    type="number"
                    value={formData.width}
                    onChange={(e) => setFormData({ ...formData, width: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  قدرة التحمل (كجم) *
                </label>
                <input
                  type="number"
                  value={formData.max_weight_kg}
                  onChange={(e) => setFormData({ ...formData, max_weight_kg: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="1000"
                />
                <p className="text-xs text-slate-500 mt-1">
                  أدخل الوزن بالكيلوجرام (1000 كجم = 1 طن)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  الاسم بالعربية (اختياري)
                </label>
                <input
                  type="text"
                  value={formData.name_ar}
                  onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="مثال: يورو قياسي"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  الاسم بالإنجليزية (اختياري)
                </label>
                <input
                  type="text"
                  value={formData.name_en}
                  onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Example: Euro Standard"
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

              {formData.length > 0 && formData.width > 0 && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-700 font-medium">
                    معاينة: {formData.length}×{formData.width} سم
                    {formData.max_weight_kg > 0 && ` - تحمل ${formData.max_weight_kg >= 1000 ? `${(formData.max_weight_kg / 1000).toFixed(1)} طن` : `${formData.max_weight_kg} كجم`}`}
                  </p>
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
