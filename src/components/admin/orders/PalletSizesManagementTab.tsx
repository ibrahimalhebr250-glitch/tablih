import { useState, useEffect } from 'react';
import { Plus, CreditCard as Edit2, Trash2, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface PalletSize {
  id: string;
  pallet_type_code: string;
  code: string;
  name_ar: string;
  name_en: string;
  length_cm: string;
  width_cm: string;
  height_cm?: string;
  max_load_kg?: string;
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
  const [palletTypes, setPalletTypes] = useState<Array<{code: string; name_ar: string}>>([]);
  const [formData, setFormData] = useState({
    pallet_type_code: '',
    code: '',
    name_ar: '',
    name_en: '',
    width_cm: '',
    length_cm: '',
    height_cm: '',
    max_load_kg: '',
    is_active: true
  });

  useEffect(() => {
    loadSizes();
    loadPalletTypes();
  }, []);

  const loadSizes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('pallet_sizes_master')
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

  const loadPalletTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('pallet_types_master')
        .select('code, name_ar')
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;
      setPalletTypes(data || []);
    } catch (err) {
      console.error('Error loading pallet types:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingSize) {
        const { error } = await supabase
          .from('pallet_sizes_master')
          .update({
            pallet_type_code: formData.pallet_type_code,
            name_ar: formData.name_ar,
            name_en: formData.name_en,
            width_cm: formData.width_cm,
            length_cm: formData.length_cm,
            height_cm: formData.height_cm || null,
            max_load_kg: formData.max_load_kg || null,
            is_active: formData.is_active,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingSize.id);

        if (error) throw error;
      } else {
        const maxOrder = sizes.length > 0 ? Math.max(...sizes.map(s => s.sort_order)) : 0;
        const { error } = await supabase
          .from('pallet_sizes_master')
          .insert([{
            pallet_type_code: formData.pallet_type_code,
            code: formData.code,
            name_ar: formData.name_ar,
            name_en: formData.name_en,
            width_cm: formData.width_cm,
            length_cm: formData.length_cm,
            height_cm: formData.height_cm || null,
            max_load_kg: formData.max_load_kg || null,
            is_active: formData.is_active,
            sort_order: maxOrder + 1
          }]);

        if (error) throw error;
      }

      setShowDialog(false);
      setEditingSize(null);
      setFormData({
        pallet_type_code: '',
        code: '',
        name_ar: '',
        name_en: '',
        width_cm: '',
        length_cm: '',
        height_cm: '',
        max_load_kg: '',
        is_active: true
      });
      loadSizes();
    } catch (err) {
      console.error('Error saving pallet size:', err);
      alert('حدث خطأ أثناء الحفظ');
    }
  };

  const handleEdit = (size: PalletSize) => {
    setEditingSize(size);
    setFormData({
      pallet_type_code: size.pallet_type_code,
      code: size.code,
      name_ar: size.name_ar,
      name_en: size.name_en,
      width_cm: size.width_cm,
      length_cm: size.length_cm,
      height_cm: size.height_cm || '',
      max_load_kg: size.max_load_kg || '',
      is_active: size.is_active
    });
    setShowDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا المقاس؟')) return;

    try {
      const { error } = await supabase
        .from('pallet_sizes_master')
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
        .from('pallet_sizes_master')
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
            setFormData({
              pallet_type_code: '',
              code: '',
              name_ar: '',
              name_en: '',
              width_cm: '',
              length_cm: '',
              height_cm: '',
              max_load_kg: '',
              is_active: true
            });
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
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">نوع الطبلية</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الاسم</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الأبعاد</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الحمولة</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الحالة</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {sizes.map((size) => (
              <tr key={size.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-gray-500">{size.pallet_type_code}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm font-medium text-gray-900">{size.name_ar}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-gray-500">{size.length_cm}×{size.width_cm} سم</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-gray-500">{size.max_load_kg ? `${size.max_load_kg} كجم` : '-'}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    size.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {size.is_active ? 'نشط' : 'مخفي'}
                  </span>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">نوع الطبلية</label>
                <select
                  required
                  value={formData.pallet_type_code}
                  onChange={(e) => setFormData({ ...formData, pallet_type_code: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">اختر نوع الطبلية</option>
                  {palletTypes.map((type) => (
                    <option key={type.code} value={type.code}>{type.name_ar}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الكود (بالإنجليزية)</label>
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toLowerCase() })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="مثال: 120x100"
                  disabled={!!editingSize}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الاسم بالعربية</label>
                <input
                  type="text"
                  required
                  value={formData.name_ar}
                  onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="مثال: 120×100 سم"
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
                  placeholder="Example: 120×100 cm"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الطول (سم)</label>
                  <input
                    type="text"
                    required
                    value={formData.length_cm}
                    onChange={(e) => setFormData({ ...formData, length_cm: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="120"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">العرض (سم)</label>
                  <input
                    type="text"
                    required
                    value={formData.width_cm}
                    onChange={(e) => setFormData({ ...formData, width_cm: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="100"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الارتفاع (سم) - اختياري</label>
                  <input
                    type="text"
                    value={formData.height_cm}
                    onChange={(e) => setFormData({ ...formData, height_cm: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="15"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الحمولة القصوى (كجم)</label>
                  <input
                    type="text"
                    value={formData.max_load_kg}
                    onChange={(e) => setFormData({ ...formData, max_load_kg: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="1500"
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
