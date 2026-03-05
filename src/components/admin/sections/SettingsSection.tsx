import { useState } from 'react';
import { Settings, Shield, ShoppingBag, Warehouse, Zap, Check, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import type { SettingsTab } from '../../../types/admin';
import { getPlatformFee, updatePlatformFee } from '../../../hooks/useFinance';
import { usePlatformSettings } from '../../../hooks/usePlatformSettings';
import type { PlatformSettings } from '../../../hooks/usePlatformSettings';
import { useEffect } from 'react';

const feePresets = [0, 0.25, 0.50, 1.00, 1.50, 2.00];

const tabs: { id: SettingsTab; label: string; icon: typeof Settings }[] = [
  { id: 'general', label: 'عام', icon: Settings },
  { id: 'requests', label: 'الطلبات', icon: ShoppingBag },
  { id: 'inventory', label: 'المخزون', icon: Warehouse },
  { id: 'matching', label: 'المطابقة', icon: Zap },
  { id: 'roles', label: 'الأدوار', icon: Shield },
];

function SaveButton({ saving, saved, onClick }: { saving: boolean; saved: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={saving}
      className="flex items-center gap-1.5 px-4 py-2 bg-[#1a4a5e] text-white text-[12px] font-semibold rounded-lg hover:bg-[#153d50] transition-colors disabled:opacity-50"
    >
      {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : saved ? <Check className="w-3.5 h-3.5" /> : null}
      {saved ? 'تم الحفظ' : 'حفظ'}
    </button>
  );
}

function ToggleSwitch({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`relative w-10 h-5.5 rounded-full transition-colors flex-shrink-0 ${value ? 'bg-[#1a4a5e]' : 'bg-gray-200'}`}
      style={{ width: 40, height: 22 }}
    >
      <span
        className={`absolute top-0.5 w-[18px] h-[18px] rounded-full bg-white shadow-sm transition-transform ${value ? 'translate-x-5' : 'translate-x-0.5'}`}
      />
    </button>
  );
}

function SettingRow({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5 border-b border-[#f0f6fa] last:border-0" dir="rtl">
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-[#1a2f3e]">{label}</p>
        {hint && <p className="text-[11px] text-[#7a9aab] mt-0.5 leading-relaxed">{hint}</p>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#f7fbfd] rounded-xl border border-[#e2edf5] overflow-hidden">
      <div className="px-4 py-3 border-b border-[#e2edf5] bg-[#f0f6fa]">
        <h4 className="text-[13px] font-bold text-[#1a2f3e]">{title}</h4>
      </div>
      <div className="px-4">{children}</div>
    </div>
  );
}

function GeneralSettings() {
  const [fee, setFee] = useState<number>(1);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loadingFee, setLoadingFee] = useState(true);

  useEffect(() => {
    getPlatformFee().then(v => { setFee(v); setLoadingFee(false); });
  }, []);

  const handleSaveFee = async () => {
    setSaving(true);
    const ok = await updatePlatformFee(fee);
    setSaving(false);
    if (ok) { setSaved(true); setTimeout(() => setSaved(false), 2000); }
  };

  return (
    <div className="space-y-4">
      <Card title="عمولة المنصة">
        <div className="py-3 space-y-3">
          <p className="text-[11px] text-[#7a9aab] leading-relaxed">
            المبلغ المقتطع عن كل طبلية في الصفقات الجديدة. الصفقات السابقة تحتفظ بالعمولة المسجلة وقت إنشائها.
          </p>
          {loadingFee ? (
            <div className="flex items-center gap-2 py-2"><Loader2 className="w-4 h-4 text-[#1a4a5e] animate-spin" /></div>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                {feePresets.map(p => (
                  <button
                    key={p}
                    onClick={() => setFee(p)}
                    className={`px-3 py-1.5 rounded-xl text-[12px] font-semibold border-2 transition-all ${fee === p ? 'border-[#1a4a5e] bg-[#1a4a5e] text-white' : 'border-[#e2edf5] text-[#4a7a94] hover:border-[#c5d8e4]'}`}
                  >
                    {p === 0 ? 'مجاناً' : `${p} ريال`}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="number" step="0.01" min="0" value={fee}
                  onChange={e => setFee(Math.max(0, Number(e.target.value)))}
                  className="w-28 px-3 py-2 rounded-lg border border-[#d0e5f2] text-[13px] text-[#1a2f3e] focus:outline-none focus:border-[#1a4a5e] bg-white"
                />
                <span className="text-[12px] text-[#7a9aab]">ريال / طبلية</span>
                <SaveButton saving={saving} saved={saved} onClick={handleSaveFee} />
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}

function RequestsSettings() {
  const { settings, loading, updateSetting } = usePlatformSettings();
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [localMinQty, setLocalMinQty] = useState(50);
  const [localMaxQty, setLocalMaxQty] = useState(5000);
  const [localExpiryDays, setLocalExpiryDays] = useState(7);
  const [localNotifyCount, setLocalNotifyCount] = useState(10);

  useEffect(() => {
    if (!loading) {
      setLocalMinQty(settings.request_creation.min_quantity);
      setLocalMaxQty(settings.request_creation.max_quantity);
      setLocalExpiryDays(settings.request_creation.expiry_days);
      setLocalNotifyCount(settings.request_creation.notify_top_suppliers);
    }
  }, [loading, settings]);

  const save = async (key: string, value: unknown) => {
    setSaving(key);
    await updateSetting('request_creation', key, value);
    setSaving(null);
    setSaved(key);
    setTimeout(() => setSaved(null), 2000);
  };

  const toggleType = async (type: string) => {
    const current = settings.request_creation.allowed_types;
    const next = current.includes(type as 'standard') ? current.filter(t => t !== type) : [...current, type];
    if (next.length === 0) return;
    await save('allowed_types', next);
  };

  const toggleField = async (field: string, key: 'show' | 'required', val: boolean) => {
    const cfg = { ...settings.request_creation.fields_config };
    (cfg as Record<string, { show: boolean; required: boolean }>)[field] = {
      ...(cfg as Record<string, { show: boolean; required: boolean }>)[field],
      [key]: val,
    };
    await save('fields_config', cfg);
  };

  if (loading) return <div className="flex items-center gap-2 py-8 justify-center"><Loader2 className="w-5 h-5 animate-spin text-[#1a4a5e]" /></div>;

  const fieldLabels: Record<string, string> = {
    pallet_type: 'نوع الطبلية',
    size: 'المقاس',
    quality: 'الجودة',
    quantity: 'الكمية',
    city: 'المدينة',
  };

  const typeLabels: Record<string, string> = {
    standard: 'طلب عادي',
    urgent: 'طلب عاجل',
    recurring: 'توريد دوري',
  };

  return (
    <div className="space-y-4">
      <Card title="حدود الكمية">
        <SettingRow label="الحد الأدنى" hint="أقل كمية مسموح بها في الطلب الواحد">
          <div className="flex items-center gap-2">
            <input type="number" value={localMinQty} min={1} onChange={e => setLocalMinQty(+e.target.value)}
              className="w-24 px-2 py-1.5 rounded-lg border border-[#d0e5f2] text-[13px] text-right bg-white focus:outline-none focus:border-[#1a4a5e]" />
            <span className="text-[11px] text-[#7a9aab]">طبلية</span>
            <button onClick={() => save('min_quantity', localMinQty)} disabled={saving === 'min_quantity'}
              className="px-3 py-1.5 bg-[#1a4a5e] text-white text-[11px] rounded-lg">
              {saving === 'min_quantity' ? <Loader2 className="w-3 h-3 animate-spin" /> : saved === 'min_quantity' ? <Check className="w-3 h-3" /> : 'حفظ'}
            </button>
          </div>
        </SettingRow>
        <SettingRow label="الحد الأقصى" hint="أكبر كمية مسموح بها في الطلب الواحد">
          <div className="flex items-center gap-2">
            <input type="number" value={localMaxQty} min={1} onChange={e => setLocalMaxQty(+e.target.value)}
              className="w-24 px-2 py-1.5 rounded-lg border border-[#d0e5f2] text-[13px] text-right bg-white focus:outline-none focus:border-[#1a4a5e]" />
            <span className="text-[11px] text-[#7a9aab]">طبلية</span>
            <button onClick={() => save('max_quantity', localMaxQty)} disabled={saving === 'max_quantity'}
              className="px-3 py-1.5 bg-[#1a4a5e] text-white text-[11px] rounded-lg">
              {saving === 'max_quantity' ? <Loader2 className="w-3 h-3 animate-spin" /> : saved === 'max_quantity' ? <Check className="w-3 h-3" /> : 'حفظ'}
            </button>
          </div>
        </SettingRow>
      </Card>

      <Card title="انتهاء الطلب">
        <SettingRow label="مدة صلاحية الطلب" hint="عدد الأيام قبل إلغاء الطلب تلقائياً">
          <div className="flex items-center gap-2">
            {[3, 7, 14, 30].map(d => (
              <button key={d} onClick={() => save('expiry_days', d)}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold border transition-all ${localExpiryDays === d ? 'bg-[#1a4a5e] text-white border-[#1a4a5e]' : 'bg-white text-[#4a7a94] border-[#e2edf5]'}`}
                style={{ minWidth: 36 }}>
                {d}د
              </button>
            ))}
          </div>
        </SettingRow>
      </Card>

      <Card title="أنواع الطلبات المتاحة">
        {Object.entries(typeLabels).map(([type, label]) => (
          <SettingRow key={type} label={label}>
            <ToggleSwitch
              value={settings.request_creation.allowed_types.includes(type as 'standard')}
              onChange={() => toggleType(type)}
            />
          </SettingRow>
        ))}
      </Card>

      <Card title="إعدادات حقول النموذج">
        <div className="py-1">
          <div className="grid grid-cols-3 text-[11px] font-semibold text-[#7a9aab] py-2 border-b border-[#f0f6fa]" dir="rtl">
            <span>الحقل</span>
            <span className="text-center">مرئي</span>
            <span className="text-center">إلزامي</span>
          </div>
          {Object.entries(fieldLabels).map(([field, label]) => {
            const cfg = (settings.request_creation.fields_config as Record<string, { show: boolean; required: boolean }>)[field] ?? { show: true, required: true };
            return (
              <div key={field} className="grid grid-cols-3 items-center py-2.5 border-b border-[#f0f6fa] last:border-0" dir="rtl">
                <span className="text-[12px] font-medium text-[#1a2f3e]">{label}</span>
                <div className="flex justify-center">
                  <ToggleSwitch value={cfg.show} onChange={v => toggleField(field, 'show', v)} />
                </div>
                <div className="flex justify-center">
                  <ToggleSwitch value={cfg.required && cfg.show} onChange={v => cfg.show && toggleField(field, 'required', v)} />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card title="إشعارات الموردين">
        <SettingRow label="عدد الموردين المُخطَرين" hint="عدد أفضل الموردين الذين يتلقون إشعاراً عند طلب جديد">
          <div className="flex items-center gap-2">
            {[5, 10, 20, 50].map(n => (
              <button key={n} onClick={() => save('notify_top_suppliers', n)}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold border transition-all ${localNotifyCount === n ? 'bg-[#1a4a5e] text-white border-[#1a4a5e]' : 'bg-white text-[#4a7a94] border-[#e2edf5]'}`}>
                {n}
              </button>
            ))}
          </div>
        </SettingRow>
      </Card>
    </div>
  );
}

function InventorySettings() {
  const { settings, loading, updateSetting } = usePlatformSettings();
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [localMinQty, setLocalMinQty] = useState(10);
  const [localMaxQty, setLocalMaxQty] = useState(10000);
  const [localMaxImages, setLocalMaxImages] = useState(5);
  const [localMaxSizeMb, setLocalMaxSizeMb] = useState(5);

  useEffect(() => {
    if (!loading) {
      setLocalMinQty(settings.inventory_submission.min_quantity);
      setLocalMaxQty(settings.inventory_submission.max_quantity);
      setLocalMaxImages(settings.inventory_images.max_images);
      setLocalMaxSizeMb(settings.inventory_images.max_size_mb);
    }
  }, [loading, settings]);

  const save = async (group: keyof PlatformSettings, key: string, value: unknown) => {
    setSaving(`${group}.${key}`);
    await updateSetting(group, key, value);
    setSaving(null);
    setSaved(`${group}.${key}`);
    setTimeout(() => setSaved(null), 2000);
  };

  const toggleField = async (field: string, key: 'show' | 'required', val: boolean) => {
    const cfg = { ...settings.inventory_submission.fields_config };
    (cfg as Record<string, { show: boolean; required: boolean }>)[field] = {
      ...(cfg as Record<string, { show: boolean; required: boolean }>)[field],
      [key]: val,
    };
    await save('inventory_submission', 'fields_config', cfg);
  };

  const toggleFormat = async (fmt: string) => {
    const current = settings.inventory_images.allowed_formats;
    const next = current.includes(fmt) ? current.filter(f => f !== fmt) : [...current, fmt];
    if (next.length === 0) return;
    await save('inventory_images', 'allowed_formats', next);
  };

  if (loading) return <div className="flex items-center gap-2 py-8 justify-center"><Loader2 className="w-5 h-5 animate-spin text-[#1a4a5e]" /></div>;

  const fieldLabels: Record<string, string> = {
    pallet_type: 'نوع الطبلية',
    size: 'المقاس',
    quality: 'الجودة',
    quantity: 'الكمية',
    city: 'المدينة',
    description: 'الوصف',
  };

  return (
    <div className="space-y-4">
      <Card title="حدود الكمية">
        <SettingRow label="الحد الأدنى">
          <div className="flex items-center gap-2">
            <input type="number" value={localMinQty} onChange={e => setLocalMinQty(+e.target.value)}
              className="w-24 px-2 py-1.5 rounded-lg border border-[#d0e5f2] text-[13px] text-right bg-white focus:outline-none" />
            <span className="text-[11px] text-[#7a9aab]">طبلية</span>
            <button onClick={() => save('inventory_submission', 'min_quantity', localMinQty)}
              className="px-3 py-1.5 bg-[#1a4a5e] text-white text-[11px] rounded-lg">
              {saving === 'inventory_submission.min_quantity' ? <Loader2 className="w-3 h-3 animate-spin" /> : saved === 'inventory_submission.min_quantity' ? <Check className="w-3 h-3" /> : 'حفظ'}
            </button>
          </div>
        </SettingRow>
        <SettingRow label="الحد الأقصى">
          <div className="flex items-center gap-2">
            <input type="number" value={localMaxQty} onChange={e => setLocalMaxQty(+e.target.value)}
              className="w-24 px-2 py-1.5 rounded-lg border border-[#d0e5f2] text-[13px] text-right bg-white focus:outline-none" />
            <span className="text-[11px] text-[#7a9aab]">طبلية</span>
            <button onClick={() => save('inventory_submission', 'max_quantity', localMaxQty)}
              className="px-3 py-1.5 bg-[#1a4a5e] text-white text-[11px] rounded-lg">
              {saving === 'inventory_submission.max_quantity' ? <Loader2 className="w-3 h-3 animate-spin" /> : saved === 'inventory_submission.max_quantity' ? <Check className="w-3 h-3" /> : 'حفظ'}
            </button>
          </div>
        </SettingRow>
      </Card>

      <Card title="وضع الموافقة">
        {[
          { value: 'auto_publish', label: 'نشر فوري', desc: 'يُنشر المخزون مباشرةً بعد التسجيل' },
          { value: 'require_approval', label: 'يحتاج موافقة إدارية', desc: 'يُراجع المخزون قبل ظهوره في السوق' },
        ].map(opt => (
          <SettingRow key={opt.value} label={opt.label} hint={opt.desc}>
            <button
              onClick={() => save('inventory_submission', 'approval_mode', opt.value)}
              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${settings.inventory_submission.approval_mode === opt.value ? 'border-[#1a4a5e] bg-[#1a4a5e]' : 'border-gray-300'}`}
            >
              {settings.inventory_submission.approval_mode === opt.value && (
                <div className="w-2 h-2 rounded-full bg-white" />
              )}
            </button>
          </SettingRow>
        ))}
      </Card>

      <Card title="وصف المخزون">
        <SettingRow label="تفعيل حقل الوصف" hint="السماح للموردين بإضافة وصف نصي للدفعة">
          <ToggleSwitch
            value={settings.inventory_submission.description_enabled}
            onChange={v => save('inventory_submission', 'description_enabled', v)}
          />
        </SettingRow>
      </Card>

      <Card title="إعدادات حقول النموذج">
        <div className="py-1">
          <div className="grid grid-cols-3 text-[11px] font-semibold text-[#7a9aab] py-2 border-b border-[#f0f6fa]" dir="rtl">
            <span>الحقل</span>
            <span className="text-center">مرئي</span>
            <span className="text-center">إلزامي</span>
          </div>
          {Object.entries(fieldLabels).map(([field, label]) => {
            const cfg = (settings.inventory_submission.fields_config as Record<string, { show: boolean; required: boolean }>)[field] ?? { show: true, required: false };
            return (
              <div key={field} className="grid grid-cols-3 items-center py-2.5 border-b border-[#f0f6fa] last:border-0" dir="rtl">
                <span className="text-[12px] font-medium text-[#1a2f3e]">{label}</span>
                <div className="flex justify-center">
                  <ToggleSwitch value={cfg.show} onChange={v => toggleField(field, 'show', v)} />
                </div>
                <div className="flex justify-center">
                  <ToggleSwitch value={cfg.required && cfg.show} onChange={v => cfg.show && toggleField(field, 'required', v)} />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card title="إعدادات الصور">
        <SettingRow label="تفعيل رفع الصور" hint="السماح للموردين برفع صور للمخزون">
          <ToggleSwitch
            value={settings.inventory_images.enabled}
            onChange={v => save('inventory_images', 'enabled', v)}
          />
        </SettingRow>
        <SettingRow label="الحد الأقصى للصور">
          <div className="flex items-center gap-2">
            {[1, 3, 5, 10].map(n => (
              <button key={n} onClick={() => save('inventory_images', 'max_images', n)}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold border transition-all ${settings.inventory_images.max_images === n ? 'bg-[#1a4a5e] text-white border-[#1a4a5e]' : 'bg-white text-[#4a7a94] border-[#e2edf5]'}`}>
                {n}
              </button>
            ))}
          </div>
        </SettingRow>
        <SettingRow label="الحد الأقصى لحجم الصورة">
          <div className="flex items-center gap-2">
            {[2, 5, 10].map(n => (
              <button key={n} onClick={() => save('inventory_images', 'max_size_mb', n)}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold border transition-all ${settings.inventory_images.max_size_mb === n ? 'bg-[#1a4a5e] text-white border-[#1a4a5e]' : 'bg-white text-[#4a7a94] border-[#e2edf5]'}`}>
                {n}MB
              </button>
            ))}
          </div>
        </SettingRow>
        <SettingRow label="صيغ الصور المقبولة">
          <div className="flex items-center gap-2">
            {['jpg', 'png', 'webp'].map(fmt => (
              <button key={fmt} onClick={() => toggleFormat(fmt)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase border transition-all ${settings.inventory_images.allowed_formats.includes(fmt) ? 'bg-[#1a4a5e] text-white border-[#1a4a5e]' : 'bg-white text-[#4a7a94] border-[#e2edf5]'}`}>
                {fmt}
              </button>
            ))}
          </div>
        </SettingRow>
      </Card>
    </div>
  );
}

function MatchingSettings() {
  const { settings, loading, updateSetting } = usePlatformSettings();

  const save = async (key: string, value: unknown) => {
    await updateSetting('matching_engine', key, value);
  };

  const saveTrust = async (key: string, value: unknown) => {
    await updateSetting('trust_settings', key, value);
  };

  if (loading) return <div className="flex items-center gap-2 py-8 justify-center"><Loader2 className="w-5 h-5 animate-spin text-[#1a4a5e]" /></div>;

  return (
    <div className="space-y-4">
      <Card title="مستوى المطابقة">
        {[
          { value: 'strict', label: 'صارمة', desc: 'مطابقة دقيقة لجميع المعايير' },
          { value: 'flexible', label: 'مرنة', desc: 'قبول قدر من التباين في الجودة والموقع' },
          { value: 'open', label: 'مفتوحة', desc: 'توسيع البحث بشكل أكبر لزيادة فرص التطابق' },
        ].map(opt => (
          <SettingRow key={opt.value} label={opt.label} hint={opt.desc}>
            <button
              onClick={() => save('matching_level', opt.value)}
              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${settings.matching_engine.matching_level === opt.value ? 'border-[#1a4a5e] bg-[#1a4a5e]' : 'border-gray-300'}`}
            >
              {settings.matching_engine.matching_level === opt.value && <div className="w-2 h-2 rounded-full bg-white" />}
            </button>
          </SettingRow>
        ))}
      </Card>

      <Card title="مطابقة المدينة">
        {[
          { value: 'same_city', label: 'نفس المدينة فقط' },
          { value: 'same_region', label: 'نفس المنطقة' },
          { value: 'all_cities', label: 'جميع المدن' },
        ].map(opt => (
          <SettingRow key={opt.value} label={opt.label}>
            <button
              onClick={() => save('city_matching', opt.value)}
              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${settings.matching_engine.city_matching === opt.value ? 'border-[#1a4a5e] bg-[#1a4a5e]' : 'border-gray-300'}`}
            >
              {settings.matching_engine.city_matching === opt.value && <div className="w-2 h-2 rounded-full bg-white" />}
            </button>
          </SettingRow>
        ))}
      </Card>

      <Card title="مطابقة الجودة">
        {[
          { value: 'exact', label: 'مطابقة تامة فقط' },
          { value: 'allow_lower', label: 'قبول درجة جودة أدنى' },
        ].map(opt => (
          <SettingRow key={opt.value} label={opt.label}>
            <button
              onClick={() => save('quality_matching', opt.value)}
              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${settings.matching_engine.quality_matching === opt.value ? 'border-[#1a4a5e] bg-[#1a4a5e]' : 'border-gray-300'}`}
            >
              {settings.matching_engine.quality_matching === opt.value && <div className="w-2 h-2 rounded-full bg-white" />}
            </button>
          </SettingRow>
        ))}
      </Card>

      <Card title="إعدادات متقدمة">
        <SettingRow label="السماح بالتوريد الجزئي" hint="قبول تطابق جزئي للكمية المطلوبة">
          <ToggleSwitch value={settings.matching_engine.allow_partial} onChange={v => save('allow_partial', v)} />
        </SettingRow>
        <SettingRow label="دمج موردين متعددين" hint="دمج مخزون أكثر من مورد لتلبية طلب واحد">
          <ToggleSwitch value={settings.matching_engine.allow_aggregation} onChange={v => save('allow_aggregation', v)} />
        </SettingRow>
        <SettingRow label="توسيع البحث تلقائياً" hint="ساعات الانتظار قبل توسيع معايير البحث">
          <div className="flex items-center gap-2">
            {[6, 12, 24, 48].map(h => (
              <button key={h} onClick={() => save('auto_expand_hours', h)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all ${settings.matching_engine.auto_expand_hours === h ? 'bg-[#1a4a5e] text-white border-[#1a4a5e]' : 'bg-white text-[#4a7a94] border-[#e2edf5]'}`}>
                {h}س
              </button>
            ))}
          </div>
        </SettingRow>
      </Card>

      <Card title="أولوية الثقة">
        <SettingRow label="تقديم الموردين الموثوقين" hint="إعطاء أولوية للموردين ذوي التقييم الأعلى في نتائج المطابقة">
          <ToggleSwitch value={settings.trust_settings.prioritize_trust} onChange={v => saveTrust('prioritize_trust', v)} />
        </SettingRow>
        {settings.trust_settings.prioritize_trust && (
          <SettingRow label="الحد الأدنى للتقييم للأولوية">
            <div className="flex items-center gap-1.5">
              {[3, 4, 5].map(n => (
                <button key={n} onClick={() => saveTrust('min_trust_for_priority', n)}
                  className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold border transition-all ${settings.trust_settings.min_trust_for_priority === n ? 'bg-[#1a4a5e] text-white border-[#1a4a5e]' : 'bg-white text-[#4a7a94] border-[#e2edf5]'}`}>
                  {n}★
                </button>
              ))}
            </div>
          </SettingRow>
        )}
      </Card>
    </div>
  );
}

function RolesSettings() {
  return (
    <div className="space-y-4">
      <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-xl px-4 py-3">
        <p className="text-[12px] text-[#92400E]">إدارة الأدوار والصلاحيات متاحة في قسم المستخدمين → الأدوار والصلاحيات.</p>
      </div>
    </div>
  );
}

export default function SettingsSection() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');

  return (
    <div className="p-5 space-y-5" dir="rtl">
      <div>
        <h2 className="text-xl font-bold text-[#1a2f3e] mb-1">الإعدادات</h2>
        <p className="text-sm text-[#7a9aab]">إدارة سلوك المنصة ديناميكياً — تؤثر التغييرات فوراً على تجربة المستخدم</p>
      </div>

      <div className="flex gap-1.5 border-b border-[#e2edf5] overflow-x-auto no-scrollbar">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-[12px] font-semibold rounded-t-xl transition-all border-b-2 whitespace-nowrap flex-shrink-0 ${
              activeTab === id
                ? 'text-[#1a4a5e] border-[#1a4a5e] bg-white'
                : 'text-[#7a9aab] border-transparent hover:text-[#1a4a5e]'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'general' && <GeneralSettings />}
      {activeTab === 'requests' && <RequestsSettings />}
      {activeTab === 'inventory' && <InventorySettings />}
      {activeTab === 'matching' && <MatchingSettings />}
      {activeTab === 'roles' && <RolesSettings />}
    </div>
  );
}
