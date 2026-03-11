import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, SlidersHorizontal, X, Package, ShoppingBag, RefreshCw, ChevronDown, MapPin, Star, Layers } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useTranslation } from '../../lib/i18n';
import SupplyDetailSheet from './SupplyDetailSheet';
import DemandDetailSheet from './DemandDetailSheet';
import AuthPromptSheet from './AuthPromptSheet';

interface SupplyCard {
  id: string;
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
  kind: 'supply';
}

interface DemandCard {
  id: string;
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
  kind: 'demand';
}

type MarketItem = SupplyCard | DemandCard;

const QUALITY_BASE: Record<string, { bg: string; text: string; accent: string; key: string }> = {
  A: { bg: '#dcfce7', text: '#15803d', accent: '#16a34a', key: 'qualityA' },
  B: { bg: '#dbeafe', text: '#1d4ed8', accent: '#2563eb', key: 'qualityB' },
  C: { bg: '#fff7ed', text: '#c2410c', accent: '#ea580c', key: 'qualityC' },
  Scrap: { bg: '#f3f4f6', text: '#6b7280', accent: '#9ca3af', key: 'qualityScrap' },
};

const PALLET_TYPE_ICONS: Record<string, string> = {
  'بلاستيك': '🔵',
  'خشب': '🟤',
  'معدن': '⚙️',
  'كارتون': '📦',
};

const DEMAND_PALLET_IMAGES = [
  'https://images.pexels.com/photos/6169668/pexels-photo-6169668.jpeg?auto=compress&cs=tinysrgb&w=400&h=225&fit=crop',
  'https://images.pexels.com/photos/4481259/pexels-photo-4481259.jpeg?auto=compress&cs=tinysrgb&w=400&h=225&fit=crop',
  'https://images.pexels.com/photos/1797428/pexels-photo-1797428.jpeg?auto=compress&cs=tinysrgb&w=400&h=225&fit=crop',
  'https://images.pexels.com/photos/906494/pexels-photo-906494.jpeg?auto=compress&cs=tinysrgb&w=400&h=225&fit=crop',
  'https://images.pexels.com/photos/1267338/pexels-photo-1267338.jpeg?auto=compress&cs=tinysrgb&w=400&h=225&fit=crop',
  'https://images.pexels.com/photos/5025660/pexels-photo-5025660.jpeg?auto=compress&cs=tinysrgb&w=400&h=225&fit=crop',
];

function useTimeAgo() {
  const { t } = useTranslation();
  return (dateStr: string): string => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return t('time.now');
    if (mins < 60) return t('time.minutesAgo').replace('{{count}}', String(mins));
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return t('time.hoursAgo').replace('{{count}}', String(hrs));
    return t('time.daysAgo').replace('{{count}}', String(Math.floor(hrs / 24)));
  };
}

function SupplyCardItem({ card, onClick }: { card: SupplyCard; onClick: () => void }) {
  const { t } = useTranslation();
  const qBase = QUALITY_BASE[card.quality] || QUALITY_BASE['C'];
  const qc = { ...qBase, label: t(`market.${qBase.key}`) };
  const img = card.image_urls?.[0];

  return (
    <button
      onClick={onClick}
      className="w-full text-right transition-all active:scale-[0.98] hover:shadow-lg"
      style={{
        background: 'white',
        borderRadius: 20,
        border: '1.5px solid rgba(21,128,61,0.15)',
        overflow: 'hidden',
        boxShadow: '0 2px 12px rgba(21,128,61,0.08)',
      }}
    >
      {img ? (
        <div className="relative w-full" style={{ aspectRatio: '16/9', background: '#f3f4f6' }}>
          <img src={img} alt="" className="w-full h-full object-cover" />
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, transparent 40%, rgba(0,0,0,0.45) 100%)' }}
          />
          <div
            className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black"
            style={{ background: 'rgba(21,128,61,0.88)', color: 'white', backdropFilter: 'blur(4px)' }}
          >
            <Package className="w-2.5 h-2.5" />
            عرض مورّد
          </div>
          <div
            className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-black"
            style={{ background: 'rgba(255,255,255,0.92)', color: qc.text, backdropFilter: 'blur(4px)' }}
          >
            {qc.label}
          </div>
          {card.price_per_pallet > 0 && (
            <div
              className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-black"
              style={{ background: 'rgba(0,0,0,0.6)', color: 'white', backdropFilter: 'blur(4px)' }}
            >
              {card.price_per_pallet} ر.س
            </div>
          )}
          <div
            className="absolute inset-0 flex flex-col items-center justify-center"
          >
            <span className="text-[20px] font-black text-white leading-none" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
              {card.available_quantity.toLocaleString()}
            </span>
            <span className="text-[9px] font-semibold text-white/80">{t('market.pallets')}</span>
          </div>
        </div>
      ) : (
        <div
          className="w-full relative flex items-center justify-center overflow-hidden"
          style={{ aspectRatio: '16/9', background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)' }}
        >
          <div className="flex flex-col items-center justify-center gap-1 z-10">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(21,128,61,0.12)', border: `2px solid rgba(21,128,61,0.2)` }}
            >
              <Package className="w-5 h-5 text-green-700" />
            </div>
            <span className="text-[18px] font-black text-green-800">{card.available_quantity.toLocaleString()}</span>
            <span className="text-[9px] text-green-600/70">{t('market.pallets')}</span>
          </div>
          <div
            className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black"
            style={{ background: 'rgba(21,128,61,0.88)', color: 'white' }}
          >
            <Package className="w-2.5 h-2.5" />
            عرض مورّد
          </div>
          <div
            className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-black"
            style={{ background: qc.bg, color: qc.text }}
          >
            {qc.label}
          </div>
        </div>
      )}
      <div className="p-3">
        <p className="text-[13px] font-black text-gray-900 leading-tight truncate">{card.pallet_type}</p>
        <div className="flex items-center justify-between mt-1.5">
          <div className="flex items-center gap-1">
            <MapPin className="w-2.5 h-2.5 flex-shrink-0 text-gray-400" />
            <span className="text-[11px] text-gray-500 truncate">{card.city}</span>
          </div>
          {card.price_per_pallet > 0 ? (
            <span
              className="px-2 py-0.5 rounded-lg text-[10px] font-black flex-shrink-0"
              style={{ background: '#f0fdf4', color: '#15803d' }}
            >
              {card.price_per_pallet} ر.س
            </span>
          ) : (
            <span
              className="px-2 py-0.5 rounded-lg text-[10px] font-semibold flex-shrink-0"
              style={{ background: '#f3f4f6', color: '#6b7280' }}
            >
              سعر قابل للتفاوض
            </span>
          )}
        </div>
        {card.trust_rating != null && (
          <div className="flex items-center gap-0.5 mt-1.5">
            {[1,2,3,4,5].map((s) => (
              <Star
                key={s}
                className="w-2.5 h-2.5"
                style={{
                  fill: s <= Math.round(card.trust_rating!) ? '#f59e0b' : 'none',
                  color: s <= Math.round(card.trust_rating!) ? '#f59e0b' : '#d1d5db',
                  strokeWidth: 1.5,
                }}
              />
            ))}
            <span className="text-[10px] font-bold text-amber-600 mr-0.5">{card.trust_rating.toFixed(1)}</span>
          </div>
        )}
      </div>
    </button>
  );
}

function DemandCardItem({ card, onClick, index = 0 }: { card: DemandCard; onClick: () => void; index?: number }) {
  const { t } = useTranslation();
  const timeAgo = useTimeAgo();
  const qBase = QUALITY_BASE[card.quality] || QUALITY_BASE['C'];
  const qc = { ...qBase, label: t(`market.${qBase.key}`) };
  const palletImg = DEMAND_PALLET_IMAGES[index % DEMAND_PALLET_IMAGES.length];
  const flexTags = [
    card.accept_close_quality && { label: t('market.flexible'), icon: <Star className="w-2.5 h-2.5" /> },
    card.accept_close_city && { label: t('market.nearbyCity'), icon: <MapPin className="w-2.5 h-2.5" /> },
    card.accept_partial_delivery && { label: t('market.partial'), icon: <Layers className="w-2.5 h-2.5" /> },
  ].filter(Boolean) as { label: string; icon: JSX.Element }[];

  return (
    <button
      onClick={onClick}
      className="w-full text-right transition-all active:scale-[0.98] hover:shadow-md"
      style={{
        background: 'white',
        borderRadius: 20,
        border: '1.5px solid rgba(234,88,12,0.15)',
        overflow: 'hidden',
        boxShadow: '0 2px 12px rgba(234,88,12,0.08)',
      }}
    >
      <div className="relative w-full" style={{ aspectRatio: '16/9', background: '#fff7ed' }}>
        <img src={palletImg} alt="" className="w-full h-full object-cover" />
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to bottom, rgba(154,52,18,0.45) 0%, rgba(154,52,18,0.25) 50%, rgba(154,52,18,0.55) 100%)' }}
        />

        <div
          className="absolute top-2 right-2 px-2.5 py-1 rounded-full text-[10px] font-black flex items-center gap-1"
          style={{ background: 'rgba(255,255,255,0.92)', color: '#c2410c', backdropFilter: 'blur(4px)' }}
        >
          <ShoppingBag className="w-2.5 h-2.5" />
          {t('market.purchaseRequest')}
        </div>

        <div
          className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-black"
          style={{ background: qc.bg, color: qc.text }}
        >
          {qc.label}
        </div>

        <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
          <span className="text-[22px] font-black text-white leading-none" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
            {card.quantity.toLocaleString()}
          </span>
          <span className="text-[10px] font-semibold text-white/80">
            {t('market.pallets')}
          </span>
        </div>

        {flexTags.length > 0 && (
          <div className="absolute bottom-2 right-2 left-2 flex gap-1 justify-end">
            {flexTags.slice(0, 2).map((tag, i) => (
              <span
                key={i}
                className="flex items-center gap-0.5 px-2 py-0.5 rounded-lg text-[9px] font-bold whitespace-nowrap"
                style={{
                  background: 'rgba(0,0,0,0.4)',
                  color: 'rgba(255,255,255,0.95)',
                  backdropFilter: 'blur(6px)',
                  border: '1px solid rgba(255,255,255,0.2)',
                }}
              >
                {tag.icon}
                {tag.label}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="p-3">
        <p className="text-[13px] font-black text-gray-900 leading-tight truncate">{card.pallet_type}</p>
        <div className="flex items-center justify-between mt-1.5">
          <div className="flex items-center gap-1">
            <MapPin className="w-2.5 h-2.5 flex-shrink-0 text-gray-400" />
            <span className="text-[11px] text-gray-500 truncate">{card.city}</span>
          </div>
          <span
            className="px-2 py-0.5 rounded-lg text-[10px] font-black flex-shrink-0"
            style={{ background: '#fff7ed', color: '#c2410c' }}
          >
            {timeAgo(card.created_at)}
          </span>
        </div>
        {card.trust_rating != null && (
          <div className="flex items-center gap-0.5 mt-1.5">
            {[1,2,3,4,5].map((s) => (
              <Star
                key={s}
                className="w-2.5 h-2.5"
                style={{
                  fill: s <= Math.round(card.trust_rating!) ? '#f59e0b' : 'none',
                  color: s <= Math.round(card.trust_rating!) ? '#f59e0b' : '#d1d5db',
                  strokeWidth: 1.5,
                }}
              />
            ))}
            <span className="text-[10px] font-bold text-amber-600 mr-0.5">{card.trust_rating.toFixed(1)}</span>
          </div>
        )}
      </div>
    </button>
  );
}

interface MarketSectionProps {
  onCreateOrder?: () => void;
  onAddInventory?: () => void;
  isAuthenticated?: boolean;
  userPhone?: string;
  sessionPhone?: string | null;
  onShowAuth?: () => void;
  onAuthRequired?: () => void;
  onDetailSheetChange?: (open: boolean) => void;
  onGoToDeals?: () => void;
  onLoginRequired?: () => void;
  pendingDemandOrderId?: string | null;
  onPendingDemandCleared?: () => void;
}

export default function MarketSection({
  isAuthenticated,
  userPhone,
  sessionPhone,
  onShowAuth,
  onAuthRequired,
  onDetailSheetChange,
  onGoToDeals,
  onLoginRequired,
  pendingDemandOrderId,
  onPendingDemandCleared,
}: MarketSectionProps) {
  const { t } = useTranslation();
  const resolvedPhone = sessionPhone ?? (isAuthenticated && userPhone ? userPhone : null);

  const [items, setItems] = useState<MarketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'all' | 'supply' | 'demand'>('all');
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterType, setFilterType] = useState('');
  const [filterCity, setFilterCity] = useState('');
  const [filterQuality, setFilterQuality] = useState('');
  const [selectedSupply, setSelectedSupply] = useState<SupplyCard | null>(null);
  const [selectedDemand, setSelectedDemand] = useState<DemandCard | null>(null);
  const [autoOpenOfferForId, setAutoOpenOfferForId] = useState<string | null>(null);
  const [autoOpenDealForId, setAutoOpenDealForId] = useState<string | null>(null);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);

  const prevIsAuth = useRef(false);
  const prevSheetOpen = useRef(false);
  const itemsRef = useRef<MarketItem[]>([]);

  useEffect(() => {
    const nowOpen = !!(selectedSupply || selectedDemand);
    if (nowOpen !== prevSheetOpen.current) {
      prevSheetOpen.current = nowOpen;
      onDetailSheetChange?.(nowOpen);
    }
  }, [selectedSupply, selectedDemand, onDetailSheetChange]);

  useEffect(() => {
    if (!isAuthenticated || prevIsAuth.current) return;
    prevIsAuth.current = true;

    const rawDemand = sessionStorage.getItem('pending_demand_offer');
    if (rawDemand) {
      try {
        const pending = JSON.parse(rawDemand);
        if (pending.order_id) {
          sessionStorage.removeItem('pending_demand_offer');
          const checkAndOpen = (currentItems: MarketItem[]) => {
            const match = currentItems.find(i => i.kind === 'demand' && i.id === pending.order_id) as DemandCard | undefined;
            if (match) {
              setAutoOpenOfferForId(pending.order_id);
              setSelectedDemand(match);
            }
          };
          if (itemsRef.current.length > 0) {
            checkAndOpen(itemsRef.current);
          } else {
            const interval = setInterval(() => {
              if (itemsRef.current.length > 0) {
                clearInterval(interval);
                checkAndOpen(itemsRef.current);
              }
            }, 200);
            setTimeout(() => clearInterval(interval), 10000);
          }
        }
      } catch {
        sessionStorage.removeItem('pending_demand_offer');
      }
    }

    const rawSupply = sessionStorage.getItem('pending_supply_card_deal');
    if (rawSupply) {
      try {
        const pending = JSON.parse(rawSupply);
        if (pending.inventory_batch_id) {
          sessionStorage.removeItem('pending_supply_card_deal');
          const checkAndOpen = (currentItems: MarketItem[]) => {
            const match = currentItems.find(i => i.kind === 'supply' && i.id === pending.inventory_batch_id) as SupplyCard | undefined;
            if (match) {
              setAutoOpenDealForId(pending.inventory_batch_id);
              setSelectedSupply(match);
            }
          };
          if (itemsRef.current.length > 0) {
            checkAndOpen(itemsRef.current);
          } else {
            const interval = setInterval(() => {
              if (itemsRef.current.length > 0) {
                clearInterval(interval);
                checkAndOpen(itemsRef.current);
              }
            }, 200);
            setTimeout(() => clearInterval(interval), 10000);
          }
        }
      } catch {
        sessionStorage.removeItem('pending_supply_card_deal');
      }
    }

  }, [isAuthenticated]);

  useEffect(() => {
    if (!prevIsAuth.current) prevIsAuth.current = !!isAuthenticated;
  }, []);

  useEffect(() => {
    const phone = sessionPhone || userPhone;
    if (!isAuthenticated || !phone) return;
    const rawMarket = sessionStorage.getItem('pending_market_request');
    if (!rawMarket) return;
    try {
      const pending = JSON.parse(rawMarket);
      if (pending.inventory_batch_id) {
        sessionStorage.removeItem('pending_market_request');
        supabase.rpc('create_order_from_market_offer', {
          p_buyer_phone: phone,
          p_inventory_batch_id: pending.inventory_batch_id,
          p_quantity: pending.quantity || 1,
          p_buyer_message: null,
        });
      }
    } catch {
      sessionStorage.removeItem('pending_market_request');
    }
  }, [isAuthenticated, sessionPhone, userPhone]);

  useEffect(() => {
    if (!pendingDemandOrderId || loading) return;
    const match = items.find(i => i.kind === 'demand' && i.id === pendingDemandOrderId) as DemandCard | undefined;
    if (match) {
      setAutoOpenOfferForId(pendingDemandOrderId);
      setSelectedDemand(match);
      onPendingDemandCleared?.();
    }
  }, [pendingDemandOrderId, items, loading, onPendingDemandCleared]);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const [supplyRes, demandRes] = await Promise.all([
        supabase
          .from('inventory_batches')
          .select('id, phone, pallet_type, size, quality, pallet_condition, quantity_available, price_per_pallet, city, description, image_url, created_at, publish_to_market')
          .eq('publish_to_market', true)
          .eq('status', 'active')
          .gt('quantity_available', 0)
          .order('created_at', { ascending: false })
          .limit(60),
        supabase
          .from('orders')
          .select('id, phone, pallet_type, size, quality, quantity, city, accept_close_quality, accept_close_city, accept_partial_delivery, created_at, status')
          .in('status', ['pending', 'unmatched', 'partially_matched'])
          .order('created_at', { ascending: false })
          .limit(60),
      ]);

      const batchIds = (supplyRes.data || []).map((r: any) => r.id);
      let imagesByBatch: Record<string, string[]> = {};
      if (batchIds.length > 0) {
        const { data: imgs } = await supabase
          .from('inventory_images')
          .select('batch_id, url, is_primary, sort_order')
          .in('batch_id', batchIds)
          .order('sort_order', { ascending: true });
        if (imgs) {
          for (const img of imgs) {
            if (!imagesByBatch[img.batch_id]) imagesByBatch[img.batch_id] = [];
            if (img.is_primary) {
              imagesByBatch[img.batch_id].unshift(img.url);
            } else {
              imagesByBatch[img.batch_id].push(img.url);
            }
          }
        }
      }

      const allPhones = [
        ...(supplyRes.data || []).map((r: any) => r.phone),
        ...(demandRes.data || []).map((r: any) => r.phone),
      ].filter(Boolean);
      const uniquePhones = [...new Set(allPhones)];

      let trustByPhone: Record<string, number> = {};
      if (uniquePhones.length > 0) {
        const { data: usersData } = await supabase
          .from('platform_users')
          .select('phone, trust_rating')
          .in('phone', uniquePhones);
        if (usersData) {
          for (const u of usersData) {
            if (u.trust_rating != null) trustByPhone[u.phone] = u.trust_rating;
          }
        }
      }

      const supplyItems: SupplyCard[] = (supplyRes.data || []).map((r: any) => {
        const imgs = imagesByBatch[r.id] || (r.image_url ? [r.image_url] : []);
        return {
          id: r.id,
          phone: r.phone,
          pallet_type: r.pallet_type,
          size: r.size,
          quality: r.quality,
          pallet_condition: r.pallet_condition,
          available_quantity: r.quantity_available,
          price_per_pallet: r.price_per_pallet || 0,
          city: r.city,
          description: r.description || '',
          image_urls: imgs,
          created_at: r.created_at,
          trust_rating: trustByPhone[r.phone],
          kind: 'supply',
        };
      });

      const demandItems: DemandCard[] = (demandRes.data || []).map((r: any) => ({
        id: r.id,
        phone: r.phone,
        pallet_type: r.pallet_type,
        size: r.size,
        quality: r.quality,
        quantity: r.quantity,
        city: r.city,
        accept_close_quality: r.accept_close_quality,
        accept_close_city: r.accept_close_city,
        accept_partial_delivery: r.accept_partial_delivery,
        created_at: r.created_at,
        trust_rating: trustByPhone[r.phone],
        kind: 'demand',
      }));

      const merged: MarketItem[] = [];
      const maxLen = Math.max(supplyItems.length, demandItems.length);
      for (let i = 0; i < maxLen; i++) {
        if (supplyItems[i]) merged.push(supplyItems[i]);
        if (demandItems[i]) merged.push(demandItems[i]);
      }
      itemsRef.current = merged;
      setItems(merged);
    } catch (e) {
      console.error('Market load error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadItems();
    const channel = supabase
      .channel('market_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_batches' }, loadItems)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, loadItems)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadItems]);

  const handleSupplyClick = useCallback((card: SupplyCard) => {
    setSelectedSupply(card);
  }, []);

  const handleDemandClick = useCallback((card: DemandCard) => {
    setSelectedDemand(card);
  }, []);

  const baseItems = tab === 'all' ? items : tab === 'supply' ? items.filter(i => i.kind === 'supply') : items.filter(i => i.kind === 'demand');
  const allPalletTypes = [...new Set(baseItems.map((i) => i.pallet_type))].filter(Boolean);
  const allCities = [...new Set(baseItems.map((i) => i.city))].filter(Boolean);

  const filtered = baseItems.filter((item) => {
    const q = search.toLowerCase();
    const matchSearch = !q || item.pallet_type.toLowerCase().includes(q) || item.city.toLowerCase().includes(q) || item.quality.toLowerCase().includes(q);
    const matchType = !filterType || item.pallet_type === filterType;
    const matchCity = !filterCity || item.city === filterCity;
    const matchQuality = !filterQuality || item.quality === filterQuality;
    return matchSearch && matchType && matchCity && matchQuality;
  });

  const supplyCount = items.filter(i => i.kind === 'supply').length;
  const demandCount = items.filter(i => i.kind === 'demand').length;

  return (
    <div className="min-h-screen" style={{ background: '#f5f7fa', direction: 'rtl' }}>
      <div className="sticky top-0 z-20 px-4 pt-4 pb-3" style={{ background: '#f5f7fa' }}>
        <div className="flex items-center gap-2 mb-3">
          <div
            className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-2xl"
            style={{ background: 'white', border: '1.5px solid rgba(0,0,0,0.08)', boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}
          >
            <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('marketplace.searchPlaceholder')}
              className="flex-1 text-[13px] bg-transparent outline-none text-gray-700 placeholder-gray-400"
            />
            {search && (
              <button onClick={() => setSearch('')}>
                <X className="w-4 h-4 text-gray-400" />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="w-10 h-10 flex items-center justify-center rounded-xl transition-all active:scale-95 relative"
            style={{
              background: showFilters ? '#1d4ed8' : 'white',
              border: '1.5px solid rgba(0,0,0,0.08)',
              boxShadow: '0 1px 6px rgba(0,0,0,0.05)',
            }}
          >
            <SlidersHorizontal className="w-4 h-4" style={{ color: showFilters ? 'white' : '#374151' }} />
            {(filterType || filterCity || filterQuality) && (
              <span
                className="absolute -top-1 -left-1 w-3.5 h-3.5 rounded-full text-[8px] font-black text-white flex items-center justify-center"
                style={{ background: '#ef4444' }}
              >
                {[filterType, filterCity, filterQuality].filter(Boolean).length}
              </span>
            )}
          </button>
          <button
            onClick={loadItems}
            className="w-10 h-10 flex items-center justify-center rounded-xl transition-all active:scale-95"
            style={{ background: 'white', border: '1.5px solid rgba(0,0,0,0.08)', boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}
          >
            <RefreshCw className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {showFilters && (
          <div
            className="p-3 rounded-2xl mb-3 space-y-2"
            style={{ background: 'white', border: '1.5px solid rgba(0,0,0,0.07)', boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}
          >
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full text-[12px] py-2 pr-3 pl-7 rounded-xl appearance-none outline-none text-gray-700"
                  style={{ background: '#f8fafc', border: '1.5px solid rgba(0,0,0,0.08)' }}
                >
                  <option value="">{t('common.all')}</option>
                  {allPalletTypes.map(pt => <option key={pt} value={pt}>{pt}</option>)}
                </select>
                <ChevronDown className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              </div>
              <div className="flex-1 relative">
                <select
                  value={filterCity}
                  onChange={(e) => setFilterCity(e.target.value)}
                  className="w-full text-[12px] py-2 pr-3 pl-7 rounded-xl appearance-none outline-none text-gray-700"
                  style={{ background: '#f8fafc', border: '1.5px solid rgba(0,0,0,0.08)' }}
                >
                  <option value="">{t('common.all')}</option>
                  {allCities.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <ChevronDown className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              </div>
              <div className="flex-1 relative">
                <select
                  value={filterQuality}
                  onChange={(e) => setFilterQuality(e.target.value)}
                  className="w-full text-[12px] py-2 pr-3 pl-7 rounded-xl appearance-none outline-none text-gray-700"
                  style={{ background: '#f8fafc', border: '1.5px solid rgba(0,0,0,0.08)' }}
                >
                  <option value="">{t('common.all')}</option>
                  {['A', 'B', 'C', 'Scrap'].map(q => <option key={q} value={q}>{t(`market.${QUALITY_BASE[q]?.key || 'qualityC'}`)}</option>)}
                </select>
                <ChevronDown className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              </div>
            </div>
            {(filterType || filterCity || filterQuality) && (
              <button
                onClick={() => { setFilterType(''); setFilterCity(''); setFilterQuality(''); }}
                className="w-full py-1.5 rounded-xl text-[11px] font-bold text-red-500 transition-all"
                style={{ background: '#fff1f2' }}
              >
                {t('common.filter')} ✕
              </button>
            )}
          </div>
        )}

        <div
          className="flex items-center gap-1 p-1 rounded-2xl"
          style={{ background: 'rgba(0,0,0,0.06)' }}
        >
          {[
            { key: 'all', label: t('common.all'), count: items.length },
            { key: 'supply', label: t('marketplace.supply'), count: supplyCount },
            { key: 'demand', label: t('marketplace.demand'), count: demandCount },
          ].map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setTab(key as typeof tab)}
              className="flex-1 py-2 rounded-xl text-[13px] font-bold transition-all"
              style={{
                background: tab === key ? 'white' : 'transparent',
                color: tab === key ? '#1d4ed8' : '#6b7280',
                boxShadow: tab === key ? '0 1px 6px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              {label}
              {count > 0 && (
                <span
                  className="mr-1 px-1.5 py-0.5 rounded-full text-[10px]"
                  style={{
                    background: tab === key ? '#eff6ff' : 'rgba(0,0,0,0.06)',
                    color: tab === key ? '#1d4ed8' : '#9ca3af',
                  }}
                >
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pb-6">
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse rounded-2xl overflow-hidden"
                style={{ background: 'white', border: '1.5px solid rgba(0,0,0,0.07)' }}
              >
                <div className="w-full bg-gray-100" style={{ aspectRatio: '16/9' }} />
                <div className="p-3 space-y-2">
                  <div className="h-3 bg-gray-100 rounded-lg w-3/4" />
                  <div className="h-2.5 bg-gray-100 rounded-lg w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: '#f3f4f6' }}
            >
              <Package className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-[15px] font-bold text-gray-500">{t('marketplace.noResults')}</p>
            <p className="text-[12px] text-gray-400 mt-1">{t('common.filter')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map((item, idx) =>
              item.kind === 'supply' ? (
                <SupplyCardItem key={item.id} card={item as SupplyCard} onClick={() => handleSupplyClick(item as SupplyCard)} />
              ) : (
                <DemandCardItem key={item.id} card={item as DemandCard} onClick={() => handleDemandClick(item as DemandCard)} index={idx} />
              )
            )}
          </div>
        )}
      </div>

      {selectedSupply && (
        <SupplyDetailSheet
          card={selectedSupply}
          sessionPhone={resolvedPhone}
          onClose={() => { setSelectedSupply(null); setAutoOpenDealForId(null); }}
          onLoginRequired={onLoginRequired}
          autoOpenDeal={selectedSupply.id === autoOpenDealForId}
        />
      )}
      {selectedDemand && (
        <DemandDetailSheet
          card={selectedDemand}
          sessionPhone={resolvedPhone}
          onClose={() => { setSelectedDemand(null); setAutoOpenOfferForId(null); }}
          onLoginRequired={onLoginRequired}
          autoOpenOffer={selectedDemand.id === autoOpenOfferForId}
        />
      )}
      {showAuthPrompt && (
        <AuthPromptSheet
          onClose={() => setShowAuthPrompt(false)}
          onRegister={() => {
            setShowAuthPrompt(false);
            onShowAuth?.();
            onAuthRequired?.();
          }}
        />
      )}
    </div>
  );
}
