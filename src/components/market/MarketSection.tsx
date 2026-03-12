import { useState, useEffect, useCallback } from 'react';
import { Search, SlidersHorizontal, X, Package, RefreshCw, ChevronDown } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useTranslation } from '../../lib/i18n';

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
}

export default function MarketSection({
  isAuthenticated,
  userPhone,
  sessionPhone,
}: MarketSectionProps) {
  const { t } = useTranslation();

  const [supplyCount, setSupplyCount] = useState(0);
  const [demandCount, setDemandCount] = useState(0);
  const [allPalletTypes, setAllPalletTypes] = useState<string[]>([]);
  const [allCities, setAllCities] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const [tab, setTab] = useState<'all' | 'supply' | 'demand'>('all');
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterType, setFilterType] = useState('');
  const [filterCity, setFilterCity] = useState('');
  const [filterQuality, setFilterQuality] = useState('');

  const loadCounts = useCallback(async () => {
    setLoading(true);
    try {
      const [supplyRes, demandRes] = await Promise.all([
        supabase
          .from('inventory_batches')
          .select('id, pallet_type, city')
          .eq('publish_to_market', true)
          .eq('status', 'active')
          .gt('quantity_available', 0),
        supabase
          .from('orders')
          .select('id, pallet_type, city')
          .in('status', ['pending', 'unmatched', 'partially_matched']),
      ]);

      const supplyData = supplyRes.data || [];
      const demandData = demandRes.data || [];

      setSupplyCount(supplyData.length);
      setDemandCount(demandData.length);

      const types = [...new Set([
        ...supplyData.map((r: any) => r.pallet_type),
        ...demandData.map((r: any) => r.pallet_type),
      ])].filter(Boolean) as string[];

      const cities = [...new Set([
        ...supplyData.map((r: any) => r.city),
        ...demandData.map((r: any) => r.city),
      ])].filter(Boolean) as string[];

      setAllPalletTypes(types);
      setAllCities(cities);
    } catch (e) {
      console.error('Market load error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCounts();
    const channel = supabase
      .channel('market_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_batches' }, loadCounts)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, loadCounts)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadCounts]);

  const totalCount = supplyCount + demandCount;
  const displayCount = tab === 'all' ? totalCount : tab === 'supply' ? supplyCount : demandCount;

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
            onClick={loadCounts}
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
                  {['A', 'B', 'C', 'Scrap'].map(q => <option key={q} value={q}>{q}</option>)}
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
          {([
            { key: 'all', label: t('common.all'), count: totalCount },
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
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div
            className="w-20 h-20 rounded-3xl flex items-center justify-center mb-5"
            style={{ background: '#f0fdf4', border: '2px solid #bbf7d0' }}
          >
            <Package className="w-10 h-10 text-green-400" />
          </div>
          <p className="text-[17px] font-black text-gray-700 mb-2">
            {loading ? 'جاري التحميل...' : `${displayCount} ${tab === 'supply' ? 'عرض مورّد' : tab === 'demand' ? 'طلب شراء' : 'عرض وطلب'}`}
          </p>
          <p className="text-[13px] text-gray-400 leading-relaxed max-w-[260px]">
            سيتم عرض البطاقات هنا بعد اكتمال بناء النظام الجديد
          </p>
        </div>
      </div>
    </div>
  );
}
