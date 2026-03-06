import { useState, useEffect } from 'react';
import { Plus, CreditCard as Edit2, Trash2, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface PalletSize {
  id: string;
  label: string;
  width_cm: number;
  length_cm: number;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export default function PalletSizesManagementTab() {
  const [sizes, setSizes] = useState<PalletSize[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingSize, setEditingSize] = useState<PalletSize | null>(null);
  const [formData, setFormData] = useState({
    label: '',
    width_cm: 0,
    length_cm: 0,
    is_active: true
  });

  useEffect(() => {
    loadSizes();
  }, []);

  const loadSizes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('pallet_sizes')
        .select('*')
        .order('sort_order');

      if (error) throw error;
      setSizes(data || []);
    } catch (err) {
      console.error('Error loading pallet sizes:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingSize) {
        const { error } = await supabase
          .from('pallet_sizes')
          .update({
            label: formData.label,
            width_cm: formData.width_cm,
            length_cm: formData.length_cm,
            is_active: formData.is_active,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingSize.id);

        if (error) throw error;
      } else {
        const maxOrder = sizes.length > 0 ? Math.max(...sizes.map(s => s.sort_order)) : 0;
        const { error } = await supabase
          .from('pallet_sizes')
          .insert([{
            label: formData.label,
            width_cm: formData.width_cm,
            length_cm: formData.length_cm,
            is_active: formData.is_active,
            sort_order: maxOrder + 1
          }]);

        if (error) throw error;
      }

      setShowDialog(false);
      setEditingSize(null);
      setFormData({ label: '', width_cm: 0, length_cm: 0, is_active: true });
      loadSizes();
    } catch (err) {
      console.error('Error saving pallet size:', err);
      alert('حدث خطأ أثناء الحفظ');
    }
  };

  const handleEdit = (size: PalletSize) => {
    setEditingSize(size);
    setFormData({
      label: size.label,
      width_cm: size.width_cm,
      length_cm: size.length_cm,
      is_active: size.is_active
    });
    setShowDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا المقاس؟')) return;

    try {
      const { error } = await supabase
        .from('pallet_sizes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadSizes();
    } catch (err) {
      console.error('Error deleting pallet size:', err);
      alert('حدث خطأ أثناء الحذف');
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('pallet_sizes')
        .update({ is_active: !currentStatus, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      loadSizes();
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
          <h2 className="text-xl font-bold text-gray-900">إدارة مقاسات الطبليات</h2>
          <p className="text-sm text-gray-500 mt-1">إضافة وتعديل مقاسات الطبليات وأبعادها</p>
        </div>
        <button
          onClick={() => {
            setEditingSize(null);
            setFormData({ label: '', width_cm: 0, length_cm: 0, is_active: true });
            setShowDialog(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          إضافة مقاس جديد
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">المقاس</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الطول (سم)</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">العرض (سم)</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الحالة</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">تاريخ الإنشاء</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {sizes.map((size) => (
              <tr key={size.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm font-medium text-gray-900">{size.label}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-gray-500">{size.length_cm} سم</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-gray-500">{size.width_cm} سم</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    size.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {size.is_active ? 'نشط' : 'مخفي'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(size.created_at).toLocaleDateString('ar-SA')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleActive(size.id, size.is_active)}
                      className="text-gray-600 hover:text-gray-900"
                      title={size.is_active ? 'إخفاء' : 'إظهار'}
                    >
                      {size.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => handleEdit(size)}
                      className="text-blue-600 hover:text-blue-900"
                      title="تعديل"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(size.id)}
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
              {editingSize ? 'تعديل مقاس الطبلية' : 'إضافة مقاس جديد'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">التسمية</label>
                <input
                  type="text"
                  required
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="مثال: 120×100"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الطول (سم)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.length_cm}
                    onChange={(e) => setFormData({ ...formData, length_cm: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">العرض (سم)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.width_cm}
                    onChange={(e) => setFormData({ ...formData, width_cm: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
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
                  {editingSize ? 'حفظ التعديلات' : 'إضافة'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowDialog(false);
                    setEditingSize(null);
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
