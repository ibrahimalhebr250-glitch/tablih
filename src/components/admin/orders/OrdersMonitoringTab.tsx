import { useState } from 'react';
import { Eye, CreditCard as Edit2, Pause, Trash2, MessageCircle, ExternalLink, Search, Filter, CheckSquare, Square, XSquare, Loader2 } from 'lucide-react';
import type { OrderWithDetails } from '../../../hooks/useAdminOrders';

interface Props {
  orders: OrderWithDetails[];
  onUpdate: (orderId: string, updates: any) => Promise<{ success: boolean; error?: string }>;
  onDelete: (orderId: string) => Promise<{ success: boolean; error?: string }>;
}

const STAGE_LABELS: Record<string, string> = {
  form: 'إدخال البيانات',
  auth: 'المصادقة',
  matching: 'المطابقة',
  result: 'عرض النتائج',
  completed: 'مكتمل'
};

const STAGE_COLORS: Record<string, { bg: string; text: string }> = {
  form: { bg: '#FEF3C7', text: '#92400E' },
  auth: { bg: '#DBEAFE', text: '#1E40AF' },
  matching: { bg: '#E0E7FF', text: '#3730A3' },
  result: { bg: '#D1FAE5', text: '#065F46' },
  completed: { bg: '#D1FAE5', text: '#065F46' }
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'قيد الانتظار',
  matched: 'تمت المطابقة',
  unmatched: 'غير مطابق',
  partially_matched: 'مطابقة جزئية',
  executed: 'تم التنفيذ',
  fulfilled: 'منفّذ',
  cancelled: 'ملغي'
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending: { bg: '#FEF3C7', text: '#92400E' },
  matched: { bg: '#D1FAE5', text: '#065F46' },
  unmatched: { bg: '#FEE2E2', text: '#991B1B' },
  partially_matched: { bg: '#DBEAFE', text: '#1E40AF' },
  executed: { bg: '#E0E7FF', text: '#3730A3' },
  fulfilled: { bg: '#D1FAE5', text: '#065F46' },
  cancelled: { bg: '#F3F4F6', text: '#6B7280' }
};

const SOURCE_LABELS: Record<string, string> = {
  normal: 'طلب عادي',
  market: 'من السوق',
};

const SOURCE_COLORS: Record<string, { bg: string; text: string }> = {
  normal: { bg: '#F0F9FF', text: '#0369A1' },
  market: { bg: '#FFF7ED', text: '#C2410C' },
};

export default function OrdersMonitoringTab({ orders, onUpdate, onDelete }: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<OrderWithDetails | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const filteredOrders = orders.filter(order => {
    const matchesSearch =
      order.request_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.buyer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.phone?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStage = stageFilter === 'all' || order.current_stage === stageFilter;
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    const matchesSource = sourceFilter === 'all' || (order.order_source || 'normal') === sourceFilter;

    return matchesSearch && matchesStage && matchesStatus && matchesSource;
  });

  const handleDelete = async (orderId: string) => {
    setDeletingId(orderId);
    const result = await onDelete(orderId);
    if (result.success) {
      setShowDeleteConfirm(null);
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.delete(orderId);
        return next;
      });
    }
    setDeletingId(null);
  };

  const handleBulkDelete = async () => {
    setBulkDeleting(true);
    const ids = Array.from(selectedIds);
    for (const id of ids) {
      await onDelete(id);
    }
    setSelectedIds(new Set());
    setShowBulkDeleteConfirm(false);
    setBulkDeleting(false);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredOrders.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredOrders.map(o => o.id)));
    }
  };

  const allSelected = filteredOrders.length > 0 && selectedIds.size === filteredOrders.length;
  const someSelected = selectedIds.size > 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="بحث برقم الطلب أو اسم المشتري أو رقم الهاتف..."
            className="w-full pr-10 pl-4 py-2.5 border border-gray-200 rounded-xl text-sm text-right"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm"
          >
            <option value="all">جميع المراحل</option>
            <option value="form">إدخال البيانات</option>
            <option value="auth">المصادقة</option>
            <option value="matching">المطابقة</option>
            <option value="result">عرض النتائج</option>
            <option value="completed">مكتمل</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm"
          >
            <option value="all">جميع الحالات</option>
            <option value="pending">قيد الانتظار</option>
            <option value="matched">تمت المطابقة</option>
            <option value="unmatched">غير مطابق</option>
            <option value="partially_matched">مطابقة جزئية</option>
            <option value="fulfilled">منفّذ</option>
            <option value="cancelled">ملغي</option>
          </select>
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm"
          >
            <option value="all">جميع المصادر</option>
            <option value="normal">طلب عادي</option>
            <option value="market">من السوق</option>
          </select>
        </div>
      </div>

      {someSelected && (
        <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl" dir="rtl">
          <CheckSquare className="w-5 h-5 text-red-600" />
          <span className="text-sm font-semibold text-red-700">
            تم تحديد {selectedIds.size} طلب
          </span>
          <div className="flex-1" />
          <button
            onClick={() => setSelectedIds(new Set())}
            className="px-3 py-1.5 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            إلغاء التحديد
          </button>
          <button
            onClick={() => setShowBulkDeleteConfirm(true)}
            className="px-3 py-1.5 text-xs font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            حذف المحدد ({selectedIds.size})
          </button>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-3 py-3 text-center w-10">
                  <button onClick={toggleSelectAll} className="p-0.5 hover:bg-gray-200 rounded transition-colors">
                    {allSelected ? (
                      <XSquare className="w-4.5 h-4.5 text-[#1a4a5e]" />
                    ) : (
                      <Square className="w-4.5 h-4.5 text-gray-400" />
                    )}
                  </button>
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">رقم الطلب</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">المشتري</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">نوع الطبلية</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">المقاس</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">الجودة</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">الكمية</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">المدينة</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">نوع الطلب</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">المصدر</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">المرحلة</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">الحالة</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">العروض</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">تاريخ الإنشاء</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredOrders.map((order) => {
                const isSelected = selectedIds.has(order.id);
                return (
                  <tr
                    key={order.id}
                    className={`transition-colors ${isSelected ? 'bg-blue-50/50' : 'hover:bg-gray-50'}`}
                  >
                    <td className="px-3 py-3 text-center">
                      <button onClick={() => toggleSelect(order.id)} className="p-0.5">
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-[#1a4a5e]" />
                        ) : (
                          <Square className="w-4 h-4 text-gray-300" />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-[#1a4a5e]">{order.request_id}</td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900">{order.buyer_name}</div>
                      <div className="text-xs text-gray-500 font-mono">{order.phone}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{order.pallet_type}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{order.size}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                        Grade {order.quality}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                      {order.quantity.toLocaleString('ar-SA')}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{order.city}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {order.order_type_code === 'standard' && 'طلب عادي'}
                      {order.order_type_code === 'urgent' && 'طلب عاجل'}
                      {order.order_type_code === 'recurring' && 'توريد دوري'}
                    </td>
                    <td className="px-4 py-3">
                      {(() => {
                        const src = order.order_source || 'normal';
                        const srcCfg = SOURCE_COLORS[src] || SOURCE_COLORS.normal;
                        return (
                          <span
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                            style={{ backgroundColor: srcCfg.bg, color: srcCfg.text }}
                          >
                            {SOURCE_LABELS[src] || src}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: STAGE_COLORS[order.current_stage]?.bg || '#F3F4F6',
                          color: STAGE_COLORS[order.current_stage]?.text || '#6B7280'
                        }}
                      >
                        {STAGE_LABELS[order.current_stage] || order.current_stage}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: STATUS_COLORS[order.status]?.bg || '#F3F4F6',
                          color: STATUS_COLORS[order.status]?.text || '#6B7280'
                        }}
                      >
                        {STATUS_LABELS[order.status] || order.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-50 text-green-700 font-bold text-sm">
                        {order.match_count || 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(order.created_at).toLocaleDateString('ar-SA')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="p-1.5 hover:bg-blue-50 rounded-lg transition-colors"
                          title="معاينة"
                        >
                          <Eye className="w-4 h-4 text-blue-600" />
                        </button>
                        <button
                          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                          title="تعديل"
                        >
                          <Edit2 className="w-4 h-4 text-gray-600" />
                        </button>
                        <button
                          className="p-1.5 hover:bg-yellow-50 rounded-lg transition-colors"
                          title="إيقاف"
                        >
                          <Pause className="w-4 h-4 text-yellow-600" />
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(order.id)}
                          className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                          title="حذف"
                          disabled={deletingId === order.id}
                        >
                          {deletingId === order.id ? (
                            <Loader2 className="w-4 h-4 text-red-400 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4 text-red-600" />
                          )}
                        </button>
                        <button
                          className="p-1.5 hover:bg-green-50 rounded-lg transition-colors"
                          title="التواصل"
                        >
                          <MessageCircle className="w-4 h-4 text-green-600" />
                        </button>
                        <button
                          className="p-1.5 hover:bg-teal-50 rounded-lg transition-colors"
                          title="الصفقات"
                        >
                          <ExternalLink className="w-4 h-4 text-teal-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredOrders.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">لا توجد طلبات</p>
          </div>
        )}
      </div>

      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">تفاصيل الطلب</h3>
              <button
                onClick={() => setSelectedOrder(null)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <span className="text-lg font-bold">X</span>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500">رقم الطلب</label>
                  <p className="font-semibold text-gray-900">{selectedOrder.request_id}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">المشتري</label>
                  <p className="font-semibold text-gray-900">{selectedOrder.buyer_name}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">نوع الطبلية</label>
                  <p className="font-semibold text-gray-900">{selectedOrder.pallet_type}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">المقاس</label>
                  <p className="font-semibold text-gray-900">{selectedOrder.size}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">الجودة</label>
                  <p className="font-semibold text-gray-900">Grade {selectedOrder.quality}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">الكمية</label>
                  <p className="font-semibold text-gray-900">{selectedOrder.quantity.toLocaleString('ar-SA')}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">المدينة</label>
                  <p className="font-semibold text-gray-900">{selectedOrder.city}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">المرحلة</label>
                  <p className="font-semibold text-gray-900">{STAGE_LABELS[selectedOrder.current_stage]}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">الحالة</label>
                  <p className="font-semibold text-gray-900">{STATUS_LABELS[selectedOrder.status] || selectedOrder.status}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">رقم الهاتف</label>
                  <p className="font-semibold text-gray-900 font-mono">{selectedOrder.phone}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">تاريخ الإنشاء</label>
                  <p className="font-semibold text-gray-900">{new Date(selectedOrder.created_at).toLocaleString('ar-SA')}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">عدد المطابقات</label>
                  <p className="font-semibold text-gray-900">{selectedOrder.match_count || 0}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">مصدر الطلب</label>
                  <p className="font-semibold text-gray-900">{SOURCE_LABELS[selectedOrder.order_source || 'normal'] || selectedOrder.order_source}</p>
                </div>
              </div>
              <div className="pt-4 border-t border-gray-100 flex gap-3">
                <button
                  onClick={() => {
                    setSelectedOrder(null);
                    setShowDeleteConfirm(selectedOrder.id);
                  }}
                  className="px-4 py-2 text-sm font-semibold text-red-600 bg-red-50 rounded-xl hover:bg-red-100 transition-colors flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  حذف الطلب
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">تأكيد الحذف</h3>
            <p className="text-gray-600 mb-6">هل أنت متأكد من حذف هذا الطلب؟ لا يمكن التراجع عن هذا الإجراء.</p>
            <div className="flex gap-3">
              <button
                onClick={() => handleDelete(showDeleteConfirm)}
                disabled={deletingId === showDeleteConfirm}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deletingId === showDeleteConfirm ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    جاري الحذف...
                  </>
                ) : (
                  'حذف'
                )}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(null)}
                disabled={deletingId === showDeleteConfirm}
                className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {showBulkDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-red-700 mb-2">تأكيد حذف {selectedIds.size} طلب</h3>
            <p className="text-gray-600 mb-6">
              سيتم حذف جميع الطلبات المحددة نهائيا. لا يمكن التراجع عن هذا الإجراء.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleBulkDelete}
                disabled={bulkDeleting}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {bulkDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    جاري الحذف...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    حذف الكل ({selectedIds.size})
                  </>
                )}
              </button>
              <button
                onClick={() => setShowBulkDeleteConfirm(false)}
                disabled={bulkDeleting}
                className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors disabled:opacity-50"
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
