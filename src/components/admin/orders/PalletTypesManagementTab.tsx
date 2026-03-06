import { useState, useEffect } from 'react';
import { Plus, CreditCard as Edit2, Trash2, Eye, EyeOff, GripVertical } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface PalletType {
  id: string;
  name: string;
  name_en: string;
  icon?: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export default function PalletTypesManagementTab() {
  const [types, setTypes] = useState<PalletType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingType, setEditingType] = useState<PalletType | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    name_en: '',
    icon: '',
    is_active: true
  });

  useEffect(() => {
    loadTypes();
  }, []);

  const loadTypes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('pallet_types_master_master')
        .select('*')
        .order('sort_order');

      if (error) throw error;
      setTypes(data || []);
    } catch (err) {
      console.error('Error loading pallet types:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingType) {
        const { error } = await supabase
          .from('pallet_types_master')
          .update({
            name: formData.name,
            name_en: formData.name_en,
            icon: formData.icon || null,
            is_active: formData.is_active,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingType.id);

        if (error) throw error;
      } else {
        const maxOrder = types.length > 0 ? Math.max(...types.map(t => t.sort_order)) : 0;
        const { error } = await supabase
          .from('pallet_types_master')
          .insert([{
            name: formData.name,
            name_en: formData.name_en,
            icon: formData.icon || null,
            is_active: formData.is_active,
            sort_order: maxOrder + 1
          }]);

        if (error) throw error;
      }

      setShowDialog(false);
      setEditingType(null);
      setFormData({ name: '', name_en: '', icon: '', is_active: true });
      loadTypes();
    } catch (err) {
      console.error('Error saving pallet type:', err);
      alert('حدث خطأ أثناء الحفظ');
    }
  };

  const handleEdit = (type: PalletType) => {
    setEditingType(type);
    setFormData({
      name: type.name,
      name_en: type.name_en,
      icon: type.icon || '',
      is_active: type.is_active
    });
    setShowDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا النوع؟')) return;

    try {
      const { error } = await supabase
        .from('pallet_types_master')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadTypes();
    } catch (err) {
      console.error('Error deleting pallet type:', err);
      alert('حدث خطأ أثناء الحذف');
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('pallet_types_master')
        .update({ is_active: !currentStatus, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      loadTypes();
    } catch (err) {
      console.error('Error toggling active status:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">إدارة أنواع الطبليات</h2>
          <p className="text-sm text-gray-500 mt-1">إضافة وتعديل أنواع الطبليات المستخدمة في النظام</p>
        </div>
        <button
          onClick={() => {
            setEditingType(null);
            setFormData({ name: '', name_en: '', icon: '', is_active: true });
            setShowDialog(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          إضافة نوع جديد
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الترتيب</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الاسم بالعربية</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الاسم بالإنجليزية</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الحالة</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">تاريخ الإنشاء</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {types.map((type) => (
              <tr key={type.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <GripVertical className="w-4 h-4 text-gray-400" />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm font-medium text-gray-900">{type.name}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-gray-500">{type.name_en}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    type.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {type.is_active ? 'نشط' : 'مخفي'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(type.created_at).toLocaleDateString('ar-SA')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleActive(type.id, type.is_active)}
                      className="text-gray-600 hover:text-gray-900"
                      title={type.is_active ? 'إخفاء' : 'إظهار'}
                    >
                      {type.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => handleEdit(type)}
                      className="text-blue-600 hover:text-blue-900"
                      title="تعديل"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(type.id)}
                      className="text-red-600 hover:text-red-900"
                      title="حذف"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              {editingType ? 'تعديل نوع الطبلية' : 'إضافة نوع جديد'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الاسم بالعربية</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="مثال: خشب"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الاسم بالإنجليزية</label>
                <input
                  type="text"
                  required
                  value={formData.name_en}
                  onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Example: Wood"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الأيقونة (اختياري)</label>
                <input
                  type="text"
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="🪵"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <label htmlFor="is_active" className="text-sm font-medium text-gray-700">نشط</label>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {editingType ? 'حفظ التعديلات' : 'إضافة'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowDialog(false);
                    setEditingType(null);
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
