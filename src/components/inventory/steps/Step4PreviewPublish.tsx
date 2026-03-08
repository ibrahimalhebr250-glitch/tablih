import { MapPin, Package, Layers, CheckCircle, Wrench, Image as ImageIcon, DollarSign, Store, Cloud } from 'lucide-react';
import type { InventoryFormData, PalletQuality } from '../../../types/inventory';
import { QUALITY_LABELS, CONDITION_LABELS } from '../../../types/inventory';

interface UploadedImage {
  url: string;
  preview: string;
}

interface Props {
  form: InventoryFormData;
  images: UploadedImage[];
  approvalMode: 'auto_publish' | 'require_approval';
  publishToMarket: boolean;
  onPublishToMarketChange: (value: boolean) => void;
}

const QUALITY_STYLE: Record<string, { text: string; bg: string; border: string }> = {
  A: { text: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
  B: { text: '#1D4ED8', bg: '#EFF6FF', border: '#BFDBFE' },
  C: { text: '#B45309', bg: '#FFFBEB', border: '#FDE68A' },
  Scrap: { text: '#6B7280', bg: '#F3F4F6', border: '#E5E7EB' },
};

export default function Step4PreviewPublish({ form, images, approvalMode, publishToMarket, onPublishToMarketChange }: Props) {
  const qs = QUALITY_STYLE[form.quality ?? 'B'];
  const qualityLabel = form.quality ? QUALITY_LABELS[form.quality as PalletQuality] : null;
  const conditionLabel = CONDITION_LABELS[form.condition];
  const primaryImage = images[0]?.preview || images[0]?.url;

  return (
    <div className="space-y-5" dir="rtl">
      <div className="bg-[#F5F9FC] border border-[#d0e5f2] rounded-xl px-3.5 py-3">
        <p className="text-[12px] text-[#2c5f7c] font-semibold text-center">
          {publishToMarket ? 'هذا ما سيراه المشترون في السوق' : 'معاينة المخزون'}
        </p>
      </div>

      {/* خيارات النشر */}
      <div className="space-y-3">
        <p className="text-[13px] font-bold text-[#1a3a4a] text-center">
          هل ترغب بنشر هذا المخزون في السوق؟
        </p>

        <div className="grid grid-cols-1 gap-3">
          <button
            onClick={() => onPublishToMarketChange(true)}
            className={`relative rounded-2xl p-4 transition-all ${
              publishToMarket
                ? 'bg-gradient-to-br from-[#1a4a5e] to-[#2c6f8a] text-white shadow-lg shadow-[#1a4a5e]/20'
                : 'bg-white border-2 border-gray-200 text-gray-600 hover:border-[#1a4a5e]/30'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                publishToMarket ? 'bg-white/20' : 'bg-[#1a4a5e]/10'
              }`}>
                <Store className={`w-5 h-5 ${publishToMarket ? 'text-white' : 'text-[#1a4a5e]'}`} />
              </div>
              <div className="flex-1 text-right">
                <h4 className={`text-[14px] font-bold mb-1 ${publishToMarket ? 'text-white' : 'text-[#1a3a4a]'}`}>
                  نشر المخزون في السوق
                </h4>
                <p className={`text-[11px] leading-relaxed ${publishToMarket ? 'text-white/80' : 'text-gray-500'}`}>
                  سيظهر مخزونك للمشترين فوراً ويمكنهم إنشاء صفقات معك
                </p>
              </div>
              {publishToMarket && (
                <div className="absolute top-3 left-3">
                  <CheckCircle className="w-5 h-5 text-white" fill="white" />
                </div>
              )}
            </div>
          </button>

          <button
            onClick={() => onPublishToMarketChange(false)}
            className={`relative rounded-2xl p-4 transition-all ${
              !publishToMarket
                ? 'bg-gradient-to-br from-[#0369a1] to-[#0284c7] text-white shadow-lg shadow-[#0369a1]/20'
                : 'bg-white border-2 border-gray-200 text-gray-600 hover:border-[#0369a1]/30'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                !publishToMarket ? 'bg-white/20' : 'bg-[#0369a1]/10'
              }`}>
                <Cloud className={`w-5 h-5 ${!publishToMarket ? 'text-white' : 'text-[#0369a1]'}`} />
              </div>
              <div className="flex-1 text-right">
                <h4 className={`text-[14px] font-bold mb-1 ${!publishToMarket ? 'text-white' : 'text-[#1a3a4a]'}`}>
                  حفظ في المستودع السحابي
                </h4>
                <p className={`text-[11px] leading-relaxed ${!publishToMarket ? 'text-white/80' : 'text-gray-500'}`}>
                  سيتم حفظ المخزون ويمكنك نشره لاحقاً من حسابي → مستودعي السحابي
                </p>
              </div>
              {!publishToMarket && (
                <div className="absolute top-3 left-3">
                  <CheckCircle className="w-5 h-5 text-white" fill="white" />
                </div>
              )}
            </div>
          </button>
        </div>
      </div>

      <div
        className="bg-white rounded-2xl overflow-hidden"
        style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)' }}
      >
        {primaryImage ? (
          <div className="relative aspect-[16/9] bg-gray-100">
            <img
              src={primaryImage}
              alt="صورة المخزون"
              className="w-full h-full object-cover"
            />
            {images.length > 1 && (
              <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/40 rounded-lg px-2 py-1">
                <ImageIcon className="w-3 h-3 text-white" />
                <span className="text-[10px] font-bold text-white">{images.length}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="aspect-[16/9] bg-gradient-to-b from-[#f0f6fa] to-[#e4eef6] flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <span className="text-4xl">{form.palletType === 'خشبية' ? '🪵' : '🔵'}</span>
              <span className="text-[11px] text-[#a0b5c0]">لا توجد صور</span>
            </div>
          </div>
        )}

        <div className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <div
                className="px-2 py-1 rounded-lg border text-[10px] font-bold"
                style={{ background: '#E3F2FD', borderColor: '#BBDEFB', color: '#1565C0' }}
              >
                عرض مورّد
              </div>
            </div>
            <div>
              <h3 className="text-[16px] font-bold text-[#1a3a4a] leading-tight">{form.palletType}</h3>
              <div className="flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3 text-[#1565C0]" />
                <span className="text-[12px] font-semibold text-[#1565C0]">{form.city}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap mb-3">
            <div className="flex items-center gap-1.5 bg-gray-50 px-2.5 py-1.5 rounded-lg border border-gray-100">
              <Package className="w-3 h-3 text-[#7a9aab]" />
              <span className="text-[12px] font-bold text-[#1a3a4a]">{form.quantity.toLocaleString()}</span>
              <span className="text-[9px] text-gray-400">طبلية</span>
            </div>
            <div className="px-2.5 py-1.5 rounded-lg bg-gray-50 border border-gray-100">
              <span className="text-[11px] font-semibold text-[#4a6a7a]" dir="ltr">{form.size}</span>
            </div>
            <div
              className="px-2.5 py-1.5 rounded-lg border"
              style={{ background: qs.bg, borderColor: qs.border }}
            >
              <span className="text-[10px] font-bold" style={{ color: qs.text }}>
                {qualityLabel ? qualityLabel.ar : form.quality}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap mb-3">
            <div className="flex items-center gap-1.5 bg-gray-50 px-2.5 py-1.5 rounded-lg border border-gray-100">
              <Wrench className="w-3 h-3 text-[#7a9aab]" />
              <span className="text-[11px] font-semibold text-[#4a6a7a]">{conditionLabel.ar}</span>
            </div>
            {form.pricePerPallet > 0 && (
              <div className="flex items-center gap-1.5 bg-[#ECFDF5] px-2.5 py-1.5 rounded-lg border border-[#A7F3D0]">
                <DollarSign className="w-3 h-3 text-[#059669]" />
                <span className="text-[11px] font-bold text-[#059669]">{form.pricePerPallet} ريال/طبلية</span>
              </div>
            )}
          </div>

          {form.description && (
            <p className="text-[12px] text-[#4a6a7a] leading-relaxed border-t border-gray-100 pt-3 mt-2">
              {form.description}
            </p>
          )}
        </div>
      </div>

      {approvalMode === 'require_approval' && (
        <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-xl px-4 py-3 flex items-start gap-2">
          <span className="text-amber-500 text-[14px] flex-shrink-0 mt-0.5">!</span>
          <p className="text-[11px] text-[#92400E] leading-relaxed">
            وضع الموافقة الإدارية مفعّل. سيظهر مخزونك في السوق بعد مراجعته من الإدارة.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl border border-gray-100 p-3 text-center">
          <Layers className="w-4 h-4 mx-auto mb-1 text-[#7a9aab]" />
          <p className="text-[10px] text-[#a0b5c0] mb-0.5">المقاس</p>
          <p className="text-[14px] font-bold text-[#1a4a5e]" dir="ltr">{form.size}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-3 text-center">
          <CheckCircle className="w-4 h-4 mx-auto mb-1" style={{ color: qs.text }} />
          <p className="text-[10px] text-[#a0b5c0] mb-0.5">الجودة</p>
          <p className="text-[14px] font-bold" style={{ color: qs.text }}>{form.quality}</p>
        </div>
      </div>
    </div>
  );
}
