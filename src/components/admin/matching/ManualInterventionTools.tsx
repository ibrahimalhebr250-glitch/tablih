import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { Zap, Search, Target, CheckCircle2, XCircle } from 'lucide-react';
import { useSession } from '../../../hooks/useSession';

export default function ManualInterventionTools() {
  const { session } = useSession();
  const [orders, setOrders] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<string>('');
  const [selectedBatch, setSelectedBatch] = useState<string>('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [ordersRes, batchesRes] = await Promise.all([
      supabase.from('orders').select('*').in('status', ['unmatched', 'pending']).limit(20),
      supabase.from('inventory_batches').select('*').eq('status', 'active').gt('available_quantity', 0).limit(20),
    ]);
    setOrders(ordersRes.data || []);
    setBatches(batchesRes.data || []);
  };

  const handleForceMatch = async () => {
    if (!selectedOrder || !selectedBatch || !reason) {
      alert('Please select order, batch, and provide reason');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('admin_force_match', {
        p_order_id: selectedOrder,
        p_batch_id: selectedBatch,
        p_admin_phone: session?.phone || '',
        p_reason: reason,
      });

      if (error) throw error;
      if (data.success) {
        alert('Match created successfully!');
        fetchData();
        setSelectedOrder('');
        setSelectedBatch('');
        setReason('');
      } else {
        alert('Error: ' + (data.error || 'Unknown error'));
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBlockMatch = async () => {
    if (!selectedOrder || !selectedBatch || !reason) {
      alert('Please select order, batch, and provide reason');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('admin_block_match', {
        p_order_id: selectedOrder,
        p_batch_id: selectedBatch,
        p_admin_phone: session?.phone || '',
        p_reason: reason,
      });

      if (error) throw error;
      if (data.success) {
        alert('Match blocked successfully!');
        setReason('');
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Zap className="w-6 h-6 text-purple-600" />
        <div>
          <h3 className="text-lg font-bold">أدوات التدخل اليدوي</h3>
          <p className="text-xs text-gray-600">تحكم مباشر في المطابقة</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 border border-gray-100 space-y-6">
        <div>
          <label className="block text-sm font-bold text-gray-900 mb-2">اختر الطلب</label>
          <select
            value={selectedOrder}
            onChange={(e) => setSelectedOrder(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 outline-none"
          >
            <option value="">-- اختر طلب --</option>
            {orders.map((order) => (
              <option key={order.id} value={order.id}>
                {order.pallet_type} - {order.quality} - {order.city} ({order.quantity} طبلية)
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-900 mb-2">اختر دفعة المخزون</label>
          <select
            value={selectedBatch}
            onChange={(e) => setSelectedBatch(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 outline-none"
          >
            <option value="">-- اختر دفعة --</option>
            {batches.map((batch) => (
              <option key={batch.id} value={batch.id}>
                {batch.pallet_type} - {batch.quality} - {batch.city} ({batch.available_quantity} متاح)
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-900 mb-2">السبب</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="اشرح لماذا التدخل اليدوي مطلوب..."
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 outline-none resize-none"
            rows={3}
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleForceMatch}
            disabled={loading || !selectedOrder || !selectedBatch || !reason}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-green-600 text-white font-bold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CheckCircle2 className="w-5 h-5" />
            فرض المطابقة
          </button>
          <button
            onClick={handleBlockMatch}
            disabled={loading || !selectedOrder || !selectedBatch || !reason}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <XCircle className="w-5 h-5" />
            حظر المطابقة
          </button>
        </div>
      </div>

      <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
        <p className="text-sm text-amber-900 font-semibold">
          ⚠️ استخدم التدخل اليدوي بحذر. هذه الإجراءات تتجاوز قرارات الذكاء الاصطناعي ويتم تسجيلها للمراجعة.
        </p>
      </div>
    </div>
  );
}
