import { useState, useRef } from 'react';
import { Camera, X, ImagePlus, AlertCircle, Star } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface UploadedImage {
  id?: string;
  url: string;
  preview: string;
  file?: File;
  uploading?: boolean;
  error?: string;
}

interface Props {
  batchId?: string;
  maxImages?: number;
  maxSizeMb?: number;
  allowedFormats?: string[];
  images: UploadedImage[];
  onChange: (images: UploadedImage[] | ((prev: UploadedImage[]) => UploadedImage[])) => void;
}

export default function ImageUploader({
  batchId,
  maxImages = 5,
  maxSizeMb = 5,
  allowedFormats = ['jpg', 'jpeg', 'png', 'webp'],
  images,
  onChange,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');

  const canAdd = images.length < maxImages;

  const handleFiles = async (files: FileList) => {
    setError('');
    const remaining = maxImages - images.length;
    const toAdd = Array.from(files).slice(0, remaining);

    const validated: { file: File; preview: string }[] = [];
    for (const file of toAdd) {
      const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
      if (!allowedFormats.includes(ext)) {
        setError(`صيغة غير مدعومة: ${ext}. الصيغ المقبولة: ${allowedFormats.join(', ')}`);
        continue;
      }
      if (file.size > maxSizeMb * 1024 * 1024) {
        setError(`حجم الصورة يتجاوز الحد الأقصى (${maxSizeMb}MB)`);
        continue;
      }
      validated.push({ file, preview: URL.createObjectURL(file) });
    }

    if (validated.length === 0) return;

    const newImages: UploadedImage[] = validated.map(v => ({
      url: v.preview,
      preview: v.preview,
      file: v.file,
      uploading: !!batchId,
    }));

    const combined = [...images, ...newImages];
    onChange(combined);

    if (!batchId) return;

    for (let i = 0; i < newImages.length; i++) {
      const img = newImages[i];
      if (!img.file) continue;

      const safeName = img.file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `inventory/${batchId}/${Date.now()}_${i}_${safeName}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('inventory-images')
        .upload(path, img.file, {
          cacheControl: '3600',
          upsert: true,
          contentType: img.file.type || 'image/jpeg',
        });

      if (uploadError) {
        onChange(prev => prev.map(p => p.preview === img.preview ? { ...p, error: 'فشل رفع الصورة', uploading: false } : p));
        continue;
      }

      const { data: urlData } = supabase.storage.from('inventory-images').getPublicUrl(uploadData.path);
      const publicUrl = urlData.publicUrl;
      const globalIdx = images.length + i;

      const { data: dbRow } = await supabase
        .from('inventory_images')
        .insert({
          batch_id: batchId,
          storage_path: uploadData.path,
          url: publicUrl,
          is_primary: globalIdx === 0,
          sort_order: globalIdx,
        })
        .select('id')
        .maybeSingle();

      onChange(prev => prev.map(p =>
        p.preview === img.preview
          ? { ...p, id: dbRow?.id, url: publicUrl, uploading: false }
          : p
      ));
    }
  };

  const removeImage = async (idx: number) => {
    const img = images[idx];
    if (img.id) {
      await supabase.from('inventory_images').delete().eq('id', img.id);
    }
    const next = images.filter((_, i) => i !== idx);
    onChange(next);
  };

  const setPrimary = async (idx: number) => {
    if (batchId) {
      await supabase.from('inventory_images').update({ is_primary: false }).eq('batch_id', batchId);
      if (images[idx].id) {
        await supabase.from('inventory_images').update({ is_primary: true }).eq('id', images[idx].id);
      }
    }
    onChange(images.map((img, i) => ({ ...img, is_primary: i === idx })));
  };

  return (
    <div className="space-y-3" dir="rtl">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-[#7a9aab]">{images.length}/{maxImages} صور</span>
        <span className="text-[12px] font-bold text-[#1a3a4a]">صور المخزون</span>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
          <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
          <span className="text-[11px] text-red-600">{error}</span>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        {images.map((img, idx) => (
          <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-gray-200">
            <img
              src={img.preview || img.url}
              alt={`صورة ${idx + 1}`}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            {img.uploading && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            {!img.uploading && (
              <>
                <button
                  onClick={() => removeImage(idx)}
                  className="absolute top-1 left-1 w-5 h-5 bg-black/50 rounded-full flex items-center justify-center"
                >
                  <X className="w-3 h-3 text-white" />
                </button>
                {idx === 0 && (
                  <div className="absolute bottom-1 right-1 flex items-center gap-0.5 bg-amber-500 rounded-full px-1.5 py-0.5">
                    <Star className="w-2.5 h-2.5 text-white" fill="white" />
                    <span className="text-[8px] font-bold text-white">رئيسية</span>
                  </div>
                )}
              </>
            )}
          </div>
        ))}

        {canAdd && (
          <button
            onClick={() => inputRef.current?.click()}
            className="aspect-square rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 flex flex-col items-center justify-center gap-1 hover:border-[#1a4a5e] hover:bg-[#f0f6fa] transition-colors active:scale-95"
          >
            <ImagePlus className="w-5 h-5 text-gray-400" />
            <span className="text-[9px] font-semibold text-gray-400">إضافة صورة</span>
          </button>
        )}
      </div>

      <p className="text-[10px] text-gray-400">
        الصورة الأولى تُعرض كصورة رئيسية في قائمة العروض
      </p>

      <input
        ref={inputRef}
        type="file"
        accept={allowedFormats.map(f => `.${f}`).join(',')}
        multiple
        className="hidden"
        onChange={e => e.target.files && handleFiles(e.target.files)}
      />
    </div>
  );
}
