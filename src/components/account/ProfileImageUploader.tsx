import { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, Loader } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Props {
  currentImageUrl?: string;
  userPhone: string;
  onImageUpdate: (imageUrl: string | null) => void;
}

export default function ProfileImageUploader({ currentImageUrl, userPhone, onImageUpdate }: Props) {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // التحقق من نوع الملف
    if (!file.type.startsWith('image/')) {
      alert('يرجى اختيار صورة صالحة');
      return;
    }

    // التحقق من حجم الملف (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('حجم الصورة يجب أن يكون أقل من 5 ميجابايت');
      return;
    }

    setUploading(true);

    try {
      // إنشاء اسم فريد للملف
      const fileExt = file.name.split('.').pop();
      const fileName = `${userPhone}_${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      // حذف الصورة القديمة إن وجدت
      if (currentImageUrl) {
        const oldPath = currentImageUrl.split('/').pop();
        if (oldPath) {
          await supabase.storage.from('profile-images').remove([oldPath]);
        }
      }

      // رفع الصورة الجديدة
      const { error: uploadError } = await supabase.storage
        .from('profile-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // الحصول على الرابط العام
      const { data: { publicUrl } } = supabase.storage
        .from('profile-images')
        .getPublicUrl(filePath);

      // تحديث قاعدة البيانات
      const { error: updateError } = await supabase
        .from('platform_users')
        .update({ profile_image_url: publicUrl })
        .eq('phone', userPhone);

      if (updateError) throw updateError;

      setPreviewUrl(publicUrl);
      onImageUpdate(publicUrl);
    } catch (error) {
      console.error('خطأ في رفع الصورة:', error);
      alert('حدث خطأ أثناء رفع الصورة');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = async () => {
    if (!currentImageUrl) return;

    setUploading(true);

    try {
      // حذف الصورة من التخزين
      const oldPath = currentImageUrl.split('/').pop();
      if (oldPath) {
        await supabase.storage.from('profile-images').remove([oldPath]);
      }

      // تحديث قاعدة البيانات
      const { error } = await supabase
        .from('platform_users')
        .update({ profile_image_url: null })
        .eq('phone', userPhone);

      if (error) throw error;

      setPreviewUrl(null);
      onImageUpdate(null);
    } catch (error) {
      console.error('خطأ في حذف الصورة:', error);
      alert('حدث خطأ أثناء حذف الصورة');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="rounded-3xl bg-white p-5 border" style={{ borderColor: '#e5e7eb' }}>
      <div className="flex items-center gap-2 mb-4">
        <ImageIcon className="w-5 h-5 text-[#2563eb]" />
        <h3 className="text-[15px] font-black text-[#1a4a5e]">الصورة الشخصية / الشعار</h3>
      </div>

      <div className="space-y-4">
        {/* معاينة الصورة */}
        <div className="flex items-center justify-center">
          {previewUrl ? (
            <div className="relative">
              <div
                className="w-32 h-32 rounded-2xl overflow-hidden border-2"
                style={{ borderColor: '#e5e7eb' }}
              >
                <img
                  src={previewUrl}
                  alt="الصورة الشخصية"
                  className="w-full h-full object-cover"
                />
              </div>
              {!uploading && (
                <button
                  onClick={handleRemoveImage}
                  className="absolute -top-2 -right-2 w-8 h-8 rounded-xl flex items-center justify-center transition-all active:scale-95"
                  style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)' }}
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              )}
            </div>
          ) : (
            <div
              className="w-32 h-32 rounded-2xl flex items-center justify-center border-2 border-dashed"
              style={{ borderColor: '#cbd5e1', background: '#f8fafc' }}
            >
              <ImageIcon className="w-12 h-12 text-[#94a3b8]" />
            </div>
          )}
        </div>

        {/* زر الرفع */}
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl transition-all active:scale-98 disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}
          >
            {uploading ? (
              <>
                <Loader className="w-5 h-5 text-white animate-spin" />
                <span className="text-[13px] font-bold text-white">جاري الرفع...</span>
              </>
            ) : (
              <>
                <Upload className="w-5 h-5 text-white" />
                <span className="text-[13px] font-bold text-white">
                  {previewUrl ? 'تغيير الصورة' : 'رفع صورة'}
                </span>
              </>
            )}
          </button>
        </div>

        {/* ملاحظات */}
        <div className="text-center space-y-1">
          <p className="text-[11px] text-[#64748b]">الصيغ المدعومة: JPG, PNG, WebP, GIF</p>
          <p className="text-[11px] text-[#64748b]">الحد الأقصى للحجم: 5 ميجابايت</p>
        </div>
      </div>
    </div>
  );
}
