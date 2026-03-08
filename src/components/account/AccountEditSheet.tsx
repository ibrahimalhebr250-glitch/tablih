import { useState, useRef } from 'react';
import {
  X,
  Camera,
  User,
  Building2,
  MapPin,
  Briefcase,
  Check,
  Loader2,
  ChevronDown,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { AppSession } from '../../types/session';

interface Props {
  session: AppSession;
  profileImageUrl: string | null;
  onClose: () => void;
  onSaved: (updates: {
    display_name?: string;
    company_name?: string;
    city?: string;
    activity_type?: string;
    profile_image_url?: string | null;
  }) => void;
}

const SAUDI_CITIES = [
  'الرياض', 'جدة', 'مكة المكرمة', 'المدينة المنورة', 'الدمام',
  'الخبر', 'الظهران', 'الطائف', 'بريدة', 'تبوك', 'خميس مشيط',
  'الجبيل', 'حائل', 'نجران', 'الباحة', 'ينبع', 'جيزان', 'عرعر',
  'سكاكا', 'أبها', 'القطيف', 'الأحساء', 'عنيزة', 'الرس',
];

async function uploadProfileImage(phone: string, file: File): Promise<string | null> {
  const ext = file.name.split('.').pop() ?? 'jpg';
  const path = `profiles/${phone}/avatar.${ext}`;
  const { error } = await supabase.storage
    .from('inventory-images')
    .upload(path, file, { cacheControl: '3600', upsert: true });
  if (error) return null;
  const { data } = supabase.storage.from('inventory-images').getPublicUrl(path);
  return `${data.publicUrl}?t=${Date.now()}`;
}

export default function AccountEditSheet({ session, profileImageUrl, onClose, onSaved }: Props) {
  const phone = session.profile.phone;
  const isCompany = session.profile.user_type === 'company';

  const [displayName, setDisplayName] = useState(session.profile.display_name);
  const [companyName, setCompanyName] = useState(session.profile.company_name);
  const [city, setCity] = useState(session.profile.city);
  const [activityType, setActivityType] = useState(session.profile.activity_type);
  const [imageUrl, setImageUrl] = useState<string | null>(profileImageUrl);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);

  const currentImage = imagePreview ?? imageUrl;
  const initials = (displayName || companyName || phone)
    .trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError('حجم الصورة يجب أن يكون أقل من 5 ميغابايت');
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setRemoving(false);
    setError(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setImageUrl(null);
    setRemoving(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    let finalImageUrl = imageUrl;

    if (imageFile) {
      setUploading(true);
      const uploaded = await uploadProfileImage(phone, imageFile);
      setUploading(false);
      if (!uploaded) {
        setError('تعذر رفع الصورة. يرجى المحاولة مرة أخرى.');
        setSaving(false);
        return;
      }
      finalImageUrl = uploaded;
    } else if (removing) {
      finalImageUrl = null;
    }

    const updates: Record<string, string | null> = {
      display_name: displayName.trim() || null,
      company_name: companyName.trim() || null,
      city: city.trim() || null,
      activity_type: activityType.trim() || null,
      profile_image_url: finalImageUrl,
    };

    const { error: dbError } = await supabase
      .from('platform_users')
      .update(updates)
      .eq('phone', phone);

    setSaving(false);

    if (dbError) {
      setError('حدث خطأ أثناء الحفظ. يرجى المحاولة مرة أخرى.');
      return;
    }

    setSaved(true);
    onSaved({
      display_name: displayName.trim(),
      company_name: companyName.trim(),
      city: city.trim(),
      activity_type: activityType.trim(),
      profile_image_url: finalImageUrl,
    });
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 700);
  };

  return (
    <div className="fixed inset-0 z-[200] flex flex-col" dir="rtl" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
      <div
        className="absolute inset-x-0 bottom-0 flex flex-col rounded-t-3xl"
        style={{ background: '#f4f9fc', maxHeight: '92vh' }}
      >
        <div
          className="flex items-center justify-between px-5 py-4 flex-shrink-0 rounded-t-3xl"
          style={{ background: 'linear-gradient(135deg, #0f2535, #1a4a5e)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}
        >
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center active:scale-95"
          >
            <X className="w-4 h-4 text-white" />
          </button>
          <h2 className="text-[14px] font-bold text-white">تعديل الحساب</h2>
          <div className="w-8" />
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          {/* Profile Photo */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <div
                className="w-24 h-24 rounded-2xl overflow-hidden flex items-center justify-center"
                style={{
                  background: currentImage ? 'transparent' : 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                  border: '3px solid #BAE6FD',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
                }}
              >
                {currentImage ? (
                  <img src={currentImage} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[28px] font-black text-white">{initials}</span>
                )}
              </div>
              <button
                onClick={() => fileRef.current?.click()}
                className="absolute -bottom-1 -left-1 w-8 h-8 rounded-xl flex items-center justify-center border-2 border-white active:scale-95"
                style={{ background: 'linear-gradient(135deg, #0ea5e9, #0284c7)', boxShadow: '0 2px 8px rgba(14,165,233,0.4)' }}
              >
                <Camera className="w-4 h-4 text-white" />
              </button>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleFileChange}
            />
            <div className="flex items-center gap-2">
              <button
                onClick={() => fileRef.current?.click()}
                className="px-4 py-2 rounded-xl text-[12px] font-bold text-[#0369A1] bg-[#E0F2FE] border border-[#BAE6FD] active:scale-95 transition-transform"
              >
                رفع صورة
              </button>
              {currentImage && (
                <button
                  onClick={handleRemoveImage}
                  className="px-4 py-2 rounded-xl text-[12px] font-bold text-[#991b1b] bg-[#FEF2F2] border border-[#FECACA] active:scale-95 transition-transform"
                >
                  حذف الصورة
                </button>
              )}
            </div>
            <p className="text-[10px] text-[#9ab0bf]">JPG أو PNG أو WebP • بحد أقصى 5 ميغابايت</p>
          </div>

          {/* Fields */}
          <div className="space-y-3">
            <Field
              label="الاسم المعروض"
              icon={<User className="w-4 h-4 text-[#7a9aab]" />}
            >
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="اسمك الكامل"
                className="w-full bg-transparent outline-none text-[13px] font-bold text-[#1a3a4a] text-right placeholder-[#c0d0da]"
              />
            </Field>

            {isCompany && (
              <Field
                label="اسم المنشأة"
                icon={<Building2 className="w-4 h-4 text-[#7a9aab]" />}
              >
                <input
                  type="text"
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  placeholder="اسم الشركة أو المنشأة"
                  className="w-full bg-transparent outline-none text-[13px] font-bold text-[#1a3a4a] text-right placeholder-[#c0d0da]"
                />
              </Field>
            )}

            <Field
              label="النشاط التجاري"
              icon={<Briefcase className="w-4 h-4 text-[#7a9aab]" />}
            >
              <input
                type="text"
                value={activityType}
                onChange={e => setActivityType(e.target.value)}
                placeholder="مثال: تجزئة، جملة، تصنيع"
                className="w-full bg-transparent outline-none text-[13px] font-bold text-[#1a3a4a] text-right placeholder-[#c0d0da]"
              />
            </Field>

            <div>
              <label className="block text-[11px] font-bold text-[#4a7a94] mb-1.5 mr-1">المدينة</label>
              <button
                onClick={() => setShowCityPicker(prev => !prev)}
                className="w-full flex items-center justify-between gap-3 bg-white border-2 border-[#e2edf5] rounded-xl px-3 py-3 focus-within:border-[#0369A1] transition-colors"
              >
                <ChevronDown className={`w-4 h-4 text-[#9ab0bf] flex-shrink-0 transition-transform ${showCityPicker ? 'rotate-180' : ''}`} />
                <div className="flex items-center gap-2 flex-1 justify-end">
                  <span className={`text-[13px] font-bold ${city ? 'text-[#1a3a4a]' : 'text-[#c0d0da]'}`}>
                    {city || 'اختر المدينة'}
                  </span>
                  <MapPin className="w-4 h-4 text-[#7a9aab]" />
                </div>
              </button>
              {showCityPicker && (
                <div
                  className="mt-1 bg-white border border-[#e2edf5] rounded-2xl overflow-hidden"
                  style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}
                >
                  <div className="max-h-52 overflow-y-auto divide-y divide-[#f5f9fb]">
                    {SAUDI_CITIES.map(c => (
                      <button
                        key={c}
                        onClick={() => { setCity(c); setShowCityPicker(false); }}
                        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-[#f0f6fa] transition-colors"
                      >
                        {city === c && <Check className="w-3.5 h-3.5 text-[#0369A1]" />}
                        <span className="text-[12px] font-bold text-[#1a3a4a] flex-1 text-right">{c}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-[#f8fbfd] border border-[#e2edf5] rounded-xl px-3 py-2.5 flex items-center gap-2">
            <span className="text-[11px] text-[#7a9aab] flex-1 text-right">رقم الجوال لا يمكن تعديله مباشرة</span>
            <div className="flex items-center gap-1.5">
              <span className="text-[12px] font-bold text-[#1a3a4a]" dir="ltr">{phone}</span>
            </div>
          </div>

          {error && (
            <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-xl px-3 py-2.5">
              <p className="text-[12px] text-[#dc2626] font-bold">{error}</p>
            </div>
          )}
        </div>

        <div className="flex-shrink-0 px-5 pb-8 pt-3 space-y-2" style={{ borderTop: '1px solid #e2edf5', background: 'white' }}>
          <button
            onClick={handleSave}
            disabled={saving || uploading}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-[14px] font-bold text-white active:scale-[0.98] transition-transform disabled:opacity-60"
            style={{
              background: saved ? '#16a34a' : 'linear-gradient(135deg, #0369A1, #0284C7)',
              boxShadow: '0 4px 16px rgba(3,105,161,0.3)',
            }}
          >
            {(saving || uploading) ? (
              <><Loader2 className="w-4 h-4 animate-spin" />{uploading ? 'جارٍ رفع الصورة...' : 'جارٍ الحفظ...'}</>
            ) : saved ? (
              <><Check className="w-4 h-4" />تم الحفظ بنجاح</>
            ) : (
              'حفظ التعديلات'
            )}
          </button>
          <button
            onClick={onClose}
            className="w-full py-3 rounded-2xl text-[13px] font-bold text-[#6b7280] bg-gray-50 border border-gray-200 active:scale-[0.98] transition-transform"
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-bold text-[#4a7a94] mb-1.5 mr-1">{label}</label>
      <div className="flex items-center gap-2 bg-white border-2 border-[#e2edf5] rounded-xl px-3 py-3 focus-within:border-[#0369A1] transition-colors">
        {icon}
        {children}
      </div>
    </div>
  );
}
