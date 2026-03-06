import { Pause, Play, Eye } from 'lucide-react';
import type { RecurringOrder } from '../../../hooks/useAdminOrders';

interface Props {
  recurringOrders: RecurringOrder[];
  onPause: (id: string, reason?: string) => Promise<{ success: boolean; error?: string }>;
  onResume: (id: string) => Promise<{ success: boolean; error?: string }>;
}

export default function RecurringOrdersTab({ recurringOrders, onPause, onResume }: Props) {
  const getRecurrenceLabel = (type: string) => {
    const labels: Record<string, string> = {
      weekly: 'أسبوعي',
      monthly: 'شهري',
      custom: 'حسب جدول محدد'
    };
    return labels[type] || type;
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">المشتري</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">نوع التكرار</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">التنفيذ القادم</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">آخر تنفيذ</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">عدد التنفيذات</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">الحالة</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recurringOrders.map((ro) => (
                <tr key={ro.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-gray-900">{ro.buyer_phone}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                      {getRecurrenceLabel(ro.recurrence_type)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {ro.next_execution_at ? new Date(ro.next_execution_at).toLocaleDateString('ar-SA') : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {ro.last_execution_at ? new Date(ro.last_execution_at).toLocaleDateString('ar-SA') : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-700 font-bold text-sm">
                      {ro.execution_count}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {ro.is_active ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700">
                        نشط
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                        متوقف
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button className="p-1.5 hover:bg-blue-50 rounded-lg transition-colors" title="معاينة">
                        <Eye className="w-4 h-4 text-blue-600" />
                      </button>
                      {ro.is_active ? (
                        <button
                          onClick={() => onPause(ro.id)}
                          className="p-1.5 hover:bg-yellow-50 rounded-lg transition-colors"
                          title="إيقاف مؤقت"
                        >
                          <Pause className="w-4 h-4 text-yellow-600" />
                        </button>
                      ) : (
                        <button
                          onClick={() => onResume(ro.id)}
                          className="p-1.5 hover:bg-green-50 rounded-lg transition-colors"
                          title="استئناف"
                        >
                          <Play className="w-4 h-4 text-green-600" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {recurringOrders.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">لا توجد طلبات دورية</p>
          </div>
        )}
      </div>
    </div>
  );
}
