import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Eye, EyeOff, X, Check, Ruler, Weight, ChevronDown, Globe, MapPin, Search } from 'lucide-react';
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
  weight_unit?: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

const LOAD_CAPACITY_PRESETS = [
  { label: '250 كجم', value: '250', category: 'خفيف' },
  { label: '500 كجم', value: '500', category: 'خفيف' },
  { label: '750 كجم', value: '750', category: 'متوسط' },
  { label: '1000 كجم', value: '1000', category: 'متوسط' },
  { label: '1200 كجم', value: '1200', category: 'متوسط' },
  { label: '1500 كجم', value: '1500', category: 'ثقيل' },
  { label: '1800 كجم', value: '1800', category: 'ثقيل' },
  { label: '2000 كجم', value: '2000', category: 'ثقيل جداً' },
  { label: '2500 كجم', value: '2500', category: 'ثقيل جداً' },
  { label: '3000 كجم', value: '3000', category: 'صناعي' },
  { label: '4000 كجم', value: '4000', category: 'صناعي' },
  { label: '5000 كجم', value: '5000', category: 'صناعي ثقيل' },
];

const CATEGORY_COLORS: Record<string, string> = {
  'خفيف': 'bg-green-100 text-green-700 border-green-200',
  'متوسط': 'bg-blue-100 text-blue-700 border-blue-200',
  'ثقيل': 'bg-orange-100 text-orange-700 border-orange-200',
  'ثقيل جداً': 'bg-red-100 text-red-700 border-red-200',
  'صناعي': 'bg-purple-100 text-purple-700 border-purple-200',
  'صناعي ثقيل': 'bg-gray-800 text-white border-gray-700',
};

function getLoadCategory(kg: number): string {
  if (kg <= 500) return 'خفيف';
  if (kg <= 1200) return 'متوسط';
  if (kg <= 1800) return 'ثقيل';
  if (kg <= 2500) return 'ثقيل جداً';
  if (kg <= 4000) return 'صناعي';
  return 'صناعي ثقيل';
}

function LoadBadge({ kg }: { kg?: string }) {
  if (!kg) return <span className="text-xs text-gray-400">—</span>;
  const category = getLoadCategory(Number(kg));
  const color = CATEGORY_COLORS[category] || 'bg-gray-100 text-gray-600 border-gray-200';
  return (
    <div className="flex flex-col gap-0.5">
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full border ${color}`}>
        <Weight className="w-3 h-3" />
        {Number(kg).toLocaleString()} كجم
      </span>
      <span className="text-xs text-gray-400">{category}</span>
    </div>
  );
}

interface LoadPickerProps {
  value: string;
  onChange: (val: string) => void;
}

function LoadPicker({ value, onChange }: LoadPickerProps) {
  const [open, setOpen] = useState(false);
  const [customMode, setCustomMode] = useState(false);

  const isPreset = LOAD_CAPACITY_PRESETS.some(p => p.value === value);
  const selectedPreset = LOAD_CAPACITY_PRESETS.find(p => p.value === value);

  const groupedPresets = LOAD_CAPACITY_PRESETS.reduce<Record<string, typeof LOAD_CAPACITY_PRESETS>>((acc, p) => {
    if (!acc[p.category]) acc[p.category] = [];
    acc[p.category].push(p);
    return acc;
  }, {});

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => { setOpen(!open); setCustomMode(false); }}
        className="w-full flex items-center gap-3 px-4 py-3 border-2 border-gray-200 rounded-xl hover:border-blue-400 focus:border-blue-500 focus:outline-none transition-all bg-white text-right"
      >
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
          value ? (CATEGORY_COLORS[getLoadCategory(Number(value))] || 'bg-gray-100') : 'bg-gray-100'
        }`}>
          <Weight className="w-4 h-4" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-800">
            {value ? `${Number(value).toLocaleString()} كجم` : 'اختر وزن التحمل'}
          </p>
          <p className="text-xs text-gray-400">
            {value ? getLoadCategory(Number(value)) : 'انقر للاختيار'}
          </p>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-2xl shadow-2xl z-50 overflow-hidden">
          <div className="p-3 border-b border-gray-100 flex items-center justify-between">
            <h4 className="font-semibold text-gray-800 text-sm">وزن التحمل الأقصى</h4>
            <button type="button" onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="max-h-72 overflow-y-auto p-3 space-y-3">
            {Object.entries(groupedPresets).map(([cat, presets]) => (
              <div key={cat}>
                <p className={`text-xs font-bold mb-1.5 px-2 py-0.5 rounded-full w-fit ${CATEGORY_COLORS[cat] || 'bg-gray-100 text-gray-600'}`}>{cat}</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {presets.map(p => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => { onChange(p.value); setOpen(false); }}
                      className={`py-2 text-sm font-medium rounded-xl border-2 transition-all ${
                        value === p.value
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-100 bg-gray-50 text-gray-700 hover:border-blue-300 hover:bg-blue-50'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <div className="border-t border-gray-100 pt-3">
              <p className="text-xs font-semibold text-gray-500 mb-2">أو أدخل قيمة مخصصة:</p>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="1"
                  step="50"
                  value={customMode ? value : ''}
                  onChange={(e) => { setCustomMode(true); onChange(e.target.value); }}
                  onFocus={() => setCustomMode(true)}
                  className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-xl text-sm focus:ring-0 focus:border-blue-500"
                  placeholder="مثال: 3500"
                />
                <span className="flex items-center text-sm text-gray-500 font-medium">كجم</span>
                {value && customMode && (
                  <button
                    type="button"
                    onClick={() => { setOpen(false); }}
                    className="px-3 py-2 bg-blue-600 text-white rounded-xl text-sm hover:bg-blue-700"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const SIZE_REGIONS = [
  { id: 'all', label: 'الكل', icon: <Globe className="w-3.5 h-3.5" /> },
  { id: 'sa', label: 'سعودي/خليجي', icon: <MapPin className="w-3.5 h-3.5" /> },
  { id: 'eu', label: 'أوروبي', icon: <Globe className="w-3.5 h-3.5" /> },
  { id: 'us', label: 'أمريكي', icon: <Globe className="w-3.5 h-3.5" /> },
  { id: 'iso', label: 'ISO دولي', icon: <Globe className="w-3.5 h-3.5" /> },
  { id: 'asia', label: 'آسيوي', icon: <Globe className="w-3.5 h-3.5" /> },
  { id: 'industrial', label: 'صناعي', icon: <Globe className="w-3.5 h-3.5" /> },
];

function getRegionFromCode(code: string): string {
  if (code.startsWith('sa_') || code === '120x100' || code === '110x110' || code === '100x100') return 'sa';
  if (code.startsWith('eur')) return 'eu';
  if (code.startsWith('us_') || code.startsWith('gma_')) return 'us';
  if (code.startsWith('iso_')) return 'iso';
  if (code.startsWith('asia_')) return 'asia';
  if (code.startsWith('industrial_')) return 'industrial';
  return 'other';
}

export default function PalletSizesManagementTab() {
  const [sizes, setSizes] = useState<PalletSize[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingSize, setEditingSize] = useState<PalletSize | null>(null);
  const [palletTypes, setPalletTypes] = useState<Array<{ code: string; name_ar: string }>>([]);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRegion, setFilterRegion] = useState('all');
  const [filterType, setFilterType] = useState('all');

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

  useEffect(() => {
    if (notification) {
      const t = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(t);
    }
  }, [notification]);

  const loadSizes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('pallet_sizes_master').select('*').order('sort_order');
      if (error) throw error;
      setSizes(data || []);
    } catch {
      setNotification({ type: 'error', msg: 'حدث خطأ أثناء تحميل البيانات' });
    } finally {
      setLoading(false);
    }
  };

  const loadPalletTypes = async () => {
    const { data } = await supabase
      .from('pallet_types_master')
      .select('code, name_ar')
      .eq('is_active', true)
      .order('sort_order');
    setPalletTypes(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.pallet_type_code) { setNotification({ type: 'error', msg: 'يرجى اختيار نوع الطبلية' }); return; }
    if (!formData.length_cm || !formData.width_cm) { setNotification({ type: 'error', msg: 'يرجى إدخال الطول والعرض' }); return; }
    setSaving(true);
    try {
      if (editingSize) {
        const { error } = await supabase.from('pallet_sizes_master').update({
          pallet_type_code: formData.pallet_type_code,
          name_ar: formData.name_ar,
          name_en: formData.name_en,
          width_cm: formData.width_cm,
          length_cm: formData.length_cm,
          height_cm: formData.height_cm || null,
          max_load_kg: formData.max_load_kg || null,
          weight_unit: 'kg',
          is_active: formData.is_active,
          updated_at: new Date().toISOString()
        }).eq('id', editingSize.id);
        if (error) throw error;
        setNotification({ type: 'success', msg: 'تم تعديل المقاس بنجاح' });
      } else {
        const maxOrder = sizes.length > 0 ? Math.max(...sizes.map(s => s.sort_order)) : 0;
        const { error } = await supabase.from('pallet_sizes_master').insert([{
          pallet_type_code: formData.pallet_type_code,
          code: formData.code,
          name_ar: formData.name_ar,
          name_en: formData.name_en,
          width_cm: formData.width_cm,
          length_cm: formData.length_cm,
          height_cm: formData.height_cm || null,
          max_load_kg: formData.max_load_kg || null,
          weight_unit: 'kg',
          is_active: formData.is_active,
          sort_order: maxOrder + 1
        }]);
        if (error) throw error;
        setNotification({ type: 'success', msg: 'تمت إضافة المقاس بنجاح' });
      }
      closeDialog();
      loadSizes();
    } catch (err: any) {
      setNotification({ type: 'error', msg: err?.message || 'حدث خطأ أثناء الحفظ' });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (size: PalletSize) => {
    setEditingSize(size);
    setFormData({
      pallet_type_code: size.pallet_type_code,
      code: size.code,
      name_ar: size.name_ar,
      name_en: size.name_en,
      width_cm: String(size.width_cm),
      length_cm: String(size.length_cm),
      height_cm: size.height_cm ? String(size.height_cm) : '',
      max_load_kg: size.max_load_kg ? String(size.max_load_kg) : '',
      is_active: size.is_active
    });
    setShowDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا المقاس؟')) return;
    try {
      const { error } = await supabase.from('pallet_sizes_master').delete().eq('id', id);
      if (error) throw error;
      setNotification({ type: 'success', msg: 'تم حذف المقاس' });
      loadSizes();
    } catch {
      setNotification({ type: 'error', msg: 'حدث خطأ أثناء الحذف' });
    }
  };

  const toggleActive = async (id: string, current: boolean) => {
    try {
      const { error } = await supabase.from('pallet_sizes_master')
        .update({ is_active: !current, updated_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
      loadSizes();
    } catch {
      setNotification({ type: 'error', msg: 'حدث خطأ' });
    }
  };

  const closeDialog = () => {
    setShowDialog(false);
    setEditingSize(null);
    setFormData({ pallet_type_code: '', code: '', name_ar: '', name_en: '', width_cm: '', length_cm: '', height_cm: '', max_load_kg: '', is_active: true });
  };

  const autoFillNames = () => {
    const l = formData.length_cm;
    const w = formData.width_cm;
    if (l && w) {
      setFormData(prev => ({
        ...prev,
        name_ar: `${l}×${w} سم`,
        name_en: `${l}×${w} cm`,
        code: prev.code || `${l}x${w}`
      }));
    }
  };

  const filteredSizes = sizes.filter(s => {
    const matchSearch = searchQuery === '' ||
      s.name_ar.includes(searchQuery) || s.name_en.toLowerCase().includes(searchQuery.toLowerCase()) || s.code.includes(searchQuery);
    const matchRegion = filterRegion === 'all' || getRegionFromCode(s.code) === filterRegion;
    const matchType = filterType === 'all' || s.pallet_type_code === filterType;
    return matchSearch && matchRegion && matchType;
  });

  const activeCount = sizes.filter(s => s.is_active).length;

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

      <div className="bg-gradient-to-l from-blue-600 to-blue-700 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">إدارة مقاسات الطبليات</h2>
            <p className="text-blue-200 mt-1 text-sm">المقاسات المحلية والدولية مع أوزان التحمل</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center bg-white/10 rounded-xl px-4 py-2">
              <div className="text-2xl font-bold">{sizes.length}</div>
              <div className="text-xs text-blue-200">إجمالي</div>
            </div>
            <div className="text-center bg-white/10 rounded-xl px-4 py-2">
              <div className="text-2xl font-bold">{activeCount}</div>
              <div className="text-xs text-blue-200">نشط</div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="بحث بالاسم أو الكود..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-9 pl-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-0 focus:border-blue-500 text-sm transition-all bg-white"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-0 focus:border-blue-500 text-sm bg-white"
          >
            <option value="all">كل الأنواع</option>
            {palletTypes.map(t => <option key={t.code} value={t.code}>{t.name_ar}</option>)}
          </select>
          <button
            onClick={() => { setEditingSize(null); setShowDialog(true); }}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium shadow-md shadow-blue-200 transition-all whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            إضافة مقاس جديد
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {SIZE_REGIONS.map(r => (
            <button
              key={r.id}
              onClick={() => setFilterRegion(r.id)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                filterRegion === r.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-300'
              }`}
            >
              {r.icon}
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">المقاس</th>
              <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">الأبعاد</th>
              <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">الارتفاع</th>
              <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">وزن التحمل</th>
              <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">النوع</th>
              <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">الحالة</th>
              <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filteredSizes.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-16">
                  <Ruler className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-400 text-sm">{searchQuery || filterRegion !== 'all' ? 'لا توجد نتائج مطابقة' : 'لا توجد مقاسات'}</p>
                </td>
              </tr>
            ) : filteredSizes.map((size) => (
              <tr key={size.id} className="hover:bg-blue-50/20 transition-colors group">
                <td className="px-5 py-4">
                  <p className="text-sm font-semibold text-gray-900">{size.name_ar}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <code className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-mono">{size.code}</code>
                    <span className="text-xs text-gray-400">{size.name_en}</span>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-1.5">
                    <div className="bg-blue-50 rounded-lg px-3 py-1.5 text-center">
                      <span className="text-sm font-bold text-blue-700">{size.length_cm}×{size.width_cm}</span>
                      <span className="text-xs text-blue-500 block">سم</span>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <span className="text-sm text-gray-600">
                    {size.height_cm ? `${size.height_cm} سم` : '—'}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <LoadBadge kg={size.max_load_kg} />
                </td>
                <td className="px-5 py-4">
                  <code className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-md font-mono">{size.pallet_type_code}</code>
                </td>
                <td className="px-5 py-4">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full ${
                    size.is_active ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-gray-100 text-gray-500 border border-gray-200'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${size.is_active ? 'bg-green-500' : 'bg-gray-400'}`} />
                    {size.is_active ? 'نشط' : 'مخفي'}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => toggleActive(size.id, size.is_active)}
                      className={`p-1.5 rounded-lg transition-colors ${size.is_active ? 'text-gray-400 hover:bg-gray-100' : 'text-green-600 hover:bg-green-50'}`}
                    >
                      {size.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => handleEdit(size)}
                      className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(size.id)}
                      className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
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
                  <Ruler className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">
                    {editingSize ? 'تعديل مقاس الطبلية' : 'إضافة مقاس جديد'}
                  </h3>
                  <p className="text-xs text-gray-500">{editingSize ? `تعديل: ${editingSize.name_ar}` : 'أضف مقاساً جديداً للنظام'}</p>
                </div>
              </div>
              <button onClick={closeDialog} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">نوع الطبلية <span className="text-red-500">*</span></label>
                  <select
                    required
                    value={formData.pallet_type_code}
                    onChange={(e) => setFormData({ ...formData, pallet_type_code: e.target.value })}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-0 focus:border-blue-500 text-sm bg-white"
                  >
                    <option value="">اختر نوع الطبلية</option>
                    {palletTypes.map(t => <option key={t.code} value={t.code}>{t.name_ar}</option>)}
                  </select>
                </div>

                {!editingSize && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">الكود <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      required
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toLowerCase().replace(/\s/g, '_') })}
                      className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-0 focus:border-blue-500 font-mono text-sm bg-gray-50"
                      placeholder="مثال: 120x100 أو eur1_1200x800"
                    />
                    <p className="text-xs text-gray-400 mt-1">يُنشأ تلقائياً عند إدخال الأبعاد</p>
                  </div>
                )}

                <div className="bg-blue-50 rounded-2xl p-4 space-y-3">
                  <h4 className="text-sm font-bold text-blue-800 flex items-center gap-2">
                    <Ruler className="w-4 h-4" />
                    أبعاد الطبلية (بالسنتيمتر)
                  </h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">الطول <span className="text-red-500">*</span></label>
                      <input
                        type="number"
                        required
                        min="1"
                        step="0.1"
                        value={formData.length_cm}
                        onChange={(e) => setFormData({ ...formData, length_cm: e.target.value })}
                        onBlur={autoFillNames}
                        className="w-full px-3 py-2.5 border-2 border-blue-200 bg-white rounded-xl focus:ring-0 focus:border-blue-500 text-sm text-center font-bold"
                        placeholder="120"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">العرض <span className="text-red-500">*</span></label>
                      <input
                        type="number"
                        required
                        min="1"
                        step="0.1"
                        value={formData.width_cm}
                        onChange={(e) => setFormData({ ...formData, width_cm: e.target.value })}
                        onBlur={autoFillNames}
                        className="w-full px-3 py-2.5 border-2 border-blue-200 bg-white rounded-xl focus:ring-0 focus:border-blue-500 text-sm text-center font-bold"
                        placeholder="100"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">الارتفاع</label>
                      <input
                        type="number"
                        min="1"
                        step="0.1"
                        value={formData.height_cm}
                        onChange={(e) => setFormData({ ...formData, height_cm: e.target.value })}
                        className="w-full px-3 py-2.5 border-2 border-blue-200 bg-white rounded-xl focus:ring-0 focus:border-blue-500 text-sm text-center font-bold"
                        placeholder="14"
                      />
                    </div>
                  </div>
                  {formData.length_cm && formData.width_cm && (
                    <div className="flex items-center gap-2 bg-white rounded-xl px-4 py-2 border border-blue-200">
                      <Ruler className="w-4 h-4 text-blue-500" />
                      <span className="text-sm font-bold text-blue-700">{formData.length_cm} × {formData.width_cm} سم</span>
                      {formData.height_cm && <span className="text-sm text-blue-500">× {formData.height_cm} ارتفاع</span>}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">الاسم بالعربية <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      required
                      value={formData.name_ar}
                      onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                      className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-0 focus:border-blue-500 text-sm"
                      placeholder="120×100 سم"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">الاسم بالإنجليزية <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      required
                      value={formData.name_en}
                      onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                      className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-0 focus:border-blue-500 text-sm"
                      placeholder="120×100 cm"
                      dir="ltr"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-2">
                    <Weight className="w-4 h-4 text-orange-500" />
                    وزن التحمل الأقصى
                  </label>
                  <LoadPicker
                    value={formData.max_load_kg}
                    onChange={(val) => setFormData({ ...formData, max_load_kg: val })}
                  />
                  {formData.max_load_kg && (
                    <p className="text-xs text-gray-500 mt-1">
                      الفئة: <span className={`font-semibold ${CATEGORY_COLORS[getLoadCategory(Number(formData.max_load_kg))]?.includes('text-') ? '' : ''}`}>
                        {getLoadCategory(Number(formData.max_load_kg))}
                      </span>
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <div>
                    <p className="text-sm font-semibold text-gray-700">الحالة</p>
                    <p className="text-xs text-gray-400 mt-0.5">هل يظهر هذا المقاس للمستخدمين؟</p>
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
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-semibold text-sm transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {saving
                    ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> جاري الحفظ...</>
                    : <><Check className="w-4 h-4" /> {editingSize ? 'حفظ التعديلات' : 'إضافة المقاس'}</>
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
