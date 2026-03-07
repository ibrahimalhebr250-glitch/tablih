import { Filter, Search, RefreshCw, Trash2, AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import type { OrderOperation } from '../../../hooks/useAdminOrders';

interface Props {
  operations: OrderOperation[];
  onRefresh?: () => void;
  onDeleteOperation?: (operationId: string) => Promise<{ success: boolean; error?: string }>;
  onClearAll?: () => Promise<{ success: boolean; error?: string; message?: string }>;
}

const OPERATION_LABELS: Record<string, string> = {
  created: 'إنشاء الطلب',
  modified: 'تعديل الطلب',
  published: 'نشر الطلب',
  matched: 'بدء المطابقة',
  cancelled: 'إلغاء الطلب',
  deal_created: 'إنشاء صفقة',
  expired: 'انتهاء الصلاحية',
  deleted: 'حذف الطلب'
};

const OPERATION_COLORS: Record<string, { bg: string; text: string }> = {
  created: { bg: '#DBEAFE', text: '#1E40AF' },
  modified: { bg: '#FEF3C7', text: '#92400E' },
  published: { bg: '#D1FAE5', text: '#065F46' },
  matched: { bg: '#E0E7FF', text: '#3730A3' },
  cancelled: { bg: '#FEE2E2', text: '#991B1B' },
  deal_created: { bg: '#ECFDF5', text: '#059669' },
  expired: { bg: '#F3F4F6', text: '#6B7280' },
  deleted: { bg: '#FEE2E2', text: '#991B1B' }
};

const PERFORMED_BY_LABELS: Record<string, string> = {
  user: 'المستخدم',
  admin: 'الإدارة',
  system: 'النظام'
};

export default function OperationsLogTab({ operations, onRefresh, onDeleteOperation, onClearAll }: Props) {
  console.log('📝 OperationsLogTab - عدد العمليات:', operations.length);
  console.log('📝 بيانات العمليات:', operations);

  const [searchTerm, setSearchTerm] = useState('');
  const [operationFilter, setOperationFilter] = useState<string>('all');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);

  const filteredOperations = operations.filter(op => {
    const matchesSearch =
      op.request_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      op.buyer_phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      op.buyer_name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesOperation = operationFilter === 'all' || op.operation_type === operationFilter;

    return matchesSearch && matchesOperation;
  });

  const handleDeleteOperation = async (operationId: string) => {
    if (!onDeleteOperation) return;
    if (!confirm('هل أنت متأكد من حذف هذا السجل؟')) return;

    setDeletingId(operationId);
    const result = await onDeleteOperation(operationId);
    setDeletingId(null);

    if (!result.success) {
      alert(result.error || 'فشل حذف السجل');
    }
  };

  const handleClearAll = async () => {
    if (!onClearAll) return;

    setClearing(true);
    const result = await onClearAll();
    setClearing(false);
    setShowClearConfirm(false);

    if (result.success) {
      alert(result.message || 'تم مسح جميع السجلات بنجاح');
    } else {
      alert(result.error || 'فشل مسح السجلات');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">سجل العمليات</h3>
        <div className="flex items-center gap-2">
          {onClearAll && (
            <button
              onClick={() => setShowClearConfirm(true)}
              disabled={operations.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-xl hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-4 h-4" />
              <span className="text-sm">مسح الجميع</span>
            </button>
          )}
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span className="text-sm">تحديث</span>
            </button>
          )}
        </div>
      </div>

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
            <option value="deleted">حذف الطلب</option>
          </select>
        </div>
      </div>

      {showClearConfirm && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-red-900 mb-2">تحذير: مسح جميع السجلات</h4>
              <p className="text-sm text-red-800 mb-4">
                هل أنت متأكد من حذف جميع سجلات العمليات ({operations.length} سجل)؟ هذا الإجراء لا يمكن التراجع عنه.
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleClearAll}
                  disabled={clearing}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 text-sm font-medium"
                >
                  {clearing ? 'جاري المسح...' : 'تأكيد المسح'}
                </button>
                <button
                  onClick={() => setShowClearConfirm(false)}
                  disabled={clearing}
                  className="px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-sm text-blue-800">
          <strong>ملاحظة:</strong> جميع البيانات تجريبية ويمكن حذفها للاختبار. في بيئة الإنتاج، يتم حفظ السجلات بشكل دائم.
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
                {onDeleteOperation && (
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">إجراءات</th>
                )}
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
                  {onDeleteOperation && (
                    <td className="px-4 py-3">
                      <div className="flex justify-center">
                        <button
                          onClick={() => handleDeleteOperation(op.id)}
                          disabled={deletingId === op.id}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                          title="حذف السجل"
                        >
                          {deletingId === op.id ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  )}
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
