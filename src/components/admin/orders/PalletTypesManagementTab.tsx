import { useState, useEffect, useRef } from 'react';
import { Plus, Pencil, Trash2, Eye, EyeOff, GripVertical, Package, Box, Container, Archive, Layers, Grid3x3 as Grid3X3, Truck, ShoppingCart, Warehouse, CreditCard, Recycle, Shield, Zap, Star, Tag, Bookmark, LayoutGrid, Boxes, PackageOpen, PackageCheck, Upload, X, Search, Check, Image as ImageIcon, Smile, AlertCircle } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { getAdminEmail } from '../../../utils/adminAuth';

interface PalletType {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  description_ar?: string;
  description_en?: string;
  icon: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

const LUCIDE_ICONS = [
  { name: 'Package', component: Package, label: 'طرد' },
  { name: 'Box', component: Box, label: 'صندوق' },
  { name: 'Container', component: Container, label: 'حاوية' },
  { name: 'Archive', component: Archive, label: 'أرشيف' },
  { name: 'Layers', component: Layers, label: 'طبقات' },
  { name: 'Grid3X3', component: Grid3X3, label: 'شبكة' },
  { name: 'Truck', component: Truck, label: 'شاحنة' },
  { name: 'ShoppingCart', component: ShoppingCart, label: 'سلة' },
  { name: 'Warehouse', component: Warehouse, label: 'مستودع' },
  { name: 'CreditCard', component: CreditCard, label: 'بطاقة' },
  { name: 'Recycle', component: Recycle, label: 'إعادة تدوير' },
  { name: 'Shield', component: Shield, label: 'درع' },
  { name: 'Zap', component: Zap, label: 'برق' },
  { name: 'Star', component: Star, label: 'نجمة' },
  { name: 'Tag', component: Tag, label: 'علامة' },
  { name: 'Bookmark', component: Bookmark, label: 'إشارة' },
  { name: 'LayoutGrid', component: LayoutGrid, label: 'تخطيط' },
  { name: 'Boxes', component: Boxes, label: 'صناديق' },
  { name: 'PackageOpen', component: PackageOpen, label: 'طرد مفتوح' },
  { name: 'PackageCheck', component: PackageCheck, label: 'طرد مؤكد' },
];

const EMOJI_OPTIONS = [
  { emoji: '📦', label: 'طبلية' },
  { emoji: '🪵', label: 'خشب' },
  { emoji: '🏗️', label: 'معدن' },
  { emoji: '♻️', label: 'بلاستيك' },
  { emoji: '📋', label: 'كارتون' },
  { emoji: '🔩', label: 'حديد' },
  { emoji: '🧱', label: 'خشب ثقيل' },
  { emoji: '🛒', label: 'سلة' },
  { emoji: '🚛', label: 'شحن' },
  { emoji: '🏭', label: 'مصنع' },
  { emoji: '⚙️', label: 'معدات' },
  { emoji: '🔧', label: 'أدوات' },
  { emoji: '📫', label: 'بريد' },
  { emoji: '🗃️', label: 'أرشيف' },
  { emoji: '📊', label: 'بيانات' },
  { emoji: '💎', label: 'بريميوم' },
  { emoji: '🌿', label: 'طبيعي' },
  { emoji: '🔋', label: 'متين' },
  { emoji: '🏆', label: 'ممتاز' },
  { emoji: '✅', label: 'معتمد' },
];

type IconType = 'emoji' | 'lucide' | 'upload';

function getLucideComponent(name: string) {
  return LUCIDE_ICONS.find(i => i.name === name)?.component || Package;
}

function renderIconPreview(icon: string, size = 'md') {
  const sizeClass = size === 'sm' ? 'w-5 h-5' : size === 'lg' ? 'w-8 h-8' : 'w-6 h-6';
  const textSize = size === 'sm' ? 'text-base' : size === 'lg' ? 'text-2xl' : 'text-lg';
  if (!icon) return <Package className={`${sizeClass} text-gray-400`} />;
  if (icon.startsWith('lucide:')) {
    const name = icon.replace('lucide:', '');
    const Icon = getLucideComponent(name);
    return <Icon className={`${sizeClass} text-current`} />;
  }
  if (icon.startsWith('data:') || icon.startsWith('http')) {
    return <img src={icon} alt="icon" className={`${sizeClass} object-contain rounded`} />;
  }
  return <span className={textSize}>{icon}</span>;
}

interface ConfirmDialogProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

function ConfirmDialog({ message, onConfirm, onCancel, loading }: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden" dir="rtl">
        <div className="p-5 flex flex-col items-center gap-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center">
            <AlertCircle className="w-7 h-7 text-red-500" />
          </div>
          <p className="text-[14px] font-semibold text-gray-800 leading-relaxed">{message}</p>
        </div>
        <div className="flex gap-2 px-5 pb-5">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-200 transition-colors disabled:opacity-60"
          >
            إلغاء
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl font-semibold text-sm hover:bg-red-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {loading ? 'جاري الحذف...' : 'حذف'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PalletTypesManagementTab() {
  const [types, setTypes] = useState<PalletType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingType, setEditingType] = useState<PalletType | null>(null);
  const [iconTab, setIconTab] = useState<IconType>('emoji');
  const [iconSearch, setIconSearch] = useState('');
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    code: '',
    name_ar: '',
    name_en: '',
    description_ar: '',
    description_en: '',
    icon: '📦',
    is_active: true
  });

  useEffect(() => {
    loadTypes();
  }, []);

  useEffect(() => {
    if (notification) {
      const t = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(t);
    }
  }, [notification]);

  const adminEmail = getAdminEmail();

  const showNotification = (type: 'success' | 'error', msg: string) => {
    setNotification({ type, msg });
  };

  const loadTypes = async () => {
    try {
      setLoading(true);
      const email = getAdminEmail();
      if (email) {
        const { data, error } = await supabase.rpc('admin_get_pallet_types', { p_admin_email: email });
        if (error) throw error;
        setTypes(data || []);
      } else {
        const { data, error } = await supabase
          .from('pallet_types_master')
          .select('*')
          .order('sort_order');
        if (error) throw error;
        setTypes(data || []);
      }
    } catch (err) {
      console.error('Error loading pallet types:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500 * 1024) {
      showNotification('error', 'حجم الصورة يجب أن يكون أقل من 500 كيلوبايت');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setUploadPreview(result);
      setFormData(prev => ({ ...prev, icon: result }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminEmail) {
      showNotification('error', 'يجب تسجيل الدخول كمدير أولاً');
      return;
    }
    setSaving(true);
    try {
      if (editingType) {
        const { data, error } = await supabase.rpc('admin_update_pallet_type', {
          p_admin_email: adminEmail,
          p_id: editingType.id,
          p_name_ar: formData.name_ar,
          p_name_en: formData.name_en,
          p_description_ar: formData.description_ar || null,
          p_description_en: formData.description_en || null,
          p_icon: formData.icon || '📦',
          p_is_active: formData.is_active,
        });
        if (error) throw error;
        if (data && !data.success) throw new Error(data.error);
        showNotification('success', 'تم تعديل نوع الطبلية بنجاح');
      } else {
        const maxOrder = types.length > 0 ? Math.max(...types.map(t => t.sort_order)) : 0;
        const { data, error } = await supabase.rpc('admin_create_pallet_type', {
          p_admin_email: adminEmail,
          p_code: formData.code,
          p_name_ar: formData.name_ar,
          p_name_en: formData.name_en,
          p_description_ar: formData.description_ar || null,
          p_description_en: formData.description_en || null,
          p_icon: formData.icon || '📦',
          p_is_active: formData.is_active,
          p_sort_order: maxOrder + 1,
        });
        if (error) throw error;
        if (data && !data.success) throw new Error(data.error);
        showNotification('success', 'تمت إضافة نوع الطبلية بنجاح');
      }
      closeDialog();
      loadTypes();
    } catch (err: any) {
      showNotification('error', err?.message || 'حدث خطأ أثناء الحفظ');
    } finally {
      setSaving(false);
    }
  };

  const closeDialog = () => {
    setShowDialog(false);
    setEditingType(null);
    setIconTab('emoji');
    setIconSearch('');
    setUploadPreview(null);
    setFormData({ code: '', name_ar: '', name_en: '', description_ar: '', description_en: '', icon: '📦', is_active: true });
  };

  const handleEdit = (type: PalletType) => {
    setEditingType(type);
    const icon = type.icon || '📦';
    let tab: IconType = 'emoji';
    if (icon.startsWith('lucide:')) tab = 'lucide';
    else if (icon.startsWith('data:') || icon.startsWith('http')) { tab = 'upload'; setUploadPreview(icon); }
    setIconTab(tab);
    setFormData({
      code: type.code,
      name_ar: type.name_ar,
      name_en: type.name_en,
      description_ar: type.description_ar || '',
      description_en: type.description_en || '',
      icon,
      is_active: type.is_active
    });
    setShowDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!confirmDeleteId || !adminEmail) return;
    setDeleting(true);
    try {
      const { data, error } = await supabase.rpc('admin_delete_pallet_type', {
        p_admin_email: adminEmail,
        p_id: confirmDeleteId,
      });
      if (error) throw error;
      if (data && !data.success) throw new Error(data.error);
      showNotification('success', 'تم حذف نوع الطبلية');
      setConfirmDeleteId(null);
      loadTypes();
    } catch (err: any) {
      showNotification('error', err?.message || 'حدث خطأ أثناء الحذف');
    } finally {
      setDeleting(false);
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    if (!adminEmail) { showNotification('error', 'يجب تسجيل الدخول كمدير أولاً'); return; }
    setTogglingId(id);
    try {
      const type = types.find(t => t.id === id);
      if (!type) return;
      const { data, error } = await supabase.rpc('admin_update_pallet_type', {
        p_admin_email: adminEmail,
        p_id: id,
        p_name_ar: type.name_ar,
        p_name_en: type.name_en,
        p_description_ar: type.description_ar || null,
        p_description_en: type.description_en || null,
        p_icon: type.icon || '📦',
        p_is_active: !currentStatus,
      });
      if (error) throw error;
      if (data && !data.success) throw new Error(data.error);
      showNotification('success', currentStatus ? 'تم إخفاء النوع بنجاح' : 'تم إظهار النوع بنجاح');
      loadTypes();
    } catch (err: any) {
      showNotification('error', err?.message || 'حدث خطأ');
    } finally {
      setTogglingId(null);
    }
  };

  const filteredEmojis = iconSearch
    ? EMOJI_OPTIONS.filter(e => e.label.includes(iconSearch))
    : EMOJI_OPTIONS;

  const filteredLucide = iconSearch
    ? LUCIDE_ICONS.filter(i => i.label.includes(iconSearch) || i.name.toLowerCase().includes(iconSearch.toLowerCase()))
    : LUCIDE_ICONS;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {notification && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[9999] px-6 py-3 rounded-xl shadow-lg text-white text-sm font-medium flex items-center gap-2 transition-all ${
          notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'
        }`}>
          {notification.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {notification.msg}
        </div>
      )}

      {confirmDeleteId && (
        <ConfirmDialog
          message={`هل أنت متأكد من حذف نوع الطبلية "${types.find(t => t.id === confirmDeleteId)?.name_ar}"؟ لا يمكن التراجع عن هذا الإجراء.`}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setConfirmDeleteId(null)}
          loading={deleting}
        />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">إدارة أنواع الطبليات</h2>
          <p className="text-sm text-gray-500 mt-1">إضافة وتعديل أنواع الطبليات المستخدمة في النظام ({types.length} نوع)</p>
        </div>
        <button
          onClick={() => { setEditingType(null); setShowDialog(true); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium text-sm shadow-sm"
        >
          <Plus className="w-4 h-4" />
          إضافة نوع جديد
        </button>
      </div>

      {!adminEmail && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3" dir="rtl">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-700 font-medium">تسجيل دخول المدير مطلوب لتنفيذ الإجراءات</p>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide w-10"></th>
              <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">الأيقونة</th>
              <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">الاسم بالعربية</th>
              <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">الاسم بالإنجليزية</th>
              <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">الكود</th>
              <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">الحالة</th>
              <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {types.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center">
                  <Package className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">لا توجد أنواع طبليات بعد</p>
                </td>
              </tr>
            ) : types.map((type) => (
              <tr key={type.id} className={`hover:bg-gray-50/50 transition-colors ${!type.is_active ? 'opacity-60' : ''}`}>
                <td className="px-5 py-3.5">
                  <GripVertical className="w-4 h-4 text-gray-300 cursor-grab" />
                </td>
                <td className="px-5 py-3.5">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${type.is_active ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-400'}`}>
                    {renderIconPreview(type.icon, 'sm')}
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  <span className="text-sm font-semibold text-gray-900">{type.name_ar}</span>
                  {type.description_ar && (
                    <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[160px]">{type.description_ar}</p>
                  )}
                </td>
                <td className="px-5 py-3.5">
                  <span className="text-sm text-gray-600">{type.name_en}</span>
                </td>
                <td className="px-5 py-3.5">
                  <code className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-md font-mono">{type.code}</code>
                </td>
                <td className="px-5 py-3.5">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full ${
                    type.is_active ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-gray-100 text-gray-500 border border-gray-200'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${type.is_active ? 'bg-green-500' : 'bg-gray-400'}`} />
                    {type.is_active ? 'نشط' : 'مخفي'}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => toggleActive(type.id, type.is_active)}
                      disabled={togglingId === type.id}
                      className={`p-1.5 rounded-lg transition-colors disabled:opacity-50 ${type.is_active ? 'text-gray-500 hover:bg-gray-100' : 'text-green-600 hover:bg-green-50'}`}
                      title={type.is_active ? 'إخفاء' : 'إظهار'}
                    >
                      {togglingId === type.id ? (
                        <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                      ) : type.is_active ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => handleEdit(type)}
                      className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                      title="تعديل"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(type.id)}
                      className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={(e) => e.target === e.currentTarget && closeDialog()}>
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-white flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white">
                  {renderIconPreview(formData.icon, 'sm')}
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">
                    {editingType ? 'تعديل نوع الطبلية' : 'إضافة نوع طبلية جديد'}
                  </h3>
                  <p className="text-xs text-gray-500">{editingType ? `تعديل: ${editingType.name_ar}` : 'أضف نوعاً جديداً للنظام'}</p>
                </div>
              </div>
              <button onClick={closeDialog} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
                {!editingType && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">الكود <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      required
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toLowerCase().replace(/\s/g, '_') })}
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm bg-gray-50 transition-all"
                      placeholder="wood / plastic / metal"
                    />
                    <p className="text-xs text-gray-400 mt-1">فريد، حروف إنجليزية فقط، لا يمكن تعديله لاحقاً</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">الاسم بالعربية <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      required
                      value={formData.name_ar}
                      onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all"
                      placeholder="خشب"
                      dir="rtl"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">الاسم بالإنجليزية <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      required
                      value={formData.name_en}
                      onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all"
                      placeholder="Wood"
                      dir="ltr"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1.5">وصف عربي (اختياري)</label>
                    <textarea
                      rows={2}
                      value={formData.description_ar}
                      onChange={(e) => setFormData({ ...formData, description_ar: e.target.value })}
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm resize-none transition-all"
                      placeholder="وصف قصير للنوع..."
                      dir="rtl"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1.5">English Description (optional)</label>
                    <textarea
                      rows={2}
                      value={formData.description_en}
                      onChange={(e) => setFormData({ ...formData, description_en: e.target.value })}
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm resize-none transition-all"
                      placeholder="Short description..."
                      dir="ltr"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">الأيقونة</label>

                  <div className="flex items-center gap-2 mb-3 bg-gray-100 rounded-xl p-1">
                    {[
                      { id: 'emoji', label: 'إيموجي', icon: <Smile className="w-4 h-4" /> },
                      { id: 'lucide', label: 'أيقونات', icon: <LayoutGrid className="w-4 h-4" /> },
                      { id: 'upload', label: 'رفع صورة', icon: <Upload className="w-4 h-4" /> },
                    ].map(tab => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setIconTab(tab.id as IconType)}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                          iconTab === tab.id
                            ? 'bg-white text-blue-700 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        {tab.icon}
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <div className="p-3 border-b border-gray-100 flex items-center gap-2">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center border-2 border-blue-200">
                        {renderIconPreview(formData.icon, 'sm')}
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-medium text-gray-700">الأيقونة المختارة</p>
                        <p className="text-xs text-gray-400 font-mono truncate">{formData.icon || 'لم يتم الاختيار'}</p>
                      </div>
                      {iconTab !== 'upload' && (
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={iconSearch}
                            onChange={(e) => setIconSearch(e.target.value)}
                            className="pl-3 pr-8 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-28"
                            placeholder="بحث..."
                          />
                        </div>
                      )}
                    </div>

                    <div className="p-3">
                      {iconTab === 'emoji' && (
                        <div className="grid grid-cols-10 gap-1.5">
                          {filteredEmojis.map(({ emoji, label }) => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => setFormData(prev => ({ ...prev, icon: emoji }))}
                              title={label}
                              className={`w-full aspect-square rounded-xl flex items-center justify-center text-lg hover:bg-blue-50 transition-all ${
                                formData.icon === emoji ? 'bg-blue-100 ring-2 ring-blue-400 scale-110' : 'bg-gray-50'
                              }`}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      )}

                      {iconTab === 'lucide' && (
                        <div className="grid grid-cols-5 gap-2">
                          {filteredLucide.map(({ name, component: Icon, label }) => {
                            const val = `lucide:${name}`;
                            return (
                              <button
                                key={name}
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, icon: val }))}
                                title={label}
                                className={`flex flex-col items-center gap-1 p-2.5 rounded-xl transition-all ${
                                  formData.icon === val
                                    ? 'bg-blue-100 ring-2 ring-blue-400'
                                    : 'bg-gray-50 hover:bg-blue-50'
                                }`}
                              >
                                <Icon className="w-5 h-5 text-gray-700" />
                                <span className="text-[10px] text-gray-500 truncate w-full text-center">{label}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {iconTab === 'upload' && (
                        <div className="space-y-3">
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleFileUpload}
                            className="hidden"
                          />
                          {uploadPreview ? (
                            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                              <img src={uploadPreview} alt="preview" className="w-16 h-16 object-contain rounded-xl border border-gray-200 bg-white" />
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-700">تم رفع الصورة</p>
                                <p className="text-xs text-gray-400 mt-1">انقر لاستبدالها</p>
                                <button
                                  type="button"
                                  onClick={() => { setUploadPreview(null); setFormData(prev => ({ ...prev, icon: '📦' })); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                                  className="mt-2 text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
                                >
                                  <X className="w-3 h-3" /> إزالة الصورة
                                </button>
                              </div>
                              <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                              >
                                استبدال
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="w-full border-2 border-dashed border-gray-200 rounded-xl p-8 flex flex-col items-center gap-3 hover:border-blue-400 hover:bg-blue-50/50 transition-all group"
                            >
                              <div className="w-12 h-12 rounded-2xl bg-gray-100 group-hover:bg-blue-100 flex items-center justify-center transition-colors">
                                <ImageIcon className="w-6 h-6 text-gray-400 group-hover:text-blue-500" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-700 group-hover:text-blue-700">انقر لرفع صورة</p>
                                <p className="text-xs text-gray-400 mt-0.5">PNG، JPG، SVG — حتى 500KB</p>
                              </div>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <div>
                    <p className="text-sm font-semibold text-gray-700">الحالة</p>
                    <p className="text-xs text-gray-400 mt-0.5">هل يظهر هذا النوع للمستخدمين؟</p>
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

              <div className="flex gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex-shrink-0">
                <button
                  type="submit"
                  disabled={saving || !adminEmail}
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-semibold text-sm transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> جاري الحفظ...</>
                  ) : (
                    <><Check className="w-4 h-4" /> {editingType ? 'حفظ التعديلات' : 'إضافة النوع'}</>
                  )}
                </button>
                <button
                  type="button"
                  onClick={closeDialog}
                  className="px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 font-medium text-sm transition-colors"
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
