import { useState } from 'react';
import { useAdminOrders } from '../../../hooks/useAdminOrders';
import { ClipboardList, FileText, Settings, Sliders, RefreshCw, BarChart3, ScrollText } from 'lucide-react';
import OrdersMonitoringTab from '../orders/OrdersMonitoringTab';
import IncompleteDraftsTab from '../orders/IncompleteDraftsTab';
import OrderSettingsTab from '../orders/OrderSettingsTab';
import FlexibilityOptionsTab from '../orders/FlexibilityOptionsTab';
import RecurringOrdersTab from '../orders/RecurringOrdersTab';
import OrderAnalyticsTab from '../orders/OrderAnalyticsTab';
import OperationsLogTab from '../orders/OperationsLogTab';

type Tab = 'monitoring' | 'drafts' | 'settings' | 'flexibility' | 'recurring' | 'analytics' | 'log';

export default function OrdersSection() {
  const [activeTab, setActiveTab] = useState<Tab>('monitoring');
  const {
    orders,
    drafts,
    orderTypes,
    flexibilityOptions,
    quantitySettings,
    recurringOrders,
    analytics,
    operations,
    loading,
    error,
    updateOrder,
    deleteOrder,
    deleteDraft,
    updateOrderType,
    createOrderType,
    updateFlexibilityOption,
    updateQuantitySettings,
    pauseRecurringOrder,
    resumeRecurringOrder
  } = useAdminOrders();

  const tabs: Array<{ id: Tab; label: string; icon: any; count?: number }> = [
    { id: 'monitoring', label: 'مراقبة الطلبات', icon: ClipboardList, count: orders.length },
    { id: 'drafts', label: 'طلبات غير مكتملة', icon: FileText, count: drafts.length },
    { id: 'settings', label: 'إعدادات إنشاء الطلب', icon: Settings },
    { id: 'flexibility', label: 'خيارات المرونة', icon: Sliders, count: flexibilityOptions.length },
    { id: 'recurring', label: 'طلبات دورية', icon: RefreshCw, count: recurringOrders.length },
    { id: 'analytics', label: 'تحليل الطلبات', icon: BarChart3 },
    { id: 'log', label: 'سجل العمليات', icon: ScrollText, count: operations.length }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">جاري تحميل بيانات الطلبات...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
        <p className="text-red-700 text-center">حدث خطأ في تحميل البيانات: {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">إدارة إنشاء الطلبات</h2>
        <p className="text-gray-600">
          نظام متكامل لإدارة ومراقبة جميع طلبات المشترين في المنصة
        </p>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-[#1a4a5e] text-white shadow-lg'
                  : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              {tab.count !== undefined && (
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div>
        {activeTab === 'monitoring' && (
          <OrdersMonitoringTab
            orders={orders}
            onUpdate={updateOrder}
            onDelete={deleteOrder}
          />
        )}

        {activeTab === 'drafts' && (
          <IncompleteDraftsTab
            drafts={drafts}
            onDelete={deleteDraft}
          />
        )}

        {activeTab === 'settings' && (
          <OrderSettingsTab />
        )}

        {activeTab === 'flexibility' && (
          <FlexibilityOptionsTab />
        )}

        {activeTab === 'recurring' && (
          <RecurringOrdersTab
            recurringOrders={recurringOrders}
            onPause={pauseRecurringOrder}
            onResume={resumeRecurringOrder}
          />
        )}

        {activeTab === 'analytics' && (
          <OrderAnalyticsTab analytics={analytics} />
        )}

        {activeTab === 'log' && (
          <OperationsLogTab operations={operations} />
        )}
      </div>
    </div>
  );
}
