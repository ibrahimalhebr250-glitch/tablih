import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Eye, EyeOff, X, Check, Star, ShieldCheck, AlertTriangle, Recycle, Sparkles } from 'lucide-react';
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

const STANDARD_GRADES = [
  {
    code: 'A',
    label: 'Grade A',
    labelAr: 'درجة أولى',
    icon: <Sparkles className="w-5 h-5" />,
    description: 'Premium / ممتازة',
    color: '#16A34A',
    badge: '#16A34A',
    bg: '#F0FDF4',
    border: '#16A34A',
    textColor: 'text-green-700',
    ringColor: 'ring-green-500',
    preset: {
      name_ar: 'درجة أولى - ممتازة',
      name_en: 'Grade A - Premium',
      desc_ar: 'جديدة أو لا تكاد تُستخدم — هيكل سليم تام، بلا كسور أو شقوق',
      desc_en: 'New or barely used — perfect structure, no cracks or breaks',
    }
  },
  {
    code: 'B',
    label: 'Grade B',
    labelAr: 'درجة ثانية',
    icon: <ShieldCheck className="w-5 h-5" />,
    description: 'Good / جيدة',
    color: '#2563EB',
    badge: '#2563EB',
    bg: '#EFF6FF',
    border: '#2563EB',
    textColor: 'text-blue-700',
    ringColor: 'ring-blue-500',
    preset: {
      name_ar: 'درجة ثانية - جيدة',
      name_en: 'Grade B - Good',
      desc_ar: 'مستعملة خفيف — آثار استخدام بسيطة، هيكل سليم، تصلح للاستخدام العادي',
      desc_en: 'Lightly used — minor wear, solid structure, suitable for normal use',
    }
  },
  {
    code: 'C',
    label: 'Grade C',
    labelAr: 'درجة ثالثة',
    icon: <AlertTriangle className="w-5 h-5" />,
    description: 'Acceptable / مقبولة',
    color: '#D97706',
    badge: '#D97706',
    bg: '#FFFBEB',
    border: '#D97706',
    textColor: 'text-amber-700',
    ringColor: 'ring-amber-500',
    preset: {
      name_ar: 'درجة ثالثة - مقبولة',
      name_en: 'Grade C - Acceptable',
      desc_ar: 'مستعملة بتلف بسيط أو إصلاحات — تصلح للاستخدام المحدود',
      desc_en: 'Used with minor damage or repairs — suitable for limited use',
    }
  },
  {
    code: 'Scrap',
    label: 'Scrap',
    labelAr: 'خردة',
    icon: <Recycle className="w-5 h-5" />,
    description: 'Recycling / إعادة تدوير',
    color: '#6B7280',
    badge: '#6B7280',
    bg: '#F9FAFB',
    border: '#D1D5DB',
    textColor: 'text-gray-600',
    ringColor: 'ring-gray-400',
    preset: {
      name_ar: 'خردة - إعادة تدوير',
      name_en: 'Scrap - Recycling',
      desc_ar: 'طبلية تالفة للتخلص منها أو إعادة تدويرها',
      desc_en: 'Damaged pallet for disposal or recycling',
    }
  },
];

const EXTRA_COLORS = [
  { label: 'أخضر فاتح', color: '#22C55E', bg: '#F0FDF4', border: '#22C55E' },
  { label: 'أخضر داكن', color: '#15803D', bg: '#F0FDF4', border: '#15803D' },
  { label: 'أزرق فاتح', color: '#38BDF8', bg: '#F0F9FF', border: '#38BDF8' },
  { label: 'أزرق داكن', color: '#1D4ED8', bg: '#EFF6FF', border: '#1D4ED8' },
  { label: 'برتقالي', color: '#F97316', bg: '#FFF7ED', border: '#F97316' },
  { label: 'ذهبي', color: '#EAB308', bg: '#FEFCE8', border: '#EAB308' },
  { label: 'أحمر', color: '#DC2626', bg: '#FEF2F2', border: '#DC2626' },
  { label: 'وردي', color: '#EC4899', bg: '#FDF2F8', border: '#EC4899' },
  { label: 'بنفسجي', color: '#9333EA', bg: '#FAF5FF', border: '#9333EA' },
  { label: 'سيان', color: '#0891B2', bg: '#ECFEFF', border: '#0891B2' },
  { label: 'رمادي فاتح', color: '#9CA3AF', bg: '#F9FAFB', border: '#D1D5DB' },
  { label: 'أسود', color: '#1F2937', bg: '#F3F4F6', border: '#1F2937' },
];

function GradePreviewCard({ code, nameAr, colorHex, bgColor, borderColor, badgeColor, descAr }: {
  code: string; nameAr: string; colorHex: string; bgColor: string;
  borderColor: string; badgeColor: string; descAr: string;
}) {
  return (
    <div
      className="rounded-2xl border-2 p-4 flex flex-col gap-2 transition-all"
      style={{ borderColor, backgroundColor: bgColor }}
    >
      <div className="flex items-center gap-2">
        <span
          className="px-2.5 py-0.5 rounded-lg text-xs font-bold text-white"
          style={{ backgroundColor: badgeColor }}
        >
          Grade {code}
        </span>
        <span className="text-sm font-bold" style={{ color: colorHex }}>{nameAr}</span>
      </div>
      {descAr && <p className="text-xs text-gray-500 leading-relaxed">{descAr}</p>}
    </div>
  );
}

export default function QualityGradesManagementTab() {
  const [grades, setGrades] = useState<QualityGrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingGrade, setEditingGrade] = useState<QualityGrade | null>(null);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'color'>('info');

  const [formData, setFormData] = useState({
    code: '',
    name_ar: '',
    name_en: '',
    description_ar: '',
    description_en: '',
    color_hex: '#16A34A',
    badge_color: '#16A34A',
    bg_color: '#F0FDF4',
    border_color: '#16A34A',
    is_active: true
  });

  useEffect(() => { loadGrades(); }, []);

  useEffect(() => {
    if (notification) {
      const t = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(t);
    }
  }, [notification]);

  const loadGrades = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('quality_grades_master').select('*').order('sort_order');
      if (error) throw error;
      setGrades(data || []);
    } catch {
      setNotification({ type: 'error', msg: 'حدث خطأ أثناء التحميل' });
    } finally {
      setLoading(false);
    }
  };

  const applyStandardPreset = (sg: typeof STANDARD_GRADES[0]) => {
    setFormData(prev => ({
      ...prev,
      code: sg.code,
      name_ar: sg.preset.name_ar,
      name_en: sg.preset.name_en,
      description_ar: sg.preset.desc_ar,
      description_en: sg.preset.desc_en,
      color_hex: sg.color,
      badge_color: sg.badge,
      bg_color: sg.bg,
      border_color: sg.border,
    }));
  };

  const applyColor = (c: typeof EXTRA_COLORS[0]) => {
    setFormData(prev => ({
      ...prev,
      color_hex: c.color,
      badge_color: c.color,
      bg_color: c.bg,
      border_color: c.border,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code.trim()) { setNotification({ type: 'error', msg: 'يرجى إدخال الكود' }); return; }
    setSaving(true);
    try {
      if (editingGrade) {
        const { error } = await supabase.from('quality_grades_master').update({
          name_ar: formData.name_ar, name_en: formData.name_en,
          description_ar: formData.description_ar || null,
          description_en: formData.description_en || null,
          color_hex: formData.color_hex, badge_color: formData.badge_color,
          bg_color: formData.bg_color, border_color: formData.border_color,
          is_active: formData.is_active, updated_at: new Date().toISOString()
        }).eq('id', editingGrade.id);
        if (error) throw error;
        setNotification({ type: 'success', msg: 'تم تعديل الجودة بنجاح' });
      } else {
        const maxOrder = grades.length > 0 ? Math.max(...grades.map(g => g.sort_order)) : 0;
        const { error } = await supabase.from('quality_grades_master').insert([{
          code: formData.code, name_ar: formData.name_ar, name_en: formData.name_en,
          description_ar: formData.description_ar || null,
          description_en: formData.description_en || null,
          color_hex: formData.color_hex, badge_color: formData.badge_color,
          bg_color: formData.bg_color, border_color: formData.border_color,
          is_active: formData.is_active, sort_order: maxOrder + 1
        }]);
        if (error) throw error;
        setNotification({ type: 'success', msg: 'تمت إضافة درجة الجودة بنجاح' });
      }
      closeDialog();
      loadGrades();
    } catch (err: any) {
      setNotification({ type: 'error', msg: err?.message || 'حدث خطأ أثناء الحفظ' });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (grade: QualityGrade) => {
    setEditingGrade(grade);
    setFormData({
      code: grade.code, name_ar: grade.name_ar, name_en: grade.name_en,
      description_ar: grade.description_ar || '', description_en: grade.description_en || '',
      color_hex: grade.color_hex, badge_color: grade.badge_color,
      bg_color: grade.bg_color, border_color: grade.border_color,
      is_active: grade.is_active
    });
    setActiveTab('info');
    setShowDialog(true);
  };

  const openAddDialog = () => {
    setEditingGrade(null);
    setFormData({
      code: '', name_ar: '', name_en: '', description_ar: '', description_en: '',
      color_hex: '#16A34A', badge_color: '#16A34A', bg_color: '#F0FDF4',
      border_color: '#16A34A', is_active: true
    });
    setActiveTab('info');
    setShowDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه الجودة؟')) return;
    try {
      const { error } = await supabase.from('quality_grades_master').delete().eq('id', id);
      if (error) throw error;
      setNotification({ type: 'success', msg: 'تم حذف الجودة' });
      loadGrades();
    } catch {
      setNotification({ type: 'error', msg: 'حدث خطأ أثناء الحذف' });
    }
  };

  const toggleActive = async (id: string, current: boolean) => {
    try {
      await supabase.from('quality_grades_master')
        .update({ is_active: !current, updated_at: new Date().toISOString() }).eq('id', id);
      loadGrades();
    } catch {
      setNotification({ type: 'error', msg: 'حدث خطأ' });
    }
  };

  const closeDialog = () => {
    setShowDialog(false);
    setEditingGrade(null);
  };

  const activeCount = grades.filter(g => g.is_active).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-sm text-gray-500">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5" dir="rtl">
      {notification && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[9999] px-6 py-3 rounded-xl shadow-lg text-white text-sm font-medium flex items-center gap-2 ${
          notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'
        }`}>
          <Check className="w-4 h-4" />
          {notification.msg}
        </div>
      )}

      <div className="bg-gradient-to-l from-green-600 to-green-700 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">إدارة درجات الجودة</h2>
            <p className="text-green-100 mt-1 text-sm">المعايير الدولية لتصنيف جودة الطبليات</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center bg-white/10 rounded-xl px-4 py-2">
              <div className="text-2xl font-bold">{grades.length}</div>
              <div className="text-xs text-green-200">إجمالي</div>
            </div>
            <div className="text-center bg-white/10 rounded-xl px-4 py-2">
              <div className="text-2xl font-bold">{activeCount}</div>
              <div className="text-xs text-green-200">نشط</div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
          <Star className="w-4 h-4 text-amber-500" />
          المعايير الدولية لدرجات الجودة
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {STANDARD_GRADES.map(sg => {
            const exists = grades.find(g => g.code === sg.code);
            return (
              <div
                key={sg.code}
                className="rounded-2xl border-2 p-3 flex flex-col gap-2"
                style={{ borderColor: sg.border, backgroundColor: sg.bg }}
              >
                <div className="flex items-center justify-between">
                  <span
                    className="px-2.5 py-0.5 rounded-lg text-xs font-bold text-white"
                    style={{ backgroundColor: sg.badge }}
                  >
                    {sg.label}
                  </span>
                  {exists && (
                    <span className={`text-xs font-medium ${exists.is_active ? 'text-green-600' : 'text-gray-400'}`}>
                      {exists.is_active ? 'نشط' : 'مخفي'}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5" style={{ color: sg.color }}>
                  {sg.icon}
                  <span className="text-sm font-bold">{sg.labelAr}</span>
                </div>
                <p className="text-xs text-gray-500">{sg.description}</p>
                {!exists && (
                  <p className="text-xs text-red-500 font-medium">غير مضافة</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{grades.length} درجة جودة في النظام</p>
        <button
          onClick={openAddDialog}
          className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 font-medium shadow-md shadow-green-100 transition-all"
        >
          <Plus className="w-4 h-4" />
          إضافة درجة جودة جديدة
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {grades.map((grade) => {
          const stdGrade = STANDARD_GRADES.find(sg => sg.code === grade.code);
          return (
            <div
              key={grade.id}
              className="bg-white rounded-2xl border-2 overflow-hidden shadow-sm transition-all hover:shadow-md"
              style={{ borderColor: grade.border_color }}
            >
              <div className="h-2" style={{ backgroundColor: grade.color_hex }} />
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-sm"
                      style={{ backgroundColor: grade.badge_color }}
                    >
                      {grade.code.length <= 2 ? grade.code : grade.code[0]}
                    </span>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{grade.name_ar}</p>
                      <p className="text-xs text-gray-400">{grade.name_en}</p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full ${
                    grade.is_active ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-gray-100 text-gray-400'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${grade.is_active ? 'bg-green-500' : 'bg-gray-300'}`} />
                    {grade.is_active ? 'نشط' : 'مخفي'}
                  </span>
                </div>

                {grade.description_ar && (
                  <p className="text-xs text-gray-500 leading-relaxed mb-3 line-clamp-2">
                    {grade.description_ar}
                  </p>
                )}

                <div className="flex items-center gap-1.5 mb-3">
                  <div
                    className="w-5 h-5 rounded-full border-2 border-white shadow-sm"
                    style={{ backgroundColor: grade.color_hex }}
                    title="اللون الرئيسي"
                  />
                  <div
                    className="w-5 h-5 rounded-md border-2 border-white shadow-sm"
                    style={{ backgroundColor: grade.bg_color }}
                    title="لون الخلفية"
                  />
                  <div className="flex-1 h-1.5 rounded-full" style={{ backgroundColor: grade.bg_color, borderColor: grade.border_color, border: '1px solid' }} />
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => toggleActive(grade.id, grade.is_active)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      grade.is_active
                        ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        : 'bg-green-50 text-green-700 hover:bg-green-100'
                    }`}
                  >
                    {grade.is_active ? <EyeOff className="w-3.5 h-3.5 mx-auto" /> : <Eye className="w-3.5 h-3.5 mx-auto" />}
                  </button>
                  <button
                    onClick={() => handleEdit(grade)}
                    className="flex-1 py-1.5 rounded-lg text-xs font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5 mx-auto" />
                  </button>
                  <button
                    onClick={() => handleDelete(grade.id)}
                    className="flex-1 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5 mx-auto" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {grades.length === 0 && (
          <div className="col-span-full text-center py-12">
            <Star className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">لا توجد درجات جودة. أضف الدرجات الأساسية A، B، C، Scrap</p>
          </div>
        )}
      </div>

      {showDialog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={(e) => e.target === e.currentTarget && closeDialog()}>
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-green-50 to-white flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-600 flex items-center justify-center text-white">
                  <Star className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">
                    {editingGrade ? 'تعديل درجة الجودة' : 'إضافة درجة جودة جديدة'}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {editingGrade ? `تعديل: ${editingGrade.name_ar}` : 'اختر من المعايير الدولية أو أنشئ درجة مخصصة'}
                  </p>
                </div>
              </div>
              <button onClick={closeDialog} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

                {!editingGrade && (
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      الدرجات المعيارية الدولية
                    </label>
                    <div className="grid grid-cols-2 gap-2.5">
                      {STANDARD_GRADES.map(sg => {
                        const isSelected = formData.code === sg.code && formData.color_hex === sg.color;
                        return (
                          <button
                            key={sg.code}
                            type="button"
                            onClick={() => applyStandardPreset(sg)}
                            className={`flex items-center gap-3 p-3 rounded-xl border-2 text-right transition-all ${
                              isSelected ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-white hover:border-green-300 hover:bg-green-50/30'
                            }`}
                          >
                            <div
                              className="w-9 h-9 rounded-xl flex items-center justify-center text-white flex-shrink-0"
                              style={{ backgroundColor: sg.badge }}
                            >
                              {sg.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-gray-800 truncate">{sg.label}</p>
                              <p className="text-xs text-gray-500 truncate">{sg.description}</p>
                            </div>
                            {isSelected && <Check className="w-4 h-4 text-green-600 flex-shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex items-center gap-3 my-3">
                      <div className="flex-1 h-px bg-gray-200" />
                      <span className="text-xs text-gray-400 font-medium">أو أنشئ درجة مخصصة</span>
                      <div className="flex-1 h-px bg-gray-200" />
                    </div>
                  </div>
                )}

                <div className="flex gap-2 border-b border-gray-100 pb-4">
                  <button
                    type="button"
                    onClick={() => setActiveTab('info')}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                      activeTab === 'info' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    البيانات
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('color')}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                      activeTab === 'color' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    الألوان
                  </button>
                </div>

                {activeTab === 'info' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                        الكود <span className="text-red-500">*</span>
                        {editingGrade && <span className="text-xs text-gray-400 font-normal mr-2">(لا يمكن تغييره)</span>}
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.code}
                        onChange={(e) => !editingGrade && setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                        disabled={!!editingGrade}
                        className={`w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-mono font-bold tracking-widest ${
                          editingGrade ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : 'focus:ring-0 focus:border-green-500 bg-white'
                        }`}
                        placeholder="A"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                          الاسم بالعربية <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.name_ar}
                          onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                          className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-0 focus:border-green-500 text-sm"
                          placeholder="درجة أولى - ممتازة"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                          الاسم بالإنجليزية <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.name_en}
                          onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                          className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-0 focus:border-green-500 text-sm"
                          placeholder="Grade A - Premium"
                          dir="ltr"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">الوصف بالعربية</label>
                      <textarea
                        value={formData.description_ar}
                        onChange={(e) => setFormData({ ...formData, description_ar: e.target.value })}
                        className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-0 focus:border-green-500 text-sm resize-none"
                        rows={2}
                        placeholder="وصف موجز يظهر للمستخدمين عند اختيار هذه الدرجة"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">الوصف بالإنجليزية</label>
                      <textarea
                        value={formData.description_en}
                        onChange={(e) => setFormData({ ...formData, description_en: e.target.value })}
                        className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-0 focus:border-green-500 text-sm resize-none"
                        rows={2}
                        placeholder="Short description shown to users"
                        dir="ltr"
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                      <div>
                        <p className="text-sm font-semibold text-gray-700">الحالة</p>
                        <p className="text-xs text-gray-400 mt-0.5">هل تظهر للمستخدمين عند الاختيار؟</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, is_active: !prev.is_active }))}
                        className={`relative w-12 h-6 rounded-full transition-colors ${formData.is_active ? 'bg-green-500' : 'bg-gray-300'}`}
                      >
                        <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${formData.is_active ? 'left-6' : 'left-0.5'}`} />
                      </button>
                    </div>
                  </div>
                )}

                {activeTab === 'color' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">الألوان الجاهزة</label>
                      <div className="grid grid-cols-4 gap-2">
                        {EXTRA_COLORS.map(c => {
                          const isSelected = formData.color_hex === c.color;
                          return (
                            <button
                              key={c.color}
                              type="button"
                              onClick={() => applyColor(c)}
                              className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all ${
                                isSelected ? 'border-green-500 bg-green-50' : 'border-gray-100 hover:border-gray-300'
                              }`}
                            >
                              <div
                                className="w-8 h-8 rounded-lg shadow-sm"
                                style={{ backgroundColor: c.color }}
                              />
                              <span className="text-[10px] text-gray-500 text-center leading-tight">{c.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">اللون الرئيسي</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={formData.color_hex}
                            onChange={(e) => setFormData({ ...formData, color_hex: e.target.value, badge_color: e.target.value, border_color: e.target.value })}
                            className="w-10 h-10 rounded-lg border-2 border-gray-200 cursor-pointer p-0.5"
                          />
                          <span className="text-xs font-mono text-gray-500">{formData.color_hex}</span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">لون الخلفية</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={formData.bg_color}
                            onChange={(e) => setFormData({ ...formData, bg_color: e.target.value })}
                            className="w-10 h-10 rounded-lg border-2 border-gray-200 cursor-pointer p-0.5"
                          />
                          <span className="text-xs font-mono text-gray-500">{formData.bg_color}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">معاينة</label>
                      <GradePreviewCard
                        code={formData.code || 'X'}
                        nameAr={formData.name_ar || 'اسم الجودة'}
                        colorHex={formData.color_hex}
                        bgColor={formData.bg_color}
                        borderColor={formData.border_color}
                        badgeColor={formData.badge_color}
                        descAr={formData.description_ar}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex-shrink-0">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 font-semibold text-sm transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {saving
                    ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> جاري الحفظ...</>
                    : <><Check className="w-4 h-4" /> {editingGrade ? 'حفظ التعديلات' : 'إضافة الجودة'}</>
                  }
                </button>
                <button
                  type="button"
                  onClick={closeDialog}
                  className="px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 font-medium text-sm"
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
