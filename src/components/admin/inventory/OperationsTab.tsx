import { useState } from 'react';
import { Activity, TrendingUp, Package, DollarSign, Layers, Search, Filter, X, Trash2, CheckSquare, Square, AlertTriangle } from 'lucide-react';
import { useInventoryOperations } from '../../../hooks/useInventoryOperations';

interface Props {
  adminEmail: string;
}

const OPERATION_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  inventory_created: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  quantity_increased: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  quantity_decreased: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  price_updated: { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200' },
  status_changed: { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' },
};

const OPERATION_LABELS: Record<string, string> = {
  inventory_created: 'إنشاء مخزون',
  quantity_increased: 'زيادة كمية',
  quantity_decreased: 'تقليل كمية',
  price_updated: 'تعديل سعر',
  status_changed: 'تغيير حالة',
};

export default function OperationsTab({ adminEmail }: Props) {
  const { operations, analytics, loading, deleteOperations, deleteAllOperations } = useInventoryOperations(adminEmail);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [showConfirmAll, setShowConfirmAll] = useState(false);
  const [showConfirmSelected, setShowConfirmSelected] = useState(false);

  const filteredOperations = operations.filter(op => {
    if (filterType !== 'all' && op.operation_type !== filterType) return false;
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        op.supplier_phone?.toLowerCase().includes(search) ||
        op.city?.toLowerCase().includes(search) ||
        op.pallet_type?.toLowerCase().includes(search) ||
        op.pallet_size?.toLowerCase().includes(search)
      );
    }
    return true;
  });

  const allFilteredSelected = filteredOperations.length > 0 && filteredOperations.every(op => selectedIds.has(op.id));
  const someSelected = selectedIds.size > 0;

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      const newSet = new Set(selectedIds);
      filteredOperations.forEach(op => newSet.delete(op.id));
      setSelectedIds(newSet);
    } else {
      const newSet = new Set(selectedIds);
      filteredOperations.forEach(op => newSet.add(op.id));
      setSelectedIds(newSet);
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const handleDeleteSelected = async () => {
    setDeleting(true);
    setShowConfirmSelected(false);
    const result = await deleteOperations(Array.from(selectedIds));
    if (result.success) setSelectedIds(new Set());
    setDeleting(false);
  };

  const handleDeleteAll = async () => {
    setDeleting(true);
    setShowConfirmAll(false);
    await deleteAllOperations();
    setSelectedIds(new Set());
    setDeleting(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Confirm Delete All Modal */}
      {showConfirmAll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm mx-4 w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="font-bold text-slate-900 text-lg">حذف كل السجل</p>
                <p className="text-sm text-slate-500">سيتم حذف جميع العمليات ({operations.length} سجل) بشكل نهائي</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleDeleteAll}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors"
              >
                نعم، احذف الكل
              </button>
              <button
                onClick={() => setShowConfirmAll(false)}
                className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Selected Modal */}
      {showConfirmSelected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm mx-4 w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="font-bold text-slate-900 text-lg">حذف المحدد</p>
                <p className="text-sm text-slate-500">سيتم حذف {selectedIds.size} سجل محدد بشكل نهائي</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleDeleteSelected}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors"
              >
                نعم، احذف
              </button>
              <button
                onClick={() => setShowConfirmSelected(false)}
                className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Analytics Summary */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-4">ملخص النشاط اليومي</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg border-2 border-green-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">مخزونات جديدة اليوم</p>
                <p className="text-3xl font-bold text-green-700 mt-1">{analytics?.today_created || 0}</p>
              </div>
              <Package className="w-10 h-10 text-green-500" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border-2 border-blue-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">تعديلات اليوم</p>
                <p className="text-3xl font-bold text-blue-700 mt-1">{analytics?.today_updates || 0}</p>
              </div>
              <Activity className="w-10 h-10 text-blue-500" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg border-2 border-orange-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600 font-medium">إيقافات اليوم</p>
                <p className="text-3xl font-bold text-orange-700 mt-1">{analytics?.today_deactivated || 0}</p>
              </div>
              <TrendingUp className="w-10 h-10 text-orange-500" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg border-2 border-slate-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 font-medium">صفقات خفضت الكمية</p>
                <p className="text-3xl font-bold text-slate-700 mt-1">{analytics?.deals_reduced || 0}</p>
              </div>
              <DollarSign className="w-10 h-10 text-slate-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Market Insights */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-4">تحليل السوق</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-blue-600" />
              الأكثر في الصفقات
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 bg-slate-50 rounded">
                <span className="text-xs text-slate-600">أكثر نوع تم بيعه</span>
                <span className="text-sm font-bold text-slate-900">{analytics?.top_type_deals || 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-slate-50 rounded">
                <span className="text-xs text-slate-600">أكثر مقاس تم بيعه</span>
                <span className="text-sm font-bold text-slate-900">{analytics?.top_size_deals || 'N/A'}</span>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <Layers className="w-4 h-4 text-green-600" />
              الأكثر في المخزون
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 bg-slate-50 rounded">
                <span className="text-xs text-slate-600">أكثر نوع معروض</span>
                <span className="text-sm font-bold text-slate-900">{analytics?.top_type_active || 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-slate-50 rounded">
                <span className="text-xs text-slate-600">أكثر مقاس معروض</span>
                <span className="text-sm font-bold text-slate-900">{analytics?.top_size_active || 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="بحث برقم الهاتف، المدينة، النوع، أو المقاس..."
              className="w-full pr-10 pl-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">جميع العمليات</option>
            <option value="inventory_created">إنشاء مخزون</option>
            <option value="quantity_increased">زيادة كمية</option>
            <option value="quantity_decreased">تقليل كمية</option>
            <option value="price_updated">تعديل سعر</option>
            <option value="status_changed">تغيير حالة</option>
          </select>
          {(searchTerm || filterType !== 'all') && (
            <button
              onClick={() => { setSearchTerm(''); setFilterType('all'); }}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
            >
              <X className="w-4 h-4" />
              إلغاء التصفية
            </button>
          )}
        </div>
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Filter className="w-4 h-4" />
            <span>{filteredOperations.length} عملية</span>
            {someSelected && (
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">
                {selectedIds.size} محدد
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {someSelected && (
              <button
                onClick={() => setShowConfirmSelected(true)}
                disabled={deleting}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm font-bold hover:bg-red-100 transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                حذف المحدد ({selectedIds.size})
              </button>
            )}
            {operations.length > 0 && (
              <button
                onClick={() => setShowConfirmAll(true)}
                disabled={deleting}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                حذف الكل
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Operations Log */}
      <div className="bg-white rounded-lg border border-slate-200">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">سجل العمليات</h2>
          {filteredOperations.length > 0 && (
            <button
              onClick={toggleSelectAll}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors hover:bg-slate-50"
              style={{ borderColor: allFilteredSelected ? '#2563eb' : '#e2e8f0', color: allFilteredSelected ? '#2563eb' : '#64748b' }}
            >
              {allFilteredSelected
                ? <CheckSquare className="w-4 h-4" />
                : <Square className="w-4 h-4" />
              }
              {allFilteredSelected ? 'إلغاء تحديد الكل' : 'تحديد الكل'}
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-3 py-3 text-right text-xs font-medium text-slate-600 w-10">
                  <button onClick={toggleSelectAll} className="flex items-center justify-center">
                    {allFilteredSelected
                      ? <CheckSquare className="w-4 h-4 text-blue-600" />
                      : <Square className="w-4 h-4 text-slate-400" />
                    }
                  </button>
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-600">العملية</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-600">المورد</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-600">المدينة</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-600">النوع</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-600">المقاس</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-600">الكمية</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-600">التفاصيل</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-600">الوقت</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredOperations.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                    لا توجد عمليات
                  </td>
                </tr>
              ) : (
                filteredOperations.map((operation) => {
                  const colors = OPERATION_COLORS[operation.operation_type] || OPERATION_COLORS.status_changed;
                  const isSelected = selectedIds.has(operation.id);
                  return (
                    <tr
                      key={operation.id}
                      className={`hover:bg-slate-50 transition-colors cursor-pointer ${isSelected ? 'bg-blue-50' : ''}`}
                      onClick={() => toggleSelect(operation.id)}
                    >
                      <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => toggleSelect(operation.id)}
                          className="flex items-center justify-center"
                        >
                          {isSelected
                            ? <CheckSquare className="w-4 h-4 text-blue-600" />
                            : <Square className="w-4 h-4 text-slate-300" />
                          }
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors.bg} ${colors.text} border ${colors.border}`}>
                          {OPERATION_LABELS[operation.operation_type] || operation.operation_type}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-slate-700 font-medium">{operation.supplier_phone || '-'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-slate-700">{operation.city || '-'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-slate-700">{operation.pallet_type || '-'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-medium text-slate-900">{operation.pallet_size || '-'}</span>
                      </td>
                      <td className="px-4 py-3">
                        {operation.quantity_affected > 0 ? (
                          <span className={`text-sm font-bold ${
                            operation.operation_type === 'quantity_increased' ? 'text-green-600'
                            : operation.operation_type === 'quantity_decreased' ? 'text-orange-600'
                            : 'text-slate-700'
                          }`}>
                            {operation.operation_type === 'quantity_increased' && '+'}
                            {operation.operation_type === 'quantity_decreased' && '-'}
                            {operation.quantity_affected}
                          </span>
                        ) : (
                          <span className="text-sm text-slate-500">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs text-slate-600 space-y-0.5">
                          {operation.quantity_before !== null && operation.quantity_after !== null && (
                            <div>الكمية: {operation.quantity_before} → {operation.quantity_after}</div>
                          )}
                          {operation.price_before !== null && operation.price_after !== null && (
                            <div>السعر: {operation.price_before} → {operation.price_after} ريال</div>
                          )}
                          {operation.deal_id && (
                            <div className="text-blue-600 font-medium">صفقة مرتبطة</div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs text-slate-600">
                          {new Date(operation.created_at).toLocaleDateString('ar-SA')}
                          <br />
                          {new Date(operation.created_at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
