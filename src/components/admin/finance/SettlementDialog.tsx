import { useState } from 'react';
import { X, Banknote, CreditCard, FileText } from 'lucide-react';
import type { SettlementMethod } from '../../../types/admin';

interface Props {
  supplierName: string;
  commissionAmount: number;
  onConfirm: (method: SettlementMethod, staff: string) => void;
  onClose: () => void;
  loading?: boolean;
}

const methods: { id: SettlementMethod; label: string; icon: typeof CreditCard }[] = [
  { id: 'bank_transfer', label: 'تحويل بنكي', icon: CreditCard },
  { id: 'cash', label: 'نقدي', icon: Banknote },
  { id: 'manual', label: 'تسوية يدوية', icon: FileText },
];

export default function SettlementDialog({ supplierName, commissionAmount, onConfirm, onClose, loading }: Props) {
  const [method, setMethod] = useState<SettlementMethod>('bank_transfer');
  const [staff, setStaff] = useState('');

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl" dir="rtl">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="text-[15px] font-bold text-[#1a2f3e]">تأكيد التسوية</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4 text-[#7a9aab]" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div className="bg-[#f7fbfd] rounded-xl p-4 border border-[#e2edf5]">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[13px] font-bold text-[#1a4a5e]">
                {commissionAmount.toLocaleString('ar-SA')} ريال
              </span>
              <span className="text-[12px] text-[#7a9aab]">المبلغ</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[13px] text-[#1a2f3e]">{supplierName}</span>
              <span className="text-[12px] text-[#7a9aab]">المورد</span>
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-[#1a2f3e] mb-2">طريقة التسوية</label>
            <div className="grid grid-cols-3 gap-2">
              {methods.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setMethod(id)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                    method === id
                      ? 'border-[#1a4a5e] bg-[#EBF5FF]'
                      : 'border-[#e2edf5] hover:border-[#c5d8e4]'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${method === id ? 'text-[#1a4a5e]' : 'text-[#7a9aab]'}`} />
                  <span className={`text-[11px] font-semibold ${method === id ? 'text-[#1a4a5e]' : 'text-[#7a9aab]'}`}>
                    {label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-[#1a2f3e] mb-2">اسم الموظف</label>
            <input
              type="text"
              value={staff}
              onChange={(e) => setStaff(e.target.value)}
              placeholder="أدخل اسم الموظف المسؤول"
              className="w-full px-4 py-2.5 rounded-xl border border-[#d0e5f2] text-[13px] text-[#1a2f3e] focus:outline-none focus:border-[#1a4a5e] bg-white placeholder:text-[#b0c5d0]"
            />
          </div>
        </div>

        <div className="flex gap-3 p-5 border-t border-gray-100">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border-2 border-[#e2edf5] text-[#7a9aab] font-semibold text-[13px] rounded-xl hover:bg-gray-50 transition-colors"
          >
            إلغاء
          </button>
          <button
            onClick={() => onConfirm(method, staff || 'staff')}
            disabled={loading}
            className="flex-1 py-2.5 bg-[#16a34a] text-white font-semibold text-[13px] rounded-xl hover:bg-[#15803d] transition-colors disabled:opacity-50"
          >
            {loading ? 'جاري التسوية...' : 'تأكيد التسوية'}
          </button>
        </div>
      </div>
    </div>
  );
}
