import { useState } from 'react';
import { ArrowRight, Save } from 'lucide-react';
import type { City } from '../../../../hooks/useMarket';

interface Props {
  city: City;
  onSave: (id: string, updates: Partial<City>) => Promise<unknown>;
  onBack: () => void;
}

export default function CityEditPage({ city, onSave, onBack }: Props) {
  const [form, setForm] = useState({
    name: city.name,
    status: city.status,
    custom_fee_override: city.custom_fee_override != null ? String(city.custom_fee_override) : '',
    minimum_quantity: String(city.minimum_quantity),
    matching_enabled: city.matching_enabled,
    notes: city.notes ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handle = async () => {
    setSaving(true);
    await onSave(city.id, {
      name: form.name,
      status: form.status,
      custom_fee_override: form.custom_fee_override !== '' ? Number(form.custom_fee_override) : null,
      minimum_quantity: Number(form.minimum_quantity) || 1,
      matching_enabled: form.matching_enabled,
      notes: form.notes || null,
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const field = (label: string, node: React.ReactNode) => (
    <div className="space-y-1.5">
      <label className="text-[12px] font-bold text-[#4a7a94]">{label}</label>
      {node}
    </div>
  );

  const inputClass = "w-full px-3 py-2 text-[13px] bg-white border border-[#e2edf5] rounded-xl text-[#1a2f3e] focus:outline-none focus:border-[#2563eb] transition-colors";

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-xl bg-[#f0f6fa] text-[#4a7a94] hover:bg-[#e2edf5] transition-colors">
          <ArrowRight className="w-4 h-4" />
        </button>
        <h3 className="text-[17px] font-black text-[#1a2f3e]">تعديل: {city.name}</h3>
      </div>

      <div className="bg-white rounded-2xl border border-[#e2edf5] p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {field('اسم المدينة',
            <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className={inputClass} />
          )}
          {field('الحالة',
            <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))} className={inputClass}>
              <option value="active">نشطة</option>
              <option value="monitoring">مراقبة</option>
              <option value="pilot">تجريبي</option>
              <option value="frozen">مجمدة</option>
            </select>
          )}
          {field('رسوم مخصصة % (اختياري)',
            <input type="number" value={form.custom_fee_override} onChange={e => setForm(p => ({ ...p, custom_fee_override: e.target.value }))} placeholder="افتراضي" min="0" max="100" step="0.1" className={inputClass} />
          )}
          {field('الحد الأدنى للكمية',
            <input type="number" value={form.minimum_quantity} onChange={e => setForm(p => ({ ...p, minimum_quantity: e.target.value }))} min="1" className={inputClass} />
          )}
          {field('تفعيل المطابقة',
            <select value={form.matching_enabled ? 'true' : 'false'} onChange={e => setForm(p => ({ ...p, matching_enabled: e.target.value === 'true' }))} className={inputClass}>
              <option value="true">مفعلة</option>
              <option value="false">متوقفة</option>
            </select>
          )}
        </div>
        {field('ملاحظات (اختياري)',
          <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={3} className={`${inputClass} resize-none`} placeholder="أضف ملاحظات..." />
        )}
      </div>

      <div className="flex justify-end gap-2">
        <button onClick={onBack} className="px-4 py-2 text-[13px] font-bold text-[#4a7a94] bg-[#f0f6fa] rounded-xl hover:bg-[#e2edf5] transition-colors">
          إلغاء
        </button>
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
