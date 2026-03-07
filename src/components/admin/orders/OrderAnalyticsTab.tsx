import { TrendingUp, Package, MapPin, Star, RefreshCw } from 'lucide-react';
import type { OrderAnalytics } from '../../../hooks/useAdminOrders';

interface Props {
  analytics: OrderAnalytics[];
  onRefresh?: () => void;
}

export default function OrderAnalyticsTab({ analytics, onRefresh }: Props) {
  const latestAnalytics = analytics[0];

  const totalOrders = analytics.reduce((sum, a) => sum + a.total_orders, 0);
  const totalQuantity = analytics.reduce((sum, a) => sum + a.total_quantity, 0);
  const avgMatchRate = analytics.length > 0
    ? analytics.reduce((sum, a) => sum + a.match_rate, 0) / analytics.length
    : 0;

  const topTypes: Record<string, number> = {};
  const topSizes: Record<string, number> = {};
  const topCities: Record<string, number> = {};

  analytics.forEach(a => {
    if (a.most_requested_type) {
      topTypes[a.most_requested_type] = (topTypes[a.most_requested_type] || 0) + 1;
    }
    if (a.most_requested_size) {
      topSizes[a.most_requested_size] = (topSizes[a.most_requested_size] || 0) + 1;
    }
    if (a.most_requested_city) {
      topCities[a.most_requested_city] = (topCities[a.most_requested_city] || 0) + 1;
    }
  });

  const sortedTypes = Object.entries(topTypes).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const sortedSizes = Object.entries(topSizes).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const sortedCities = Object.entries(topCities).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">تحليلات الطلبات</h3>
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium opacity-90">إجمالي الطلبات</span>
            <Package className="w-5 h-5 opacity-75" />
          </div>
          <div className="text-3xl font-bold">{totalOrders.toLocaleString('ar-SA')}</div>
          <p className="text-xs opacity-75 mt-1">آخر 30 يوم</p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium opacity-90">إجمالي الكمية</span>
            <TrendingUp className="w-5 h-5 opacity-75" />
          </div>
          <div className="text-3xl font-bold">{totalQuantity.toLocaleString('ar-SA')}</div>
          <p className="text-xs opacity-75 mt-1">طبلية</p>
        </div>

        <div className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium opacity-90">نسبة المطابقة</span>
            <Star className="w-5 h-5 opacity-75" />
          </div>
          <div className="text-3xl font-bold">{avgMatchRate.toFixed(1)}%</div>
          <p className="text-xs opacity-75 mt-1">متوسط</p>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium opacity-90">مشترين نشطين</span>
            <MapPin className="w-5 h-5 opacity-75" />
          </div>
          <div className="text-3xl font-bold">
            {latestAnalytics?.active_buyers_count.toLocaleString('ar-SA') || 0}
          </div>
          <p className="text-xs opacity-75 mt-1">اليوم</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-600" />
            أكثر أنواع الطبليات طلباً
          </h3>
          <div className="space-y-3">
            {sortedTypes.map(([type, count], idx) => (
              <div key={type} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">
                    {idx + 1}
                  </div>
                  <span className="font-medium text-gray-900">{type}</span>
                </div>
                <span className="text-sm font-semibold text-gray-600">{count} يوم</span>
              </div>
            ))}
            {sortedTypes.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">لا توجد بيانات</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            أكثر المقاسات طلباً
          </h3>
          <div className="space-y-3">
            {sortedSizes.map(([size, count], idx) => (
              <div key={size} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-50 text-green-600 flex items-center justify-center font-bold text-sm">
                    {idx + 1}
                  </div>
                  <span className="font-medium text-gray-900">{size}</span>
                </div>
                <span className="text-sm font-semibold text-gray-600">{count} يوم</span>
              </div>
            ))}
            {sortedSizes.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">لا توجد بيانات</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-orange-600" />
            أكثر المدن طلباً
          </h3>
          <div className="space-y-3">
            {sortedCities.map(([city, count], idx) => (
              <div key={city} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center font-bold text-sm">
                    {idx + 1}
                  </div>
                  <span className="font-medium text-gray-900">{city}</span>
                </div>
                <span className="text-sm font-semibold text-gray-600">{count} يوم</span>
              </div>
            ))}
            {sortedCities.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">لا توجد بيانات</p>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">سجل التحليلات اليومية</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">التاريخ</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">الطلبات</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">الكمية</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">المطابقة</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">نسبة المطابقة</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">المشترين</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {analytics.slice(0, 10).map((a) => (
                <tr key={a.date} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">{new Date(a.date).toLocaleDateString('ar-SA')}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900">{a.total_orders}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{a.total_quantity.toLocaleString('ar-SA')}</td>
                  <td className="px-4 py-3 text-sm text-green-600 font-semibold">{a.matched_orders}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden max-w-[100px]">
                        <div
                          className="h-full bg-green-500"
                          style={{ width: `${a.match_rate}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-gray-600">{a.match_rate.toFixed(0)}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{a.active_buyers_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
