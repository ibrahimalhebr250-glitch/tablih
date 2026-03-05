import { useEffect, useState } from 'react';
import { LogIn, TrendingUp, MapPin, Clock, Zap, BarChart2, Activity, ShieldCheck, ArrowUpRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { AppSession } from '../../types/session';

interface Props {
  session: AppSession | null;
  onLogin: () => void;
  onOpenAdmin: () => void;
}

interface MarketItem {
  id: string;
  kind: 'supply' | 'demand';
  pallet_type: string;
  city: string;
  available_quantity: number;
  primary_image_url?: string;
}

const FALLBACK_CITIES = ['الرياض', 'جدة', 'الدمام', 'مكة المكرمة'];

function useMarketStats() {
  const [items, setItems] = useState<MarketItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const [supplyRes, demandRes] = await Promise.all([
        supabase
          .from('inventory_batches')
          .select('id, pallet_type, city, available_quantity, inventory_images(url, is_primary)')
          .eq('status', 'active')
          .gt('available_quantity', 0)
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('orders')
          .select('id, pallet_type, city, quantity')
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(10),
      ]);

      if (cancelled) return;

      const supplyItems: MarketItem[] = (supplyRes.data || []).map((b: any) => {
        const images = b.inventory_images || [];
        const primary = images.find((i: any) => i.is_primary) || images[0];
        return {
          id: b.id,
          kind: 'supply',
          pallet_type: b.pallet_type,
          city: b.city,
          available_quantity: b.available_quantity,
          primary_image_url: primary?.url,
        };
      });

      const demandItems: MarketItem[] = (demandRes.data || []).map((o: any) => ({
        id: o.id,
        kind: 'demand',
        pallet_type: o.pallet_type,
        city: o.city,
        available_quantity: o.quantity,
      }));

      setItems([...supplyItems, ...demandItems]);
      setLoading(false);
    }

    load();
    const t = setInterval(load, 30_000);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  return { items, loading };
}

export default function DesktopRightPanel({ session, onLogin, onOpenAdmin }: Props) {
  const { items, loading } = useMarketStats();
  const [, setTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTick((v) => v + 1), 5000);
    return () => clearInterval(t);
  }, []);

  const supplyCount = items.filter((o) => o.kind === 'supply').length;
  const demandCount = items.filter((o) => o.kind === 'demand').length;
  const totalCount = items.length;
  const activeCities = [...new Set(items.map((o) => o.city))].slice(0, 6);
  const recentItems = items.slice(0, 6);
  const matchRate = totalCount > 0
    ? Math.min(95, Math.round((Math.min(supplyCount, demandCount) / Math.max(supplyCount, demandCount, 1)) * 100))
    : 0;

  return (
    <div
      className="flex flex-col h-full overflow-y-auto"
      style={{
        background: 'linear-gradient(160deg, #081420 0%, #0d1f2e 55%, #081420 100%)',
        borderLeft: '1px solid rgba(255,255,255,0.05)',
        scrollbarWidth: 'thin',
        scrollbarColor: 'rgba(34,197,94,0.15) transparent',
      }}
    >
      <div
        className="px-5 py-4 flex-shrink-0 flex items-center justify-between"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
      >
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse" />
          <span className="text-white/35 text-[11px]">مباشر</span>
        </div>
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-white/25" />
          <span className="text-white/70 font-bold text-[13px]">السوق المباشر</span>
        </div>
      </div>

      <div className="px-4 pt-5 pb-4 flex-shrink-0 space-y-3">
        <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest text-right">إحصائيات السوق</p>

        <div className="grid grid-cols-2 gap-2">
          <div
            className="rounded-2xl p-4 text-right relative overflow-hidden"
            style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.12)' }}
          >
            <div className="absolute -bottom-2 -left-2 opacity-5">
              <TrendingUp className="w-14 h-14 text-blue-400" />
            </div>
            <p className="text-[26px] font-black text-[#60a5fa] leading-none">{loading ? '–' : supplyCount}</p>
            <p className="text-[11px] font-semibold text-[#60a5fa]/50 mt-1.5">عروض متاحة</p>
          </div>
          <div
            className="rounded-2xl p-4 text-right relative overflow-hidden"
            style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.12)' }}
          >
            <div className="absolute -bottom-2 -left-2 opacity-5">
              <BarChart2 className="w-14 h-14 text-amber-400" />
            </div>
            <p className="text-[26px] font-black text-amber-400 leading-none">{loading ? '–' : demandCount}</p>
            <p className="text-[11px] font-semibold text-amber-400/50 mt-1.5">طلبات نشطة</p>
          </div>
        </div>

        <div
          className="rounded-2xl p-4"
          style={{ background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.1)' }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-[#4ade80]" />
              <span className="text-[12px] font-bold text-[#4ade80]">{matchRate}%</span>
            </div>
            <span className="text-[11px] font-semibold text-white/50">نسبة التطابق</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div
              className="h-full rounded-full transition-all duration-1500"
              style={{ width: `${matchRate}%`, background: 'linear-gradient(90deg, #16a34a, #22c55e, #4ade80)' }}
            />
          </div>
        </div>
      </div>

      <div className="mx-4 h-px flex-shrink-0" style={{ background: 'rgba(255,255,255,0.05)' }} />

      <div className="px-4 py-4 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <MapPin className="w-3.5 h-3.5 text-white/20" />
          <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">المدن النشطة</p>
        </div>
        <div className="flex flex-wrap gap-1.5 justify-end">
          {(activeCities.length > 0 ? activeCities : FALLBACK_CITIES).map((city) => (
            <span
              key={city}
              className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
              style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.45)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              {city}
            </span>
          ))}
        </div>
      </div>

      <div className="mx-4 h-px flex-shrink-0" style={{ background: 'rgba(255,255,255,0.05)' }} />

      <div className="px-4 py-4 flex-1">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-ping" />
            <div className="w-1.5 h-1.5 rounded-full bg-[#22c55e] -ml-2.5 animate-pulse" />
          </div>
          <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">أحدث الفرص</p>
        </div>

        {loading && (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-14 rounded-2xl animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
            ))}
          </div>
        )}

        {!loading && recentItems.length === 0 && (
          <div className="text-center py-10">
            <p className="text-[12px] text-white/20">لا توجد فرص حالياً</p>
          </div>
        )}

        {!loading && recentItems.length > 0 && (
          <div className="space-y-2">
            {recentItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between px-3.5 py-3 rounded-2xl overflow-hidden"
                style={{
                  background: item.kind === 'supply' ? 'rgba(59,130,246,0.07)' : 'rgba(245,158,11,0.07)',
                  border: item.kind === 'supply' ? '1px solid rgba(59,130,246,0.1)' : '1px solid rgba(245,158,11,0.1)',
                }}
              >
                <div className="flex items-center gap-2">
                  {item.primary_image_url ? (
                    <img
                      src={item.primary_image_url}
                      alt={item.pallet_type}
                      className="w-8 h-8 rounded-lg object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-white/20" />
                      <span className="text-[10px] text-white/30">{item.city}</span>
                    </div>
                  )}
                  {item.primary_image_url && (
                    <span className="text-[10px] text-white/30">{item.city}</span>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-[12px] font-bold" style={{ color: item.kind === 'supply' ? '#60a5fa' : '#fbbf24' }}>
                    {item.pallet_type}
                  </p>
                  <p className="text-[10px] text-white/25">{item.available_quantity.toLocaleString()} وحدة</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mx-4 h-px flex-shrink-0" style={{ background: 'rgba(255,255,255,0.05)' }} />

      <div className="px-4 py-5 flex-shrink-0 space-y-2">
        {!session && (
          <button
            onClick={onLogin}
            className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all hover:brightness-110 active:scale-[0.97]"
            style={{
              background: 'linear-gradient(135deg, #15803d, #22c55e)',
              boxShadow: '0 4px 20px rgba(34,197,94,0.22)',
            }}
          >
            <div className="flex items-center gap-1.5">
              <ArrowUpRight className="w-4 h-4 text-white/80" />
              <LogIn className="w-4 h-4 text-white" />
            </div>
            <div className="text-right">
              <p className="text-white font-bold text-[13px]">ابدأ الآن</p>
              <p className="text-white/60 text-[10px]">سجّل أو ادخل لحسابك</p>
            </div>
          </button>
        )}

        <button
          onClick={onOpenAdmin}
          className="w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all active:scale-[0.97]"
          style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.1)' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.1)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.06)')}
        >
          <ShieldCheck className="w-4 h-4 text-red-400" />
          <div className="text-right">
            <p className="text-white/65 font-bold text-[13px]">لوحة الإدارة</p>
            <p className="text-white/25 text-[10px]">إدارة المنصة</p>
          </div>
        </button>
      </div>
    </div>
  );
}
