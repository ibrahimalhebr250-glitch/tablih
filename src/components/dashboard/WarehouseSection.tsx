import { useState } from 'react';
import { Warehouse, Plus, ChevronLeft, PauseCircle, DollarSign, Layers, X, Check, Trash2, Pencil, MapPin, Package, Hash, ChevronDown } from 'lucide-react';
import type { DashboardBatch } from '../../hooks/useDashboard';
import BatchDemandSheet from './BatchDemandSheet';
import { PALLET_TYPES, PALLET_SIZES, QUALITY_LABELS, SAUDI_CITIES } from '../../types/inventory';
import type { PalletQuality } from '../../types/inventory';

interface Props {
  batches: DashboardBatch[];
  loading: boolean;
  onAddInventory: () => void;
  supplierPhone: string;
  onDealCreated: () => void;
  onUpdatePrice: (batchId: string, newPrice: number) => Promise<unknown>;
  onUpdateBatch: (batchId: string, data: { pallet_type?: string; size?: string; quality?: string; quantity?: number; min_price?: number; city?: string }) => Promise<unknown>;
  onDeleteBatch: (batchId: string, phone: string) => Promise<unknown>;
  onOpenDeals?: () => void;
}

const QUALITY_COLORS: Record<string, { dot: string; text: string; bg: string }> = {
  A:     { dot: '#27AE60', text: '#27AE60', bg: '#E8F8F0' },
  B:     { dot: '#2196F3', text: '#2196F3', bg: '#EBF5FF' },
  C:     { dot: '#F59E0B', text: '#92400E', bg: '#FFFBEB' },
  Scrap: { dot: '#9CA3AF', text: '#6B7280', bg: '#F3F4F6' },
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  active:  { label: 'نشط', color: '#27AE60' },
  matched: { label: 'مُطابق', color: '#2196F3' },
  draft:   { label: 'مسودة', color: '#F59E0B' },
  paused:  { label: 'موقوف', color: '#9CA3AF' },
};

const QUALITY_KEYS: PalletQuality[] = ['A', 'B', 'C', 'Scrap'];

function BatchEditSheet({ batch, onClose, onSave }: {
  batch: DashboardBatch;
  onClose: () => void;
  onSave: (data: { pallet_type?: string; size?: string; quality?: string; quantity?: number; min_price?: number; city?: string }) => Promise<void>;
}) {
  const [palletType, setPalletType] = useState(batch.pallet_type);
  const [size, setSize] = useState(batch.size);
  const [quality, setQuality] = useState<PalletQuality>(batch.quality as PalletQuality);
  const [quantity, setQuantity] = useState(batch.quantity.toString());
  const [price, setPrice] = useState(batch.min_price?.toString() ?? '');
  const [city, setCity] = useState(batch.city);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [cityOpen, setCityOpen] = useState(false);

  const handleSave = async () => {
    const qty = Number(quantity);
    if (!palletType || !size || !quality || !city || isNaN(qty) || qty <= 0) return;
    setSaving(true);
    await onSave({
      pallet_type: palletType,
      size,
      quality,
      quantity: qty,
      min_price: price ? Number(price) : undefined,
      city,
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => { setSaved(false); onClose(); }, 800);
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:w-[480px] max-h-[92vh] flex flex-col bg-white sm:rounded-3xl rounded-t-3xl overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
            <X className="w-4 h-4 text-gray-500" />
          </button>
          <div className="text-right">
            <p className="text-[14px] font-bold text-[#1a4a5e]">تعديل الدفعة</p>
            <p className="text-[11px] text-[#7a9aab] font-mono">{batch.batch_id}</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5" dir="rtl">
          <div>
            <p className="text-[12px] font-bold text-[#1a4a5e] mb-2">نوع الطبلية</p>
            <div className="grid grid-cols-3 gap-2">
              {PALLET_TYPES.map(({ value }) => (
                <button
                  key={value}
                  onClick={() => setPalletType(value)}
                  className="py-2.5 rounded-xl text-[12px] font-bold border-2 transition-all"
                  style={{
                    background: palletType === value ? '#1a4a5e' : 'white',
                    borderColor: palletType === value ? '#1a4a5e' : '#e5e7eb',
                    color: palletType === value ? 'white' : '#374151',
                  }}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[12px] font-bold text-[#1a4a5e] mb-2">المقاس</p>
            <div className="flex flex-wrap gap-2">
              {PALLET_SIZES.map((s) => (
                <button
                  key={s}
                  onClick={() => setSize(s)}
                  className="px-3 py-2 rounded-xl text-[12px] font-bold border-2 transition-all"
                  style={{
                    background: size === s ? '#1a4a5e' : 'white',
                    borderColor: size === s ? '#1a4a5e' : '#e5e7eb',
                    color: size === s ? 'white' : '#374151',
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[12px] font-bold text-[#1a4a5e] mb-2">الدرجة</p>
            <div className="grid grid-cols-4 gap-2">
              {QUALITY_KEYS.map((q) => {
                const qc = QUALITY_COLORS[q];
                const isSelected = quality === q;
                return (
                  <button
                    key={q}
                    onClick={() => setQuality(q)}
                    className="py-2.5 rounded-xl text-[11px] font-bold border-2 transition-all"
                    style={{
                      background: isSelected ? qc.bg : 'white',
                      borderColor: isSelected ? qc.dot : '#e5e7eb',
                      color: isSelected ? qc.text : '#6b7280',
                    }}
                  >
                    {QUALITY_LABELS[q].ar}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-bold text-[#1a4a5e] mb-2">الكمية (طبلية)</label>
            <div className="relative">
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="أدخل الكمية"
                min={1}
                className="w-full pr-4 pl-16 py-3.5 rounded-xl border-2 border-gray-200 bg-gray-50 focus:border-[#1a4a5e] focus:bg-white text-[18px] font-bold text-[#1a4a5e] text-right outline-none transition-colors"
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[13px] font-bold text-[#7a9aab]">طبلية</span>
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-bold text-[#1a4a5e] mb-2">السعر الأدنى للطبلية (ر.س)</label>
            <div className="relative">
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="اختياري"
                min={0}
                step={0.5}
                className="w-full pr-4 pl-16 py-3.5 rounded-xl border-2 border-gray-200 bg-gray-50 focus:border-[#F59E0B] focus:bg-white text-[18px] font-bold text-[#1a4a5e] text-right outline-none transition-colors"
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[13px] font-bold text-[#7a9aab]">ر.س</span>
            </div>
          </div>

          <div>
            <p className="text-[12px] font-bold text-[#1a4a5e] mb-2">المدينة</p>
            <button
              onClick={() => setCityOpen(!cityOpen)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 border-gray-200 bg-gray-50 text-right"
            >
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${cityOpen ? 'rotate-180' : ''}`} />
              <span className="text-[13px] font-bold text-[#1a4a5e]">{city || 'اختر المدينة'}</span>
            </button>
            {cityOpen && (
              <div className="mt-1 border-2 border-gray-200 rounded-xl overflow-hidden max-h-44 overflow-y-auto">
                {SAUDI_CITIES.map((c) => (
                  <button
                    key={c}
                    onClick={() => { setCity(c); setCityOpen(false); }}
                    className="w-full text-right px-4 py-2.5 text-[12px] font-bold transition-colors hover:bg-gray-50"
                    style={{ color: city === c ? '#1a4a5e' : '#374151', background: city === c ? '#f0f6fa' : 'white' }}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex-shrink-0 p-5 pt-3 border-t border-gray-100">
          <button
            onClick={handleSave}
            disabled={saving || !palletType || !size || !quality || !city || !quantity || Number(quantity) <= 0}
            className="w-full py-3.5 rounded-2xl text-[14px] font-bold text-white flex items-center justify-center gap-2 active:scale-[0.97] transition-all disabled:opacity-50"
            style={{
              background: saved
                ? 'linear-gradient(135deg, #27AE60, #1E8449)'
                : 'linear-gradient(135deg, #1a4a5e, #0f2d40)',
              boxShadow: saved ? '0 4px 14px rgba(39,174,96,0.3)' : '0 4px 14px rgba(26,74,94,0.3)',
            }}
          >
            {saved ? (
              <><Check className="w-4 h-4" /><span>تم الحفظ</span></>
            ) : saving ? (
              <span>جارٍ الحفظ...</span>
            ) : (
              <><Pencil className="w-4 h-4" /><span>حفظ التعديلات</span></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function DeleteBatchDialog({ batch, onConfirm, onCancel, loading }: {
  batch: DashboardBatch;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center" onClick={onCancel}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative w-full sm:max-w-sm bg-white sm:rounded-3xl rounded-t-3xl p-5 space-y-4 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="text-center">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-red-50 flex items-center justify-center mb-2">
            <Trash2 className="w-6 h-6 text-red-500" />
          </div>
          <h3 className="text-[15px] font-black text-[#1a2f3e] mb-1">حذف الدفعة</h3>
          <p className="text-[12px] text-[#7a9aab] leading-relaxed">هل أنت متأكد من حذف هذه الدفعة؟ لا يمكن التراجع</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-right text-[11px] text-red-700 leading-relaxed" dir="rtl">
          {batch.pallet_type} · {batch.size} · درجة {batch.quality} — {batch.quantity.toLocaleString('ar-SA')} طبلية — {batch.city}
        </div>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-3 rounded-xl bg-gray-100 text-[13px] font-bold text-[#4a6a7e] active:scale-[0.97] transition-transform">
            تراجع
          </button>
          <button
            disabled={loading}
            onClick={onConfirm}
            className="flex-1 py-3 rounded-xl text-[13px] font-bold text-white active:scale-[0.97] transition-transform disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)' }}
          >
            {loading ? 'جارٍ الحذف...' : 'حذف الدفعة'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function WarehouseSection({ batches, loading, onAddInventory, supplierPhone, onDealCreated, onUpdatePrice, onUpdateBatch, onDeleteBatch, onOpenDeals }: Props) {
  const [demandBatch, setDemandBatch] = useState<DashboardBatch | null>(null);
  const [priceBatch, setPriceBatch] = useState<DashboardBatch | null>(null);
  const [editBatch, setEditBatch] = useState<DashboardBatch | null>(null);
  const [deletingBatch, setDeletingBatch] = useState<DashboardBatch | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleDelete = async () => {
    if (!deletingBatch) return;
    setDeleteLoading(true);
    await onDeleteBatch(deletingBatch.id, supplierPhone);
    setDeleteLoading(false);
    setDeletingBatch(null);
  };

  return (
    <>
      <div className="mx-4 lg:mx-6 mt-5">
        <div className="flex items-center justify-between mb-3">
          <button onClick={onAddInventory} className="flex items-center gap-1 text-[12px] text-[#27AE60] font-bold">
            <Plus className="w-3.5 h-3.5" />
            <span>إضافة دفعة</span>
          </button>
          <div className="flex items-center gap-2">
            <Warehouse className="w-4 h-4 text-[#1a4a5e]" />
            <h3 className="text-[14px] font-bold text-[#1a4a5e]">مستودعي السحابي</h3>
          </div>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-28 bg-white rounded-2xl animate-pulse border border-gray-100" />
            ))}
          </div>
        ) : batches.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 py-8 flex flex-col items-center gap-2">
            <Warehouse className="w-8 h-8 text-gray-300" />
            <p className="text-[12px] text-[#a0b5c0]">لا توجد دفعات مخزون بعد</p>
            <button
              onClick={onAddInventory}
              className="mt-1 px-4 py-2 rounded-xl bg-[#1a4a5e] text-white text-[12px] font-bold"
            >
              إيداع أول دفعة
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {batches.map((batch) => {
              const qc = QUALITY_COLORS[batch.quality] ?? QUALITY_COLORS.B;
              const sc = STATUS_LABELS[batch.status] ?? STATUS_LABELS.active;
              const reservedQty = batch.matched_quantity ?? 0;
              const availableQty = batch.available_quantity ?? batch.quantity;
              const canEdit = batch.status === 'active' || batch.status === 'draft' || batch.status === 'paused';

              return (
                <div key={batch.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                  <div className="px-4 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span
                          className="text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                          style={{ background: sc.color + '20', color: sc.color }}
                        >
                          {sc.label}
                        </span>
                        {canEdit && (
                          <button
                            onClick={() => setEditBatch(batch)}
                            className="p-1.5 rounded-lg bg-[#f0f6fa] border border-[#d4e8f4] active:scale-90 transition-transform"
                            title="تعديل"
                          >
                            <Pencil className="w-3 h-3 text-[#1a4a5e]" />
                          </button>
                        )}
                        <button
                          onClick={() => setDeletingBatch(batch)}
                          className="p-1.5 rounded-lg bg-red-50 border border-red-100 active:scale-90 transition-transform"
                          title="حذف"
                        >
                          <Trash2 className="w-3 h-3 text-red-400" />
                        </button>
                      </div>
                      <div className="text-right flex-1">
                        <div className="flex items-center justify-end gap-2 mb-1">
                          <span
                            className="text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                            style={{ background: qc.bg, color: qc.text }}
                          >
                            Grade {batch.quality}
                          </span>
                          <span className="text-[13px] font-bold text-[#1a4a5e]">
                            {batch.pallet_type} – {batch.size}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#7a9aab]">{batch.city}</p>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <div className="bg-[#F5F9FC] rounded-xl px-3 py-2 text-right">
                        <p className="text-[11px] text-[#7a9aab]">الكمية المتاحة</p>
                        <p className="text-[15px] font-bold text-[#27AE60]">
                          {availableQty.toLocaleString('ar-SA')}
                          <span className="text-[10px] font-normal text-[#7a9aab] mr-1">طبلية</span>
                        </p>
                      </div>
                      <div className="bg-[#F5F9FC] rounded-xl px-3 py-2 text-right">
                        <p className="text-[11px] text-[#7a9aab]">محجوز للصفقات</p>
                        <p className="text-[15px] font-bold text-[#2196F3]">
                          {reservedQty.toLocaleString('ar-SA')}
                          <span className="text-[10px] font-normal text-[#7a9aab] mr-1">طبلية</span>
                        </p>
                      </div>
                    </div>

                    {batch.min_price && (
                      <div className="mt-2 flex items-center justify-end gap-1">
                        <span className="text-[11px] text-[#7a9aab]">السعر الأدنى:</span>
                        <span className="text-[11px] font-bold text-[#1a4a5e]">{batch.min_price} ريال</span>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-gray-50 grid grid-cols-3 divide-x divide-x-reverse divide-gray-100">
                    <button
                      onClick={() => setDemandBatch(batch)}
                      className="flex items-center justify-center gap-1.5 py-2.5 text-[11px] text-[#2196F3] font-medium active:bg-blue-50 transition-colors"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>رؤية الطلب</span>
                    </button>
                    <button
                      onClick={() => setPriceBatch(batch)}
                      className="flex items-center justify-center gap-1.5 py-2.5 text-[11px] text-[#F59E0B] font-medium active:bg-amber-50 transition-colors"
                    >
                      <DollarSign className="w-3.5 h-3.5" />
                      <span>تعديل السعر</span>
                    </button>
                    <button className="flex items-center justify-center gap-1.5 py-2.5 text-[11px] text-[#9CA3AF] font-medium active:bg-gray-50 transition-colors">
                      <PauseCircle className="w-3.5 h-3.5" />
                      <span>إيقاف مؤقت</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {demandBatch && (
        <BatchDemandSheet
          batch={demandBatch}
          supplierPhone={supplierPhone}
          onClose={() => setDemandBatch(null)}
          onDealCreated={() => { setDemandBatch(null); onDealCreated(); }}
          onOpenDeals={onOpenDeals}
        />
      )}

      {priceBatch && (
        <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setPriceBatch(null)} />
          <div className="relative w-full sm:w-[420px] bg-white sm:rounded-2xl rounded-t-2xl overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <button onClick={() => setPriceBatch(null)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                <X className="w-4 h-4 text-gray-500" />
              </button>
              <div className="text-right">
                <p className="text-[14px] font-bold text-[#1a4a5e]">تعديل السعر</p>
                <p className="text-[11px] text-[#7a9aab]">{priceBatch.pallet_type} - {priceBatch.size} - درجة {priceBatch.quality}</p>
              </div>
            </div>
            <PriceEditInline batch={priceBatch} onClose={() => setPriceBatch(null)} onSave={onUpdatePrice} />
          </div>
        </div>
      )}

      {editBatch && (
        <BatchEditSheet
          batch={editBatch}
          onClose={() => setEditBatch(null)}
          onSave={async (data) => { await onUpdateBatch(editBatch.id, data); }}
        />
      )}

      {deletingBatch && (
        <DeleteBatchDialog
          batch={deletingBatch}
          onConfirm={handleDelete}
          onCancel={() => setDeletingBatch(null)}
          loading={deleteLoading}
        />
      )}
    </>
  );
}

function PriceEditInline({ batch, onClose, onSave }: {
  batch: DashboardBatch;
  onClose: () => void;
  onSave: (batchId: string, price: number) => Promise<unknown>;
}) {
  const [price, setPrice] = useState(batch.min_price?.toString() ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    const numPrice = Number(price);
    if (isNaN(numPrice) || numPrice < 0) return;
    setSaving(true);
    await onSave(batch.id, numPrice);
    setSaving(false);
    setSaved(true);
    setTimeout(() => { setSaved(false); onClose(); }, 800);
  };

  return (
    <div className="p-5 space-y-4" dir="rtl">
      <div className="bg-[#F5F9FC] rounded-xl p-3 flex items-center justify-between">
        <span className="text-[11px] text-[#7a9aab]">المدينة: {batch.city}</span>
        <span className="text-[11px] text-[#7a9aab]">الكمية: {batch.available_quantity} طبلية</span>
      </div>
      <div>
        <label className="block text-[12px] font-bold text-[#1a4a5e] mb-2 text-right">السعر الأدنى للطبلية (ر.س)</label>
        <div className="relative">
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="أدخل السعر"
            min={0}
            step={0.5}
            className="w-full pr-4 pl-16 py-3.5 rounded-xl border-2 border-gray-200 bg-gray-50 focus:border-[#F59E0B] focus:bg-white text-[18px] font-bold text-[#1a4a5e] text-right outline-none transition-colors"
            autoFocus
          />
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[13px] font-bold text-[#7a9aab]">ر.س</span>
        </div>
      </div>
      {batch.min_price != null && (
        <div className="flex items-center justify-end gap-1.5 text-[11px] text-[#7a9aab]">
          <span>السعر الحالي: {batch.min_price} ر.س</span>
          <DollarSign className="w-3 h-3" />
        </div>
      )}
      <button
        onClick={handleSave}
        disabled={saving || !price || Number(price) < 0}
        className="w-full py-3.5 rounded-xl text-[14px] font-bold text-white flex items-center justify-center gap-2 active:scale-[0.97] transition-all disabled:opacity-50"
        style={{
          background: saved ? 'linear-gradient(135deg, #27AE60, #1E8449)' : 'linear-gradient(135deg, #F59E0B, #D97706)',
          boxShadow: saved ? '0 4px 14px rgba(39,174,96,0.3)' : '0 4px 14px rgba(245,158,11,0.3)',
        }}
      >
        {saved ? (
          <><Check className="w-4 h-4" /><span>تم الحفظ</span></>
        ) : saving ? (
          <span>جارٍ الحفظ...</span>
        ) : (
          <><DollarSign className="w-4 h-4" /><span>حفظ السعر</span></>
        )}
      </button>
    </div>
  );
}
