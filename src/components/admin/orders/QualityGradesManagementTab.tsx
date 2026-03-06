import { useState, useEffect } from 'react';
import { Plus, CreditCard as Edit2, Trash2, Eye, EyeOff, GripVertical } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface QualityGrade {
  id: string;
  name: string;
  description?: string;
  color: string;
  bg_color: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

const colorOptions = [
  { label: 'أخضر (A)', color: '#27AE60', bg: '#E8F8F0' },
  { label: 'أزرق (B)', color: '#2196F3', bg: '#EBF5FF' },
  { label: 'برتقالي (C)', color: '#F59E0B', bg: '#FFFBEB' },
  { label: 'رمادي (Scrap)', color: '#6B7280', bg: '#F3F4F6' },
  { label: 'أحمر', color: '#EF4444', bg: '#FEF2F2' },
];

export default function QualityGradesManagementTab() {
  const [grades, setGrades] = useState<QualityGrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingGrade, setEditingGrade] = useState<QualityGrade | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#2196F3',
    bg_color: '#EBF5FF',
    is_active: true
  });

  useEffect(() => {
    loadGrades();
  }, []);

  const loadGrades = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('quality_grades_master')
        .select('*')
        .order('sort_order');

      if (error) throw error;
      setGrades(data || []);
    } catch (err) {
      console.error('Error loading quality grades:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingGrade) {
        const { error } = await supabase
          .from('quality_grades_master')
          .update({
            name: formData.name,
            description: formData.description || null,
            color: formData.color,
            bg_color: formData.bg_color,
            is_active: formData.is_active,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingGrade.id);

        if (error) throw error;
      } else {
        const maxOrder = grades.length > 0 ? Math.max(...grades.map(g => g.sort_order)) : 0;
        const { error } = await supabase
          .from('quality_grades_master')
          .insert([{
            name: formData.name,
            description: formData.description || null,
            color: formData.color,
            bg_color: formData.bg_color,
            is_active: formData.is_active,
            sort_order: maxOrder + 1
          }]);

        if (error) throw error;
      }

      setShowDialog(false);
      setEditingGrade(null);
      setFormData({ name: '', description: '', color: '#2196F3', bg_color: '#EBF5FF', is_active: true });
      loadGrades();
    } catch (err) {
      console.error('Error saving quality grade:', err);
      alert('حدث خطأ أثناء الحفظ');
    }
  };

  const handleEdit = (grade: QualityGrade) => {
    setEditingGrade(grade);
    setFormData({
      name: grade.name,
      description: grade.description || '',
      color: grade.color,
      bg_color: grade.bg_color,
      is_active: grade.is_active
    });
    setShowDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه الجودة؟')) return;

    try {
      const { error } = await supabase
        .from('quality_grades_master')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadGrades();
    } catch (err) {
      console.error('Error deleting quality grade:', err);
      alert('حدث خطأ أثناء الحذف');
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('quality_grades_master')
        .update({ is_active: !currentStatus, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      loadGrades();
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
          <h2 className="text-xl font-bold text-gray-900">إدارة درجات الجودة</h2>
          <p className="text-sm text-gray-500 mt-1">إضافة وتعديل درجات جودة الطبليات</p>
        </div>
        <button
          onClick={() => {
            setEditingGrade(null);
            setFormData({ name: '', description: '', color: '#2196F3', bg_color: '#EBF5FF', is_active: true });
            setShowDialog(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          إضافة جودة جديدة
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الترتيب</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الاسم</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الوصف</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">اللون</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الحالة</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">تاريخ الإنشاء</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {grades.map((grade) => (
              <tr key={grade.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <GripVertical className="w-4 h-4 text-gray-400" />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm font-medium text-gray-900">{grade.name}</span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-gray-500">{grade.description || '-'}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded border border-gray-200"
                      style={{ backgroundColor: grade.bg_color }}
                    />
                    <div
                      className="w-6 h-6 rounded border border-gray-200"
                      style={{ backgroundColor: grade.color }}
                    />
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    grade.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {grade.is_active ? 'نشط' : 'مخفي'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(grade.created_at).toLocaleDateString('ar-SA')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleActive(grade.id, grade.is_active)}
                      className="text-gray-600 hover:text-gray-900"
                      title={grade.is_active ? 'إخفاء' : 'إظهار'}
                    >
                      {grade.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => handleEdit(grade)}
                      className="text-blue-600 hover:text-blue-900"
                      title="تعديل"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(grade.id)}
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
              {editingGrade ? 'تعديل درجة الجودة' : 'إضافة جودة جديدة'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الاسم</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="مثال: ممتازة"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الوصف (اختياري)</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={2}
                  placeholder="وصف قصير للجودة"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">الألوان</label>
                <div className="grid grid-cols-2 gap-2">
                  {colorOptions.map((option) => (
                    <button
                      key={option.color}
                      type="button"
                      onClick={() => setFormData({ ...formData, color: option.color, bg_color: option.bg })}
                      className={`flex items-center gap-2 p-2 rounded-lg border-2 ${
                        formData.color === option.color ? 'border-blue-500' : 'border-gray-200'
                      }`}
                    >
                      <div
                        className="w-6 h-6 rounded"
                        style={{ backgroundColor: option.bg }}
                      />
                      <div
                        className="w-6 h-6 rounded"
                        style={{ backgroundColor: option.color }}
                      />
                      <span className="text-xs">{option.label}</span>
                    </button>
                  ))}
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
                  {editingGrade ? 'حفظ التعديلات' : 'إضافة'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowDialog(false);
                    setEditingGrade(null);
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
