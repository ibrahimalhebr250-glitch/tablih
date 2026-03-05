import { AlignLeft } from 'lucide-react';
import ImageUploader from '../ImageUploader';

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
  imagesEnabled: boolean;
  maxImages: number;
  maxSizeMb: number;
  allowedFormats: string[];
}

export default function Step3ImagesDescription({
  description, onSetDescription,
  images, onSetImages,
  batchId, imagesEnabled,
  maxImages, maxSizeMb, allowedFormats,
}: Props) {
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
          <h3 className="text-[14px] font-bold text-[#1a4a5e]">وصف المخزون</h3>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="bg-[#F5F9FC] border border-[#d0e5f2] rounded-xl px-3 py-2.5 mb-3">
            <p className="text-[11px] text-[#4a7a90] leading-relaxed">
              أضف وصفاً مختصراً يساعد المشترين على فهم حالة الطبليات ومميزاتها
            </p>
          </div>
          <textarea
            value={description}
            onChange={(e) => onSetDescription(e.target.value)}
            placeholder='مثال: "طبليات مستخدمة مرة واحدة – حالة ممتازة"'
            rows={4}
            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-gray-50 focus:border-[#1a4a5e] focus:bg-white text-[13px] text-[#1a4a5e] outline-none transition-colors resize-none leading-relaxed"
            maxLength={300}
          />
          <p className="text-[10px] text-gray-400 text-left mt-1">{description.length}/300</p>
        </div>
      </div>
    </div>
  );
}
