import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Warehouse, ShoppingBag, RefreshCw, MapPin, Package,
  Star, Wrench, LayoutGrid, ImageOff,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import SupplyDetailSheet from './SupplyDetailSheet';
import DemandDetailSheet from './DemandDetailSheet';
import AuthPromptSheet from './AuthPromptSheet';
import TrustRatingBadge from '../shared/TrustRatingBadge';

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
}

type MarketCard = SupplyCard | DemandCard;

export const QUALITY_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  A: { bg: '#dcfce7', text: '#15803d', label: 'A' },
  B: { bg: '#dbeafe', text: '#1d4ed8', label: 'B' },
  C: { bg: '#fef9c3', text: '#a16207', label: 'C' },
  Scrap: { bg: '#fee2e2', text: '#b91c1c', label: 'خردة' },
};

export const CONDITION_MAP: Record<string, { label: string; color: string; bg: string }> = {
  new: { label: 'جديدة', color: '#15803d', bg: '#f0fdf4' },
  used: { label: 'مستعملة', color: '#b45309', bg: '#fff7ed' },
  repairable: { label: 'قابلة للإصلاح', color: '#1d4ed8', bg: '#eff6ff' },
};

export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'الآن';
  if (mins < 60) return `${mins} د`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} س`;
  return `${Math.floor(hrs / 24)} ي`;
}

function SupplyCardImage({ url, count, onError }: { url: string; count: number; onError: () => void }) {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');

  return (
    <div
      className="relative flex-shrink-0 overflow-hidden rounded-r-2xl"
      style={{ width: 120, height: 140, background: '#e8f0f5' }}
    >
      {status === 'loading' && (
        <div className="absolute inset-0">
          <div className="absolute inset-0 animate-pulse" style={{ background: 'linear-gradient(110deg, #e8f0f5 0%, #f5f9fc 40%, #e8f0f5 60%)' }} />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-6 h-6 rounded-full border-2 border-blue-200 border-t-blue-400 animate-spin" />
          </div>
        </div>
      )}
      {status !== 'error' && (
        <img
          src={url}
          alt=""
          className={`w-full h-full object-cover transition-all duration-700 group-hover:scale-[1.08] ${status === 'loaded' ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setStatus('loaded')}
          onError={() => { setStatus('error'); onError(); }}
        />
      )}
      {status === 'error' && (
        <div className="w-full h-full flex flex-col items-center justify-center gap-1.5" style={{ background: 'linear-gradient(145deg, #E8F5E9 0%, #C8E6C9 100%)' }}>
          <ImageOff className="w-5 h-5 text-green-300" />
          <span className="text-[8px] font-semibold text-green-400">تعذّر التحميل</span>
        </div>
      )}
      {count > 1 && status === 'loaded' && (
        <div
          className="absolute top-2 left-2 text-[9px] font-black px-2 py-0.5 rounded-full flex items-center gap-0.5"
          style={{ background: 'rgba(0,0,0,0.6)', color: 'white', backdropFilter: 'blur(6px)' }}
        >
          <ImageOff className="w-2.5 h-2.5" />
          {count}
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

  return (
    <button
      onClick={onClick}
      className="w-full text-right group transition-all duration-200 active:scale-[0.985] overflow-hidden"
      style={{
        background: 'white',
        border: '1px solid rgba(21,101,64,0.08)',
        borderRadius: 20,
        boxShadow: '0 2px 12px rgba(21,101,64,0.06)',
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
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <span
                className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ background: 'rgba(21,128,61,0.08)', color: '#15803d', border: '1px solid rgba(21,128,61,0.15)' }}
              >
                عرض
              </span>
              <p className="text-[15px] font-black text-[#1a3a4a] leading-tight truncate">{card.pallet_type}</p>
            </div>

            <div className="flex items-center gap-1 mb-2 justify-end">
              <span className="text-[11px] font-semibold text-[#4a7a8a]">{card.city}</span>
              <MapPin className="w-3 h-3 text-green-500/60" />
            </div>

            <div className="flex items-center gap-1.5 flex-wrap justify-end">
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                style={{ background: q.bg, color: q.text }}
              >
                {q.label}
              </span>
              <span
                className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md flex items-center gap-0.5"
                style={{ background: cond.bg, color: cond.color }}
              >
                <Wrench className="w-2.5 h-2.5" />
                {cond.label}
              </span>
              {card.size && (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md" style={{ background: '#f0f4f8', color: '#4a7a8a' }}>
                  {card.size}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between mt-2.5 pt-2" style={{ borderTop: '1px solid rgba(0,0,0,0.04)' }}>
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-[#a0b5c0]">{timeAgo(card.created_at)}</span>
              {card.price_per_pallet > 0 && (
                <div className="flex items-baseline gap-0.5">
                  <span className="text-[13px] font-black text-[#15803d]">{card.price_per_pallet}</span>
                  <span className="text-[8px] text-[#15803d]/60 font-semibold">ر.س</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <TrustRatingBadge rating={card.trust_rating ?? 3} size="sm" showLabel={false} />
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg" style={{ background: '#f0f9f4' }}>
                <span className="text-[12px] font-black text-[#15803d]">{card.available_quantity.toLocaleString()}</span>
                <Package className="w-3 h-3 text-green-500/70" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}

function DemandCardItem({ card, onClick }: { card: DemandCard; onClick: () => void }) {
  const q = QUALITY_COLORS[card.quality] || QUALITY_COLORS.C;
  const flexCount = [card.accept_close_quality, card.accept_close_city, card.accept_partial_delivery].filter(Boolean).length;

  return (
    <button
      onClick={onClick}
      className="w-full text-right transition-all duration-200 active:scale-[0.985] overflow-hidden"
      style={{
        background: 'white',
        border: '1px solid rgba(217,119,6,0.1)',
        borderRadius: 20,
        boxShadow: '0 2px 12px rgba(217,119,6,0.06)',
      }}
    >
      <div className="relative flex flex-row-reverse gap-0">
        <div
          className="absolute bottom-0 left-0 w-40 h-40 rounded-full opacity-[0.07] pointer-events-none"
          style={{
            background: 'radial-gradient(circle, #F59E0B 0%, transparent 70%)',
            transform: 'translate(-30%, 30%)',
          }}
        />

        <div
          className="flex-shrink-0 flex flex-col items-center justify-center gap-1.5 relative rounded-r-2xl"
          style={{ width: 120, height: 140, background: 'linear-gradient(145deg, #FFF7ED 0%, #FEF3C7 50%, #FDE68A 100%)' }}
        >
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(245,158,11,0.15)' }}>
            <ShoppingBag className="w-5 h-5 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-0.5">
            <span className="text-[20px] font-black text-amber-700">{card.quantity.toLocaleString()}</span>
          </div>
          <span className="text-[8px] font-bold text-amber-600/50 -mt-1">طبلية</span>
        </div>

        <div className="flex-1 min-w-0 flex flex-col justify-between p-3">
          <div>
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <span
                className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ background: 'rgba(217,119,6,0.08)', color: '#b45309', border: '1px solid rgba(217,119,6,0.15)' }}
              >
                طلب
              </span>
              <p className="text-[15px] font-black text-[#1a3a4a] leading-tight truncate">{card.pallet_type}</p>
            </div>

            <div className="flex items-center gap-1 mb-2 justify-end">
              <span className="text-[11px] font-semibold text-[#4a7a8a]">{card.city}</span>
              <MapPin className="w-3 h-3 text-amber-400" />
            </div>

            <div className="flex items-center gap-1.5 flex-wrap justify-end">
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                style={{ background: q.bg, color: q.text }}
              >
                {q.label}
              </span>
              {card.size && (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md" style={{ background: '#f0f4f8', color: '#4a7a8a' }}>
                  {card.size}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between mt-2.5 pt-2" style={{ borderTop: '1px solid rgba(0,0,0,0.04)' }}>
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-[#a0b5c0]">{timeAgo(card.created_at)}</span>
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg" style={{ background: '#fff7ed' }}>
                <span className="text-[12px] font-black text-[#b45309]">{card.quantity.toLocaleString()}</span>
                <Package className="w-3 h-3 text-amber-500/70" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <TrustRatingBadge rating={card.trust_rating ?? 3} size="sm" showLabel={false} />
              {flexCount > 0 && (
                <span
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1"
                  style={{ background: '#FFF7ED', color: '#b45309', border: '1px solid #FED7AA' }}
                >
                  <Star className="w-2.5 h-2.5" />
                  {flexCount} مرونة
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {(card.accept_close_quality || card.accept_close_city || card.accept_partial_delivery) && (
        <div className="flex gap-1.5 flex-wrap px-3 pb-2.5 pt-0.5">
          {card.accept_close_quality && (
            <span className="text-[9px] font-medium px-2 py-0.5 rounded-full" style={{ background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0' }}>
              جودة قريبة
            </span>
          )}
          {card.accept_close_city && (
            <span className="text-[9px] font-medium px-2 py-0.5 rounded-full" style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}>
              مدينة قريبة
            </span>
          )}
          {card.accept_partial_delivery && (
            <span className="text-[9px] font-medium px-2 py-0.5 rounded-full" style={{ background: '#fef9c3', color: '#a16207', border: '1px solid #fef08a' }}>
              توريد جزئي
            </span>
          )}
        </div>
      )}
    </button>
  );
}

function ScrollableRow({
  items,
  gap = 6,
}: {
  items: { key: string; node: React.ReactNode }[];
  gap?: number;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const isRtl = getComputedStyle(el).direction === 'rtl';
    if (isRtl) {
      setCanScrollRight(el.scrollLeft < -1);
      setCanScrollLeft(el.scrollLeft > -(el.scrollWidth - el.clientWidth - 1));
    } else {
      setCanScrollLeft(el.scrollLeft > 1);
      setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
    }
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener('scroll', checkScroll, { passive: true });
    const ro = new ResizeObserver(checkScroll);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', checkScroll);
      ro.disconnect();
    };
  }, [checkScroll, items.length]);

  const scroll = (dir: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const isRtl = getComputedStyle(el).direction === 'rtl';
    const amount = 150;
    if (dir === 'left') {
      el.scrollBy({ left: isRtl ? amount : -amount, behavior: 'smooth' });
    } else {
      el.scrollBy({ left: isRtl ? -amount : amount, behavior: 'smooth' });
    }
  };

  return (
    <div className="relative group/slider">
      {canScrollRight && (
        <button
          onClick={() => scroll('right')}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-6 h-6 rounded-full flex items-center justify-center transition-all opacity-0 group-hover/slider:opacity-100"
          style={{ background: 'rgba(255,255,255,0.95)', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}
        >
          <ChevronLeft className="w-3.5 h-3.5 text-[#1a4a5e]" />
        </button>
      )}
      {canScrollLeft && (
        <button
          onClick={() => scroll('left')}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-6 h-6 rounded-full flex items-center justify-center transition-all opacity-0 group-hover/slider:opacity-100"
          style={{ background: 'rgba(255,255,255,0.95)', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}
        >
          <ChevronRight className="w-3.5 h-3.5 text-[#1a4a5e]" />
        </button>
      )}
      <div
        ref={scrollRef}
        className="flex overflow-x-auto overflow-y-hidden scrollbar-hide"
        style={{
          gap: `${gap}px`,
          WebkitOverflowScrolling: 'touch',
          scrollBehavior: 'smooth',
          scrollSnapType: 'x proximity',
          paddingBottom: 2,
        }}
      >
        {items.map((item) => (
          <div key={item.key} style={{ flexShrink: 0, scrollSnapAlign: 'start' }}>
            {item.node}
          </div>
        ))}
      </div>
    </div>
  );
}

interface TabSliderProps {
  tab: TabKind;
  setTab: (t: TabKind) => void;
  items: MarketCard[];
  supplyCards: SupplyCard[];
  demandCards: DemandCard[];
  loading: boolean;
  showSubFilters: boolean;
  allPalletTypes: string[];
  allCities: string[];
  palletFilter: string;
  setPalletFilter: (v: string) => void;
  cityFilter: string;
  setCityFilter: (v: string) => void;
}

function TabSlider({
  tab, setTab, items, supplyCards, demandCards, loading,
  showSubFilters, allPalletTypes, allCities,
  palletFilter, setPalletFilter, cityFilter, setCityFilter,
}: TabSliderProps) {
  const tabs = [
    { id: 'all' as TabKind, label: 'الكل', count: items.length, bg: '#1a4a5e', icon: <LayoutGrid className="w-3.5 h-3.5" /> },
    { id: 'supply' as TabKind, label: 'موردون', count: supplyCards.length, bg: '#1565C0', icon: <Warehouse className="w-3.5 h-3.5" /> },
    { id: 'demand' as TabKind, label: 'طلبات', count: demandCards.length, bg: '#D97706', icon: <ShoppingBag className="w-3.5 h-3.5" /> },
  ];

  const accentColor = tab === 'supply' ? '#1565C0' : tab === 'demand' ? '#D97706' : '#1a4a5e';

  const tabItems = tabs.map((t) => ({
    key: t.id,
    node: (
      <button
        onClick={() => {
          if (tab === t.id && t.id !== 'all') setTab('all');
          else setTab(t.id);
        }}
        className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-[12px] font-bold whitespace-nowrap transition-all duration-300"
        style={{
          background: tab === t.id ? t.bg : 'white',
          color: tab === t.id ? 'white' : '#4a6d7c',
          border: tab === t.id ? 'none' : '1px solid rgba(0,0,0,0.08)',
          boxShadow: tab === t.id ? `0 4px 14px ${t.bg}40` : '0 1px 3px rgba(0,0,0,0.04)',
          transform: tab === t.id ? 'scale(1.05)' : 'scale(1)',
        }}
      >
        <span
          className="transition-transform duration-300"
          style={{ transform: tab === t.id ? 'rotate(0deg) scale(1.1)' : 'rotate(0deg) scale(1)' }}
        >
          {t.icon}
        </span>
        {t.label}
        {!loading && t.count > 0 && (
          <span
            className="text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center transition-all duration-300"
            style={tab === t.id
              ? { background: 'rgba(255,255,255,0.25)', color: 'white' }
              : { background: '#f0f4f8', color: '#4a6d7c' }
            }
          >
            {t.count}
          </span>
        )}
      </button>
    ),
  }));

  const palletItems = [
    {
      key: '_all_types',
      node: (
        <button
          onClick={() => setPalletFilter('all')}
          className="px-3 py-1.5 rounded-xl text-[10px] font-semibold whitespace-nowrap transition-all duration-300"
          style={{
            background: palletFilter === 'all' ? accentColor : 'rgba(255,255,255,0.95)',
            color: palletFilter === 'all' ? 'white' : '#4a6d7c',
            border: palletFilter === 'all' ? 'none' : '1px solid rgba(0,0,0,0.08)',
            boxShadow: palletFilter === 'all' ? `0 2px 8px ${accentColor}30` : 'none',
          }}
        >
          كل الأنواع
        </button>
      ),
    },
    ...allPalletTypes.map((pt) => ({
      key: pt,
      node: (
        <button
          onClick={() => setPalletFilter(pt)}
          className="px-3 py-1.5 rounded-xl text-[10px] font-semibold whitespace-nowrap transition-all duration-300"
          style={{
            background: palletFilter === pt ? accentColor : 'rgba(255,255,255,0.95)',
            color: palletFilter === pt ? 'white' : '#4a6d7c',
            border: palletFilter === pt ? 'none' : '1px solid rgba(0,0,0,0.08)',
            boxShadow: palletFilter === pt ? `0 2px 8px ${accentColor}30` : 'none',
          }}
        >
          {pt}
        </button>
      ),
    })),
  ];

  const cityItems = [
    {
      key: '_all_cities',
      node: (
        <button
          onClick={() => setCityFilter('all')}
          className="px-3 py-1.5 rounded-xl text-[10px] font-semibold whitespace-nowrap transition-all duration-300"
          style={{
            background: cityFilter === 'all' ? accentColor : 'rgba(255,255,255,0.95)',
            color: cityFilter === 'all' ? 'white' : '#4a6d7c',
            border: cityFilter === 'all' ? 'none' : '1px solid rgba(0,0,0,0.08)',
            boxShadow: cityFilter === 'all' ? `0 2px 8px ${accentColor}30` : 'none',
          }}
        >
          كل المدن
        </button>
      ),
    },
    ...allCities.map((c) => ({
      key: c,
      node: (
        <button
          onClick={() => setCityFilter(c)}
          className="px-3 py-1.5 rounded-xl text-[10px] font-semibold whitespace-nowrap transition-all duration-300"
          style={{
            background: cityFilter === c ? accentColor : 'rgba(255,255,255,0.95)',
            color: cityFilter === c ? 'white' : '#4a6d7c',
            border: cityFilter === c ? 'none' : '1px solid rgba(0,0,0,0.08)',
            boxShadow: cityFilter === c ? `0 2px 8px ${accentColor}30` : 'none',
          }}
        >
          {c}
        </button>
      ),
    })),
  ];

  return (
    <div className="space-y-2">
      <ScrollableRow items={tabItems} gap={8} />

      <div
        className="transition-all duration-400 ease-out overflow-hidden"
        style={{
          maxHeight: showSubFilters ? 80 : 0,
          opacity: showSubFilters ? 1 : 0,
          transform: showSubFilters ? 'translateY(0)' : 'translateY(-8px)',
        }}
      >
        <div className="space-y-1.5 pt-1">
          {allPalletTypes.length > 0 && <ScrollableRow items={palletItems} gap={6} />}
          {allCities.length > 0 && <ScrollableRow items={cityItems} gap={6} />}
        </div>
      </div>
    </div>
  );
}

interface Props {
  onCreateOrder: () => void;
  onAddInventory: () => void;
  isAuthenticated: boolean;
  onShowAuth: () => void;
  onDetailSheetChange?: (isOpen: boolean) => void;
}

export default function MarketSection({
  onCreateOrder,
  onAddInventory,
  isAuthenticated,
  onShowAuth,
  onDetailSheetChange,
}: Props) {
  const [tab, setTab] = useState<TabKind>('all');
  const [palletFilter, setPalletFilter] = useState('all');
  const [cityFilter, setCityFilter] = useState('all');
  const [items, setItems] = useState<MarketCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [selectedSupply, setSelectedSupply] = useState<SupplyCard | null>(null);
  const [selectedDemand, setSelectedDemand] = useState<DemandCard | null>(null);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);

  useEffect(() => {
    const isOpen = !!(selectedSupply || selectedDemand);
    onDetailSheetChange?.(isOpen);
  }, [selectedSupply, selectedDemand, onDetailSheetChange]);

  const loadData = async () => {
    setLoading(true);
    const [supplyRes, demandRes] = await Promise.all([
      supabase
        .from('inventory_batches')
        .select('id, phone, pallet_type, size, quality, pallet_condition, available_quantity, price_per_pallet, city, description, created_at, inventory_images(url, is_primary, sort_order)')
        .eq('status', 'active')
        .gt('available_quantity', 0)
        .order('created_at', { ascending: false })
        .limit(30),
      supabase
        .from('orders')
        .select('id, phone, pallet_type, size, quality, quantity, city, accept_close_quality, accept_close_city, accept_partial_delivery, created_at')
        .in('status', ['pending', 'unmatched'])
        .order('created_at', { ascending: false })
        .limit(30),
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
    }));

    setItems([...supply, ...demand]);
    setLastUpdated(new Date());
    setLoading(false);
  };

  useEffect(() => {
    loadData();

    const ordersChannel = supabase
      .channel('market-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        loadData();
      })
      .subscribe();

    const inventoryChannel = supabase
      .channel('market-inventory')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_batches' }, () => {
        loadData();
      })
      .subscribe();

    const ratingsChannel = supabase
      .channel('market-ratings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_ratings' }, () => {
        loadData();
      })
      .subscribe();

    const usersChannel = supabase
      .channel('market-users')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'platform_users' }, () => {
        loadData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(inventoryChannel);
      supabase.removeChannel(ratingsChannel);
      supabase.removeChannel(usersChannel);
    };
  }, []);

  const supplyCards = items.filter((i) => i.kind === 'supply') as SupplyCard[];
  const demandCards = items.filter((i) => i.kind === 'demand') as DemandCard[];

  const baseItems = tab === 'supply' ? supplyCards : tab === 'demand' ? demandCards : items;
  const allPalletTypes = [...new Set(baseItems.map((i) => i.pallet_type))].filter(Boolean);
  const allCities = [...new Set(baseItems.map((i) => i.city))].filter(Boolean);

  const filtered = baseItems.filter((i) => {
    return (palletFilter === 'all' || i.pallet_type === palletFilter) && (cityFilter === 'all' || i.city === cityFilter);
  });

  const updatedText = lastUpdated
    ? (() => { const m = Math.floor((Date.now() - lastUpdated.getTime()) / 60000); return m < 1 ? 'تم التحديث الآن' : `تحديث قبل ${m} د`; })()
    : 'جاري التحميل...';

  const hasActiveFilters = palletFilter !== 'all' || cityFilter !== 'all';
  const showSubFilters = tab !== 'all' && (allPalletTypes.length > 0 || allCities.length > 0);

  return (
    <>
    <section className="px-4 lg:px-5 mt-5 pb-32 lg:pb-10">

      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="p-1.5 rounded-full transition-all active:scale-90"
            style={{ background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(0,0,0,0.06)' }}
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#4a6d7c] ${loading ? 'animate-spin' : ''}`} />
          </button>
          <p className="text-[10px] text-[#a0b5c0]">{updatedText}</p>
        </div>
        <h2 className="text-[18px] font-black text-[#1a4a5e]">سوق الطبليات</h2>
      </div>

      <TabSlider
        tab={tab}
        setTab={(t) => { setTab(t); setPalletFilter('all'); setCityFilter('all'); }}
        items={items}
        supplyCards={supplyCards}
        demandCards={demandCards}
        loading={loading}
        showSubFilters={showSubFilters}
        allPalletTypes={allPalletTypes}
        allCities={allCities}
        palletFilter={palletFilter}
        setPalletFilter={setPalletFilter}
        cityFilter={cityFilter}
        setCityFilter={setCityFilter}
      />

      <div className="mb-3" />

      {loading && (
        <div className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="animate-pulse rounded-[20px] overflow-hidden"
              style={{ background: 'white', border: '1px solid rgba(0,0,0,0.06)' }}
            >
              <div className="flex flex-row-reverse">
                <div className="flex-shrink-0 bg-slate-100" style={{ width: 120, height: 140 }} />
                <div className="flex-1 p-3 space-y-2">
                  <div className="flex justify-between">
                    <div className="h-3 bg-slate-100 rounded-full w-12" />
                    <div className="h-5 bg-slate-100 rounded-full w-20" />
                  </div>
                  <div className="h-3 bg-slate-100 rounded-full w-16 ml-auto" />
                  <div className="flex gap-1.5 justify-end">
                    <div className="h-5 bg-slate-100 rounded-md w-10" />
                    <div className="h-5 bg-slate-100 rounded-md w-14" />
                  </div>
                  <div className="flex justify-between pt-2" style={{ borderTop: '1px solid rgba(0,0,0,0.04)' }}>
                    <div className="h-4 bg-slate-100 rounded-full w-8" />
                    <div className="h-5 bg-slate-100 rounded-lg w-14" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-14 gap-4">
          <div className="w-16 h-16 rounded-3xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #EBF5FF, #DBEAFE)' }}>
            <Package className="w-8 h-8 text-[#2196F3]" />
          </div>
          <p className="text-[15px] font-bold text-[#1a4a5e]">لا توجد نتائج حالياً</p>
          <p className="text-[12px] text-[#a0b5c0] text-center leading-relaxed px-8">
            {tab === 'supply' ? 'لا توجد عروض موردين نشطة.' : tab === 'demand' ? 'لا توجد طلبات نشطة.' : 'لا توجد فرص في السوق حالياً.'}
          </p>
          <div className="flex gap-2">
            {tab !== 'demand' && (
              <button
                onClick={onAddInventory}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-[12px] font-bold text-white"
                style={{ background: 'linear-gradient(135deg, #1565C0, #1E88E5)' }}
              >
                <Warehouse className="w-3.5 h-3.5" />
                إضافة مخزون
              </button>
            )}
            {tab !== 'supply' && (
              <button
                onClick={onCreateOrder}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-[12px] font-bold text-white"
                style={{ background: 'linear-gradient(135deg, #B45309, #D97706)' }}
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                إنشاء طلب
              </button>
            )}
          </div>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">
          {filtered.map((card) =>
            card.kind === 'supply'
              ? <SupplyCardItem key={card.id} card={card as SupplyCard} onClick={() => setSelectedSupply(card as SupplyCard)} />
              : <DemandCardItem key={card.id} card={card as DemandCard} onClick={() => setSelectedDemand(card as DemandCard)} />
          )}
        </div>
      )}

    </section>

    {selectedSupply && (
      <SupplyDetailSheet
        card={selectedSupply}
        onClose={() => setSelectedSupply(null)}
        isAuthenticated={isAuthenticated}
        onShowAuthPrompt={() => setShowAuthPrompt(true)}
      />
    )}

    {selectedDemand && (
      <DemandDetailSheet
        card={selectedDemand}
        onClose={() => setSelectedDemand(null)}
        isAuthenticated={isAuthenticated}
        onShowAuthPrompt={() => setShowAuthPrompt(true)}
      />
    )}

    {showAuthPrompt && (
      <AuthPromptSheet
        onClose={() => setShowAuthPrompt(false)}
        onRegister={() => {
          setShowAuthPrompt(false);
          setSelectedSupply(null);
          setSelectedDemand(null);
          onShowAuth();
        }}
      />
    )}
    </>
  );
}
