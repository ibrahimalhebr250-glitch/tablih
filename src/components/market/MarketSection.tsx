import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Package, MapPin, Star, ShoppingBag, Warehouse, Wrench,
  CheckCircle2, RefreshCw, TrendingUp, Filter, ChevronDown,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import SupplyDetailSheet from './SupplyDetailSheet';
import DemandDetailSheet from './DemandDetailSheet';
import AuthPromptSheet from './AuthPromptSheet';

type TabKind = 'all' | 'supply' | 'demand';

export interface SupplyCard {
  id: string;
  kind: 'supply';
  phone: string;
  pallet_type: string;
  size: string;
  quality: string;
  pallet_condition: string;
  available_quantity: number;
  price_per_pallet: number;
  city: string;
  description: string;
  image_urls: string[];
  created_at: string;
  trust_rating?: number;
  is_sold?: boolean;
}

export interface DemandCard {
  id: string;
  kind: 'demand';
  phone: string;
  pallet_type: string;
  size: string;
  quality: string;
  quantity: number;
  city: string;
  accept_close_quality: boolean;
  accept_close_city: boolean;
  accept_partial_delivery: boolean;
  created_at: string;
  trust_rating?: number;
  matched_quantity?: number;
  status: string;
}

type MarketCard = SupplyCard | DemandCard;

const QUALITY_COLORS: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  A: { bg: '#f0fdf4', text: '#15803d', dot: '#22c55e', label: 'A - ممتاز' },
  B: { bg: '#eff6ff', text: '#1d4ed8', dot: '#3b82f6', label: 'B - جيد' },
  C: { bg: '#fff7ed', text: '#b45309', dot: '#f59e0b', label: 'C - مقبول' },
  D: { bg: '#fef2f2', text: '#dc2626', dot: '#ef4444', label: 'D - متدني' },
};

const CONDITION_MAP: Record<string, { label: string; bg: string; color: string }> = {
  new: { label: 'جديد', bg: '#f0fdf4', color: '#15803d' },
  used: { label: 'مستعمل', bg: '#fff7ed', color: '#b45309' },
  damaged: { label: 'متضرر', bg: '#fef2f2', color: '#dc2626' },
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'الآن';
  if (mins < 60) return `منذ ${mins} د`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `منذ ${hrs} س`;
  return `منذ ${Math.floor(hrs / 24)} ي`;
}

function SupplyCardImage({ url, count, onError }: { url: string; count: number; onError: () => void }) {
  return (
    <div className="flex-shrink-0 relative rounded-r-2xl overflow-hidden" style={{ width: 120, height: 140 }}>
      <img
        src={url}
        alt=""
        className="w-full h-full object-cover"
        onError={onError}
      />
      {count > 1 && (
        <div
          className="absolute bottom-1.5 left-1.5 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full"
          style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
        >
          <span className="text-[9px] font-bold text-white">{count}</span>
        </div>
      )}
    </div>
  );
}

function SupplyCardItem({ card, onClick }: { card: SupplyCard; onClick: () => void }) {
  const [imgFailed, setImgFailed] = useState(false);
  const hasImages = card.image_urls.length > 0 && !imgFailed;
  const q = QUALITY_COLORS[card.quality] || QUALITY_COLORS.C;
  const cond = CONDITION_MAP[card.pallet_condition] || CONDITION_MAP.used;
  const isSold = card.is_sold;

  return (
    <div className="relative">
      {isSold && (
        <div
          className="absolute inset-x-0 top-0 z-10 flex items-center justify-center gap-1.5 py-1.5 rounded-t-[20px]"
          style={{ background: 'linear-gradient(135deg, #dc2626, #ef4444)', boxShadow: '0 2px 6px rgba(220,38,38,0.25)' }}
        >
          <CheckCircle2 className="w-3 h-3 text-white" />
          <span className="text-[10px] font-black text-white tracking-wide">تم البيع</span>
        </div>
      )}
      <button
        onClick={isSold ? undefined : onClick}
        disabled={isSold}
        className="w-full text-right group transition-all duration-200 active:scale-[0.985] overflow-hidden"
        style={{
          background: 'white',
          border: isSold ? '1px solid rgba(220,38,38,0.12)' : '1px solid rgba(21,101,64,0.08)',
          borderRadius: 20,
          boxShadow: isSold ? 'none' : '0 2px 12px rgba(21,101,64,0.06)',
          cursor: isSold ? 'default' : 'pointer',
          paddingTop: isSold ? 28 : 0,
        }}
      >
        <div className="flex flex-row-reverse gap-0">
          {hasImages ? (
            <SupplyCardImage url={card.image_urls[0]} count={card.image_urls.length} onError={() => setImgFailed(true)} />
          ) : (
            <div
              className="flex-shrink-0 flex flex-col items-center justify-center gap-1.5 rounded-r-2xl"
              style={{ width: 120, height: 140, background: 'linear-gradient(145deg, #E8F5E9 0%, #C8E6C9 100%)' }}
            >
              <Warehouse className="w-7 h-7 text-green-400/70" />
              <span className="text-[9px] font-semibold text-green-500/60">بدون صور</span>
            </div>
          )}

          <div className="flex-1 min-w-0 flex flex-col justify-between p-3">
            <div>
              <div className="flex items-start justify-between gap-1.5 mb-1">
                <span
                  className="flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                  style={{ background: q.bg, color: q.text, border: `1px solid ${q.dot}30` }}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: q.dot }} />
                  {q.label}
                </span>
                <p className="text-[14px] font-black text-[#1a3a4a] leading-tight truncate">{card.pallet_type}</p>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap justify-end mb-1.5">
                {card.size && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md" style={{ background: '#f0f4f8', color: '#4a7a8a' }}>
                    {card.size}
                  </span>
                )}
                <span
                  className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md flex items-center gap-0.5"
                  style={{ background: cond.bg, color: cond.color }}
                >
                  <Wrench className="w-2.5 h-2.5" />
                  {cond.label}
                </span>
              </div>

              <div className="flex items-center gap-1 justify-end">
                <span className="text-[11px] font-semibold text-[#4a7a8a]">{card.city}</span>
                <MapPin className="w-3 h-3 text-green-500/60" />
              </div>
            </div>

            <div className="flex items-center justify-between mt-2 pt-2" style={{ borderTop: '1px solid rgba(0,0,0,0.04)' }}>
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] text-[#a0b5c0]">{timeAgo(card.created_at)}</span>
                {card.price_per_pallet > 0 && (
                  <div className="flex items-baseline gap-0.5 px-1.5 py-0.5 rounded-md" style={{ background: '#f0fdf4' }}>
                    <span className="text-[12px] font-black text-[#15803d]">{card.price_per_pallet}</span>
                    <span className="text-[8px] text-[#15803d]/60 font-semibold">ر.س</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1 px-2 py-1 rounded-lg" style={{ background: '#f0f9f4', border: '1px solid rgba(21,128,61,0.08)' }}>
                <span className="text-[12px] font-black text-[#15803d]">{card.available_quantity.toLocaleString()}</span>
                <Package className="w-3 h-3 text-green-500/70" />
              </div>
            </div>
          </div>
        </div>
      </button>
    </div>
  );
}

function DemandCardItem({ card, onClick }: { card: DemandCard; onClick: () => void }) {
  const q = QUALITY_COLORS[card.quality] || QUALITY_COLORS.C;
  const flexCount = [card.accept_close_quality, card.accept_close_city, card.accept_partial_delivery].filter(Boolean).length;
  const isPartiallyMatched = card.status === 'partially_matched';
  const isFullyMatched = card.status === 'matched' || card.status === 'fulfilled';
  const remainingQty = isPartiallyMatched ? card.quantity - (card.matched_quantity || 0) : card.quantity;

  return (
    <div className="relative">
      {isFullyMatched && (
        <div
          className="absolute inset-x-0 top-0 z-10 flex items-center justify-center gap-1.5 py-1.5 rounded-t-[20px]"
          style={{ background: 'linear-gradient(135deg, #b45309, #d97706)', boxShadow: '0 2px 6px rgba(180,83,9,0.25)' }}
        >
          <CheckCircle2 className="w-3 h-3 text-white" />
          <span className="text-[10px] font-black text-white tracking-wide">تم البيع</span>
        </div>
      )}
      <button
        onClick={isFullyMatched ? undefined : onClick}
        disabled={isFullyMatched}
        className="w-full text-right transition-all duration-200 overflow-hidden"
        style={{
          background: 'white',
          border: isFullyMatched ? '1px solid rgba(217,119,6,0.15)' : '1px solid rgba(217,119,6,0.1)',
          borderRadius: 20,
          boxShadow: isFullyMatched ? 'none' : '0 2px 12px rgba(217,119,6,0.06)',
          opacity: 1,
          cursor: isFullyMatched ? 'default' : 'pointer',
          paddingTop: isFullyMatched ? 28 : 0,
        }}
      >
        <div className="relative flex flex-row-reverse gap-0">
          <div
            className="absolute bottom-0 left-0 w-40 h-40 rounded-full opacity-[0.07] pointer-events-none"
            style={{
              background: `radial-gradient(circle, ${isFullyMatched ? '#15803d' : '#F59E0B'} 0%, transparent 70%)`,
              transform: 'translate(-30%, 30%)',
            }}
          />

          <div
            className="flex-shrink-0 flex flex-col items-center justify-center gap-1.5 relative rounded-r-2xl"
            style={{
              width: 120,
              height: 140,
              background: isFullyMatched
                ? 'linear-gradient(145deg, #f0fdf4 0%, #dcfce7 50%, #bbf7d0 100%)'
                : 'linear-gradient(145deg, #FFF7ED 0%, #FEF3C7 50%, #FDE68A 100%)',
            }}
          >
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ background: isFullyMatched ? 'rgba(21,128,61,0.15)' : 'rgba(245,158,11,0.15)' }}
            >
              {isFullyMatched
                ? <CheckCircle2 className="w-5 h-5 text-green-600" />
                : <ShoppingBag className="w-5 h-5 text-amber-500" />
              }
            </div>
            <div className="flex items-baseline gap-0.5">
              <span className="text-[20px] font-black" style={{ color: isFullyMatched ? '#15803d' : '#92400e' }}>
                {remainingQty.toLocaleString()}
              </span>
            </div>
            <span className="text-[8px] font-bold -mt-1" style={{ color: isFullyMatched ? '#16a34a80' : '#92400e80' }}>
              {isPartiallyMatched ? 'متبقي' : 'طبلية'}
            </span>
            {isPartiallyMatched && (
              <div className="absolute top-2 right-2 bg-green-500 text-white text-[8px] font-bold px-2 py-0.5 rounded-full">
                {((card.matched_quantity! / card.quantity) * 100).toFixed(0)}% مؤمن
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0 flex flex-col justify-between p-3">
            <div>
              <div className="flex items-start justify-between gap-1.5 mb-1">
                <span
                  className="flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                  style={{ background: q.bg, color: q.text, border: `1px solid ${q.dot}30` }}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: q.dot }} />
                  {q.label}
                </span>
                <p className="text-[14px] font-black text-[#1a3a4a] leading-tight truncate">{card.pallet_type}</p>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap justify-end mb-1.5">
                {card.size && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md" style={{ background: '#f0f4f8', color: '#4a7a8a' }}>
                    {card.size}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1 justify-end">
                <span className="text-[11px] font-semibold text-[#4a7a8a]">{card.city}</span>
                <MapPin className="w-3 h-3" style={{ color: isFullyMatched ? '#22c55e' : '#f59e0b' }} />
              </div>
            </div>

            <div className="flex items-center justify-between mt-2 pt-2" style={{ borderTop: '1px solid rgba(0,0,0,0.04)' }}>
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] text-[#a0b5c0]">{timeAgo(card.created_at)}</span>
                {!isFullyMatched && flexCount > 0 && (
                  <span
                    className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5"
                    style={{ background: '#FFF7ED', color: '#b45309', border: '1px solid #FED7AA' }}
                  >
                    <Star className="w-2.5 h-2.5" />
                    {flexCount}
                  </span>
                )}
              </div>
              <div
                className="flex items-center gap-1 px-2 py-1 rounded-lg"
                style={{
                  background: isFullyMatched ? '#f0fdf4' : isPartiallyMatched ? '#f0fdf4' : '#fff7ed',
                  border: `1px solid ${isFullyMatched ? 'rgba(21,128,61,0.12)' : isPartiallyMatched ? 'rgba(21,128,61,0.08)' : 'rgba(217,119,6,0.08)'}`,
                }}
              >
                <span className="text-[12px] font-black" style={{ color: isFullyMatched ? '#15803d' : isPartiallyMatched ? '#15803d' : '#b45309' }}>
                  {remainingQty.toLocaleString()}
                </span>
                <Package className="w-3 h-3" style={{ color: isFullyMatched ? '#22c55e' : isPartiallyMatched ? '#22c55e' : '#f59e0b' }} />
              </div>
            </div>
          </div>
        </div>

        {(isPartiallyMatched || (!isFullyMatched && (card.accept_close_quality || card.accept_close_city || card.accept_partial_delivery))) && (
          <div className="flex gap-1.5 flex-wrap px-3 pb-2.5 pt-0.5">
            {isPartiallyMatched && (
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1" style={{ background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0' }}>
                <Package className="w-2.5 h-2.5" />
                مطابق جزئياً: {card.matched_quantity!.toLocaleString()} من {card.quantity.toLocaleString()}
              </span>
            )}
            {!isFullyMatched && card.accept_close_quality && (
              <span className="text-[9px] font-medium px-2 py-0.5 rounded-full" style={{ background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0' }}>
                جودة قريبة
              </span>
            )}
            {!isFullyMatched && card.accept_close_city && (
              <span className="text-[9px] font-medium px-2 py-0.5 rounded-full" style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}>
                مدينة قريبة
              </span>
            )}
            {!isFullyMatched && card.accept_partial_delivery && (
              <span className="text-[9px] font-medium px-2 py-0.5 rounded-full" style={{ background: '#fef9c3', color: '#a16207', border: '1px solid #fef08a' }}>
                توريد جزئي
              </span>
            )}
          </div>
        )}
      </button>
    </div>
  );
}

function ScrollableRow({
  items,
  gap = 6,
}: {
  items: React.ReactNode[];
  gap?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div
      ref={ref}
      className="flex overflow-x-auto pb-1 snap-x snap-mandatory"
      style={{ gap, scrollbarWidth: 'none' }}
    >
      {items.map((item, i) => (
        <div key={i} className="flex-shrink-0 snap-start" style={{ width: 'calc(100vw - 48px)', maxWidth: 380 }}>
          {item}
        </div>
      ))}
    </div>
  );
}

interface MarketSectionProps {
  sessionPhone?: string | null;
  onAuthRequired?: () => void;
}

export default function MarketSection({ sessionPhone, onAuthRequired }: MarketSectionProps) {
  const [items, setItems] = useState<MarketCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKind>('all');
  const [selectedSupply, setSelectedSupply] = useState<SupplyCard | null>(null);
  const [selectedDemand, setSelectedDemand] = useState<DemandCard | null>(null);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [palletFilter, setPalletFilter] = useState<string>('all');
  const [cityFilter, setCityFilter] = useState<string>('all');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const [supplyRes, demandRes] = await Promise.all([
      supabase
        .from('inventory_batches')
        .select('id, phone, pallet_type, size, quality, pallet_condition, available_quantity, price_per_pallet, city, description, created_at, inventory_images(url, is_primary, sort_order)')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(40),
      supabase
        .from('orders')
        .select('id, phone, pallet_type, size, quality, quantity, city, accept_close_quality, accept_close_city, accept_partial_delivery, created_at, matched_quantity, status')
        .in('status', ['pending', 'unmatched', 'partially_matched', 'matched', 'fulfilled'])
        .order('created_at', { ascending: false })
        .limit(40),
    ]);

    const supplyPhones = [...new Set((supplyRes.data || []).map((b: any) => b.phone).filter(Boolean))];
    const demandPhones = [...new Set((demandRes.data || []).map((o: any) => o.phone).filter(Boolean))];
    const allPhones = [...new Set([...supplyPhones, ...demandPhones])];

    const { data: usersData } = await supabase
      .from('platform_users')
      .select('phone, trust_rating')
      .in('phone', allPhones);

    const userRatings = new Map((usersData || []).map((u: any) => [u.phone, u.trust_rating]));

    const supply: SupplyCard[] = (supplyRes.data || []).map((b: any) => {
      const imgs: any[] = b.inventory_images || [];
      const sorted = [...imgs].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
      return {
        id: b.id,
        kind: 'supply',
        phone: b.phone || '',
        pallet_type: b.pallet_type,
        size: b.size,
        quality: b.quality,
        pallet_condition: b.pallet_condition || 'used',
        available_quantity: b.available_quantity,
        price_per_pallet: b.price_per_pallet || 0,
        city: b.city,
        description: b.description || '',
        image_urls: sorted.map((i: any) => i.url),
        created_at: b.created_at,
        trust_rating: userRatings.get(b.phone) ?? 3,
        is_sold: b.available_quantity <= 0,
      };
    });

    const demand: DemandCard[] = (demandRes.data || []).map((o: any) => ({
      id: o.id,
      kind: 'demand',
      phone: o.phone || '',
      pallet_type: o.pallet_type,
      size: o.size,
      quality: o.quality,
      quantity: o.quantity,
      city: o.city,
      accept_close_quality: o.accept_close_quality,
      accept_close_city: o.accept_close_city,
      accept_partial_delivery: o.accept_partial_delivery,
      created_at: o.created_at,
      trust_rating: userRatings.get(o.phone) ?? 3,
      matched_quantity: o.matched_quantity || 0,
      status: o.status,
    }));

    setItems([...supply, ...demand]);
    setLastUpdated(new Date());
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    const channel = supabase
      .channel('market-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_batches' }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, loadData)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleSupplyClick = useCallback((card: SupplyCard) => {
    if (!sessionPhone) { setShowAuthPrompt(true); return; }
    setSelectedSupply(card);
  }, [sessionPhone]);

  const handleDemandClick = useCallback((card: DemandCard) => {
    if (!sessionPhone) { setShowAuthPrompt(true); return; }
    setSelectedDemand(card);
  }, [sessionPhone]);

  const baseItems = tab === 'all' ? items : tab === 'supply' ? items.filter(i => i.kind === 'supply') : items.filter(i => i.kind === 'demand');
  const allPalletTypes = [...new Set(baseItems.map((i) => i.pallet_type))].filter(Boolean);
  const allCities = [...new Set(baseItems.map((i) => i.city))].filter(Boolean);

  const filtered = baseItems
    .filter((i) => {
      return (palletFilter === 'all' || i.pallet_type === palletFilter) && (cityFilter === 'all' || i.city === cityFilter);
    })
    .sort((a, b) => {
      const aSold =
        (a.kind === 'supply' && (a as SupplyCard).is_sold) ||
        (a.kind === 'demand' && ((a as DemandCard).status === 'matched' || (a as DemandCard).status === 'fulfilled'));
      const bSold =
        (b.kind === 'supply' && (b as SupplyCard).is_sold) ||
        (b.kind === 'demand' && ((b as DemandCard).status === 'matched' || (b as DemandCard).status === 'fulfilled'));
      if (aSold && !bSold) return 1;
      if (!aSold && bSold) return -1;
      return 0;
    });

  const updatedText = lastUpdated
    ? (() => { const m = Math.floor((Date.now() - lastUpdated.getTime()) / 60000); return m < 1 ? 'تم التحديث الآن' : `تحديث قبل ${m} د`; })()
    : 'جاري التحميل...';

  const showSubFilters = tab !== 'all' && (allPalletTypes.length > 0 || allCities.length > 0);

  const supplyCount = items.filter(i => i.kind === 'supply').length;
  const demandCount = items.filter(i => i.kind === 'demand').length;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 px-4 pt-3 pb-2">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              disabled={loading}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold transition-all"
              style={{ background: '#f0f9f4', color: '#15803d', border: '1px solid rgba(21,128,61,0.12)' }}
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
              {updatedText}
            </button>
          </div>
          <div className="flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-green-600" />
            <span className="text-[13px] font-black text-[#1a3a4a]">سوق الطبليات</span>
          </div>
        </div>

        <div className="flex gap-2 mb-2">
          {(['all', 'supply', 'demand'] as TabKind[]).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setPalletFilter('all'); setCityFilter('all'); }}
              className="flex-1 py-2 rounded-xl text-[12px] font-bold transition-all"
              style={tab === t
                ? { background: 'linear-gradient(135deg, #15803d, #16a34a)', color: 'white', boxShadow: '0 2px 8px rgba(21,128,61,0.25)' }
                : { background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0' }
              }
            >
              {t === 'all' ? `الكل (${items.length})` : t === 'supply' ? `عروض (${supplyCount})` : `طلبات (${demandCount})`}
            </button>
          ))}
        </div>

        {showSubFilters && (
          <div>
            <button
              onClick={() => setShowFilters(f => !f)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold mb-2 w-full justify-center transition-all"
              style={{ background: '#f0f4f8', color: '#4a7a8a', border: '1px solid rgba(0,0,0,0.06)' }}
            >
              <Filter className="w-3 h-3" />
              تصفية
              <ChevronDown className={`w-3 h-3 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
            {showFilters && (
              <div className="flex gap-2 mb-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                <select
                  value={palletFilter}
                  onChange={e => setPalletFilter(e.target.value)}
                  className="flex-shrink-0 text-[11px] px-2 py-1.5 rounded-lg border outline-none"
                  style={{ background: '#f8fafc', color: '#334155', borderColor: '#e2e8f0' }}
                >
                  <option value="all">كل الأنواع</option>
                  {allPalletTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <select
                  value={cityFilter}
                  onChange={e => setCityFilter(e.target.value)}
                  className="flex-shrink-0 text-[11px] px-2 py-1.5 rounded-lg border outline-none"
                  style={{ background: '#f8fafc', color: '#334155', borderColor: '#e2e8f0' }}
                >
                  <option value="all">كل المدن</option>
                  {allCities.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {loading && items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-[13px] text-[#64748b]">جاري تحميل السوق...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Package className="w-10 h-10 text-gray-300" />
            <span className="text-[13px] text-[#64748b]">لا توجد نتائج</span>
          </div>
        ) : tab === 'all' ? (
          <div className="flex flex-col gap-3">
            {filtered.map((card) =>
              card.kind === 'supply' ? (
                <SupplyCardItem key={card.id} card={card as SupplyCard} onClick={() => handleSupplyClick(card as SupplyCard)} />
              ) : (
                <DemandCardItem key={card.id} card={card as DemandCard} onClick={() => handleDemandClick(card as DemandCard)} />
              )
            )}
          </div>
        ) : tab === 'supply' ? (
          <div className="flex flex-col gap-3">
            {filtered.map((card) => (
              <SupplyCardItem key={card.id} card={card as SupplyCard} onClick={() => handleSupplyClick(card as SupplyCard)} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((card) => (
              <DemandCardItem key={card.id} card={card as DemandCard} onClick={() => handleDemandClick(card as DemandCard)} />
            ))}
          </div>
        )}
      </div>

      {selectedSupply && (
        <SupplyDetailSheet
          card={selectedSupply}
          sessionPhone={sessionPhone}
          onClose={() => setSelectedSupply(null)}
        />
      )}
      {selectedDemand && (
        <DemandDetailSheet
          card={selectedDemand}
          sessionPhone={sessionPhone}
          onClose={() => setSelectedDemand(null)}
        />
      )}
      {showAuthPrompt && (
        <AuthPromptSheet
          onClose={() => setShowAuthPrompt(false)}
          onLogin={() => { setShowAuthPrompt(false); onAuthRequired?.(); }}
        />
      )}
    </div>
  );
}
