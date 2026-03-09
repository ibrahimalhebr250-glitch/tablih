import { useState, useEffect } from 'react';
import { BookOpen, Plus, Trash2, CreditCard as Edit3, Save, X, ChevronDown, ChevronUp, Tag, AlertCircle, CheckCircle2, Loader2, Search, Hash } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface KnowledgeEntry {
  id: string;
  category: string;
  keywords: string[];
  answer: string;
  priority: number;
  usage_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const CATEGORIES = [
  'طلبات', 'مخزون', 'صفقات', 'تسليم', 'مالية', 'حساب',
  'مخزون سحابي', 'مشاكل تقنية', 'السوق', 'تقييمات',
  'اقتراحات', 'تواصل', 'مدن', 'أنواع الطبليات', 'المطابقة التلقائية', 'عام'
];

function EntryForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Partial<KnowledgeEntry>;
  onSave: (data: Omit<KnowledgeEntry, 'id' | 'usage_count' | 'created_at' | 'updated_at'>) => Promise<void>;
  onCancel: () => void;
}) {
  const [category, setCategory] = useState(initial?.category ?? 'عام');
  const [keywordsText, setKeywordsText] = useState((initial?.keywords ?? []).join('، '));
  const [answer, setAnswer] = useState(initial?.answer ?? '');
  const [priority, setPriority] = useState(initial?.priority ?? 5);
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    const keywords = keywordsText.split(/[،,\n]+/).map(k => k.trim()).filter(Boolean);
    if (keywords.length === 0) { setError('أدخل كلمة مفتاحية واحدة على الأقل'); return; }
    if (!answer.trim()) { setError('أدخل نص الإجابة'); return; }
    setSaving(true);
    setError(null);
    try {
      await onSave({ category, keywords, answer: answer.trim(), priority, is_active: isActive });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'حدث خطأ');
    }
    setSaving(false);
  };

  return (
    <div className="bg-white rounded-2xl border-2 border-[#0369A1]/20 shadow-sm p-5 space-y-4" dir="rtl">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-bold text-[#1a2f3e] mb-1.5 block">التصنيف</label>
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm text-right focus:outline-none focus:border-[#0369A1] transition-colors"
          >
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-bold text-[#1a2f3e] mb-1.5 block">الأولوية (1-10)</label>
          <div className="flex items-center gap-2">
            <input
              type="range" min={1} max={10} value={priority}
              onChange={e => setPriority(Number(e.target.value))}
              className="flex-1 accent-[#0369A1]"
            />
            <span className="w-8 text-center text-sm font-black text-[#0369A1]">{priority}</span>
          </div>
        </div>
      </div>

      <div>
        <label className="text-xs font-bold text-[#1a2f3e] mb-1.5 block flex items-center gap-1.5">
          <Hash className="w-3 h-3 text-[#0369A1]" />
          الكلمات المفتاحية
          <span className="text-[10px] text-[#9ab0bf] font-normal">(افصل بفاصلة أو سطر جديد)</span>
        </label>
        <textarea
          value={keywordsText}
          onChange={e => setKeywordsText(e.target.value)}
          placeholder="مثال: طلب، اطلب، شراء، كيف اطلب"
          rows={2}
          className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm text-right focus:outline-none focus:border-[#0369A1] transition-colors resize-none"
        />
        <div className="flex flex-wrap gap-1 mt-1.5">
          {keywordsText.split(/[،,\n]+/).map(k => k.trim()).filter(Boolean).map((kw, i) => (
            <span key={i} className="px-2 py-0.5 bg-[#EFF6FF] text-[#0369A1] text-[11px] rounded-full font-bold">{kw}</span>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs font-bold text-[#1a2f3e] mb-1.5 block">نص الإجابة</label>
        <textarea
          value={answer}
          onChange={e => setAnswer(e.target.value)}
          placeholder="اكتب الإجابة التي ستُرسَل للعميل..."
          rows={4}
          className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm text-right focus:outline-none focus:border-[#0369A1] transition-colors resize-none leading-relaxed"
        />
        <p className="text-[10px] text-[#9ab0bf] mt-1">{answer.length} حرف</p>
      </div>

      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsActive(!isActive)}
            className={`relative w-10 h-5 rounded-full transition-colors ${isActive ? 'bg-green-500' : 'bg-gray-200'}`}
          >
            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${isActive ? 'right-0.5' : 'left-0.5'}`} />
          </button>
          <span className="text-xs font-bold text-[#1a2f3e]">{isActive ? 'مفعّل' : 'موقوف'}</span>
        </div>
        <div className="flex items-center gap-2">
          {error && <p className="text-[11px] text-red-500 font-bold">{error}</p>}
          <button onClick={onCancel} className="px-3 py-1.5 rounded-xl text-sm font-bold text-[#7a9aab] hover:bg-gray-100 transition-colors">
            إلغاء
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-1.5 rounded-xl text-sm font-black text-white flex items-center gap-1.5 disabled:opacity-50 transition-all"
            style={{ background: 'linear-gradient(135deg, #0369A1, #0284C7)' }}
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            حفظ
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AIKnowledgePanel() {
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('الكل');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = async () => {
    const { data } = await supabase
      .from('ai_knowledge_base')
      .select('*')
      .order('priority', { ascending: false })
      .order('usage_count', { ascending: false });
    setEntries((data ?? []) as KnowledgeEntry[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase.channel('kb-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ai_knowledge_base' }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const handleAdd = async (data: Omit<KnowledgeEntry, 'id' | 'usage_count' | 'created_at' | 'updated_at'>) => {
    await supabase.from('ai_knowledge_base').insert(data);
    setShowAdd(false);
    load();
  };

  const handleEdit = async (id: string, data: Omit<KnowledgeEntry, 'id' | 'usage_count' | 'created_at' | 'updated_at'>) => {
    await supabase.from('ai_knowledge_base').update({ ...data, updated_at: new Date().toISOString() }).eq('id', id);
    setEditingId(null);
    load();
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    await supabase.from('ai_knowledge_base').delete().eq('id', id);
    setDeletingId(null);
    load();
  };

  const handleToggle = async (id: string, current: boolean) => {
    await supabase.from('ai_knowledge_base').update({ is_active: !current, updated_at: new Date().toISOString() }).eq('id', id);
    load();
  };

  const categories = ['الكل', ...Array.from(new Set(entries.map(e => e.category)))];
  const filtered = entries.filter(e => {
    const matchesSearch = !search || e.keywords.some(k => k.includes(search)) || e.answer.includes(search) || e.category.includes(search);
    const matchesCat = filterCategory === 'الكل' || e.category === filterCategory;
    return matchesSearch && matchesCat;
  });

  if (loading) {
    return <div className="flex items-center justify-center h-48"><Loader2 className="w-6 h-6 animate-spin text-[#7a9aab]" /></div>;
  }

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0f2535] to-[#1a3d56] flex items-center justify-center">
            <BookOpen className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="font-black text-[#0f2535] text-sm">قاعدة المعرفة</p>
            <p className="text-[10px] text-[#7a9aab]">{entries.filter(e => e.is_active).length} نشط من {entries.length} إجمالي</p>
          </div>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold text-white transition-all active:scale-95"
          style={{ background: 'linear-gradient(135deg, #0369A1, #0284C7)' }}
        >
          <Plus className="w-4 h-4" />
          إضافة إجابة
        </button>
      </div>

      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="w-3.5 h-3.5 text-[#7a9aab] absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="بحث في الكلمات أو الإجابات..."
            className="w-full border-2 border-gray-200 rounded-xl pr-9 pl-3 py-2 text-sm text-right focus:outline-none focus:border-[#0369A1] transition-colors"
          />
        </div>
        <select
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
          className="border-2 border-gray-200 rounded-xl px-3 py-2 text-sm text-right focus:outline-none focus:border-[#0369A1] transition-colors"
        >
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {showAdd && (
        <EntryForm
          onSave={handleAdd}
          onCancel={() => setShowAdd(false)}
        />
      )}

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
            <BookOpen className="w-10 h-10 text-gray-200 mx-auto mb-2" />
            <p className="text-sm font-bold text-[#7a9aab]">لا توجد نتائج</p>
          </div>
        ) : filtered.map(entry => (
          <div key={entry.id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${entry.is_active ? 'border-gray-100' : 'border-gray-200 opacity-60'}`}>
            {editingId === entry.id ? (
              <div className="p-4">
                <EntryForm
                  initial={entry}
                  onSave={(data) => handleEdit(entry.id, data)}
                  onCancel={() => setEditingId(null)}
                />
              </div>
            ) : (
              <>
                <div className="flex items-start gap-3 p-4">
                  <div className="flex flex-col items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => handleToggle(entry.id, entry.is_active)}
                      className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${entry.is_active ? 'bg-green-50' : 'bg-gray-100'}`}
                    >
                      {entry.is_active
                        ? <CheckCircle2 className="w-4 h-4 text-green-500" />
                        : <AlertCircle className="w-4 h-4 text-gray-400" />}
                    </button>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#EFF6FF] text-[#0369A1]">{entry.category}</span>
                      <span className="text-[10px] text-[#9ab0bf]">أولوية {entry.priority}</span>
                      {entry.usage_count > 0 && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-50 text-green-600">
                          استُخدم {entry.usage_count} مرة
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {entry.keywords.slice(0, 6).map((kw, i) => (
                        <span key={i} className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-[#3a5568] rounded-lg font-bold">{kw}</span>
                      ))}
                      {entry.keywords.length > 6 && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-[#7a9aab] rounded-lg">+{entry.keywords.length - 6}</span>
                      )}
                    </div>
                    <p
                      className={`text-[12px] text-[#3a5568] leading-relaxed ${expandedId !== entry.id ? 'line-clamp-2' : 'whitespace-pre-wrap'}`}
                    >
                      {entry.answer}
                    </p>
                    {entry.answer.length > 100 && (
                      <button
                        onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                        className="flex items-center gap-1 mt-1 text-[10px] text-[#0369A1] font-bold"
                      >
                        {expandedId === entry.id ? <><ChevronUp className="w-3 h-3" />طي</> : <><ChevronDown className="w-3 h-3" />عرض الكامل</>}
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => setEditingId(entry.id)}
                      className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-[#EFF6FF] flex items-center justify-center transition-colors"
                    >
                      <Edit3 className="w-3 h-3 text-[#0369A1]" />
                    </button>
                    <button
                      onClick={() => handleDelete(entry.id)}
                      disabled={deletingId === entry.id}
                      className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-red-50 flex items-center justify-center transition-colors disabled:opacity-50"
                    >
                      {deletingId === entry.id
                        ? <Loader2 className="w-3 h-3 animate-spin text-red-500" />
                        : <Trash2 className="w-3 h-3 text-red-400" />}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
