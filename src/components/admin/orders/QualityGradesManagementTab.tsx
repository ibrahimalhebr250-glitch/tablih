import { useState, useEffect } from 'react';
import { Plus, CreditCard as Edit2, Trash2, Eye, EyeOff, GripVertical } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface QualityGrade {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  description_ar?: string;
  description_en?: string;
  color_hex: string;
  badge_color: string;
  bg_color: string;
  border_color: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

const colorOptions = [
  { label: 'أخضر (A)', color: '#27AE60', badge: '#27AE60', bg: '#E8F8F0', border: '#27AE60' },
  { label: 'أزرق (B)', color: '#2196F3', badge: '#2196F3', bg: '#EBF5FF', border: '#2196F3' },
  { label: 'برتقالي (C)', color: '#F59E0B', badge: '#F59E0B', bg: '#FFFBEB', border: '#F59E0B' },
  { label: 'رمادي (Scrap)', color: '#6B7280', badge: '#6B7280', bg: '#F3F4F6', border: '#D1D5DB' },
  { label: 'أحمر', color: '#EF4444', badge: '#EF4444', bg: '#FEF2F2', border: '#EF4444' },
];

export default function QualityGradesManagementTab() {
  const [grades, setGrades] = useState<QualityGrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingGrade, setEditingGrade] = useState<QualityGrade | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    name_ar: '',
    name_en: '',
    description_ar: '',
    description_en: '',
    color_hex: '#2196F3',
    badge_color: '#2196F3',
    bg_color: '#EBF5FF',
    border_color: '#2196F3',
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
            name_ar: formData.name_ar,
            name_en: formData.name_en,
            description_ar: formData.description_ar || null,
            description_en: formData.description_en || null,
            color_hex: formData.color_hex,
            badge_color: formData.badge_color,
            bg_color: formData.bg_color,
            border_color: formData.border_color,
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
            code: formData.code,
            name_ar: formData.name_ar,
            name_en: formData.name_en,
            description_ar: formData.description_ar || null,
            description_en: formData.description_en || null,
            color_hex: formData.color_hex,
            badge_color: formData.badge_color,
            bg_color: formData.bg_color,
            border_color: formData.border_color,
            is_active: formData.is_active,
            sort_order: maxOrder + 1
          }]);

        if (error) throw error;
      }

      setShowDialog(false);
      setEditingGrade(null);
      setFormData({
        code: '',
        name_ar: '',
        name_en: '',
        description_ar: '',
        description_en: '',
        color_hex: '#2196F3',
        badge_color: '#2196F3',
        bg_color: '#EBF5FF',
        border_color: '#2196F3',
        is_active: true
      });
      loadGrades();
    } catch (err) {
      console.error('Error saving quality grade:', err);
      alert('حدث خطأ أثناء الحفظ');
    }
  };

  const handleEdit = (grade: QualityGrade) => {
    setEditingGrade(grade);
    setFormData({
      code: grade.code,
      name_ar: grade.name_ar,
      name_en: grade.name_en,
      description_ar: grade.description_ar || '',
      description_en: grade.description_en || '',
      color_hex: grade.color_hex,
      badge_color: grade.badge_color,
      bg_color: grade.bg_color,
      border_color: grade.border_color,
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
            setFormData({
              code: '',
              name_ar: '',
              name_en: '',
              description_ar: '',
              description_en: '',
              color_hex: '#2196F3',
              badge_color: '#2196F3',
              bg_color: '#EBF5FF',
              border_color: '#2196F3',
              is_active: true
            });
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
                  <div>
                    <span className="text-sm font-medium text-gray-900">{grade.name_ar}</span>
                    <span className="text-xs text-gray-400 block">{grade.code}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-gray-500">{grade.description_ar || '-'}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded border border-gray-200"
                      style={{ backgroundColor: grade.bg_color }}
                    />
                    <div
                      className="w-6 h-6 rounded border border-gray-200"
                      style={{ backgroundColor: grade.color_hex }}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">الكود (بالإنجليزية)</label>
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="A"
                  disabled={!!editingGrade}
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
                  placeholder="ممتازة"
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
                  placeholder="Excellent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الوصف بالعربية (اختياري)</label>
                <textarea
                  value={formData.description_ar}
                  onChange={(e) => setFormData({ ...formData, description_ar: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={2}
                  placeholder="وصف قصير للجودة"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الوصف بالإنجليزية (اختياري)</label>
                <textarea
                  value={formData.description_en}
                  onChange={(e) => setFormData({ ...formData, description_en: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={2}
                  placeholder="Short description"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">الألوان</label>
                <div className="grid grid-cols-2 gap-2">
                  {colorOptions.map((option) => (
                    <button
                      key={option.color}
                      type="button"
                      onClick={() => setFormData({
                        ...formData,
                        color_hex: option.color,
                        badge_color: option.badge,
                        bg_color: option.bg,
                        border_color: option.border
                      })}
                      className={`flex items-center gap-2 p-2 rounded-lg border-2 ${
                        formData.color_hex === option.color ? 'border-blue-500' : 'border-gray-200'
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
