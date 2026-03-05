import { ArrowRight, Package, Coins, DollarSign, Loader2, MessageCircle } from 'lucide-react';
import { useSupplierFinanceProfile } from '../../../hooks/useFinance';

interface Props {
  phone: string;
  onBack: () => void;
}

function sendWhatsApp(phone: string) {
  const cleanPhone = phone.replace(/^0/, '966');
  const msg = encodeURIComponent(
    'مرحبًا\nيوجد عمولة مستحقة للمنصة مقابل صفقات الطبليات الأخيرة.\nنرجو تسويتها في أقرب وقت ممكن.\nشاكرين تعاونكم.'
  );
  window.open(`https://wa.me/${cleanPhone}?text=${msg}`, '_blank');
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function SupplierFinancialProfile({ phone, onBack }: Props) {
  const { profile, loading } = useSupplierFinanceProfile(phone);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-7 h-7 text-[#1a4a5e] animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-16">
        <p className="text-[13px] text-[#7a9aab]">لا توجد بيانات لهذا المورد</p>
        <button onClick={onBack} className="mt-4 text-[13px] text-[#1a4a5e] font-semibold hover:underline">
          رجوع
        </button>
      </div>
    );
  }

  const pendingCommission = profile.deals
    .filter(d => d.status === 'pending')
    .reduce((s, d) => s + d.commission, 0);

  return (
    <div>
      <button
        onClick={onBack}
        className="flex items-center gap-2 mb-5 text-[13px] font-semibold text-[#1a4a5e] hover:text-[#0d3348] transition-colors"
      >
        <ArrowRight className="w-4 h-4" />
        العودة لقائمة العمولات
      </button>

      <div className="bg-white rounded-2xl border border-[#e2edf5] p-5 mb-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => sendWhatsApp(phone)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#E8F8F0] text-[#16a34a] text-[11px] font-semibold rounded-lg hover:bg-[#dcfce7] transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              واتساب
            </button>
          </div>
          <div className="text-right">
            <h3 className="text-[17px] font-bold text-[#1a2f3e]">{profile.display_name}</h3>
            <p className="text-[12px] text-[#7a9aab]">{profile.city || 'غير محدد'}</p>
            <p className="text-[11px] text-[#b0c5d0] mt-0.5 font-mono" dir="ltr">{profile.phone}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'إجمالي الطبليات', value: profile.total_pallets.toLocaleString('ar-SA'), icon: Package, color: '#1a4a5e', bg: '#EBF5FF' },
            { label: 'إجمالي المبيعات', value: `${profile.total_sales.toLocaleString('ar-SA')} ريال`, icon: DollarSign, color: '#0369A1', bg: '#E0F2FE' },
            { label: 'إجمالي العمولة', value: `${profile.total_commission.toLocaleString('ar-SA')} ريال`, icon: Coins, color: '#B8860B', bg: '#FFFBEB' },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="rounded-xl p-3 border border-[#e2edf5]" style={{ background: bg }}>
              <Icon className="w-4 h-4 mb-2" style={{ color }} />
              <p className="text-[15px] font-bold text-[#1a2f3e]">{value}</p>
              <p className="text-[10px] text-[#7a9aab] mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {pendingCommission > 0 && (
          <div className="mt-4 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] p-3 flex items-center justify-between">
            <span className="text-[14px] font-bold text-[#B8860B]">
              {pendingCommission.toLocaleString('ar-SA')} ريال
            </span>
            <span className="text-[12px] text-[#92400E]">عمولة مستحقة حالياً</span>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-[#e2edf5] overflow-hidden">
        <div className="px-5 py-3 border-b border-[#e2edf5]">
          <h4 className="text-[14px] font-bold text-[#1a2f3e]">سجل الصفقات</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="bg-[#f0f6fa]">
                {['رقم الصفقة', 'المدينة', 'عدد الطبليات', 'العمولة', 'التاريخ', 'الحالة'].map(col => (
                  <th key={col} className="px-4 py-3 text-right text-[11px] font-semibold text-[#4a7a94]">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {profile.deals.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-[13px] text-[#7a9aab]">
                    لا توجد صفقات مسجلة
                  </td>
                </tr>
              ) : (
                profile.deals.map((deal) => (
                  <tr key={deal.id} className="border-t border-[#edf4f9] hover:bg-[#f7fbfd] transition-colors">
                    <td className="px-4 py-3 text-[12px] font-mono text-[#1a4a5e] font-semibold">{deal.deal_ref}</td>
                    <td className="px-4 py-3 text-[12px] text-[#4a7a94]">{deal.city}</td>
                    <td className="px-4 py-3 text-[13px] font-bold text-[#1a2f3e]">{deal.quantity.toLocaleString('ar-SA')}</td>
                    <td className="px-4 py-3 text-[12px] font-semibold text-[#B8860B]">{deal.commission.toLocaleString('ar-SA')} ريال</td>
                    <td className="px-4 py-3 text-[12px] text-[#7a9aab]">{formatDate(deal.date)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                        deal.status === 'settled'
                          ? 'bg-[#F0FDF4] text-[#16a34a]'
                          : 'bg-[#FFFBEB] text-[#B8860B]'
                      }`}>
                        {deal.status === 'settled' ? 'مسددة' : 'مستحقة'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
