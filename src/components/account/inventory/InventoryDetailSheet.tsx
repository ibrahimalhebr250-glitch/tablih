import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, Package, MapPin, Eye, EyeOff, Clock, Store, Ban, Trash2, Plus, Minus, X, ChevronLeft, ChevronRight, ImagePlus, Calendar, Layers, Ruler, Shield, Wrench, DollarSign, FileText, CreditCard as Edit3 } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import type { MyInventoryItem } from '../../../hooks/useMyInventory';

const QUALITY_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  A: { label: 'ممتازة - Grade A', color: '#059669', bg: '#ECFDF5' },
  B: { label: 'جيدة - Grade B', color: '#0369a1', bg: '#EFF6FF' },
  C: { label: 'مقبولة - Grade C', color: '#b45309', bg: '#FFFBEB' },
  Scrap: { label: 'خردة - Scrap', color: '#6b7280', bg: '#F3F4F6' },
};

const CONDITION_LABELS: Record<string, string> = {
  new: 'جديدة',
  used: 'مستعملة',
  repairable: 'قابلة للإصلاح',
};

function getDisplayStatus(item: MyInventoryItem) {
  if (item.status === 'reserved' || item.status === 'pending_supplier') {
    return { label: 'قيد الصفقة', color: '#d97706', bg: '#FFFBEB', icon: Clock };
  }
  if (item.status === 'active' && item.publish_to_market) {
    return { label: 'منشور في السوق', color: '#059669', bg: '#ECFDF5', icon: Eye };
  }
  return { label: 'غير منشور', color: '#6b7280', bg: '#F3F4F6', icon: EyeOff };
}

interface Props {
  item: MyInventoryItem;
  onClose: () => void;
  onPublish: (id: string) => void;
  onUnpublish: (id: string) => void;
  onUpdateQuantity: (id: string, qty: number) => void;
  onDelete: (id: string) => void;
  onRefresh: () => void;
  isActioning: boolean;
}

export default function InventoryDetailSheet({
  item,
  onClose,
  onPublish,
  onUnpublish,
  onUpdateQuantity,
  onDelete,
  onRefresh,
  isActioning,
}: Props) {
  const [imgIndex, setImgIndex] = useState(0);
  const [images, setImages] = useState<string[]>(item.image_urls);
  const [showQtyEditor, setShowQtyEditor] = useState(false);
  const [editQty, setEditQty] = useState(item.available_quantity);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEditData, setShowEditData] = useState(false);
  const [editDesc, setEditDesc] = useState(item.description);
  const [editPrice, setEditPrice] = useState(item.price_per_pallet);
  const [savingEdit, setSavingEdit] = useState(false);
  const [uploading, setUploading] = useState(false);
  const imgInputRef = useRef<HTMLInputElement>(null);
  const editDataRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showEditData) {
      setTimeout(() => editDataRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
    }
  }, [showEditData]);

  const status = getDisplayStatus(item);
  const StatusIcon = status.icon;
  const quality = QUALITY_STYLE[item.quality] || QUALITY_STYLE.B;
  const condition = CONDITION_LABELS[item.pallet_condition] || item.pallet_condition;
  const isInDeal = item.status === 'reserved' || item.status === 'pending_supplier';
  const hasImages = images.length > 0;

  const goNext = () => setImgIndex((i) => (i + 1) % images.length);
  const goPrev = () => setImgIndex((i) => (i - 1 + images.length) % images.length);

  const handleUploadImage = async (file: File) => {
    setUploading(true);
    const path = `inventory/${item.id}/${Date.now()}_${file.name}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('inventory-images')
      .upload(path, file, { upsert: true });

    if (uploadError || !uploadData) {
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from('inventory-images').getPublicUrl(uploadData.path);
    const isPrimary = images.length === 0;

    await supabase
      .from('inventory_images')
      .insert({
        batch_id: item.id,
        storage_path: uploadData.path,
        url: urlData.publicUrl,
        is_primary: isPrimary,
        sort_order: images.length,
      });

    setImages(prev => [...prev, urlData.publicUrl]);
    setUploading(false);
    onRefresh();
  };

  const handleQtySave = () => {
    if (editQty > 0 && editQty !== item.available_quantity) {
      onUpdateQuantity(item.id, editQty);
    }
    setShowQtyEditor(false);
  };

  const handleEditSave = async () => {
    setSavingEdit(true);
    await supabase
      .from('inventory_batches')
      .update({ description: editDesc, price_per_pallet: editPrice })
      .eq('id', item.id);
    setSavingEdit(false);
    setShowEditData(false);
    onRefresh();
  };

  const createdDate = new Date(item.created_at).toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex flex-col"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
    >
      <div
        className="flex-1 flex flex-col mt-auto lg:mt-0 lg:mx-auto lg:my-auto lg:max-w-[560px] lg:max-h-[92vh] lg:rounded-3xl overflow-hidden"
        style={{ background: '#f8fafb', maxHeight: '100vh' }}
      >
        {hasImages ? (
          <div className="relative flex-shrink-0" style={{ aspectRatio: '16/10', background: '#0f1a24' }}>
            <img
              src={images[imgIndex]}
              alt=""
              className="w-full h-full object-cover"
            />

            <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-3 z-10">
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-xl flex items-center justify-center active:scale-95 transition-transform"
                style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(8px)' }}
              >
                <ArrowRight className="w-5 h-5 text-white" />
              </button>
              <div
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                style={{ background: status.bg, border: `1px solid ${status.color}30` }}
              >
                <StatusIcon className="w-3.5 h-3.5" style={{ color: status.color }} />
                <span className="text-[11px] font-bold" style={{ color: status.color }}>{status.label}</span>
              </div>
            </div>

            {images.length > 1 && (
              <>
                <button
                  onClick={goPrev}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center z-10 active:scale-90 transition-transform"
                  style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)' }}
                >
                  <ChevronRight className="w-4 h-4 text-white" />
                </button>
                <button
                  onClick={goNext}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center z-10 active:scale-90 transition-transform"
                  style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)' }}
                >
                  <ChevronLeft className="w-4 h-4 text-white" />
                </button>

                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                  {images.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setImgIndex(i)}
                      className="rounded-full transition-all duration-300"
                      style={{
                        width: i === imgIndex ? 18 : 6,
                        height: 6,
                        background: i === imgIndex ? '#ffffff' : 'rgba(255,255,255,0.4)',
                      }}
                    />
                  ))}
                </div>
              </>
            )}

            {images.length < 5 && (
              <button
                onClick={() => imgInputRef.current?.click()}
                disabled={uploading}
                className="absolute bottom-3 right-3 flex items-center gap-1 px-2.5 py-1.5 rounded-lg z-10 active:scale-95 transition-transform"
                style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)' }}
              >
                {uploading ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <ImagePlus className="w-3.5 h-3.5 text-white" />
                )}
                <span className="text-[10px] font-bold text-white">إضافة صورة</span>
              </button>
            )}
          </div>
        ) : (
          <div className="relative flex-shrink-0">
            <div
              className="w-full flex flex-col items-center justify-center gap-3"
              style={{ aspectRatio: '16/10', background: 'linear-gradient(135deg, #e8eff5 0%, #d8e4ed 100%)' }}
            >
              <Package className="w-14 h-14 text-[#a0bfcf]" />
              <button
                onClick={() => imgInputRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-bold text-white active:scale-95 transition-transform"
                style={{ background: 'linear-gradient(135deg, #1a4a5e, #2c6f8a)' }}
              >
                {uploading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <ImagePlus className="w-4 h-4" />
                )}
                إضافة صور
              </button>
            </div>
            <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-3">
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-xl bg-white/80 backdrop-blur-sm flex items-center justify-center active:scale-95 transition-transform"
              >
                <ArrowRight className="w-5 h-5 text-[#1a4a5e]" />
              </button>
              <div
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                style={{ background: status.bg, border: `1px solid ${status.color}30` }}
              >
                <StatusIcon className="w-3.5 h-3.5" style={{ color: status.color }} />
                <span className="text-[11px] font-bold" style={{ color: status.color }}>{status.label}</span>
              </div>
            </div>
          </div>
        )}

        {hasImages && images.length > 1 && (
          <div className="flex gap-2 px-4 py-2.5 bg-white border-b border-gray-100 overflow-x-auto flex-shrink-0">
            {images.map((url, i) => (
              <button
                key={i}
                onClick={() => setImgIndex(i)}
                className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden transition-all"
                style={{
                  border: i === imgIndex ? '2px solid #1a4a5e' : '2px solid transparent',
                  opacity: i === imgIndex ? 1 : 0.5,
                }}
              >
                <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
              </button>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-y-auto" dir="rtl">
          <div className="px-5 pt-4 pb-2">
            <h2 className="text-[20px] font-black text-[#1a3a4a] mb-1">{item.pallet_type}</h2>
            <div className="flex items-center gap-2 text-[11px] text-[#7a9aab]">
              <Calendar className="w-3.5 h-3.5" />
              <span>{createdDate}</span>
              <span className="text-gray-300">|</span>
              <span dir="ltr" className="text-[10px]">{item.batch_id}</span>
            </div>
          </div>

          <div className="px-5 py-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl p-3.5" style={{ background: '#f0f9f4', border: '1px solid rgba(5,150,105,0.1)' }}>
                <div className="flex items-center gap-1.5 mb-1">
                  <Package className="w-3.5 h-3.5 text-[#059669]/50" />
                  <span className="text-[10px] text-[#059669]/60">الكمية المتاحة</span>
                </div>
                <span className="text-[24px] font-black text-[#059669]">
                  {(item.available_quantity || 0).toLocaleString('ar-SA')}
                </span>
                <p className="text-[10px] text-[#059669]/50 mt-0.5">طبلية</p>
              </div>

              <div className="rounded-2xl p-3.5" style={{ background: '#f0f9f4', border: '1px solid rgba(5,150,105,0.1)' }}>
                <div className="flex items-center gap-1.5 mb-1">
                  <DollarSign className="w-3.5 h-3.5 text-[#059669]/50" />
                  <span className="text-[10px] text-[#059669]/60">السعر</span>
                </div>
                {item.price_per_pallet > 0 ? (
                  <>
                    <span className="text-[24px] font-black text-[#059669]">
                      {item.price_per_pallet.toLocaleString('ar-SA')}
                    </span>
                    <p className="text-[10px] text-[#059669]/50 mt-0.5">ر.س / طبلية</p>
                  </>
                ) : (
                  <p className="text-[14px] font-semibold text-[#a0b5c0] mt-2">غير محدد</p>
                )}
              </div>
            </div>
          </div>

          <div className="px-5 py-2">
            <div
              className="rounded-2xl overflow-hidden"
              style={{ background: 'white', border: '1px solid rgba(0,0,0,0.06)' }}
            >
              <DetailRow icon={Layers} label="النوع" value={item.pallet_type} />
              <DetailRow icon={Ruler} label="المقاس" value={item.size} />
              <DetailRow icon={Shield} label="الجودة" value={quality.label} valueColor={quality.color} />
              <DetailRow icon={Wrench} label="الحالة" value={condition} />
              <DetailRow icon={MapPin} label="المدينة" value={item.city} valueColor="#1565C0" />
              <DetailRow icon={Package} label="الكمية الكلية" value={`${item.quantity.toLocaleString('ar-SA')} طبلية`} isLast />
            </div>
          </div>

          {item.description && (
            <div className="px-5 py-2">
              <div
                className="rounded-2xl p-4"
                style={{ background: 'white', border: '1px solid rgba(0,0,0,0.06)' }}
              >
                <div className="flex items-center gap-1.5 mb-2">
                  <FileText className="w-3.5 h-3.5 text-[#7a9aab]" />
                  <span className="text-[11px] font-bold text-[#5a7a8a]">الوصف</span>
                </div>
                <p className="text-[13px] text-[#3a5a6a] leading-relaxed">{item.description}</p>
              </div>
            </div>
          )}

          {showEditData && (
            <div ref={editDataRef} className="px-5 py-3">
              <div className="bg-white rounded-2xl p-4 border border-gray-100">
                <p className="text-[12px] font-bold text-[#1a4a5e] mb-3 text-right">تعديل بيانات المخزون</p>
                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-bold text-[#5a7a8a] mb-1 block text-right">السعر لكل طبلية (ر.س)</label>
                    <input
                      type="number"
                      value={editPrice}
                      onChange={(e) => setEditPrice(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-[14px] font-bold text-[#1a4a5e] text-right outline-none focus:border-[#1a4a5e] transition-colors"
                      placeholder="0"
                      min={0}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-[#5a7a8a] mb-1 block text-right">الوصف</label>
                    <textarea
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-[13px] text-[#1a4a5e] text-right outline-none resize-none focus:border-[#1a4a5e] transition-colors"
                      placeholder="اكتب وصفاً للمخزون..."
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleEditSave}
                      disabled={savingEdit}
                      className="flex-1 py-2.5 rounded-xl bg-[#059669] text-white text-[13px] font-bold active:scale-95 transition-transform"
                    >
                      {savingEdit ? 'جاري الحفظ...' : 'حفظ التعديلات'}
                    </button>
                    <button
                      onClick={() => { setShowEditData(false); setEditDesc(item.description); setEditPrice(item.price_per_pallet); }}
                      className="px-4 py-2.5 rounded-xl bg-gray-100 text-gray-500 text-[13px] font-bold active:scale-95 transition-transform"
                    >
                      إلغاء
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {showQtyEditor && (
            <div className="px-5 py-3">
              <div className="bg-white rounded-2xl p-4 border border-gray-100">
                <p className="text-[12px] font-bold text-[#1a4a5e] mb-3 text-right">تعديل الكمية المتاحة</p>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 flex-1 bg-gray-50 rounded-xl border border-gray-200 px-2">
                    <button
                      onClick={() => setEditQty(Math.max(1, editQty - 100))}
                      className="w-10 h-10 flex items-center justify-center text-[#1a4a5e]"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <input
                      type="number"
                      value={editQty}
                      onChange={(e) => setEditQty(Math.max(1, parseInt(e.target.value, 10) || 0))}
                      className="flex-1 text-center py-2.5 text-[16px] font-bold text-[#1a4a5e] bg-transparent outline-none"
                      min={1}
                      autoFocus
                    />
                    <button
                      onClick={() => setEditQty(editQty + 100)}
                      className="w-10 h-10 flex items-center justify-center text-[#1a4a5e]"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <button
                    onClick={handleQtySave}
                    disabled={isActioning}
                    className="h-10 px-4 rounded-xl bg-[#059669] text-white text-[12px] font-bold active:scale-95 transition-transform"
                  >
                    حفظ
                  </button>
                  <button
                    onClick={() => setShowQtyEditor(false)}
                    className="h-10 px-3 rounded-xl bg-gray-100 text-gray-500 active:scale-95 transition-transform"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {showDeleteConfirm && (
            <div className="px-5 py-3">
              <div className="bg-red-50 rounded-2xl p-4 border border-red-100">
                <p className="text-[13px] font-bold text-red-700 mb-3 text-right">
                  هل أنت متأكد من حذف هذا المخزون؟
                </p>
                <p className="text-[11px] text-red-500/80 mb-3 text-right">
                  سيتم حذف المخزون نهائياً ولا يمكن التراجع عن هذا الإجراء.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => { onDelete(item.id); onClose(); }}
                    disabled={isActioning}
                    className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-[13px] font-bold active:scale-95 transition-transform"
                  >
                    نعم، حذف نهائياً
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 py-2.5 rounded-xl bg-white text-gray-600 text-[13px] font-bold border border-gray-200 active:scale-95 transition-transform"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="h-4" />
        </div>

        {!showDeleteConfirm && !showQtyEditor && !showEditData && (
          <div
            className="flex-shrink-0 px-4 pb-5 pt-3 border-t border-gray-100"
            style={{ background: 'linear-gradient(to top, #ffffff 0%, #f8fafb 100%)' }}
            dir="rtl"
          >
            {!isInDeal ? (
              <>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  {item.status === 'active' && item.publish_to_market ? (
                    <button
                      onClick={() => onUnpublish(item.id)}
                      disabled={isActioning}
                      className="flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-bold active:scale-[0.98] transition-transform"
                      style={{ background: '#FFFBEB', color: '#b45309', border: '1px solid #FDE68A' }}
                    >
                      <Ban className="w-4 h-4" />
                      إيقاف النشر
                    </button>
                  ) : (
                    <button
                      onClick={() => onPublish(item.id)}
                      disabled={isActioning}
                      className="flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-bold text-white active:scale-[0.98] transition-transform"
                      style={{ background: 'linear-gradient(135deg, #059669, #047857)', boxShadow: '0 4px 12px rgba(5,150,105,0.25)' }}
                    >
                      <Store className="w-4 h-4" />
                      نشر في السوق
                    </button>
                  )}
                  <button
                    onClick={() => { setEditQty(item.available_quantity); setShowQtyEditor(true); }}
                    className="flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-bold active:scale-[0.98] transition-transform"
                    style={{ background: '#EFF6FF', color: '#0369a1', border: '1px solid #BFDBFE' }}
                  >
                    <Plus className="w-4 h-4" />
                    تعديل الكمية
                  </button>
                </div>
                <div className="mb-2">
                  <button
                    onClick={() => { setEditDesc(item.description); setEditPrice(item.price_per_pallet); setShowEditData(true); }}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-bold active:scale-[0.98] transition-transform"
                    style={{ background: 'white', color: '#1a4a5e', border: '1px solid #d8e8f0' }}
                  >
                    <Edit3 className="w-4 h-4" />
                    تعديل بيانات المخزون
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center gap-2 py-3 rounded-xl mb-2 text-[12px] font-bold text-amber-700" style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
                <Clock className="w-4 h-4" />
                هذا المخزون قيد الصفقة ولا يمكن تعديله حالياً
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={onClose}
                className="flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-bold active:scale-[0.98] transition-transform"
                style={{
                  background: 'linear-gradient(135deg, #1a4a5e, #2c6f8a)',
                  color: 'white',
                  boxShadow: '0 4px 12px rgba(26,74,94,0.25)',
                }}
              >
                <ArrowRight className="w-4 h-4" />
                رجوع
              </button>
              {!isInDeal && (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-bold text-red-500 active:scale-[0.98] transition-transform"
                  style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}
                >
                  <Trash2 className="w-4 h-4" />
                  حذف المخزون
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <input
        ref={imgInputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleUploadImage(file);
          e.target.value = '';
        }}
      />
    </div>,
    document.body
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
  valueColor,
  isLast,
}: {
  icon: typeof Package;
  label: string;
  value: string;
  valueColor?: string;
  isLast?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between px-4 py-3 ${!isLast ? 'border-b border-gray-50' : ''}`}
      dir="rtl"
    >
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-[#a0bfcf]" />
        <span className="text-[12px] text-[#7a9aab]">{label}</span>
      </div>
      <span
        className="text-[13px] font-bold"
        style={{ color: valueColor || '#1a3a4a' }}
      >
        {value}
      </span>
    </div>
  );
}
