import { AlignLeft } from 'lucide-react';
import ImageUploader from '../ImageUploader';
import { useInventorySettings } from '../../../hooks/useInventorySettings';

interface UploadedImage {
  id?: string;
  url: string;
  preview: string;
  file?: File;
  uploading?: boolean;
  error?: string;
}

interface Props {
  description: string;
  onSetDescription: (v: string) => void;
  images: UploadedImage[];
  onSetImages: (imgs: UploadedImage[] | ((prev: UploadedImage[]) => UploadedImage[])) => void;
  batchId?: string;
  imagesEnabled?: boolean;
  maxImages?: number;
  maxSizeMb?: number;
  allowedFormats?: string[];
}

export default function Step3ImagesDescription({
  description, onSetDescription,
  images, onSetImages,
  batchId,
  imagesEnabled: propImagesEnabled,
  maxImages: propMaxImages,
  maxSizeMb: propMaxSizeMb,
  allowedFormats: propAllowedFormats,
}: Props) {
  const { settings } = useInventorySettings();

  const imagesEnabled = propImagesEnabled ?? true;
  const maxImages = propMaxImages ?? settings?.max_images ?? 5;
  const maxSizeMb = propMaxSizeMb ?? settings?.max_image_size_mb ?? 5;
  const allowedFormats = propAllowedFormats ?? settings?.allowed_formats ?? ['jpg', 'jpeg', 'png', 'webp'];
  const maxDescriptionLength = settings?.max_description_length ?? 300;
  const descriptionRequired = settings?.description_required ?? false;

  const remainingChars = maxDescriptionLength - description.length;
  const isDescriptionValid = !descriptionRequired || (description.trim().length > 0 && description.length <= maxDescriptionLength);

  return (
    <div className="space-y-6" dir="rtl">
      {imagesEnabled && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <ImageUploader
            batchId={batchId}
            maxImages={maxImages}
            maxSizeMb={maxSizeMb}
            allowedFormats={allowedFormats}
            images={images}
            onChange={onSetImages}
          />
        </div>
      )}

      <div>
        <div className="flex items-center gap-2 mb-3">
          <AlignLeft className="w-4 h-4 text-[#1a4a5e]" />
          <h3 className="text-[14px] font-bold text-[#1a4a5e]">
            وصف المخزون
            {descriptionRequired && <span className="text-red-500 mr-1">*</span>}
          </h3>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="bg-[#F5F9FC] border border-[#d0e5f2] rounded-xl px-3 py-2.5 mb-3">
            <p className="text-[11px] text-[#4a7a90] leading-relaxed">
              {descriptionRequired
                ? 'وصف المخزون مطلوب - أضف وصفاً يساعد المشترين على فهم حالة الطبليات'
                : 'أضف وصفاً مختصراً يساعد المشترين على فهم حالة الطبليات ومميزاتها (اختياري)'}
            </p>
          </div>
          <textarea
            value={description}
            onChange={(e) => {
              const newValue = e.target.value;
              if (newValue.length <= maxDescriptionLength) {
                onSetDescription(newValue);
              }
            }}
            placeholder='مثال: "طبليات مستخدمة مرة واحدة – حالة ممتازة"'
            rows={4}
            className={`w-full px-4 py-3 rounded-xl border-2 bg-gray-50 focus:bg-white text-[13px] text-[#1a4a5e] outline-none transition-colors resize-none leading-relaxed ${
              !isDescriptionValid ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-[#1a4a5e]'
            }`}
            maxLength={maxDescriptionLength}
          />
          <div className="flex items-center justify-between mt-1">
            <p className={`text-[10px] ${remainingChars < 50 ? 'text-orange-500' : 'text-gray-400'}`}>
              {remainingChars} حرف متبقي
            </p>
            <p className="text-[10px] text-gray-400">
              {description.length}/{maxDescriptionLength}
            </p>
          </div>
          {!isDescriptionValid && (
            <p className="text-xs text-red-600 mt-2">
              {descriptionRequired && description.trim().length === 0
                ? 'الوصف مطلوب'
                : 'تجاوزت الحد الأقصى للأحرف'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
