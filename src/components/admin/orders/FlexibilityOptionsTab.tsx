import { useState, useMemo } from 'react';
import {
  Plus, Search, Filter, ChevronUp, ChevronDown, Eye, EyeOff,
  Pencil, Trash2, Save, X, Zap, GitBranch, BarChart2, Copy,
  CheckCircle2, AlertCircle, GripVertical, Tag, Activity,
  ToggleLeft, ToggleRight, Info, Layers
} from 'lucide-react';
import { useOrderSettings, type FlexibilityOption } from '../../../hooks/useOrderSettings';

type ViewMode = 'grid' | 'list';
type FilterStatus = 'all' | 'active' | 'inactive';

const MATCHING_RULE_TEMPLATES = [
  { label: 'سماح جزئي', key: 'allow_partial', defaultValue: true, type: 'boolean' },
  { label: 'مدن قريبة', key: 'allow_nearby_cities', defaultValue: true, type: 'boolean' },
  { label: 'نطاق الجودة', key: 'quality_range', defaultValue: 1, type: 'number' },
  { label: 'نسبة كمية مقبولة %', key: 'quantity_tolerance_pct', defaultValue: 20, type: 'number' },
  { label: 'أيام تأخير مسموح', key: 'delay_days_allowed', defaultValue: 3, type: 'number' },
];

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  quality:  { bg: 'bg-amber-50',   text: 'text-amber-700',  border: 'border-amber-200', dot: 'bg-amber-400' },
  quantity: { bg: 'bg-sky-50',     text: 'text-sky-700',    border: 'border-sky-200',   dot: 'bg-sky-400' },
  location: { bg: 'bg-teal-50',    text: 'text-teal-700',   border: 'border-teal-200',  dot: 'bg-teal-400' },
  delivery: { bg: 'bg-rose-50',    text: 'text-rose-700',   border: 'border-rose-200',  dot: 'bg-rose-400' },
  type:     { bg: 'bg-violet-50',  text: 'text-violet-700', border: 'border-violet-200',dot: 'bg-violet-400' },
  default:  { bg: 'bg-gray-50',    text: 'text-gray-700',   border: 'border-gray-200',  dot: 'bg-gray-400' },
};

function guessCategory(code: string): string {
  if (code.includes('quality')) return 'quality';
  if (code.includes('quantity') || code.includes('partial')) return 'quantity';
  if (code.includes('city') || code.includes('near')) return 'location';
  if (code.includes('delivery') || code.includes('delay')) return 'delivery';
  if (code.includes('type') || code.includes('size')) return 'type';
  return 'default';
}

const EMPTY_FORM = {
  code: '',
  name_ar: '',
  name_en: '',
  description: '',
  sort_order: 1,
  affects_matching: true,
  matching_rule: {} as Record<string, unknown>,
};

function generateCodeFromArabic(text: string): string {
  const map: Record<string, string> = {
    'أ': 'a', 'ا': 'a', 'إ': 'i', 'آ': 'aa',
    'ب': 'b', 'ت': 't', 'ث': 'th', 'ج': 'j',
    'ح': 'h', 'خ': 'kh', 'د': 'd', 'ذ': 'dh',
    'ر': 'r', 'ز': 'z', 'س': 's', 'ش': 'sh',
    'ص': 's', 'ض': 'd', 'ط': 't', 'ظ': 'z',
    'ع': 'a', 'غ': 'gh', 'ف': 'f', 'ق': 'q',
    'ك': 'k', 'ل': 'l', 'م': 'm', 'ن': 'n',
    'ه': 'h', 'و': 'w', 'ي': 'y', 'ى': 'a',
    'ة': 'a', 'ء': '', 'ئ': 'y', 'ؤ': 'w',
  };
  return text
    .split('')
    .map((c) => map[c] ?? (c === ' ' ? '_' : ''))
    .join('')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .toLowerCase()
    .slice(0, 32);
}

interface RuleEditorProps {
  rule: Record<string, unknown>;
  onChange: (rule: Record<string, unknown>) => void;
}

function RuleEditor({ rule, onChange }: RuleEditorProps) {
  const [customKey, setCustomKey] = useState('');
  const [customValue, setCustomValue] = useState('');

  const addTemplate = (tpl: typeof MATCHING_RULE_TEMPLATES[0]) => {
    if (tpl.key in rule) return;
    onChange({ ...rule, [tpl.key]: tpl.defaultValue });
  };

  const removeKey = (key: string) => {
    const updated = { ...rule };
    delete updated[key];
    onChange(updated);
  };

  const updateValue = (key: string, val: string) => {
    const num = Number(val);
    onChange({ ...rule, [key]: isNaN(num) ? val === 'true' : num });
  };

  const addCustom = () => {
    if (!customKey.trim()) return;
    onChange({ ...rule, [customKey.trim()]: customValue });
    setCustomKey('');
    setCustomValue('');
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {MATCHING_RULE_TEMPLATES.map((tpl) => (
          <button
            key={tpl.key}
            type="button"
            onClick={() => addTemplate(tpl)}
            disabled={tpl.key in rule}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              tpl.key in rule
                ? 'bg-[#1a4a5e]/10 text-[#1a4a5e] border-[#1a4a5e]/20 cursor-default'
                : 'bg-white text-gray-600 border-gray-200 hover:border-[#1a4a5e] hover:text-[#1a4a5e] cursor-pointer'
            }`}
          >
            {tpl.key in rule ? <CheckCircle2 className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
            {tpl.label}
          </button>
        ))}
      </div>

      {Object.keys(rule).length > 0 && (
        <div className="space-y-2">
          {Object.entries(rule).map(([key, value]) => (
            <div key={key} className="flex items-center gap-2 bg-gray-50 rounded-xl p-2.5 border border-gray-100">
              <Tag className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <span className="text-xs font-mono text-gray-700 flex-shrink-0 min-w-[120px]">{key}</span>
              <input
                type={typeof value === 'boolean' ? 'text' : 'text'}
                value={String(value)}
                onChange={(e) => updateValue(key, e.target.value)}
                className="flex-1 text-xs px-2 py-1 border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-[#1a4a5e]"
              />
              <button
                type="button"
                onClick={() => removeKey(key)}
                className="p-1 hover:bg-red-100 rounded-lg transition-colors"
              >
                <X className="w-3.5 h-3.5 text-red-500" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2">
        <input
          type="text"
          placeholder="مفتاح مخصص"
          value={customKey}
          onChange={(e) => setCustomKey(e.target.value)}
          className="flex-1 text-xs px-3 py-2 border border-dashed border-gray-300 rounded-xl bg-white focus:outline-none focus:border-[#1a4a5e] focus:border-solid"
        />
        <input
          type="text"
          placeholder="القيمة"
          value={customValue}
          onChange={(e) => setCustomValue(e.target.value)}
          className="w-24 text-xs px-3 py-2 border border-dashed border-gray-300 rounded-xl bg-white focus:outline-none focus:border-[#1a4a5e] focus:border-solid"
        />
        <button
          type="button"
          onClick={addCustom}
          disabled={!customKey.trim()}
          className="p-2 bg-[#1a4a5e] text-white rounded-xl hover:bg-[#152f3d] disabled:opacity-40 transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default function FlexibilityOptionsTab() {
  const {
    flexibilityOptions,
    loading,
    error,
    createFlexibilityOption,
    updateFlexibilityOption,
    deleteFlexibilityOption,
  } = useOrderSettings();

  const [viewMode] = useState<ViewMode>('list');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<FlexibilityOption> & { matching_rule: Record<string, unknown> }>({ matching_rule: {} });
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [newForm, setNewForm] = useState({ ...EMPTY_FORM });
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const filtered = useMemo(() => {
    return flexibilityOptions.filter((o) => {
      const matchSearch =
        !search ||
        o.name_ar.includes(search) ||
        o.name_en.toLowerCase().includes(search.toLowerCase()) ||
        o.code.toLowerCase().includes(search.toLowerCase());
      const matchStatus =
        filterStatus === 'all' ||
        (filterStatus === 'active' && o.is_active) ||
        (filterStatus === 'inactive' && !o.is_active);
      return matchSearch && matchStatus;
    });
  }, [flexibilityOptions, search, filterStatus]);

  const stats = useMemo(() => ({
    total: flexibilityOptions.length,
    active: flexibilityOptions.filter((o) => o.is_active).length,
    withRules: flexibilityOptions.filter((o) => Object.keys(o.matching_rule || {}).length > 0).length,
    affectsMatching: flexibilityOptions.filter((o) => o.affects_matching).length,
  }), [flexibilityOptions]);

  const handleStartEdit = (option: FlexibilityOption) => {
    setEditingId(option.id);
    setEditForm({ ...option, matching_rule: { ...(option.matching_rule || {}) } });
    setShowAddPanel(false);
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    setSavingId(editingId);
    const result = await updateFlexibilityOption(editingId, editForm);
    setSavingId(null);
    if (result?.success) {
      setEditingId(null);
      showToast('تم حفظ التعديلات بنجاح');
    } else {
      showToast('فشل الحفظ', 'error');
    }
  };

  const handleToggle = async (option: FlexibilityOption) => {
    await updateFlexibilityOption(option.id, { is_active: !option.is_active });
    showToast(option.is_active ? 'تم تعطيل الخيار' : 'تم تفعيل الخيار');
  };

  const handleMoveUp = async (option: FlexibilityOption, index: number) => {
    if (index === 0) return;
    const prev = flexibilityOptions[index - 1];
    await updateFlexibilityOption(option.id, { sort_order: prev.sort_order });
    await updateFlexibilityOption(prev.id, { sort_order: option.sort_order });
  };

  const handleMoveDown = async (option: FlexibilityOption, index: number) => {
    if (index === flexibilityOptions.length - 1) return;
    const next = flexibilityOptions[index + 1];
    await updateFlexibilityOption(option.id, { sort_order: next.sort_order });
    await updateFlexibilityOption(next.id, { sort_order: option.sort_order });
  };

  const handleDelete = async (id: string) => {
    const result = await deleteFlexibilityOption(id);
    setDeleteConfirmId(null);
    if (result?.success) {
      showToast('تم حذف الخيار بنجاح');
    } else {
      showToast('فشل الحذف', 'error');
    }
  };

  const handleCreate = async () => {
    if (!newForm.code || !newForm.name_ar || !newForm.name_en) {
      showToast('يرجى ملء جميع الحقول المطلوبة', 'error');
      return;
    }
    const result = await createFlexibilityOption({
      code: newForm.code,
      name_ar: newForm.name_ar,
      name_en: newForm.name_en,
      description: newForm.description,
      is_active: true,
      sort_order: flexibilityOptions.length + 1,
      affects_matching: newForm.affects_matching,
    });
    if (result?.success) {
      setShowAddPanel(false);
      setNewForm({ ...EMPTY_FORM });
      showToast('تمت إضافة خيار المرونة بنجاح');
    } else {
      showToast('فشل الإضافة', 'error');
    }
  };

  const handleDuplicate = async (option: FlexibilityOption) => {
    const result = await createFlexibilityOption({
      code: `${option.code}_copy`,
      name_ar: `${option.name_ar} (نسخة)`,
      name_en: `${option.name_en} (Copy)`,
      description: option.description,
      is_active: false,
      sort_order: flexibilityOptions.length + 1,
      affects_matching: option.affects_matching,
    });
    if (result?.success) showToast('تم نسخ الخيار');
    else showToast('فشل النسخ', 'error');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-[#1a4a5e]/20 border-t-[#1a4a5e] rounded-full animate-spin mx-auto" />
          <p className="text-sm text-gray-500">جاري تحميل خيارات المرونة...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6 flex items-center gap-3">
        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
        <p className="text-red-700 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-5" dir="rtl">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-5 py-3 rounded-2xl shadow-xl text-sm font-medium transition-all ${
          toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* Stats Bar */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'إجمالي الخيارات', value: stats.total, icon: Layers, color: 'text-gray-700', bg: 'bg-gray-50 border-gray-200' },
          { label: 'مفعّل', value: stats.active, icon: Activity, color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
          { label: 'يؤثر على المطابقة', value: stats.affectsMatching, icon: Zap, color: 'text-[#1a4a5e]', bg: 'bg-[#1a4a5e]/5 border-[#1a4a5e]/20' },
          { label: 'مع قواعد مخصصة', value: stats.withRules, icon: GitBranch, color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
        ].map((s) => (
          <div key={s.label} className={`rounded-2xl border p-3.5 ${s.bg}`}>
            <div className="flex items-center gap-2 mb-1">
              <s.icon className={`w-4 h-4 ${s.color}`} />
              <span className="text-xs text-gray-500">{s.label}</span>
            </div>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="البحث باسم الخيار أو الكود..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pr-10 pl-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:border-[#1a4a5e] transition-colors"
          />
        </div>

        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
          {(['all', 'active', 'inactive'] as FilterStatus[]).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filterStatus === s ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {s === 'all' ? 'الكل' : s === 'active' ? 'مفعّل' : 'معطّل'}
            </button>
          ))}
        </div>

        <button
          onClick={() => { setShowAddPanel(!showAddPanel); setEditingId(null); }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${
            showAddPanel
              ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              : 'bg-[#1a4a5e] text-white hover:bg-[#152f3d] shadow-md shadow-[#1a4a5e]/20'
          }`}
        >
          {showAddPanel ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showAddPanel ? 'إلغاء' : 'إضافة مرونة'}
        </button>
      </div>

      {/* Add Panel */}
      {showAddPanel && (
        <div className="rounded-2xl overflow-hidden border-2 border-[#1a4a5e]/25 shadow-lg shadow-[#1a4a5e]/8">
          {/* Panel header */}
          <div className="bg-[#1a4a5e] px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white/15 rounded-xl flex items-center justify-center">
                <Plus className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">إضافة خيار مرونة جديد</h3>
                <p className="text-white/60 text-xs mt-0.5">يُضاف الخيار في حالة مفعّل تلقائياً</p>
              </div>
            </div>
            <button
              onClick={() => { setShowAddPanel(false); setNewForm({ ...EMPTY_FORM }); }}
              className="p-1.5 hover:bg-white/15 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-white/70" />
            </button>
          </div>

          <div className="bg-white p-6 space-y-6">
            {/* Step 1 - Names */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 bg-[#1a4a5e] text-white rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0">١</span>
                <span className="text-sm font-bold text-gray-800">تسمية الخيار</span>
              </div>

              <div className="grid grid-cols-2 gap-4 pr-8">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-2">
                    الاسم بالعربية <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newForm.name_ar}
                    onChange={(e) => {
                      const ar = e.target.value;
                      const autoCode = generateCodeFromArabic(ar);
                      setNewForm({ ...newForm, name_ar: ar, code: autoCode });
                    }}
                    placeholder="مثال: قبول تسليم جزئي"
                    className="w-full px-4 py-3 text-sm border-2 border-gray-100 rounded-xl bg-gray-50 focus:outline-none focus:border-[#1a4a5e] focus:bg-white transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-2">
                    الاسم بالإنجليزية <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newForm.name_en}
                    onChange={(e) => setNewForm({ ...newForm, name_en: e.target.value })}
                    placeholder="Accept Partial Delivery"
                    className="w-full px-4 py-3 text-sm border-2 border-gray-100 rounded-xl bg-gray-50 focus:outline-none focus:border-[#1a4a5e] focus:bg-white transition-all"
                    dir="ltr"
                  />
                </div>
              </div>

              {/* Auto-generated code preview */}
              <div className="pr-8">
                <div className="flex items-center gap-3 px-4 py-2.5 bg-[#1a4a5e]/5 border border-[#1a4a5e]/15 rounded-xl">
                  <div className="flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-[#1a4a5e]" />
                    <span className="text-xs text-[#1a4a5e] font-semibold">الكود (يُولَّد تلقائياً)</span>
                  </div>
                  <div className="flex-1 flex items-center gap-2">
                    {newForm.code ? (
                      <span className="font-mono text-sm text-[#1a4a5e] font-bold bg-white px-3 py-1 rounded-lg border border-[#1a4a5e]/20">
                        {newForm.code}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400 italic">اكتب الاسم بالعربية لتوليد الكود</span>
                    )}
                  </div>
                  {newForm.code && (
                    <button
                      onClick={() => setNewForm({ ...newForm, code: '' })}
                      className="text-xs text-gray-400 hover:text-gray-600 underline"
                    >
                      تعديل يدوي
                    </button>
                  )}
                </div>
                {!newForm.code && newForm.name_ar === '' && (
                  <></>
                )}
                {newForm.code === '' && newForm.name_ar !== '' && (
                  <div className="mt-2 pr-1">
                    <input
                      type="text"
                      value={newForm.code}
                      onChange={(e) => setNewForm({ ...newForm, code: e.target.value.replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '').toLowerCase() })}
                      placeholder="أدخل الكود يدوياً"
                      className="w-full px-4 py-2.5 text-sm border-2 border-dashed border-gray-300 rounded-xl font-mono focus:outline-none focus:border-[#1a4a5e] focus:border-solid"
                      dir="ltr"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-gray-100" />

            {/* Step 2 - Description */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 bg-[#1a4a5e] text-white rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0">٢</span>
                <span className="text-sm font-bold text-gray-800">الوصف</span>
                <span className="text-xs text-gray-400">(اختياري)</span>
              </div>
              <div className="pr-8">
                <textarea
                  value={newForm.description}
                  onChange={(e) => setNewForm({ ...newForm, description: e.target.value })}
                  placeholder="وصف مختصر يوضح للمشتري متى يستخدم هذا الخيار وكيف يؤثر على نتائج البحث..."
                  rows={2}
                  className="w-full px-4 py-3 text-sm border-2 border-gray-100 rounded-xl bg-gray-50 focus:outline-none focus:border-[#1a4a5e] focus:bg-white transition-all resize-none"
                />
              </div>
            </div>

            <div className="border-t border-gray-100" />

            {/* Step 3 - Matching Rules */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 bg-[#1a4a5e] text-white rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0">٣</span>
                <span className="text-sm font-bold text-gray-800">قواعد المطابقة</span>
                <span className="text-xs text-gray-400">(اختياري)</span>
              </div>
              <div className="pr-8">
                <RuleEditor
                  rule={newForm.matching_rule}
                  onChange={(r) => setNewForm({ ...newForm, matching_rule: r })}
                />
              </div>
            </div>

            <div className="border-t border-gray-100" />

            {/* Step 4 - Settings + Actions */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-3 cursor-pointer">
                <div
                  onClick={() => setNewForm({ ...newForm, affects_matching: !newForm.affects_matching })}
                  className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer ${newForm.affects_matching ? 'bg-[#1a4a5e]' : 'bg-gray-200'}`}
                >
                  <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-all duration-200 ${newForm.affects_matching ? 'left-6' : 'left-0.5'}`} />
                </div>
                <div>
                  <span className="text-sm font-semibold text-gray-700 block">يؤثر على نظام المطابقة</span>
                  <span className="text-xs text-gray-400">يُفعّل هذا الخيار في خوارزمية المطابقة التلقائية</span>
                </div>
              </label>

              <div className="flex gap-3">
                <button
                  onClick={() => { setShowAddPanel(false); setNewForm({ ...EMPTY_FORM }); }}
                  className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-200 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleCreate}
                  disabled={!newForm.name_ar || !newForm.name_en}
                  className="flex items-center gap-2 px-6 py-2.5 bg-[#1a4a5e] text-white rounded-xl text-sm font-semibold hover:bg-[#152f3d] disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md shadow-[#1a4a5e]/20"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  إضافة الخيار
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Info Banner */}
      <div className="flex items-start gap-3 p-4 bg-sky-50 border border-sky-200 rounded-2xl">
        <Info className="w-4 h-4 text-sky-600 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-sky-800 leading-relaxed">
          خيارات المرونة تمكّن المشترين من توسيع نطاق بحثهم عند إنشاء طلب. كل خيار مُفعّل يظهر للمشتري ويؤثر مباشرة على خوارزمية المطابقة التلقائية.
        </p>
      </div>

      {/* Results count */}
      {search && (
        <p className="text-xs text-gray-500">
          {filtered.length} نتيجة من أصل {flexibilityOptions.length}
        </p>
      )}

      {/* Options List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-16 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
            <Filter className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">لا توجد خيارات مطابقة</p>
          </div>
        ) : (
          filtered.map((option, index) => {
            const cat = guessCategory(option.code);
            const colors = CATEGORY_COLORS[cat];
            const isEditing = editingId === option.id;
            const ruleCount = Object.keys(option.matching_rule || {}).length;
            const realIndex = flexibilityOptions.findIndex((o) => o.id === option.id);

            return (
              <div
                key={option.id}
                className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden ${
                  isEditing ? 'border-[#1a4a5e]/40 shadow-lg shadow-[#1a4a5e]/10' : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                }`}
              >
                {isEditing ? (
                  /* ─── EDIT MODE ─── */
                  <div className="p-5 space-y-5">
                    <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-[#1a4a5e]/10 rounded-lg flex items-center justify-center">
                          <Pencil className="w-3.5 h-3.5 text-[#1a4a5e]" />
                        </div>
                        <span className="text-sm font-bold text-gray-800">تعديل الخيار</span>
                        <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded-lg text-gray-600">{option.code}</span>
                      </div>
                      <button onClick={() => setEditingId(null)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                        <X className="w-4 h-4 text-gray-500" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">الاسم بالعربية</label>
                        <input
                          type="text"
                          value={editForm.name_ar || ''}
                          onChange={(e) => setEditForm({ ...editForm, name_ar: e.target.value })}
                          className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#1a4a5e]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">الاسم بالإنجليزية</label>
                        <input
                          type="text"
                          value={editForm.name_en || ''}
                          onChange={(e) => setEditForm({ ...editForm, name_en: e.target.value })}
                          className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#1a4a5e]"
                          dir="ltr"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">الوصف</label>
                      <textarea
                        value={editForm.description || ''}
                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                        rows={2}
                        className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#1a4a5e] resize-none"
                      />
                    </div>

                    <div className="bg-gray-50 rounded-xl p-4 space-y-3 border border-gray-100">
                      <div className="flex items-center gap-2">
                        <GitBranch className="w-4 h-4 text-[#1a4a5e]" />
                        <span className="text-sm font-semibold text-gray-700">قواعد المطابقة</span>
                      </div>
                      <RuleEditor
                        rule={editForm.matching_rule || {}}
                        onChange={(r) => setEditForm({ ...editForm, matching_rule: r })}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <div
                          onClick={() => setEditForm({ ...editForm, affects_matching: !editForm.affects_matching })}
                          className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${editForm.affects_matching ? 'bg-[#1a4a5e]' : 'bg-gray-200'}`}
                        >
                          <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${editForm.affects_matching ? 'left-5' : 'left-0.5'}`} />
                        </div>
                        <span className="text-sm font-medium text-gray-700">يؤثر على نظام المطابقة</span>
                      </label>

                      <div className="flex gap-3">
                        <button
                          onClick={() => setEditingId(null)}
                          className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                        >
                          إلغاء
                        </button>
                        <button
                          onClick={handleSaveEdit}
                          disabled={savingId === option.id}
                          className="flex items-center gap-2 px-5 py-2 text-sm bg-[#1a4a5e] text-white rounded-xl font-semibold hover:bg-[#152f3d] disabled:opacity-60 transition-colors"
                        >
                          {savingId === option.id ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          ) : (
                            <Save className="w-4 h-4" />
                          )}
                          حفظ التعديلات
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* ─── VIEW MODE ─── */
                  <div className="flex items-stretch">
                    {/* Color accent strip */}
                    <div className={`w-1.5 rounded-r-2xl flex-shrink-0 ${option.is_active ? 'bg-emerald-400' : 'bg-gray-200'}`} />

                    <div className="flex-1 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          {/* Top row */}
                          <div className="flex items-center gap-2.5 flex-wrap mb-1.5">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border ${colors.bg} ${colors.text} ${colors.border}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
                              {option.name_ar}
                            </span>
                            <span className="font-mono text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-lg border border-gray-100">
                              {option.code}
                            </span>
                            {option.affects_matching && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#1a4a5e]/8 text-[#1a4a5e] text-xs font-medium rounded-lg">
                                <Zap className="w-3 h-3" />
                                مطابقة
                              </span>
                            )}
                            {ruleCount > 0 && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 text-xs font-medium rounded-lg border border-amber-100">
                                <GitBranch className="w-3 h-3" />
                                {ruleCount} قاعدة
                              </span>
                            )}
                          </div>

                          {option.description && (
                            <p className="text-xs text-gray-500 leading-relaxed mb-2 line-clamp-1">{option.description}</p>
                          )}

                          {/* Rule preview chips */}
                          {ruleCount > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {Object.entries(option.matching_rule).map(([k, v]) => (
                                <span key={k} className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 border border-amber-100 rounded-lg text-xs text-amber-800">
                                  <span className="font-mono opacity-70">{k}:</span>
                                  <span className="font-semibold">{String(v)}</span>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {/* Toggle active */}
                          <button
                            onClick={() => handleToggle(option)}
                            title={option.is_active ? 'تعطيل' : 'تفعيل'}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                              option.is_active
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
                            }`}
                          >
                            {option.is_active ? (
                              <><ToggleRight className="w-3.5 h-3.5" />مفعّل</>
                            ) : (
                              <><ToggleLeft className="w-3.5 h-3.5" />معطّل</>
                            )}
                          </button>

                          <div className="w-px h-6 bg-gray-100" />

                          {/* Sort */}
                          <button
                            onClick={() => handleMoveUp(option, realIndex)}
                            disabled={realIndex === 0}
                            className="p-1.5 hover:bg-gray-100 rounded-lg disabled:opacity-30 transition-colors"
                            title="رفع"
                          >
                            <ChevronUp className="w-4 h-4 text-gray-500" />
                          </button>
                          <button
                            onClick={() => handleMoveDown(option, realIndex)}
                            disabled={realIndex === flexibilityOptions.length - 1}
                            className="p-1.5 hover:bg-gray-100 rounded-lg disabled:opacity-30 transition-colors"
                            title="خفض"
                          >
                            <ChevronDown className="w-4 h-4 text-gray-500" />
                          </button>

                          <div className="w-px h-6 bg-gray-100" />

                          {/* Duplicate */}
                          <button
                            onClick={() => handleDuplicate(option)}
                            className="p-1.5 hover:bg-sky-50 rounded-lg transition-colors"
                            title="نسخ"
                          >
                            <Copy className="w-4 h-4 text-sky-500" />
                          </button>

                          {/* Edit */}
                          <button
                            onClick={() => handleStartEdit(option)}
                            className="p-1.5 hover:bg-[#1a4a5e]/8 rounded-lg transition-colors"
                            title="تعديل"
                          >
                            <Pencil className="w-4 h-4 text-[#1a4a5e]" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => setDeleteConfirmId(option.id)}
                            className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                            title="حذف"
                          >
                            <Trash2 className="w-4 h-4 text-red-400" />
                          </button>
                        </div>
                      </div>

                      {/* Bottom meta */}
                      <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-50">
                        <span className="text-xs text-gray-400">ترتيب: <span className="font-semibold text-gray-600">{option.sort_order}</span></span>
                        <span className="text-gray-200">|</span>
                        <span className="text-xs text-gray-400">EN: <span className="font-medium text-gray-600">{option.name_en}</span></span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Delete Confirm Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl">
            <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-center text-lg font-bold text-gray-900 mb-2">حذف خيار المرونة</h3>
            <p className="text-center text-sm text-gray-500 mb-6">
              سيتم حذف هذا الخيار نهائياً ولا يمكن التراجع عن هذا الإجراء.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-200 transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl font-semibold text-sm hover:bg-red-700 transition-colors"
              >
                حذف نهائي
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
