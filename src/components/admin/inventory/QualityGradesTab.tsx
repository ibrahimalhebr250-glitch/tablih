import { useState } from 'react';
import { Plus, CreditCard as Edit2, Trash2, Eye, EyeOff, Award } from 'lucide-react';
import { useInventorySettings } from '../../../hooks/useInventorySettings';
import { useAdminInventory } from '../../../hooks/useAdminInventory';

interface Props {
  adminEmail: string;
}

export default function QualityGradesTab({ adminEmail }: Props) {
  const { qualityGrades, loading, refetch } = useInventorySettings();
  const { manageQualityGrade, toggleItemStatus, deleteItem } = useAdminInventory(adminEmail);

  const [showDialog, setShowDialog] = useState(false);
  const [editingGrade, setEditingGrade] = useState<any>(null);
  const [formData, setFormData] = useState({
    code: '',
    name_ar: '',
    name_en: '',
    color: '#3b82f6',
    description: '',
    is_active: true,
    display_order: 0,
  });
  const [saving, setSaving] = useState(false);

  const predefinedColors = [
    { name: 'أزرق', value: '#3b82f6' },
    { name: 'أخضر', value: '#10b981' },
    { name: 'برتقالي', value: '#f59e0b' },
    { name: 'أحمر', value: '#ef4444' },
    { name: 'بنفسجي', value: '#8b5cf6' },
    { name: 'وردي', value: '#ec4899' },
    { name: 'سماوي', value: '#06b6d4' },
    { name: 'رمادي', value: '#6b7280' },
  ];

  const openDialog = (grade: any | null = null) => {
    if (grade) {
      setEditingGrade(grade);
      setFormData({
        code: grade.code,
        name_ar: grade.name_ar,
        name_en: grade.name_en,
        color: grade.color,
        description: grade.description || '',
        is_active: grade.is_active,
        display_order: grade.display_order,
      });
    } else {
      setEditingGrade(null);
      setFormData({
        code: '',
        name_ar: '',
        name_en: '',
        color: '#3b82f6',
        description: '',
        is_active: true,
        display_order: qualityGrades.length,
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
      await manageQualityGrade({
        id: editingGrade?.id,
        ...formData,
      });
      await refetch();
      setShowDialog(false);
    } catch (error) {
      console.error('Error saving quality grade:', error);
      alert('حدث خطأ أثناء الحفظ');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (gradeId: string, isActive: boolean) => {
    try {
      await toggleItemStatus('inventory_quality_grades', gradeId, !isActive);
      await refetch();
    } catch (error) {
      console.error('Error toggling status:', error);
      alert('حدث خطأ أثناء تحديث الحالة');
    }
  };

  const handleDelete = async (gradeId: string) => {
    if (!confirm('هل أنت متأكد من حذف درجة الجودة هذه؟')) return;

    try {
      await deleteItem('inventory_quality_grades', gradeId);
      await refetch();
    } catch (error) {
      console.error('Error deleting grade:', error);
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
          <h2 className="text-xl font-bold text-slate-900">درجات الجودة</h2>
          <p className="text-sm text-slate-600 mt-1">إدارة درجات جودة الطبليات والألوان المستخدمة</p>
        </div>
        <button
          onClick={() => openDialog(null)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          إضافة درجة جودة
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">إجمالي الدرجات</p>
              <p className="text-2xl font-bold text-slate-900">{qualityGrades.length}</p>
            </div>
            <Award className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">النشطة</p>
              <p className="text-2xl font-bold text-green-600">
                {qualityGrades.filter(g => g.is_active).length}
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
                {qualityGrades.filter(g => !g.is_active).length}
              </p>
            </div>
            <EyeOff className="w-8 h-8 text-slate-400" />
          </div>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {qualityGrades.map((grade) => (
          <div
            key={grade.id}
            className={`bg-white rounded-lg border-2 overflow-hidden transition-all ${
              grade.is_active ? 'border-slate-200' : 'border-slate-100 opacity-60'
            }`}
          >
            {/* Color Bar */}
            <div
              className="h-2"
              style={{ backgroundColor: grade.color }}
            ></div>

            <div className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="px-3 py-1 rounded-full text-sm font-bold text-white"
                      style={{ backgroundColor: grade.color }}
                    >
                      {grade.code}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">{grade.name_ar}</h3>
                  <p className="text-sm text-slate-500">{grade.name_en}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleToggleStatus(grade.id, grade.is_active)}
                    className={`p-1.5 rounded ${
                      grade.is_active
                        ? 'hover:bg-slate-100 text-slate-600'
                        : 'hover:bg-green-50 text-green-600'
                    }`}
                    title={grade.is_active ? 'إخفاء' : 'إظهار'}
                  >
                    {grade.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => openDialog(grade)}
                    className="p-1.5 rounded hover:bg-blue-50 text-blue-600"
                    title="تعديل"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(grade.id)}
                    className="p-1.5 rounded hover:bg-red-50 text-red-600"
                    title="حذف"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {grade.description && (
                <p className="text-sm text-slate-600 mb-3 line-clamp-2">{grade.description}</p>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  grade.is_active
                    ? 'bg-green-100 text-green-700'
                    : 'bg-slate-100 text-slate-600'
                }`}>
                  {grade.is_active ? 'نشط' : 'مخفي'}
                </span>
                <span className="text-xs text-slate-500">ترتيب: {grade.display_order}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {qualityGrades.length === 0 && (
        <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
          <Award className="w-16 h-16 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">لا توجد درجات جودة</h3>
          <p className="text-slate-600 mb-4">ابدأ بإضافة أول درجة جودة</p>
          <button
            onClick={() => openDialog(null)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            إضافة درجة جودة
          </button>
        </div>
      )}

      {/* Dialog */}
      {showDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-slate-900 mb-4">
              {editingGrade ? 'تعديل درجة الجودة' : 'إضافة درجة جودة جديدة'}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  رمز الجودة *
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="مثال: A"
                  maxLength={10}
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
                  placeholder="مثال: ممتاز"
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
                  placeholder="Example: Excellent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  اللون *
                </label>
                <div className="grid grid-cols-4 gap-2 mb-2">
                  {predefinedColors.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, color: color.value })}
                      className={`h-10 rounded-lg border-2 transition-all ${
                        formData.color === color.value
                          ? 'border-slate-900 scale-105'
                          : 'border-slate-200 hover:border-slate-400'
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    />
                  ))}
                </div>
                <input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-full h-10 rounded-lg border border-slate-300 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  الوصف (اختياري)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="وصف درجة الجودة..."
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
              {formData.code && formData.name_ar && (
                <div className="p-4 border-2 rounded-lg" style={{ borderColor: formData.color }}>
                  <div className="flex items-center gap-3">
                    <span
                      className="px-3 py-1 rounded-full text-sm font-bold text-white"
                      style={{ backgroundColor: formData.color }}
                    >
                      {formData.code}
                    </span>
                    <div>
                      <p className="font-bold text-slate-900">{formData.name_ar}</p>
                      <p className="text-sm text-slate-500">{formData.name_en}</p>
                    </div>
                  </div>
                  {formData.description && (
                    <p className="text-sm text-slate-600 mt-2">{formData.description}</p>
                  )}
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
