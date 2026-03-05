import { useState } from 'react';
import { ArrowRight, Save } from 'lucide-react';
import type { InventoryBatch } from '../../../../hooks/useMarket';

interface Props {
  batch: InventoryBatch;
  onSave: (id: string, updates: Partial<InventoryBatch>) => Promise<unknown>;
  onBack: () => void;
}

export default function InventoryEditPage({ batch, onSave, onBack }: Props) {
  const [form, setForm] = useState({
    min_price: String(batch.min_price),
    available_quantity: String(batch.available_quantity),
    status: batch.status ?? 'active',
    admin_notes: batch.admin_notes ?? '',
    hide_from_matching: batch.hide_from_matching,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handle = async () => {
    setSaving(true);
    await onSave(batch.id, {
      min_price: Number(form.min_price),
      available_quantity: Number(form.available_quantity),
      status: form.status,
      admin_notes: form.admin_notes || null,
      hide_from_matching: form.hide_from_matching,
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const inputClass = "w-full px-3 py-2 text-[13px] bg-white border border-[#e2edf5] rounded-xl text-[#1a2f3e] focus:outline-none focus:border-[#2563eb] transition-colors";

  const field = (label: string, node: React.ReactNode) => (
    <div className="space-y-1.5">
      <label className="text-[12px] font-bold text-[#4a7a94]">{label}</label>
      {node}
    </div>
  );

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-xl bg-[#f0f6fa] text-[#4a7a94] hover:bg-[#e2edf5] transition-colors">
          <ArrowRight className="w-4 h-4" />
        </button>
        <h3 className="text-[17px] font-black text-[#1a2f3e]">تعديل: {batch.batch_id}</h3>
      </div>

      <div className="bg-[#fefce8] border border-[#fde68a] rounded-2xl px-4 py-3 text-[12px] text-[#ca8a04] font-semibold">
        المواصفات الأساسية (النوع، المقاس، الجودة، المدينة) لا يمكن تعديلها لضمان سلامة الصفقات.
      </div>

      <div className="bg-white rounded-2xl border border-[#e2edf5] p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {field('السعر الأدنى (ر.س)',
            <input type="number" value={form.min_price} onChange={e => setForm(p => ({ ...p, min_price: e.target.value }))} min="0" step="0.5" className={inputClass} />
          )}
          {field('الكمية المتاحة',
            <input type="number" value={form.available_quantity} onChange={e => setForm(p => ({ ...p, available_quantity: e.target.value }))} min="0" className={inputClass} />
          )}
          {field('الحالة',
            <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))} className={inputClass}>
              <option value="active">نشط</option>
              <option value="available">متاح</option>
              <option value="frozen">مجمد</option>
              <option value="depleted">مستنفد</option>
            </select>
          )}
          {field('إخفاء من المطابقة',
            <select value={form.hide_from_matching ? 'true' : 'false'} onChange={e => setForm(p => ({ ...p, hide_from_matching: e.target.value === 'true' }))} className={inputClass}>
              <option value="false">لا</option>
              <option value="true">نعم</option>
            </select>
          )}
        </div>
        {field('ملاحظات الإدارة (اختياري)',
          <textarea value={form.admin_notes} onChange={e => setForm(p => ({ ...p, admin_notes: e.target.value }))} rows={3} className={`${inputClass} resize-none`} placeholder="ملاحظات داخلية..." />
        )}
      </div>

      <div className="flex justify-end gap-2">
        <button onClick={onBack} className="px-4 py-2 text-[13px] font-bold text-[#4a7a94] bg-[#f0f6fa] rounded-xl hover:bg-[#e2edf5] transition-colors">إلغاء</button>
        <button
          onClick={handle}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2 text-[13px] font-bold text-white rounded-xl transition-all disabled:opacity-60"
          style={{ background: saved ? '#16a34a' : '#2563eb' }}
        >
          <Save className="w-4 h-4" />
          {saving ? 'جارٍ الحفظ...' : saved ? 'تم الحفظ' : 'حفظ التغييرات'}
        </button>
      </div>
    </div>
  );
}
