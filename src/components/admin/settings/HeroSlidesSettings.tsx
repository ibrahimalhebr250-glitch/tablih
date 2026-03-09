import { useState, useEffect } from 'react';
import {
  Image, Plus, Trash2, GripVertical, Eye, EyeOff,
  Loader2, Check, X, AlertTriangle, ChevronUp, ChevronDown
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface HeroSlide {
  id: string;
  title: string;
  subtitle: string;
  image_url: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

interface SlideFormData {
  title: string;
  subtitle: string;
  image_url: string;
  is_active: boolean;
}

const EMPTY_FORM: SlideFormData = {
  title: '',
  subtitle: '',
  image_url: '',
  is_active: true,
};

const SAMPLE_IMAGES = [
  { label: 'مستودع', url: 'https://images.pexels.com/photos/1267338/pexels-photo-1267338.jpeg?auto=compress&cs=tinysrgb&w=1200&h=400&fit=crop' },
  { label: 'لوجستيات', url: 'https://images.pexels.com/photos/4481259/pexels-photo-4481259.jpeg?auto=compress&cs=tinysrgb&w=1200&h=400&fit=crop' },
  { label: 'شحن', url: 'https://images.pexels.com/photos/906494/pexels-photo-906494.jpeg?auto=compress&cs=tinysrgb&w=1200&h=400&fit=crop' },
  { label: 'تجارة', url: 'https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=1200&h=400&fit=crop' },
  { label: 'طبليات', url: 'https://images.pexels.com/photos/5025673/pexels-photo-5025673.jpeg?auto=compress&cs=tinysrgb&w=1200&h=400&fit=crop' },
];

function SlidePreview({ imageUrl, title, subtitle }: { imageUrl: string; title: string; subtitle: string }) {
  return (
    <div className="relative rounded-xl overflow-hidden" style={{ height: 100 }}>
      {imageUrl ? (
        <img src={imageUrl} alt="preview" className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-[#1a4a5e] to-[#0a1a28]" />
      )}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(8,20,32,0.85) 0%, rgba(10,28,42,0.70) 100%)' }} />
      <div className="absolute inset-0 flex flex-col justify-center items-center p-3 text-center z-10">
        <p className="text-white font-black text-[13px] leading-tight line-clamp-1">{title || 'العنوان'}</p>
        <p className="text-white/55 text-[10px] mt-1 line-clamp-1">{subtitle || 'النص التوضيحي'}</p>
      </div>
    </div>
  );
}

export default function HeroSlidesSettings() {
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<SlideFormData>(EMPTY_FORM);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('hero_slides')
      .select('*')
      .order('sort_order');
    setSlides(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    if (!form.title.trim() || !form.image_url.trim()) {
      showToast('error', 'العنوان ورابط الصورة مطلوبان');
      return;
    }
    setSaving(true);
    if (editingId) {
      const { error } = await supabase
        .from('hero_slides')
        .update({ title: form.title, subtitle: form.subtitle, image_url: form.image_url, is_active: form.is_active, updated_at: new Date().toISOString() })
        .eq('id', editingId);
      if (error) showToast('error', 'فشل التحديث');
      else { showToast('success', 'تم تحديث الشريحة'); setEditingId(null); }
    } else {
      const maxOrder = slides.length > 0 ? Math.max(...slides.map(s => s.sort_order)) : 0;
      const { error } = await supabase
        .from('hero_slides')
        .insert({ title: form.title, subtitle: form.subtitle, image_url: form.image_url, is_active: form.is_active, sort_order: maxOrder + 1 });
      if (error) showToast('error', 'فشل الإضافة');
      else { showToast('success', 'تمت إضافة الشريحة'); setShowAdd(false); }
    }
    setForm(EMPTY_FORM);
    setSaving(false);
    load();
  };

  const handleEdit = (slide: HeroSlide) => {
    setForm({ title: slide.title, subtitle: slide.subtitle, image_url: slide.image_url, is_active: slide.is_active });
    setEditingId(slide.id);
    setShowAdd(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('hero_slides').delete().eq('id', id);
    if (error) showToast('error', 'فشل الحذف');
    else { showToast('success', 'تم حذف الشريحة'); setDeleteId(null); load(); }
  };

  const handleToggleActive = async (slide: HeroSlide) => {
    await supabase.from('hero_slides').update({ is_active: !slide.is_active }).eq('id', slide.id);
    load();
  };

  const handleMove = async (slide: HeroSlide, dir: 'up' | 'down') => {
    const idx = slides.findIndex(s => s.id === slide.id);
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= slides.length) return;
    const other = slides[swapIdx];
    await Promise.all([
      supabase.from('hero_slides').update({ sort_order: other.sort_order }).eq('id', slide.id),
      supabase.from('hero_slides').update({ sort_order: slide.sort_order }).eq('id', other.id),
    ]);
    load();
  };

  const handleCancel = () => {
    setEditingId(null);
    setShowAdd(false);
    setForm(EMPTY_FORM);
  };

  return (
    <div className="space-y-5" dir="rtl">
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-xl shadow-lg text-[13px] font-semibold transition-all ${
          toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-500 text-white'
        }`}>
          {toast.type === 'success' ? <Check className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[15px] font-bold text-[#1a2f3e]">شرائح البانر الرئيسي</h3>
          <p className="text-[12px] text-[#7a9aab] mt-0.5">إدارة الصور والنصوص التي تظهر في أعلى الواجهة الرئيسية</p>
        </div>
        {!showAdd && !editingId && (
          <button
            onClick={() => { setShowAdd(true); setEditingId(null); setForm(EMPTY_FORM); }}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-[13px] font-semibold bg-[#1a4a5e] text-white hover:bg-[#15394d] transition-colors"
          >
            <Plus className="w-4 h-4" />
            إضافة شريحة
          </button>
        )}
      </div>

      {(showAdd || editingId) && (
        <div className="rounded-2xl border border-[#e2edf5] bg-[#f7fbfd] p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-[14px] font-bold text-[#1a2f3e]">{editingId ? 'تعديل الشريحة' : 'شريحة جديدة'}</h4>
            <button onClick={handleCancel} className="p-1.5 rounded-lg hover:bg-[#e2edf5] transition-colors">
              <X className="w-4 h-4 text-[#7a9aab]" />
            </button>
          </div>

          <SlidePreview imageUrl={form.image_url} title={form.title} subtitle={form.subtitle} />

          <div className="space-y-3">
            <div>
              <label className="block text-[12px] font-semibold text-[#4a6a7e] mb-1.5">العنوان الرئيسي *</label>
              <input
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="مثال: شبكة تدفق الطلبات"
                className="w-full px-3 py-2.5 rounded-xl border border-[#d0e4ef] bg-white text-[13px] text-[#1a2f3e] focus:outline-none focus:ring-2 focus:ring-[#1a4a5e]/20 focus:border-[#1a4a5e]"
                dir="rtl"
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-[#4a6a7e] mb-1.5">النص التوضيحي</label>
              <input
                value={form.subtitle}
                onChange={e => setForm(f => ({ ...f, subtitle: e.target.value }))}
                placeholder="مثال: ربط الموردين بالمشترين عبر شبكة وطنية ذكية"
                className="w-full px-3 py-2.5 rounded-xl border border-[#d0e4ef] bg-white text-[13px] text-[#1a2f3e] focus:outline-none focus:ring-2 focus:ring-[#1a4a5e]/20 focus:border-[#1a4a5e]"
                dir="rtl"
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-[#4a6a7e] mb-1.5">رابط الصورة *</label>
              <input
                value={form.image_url}
                onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))}
                placeholder="https://images.pexels.com/..."
                className="w-full px-3 py-2.5 rounded-xl border border-[#d0e4ef] bg-white text-[13px] text-[#1a2f3e] focus:outline-none focus:ring-2 focus:ring-[#1a4a5e]/20 focus:border-[#1a4a5e] font-mono"
                dir="ltr"
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {SAMPLE_IMAGES.map(img => (
                  <button
                    key={img.url}
                    onClick={() => setForm(f => ({ ...f, image_url: img.url }))}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors border ${
                      form.image_url === img.url
                        ? 'bg-[#1a4a5e] text-white border-[#1a4a5e]'
                        : 'bg-white text-[#4a6a7e] border-[#d0e4ef] hover:border-[#1a4a5e] hover:text-[#1a4a5e]'
                    }`}
                  >
                    <Image className="w-3 h-3 inline ml-1" />
                    {img.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-white border border-[#d0e4ef]">
              <span className="text-[13px] font-semibold text-[#1a2f3e]">تفعيل الشريحة</span>
              <button
                onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
                className="relative rounded-full transition-colors flex-shrink-0"
                style={{ width: 40, height: 22, background: form.is_active ? '#1a4a5e' : '#d1d5db' }}
              >
                <span
                  className="absolute top-0.5 w-[18px] h-[18px] rounded-full bg-white shadow-sm transition-transform"
                  style={{ transform: form.is_active ? 'translateX(20px)' : 'translateX(2px)' }}
                />
              </button>
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#1a4a5e] text-white text-[13px] font-bold hover:bg-[#15394d] transition-colors disabled:opacity-60"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {editingId ? 'حفظ التعديلات' : 'إضافة الشريحة'}
            </button>
            <button
              onClick={handleCancel}
              className="px-4 py-2.5 rounded-xl border border-[#d0e4ef] text-[#7a9aab] text-[13px] font-semibold hover:bg-[#f0f7fc] transition-colors"
            >
              إلغاء
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-[#1a4a5e]" />
        </div>
      ) : slides.length === 0 ? (
        <div className="text-center py-10 rounded-2xl border-2 border-dashed border-[#d0e4ef]">
          <Image className="w-10 h-10 text-[#b0ccd8] mx-auto mb-3" />
          <p className="text-[13px] font-semibold text-[#4a6a7e]">لا توجد شرائح بعد</p>
          <p className="text-[12px] text-[#7a9aab] mt-1">أضف أول شريحة للبانر الرئيسي</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {slides.map((slide, idx) => (
            <div
              key={slide.id}
              className={`rounded-2xl border overflow-hidden transition-all ${
                editingId === slide.id ? 'border-[#1a4a5e] shadow-md' : 'border-[#e2edf5] hover:border-[#b0ccd8]'
              } ${!slide.is_active ? 'opacity-60' : ''}`}
            >
              <div className="flex items-stretch bg-white">
                <div className="relative w-[110px] flex-shrink-0">
                  {slide.image_url ? (
                    <img src={slide.image_url} alt={slide.title} className="w-full h-full object-cover" style={{ minHeight: 72 }} />
                  ) : (
                    <div className="w-full h-full min-h-[72px] bg-gradient-to-br from-[#1a4a5e] to-[#0a1a28]" />
                  )}
                  <div className="absolute inset-0" style={{ background: 'rgba(8,20,32,0.45)' }} />
                  <div className="absolute inset-0 flex flex-col justify-center items-center p-2 text-center z-10">
                    <p className="text-white font-black text-[10px] leading-tight line-clamp-2">{slide.title}</p>
                  </div>
                </div>

                <div className="flex-1 flex items-center justify-between px-4 py-3 gap-3">
                  <div className="min-w-0">
                    <p className="text-[13px] font-bold text-[#1a2f3e] truncate">{slide.title}</p>
                    <p className="text-[11px] text-[#7a9aab] truncate mt-0.5">{slide.subtitle || '—'}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        slide.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {slide.is_active ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                        {slide.is_active ? 'مفعّل' : 'مخفي'}
                      </span>
                      <span className="text-[10px] text-[#b0ccd8]">الترتيب: {slide.sort_order}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <div className="flex flex-col gap-0.5">
                      <button
                        onClick={() => handleMove(slide, 'up')}
                        disabled={idx === 0}
                        className="p-1 rounded-lg hover:bg-[#f0f7fc] transition-colors disabled:opacity-30"
                      >
                        <ChevronUp className="w-3.5 h-3.5 text-[#4a6a7e]" />
                      </button>
                      <button
                        onClick={() => handleMove(slide, 'down')}
                        disabled={idx === slides.length - 1}
                        className="p-1 rounded-lg hover:bg-[#f0f7fc] transition-colors disabled:opacity-30"
                      >
                        <ChevronDown className="w-3.5 h-3.5 text-[#4a6a7e]" />
                      </button>
                    </div>

                    <button
                      onClick={() => handleToggleActive(slide)}
                      className="p-2 rounded-lg hover:bg-[#f0f7fc] transition-colors"
                      title={slide.is_active ? 'إخفاء' : 'إظهار'}
                    >
                      {slide.is_active ? (
                        <EyeOff className="w-4 h-4 text-[#7a9aab]" />
                      ) : (
                        <Eye className="w-4 h-4 text-[#7a9aab]" />
                      )}
                    </button>

                    <button
                      onClick={() => handleEdit(slide)}
                      className="p-2 rounded-lg hover:bg-[#EBF5FF] transition-colors"
                      title="تعديل"
                    >
                      <GripVertical className="w-4 h-4 text-[#1a4a5e]" />
                    </button>

                    {deleteId === slide.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDelete(slide.id)}
                          className="px-2.5 py-1 rounded-lg bg-red-500 text-white text-[11px] font-bold hover:bg-red-600 transition-colors"
                        >
                          تأكيد
                        </button>
                        <button
                          onClick={() => setDeleteId(null)}
                          className="px-2.5 py-1 rounded-lg bg-[#f0f7fc] text-[#7a9aab] text-[11px] font-bold"
                        >
                          إلغاء
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteId(slide.id)}
                        className="p-2 rounded-lg hover:bg-red-50 transition-colors"
                        title="حذف"
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-xl bg-[#f0f7fc] border border-[#d0e4ef] p-3 flex items-start gap-2.5">
        <Image className="w-4 h-4 text-[#4a9aae] mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-[12px] font-semibold text-[#1a4a5e]">نصيحة: أفضل أبعاد للصور</p>
          <p className="text-[11px] text-[#7a9aab] mt-0.5">استخدم صوراً عرضها 1200px وارتفاعها 400px على الأقل للحصول على جودة عالية. يُنصح باستخدام صور من Pexels.com</p>
        </div>
      </div>
    </div>
  );
}
