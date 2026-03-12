import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ArrowRight, Plus, Package, MapPin, CreditCard as Edit3, Pause, Play, Trash2,
  RefreshCw, Wrench, DollarSign, Image as ImageIcon, X, ImagePlus,
  ChevronLeft, ChevronRight, Star, AlertTriangle, Check, Pencil
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { InventoryListing, BatchStatus } from '../../types/inventory';
import { CONDITION_LABELS, QUALITY_LABELS } from '../../types/inventory';
import type { PalletCondition, PalletQuality } from '../../types/inventory';

interface Props {
  phone: string;
  onClose: () => void;
  onAddInventory: () => void;
}

interface BatchImage {
  id: string;
  url: string;
  storage_path: string;
  is_primary: boolean;
  sort_order: number;
}

interface EditForm {
  pallet_type: string;
  size: string;
  quality: string;
  pallet_condition: string;
  quantity: number;
  price_per_pallet: number;
  city: string;
  description: string;
}

const STATUS_CONFIG: Record<BatchStatus, { label: string; color: string; bg: string; border: string }> = {
  active: { label: 'نشط', color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
  reserved: { label: 'محجوز', color: '#1D4ED8', bg: '#EFF6FF', border: '#BFDBFE' },
  sold: { label: 'مُباع', color: '#6B7280', bg: '#F3F4F6', border: '#E5E7EB' },
  draft: { label: 'مسودة', color: '#B45309', bg: '#FFFBEB', border: '#FDE68A' },
  paused: { label: 'متوقف', color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
};

const QUALITY_STYLE: Record<string, { text: string; bg: string; border: string }> = {
  A: { text: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
  B: { text: '#1D4ED8', bg: '#EFF6FF', border: '#BFDBFE' },
  C: { text: '#B45309', bg: '#FFFBEB', border: '#FDE68A' },
  Scrap: { text: '#6B7280', bg: '#F3F4F6', border: '#E5E7EB' },
};

const PALLET_TYPES = ['خشبية', 'بلاستيكية'];
const PALLET_SIZES = ['120×100', '110×110', '120×80', '80×60', 'أخرى'];
const QUALITIES: { value: string; label: string }[] = [
  { value: 'A', label: 'A - ممتازة' },
  { value: 'B', label: 'B - جيدة' },
  { value: 'C', label: 'C - خفيفة' },
  { value: 'Scrap', label: 'خردة' },
];
const CONDITIONS: { value: string; label: string }[] = [
  { value: 'new', label: 'جديدة' },
  { value: 'used', label: 'مستعملة' },
  { value: 'repairable', label: 'قابلة للإصلاح' },
];

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-slate-600">{label}</span>
      <span className="text-sm font-medium text-slate-900">{value}</span>
    </div>
  );
}

export default function SupplierInventory({ phone, onClose, onAddInventory }: Props) {
  const [listings, setListings] = useState<InventoryListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | BatchStatus>('all');
  const [imageManager, setImageManager] = useState<{ batchId: string; images: BatchImage[] } | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [activeGalleryIdx, setActiveGalleryIdx] = useState(0);
  const imgInputRef = useRef<HTMLInputElement>(null);

  const [editingListing, setEditingListing] = useState<InventoryListing | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editSuccess, setEditSuccess] = useState(false);

  const [deleteConfirm, setDeleteConfirm] = useState<InventoryListing | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchListings = useCallback(async () => {
    setLoading(true);
    const normalizedPhone = phone.startsWith('0') ? phone : `0${phone}`;
    const { data: batches } = await supabase
      .from('inventory_batches')
      .select('id, batch_id, pallet_type, size, quality, pallet_condition, quantity, available_quantity, price_per_pallet, city, status, description, created_at')
      .eq('phone', normalizedPhone)
      .order('created_at', { ascending: false });

    if (!batches || batches.length === 0) {
      setListings([]);
      setLoading(false);
      return;
    }

    const batchIds = batches.map((b: any) => b.id);
    const { data: images } = await supabase
      .from('inventory_images')
      .select('batch_id, url, is_primary, sort_order')
      .in('batch_id', batchIds)
      .order('sort_order', { ascending: true });

    const imagesByBatch: Record<string, string[]> = {};
    const sortedImages = [...(images ?? [])].sort((a: any, b: any) => {
      if (a.is_primary && !b.is_primary) return -1;
      if (!a.is_primary && b.is_primary) return 1;
      return (a.sort_order ?? 0) - (b.sort_order ?? 0);
    });
    for (const img of sortedImages as any[]) {
      if (!imagesByBatch[img.batch_id]) imagesByBatch[img.batch_id] = [];
      imagesByBatch[img.batch_id].push(img.url);
    }

    const mapped: InventoryListing[] = (batches as any[]).map((b) => ({
      id: b.id,
      batch_id: b.batch_id,
      pallet_type: b.pallet_type,
      size: b.size,
      quality: b.quality,
      pallet_condition: b.pallet_condition || 'used',
      quantity: b.quantity,
      available_quantity: b.available_quantity,
      price_per_pallet: b.price_per_pallet || 0,
      city: b.city,
      status: b.status as BatchStatus,
      description: b.description || '',
      created_at: b.created_at,
      primary_image_url: imagesByBatch[b.id]?.[0],
      image_urls: imagesByBatch[b.id] || [],
    }));

    setListings(mapped);
    setLoading(false);
  }, [phone]);

  useEffect(() => { fetchListings(); }, [fetchListings]);

  const togglePause = async (listing: InventoryListing) => {
    const newStatus = listing.status === 'paused' ? 'active' : 'paused';
    await supabase
      .from('inventory_batches')
      .update({ status: newStatus })
      .eq('id', listing.id);
    fetchListings();
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    await supabase.from('inventory_batches').delete().eq('id', deleteConfirm.id);
    setDeleting(false);
    setDeleteConfirm(null);
    fetchListings();
  };

  const openEdit = (listing: InventoryListing) => {
    setEditingListing(listing);
    setEditForm({
      pallet_type: listing.pallet_type,
      size: listing.size,
      quality: listing.quality,
      pallet_condition: listing.pallet_condition,
      quantity: listing.available_quantity,
      price_per_pallet: listing.price_per_pallet,
      city: listing.city,
      description: listing.description,
    });
    setEditSuccess(false);
  };

  const saveEdit = async () => {
    if (!editingListing || !editForm) return;
    setEditSaving(true);
    await supabase
      .from('inventory_batches')
      .update({
        pallet_type: editForm.pallet_type,
        size: editForm.size,
        quality: editForm.quality,
        pallet_condition: editForm.pallet_condition,
        quantity: editForm.quantity,
        available_quantity: editForm.quantity,
        quantity_available: editForm.quantity,
        price_per_pallet: editForm.price_per_pallet,
        city: editForm.city,
        description: editForm.description,
      })
      .eq('id', editingListing.id);
    setEditSaving(false);
    setEditSuccess(true);
    setTimeout(() => {
      setEditingListing(null);
      setEditForm(null);
      setEditSuccess(false);
      fetchListings();
    }, 900);
  };

  const openImageManager = async (batchId: string) => {
    const { data } = await supabase
      .from('inventory_images')
      .select('id, url, storage_path, is_primary, sort_order')
      .eq('batch_id', batchId)
      .order('sort_order', { ascending: true });

    setImageManager({ batchId, images: (data as BatchImage[]) ?? [] });
    setActiveGalleryIdx(0);
  };

  const deleteImage = async (imageId: string, storagePath: string) => {
    if (!imageManager) return;
    if (storagePath) {
      await supabase.storage.from('inventory-images').remove([storagePath]);
    }
    await supabase.from('inventory_images').delete().eq('id', imageId);
    const remaining = imageManager.images.filter(i => i.id !== imageId);
    if (remaining.length > 0 && !remaining.some(i => i.is_primary)) {
      await supabase.from('inventory_images').update({ is_primary: true }).eq('id', remaining[0].id);
      remaining[0].is_primary = true;
    }
    setImageManager({ ...imageManager, images: remaining });
    setActiveGalleryIdx(prev => Math.min(prev, Math.max(0, remaining.length - 1)));
    fetchListings();
  };

  const setPrimaryImage = async (imageId: string) => {
    if (!imageManager) return;
    await supabase.from('inventory_images').update({ is_primary: false }).eq('batch_id', imageManager.batchId);
    await supabase.from('inventory_images').update({ is_primary: true }).eq('id', imageId);
    const updated = imageManager.images.map(i => ({ ...i, is_primary: i.id === imageId }));
    setImageManager({ ...imageManager, images: updated });
    fetchListings();
  };

  const handleAddImage = async (file: File) => {
    if (!imageManager) return;
    setUploadingImage(true);
    const path = `inventory/${imageManager.batchId}/${Date.now()}_${file.name}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('inventory-images')
      .upload(path, file, { upsert: true });

    if (uploadError || !uploadData) {
      setUploadingImage(false);
      return;
    }

    const { data: urlData } = supabase.storage.from('inventory-images').getPublicUrl(uploadData.path);
    const isPrimary = imageManager.images.length === 0;

    const { data: dbRow } = await supabase
      .from('inventory_images')
      .insert({
        batch_id: imageManager.batchId,
        storage_path: uploadData.path,
        url: urlData.publicUrl,
        is_primary: isPrimary,
        sort_order: imageManager.images.length,
      })
      .select('id, url, storage_path, is_primary, sort_order')
      .maybeSingle();

    if (dbRow) {
      setImageManager({
        ...imageManager,
        images: [...imageManager.images, dbRow as BatchImage],
      });
    }
    setUploadingImage(false);
    fetchListings();
  };

  const filtered = filter === 'all' ? listings : listings.filter((l) => l.status === filter);
  const counts: Record<string, number> = { all: listings.length };
  for (const l of listings) counts[l.status] = (counts[l.status] || 0) + 1;

  return (
    <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-md" onClick={onClose} />
      <div
        className="relative w-full lg:w-[720px] xl:w-[840px] lg:max-h-[90vh] max-h-[100vh] flex flex-col slide-up lg:rounded-3xl overflow-hidden"
        style={{ background: '#f0f6fa', boxShadow: '0 40px 100px rgba(0,0,0,0.35)' }}
      >
        <header
          className="flex items-center justify-between px-5 py-3.5 flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #0f2535, #1a3d56)' }}
        >
          <button onClick={onClose} className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center transition-colors">
            <ArrowRight className="w-4 h-4 text-white" />
          </button>
          <h2 className="text-[16px] font-bold text-white">مستودعي السحابي</h2>
          <button
            onClick={onAddInventory}
            className="w-9 h-9 bg-[#27AE60] hover:bg-[#219653] rounded-xl flex items-center justify-center transition-colors"
          >
            <Plus className="w-4 h-4 text-white" />
          </button>
        </header>

        <div className="flex gap-2 px-4 py-3 overflow-x-auto no-scrollbar" dir="rtl">
          {(['all', 'active', 'draft', 'paused', 'reserved', 'sold'] as const).map((f) => {
            const isActive = filter === f;
            const label = f === 'all' ? 'الكل' : STATUS_CONFIG[f].label;
            const count = counts[f] || 0;
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[12px] font-bold transition-all whitespace-nowrap ${
                  isActive ? 'bg-[#1a4a5e] text-white shadow-sm' : 'bg-white text-[#4a6a7a] border border-gray-200'
                }`}
              >
                {label}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-6">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-3 border-[#1a4a5e] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Package className="w-12 h-12 text-gray-300 mb-3" />
              <p className="text-[14px] font-bold text-[#1a4a5e] mb-1">لا يوجد مخزون</p>
              <p className="text-[12px] text-[#7a9aab] mb-4">أضف مخزونك الأول ليظهر للمشترين</p>
              <button
                onClick={onAddInventory}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-[#1a4a5e] text-white rounded-xl font-bold text-[13px] active:scale-95 transition-transform"
              >
                <Plus className="w-4 h-4" />
                إضافة مخزون
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((listing) => {
                const sc = STATUS_CONFIG[listing.status];
                const qs = QUALITY_STYLE[listing.quality] ?? QUALITY_STYLE.B;
                const condLabel = CONDITION_LABELS[listing.pallet_condition as PalletCondition]?.ar ?? listing.pallet_condition;
                const qualLabel = QUALITY_LABELS[listing.quality as PalletQuality]?.ar ?? listing.quality;

                return (
                  <div key={listing.id} className="bg-white rounded-2xl overflow-hidden shadow-sm" style={{ border: `1.5px solid ${sc.border}` }} dir="rtl">

                    <div className="flex items-stretch">
                      <button
                        onClick={() => openImageManager(listing.id)}
                        className="relative w-24 flex-shrink-0 group overflow-hidden"
                        style={{ minHeight: '100px' }}
                      >
                        {listing.primary_image_url ? (
                          <>
                            <img src={listing.primary_image_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                            {listing.image_urls.length > 1 && (
                              <div className="absolute bottom-1.5 left-1.5 flex items-center gap-0.5 bg-black/60 backdrop-blur-sm rounded-full px-1.5 py-0.5">
                                <ImageIcon className="w-2.5 h-2.5 text-white" />
                                <span className="text-[9px] text-white font-bold">{listing.image_urls.length}</span>
                              </div>
                            )}
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <div className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                                <ImageIcon className="w-4 h-4 text-white" />
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center gap-1 group-hover:bg-[#f0f6fa] transition-colors" style={{ background: '#f8fafc' }}>
                            <ImagePlus className="w-5 h-5 text-gray-300 group-hover:text-[#1a4a5e] transition-colors" />
                            <span className="text-[9px] font-bold text-gray-300 group-hover:text-[#1a4a5e] transition-colors">أضف صور</span>
                          </div>
                        )}
                      </button>

                      <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div
                            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold flex-shrink-0"
                            style={{ background: sc.bg, border: `1.5px solid ${sc.border}`, color: sc.color }}
                          >
                            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: listing.status === 'active' ? sc.color : 'transparent', border: `1.5px solid ${sc.color}` }} />
                            {sc.label}
                          </div>
                          <h3 className="text-[15px] font-black text-[#0f2535] truncate">{listing.pallet_type}</h3>
                        </div>

                        <div className="flex items-center gap-1 mb-2">
                          <MapPin className="w-3 h-3 text-[#1565C0] flex-shrink-0" />
                          <span className="text-[11px] font-bold text-[#1565C0] truncate">{listing.city}</span>
                          <span className="text-gray-300 mx-0.5">·</span>
                          <span className="text-[10px] font-semibold text-gray-400" dir="ltr">{listing.size}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="px-2 py-1 rounded-lg border" style={{ background: qs.bg, borderColor: qs.border }}>
                            <span className="text-[10px] font-black" style={{ color: qs.text }}>{qualLabel}</span>
                          </div>
                          <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-50 border border-gray-100">
                            <Wrench className="w-2.5 h-2.5 text-gray-400" />
                            <span className="text-[10px] text-gray-500 font-semibold">{condLabel}</span>
                          </div>
                          {listing.price_per_pallet > 0 && (
                            <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#ECFDF5] border border-[#A7F3D0]">
                              <DollarSign className="w-2.5 h-2.5 text-[#059669]" />
                              <span className="text-[10px] font-black text-[#059669]">{listing.price_per_pallet}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div
                        className="flex flex-col items-center justify-center px-3 flex-shrink-0 border-r border-gray-100"
                        style={{ background: 'linear-gradient(180deg, #f8fafc, #f0f6fa)', minWidth: '68px' }}
                      >
                        <span className="text-[22px] font-black text-[#0f2535] leading-none">{listing.available_quantity.toLocaleString()}</span>
                        <span className="text-[9px] font-bold text-[#7a9aab] mt-0.5">طبلية</span>
                        {listing.quantity > listing.available_quantity && (
                          <div className="mt-1.5 w-full">
                            <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${Math.round((listing.available_quantity / listing.quantity) * 100)}%`,
                                  background: listing.available_quantity === 0 ? '#ef4444' : listing.available_quantity < listing.quantity * 0.3 ? '#f59e0b' : '#059669',
                                }}
                              />
                            </div>
                            <span className="text-[8px] text-gray-400 mt-0.5 block text-center">
                              {Math.round((listing.available_quantity / listing.quantity) * 100)}%
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center border-t border-gray-100" style={{ borderTopColor: sc.border + '66' }}>
                      <button
                        onClick={() => openImageManager(listing.id)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-semibold text-[#1a4a5e] hover:bg-[#f0f6fa] transition-colors"
                      >
                        <ImageIcon className="w-3 h-3" />
                        <span>الصور</span>
                        {listing.image_urls.length > 0 && (
                          <span className="w-4 h-4 rounded-full bg-[#1a4a5e] text-white text-[8px] font-black flex items-center justify-center">{listing.image_urls.length}</span>
                        )}
                      </button>
                      <div className="w-px h-5 bg-gray-100" />
                      <button
                        onClick={() => openEdit(listing)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-semibold text-[#1a4a5e] hover:bg-[#f0f6fa] transition-colors"
                      >
                        <Pencil className="w-3 h-3" />
                        تعديل
                      </button>
                      {(listing.status === 'active' || listing.status === 'paused') && (
                        <>
                          <div className="w-px h-5 bg-gray-100" />
                          <button
                            onClick={() => togglePause(listing)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-semibold hover:bg-gray-50 transition-colors"
                          >
                            {listing.status === 'paused' ? (
                              <><Play className="w-3 h-3 text-[#27AE60]" /><span className="text-[#27AE60] font-bold">تفعيل</span></>
                            ) : (
                              <><Pause className="w-3 h-3 text-amber-500" /><span className="text-amber-500 font-bold">إيقاف</span></>
                            )}
                          </button>
                        </>
                      )}
                      <div className="w-px h-5 bg-gray-100" />
                      <button
                        onClick={() => setDeleteConfirm(listing)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-semibold text-red-400 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                        حذف
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <button
          onClick={fetchListings}
          className="absolute bottom-4 left-4 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center border border-gray-200 hover:bg-gray-50 transition-colors"
        >
          <RefreshCw className="w-4 h-4 text-[#1a4a5e]" />
        </button>
      </div>

      {editingListing && editForm && (
        <div
          className="fixed inset-0 z-[60] flex items-end lg:items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={() => { setEditingListing(null); setEditForm(null); }}
        >
          <div
            className="relative bg-white rounded-t-3xl lg:rounded-3xl lg:max-w-[560px] w-full overflow-hidden"
            style={{ maxHeight: '90vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-center pt-3 pb-0 lg:hidden">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>

            <div
              className="flex items-center justify-between px-5 py-4 border-b border-gray-100"
              style={{ background: 'linear-gradient(135deg, #0f2535, #1a3d56)' }}
            >
              <button
                onClick={() => { setEditingListing(null); setEditForm(null); }}
                className="w-8 h-8 bg-white/15 hover:bg-white/25 rounded-xl flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4 text-white" />
              </button>
              <div className="text-center">
                <h3 className="text-[15px] font-bold text-white">تعديل المخزون</h3>
                <p className="text-[11px] text-white/60 mt-0.5">{editingListing.pallet_type} · {editingListing.city}</p>
              </div>
              <div className="w-8" />
            </div>

            <div className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 130px)' }}>
              <div className="px-5 py-4 space-y-4" dir="rtl">

                <div>
                  <label className="block text-[12px] font-bold text-gray-600 mb-2">نوع الطبلية</label>
                  <div className="grid grid-cols-2 gap-2">
                    {PALLET_TYPES.map(t => (
                      <button
                        key={t}
                        onClick={() => setEditForm(f => f ? { ...f, pallet_type: t } : f)}
                        className="py-2.5 rounded-xl text-[13px] font-bold transition-all"
                        style={{
                          background: editForm.pallet_type === t ? '#1a4a5e' : '#f8fafc',
                          color: editForm.pallet_type === t ? 'white' : '#4a6a7a',
                          border: editForm.pallet_type === t ? '1.5px solid #1a4a5e' : '1.5px solid #e2e8f0',
                        }}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[12px] font-bold text-gray-600 mb-2">المقاس</label>
                  <div className="flex flex-wrap gap-2">
                    {PALLET_SIZES.map(s => (
                      <button
                        key={s}
                        onClick={() => setEditForm(f => f ? { ...f, size: s } : f)}
                        className="px-3 py-2 rounded-xl text-[12px] font-bold transition-all"
                        style={{
                          background: editForm.size === s ? '#1a4a5e' : '#f8fafc',
                          color: editForm.size === s ? 'white' : '#4a6a7a',
                          border: editForm.size === s ? '1.5px solid #1a4a5e' : '1.5px solid #e2e8f0',
                        }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[12px] font-bold text-gray-600 mb-2">الجودة</label>
                  <div className="grid grid-cols-2 gap-2">
                    {QUALITIES.map(q => (
                      <button
                        key={q.value}
                        onClick={() => setEditForm(f => f ? { ...f, quality: q.value } : f)}
                        className="py-2.5 rounded-xl text-[12px] font-bold transition-all"
                        style={{
                          background: editForm.quality === q.value ? '#1a4a5e' : '#f8fafc',
                          color: editForm.quality === q.value ? 'white' : '#4a6a7a',
                          border: editForm.quality === q.value ? '1.5px solid #1a4a5e' : '1.5px solid #e2e8f0',
                        }}
                      >
                        {q.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[12px] font-bold text-gray-600 mb-2">الحالة</label>
                  <div className="grid grid-cols-3 gap-2">
                    {CONDITIONS.map(c => (
                      <button
                        key={c.value}
                        onClick={() => setEditForm(f => f ? { ...f, pallet_condition: c.value } : f)}
                        className="py-2.5 rounded-xl text-[11px] font-bold transition-all"
                        style={{
                          background: editForm.pallet_condition === c.value ? '#1a4a5e' : '#f8fafc',
                          color: editForm.pallet_condition === c.value ? 'white' : '#4a6a7a',
                          border: editForm.pallet_condition === c.value ? '1.5px solid #1a4a5e' : '1.5px solid #e2e8f0',
                        }}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[12px] font-bold text-gray-600 mb-2">الكمية المتاحة</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={editForm.quantity}
                        onChange={(e) => setEditForm(f => f ? { ...f, quantity: parseInt(e.target.value) || 0 } : f)}
                        min={0}
                        className="w-full px-3 py-3 rounded-xl border text-[13px] font-bold text-[#1a4a5e] text-right outline-none transition-colors"
                        style={{ borderColor: '#e2e8f0', background: '#f8fafc' }}
                        onFocus={(e) => e.target.style.borderColor = '#1a4a5e'}
                        onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                      />
                    </div>
                    <div className="flex gap-1.5 mt-1.5">
                      {[100, 500, 1000].map(n => (
                        <button
                          key={n}
                          onClick={() => setEditForm(f => f ? { ...f, quantity: f.quantity + n } : f)}
                          className="flex-1 py-1 rounded-lg text-[10px] font-bold bg-[#f0f6fa] text-[#1a4a5e] hover:bg-[#dde9f0] transition-colors"
                        >
                          +{n}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[12px] font-bold text-gray-600 mb-2">السعر (ر.س / طبلية)</label>
                    <input
                      type="number"
                      value={editForm.price_per_pallet}
                      onChange={(e) => setEditForm(f => f ? { ...f, price_per_pallet: parseFloat(e.target.value) || 0 } : f)}
                      min={0}
                      placeholder="0 = قابل للتفاوض"
                      className="w-full px-3 py-3 rounded-xl border text-[13px] font-bold text-[#1a4a5e] text-right outline-none transition-colors"
                      style={{ borderColor: '#e2e8f0', background: '#f8fafc' }}
                      onFocus={(e) => e.target.style.borderColor = '#1a4a5e'}
                      onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[12px] font-bold text-gray-600 mb-2">المدينة</label>
                  <input
                    type="text"
                    value={editForm.city}
                    onChange={(e) => setEditForm(f => f ? { ...f, city: e.target.value } : f)}
                    className="w-full px-3 py-3 rounded-xl border text-[13px] font-bold text-[#1a4a5e] text-right outline-none transition-colors"
                    style={{ borderColor: '#e2e8f0', background: '#f8fafc' }}
                    onFocus={(e) => e.target.style.borderColor = '#1a4a5e'}
                    onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-bold text-gray-600 mb-2">الوصف (اختياري)</label>
                  <textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm(f => f ? { ...f, description: e.target.value } : f)}
                    rows={3}
                    placeholder="أضف وصفاً للمخزون..."
                    className="w-full px-3 py-3 rounded-xl border text-[13px] text-[#1a4a5e] text-right outline-none transition-colors resize-none"
                    style={{ borderColor: '#e2e8f0', background: '#f8fafc' }}
                    onFocus={(e) => e.target.style.borderColor = '#1a4a5e'}
                    onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                  />
                </div>

                <div className="pb-2">
                  <button
                    onClick={saveEdit}
                    disabled={editSaving || editSuccess}
                    className="w-full py-4 rounded-2xl text-[15px] font-black text-white transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                    style={{
                      background: editSuccess
                        ? 'linear-gradient(135deg, #059669, #10b981)'
                        : 'linear-gradient(135deg, #0f2535, #1a3d56)',
                      opacity: editSaving ? 0.7 : 1,
                      boxShadow: '0 4px 20px rgba(15,37,53,0.3)',
                    }}
                  >
                    {editSuccess ? (
                      <><Check className="w-5 h-5" /> تم الحفظ بنجاح</>
                    ) : editSaving ? (
                      <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> جاري الحفظ...</>
                    ) : (
                      <><Pencil className="w-4 h-4" /> حفظ التعديلات</>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center px-4"
          style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
          onClick={() => setDeleteConfirm(null)}
        >
          <div
            className="bg-white rounded-3xl overflow-hidden w-full max-w-[360px] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col items-center px-6 pt-8 pb-6 text-center" dir="rtl">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                style={{ background: '#FEF2F2', border: '2px solid #FECACA' }}
              >
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-[17px] font-black text-gray-900 mb-1">تأكيد الحذف</h3>
              <p className="text-[13px] text-gray-500 mb-1">
                هل أنت متأكد من حذف هذا المخزون؟
              </p>
              <div
                className="flex items-center gap-2 px-4 py-2 rounded-xl mt-1 mb-5"
                style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}
              >
                <Package className="w-4 h-4 text-[#1a4a5e]" />
                <span className="text-[13px] font-bold text-[#1a4a5e]">{deleteConfirm.pallet_type}</span>
                <span className="text-[11px] text-gray-400">·</span>
                <span className="text-[12px] text-gray-500">{deleteConfirm.available_quantity} طبلية</span>
                <span className="text-[11px] text-gray-400">·</span>
                <span className="text-[12px] text-gray-500">{deleteConfirm.city}</span>
              </div>
              <p className="text-[11px] text-red-400 mb-5">لا يمكن التراجع عن هذه العملية</p>
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 py-3 rounded-xl text-[13px] font-bold text-gray-600 transition-colors"
                  style={{ background: '#f3f4f6', border: '1px solid #e5e7eb' }}
                >
                  إلغاء
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={deleting}
                  className="flex-1 py-3 rounded-xl text-[13px] font-black text-white transition-all active:scale-[0.97] flex items-center justify-center gap-1.5"
                  style={{ background: 'linear-gradient(135deg, #dc2626, #ef4444)', opacity: deleting ? 0.7 : 1 }}
                >
                  {deleting ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <><Trash2 className="w-4 h-4" /> حذف نهائي</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {imageManager && (
        <div
          className="fixed inset-0 z-[60] flex items-end lg:items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={() => setImageManager(null)}
        >
          <div
            className="relative bg-white rounded-t-3xl lg:rounded-3xl lg:max-w-[540px] w-full overflow-hidden"
            style={{ maxHeight: '85vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-center pt-3 pb-0 lg:hidden">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>

            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <button
                onClick={() => setImageManager(null)}
                className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
              <h3 className="text-[15px] font-bold text-[#1a3a4a]">إدارة الصور</h3>
              <div className="w-8" />
            </div>

            <div className="overflow-y-auto" style={{ maxHeight: 'calc(85vh - 140px)' }}>
              {imageManager.images.length > 0 ? (
                <>
                  <div className="relative bg-gray-100 aspect-[16/10]">
                    <img
                      src={imageManager.images[activeGalleryIdx]?.url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                    {imageManager.images[activeGalleryIdx]?.is_primary && (
                      <div className="absolute top-3 right-3 flex items-center gap-1 bg-amber-500 rounded-full px-2.5 py-1">
                        <Star className="w-3 h-3 text-white" fill="white" />
                        <span className="text-[10px] font-bold text-white">رئيسية</span>
                      </div>
                    )}
                    <div className="absolute bottom-3 left-3 flex items-center gap-1 bg-black/40 backdrop-blur-sm rounded-lg px-2 py-1">
                      <span className="text-[10px] font-bold text-white">{activeGalleryIdx + 1}/{imageManager.images.length}</span>
                    </div>

                    {imageManager.images.length > 1 && (
                      <>
                        <button
                          onClick={() => setActiveGalleryIdx(i => Math.max(0, i - 1))}
                          disabled={activeGalleryIdx === 0}
                          className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/30 hover:bg-black/50 flex items-center justify-center transition-colors disabled:opacity-20"
                        >
                          <ChevronRight className="w-4 h-4 text-white" />
                        </button>
                        <button
                          onClick={() => setActiveGalleryIdx(i => Math.min(imageManager.images.length - 1, i + 1))}
                          disabled={activeGalleryIdx === imageManager.images.length - 1}
                          className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/30 hover:bg-black/50 flex items-center justify-center transition-colors disabled:opacity-20"
                        >
                          <ChevronLeft className="w-4 h-4 text-white" />
                        </button>
                      </>
                    )}
                  </div>

                  <div className="px-4 py-3 flex gap-2 overflow-x-auto" dir="rtl">
                    {imageManager.images.map((img, i) => (
                      <button
                        key={img.id}
                        onClick={() => setActiveGalleryIdx(i)}
                        className="flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden border-2 transition-all relative"
                        style={{
                          borderColor: i === activeGalleryIdx ? '#1a4a5e' : 'transparent',
                          opacity: i === activeGalleryIdx ? 1 : 0.6,
                        }}
                      >
                        <img src={img.url} alt="" className="w-full h-full object-cover" loading="lazy" />
                        {img.is_primary && (
                          <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-amber-500 rounded-tl-md flex items-center justify-center">
                            <Star className="w-2 h-2 text-white" fill="white" />
                          </div>
                        )}
                      </button>
                    ))}
                    {imageManager.images.length < 5 && (
                      <button
                        onClick={() => imgInputRef.current?.click()}
                        disabled={uploadingImage}
                        className="flex-shrink-0 w-14 h-14 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 flex flex-col items-center justify-center gap-0.5 hover:border-[#1a4a5e] hover:bg-[#f0f6fa] transition-colors"
                      >
                        {uploadingImage ? (
                          <div className="w-4 h-4 border-2 border-[#1a4a5e] border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <ImagePlus className="w-3.5 h-3.5 text-gray-400" />
                            <span className="text-[7px] font-bold text-gray-400">إضافة</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  <div className="px-4 pb-4 flex gap-2" dir="rtl">
                    {!imageManager.images[activeGalleryIdx]?.is_primary && (
                      <button
                        onClick={() => setPrimaryImage(imageManager.images[activeGalleryIdx].id)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[12px] font-bold text-amber-700 active:scale-[0.98] transition-transform"
                      >
                        <Star className="w-3.5 h-3.5" />
                        تعيين كرئيسية
                      </button>
                    )}
                    <button
                      onClick={() => {
                        const img = imageManager.images[activeGalleryIdx];
                        if (img) deleteImage(img.id, img.storage_path);
                      }}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-red-50 border border-red-200 text-[12px] font-bold text-red-500 active:scale-[0.98] transition-transform"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      حذف الصورة
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center px-6">
                  <div className="w-16 h-16 rounded-2xl bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center mb-4">
                    <ImageIcon className="w-7 h-7 text-gray-300" />
                  </div>
                  <p className="text-[14px] font-bold text-[#1a3a4a] mb-1">لا توجد صور</p>
                  <p className="text-[12px] text-[#7a9aab] mb-5">أضف صوراً لمخزونك لزيادة فرص البيع</p>
                  <button
                    onClick={() => imgInputRef.current?.click()}
                    disabled={uploadingImage}
                    className="flex items-center gap-2 px-6 py-3 bg-[#1a4a5e] text-white rounded-xl font-bold text-[13px] active:scale-95 transition-transform"
                  >
                    {uploadingImage ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <ImagePlus className="w-4 h-4" />
                    )}
                    إضافة صور
                  </button>
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
                if (file) handleAddImage(file);
                e.target.value = '';
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
