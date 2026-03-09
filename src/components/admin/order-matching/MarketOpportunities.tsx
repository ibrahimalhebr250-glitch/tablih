import { useState } from 'react';
import { ShoppingCart, Package, AlertTriangle, MapPin, Clock, Search } from 'lucide-react';
import type { MarketOpportunities as MarketOpportunitiesData } from '../../../hooks/useOrderMatching';

interface Props {
  data: MarketOpportunitiesData | null;
  loading: boolean;
}

type Tab = 'orders' | 'inventory';

function timeSince(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} د`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} س`;
  return `${Math.floor(hours / 24)} ي`;
}

export default function MarketOpportunities({ data, loading }: Props) {
  const [tab, setTab] = useState<Tab>('orders');
  const [search, setSearch] = useState('');

  if (loading || !data) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200/60 p-4 animate-pulse">
            <div className="h-4 bg-slate-100 rounded w-1/3 mb-2" />
            <div className="h-3 bg-slate-50 rounded w-2/3" />
          </div>
        ))}
      </div>
    );
  }

  const orders = data.unmatched_orders.filter((o) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return o.request_id?.toLowerCase().includes(s) || o.city?.toLowerCase().includes(s) || o.pallet_type?.toLowerCase().includes(s);
  });

  const inventory = data.unmatched_inventory.filter((b) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return b.batch_ref?.toLowerCase().includes(s) || b.city?.toLowerCase().includes(s) || b.pallet_type?.toLowerCase().includes(s);
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
        <button
          onClick={() => setTab('orders')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all ${
            tab === 'orders' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <ShoppingCart className="w-4 h-4" />
          طلبات بدون عروض
          <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
            tab === 'orders' ? 'bg-red-100 text-red-700' : 'bg-slate-200 text-slate-600'
          }`}>{data.unmatched_orders.length}</span>
        </button>
        <button
          onClick={() => setTab('inventory')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all ${
            tab === 'inventory' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Package className="w-4 h-4" />
          عروض بدون طلبات
          <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
            tab === 'inventory' ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-600'
          }`}>{data.unmatched_inventory.length}</span>
        </button>
      </div>

      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="بحث بالرقم، المدينة، النوع..."
          className="w-full pr-10 pl-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
        />
      </div>

      {tab === 'orders' && (
        <div className="space-y-2">
          {orders.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200/60 p-8 text-center">
              <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <ShoppingCart className="w-6 h-6 text-green-400" />
              </div>
              <p className="text-sm font-bold text-slate-500">جميع الطلبات لديها عروض مطابقة</p>
            </div>
          ) : (
            orders.map((o) => (
              <div key={o.id} className="bg-white rounded-xl border border-slate-200/60 p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md" dir="ltr">
                      {o.request_id}
                    </span>
                    {o.candidate_count > 0 ? (
                      <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md">
                        {o.candidate_count} مطابقة جزئية
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                        <AlertTriangle className="w-2.5 h-2.5" /> لا يوجد عرض
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-slate-400">
                    <Clock className="w-3 h-3" />
                    {timeSince(o.created_at)}
                  </div>
                </div>

                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-600">
                  <span className="flex items-center gap-1">
                    <span className="text-slate-400">النوع:</span> {o.pallet_type}
                  </span>
                  <span><span className="text-slate-400">المقاس:</span> {o.size}</span>
                  <span><span className="text-slate-400">الجودة:</span> {o.quality}</span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-slate-400" /> {o.city}
                  </span>
                  <span className="font-bold text-slate-800">{o.quantity?.toLocaleString('ar-SA')} طبلية</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'inventory' && (
        <div className="space-y-2">
          {inventory.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200/60 p-8 text-center">
              <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <Package className="w-6 h-6 text-green-400" />
              </div>
              <p className="text-sm font-bold text-slate-500">جميع العروض لديها طلبات مطابقة</p>
            </div>
          ) : (
            inventory.map((b) => (
              <div key={b.id} className="bg-white rounded-xl border border-slate-200/60 p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md" dir="ltr">
                      {b.batch_ref}
                    </span>
                    {b.candidate_count > 0 ? (
                      <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-md">
                        {b.candidate_count} طلب محتمل
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                        <AlertTriangle className="w-2.5 h-2.5" /> لا يوجد طلب
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-slate-400">
                    <Clock className="w-3 h-3" />
                    {timeSince(b.created_at)}
                  </div>
                </div>

                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-600">
                  <span><span className="text-slate-400">النوع:</span> {b.pallet_type}</span>
                  <span><span className="text-slate-400">المقاس:</span> {b.size}</span>
                  <span><span className="text-slate-400">الجودة:</span> {b.quality}</span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-slate-400" /> {b.city}
                  </span>
                  <span className="font-bold text-slate-800">{b.available_quantity?.toLocaleString('ar-SA')} طبلية</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
