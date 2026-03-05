import type { InventoryFormData } from '../../types/inventory';

interface Props {
  form: InventoryFormData;
}

export default function DepositingScreen({ form }: Props) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-8">
      <div className="relative mb-8">
        <div className="w-24 h-24 rounded-full border-4 border-[#EBF5FF] flex items-center justify-center">
          <div className="w-20 h-20 rounded-full border-4 border-[#1a4a5e]/15 flex items-center justify-center">
            <div className="w-14 h-14 rounded-full border-4 border-[#1a4a5e] border-t-transparent animate-spin" />
          </div>
        </div>
        <div className="absolute -top-1 -right-1 w-5 h-5 bg-[#27AE60] rounded-full animate-pulse" />
        <div
          className="absolute -bottom-1 -left-1 w-4 h-4 bg-[#2196F3] rounded-full animate-pulse"
          style={{ animationDelay: '0.6s' }}
        />
      </div>

      <h2 className="text-[20px] font-bold text-[#1a4a5e] text-center mb-2">
        جاري إيداع الدفعة...
      </h2>
      <p className="text-[13px] text-[#7a9aab] text-center leading-relaxed">
        يتم الآن ربط دفعتك بالمستودع السحابي
        <br />
        وتفعيلها ضمن الشبكة الوطنية
      </p>

      <div className="mt-10 w-full bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
        <p className="text-[11px] text-[#a0b5c0] text-right mb-2">تفاصيل الدفعة</p>
        <div className="space-y-1.5">
          {[
            { label: 'النوع', value: form.palletType },
            { label: 'المقاس', value: form.size },
            { label: 'الجودة', value: form.quality ? `Grade ${form.quality}` : '' },
            { label: 'الكمية', value: `${form.quantity.toLocaleString('ar-SA')} طبلية` },
            { label: 'المدينة', value: form.city },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between items-center">
              <span className="text-[12px] text-[#7a9aab]">{value}</span>
              <span className="text-[12px] font-bold text-[#1a4a5e]">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
