import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Clock, Package, MapPin, Tag, TrendingUp, Play,
  RefreshCw, CheckCircle, AlertTriangle, Sparkles
} from 'lucide-react';

interface PendingOrder {
  id: string;
  request_id: string;
  pallet_type: string;
  size: string;
  quality: string;
  quantity: number;
  city: string;
  pallet_condition: string;
  status: string;
  created_at: string;
  phone: string;
  potential_matches_count: number;
  waiting_time_hours: number;
}

interface PendingMatchesQueueProps {
  phone?: string;
  isAdmin?: boolean;
}

export default function PendingMatchesQueue({ phone, isAdmin }: PendingMatchesQueueProps) {
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    loadPendingOrders();

    const channel = supabase
      .channel('pending-orders')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => loadPendingOrders()
      )
      .subscribe();

    const interval = setInterval(loadPendingOrders, 15000);

    return () => {
      channel.unsubscribe();
      clearInterval(interval);
    };
  }, [phone, isAdmin]);

  const loadPendingOrders = async () => {
    try {
      const { data, error } = await supabase.rpc('get_pending_orders_with_potential_matches', {
        p_phone: !isAdmin && phone ? phone : null
      });

      if (error) throw error;
      setPendingOrders(data || []);
    } catch (err) {
      console.error('Error loading pending orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleManualMatch = async (orderId: string) => {
    try {
      setProcessingId(orderId);
      await supabase.rpc('manual_match_existing_orders', {
        p_order_id: orderId
      });
      await loadPendingOrders();
    } catch (err) {
      console.error('Error triggering manual match:', err);
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-2xl p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-4" />
            <div className="h-3 bg-gray-200 rounded w-3/4" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-2xl p-6 border border-orange-200">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center">
            <Clock className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-black text-gray-900">قائمة الانتظار</h2>
            <p className="text-sm text-gray-600">الطلبات التي تنتظر المطابقة</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-2xl font-black text-orange-600">{pendingOrders.length}</span>
          <span className="text-sm font-bold text-gray-600">طلب في الانتظار</span>
        </div>
      </div>

      {pendingOrders.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-green-100 flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">لا توجد طلبات معلقة</h3>
          <p className="text-sm text-gray-600">
            جميع الطلبات تمت مطابقتها أو تحويلها للتتبع التلقائي
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {pendingOrders.map((order) => {
            const waitingHours = Math.floor(order.waiting_time_hours);
            const isUrgent = waitingHours >= 24;
            const hasPotentialMatches = order.potential_matches_count > 0;

            return (
              <div
                key={order.id}
                className={`bg-white rounded-2xl p-5 border-2 transition-all hover:shadow-lg ${
                  isUrgent ? 'border-red-300' : hasPotentialMatches ? 'border-green-300' : 'border-gray-200'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${
                      isUrgent
                        ? 'bg-red-100'
                        : hasPotentialMatches
                        ? 'bg-green-100'
                        : 'bg-gray-100'
                    }`}
                  >
                    {isUrgent ? (
                      <AlertTriangle className="w-6 h-6 text-red-600" />
                    ) : hasPotentialMatches ? (
                      <Sparkles className="w-6 h-6 text-green-600" />
                    ) : (
                      <Clock className="w-6 h-6 text-gray-600" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-bold text-gray-500" dir="ltr">
                        {order.request_id}
                      </span>
                      {isUrgent && (
                        <span className="text-xs font-bold px-2 py-1 rounded-full bg-red-100 text-red-700">
                          عاجل • {waitingHours} ساعة
                        </span>
                      )}
                      {hasPotentialMatches && (
                        <span className="text-xs font-bold px-2 py-1 rounded-full bg-green-100 text-green-700">
                          {order.potential_matches_count} مطابقة محتملة
                        </span>
                      )}
                    </div>

                    <h4 className="text-lg font-bold text-gray-900 mb-3">
                      {order.pallet_type} • {order.quality} • {order.size}
                    </h4>

                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Package className="w-4 h-4" />
                        <span>{order.quantity} طبلية</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="w-4 h-4" />
                        <span>{order.city}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Tag className="w-4 h-4" />
                        <span>{order.pallet_condition === 'new' ? 'جديد' : 'مستعمل'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock className="w-4 h-4" />
                        <span>
                          {waitingHours > 0
                            ? `${waitingHours} ساعة`
                            : `${Math.floor(order.waiting_time_hours * 60)} دقيقة`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {isAdmin && hasPotentialMatches && (
                    <div className="flex-shrink-0">
                      <button
                        onClick={() => handleManualMatch(order.id)}
                        disabled={processingId === order.id}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-sm flex items-center gap-2 transition-all disabled:opacity-50"
                      >
                        {processingId === order.id ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            جاري المعالجة
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4" />
                            تشغيل المطابقة
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
