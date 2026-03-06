import { Filter, Search } from 'lucide-react';
import { useState } from 'react';
import type { OrderOperation } from '../../../hooks/useAdminOrders';

interface Props {
  operations: OrderOperation[];
}

const OPERATION_LABELS: Record<string, string> = {
  created: 'إنشاء الطلب',
  modified: 'تعديل الطلب',
  published: 'نشر الطلب',
  matched: 'بدء المطابقة',
  cancelled: 'إلغاء الطلب',
  deal_created: 'إنشاء صفقة',
  expired: 'انتهاء الصلاحية'
};

const OPERATION_COLORS: Record<string, { bg: string; text: string }> = {
  created: { bg: '#DBEAFE', text: '#1E40AF' },
  modified: { bg: '#FEF3C7', text: '#92400E' },
  published: { bg: '#D1FAE5', text: '#065F46' },
  matched: { bg: '#E0E7FF', text: '#3730A3' },
  cancelled: { bg: '#FEE2E2', text: '#991B1B' },
  deal_created: { bg: '#ECFDF5', text: '#059669' },
  expired: { bg: '#F3F4F6', text: '#6B7280' }
};

const PERFORMED_BY_LABELS: Record<string, string> = {
  user: 'المستخدم',
  admin: 'الإدارة',
  system: 'النظام'
};

export default function OperationsLogTab({ operations }: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [operationFilter, setOperationFilter] = useState<string>('all');

  const filteredOperations = operations.filter(op => {
    const matchesSearch =
      op.request_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      op.buyer_phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      op.buyer_name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesOperation = operationFilter === 'all' || op.operation_type === operationFilter;

    return matchesSearch && matchesOperation;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="بحث برقم الطلب أو رقم الهاتف..."
            className="w-full pr-10 pl-4 py-2.5 border border-gray-200 rounded-xl text-sm text-right"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={operationFilter}
            onChange={(e) => setOperationFilter(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm"
          >
            <option value="all">جميع العمليات</option>
            <option value="created">إنشاء الطلب</option>
            <option value="modified">تعديل الطلب</option>
            <option value="published">نشر الطلب</option>
            <option value="matched">بدء المطابقة</option>
            <option value="cancelled">إلغاء الطلب</option>
            <option value="deal_created">إنشاء صفقة</option>
            <option value="expired">انتهاء الصلاحية</option>
          </select>
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
        <p className="text-sm text-yellow-800">
          <strong>ملاحظة:</strong> سجل العمليات غير قابل للتعديل أو الحذف ويتم حفظه بشكل دائم لأغراض التدقيق والمراجعة.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">العملية</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">رقم الطلب</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">المشتري</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">المدينة</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">الكمية</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">المنفذ</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">التاريخ والوقت</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">ملاحظات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredOperations.map((op) => (
                <tr key={op.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <span
                      className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                      style={{
                        backgroundColor: OPERATION_COLORS[op.operation_type]?.bg || '#F3F4F6',
                        color: OPERATION_COLORS[op.operation_type]?.text || '#6B7280'
                      }}
                    >
                      {OPERATION_LABELS[op.operation_type] || op.operation_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-[#1a4a5e]">
                    {op.request_id || '-'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-gray-900">{op.buyer_name || '-'}</div>
                    <div className="text-xs text-gray-500 font-mono">{op.buyer_phone || '-'}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{op.city || '-'}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                    {op.quantity ? op.quantity.toLocaleString('ar-SA') : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-gray-900">{PERFORMED_BY_LABELS[op.performed_by_type]}</div>
                    {op.performed_by_phone && (
                      <div className="text-xs text-gray-500 font-mono">{op.performed_by_phone}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-gray-700">
                      {new Date(op.created_at).toLocaleDateString('ar-SA')}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(op.created_at).toLocaleTimeString('ar-SA', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">
                    {op.notes || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredOperations.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">لا توجد عمليات مسجلة</p>
          </div>
        )}
      </div>
    </div>
  );
}
