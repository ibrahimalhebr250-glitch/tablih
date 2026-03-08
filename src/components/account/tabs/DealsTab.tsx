import { useState, useEffect } from 'react';
import {
  Handshake,
  CheckCircle2,
  Clock,
  Truck,
  Archive,
  ArrowLeftRight,
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';

type DealFilter = 'active' | 'completed' | 'archive';

interface Deal {
  id: string;
  deal_number: string;
  pallet_type: string;
  size: string;
  quality: string;
  quantity: number;
  total_price: number;
  status: string;
  buyer_phone: string;
  supplier_phone: string;
  city: string;
  created_at: string;
}

interface Props {
  phone: string;
}

const DEAL_STATUS: Record<string, { label: string; color: string; bg: string; icon: typeof Clock }> = {
  pending_supplier: { label: 'بانتظار المورد', color: '#b45309', bg: '#FFFBEB', icon: Clock },
  accepted: { label: 'مقبولة', color: '#059669', bg: '#ECFDF5', icon: CheckCircle2 },
  in_delivery: { label: 'قيد التوصيل', color: '#0369a1', bg: '#EFF6FF', icon: Truck },
  completed: { label: 'مكتملة', color: '#059669', bg: '#ECFDF5', icon: CheckCircle2 },
  cancelled: { label: 'ملغاة', color: '#dc2626', bg: '#FEF2F2', icon: Archive },
  failed: { label: 'فاشلة', color: '#dc2626', bg: '#FEF2F2', icon: Archive },
};

export default function DealsTab({ phone }: Props) {
  const [filter, setFilter] = useState<DealFilter>('active');
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDeals = async () => {
      setLoading(true);
      let query = supabase
        .from('deals')
        .select('*')
        .or(`buyer_phone.eq.${phone},supplier_phone.eq.${phone}`)
        .order('created_at', { ascending: false });

      if (filter === 'active') {
        query = query.in('status', ['pending_supplier', 'accepted', 'in_delivery']);
      } else if (filter === 'completed') {
        query = query.eq('status', 'completed');
      } else {
        query = query.in('status', ['cancelled', 'failed']);
      }

      const { data } = await query;
      setDeals(data || []);
      setLoading(false);
    };
    fetchDeals();
  }, [phone, filter]);

  const filters: { key: DealFilter; label: string; icon: typeof Handshake }[] = [
    { key: 'active', label: 'النشطة', icon: Handshake },
    { key: 'completed', label: 'المكتملة', icon: CheckCircle2 },
    { key: 'archive', label: 'الأرشيف', icon: Archive },
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

      {/* Deals List */}
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
      ) : deals.length === 0 ? (
        <EmptyDeals filter={filter} />
      ) : (
        <div className="space-y-2">
          {deals.map(deal => (
            <DealCard key={deal.id} deal={deal} phone={phone} />
          ))}
        </div>
      )}
    </div>
  );
}

function DealCard({ deal, phone }: { deal: Deal; phone: string }) {
  const statusConf = DEAL_STATUS[deal.status] || DEAL_STATUS.pending_supplier;
  const StatusIcon = statusConf.icon;
  const isBuyer = deal.buyer_phone === phone;

  return (
    <div
      className="bg-white rounded-2xl p-4"
      style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.04)' }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: isBuyer ? 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)' : 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)', border: isBuyer ? '1px solid #bfdbfe' : '1px solid #a7f3d0' }}
        >
          <Handshake className={`w-5 h-5 ${isBuyer ? 'text-[#0369a1]' : 'text-[#059669]'}`} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span
              className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: statusConf.bg, color: statusConf.color }}
            >
              <StatusIcon className="w-3 h-3" />
              {statusConf.label}
            </span>
            <p className="text-[13px] font-bold text-[#1a3a4a]">{deal.pallet_type} - {deal.size}</p>
          </div>

          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1 text-[10px] text-[#7a9aab]">
              <ArrowLeftRight className="w-3 h-3" />
              {isBuyer ? 'أنت المشتري' : 'أنت المورد'}
            </span>
            <span className="text-[12px] font-bold text-[#1a4a5e]">{deal.quantity?.toLocaleString('ar-SA')} طبلية</span>
          </div>

          <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
            <span className="text-[9px] text-[#b0c4d0]">
              {new Date(deal.created_at).toLocaleDateString('ar-SA')}
            </span>
            <span className="text-[9px] text-[#b0c4d0]" dir="ltr">{deal.deal_number}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyDeals({ filter }: { filter: DealFilter }) {
  const config = {
    active: { title: 'لا توجد صفقات نشطة', desc: 'عند إنشاء صفقات جديدة ستظهر هنا', color: '#b45309', bgFrom: '#fffbeb', border: '#fde68a', icon: Handshake },
    completed: { title: 'لا توجد صفقات مكتملة', desc: 'الصفقات المكتملة ستظهر هنا بعد إتمامها', color: '#059669', bgFrom: '#ecfdf5', border: '#a7f3d0', icon: CheckCircle2 },
    archive: { title: 'الأرشيف فارغ', desc: 'الصفقات الملغاة والفاشلة ستظهر هنا', color: '#6b7280', bgFrom: '#f3f4f6', border: '#e5e7eb', icon: Archive },
  };

  const c = config[filter];
  const Icon = c.icon;

  return (
    <div
      className="rounded-2xl p-8 text-center"
      style={{ background: `linear-gradient(135deg, rgba(255,255,255,0.8) 0%, ${c.bgFrom}80 100%)`, border: `2px dashed ${c.border}` }}
    >
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
        style={{ background: `${c.bgFrom}` }}
      >
        <Icon className="w-7 h-7" style={{ color: c.color }} />
      </div>
      <h3 className="text-[15px] font-bold text-[#1a3a4a] mb-1.5">{c.title}</h3>
      <p className="text-[12px] text-[#7a9aab] leading-relaxed max-w-[240px] mx-auto">{c.desc}</p>
    </div>
  );
}
