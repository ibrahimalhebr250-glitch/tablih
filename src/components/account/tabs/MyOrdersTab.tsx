import { useState, useEffect } from 'react';
import {
  ClipboardList,
  Clock,
  CheckCircle2,
  Plus,
  Zap,
  MapPin,
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';

type OrderFilter = 'open' | 'matching' | 'completed';

interface Order {
  id: string;
  order_number: string;
  pallet_type: string;
  size: string;
  quality: string;
  quantity: number;
  city: string;
  status: string;
  created_at: string;
  pallet_condition: string;
}

interface Props {
  phone: string;
  onCreateOrder: () => void;
}

const ORDER_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'مفتوح', color: '#b45309', bg: '#FFFBEB' },
  partially_matched: { label: 'قيد المطابقة', color: '#0369a1', bg: '#EFF6FF' },
  matched: { label: 'تمت المطابقة', color: '#059669', bg: '#ECFDF5' },
  fulfilled: { label: 'مكتمل', color: '#059669', bg: '#ECFDF5' },
  cancelled: { label: 'ملغى', color: '#dc2626', bg: '#FEF2F2' },
};

export default function MyOrdersTab({ phone, onCreateOrder }: Props) {
  const [filter, setFilter] = useState<OrderFilter>('open');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      let query = supabase
        .from('orders')
        .select('*')
        .eq('phone', phone)
        .order('created_at', { ascending: false });

      if (filter === 'open') {
        query = query.eq('status', 'pending');
      } else if (filter === 'matching') {
        query = query.in('status', ['partially_matched', 'matched']);
      } else {
        query = query.in('status', ['fulfilled', 'cancelled']);
      }

      const { data } = await query;
      setOrders(data || []);
      setLoading(false);
    };
    fetchOrders();
  }, [phone, filter]);

  const filters: { key: OrderFilter; label: string; icon: typeof Clock }[] = [
    { key: 'open', label: 'المفتوحة', icon: Clock },
    { key: 'matching', label: 'قيد المطابقة', icon: Zap },
    { key: 'completed', label: 'المكتملة', icon: CheckCircle2 },
  ];

  return (
    <div className="space-y-4" dir="rtl">
      {/* Filter Tabs */}
      <div className="flex gap-2">
        {filters.map(f => {
          const Icon = f.icon;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[11px] font-bold transition-all ${
                filter === f.key
                  ? 'bg-white text-[#1a4a5e] shadow-sm border border-gray-200'
                  : 'text-[#7a9aab] hover:bg-white/50'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Orders List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white/60 rounded-2xl p-4 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gray-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-2/3" />
                  <div className="h-2 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : orders.length === 0 ? (
        <EmptyOrders filter={filter} onCreateOrder={onCreateOrder} />
      ) : (
        <div className="space-y-2">
          {orders.map(order => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      )}

      {/* Create Order Button */}
      <button
        onClick={onCreateOrder}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-[13px] font-bold text-white active:scale-[0.98] transition-transform"
        style={{ background: 'linear-gradient(135deg, #b45309 0%, #d97706 100%)', boxShadow: '0 4px 14px rgba(180,83,9,0.25)' }}
      >
        <Plus className="w-4 h-4" />
        إنشاء طلب جديد
      </button>
    </div>
  );
}

function OrderCard({ order }: { order: Order }) {
  const statusConf = ORDER_STATUS[order.status] || ORDER_STATUS.pending;

  return (
    <div
      className="bg-white rounded-2xl p-4"
      style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.04)' }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)', border: '1px solid #fde68a' }}
        >
          <ClipboardList className="w-5 h-5 text-[#b45309]" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: statusConf.bg, color: statusConf.color }}
            >
              {statusConf.label}
            </span>
            <p className="text-[13px] font-bold text-[#1a3a4a]">{order.pallet_type} - {order.size}</p>
          </div>

          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1 text-[10px] text-[#7a9aab]">
              <MapPin className="w-3 h-3" />
              {order.city}
            </span>
            <span className="text-[12px] font-bold text-[#b45309]">{order.quantity?.toLocaleString('ar-SA')} طبلية</span>
          </div>

          <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
            <span className="text-[9px] text-[#b0c4d0]">
              {new Date(order.created_at).toLocaleDateString('ar-SA')}
            </span>
            <span className="text-[9px] text-[#b0c4d0]" dir="ltr">{order.order_number}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyOrders({ filter, onCreateOrder }: { filter: OrderFilter; onCreateOrder: () => void }) {
  const config = {
    open: { title: 'لا توجد طلبات مفتوحة', desc: 'أنشئ طلب شراء جديد وسنجد لك المورد المناسب', showButton: true },
    matching: { title: 'لا توجد طلبات قيد المطابقة', desc: 'الطلبات التي يتم البحث عن موردين لها ستظهر هنا', showButton: false },
    completed: { title: 'لا توجد طلبات مكتملة', desc: 'الطلبات التي تم تنفيذها ستظهر هنا', showButton: false },
  };
  const c = config[filter];

  return (
    <div
      className="rounded-2xl p-8 text-center"
      style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.8) 0%, rgba(255,251,235,0.8) 100%)', border: '2px dashed #fde68a' }}
    >
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
        style={{ background: '#FFFBEB' }}
      >
        <ClipboardList className="w-7 h-7 text-[#b45309]" />
      </div>
      <h3 className="text-[15px] font-bold text-[#1a3a4a] mb-1.5">{c.title}</h3>
      <p className="text-[12px] text-[#7a9aab] leading-relaxed max-w-[240px] mx-auto mb-4">{c.desc}</p>
      {c.showButton && (
        <button
          onClick={onCreateOrder}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[12px] font-bold text-white active:scale-95 transition-transform"
          style={{ background: 'linear-gradient(135deg, #b45309 0%, #d97706 100%)', boxShadow: '0 4px 12px rgba(180,83,9,0.25)' }}
        >
          <Plus className="w-4 h-4" />
          إنشاء طلب
        </button>
      )}
    </div>
  );
}
