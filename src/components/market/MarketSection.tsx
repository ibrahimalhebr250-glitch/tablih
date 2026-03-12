import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, SlidersHorizontal, X, Package, RefreshCw, ChevronDown } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useTranslation } from '../../lib/i18n';
import { PalletSaleCard, PalletDemandCard } from './PalletCards';
import type { SupplyCardData, DemandCardData, MarketCardData } from './PalletCards';
import PalletDetailsPage from './PalletDetailsPage';

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
  onLoginRequired?: (card?: import('./PalletCards').SupplyCardData) => void;
  onGoToInventory?: () => void;
}

const QUALITY_OPTIONS = ['A', 'B', 'C', 'Scrap'];

export default function MarketSection({
  isAuthenticated,
  userPhone,
  sessionPhone,
  onDetailSheetChange,
  onLoginRequired,
  onGoToInventory,
}: MarketSectionProps) {
  const { t } = useTranslation();

  const [items, setItems] = useState<MarketCardData[]>([]);
  const [allPalletTypes, setAllPalletTypes] = useState<string[]>([]);
  const [allCities, setAllCities] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const [tab, setTab] = useState<'all' | 'supply' | 'demand'>('all');
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterType, setFilterType] = useState('');
  const [filterCity, setFilterCity] = useState('');
  const [filterQuality, setFilterQuality] = useState('');

  const [selectedCard, setSelectedCard] = useState<MarketCardData | null>(null);
  const prevDetailOpen = useRef(false);

  useEffect(() => {
    const nowOpen = !!selectedCard;
    if (nowOpen !== prevDetailOpen.current) {
      prevDetailOpen.current = nowOpen;
      onDetailSheetChange?.(nowOpen);
    }
  }, [selectedCard, onDetailSheetChange]);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const [supplyRes, demandRes] = await Promise.all([
        supabase
          .from('inventory_batches')
          .select('id, phone, pallet_type, size, quality, pallet_condition, quantity_available, price_per_pallet, city, description, image_url, created_at')
          .eq('publish_to_market', true)
          .eq('status', 'active')
          .gt('quantity_available', 0)
          .order('created_at', { ascending: false })
          .limit(80),
        supabase
          .from('orders')
          .select('id, phone, pallet_type, size, quality, quantity, city, accept_close_quality, accept_close_city, accept_partial_delivery, created_at')
          .in('status', ['pending', 'unmatched', 'partially_matched'])
          .order('created_at', { ascending: false })
          .limit(80),
      ]);

      const supplyData = supplyRes.data || [];
      const demandData = demandRes.data || [];

      const batchIds = supplyData.map((r: any) => r.id);
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
        ...supplyData.map((r: any) => r.phone),
        ...demandData.map((r: any) => r.phone),
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

      const supplyItems: SupplyCardData[] = supplyData.map((r: any) => ({
        id: r.id,
        kind: 'supply' as const,
        phone: r.phone,
        pallet_type: r.pallet_type,
        size: r.size,
        quality: r.quality,
        pallet_condition: r.pallet_condition || 'used',
        available_quantity: r.quantity_available,
        price_per_pallet: r.price_per_pallet || 0,
        city: r.city,
        description: r.description || '',
        image_urls: imagesByBatch[r.id] || (r.image_url ? [r.image_url] : []),
        created_at: r.created_at,
        trust_rating: trustByPhone[r.phone],
      }));

      const demandItems: DemandCardData[] = demandData.map((r: any) => ({
        id: r.id,
        kind: 'demand' as const,
        phone: r.phone,
        pallet_type: r.pallet_type,
        size: r.size,
        quality: r.quality,
        quantity: r.quantity,
        city: r.city,
        accept_close_quality: r.accept_close_quality || false,
        accept_close_city: r.accept_close_city || false,
        accept_partial_delivery: r.accept_partial_delivery || false,
        created_at: r.created_at,
        trust_rating: trustByPhone[r.phone],
      }));

      const merged: MarketCardData[] = [];
      const maxLen = Math.max(supplyItems.length, demandItems.length);
      for (let i = 0; i < maxLen; i++) {
        if (supplyItems[i]) merged.push(supplyItems[i]);
        if (demandItems[i]) merged.push(demandItems[i]);
      }
      setItems(merged);

      const types = [...new Set(merged.map(i => i.pallet_type))].filter(Boolean) as string[];
      const cities = [...new Set(merged.map(i => i.city))].filter(Boolean) as string[];
      setAllPalletTypes(types);
      setAllCities(cities);
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

  const baseItems = tab === 'all' ? items : tab === 'supply' ? items.filter(i => i.kind === 'supply') : items.filter(i => i.kind === 'demand');
  const supplyCount = items.filter(i => i.kind === 'supply').length;
  const demandCount = items.filter(i => i.kind === 'demand').length;

  const filtered = baseItems.filter((item) => {
    const q = search.toLowerCase();
    const matchSearch = !q || item.pallet_type.toLowerCase().includes(q) || item.city.toLowerCase().includes(q);
    const matchType = !filterType || item.pallet_type === filterType;
    const matchCity = !filterCity || item.city === filterCity;
    const matchQuality = !filterQuality || item.quality === filterQuality;
    return matchSearch && matchType && matchCity && matchQuality;
  });

  const activeFilters = [filterType, filterCity, filterQuality].filter(Boolean).length;

  if (selectedCard) {
    return (
      <PalletDetailsPage
        card={selectedCard}
        onClose={() => setSelectedCard(null)}
        onLoginRequired={(card) => {
          setSelectedCard(null);
          onLoginRequired?.(card);
        }}
        onGoToInventory={() => {
          setSelectedCard(null);
          onGoToInventory?.();
        }}
        userPhone={userPhone || sessionPhone || undefined}
      />
    );
  }

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
            {activeFilters > 0 && (
              <span
                className="absolute -top-1 -left-1 w-3.5 h-3.5 rounded-full text-[8px] font-black text-white flex items-center justify-center"
                style={{ background: '#ef4444' }}
              >
                {activeFilters}
              </span>
            )}
          </button>

          <button
            onClick={loadItems}
            className="w-10 h-10 flex items-center justify-center rounded-xl transition-all active:scale-95"
            style={{ background: 'white', border: '1.5px solid rgba(0,0,0,0.08)', boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}
          >
            <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
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
                  {QUALITY_OPTIONS.map(q => <option key={q} value={q}>{q}</option>)}
                </select>
                <ChevronDown className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              </div>
            </div>
            {activeFilters > 0 && (
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
          {([
            { key: 'all', label: t('common.all'), count: items.length },
            { key: 'supply', label: t('marketplace.supply'), count: supplyCount },
            { key: 'demand', label: t('marketplace.demand'), count: demandCount },
          ] as const).map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
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
                <div className="w-full bg-gray-100" style={{ aspectRatio: '16/11' }} />
                <div className="p-3 space-y-2">
                  <div className="h-3 bg-gray-100 rounded-lg w-3/4" />
                  <div className="h-2.5 bg-gray-100 rounded-lg w-1/2" />
                  <div className="h-2.5 bg-gray-100 rounded-lg w-2/3" />
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
            {filtered.map((item) =>
              item.kind === 'supply' ? (
                <PalletSaleCard
                  key={item.id}
                  card={item as SupplyCardData}
                  onClick={(c) => setSelectedCard(c)}
                />
              ) : (
                <PalletDemandCard
                  key={item.id}
                  card={item as DemandCardData}
                  onClick={(c) => setSelectedCard(c)}
                />
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}
