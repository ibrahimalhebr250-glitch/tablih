import { ArrowRight, Package, DollarSign, Snowflake, Calendar } from 'lucide-react';
import type { InventoryBatch } from '../../../../hooks/useMarket';

interface Props {
  batch: InventoryBatch;
  onBack: () => void;
}

const QUALITY_LABELS: Record<string, string> = {
  A: 'ممتازة (A)',
  B: 'جيدة (B)',
  C: 'استخدام خفيف (C)',
  scrap: 'خردة',
};

const TYPE_LABELS: Record<string, string> = {
  wooden: 'خشبية',
  plastic: 'بلاستيكية',
  recycled: 'معاد تدويرها',
};

function StatCard({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: typeof Package; color: string }) {
  return (
    <div className="bg-white rounded-2xl border border-[#e2edf5] p-4 space-y-2">
      <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${color}18` }}>
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <p className="text-[20px] font-black text-[#1a2f3e] leading-none">{typeof value === 'number' ? value.toLocaleString('ar-SA') : value}</p>
      <p className="text-[11px] text-[#7a9aab] font-semibold">{label}</p>
    </div>
  );
}

export default function InventoryViewPage({ batch, onBack }: Props) {
  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-xl bg-[#f0f6fa] text-[#4a7a94] hover:bg-[#e2edf5] transition-colors">
          <ArrowRight className="w-4 h-4" />
        </button>
        <div>
          <h3 className="text-[17px] font-black text-[#1a2f3e]">{batch.batch_id}</h3>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[11px] text-[#7a9aab]">{batch.city}</span>
            {batch.is_frozen && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#f1f5f9] text-[#64748b]">
                <Snowflake className="w-3 h-3" /> مجمدة
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="الكمية الكلية" value={batch.quantity_total || batch.quantity} icon={Package} color="#2563eb" />
        <StatCard label="المتاح" value={batch.available_quantity} icon={Package} color="#16a34a" />
        <StatCard label="المحجوز" value={batch.quantity_reserved || batch.reserved_quantity} icon={Package} color="#ca8a04" />
        <StatCard label="السعر الأدنى" value={`${batch.min_price} ر.س`} icon={DollarSign} color="#7c3aed" />
      </div>

      <div className="bg-white rounded-2xl border border-[#e2edf5] p-5 space-y-3">
        <p className="text-[13px] font-bold text-[#4a7a94]">المواصفات الكاملة</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-[13px]">
          <div><span className="text-[#7a9aab]">نوع الطبلية: </span><span className="font-bold text-[#1a2f3e]">{TYPE_LABELS[batch.pallet_type] ?? batch.pallet_type}</span></div>
          <div><span className="text-[#7a9aab]">المقاس: </span><span className="font-bold text-[#1a2f3e]">{batch.size}</span></div>
          <div><span className="text-[#7a9aab]">الجودة: </span><span className="font-bold text-[#1a2f3e]">{QUALITY_LABELS[batch.quality] ?? batch.quality}</span></div>
          <div><span className="text-[#7a9aab]">الحالة: </span><span className="font-bold text-[#1a2f3e]">{batch.status}</span></div>
          <div><span className="text-[#7a9aab]">المورد (هاتف): </span><span className="font-bold text-[#1a2f3e]">{batch.phone ?? '—'}</span></div>
          <div><span className="text-[#7a9aab]">مخفي من المطابقة: </span><span className="font-bold" style={{ color: batch.hide_from_matching ? '#dc2626' : '#16a34a' }}>{batch.hide_from_matching ? 'نعم' : 'لا'}</span></div>
        </div>
        {batch.admin_notes && (
          <div className="pt-3 border-t border-[#f0f6fa]">
            <p className="text-[11px] text-[#7a9aab] mb-1">ملاحظات الإدارة</p>
            <p className="text-[13px] text-[#1a2f3e]">{batch.admin_notes}</p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-[#e2edf5] p-4">
        <div className="flex items-center gap-2 text-[12px] text-[#7a9aab]">
          <Calendar className="w-4 h-4" />
          <span>أُضيف: {new Date(batch.created_at).toLocaleString('ar-SA')}</span>
          <span className="mx-2">·</span>
          <span>آخر تحديث: {new Date(batch.updated_at).toLocaleString('ar-SA')}</span>
        </div>
      </div>
    </div>
  );
}
