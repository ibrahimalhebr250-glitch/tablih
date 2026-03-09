import { useState, useEffect, useRef } from 'react';
import {
  Image, Plus, Trash2, Pencil, Eye, EyeOff,
  Loader2, Check, X, AlertTriangle, ChevronUp, ChevronDown,
  Upload, Link, RotateCcw, ZoomIn
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface HeroSlide {
  id: string;
  title: string;
  subtitle: string;
  image_url: string;
  sort_order: number;
  is_active: boolean;
}

interface SlideFormData {
  title: string;
  subtitle: string;
  image_url: string;
  is_active: boolean;
}

const EMPTY_FORM: SlideFormData = { title: '', subtitle: '', image_url: '', is_active: true };

const SAMPLE_IMAGES = [
  { label: 'مستودع', url: 'https://images.pexels.com/photos/1267338/pexels-photo-1267338.jpeg?auto=compress&cs=tinysrgb&w=1200&h=400&fit=crop' },
  { label: 'لوجستيات', url: 'https://images.pexels.com/photos/4481259/pexels-photo-4481259.jpeg?auto=compress&cs=tinysrgb&w=1200&h=400&fit=crop' },
  { label: 'شحن', url: 'https://images.pexels.com/photos/906494/pexels-photo-906494.jpeg?auto=compress&cs=tinysrgb&w=1200&h=400&fit=crop' },
  { label: 'تجارة', url: 'https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=1200&h=400&fit=crop' },
  { label: 'طبليات', url: 'https://images.pexels.com/photos/5025673/pexels-photo-5025673.jpeg?auto=compress&cs=tinysrgb&w=1200&h=400&fit=crop' },
  { label: 'أعمال', url: 'https://images.pexels.com/photos/3183197/pexels-photo-3183197.jpeg?auto=compress&cs=tinysrgb&w=1200&h=400&fit=crop' },
];

type ImageTab = 'upload' | 'url' | 'samples';

function LiveBannerPreview({ imageUrl, title, subtitle }: { imageUrl: string; title: string; subtitle: string }) {
  return (
    <div className="relative rounded-2xl overflow-hidden shadow-inner" style={{ height: 120 }}>
      {imageUrl ? (
        <img src={imageUrl} alt="preview" className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-[#1a4a5e] to-[#0a1a28]" />
      )}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(8,20,32,0.80) 0%, rgba(10,28,42,0.65) 100%)' }} />
      <div className="absolute inset-0 flex flex-col justify-center items-center p-4 text-center z-10">
        <p className="text-[10px] text-white/40 font-semibold uppercase tracking-widest mb-1">معاينة مباشرة</p>
        <p className="text-white font-black text-[16px] leading-snug line-clamp-1">{title || 'العنوان الرئيسي'}</p>
        <p className="text-white/55 text-[11px] mt-1 line-clamp-1">{subtitle || 'النص التوضيحي للشريحة'}</p>
        <div className="flex gap-1.5 mt-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="rounded-full" style={{ width: i === 1 ? 18 : 5, height: 5, background: i === 1 ? 'rgba(34,197,94,0.9)' : 'rgba(255,255,255,0.3)' }} />
          ))}
        </div>
      </div>
      <div className="absolute bottom-0 left-0 h-[2px] w-1/3" style={{ background: 'linear-gradient(90deg, rgba(34,197,94,0.0), rgba(34,197,94,0.8), rgba(34,197,94,0.0))' }} />
    </div>
  );
}

export default function HeroSlidesSettings() {
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<SlideFormData>(EMPTY_FORM);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [imageTab, setImageTab] = useState<ImageTab>('upload');
  const [dragOver, setDragOver] = useState(false);
  const [previewFull, setPreviewFull] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('hero_slides').select('*').order('sort_order');
    setSlides(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const uploadFile = async (file: File): Promise<string | null> => {
    if (!file.type.startsWith('image/')) {
      showToast('error', 'الملف يجب أن يكون صورة');
      return null;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('error', 'حجم الصورة يجب أن لا يتجاوز 5MB');
      return null;
    }
    setUploading(true);
    setUploadProgress(20);
    const ext = file.name.split('.').pop() ?? 'jpg';
    const filename = `hero-${Date.now()}.${ext}`;
    setUploadProgress(50);
    const { data, error } = await supabase.storage
      .from('hero-images')
      .upload(filename, file, { cacheControl: '3600', upsert: false });
    setUploadProgress(85);
    if (error || !data) {
      showToast('error', 'فشل رفع الصورة');
      setUploading(false);
      setUploadProgress(0);
      return null;
    }
    const { data: urlData } = supabase.storage.from('hero-images').getPublicUrl(data.path);
    setUploadProgress(100);
    setTimeout(() => { setUploading(false); setUploadProgress(0); }, 600);
    return urlData.publicUrl;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadFile(file);
    if (url) { setForm(f => ({ ...f, image_url: url })); showToast('success', 'تم رفع الصورة'); }
    e.target.value = '';
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const url = await uploadFile(file);
    if (url) { setForm(f => ({ ...f, image_url: url })); showToast('success', 'تم رفع الصورة'); }
  };

  const handleSave = async () => {
    if (!form.title.trim()) { showToast('error', 'العنوان مطلوب'); return; }
    if (!form.image_url.trim()) { showToast('error', 'يجب اختيار صورة أو إدخال رابط'); return; }
    setSaving(true);
    if (editingId) {
      const { error } = await supabase
        .from('hero_slides')
        .update({ title: form.title, subtitle: form.subtitle, image_url: form.image_url, is_active: form.is_active, updated_at: new Date().toISOString() })
        .eq('id', editingId);
      if (error) showToast('error', 'فشل التحديث');
      else { showToast('success', 'تم تحديث الشريحة'); setEditingId(null); setForm(EMPTY_FORM); }
    } else {
      const maxOrder = slides.length > 0 ? Math.max(...slides.map(s => s.sort_order)) : 0;
      const { error } = await supabase
        .from('hero_slides')
        .insert({ title: form.title, subtitle: form.subtitle, image_url: form.image_url, is_active: form.is_active, sort_order: maxOrder + 1 });
      if (error) showToast('error', 'فشل الإضافة');
      else { showToast('success', 'تمت إضافة الشريحة'); setShowAdd(false); setForm(EMPTY_FORM); }
    }
    setSaving(false);
    load();
  };

  const handleEdit = (slide: HeroSlide) => {
    setForm({ title: slide.title, subtitle: slide.subtitle, image_url: slide.image_url, is_active: slide.is_active });
    setEditingId(slide.id);
    setShowAdd(false);
    setImageTab(slide.image_url.includes('supabase') ? 'upload' : slide.image_url.includes('pexels') ? 'samples' : 'url');
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('hero_slides').delete().eq('id', id);
    if (error) showToast('error', 'فشل الحذف');
    else { showToast('success', 'تم الحذف'); setDeleteId(null); load(); }
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

  const handleCancel = () => { setEditingId(null); setShowAdd(false); setForm(EMPTY_FORM); };

  const isFormOpen = showAdd || !!editingId;

  return (
    <div className="space-y-5" dir="rtl">
      {toast && (
        <div className={`fixed top-4 right-1/2 translate-x-1/2 z-[999] flex items-center gap-2.5 px-4 py-2.5 rounded-xl shadow-xl text-[13px] font-semibold animate-in slide-in-from-top-2 duration-300 ${
          toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-500 text-white'
        }`}>
          {toast.type === 'success' ? <Check className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {previewFull && form.image_url && (
        <div className="fixed inset-0 z-[998] bg-black/80 flex items-center justify-center p-6" onClick={() => setPreviewFull(false)}>
          <div className="relative max-w-2xl w-full rounded-2xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            <img src={form.image_url} alt="preview" className="w-full object-cover" style={{ maxHeight: 320 }} />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(8,20,32,0.80) 0%, rgba(10,28,42,0.65) 100%)' }} />
            <div className="absolute inset-0 flex flex-col justify-center items-center p-6 text-center z-10">
              <p className="text-white font-black text-[22px] leading-snug">{form.title || 'العنوان'}</p>
              <p className="text-white/60 text-[14px] mt-2">{form.subtitle || 'النص التوضيحي'}</p>
            </div>
            <button onClick={() => setPreviewFull(false)} className="absolute top-3 left-3 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center hover:bg-black/70 transition-colors">
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[15px] font-bold text-[#1a2f3e]">شرائح البانر الرئيسي</h3>
          <p className="text-[12px] text-[#7a9aab] mt-0.5">إدارة صور ونصوص البانر المتحرك في أعلى الواجهة</p>
        </div>
        {!isFormOpen && (
          <button
            onClick={() => { setShowAdd(true); setEditingId(null); setForm(EMPTY_FORM); setImageTab('upload'); }}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-[13px] font-semibold bg-[#1a4a5e] text-white hover:bg-[#15394d] transition-colors"
          >
            <Plus className="w-4 h-4" />
            إضافة شريحة
          </button>
        )}
      </div>

      {isFormOpen && (
        <div className="rounded-2xl border border-[#d0e4ef] bg-[#f7fbfd] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#e2edf5]">
            <h4 className="text-[14px] font-bold text-[#1a2f3e]">{editingId ? 'تعديل الشريحة' : 'شريحة جديدة'}</h4>
            <button onClick={handleCancel} className="p-1.5 rounded-lg hover:bg-[#e2edf5] transition-colors">
              <X className="w-4 h-4 text-[#7a9aab]" />
            </button>
          </div>

          <div className="p-4 space-y-4">
            <div className="relative">
              <LiveBannerPreview imageUrl={form.image_url} title={form.title} subtitle={form.subtitle} />
              {form.image_url && (
                <button
                  onClick={() => setPreviewFull(true)}
                  className="absolute top-2 left-2 flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-white transition-colors"
                  style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
                >
                  <ZoomIn className="w-3 h-3" />
                  عرض كامل
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="block text-[12px] font-semibold text-[#4a6a7e] mb-1.5">العنوان الرئيسي *</label>
                <input
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="مثال: شبكة تدفق الطلبات"
                  className="w-full px-3 py-2.5 rounded-xl border border-[#d0e4ef] bg-white text-[13px] text-[#1a2f3e] focus:outline-none focus:ring-2 focus:ring-[#1a4a5e]/20 focus:border-[#1a4a5e] transition-colors"
                  dir="rtl"
                />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-[#4a6a7e] mb-1.5">النص التوضيحي</label>
                <input
                  value={form.subtitle}
                  onChange={e => setForm(f => ({ ...f, subtitle: e.target.value }))}
                  placeholder="مثال: ربط الموردين بالمشترين عبر شبكة وطنية ذكية"
                  className="w-full px-3 py-2.5 rounded-xl border border-[#d0e4ef] bg-white text-[13px] text-[#1a2f3e] focus:outline-none focus:ring-2 focus:ring-[#1a4a5e]/20 focus:border-[#1a4a5e] transition-colors"
                  dir="rtl"
                />
              </div>
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-[#4a6a7e] mb-2">الصورة *</label>
              <div className="flex gap-0 rounded-xl border border-[#d0e4ef] overflow-hidden bg-white mb-3">
                {([
                  { id: 'upload' as ImageTab, icon: Upload, label: 'رفع صورة' },
                  { id: 'url' as ImageTab, icon: Link, label: 'رابط URL' },
                  { id: 'samples' as ImageTab, icon: Image, label: 'صور جاهزة' },
                ] as const).map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setImageTab(tab.id)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[12px] font-semibold transition-colors ${
                      imageTab === tab.id ? 'bg-[#1a4a5e] text-white' : 'text-[#7a9aab] hover:text-[#1a4a5e] hover:bg-[#f0f7fc]'
                    }`}
                  >
                    <tab.icon className="w-3.5 h-3.5" />
                    {tab.label}
                  </button>
                ))}
              </div>

              {imageTab === 'upload' && (
                <div className="space-y-2.5">
                  <div
                    className={`relative border-2 border-dashed rounded-xl transition-all cursor-pointer ${
                      dragOver ? 'border-[#1a4a5e] bg-[#EBF5FF]' : 'border-[#c8dde9] bg-white hover:border-[#1a4a5e] hover:bg-[#f7fbfd]'
                    }`}
                    style={{ minHeight: 110 }}
                    onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                    {uploading ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                        <Loader2 className="w-8 h-8 animate-spin text-[#1a4a5e]" />
                        <div className="w-32 h-1.5 rounded-full bg-[#e2edf5] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[#1a4a5e] transition-all duration-300"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                        <p className="text-[12px] font-semibold text-[#4a6a7e]">جارٍ الرفع... {uploadProgress}%</p>
                      </div>
                    ) : form.image_url && (form.image_url.includes('supabase') || form.image_url.startsWith('blob:')) ? (
                      <div className="absolute inset-0 rounded-xl overflow-hidden">
                        <img src={form.image_url} alt="uploaded" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity" style={{ background: 'rgba(8,20,32,0.6)' }}>
                          <div className="flex flex-col items-center gap-1.5 text-white">
                            <RotateCcw className="w-5 h-5" />
                            <span className="text-[11px] font-bold">استبدال الصورة</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(26,74,94,0.08)' }}>
                          <Upload className="w-5 h-5 text-[#1a4a5e]" />
                        </div>
                        <div>
                          <p className="text-[13px] font-bold text-[#1a4a5e]">اسحب الصورة هنا أو انقر للاختيار</p>
                          <p className="text-[11px] text-[#7a9aab] mt-0.5">PNG, JPG, WebP — بحد أقصى 5MB</p>
                        </div>
                      </div>
                    )}
                  </div>
                  {form.image_url && !uploading && (
                    <button
                      onClick={() => setForm(f => ({ ...f, image_url: '' }))}
                      className="flex items-center gap-1.5 text-[11px] font-semibold text-red-400 hover:text-red-500 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                      إزالة الصورة
                    </button>
                  )}
                </div>
              )}

              {imageTab === 'url' && (
                <div className="space-y-2">
                  <div className="relative">
                    <input
                      value={form.image_url}
                      onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))}
                      placeholder="https://images.pexels.com/photos/..."
                      className="w-full px-3 py-2.5 pl-9 rounded-xl border border-[#d0e4ef] bg-white text-[12px] text-[#1a2f3e] focus:outline-none focus:ring-2 focus:ring-[#1a4a5e]/20 focus:border-[#1a4a5e] font-mono transition-colors"
                      dir="ltr"
                    />
                    <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#7a9aab]" />
                  </div>
                  {form.image_url && (
                    <div className="rounded-xl overflow-hidden border border-[#e2edf5]" style={{ height: 70 }}>
                      <img
                        src={form.image_url}
                        alt="url preview"
                        className="w-full h-full object-cover"
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    </div>
                  )}
                </div>
              )}

              {imageTab === 'samples' && (
                <div className="grid grid-cols-3 gap-2">
                  {SAMPLE_IMAGES.map(img => (
                    <button
                      key={img.url}
                      onClick={() => setForm(f => ({ ...f, image_url: img.url }))}
                      className={`relative rounded-xl overflow-hidden border-2 transition-all ${
                        form.image_url === img.url ? 'border-[#1a4a5e] shadow-md scale-[1.02]' : 'border-transparent hover:border-[#b0ccd8]'
                      }`}
                      style={{ height: 64 }}
                    >
                      <img src={img.url} alt={img.label} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 flex items-end justify-center pb-1.5" style={{ background: 'rgba(8,20,32,0.45)' }}>
                        <span className="text-white text-[10px] font-bold">{img.label}</span>
                      </div>
                      {form.image_url === img.url && (
                        <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-[#1a4a5e] flex items-center justify-center">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between py-2.5 px-3.5 rounded-xl bg-white border border-[#d0e4ef]">
              <div>
                <p className="text-[13px] font-semibold text-[#1a2f3e]">تفعيل الشريحة</p>
                <p className="text-[11px] text-[#7a9aab] mt-0.5">{form.is_active ? 'ستظهر في البانر الرئيسي' : 'مخفية ولن تظهر للزوار'}</p>
              </div>
              <button
                onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
                className="relative rounded-full transition-colors flex-shrink-0"
                style={{ width: 44, height: 24, background: form.is_active ? '#1a4a5e' : '#d1d5db' }}
              >
                <span
                  className="absolute top-[3px] w-[18px] h-[18px] rounded-full bg-white shadow-sm transition-transform duration-200"
                  style={{ transform: form.is_active ? 'translateX(23px)' : 'translateX(3px)' }}
                />
              </button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={saving || uploading}
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
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-[#1a4a5e]" />
        </div>
      ) : slides.length === 0 ? (
        <div className="text-center py-12 rounded-2xl border-2 border-dashed border-[#d0e4ef]">
          <Image className="w-10 h-10 text-[#b0ccd8] mx-auto mb-3" />
          <p className="text-[13px] font-semibold text-[#4a6a7e]">لا توجد شرائح بعد</p>
          <p className="text-[12px] text-[#7a9aab] mt-1">أضف أول شريحة للبانر الرئيسي</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          <p className="text-[12px] font-semibold text-[#7a9aab]">{slides.length} شريحة — يتم عرضها بالترتيب أدناه</p>
          {slides.map((slide, idx) => (
            <div
              key={slide.id}
              className={`rounded-2xl border overflow-hidden bg-white transition-all ${
                editingId === slide.id ? 'border-[#1a4a5e] shadow-md' : 'border-[#e2edf5] hover:border-[#b0ccd8] hover:shadow-sm'
              } ${!slide.is_active ? 'opacity-55' : ''}`}
            >
              <div className="flex items-stretch">
                <div className="relative flex-shrink-0" style={{ width: 120 }}>
                  {slide.image_url ? (
                    <img src={slide.image_url} alt={slide.title} className="w-full h-full object-cover" style={{ minHeight: 80 }} />
                  ) : (
                    <div className="w-full h-full min-h-[80px] bg-gradient-to-br from-[#1a4a5e] to-[#0a1a28]" />
                  )}
                  <div className="absolute inset-0" style={{ background: 'rgba(8,20,32,0.50)' }} />
                  <div className="absolute inset-0 flex flex-col justify-center items-center p-2 text-center z-10">
                    <p className="text-white font-black text-[10px] leading-snug line-clamp-2">{slide.title}</p>
                  </div>
                  <div className="absolute top-1.5 right-1.5 flex flex-col gap-0.5 z-10">
                    <button
                      onClick={() => handleMove(slide, 'up')}
                      disabled={idx === 0}
                      className="w-5 h-5 rounded flex items-center justify-center disabled:opacity-25 hover:bg-white/30 transition-colors"
                    >
                      <ChevronUp className="w-3 h-3 text-white" />
                    </button>
                    <button
                      onClick={() => handleMove(slide, 'down')}
                      disabled={idx === slides.length - 1}
                      className="w-5 h-5 rounded flex items-center justify-center disabled:opacity-25 hover:bg-white/30 transition-colors"
                    >
                      <ChevronDown className="w-3 h-3 text-white" />
                    </button>
                  </div>
                </div>

                <div className="flex-1 flex items-center justify-between px-3.5 py-3 gap-2 min-w-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-bold text-[#1a2f3e] truncate">{slide.title}</p>
                    <p className="text-[11px] text-[#7a9aab] truncate mt-0.5">{slide.subtitle || <span className="italic opacity-60">بدون نص توضيحي</span>}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        slide.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {slide.is_active ? <Eye className="w-2.5 h-2.5" /> : <EyeOff className="w-2.5 h-2.5" />}
                        {slide.is_active ? 'ظاهرة' : 'مخفية'}
                      </span>
                      <span className="text-[10px] text-[#b0ccd8] font-semibold">#{idx + 1}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => handleToggleActive(slide)}
                      className="p-2 rounded-xl hover:bg-[#f0f7fc] transition-colors"
                      title={slide.is_active ? 'إخفاء' : 'إظهار'}
                    >
                      {slide.is_active
                        ? <EyeOff className="w-4 h-4 text-[#7a9aab]" />
                        : <Eye className="w-4 h-4 text-[#7a9aab]" />}
                    </button>

                    <button
                      onClick={() => handleEdit(slide)}
                      className="p-2 rounded-xl hover:bg-[#EBF5FF] transition-colors"
                      title="تعديل"
                    >
                      <Pencil className="w-4 h-4 text-[#1a4a5e]" />
                    </button>

                    {deleteId === slide.id ? (
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleDelete(slide.id)} className="px-2.5 py-1 rounded-lg bg-red-500 text-white text-[11px] font-bold hover:bg-red-600 transition-colors">
                          تأكيد
                        </button>
                        <button onClick={() => setDeleteId(null)} className="px-2.5 py-1 rounded-lg bg-[#f0f7fc] text-[#7a9aab] text-[11px] font-bold">
                          إلغاء
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteId(slide.id)}
                        className="p-2 rounded-xl hover:bg-red-50 transition-colors"
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
          <p className="text-[12px] font-semibold text-[#1a4a5e]">نصيحة للصور المثالية</p>
          <p className="text-[11px] text-[#7a9aab] mt-0.5">الأبعاد المثلى: 1200×400 بكسل. الحد الأقصى: 5MB. الصيغ المدعومة: JPG، PNG، WebP</p>
        </div>
      </div>
    </div>
  );
}
