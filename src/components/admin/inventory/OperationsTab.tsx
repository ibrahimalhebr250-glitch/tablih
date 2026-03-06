import { useState } from 'react';
import { Activity, TrendingUp, Package, DollarSign, Users, Layers, Search, Filter, X } from 'lucide-react';
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
  const { operations, analytics, loading } = useInventoryOperations(adminEmail);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Analytics Summary */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-4">ملخص النشاط اليومي</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg border-2 border-green-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">مخزونات جديدة اليوم</p>
                <p className="text-3xl font-bold text-green-700 mt-1">
                  {analytics?.today_created || 0}
                </p>
              </div>
              <Package className="w-10 h-10 text-green-500" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border-2 border-blue-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">تعديلات اليوم</p>
                <p className="text-3xl font-bold text-blue-700 mt-1">
                  {analytics?.today_updates || 0}
                </p>
              </div>
              <Activity className="w-10 h-10 text-blue-500" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg border-2 border-orange-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600 font-medium">إيقافات اليوم</p>
                <p className="text-3xl font-bold text-orange-700 mt-1">
                  {analytics?.today_deactivated || 0}
                </p>
              </div>
              <TrendingUp className="w-10 h-10 text-orange-500" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border-2 border-purple-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 font-medium">صفقات خفضت الكمية</p>
                <p className="text-3xl font-bold text-purple-700 mt-1">
                  {analytics?.deals_reduced || 0}
                </p>
              </div>
              <DollarSign className="w-10 h-10 text-purple-500" />
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
              onClick={() => {
                setSearchTerm('');
                setFilterType('all');
              }}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
            >
              <X className="w-4 h-4" />
              إلغاء التصفية
            </button>
          )}
        </div>

        <div className="mt-3 flex items-center gap-2 text-sm text-slate-600">
          <Filter className="w-4 h-4" />
          <span>{filteredOperations.length} عملية</span>
        </div>
      </div>

      {/* Operations Log */}
      <div className="bg-white rounded-lg border border-slate-200">
        <div className="p-4 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-900">سجل العمليات</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
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
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                    لا توجد عمليات
                  </td>
                </tr>
              ) : (
                filteredOperations.map((operation) => {
                  const colors = OPERATION_COLORS[operation.operation_type] || OPERATION_COLORS.status_changed;
                  return (
                    <tr key={operation.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors.bg} ${colors.text} border ${colors.border}`}>
                          {OPERATION_LABELS[operation.operation_type] || operation.operation_type}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-slate-700 font-medium">
                          {operation.supplier_phone || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-slate-700">
                          {operation.city || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-slate-700">
                          {operation.pallet_type || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-medium text-slate-900">
                          {operation.pallet_size || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {operation.quantity_affected > 0 ? (
                          <div className="text-sm">
                            <span className={`font-bold ${
                              operation.operation_type === 'quantity_increased'
                                ? 'text-green-600'
                                : operation.operation_type === 'quantity_decreased'
                                ? 'text-orange-600'
                                : 'text-slate-700'
                            }`}>
                              {operation.operation_type === 'quantity_increased' && '+'}
                              {operation.operation_type === 'quantity_decreased' && '-'}
                              {operation.quantity_affected}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-slate-500">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs text-slate-600 space-y-0.5">
                          {operation.quantity_before !== null && operation.quantity_after !== null && (
                            <div>
                              الكمية: {operation.quantity_before} → {operation.quantity_after}
                            </div>
                          )}
                          {operation.price_before !== null && operation.price_after !== null && (
                            <div>
                              السعر: {operation.price_before} → {operation.price_after} ريال
                            </div>
                          )}
                          {operation.deal_id && (
                            <div className="text-purple-600 font-medium">
                              صفقة مرتبطة
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs text-slate-600">
                          {new Date(operation.created_at).toLocaleDateString('ar-SA')}
                          <br />
                          {new Date(operation.created_at).toLocaleTimeString('ar-SA', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
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
