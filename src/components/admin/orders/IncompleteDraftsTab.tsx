import { useState } from 'react';
import { Eye, Trash2, MessageCircle, Clock } from 'lucide-react';
import type { OrderDraft } from '../../../hooks/useAdminOrders';

interface Props {
  drafts: OrderDraft[];
  onDelete: (draftId: string) => Promise<{ success: boolean; error?: string }>;
}

export default function IncompleteDraftsTab({ drafts, onDelete }: Props) {
  const [selectedDraft, setSelectedDraft] = useState<OrderDraft | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const handleDelete = async (draftId: string) => {
    const result = await onDelete(draftId);
    if (result.success) {
      setShowDeleteConfirm(null);
    }
  };

  const getStepLabel = (step: string) => {
    const labels: Record<string, string> = {
      form: 'إدخال البيانات',
      auth: 'المصادقة',
      matching: 'المطابقة',
      result: 'النتيجة'
    };
    return labels[step] || step;
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">رقم الهاتف</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">نوع الطبلية</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">المقاس</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">الكمية</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">المدينة</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">المرحلة المتوقفة</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">نسبة الإكمال</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">تاريخ الإنشاء</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">ينتهي في</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {drafts.map((draft) => {
                const data = draft.draft_data || {};
                const daysLeft = Math.ceil((new Date(draft.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

                return (
                  <tr key={draft.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="text-sm font-mono font-medium text-gray-900">{draft.phone}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{data.palletType || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{data.size || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {data.quantity ? data.quantity.toLocaleString('ar-SA') : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{data.city || '-'}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-50 text-yellow-700">
                        {getStepLabel(draft.current_step)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 transition-all"
                            style={{ width: `${draft.completion_percentage}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-gray-600">
                          {draft.completion_percentage}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(draft.created_at).toLocaleDateString('ar-SA')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-sm">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        <span className={daysLeft <= 1 ? 'text-red-600 font-semibold' : 'text-gray-600'}>
                          {daysLeft} {daysLeft === 1 ? 'يوم' : 'أيام'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setSelectedDraft(draft)}
                          className="p-1.5 hover:bg-blue-50 rounded-lg transition-colors"
                          title="معاينة"
                        >
                          <Eye className="w-4 h-4 text-blue-600" />
                        </button>
                        <button
                          className="p-1.5 hover:bg-green-50 rounded-lg transition-colors"
                          title="التواصل"
                        >
                          <MessageCircle className="w-4 h-4 text-green-600" />
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(draft.id)}
                          className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                          title="حذف"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {drafts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">لا توجد مسودات غير مكتملة</p>
          </div>
        )}
      </div>

      {selectedDraft && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">تفاصيل المسودة</h3>
              <button
                onClick={() => setSelectedDraft(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500">رقم الهاتف</label>
                  <p className="font-semibold text-gray-900">{selectedDraft.phone}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">المرحلة الحالية</label>
                  <p className="font-semibold text-gray-900">{getStepLabel(selectedDraft.current_step)}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">نسبة الإكمال</label>
                  <p className="font-semibold text-gray-900">{selectedDraft.completion_percentage}%</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">آخر حقل مكتمل</label>
                  <p className="font-semibold text-gray-900">{selectedDraft.last_field_completed || '-'}</p>
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-500 block mb-2">البيانات المحفوظة</label>
                <div className="bg-gray-50 rounded-xl p-4">
                  <pre className="text-xs text-gray-700 font-mono whitespace-pre-wrap">
                    {JSON.stringify(selectedDraft.draft_data, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">تأكيد الحذف</h3>
            <p className="text-gray-600 mb-6">هل أنت متأكد من حذف هذه المسودة؟</p>
            <div className="flex gap-3">
              <button
                onClick={() => handleDelete(showDeleteConfirm)}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors"
              >
                حذف
              </button>
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
