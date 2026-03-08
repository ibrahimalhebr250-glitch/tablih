import { useState, useEffect, useCallback } from 'react';
import {
  Warehouse,
  ShoppingBag,
  Plus,
  Eye,
  EyeOff,
  Clock,
  CloudOff,
  Package,
  ArrowUpFromLine,
  MapPin,
  Ruler,
  Minus,
  X,
  Check,
  Calendar,
  Image as ImageIcon,
  AlertCircle,
} from 'lucide-react';
import { useMyInventory } from '../../../hooks/useMyInventory';
import type { InventoryFilter, MyInventoryItem } from '../../../hooks/useMyInventory';
import InventoryCard from '../inventory/InventoryCard';
import InventoryDetailSheet from '../inventory/InventoryDetailSheet';
import { supabase } from '../../../lib/supabase';

type SubTab = 'inventory' | 'purchases';

interface BuyerPurchaseItem {
  id: string;
  buyer_phone: string;
  original_deal_id: string;
  pallet_type: string;
  size: string;
  quality: string;
  condition: string | null;
  quantity: number;
  quantity_available: number;
  unit_price: number;
  total_paid: number;
  original_supplier_phone: string;
  original_supplier_name: string | null;
  city: string;
  images: string[] | null;
  description: string | null;
  acquired_at: string;
  created_at: string;
}

interface InventoryPrefill {
  pallet_type?: string;
  size?: string;
  quality?: string;
  quantity?: number;
  city?: string;
}

interface Props {
  phone: string;
  onAddInventory: () => void;
  onAddInventoryWithPrefill?: (prefill?: InventoryPrefill, source?: 'supplier_added' | 'purchase_transfer') => void;
}

const FILTER_CONFIG: { key: InventoryFilter; label: string; color: string; icon: typeof Eye }[] = [
  { key: 'all', label: 'الكل', color: '#1a4a5e', icon: Package },
  { key: 'published', label: 'منشور في السوق', color: '#059669', icon: Eye },
  { key: 'unpublished', label: 'غير منشور', color: '#6b7280', icon: EyeOff },
  { key: 'in_deal', label: 'قيد الصفقة', color: '#d97706', icon: Clock },
];

const QUALITY_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  A: { label: 'ممتازة', color: '#059669', bg: '#ECFDF5' },
  B: { label: 'جيدة', color: '#0369a1', bg: '#EFF6FF' },
  C: { label: 'مقبولة', color: '#b45309', bg: '#FFFBEB' },
  Scrap: { label: 'خردة', color: '#6b7280', bg: '#F3F4F6' },
};

const CONDITION_LABELS: Record<string, string> = {
  new: 'جديدة',
  used: 'مستعملة',
  repairable: 'قابلة للإصلاح',
};

export default function CloudWarehouseTab({ phone, onAddInventory, onAddInventoryWithPrefill }: Props) {
  const [subTab, setSubTab] = useState<SubTab>('inventory');
  const [purchases, setPurchases] = useState<BuyerPurchaseItem[]>([]);
  const [loadingPurch, setLoadingPurch] = useState(true);

  const inventory = useMyInventory(phone);
  const counts = inventory.getCounts();

  const fetchPurchases = useCallback(async () => {
    setLoadingPurch(true);
    console.log('[CloudWarehouseTab] Fetching purchases for phone:', phone);
    const { data, error } = await supabase
      .from('buyer_inventory')
      .select('*')
      .eq('buyer_phone', phone)
      .order('created_at', { ascending: false });
    console.log('[CloudWarehouseTab] Purchases data:', data);
    console.log('[CloudWarehouseTab] Purchases error:', error);
    console.log('[CloudWarehouseTab] Number of purchases:', data?.length || 0);
    setPurchases((data as BuyerPurchaseItem[]) || []);
    setLoadingPurch(false);
  }, [phone]);

  useEffect(() => {
    fetchPurchases();

    const channel = supabase
      .channel('buyer_purchases_live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'buyer_inventory', filter: `buyer_phone=eq.${phone}` }, () => {
        fetchPurchases();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchPurchases, phone]);

  const purchasesWithAvailable = purchases.filter(p => p.quantity_available > 0);
  const totalAvailablePallets = purchases.reduce((s, p) => s + (p.quantity_available || 0), 0);

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex gap-2 p-1 rounded-xl bg-white/50 border border-white/80">
        <button
          onClick={() => setSubTab('inventory')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-[12px] font-bold transition-all ${
            subTab === 'inventory'
              ? 'bg-white text-[#1a4a5e] shadow-sm'
              : 'text-[#7a9aab]'
          }`}
        >
          <Warehouse className="w-4 h-4" />
          مخزوني
          {counts.all > 0 && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
              subTab === 'inventory' ? 'bg-[#1a4a5e] text-white' : 'bg-gray-200 text-gray-500'
            }`}>
              {counts.all}
            </span>
          )}
        </button>
        <button
          onClick={() => setSubTab('purchases')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-[12px] font-bold transition-all ${
            subTab === 'purchases'
              ? 'bg-white text-[#0369a1] shadow-sm'
              : 'text-[#7a9aab]'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          مشترياتي
          {purchasesWithAvailable.length > 0 && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
              subTab === 'purchases' ? 'bg-[#0369a1] text-white' : 'bg-gray-200 text-gray-500'
            }`}>
              {purchasesWithAvailable.length}
            </span>
          )}
        </button>
      </div>

      {subTab === 'inventory' ? (
        <MyInventorySection inventory={inventory} counts={counts} onAddInventory={onAddInventory} />
      ) : (
        <PurchasesSubTab
          purchases={purchases}
          loading={loadingPurch}
          totalAvailable={totalAvailablePallets}
          onWithdrawToInventory={(item, qty) => {
            if (onAddInventoryWithPrefill) {
              onAddInventoryWithPrefill(
                {
                  pallet_type: item.pallet_type,
                  size: item.size,
                  quality: item.quality,
                  quantity: qty,
                  city: item.city,
                },
                'purchase_transfer'
              );
            }
          }}
          onRefresh={fetchPurchases}
          buyerPhone={phone}
        />
      )}
    </div>
  );
}

function MyInventorySection({
  inventory,
  counts,
  onAddInventory,
}: {
  inventory: ReturnType<typeof useMyInventory>;
  counts: { all: number; published: number; unpublished: number; in_deal: number };
  onAddInventory: () => void;
}) {
  const [filter, setFilter] = useState<InventoryFilter>('all');
  const [selectedItem, setSelectedItem] = useState<MyInventoryItem | null>(null);

  const filtered = inventory.getFilteredItems(filter);

  const getCount = (key: InventoryFilter) => {
    if (key === 'all') return counts.all;
    if (key === 'published') return counts.published;
    if (key === 'unpublished') return counts.unpublished;
    return counts.in_deal;
  };

  if (inventory.loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white/60 rounded-2xl p-4 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-[72px] h-[72px] rounded-xl bg-gray-200" />
              <div className="flex-1 space-y-2.5">
                <div className="h-4 bg-gray-200 rounded w-2/3" />
                <div className="h-3 bg-gray-200 rounded w-1/3" />
                <div className="flex gap-2">
                  <div className="h-3 bg-gray-200 rounded w-16" />
                  <div className="h-3 bg-gray-200 rounded w-12" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {FILTER_CONFIG.map(f => {
          const count = getCount(f.key);
          const isActive = filter === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold transition-all whitespace-nowrap flex-shrink-0 ${
                isActive
                  ? 'bg-white shadow-sm border border-gray-200'
                  : 'text-[#7a9aab] hover:bg-white/60'
              }`}
              style={isActive ? { color: f.color } : undefined}
            >
              {f.key !== 'all' && (
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: f.color, opacity: isActive ? 1 : 0.5 }}
                />
              )}
              {f.label}
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  isActive ? 'bg-gray-100' : 'bg-gray-100/50'
                }`}
                style={{ color: isActive ? f.color : '#7a9aab' }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {counts.all > 0 && (
        <div
          className="flex items-center justify-between px-4 py-2.5 rounded-xl"
          style={{ background: 'linear-gradient(135deg, rgba(26,74,94,0.04) 0%, rgba(44,111,138,0.04) 100%)' }}
        >
          <div className="flex items-center gap-4">
            <div className="text-center">
              <span className="text-[16px] font-black text-[#059669]">{counts.published}</span>
              <p className="text-[9px] text-[#7a9aab]">منشور</p>
            </div>
            <div className="w-px h-6 bg-gray-200" />
            <div className="text-center">
              <span className="text-[16px] font-black text-[#6b7280]">{counts.unpublished}</span>
              <p className="text-[9px] text-[#7a9aab]">غير منشور</p>
            </div>
            <div className="w-px h-6 bg-gray-200" />
            <div className="text-center">
              <span className="text-[16px] font-black text-[#d97706]">{counts.in_deal}</span>
              <p className="text-[9px] text-[#7a9aab]">قيد الصفقة</p>
            </div>
          </div>
          <span className="text-[11px] font-bold text-[#1a4a5e]">الإجمالي: {counts.all}</span>
        </div>
      )}

      {filtered.length === 0 ? (
        counts.all === 0 ? (
          <EmptyInventory onAddInventory={onAddInventory} />
        ) : (
          <div className="rounded-2xl p-8 text-center bg-white/60">
            <Package className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-[13px] font-bold text-[#5a7a8a]">لا يوجد مخزون في هذا التصنيف</p>
            <p className="text-[11px] text-[#7a9aab] mt-1">جرّب تغيير الفلتر لعرض مخزون آخر</p>
          </div>
        )
      ) : (
        <div className="space-y-3">
          {filtered.map(item => (
            <InventoryCard
              key={item.id}
              item={item}
              onOpen={setSelectedItem}
              onPublish={inventory.publishToMarket}
              onUnpublish={inventory.unpublishFromMarket}
              onUpdateQuantity={inventory.updateQuantity}
              onDelete={inventory.deleteItem}
              isActioning={inventory.actionLoading === item.id}
            />
          ))}
        </div>
      )}

      <button
        onClick={onAddInventory}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-[13px] font-bold text-white active:scale-[0.98] transition-transform"
        style={{ background: 'linear-gradient(135deg, #1a4a5e 0%, #2c6f8a 100%)', boxShadow: '0 4px 14px rgba(26,74,94,0.25)' }}
      >
        <Plus className="w-4 h-4" />
        إضافة مخزون جديد
      </button>

      {selectedItem && (
        <InventoryDetailSheet
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onPublish={inventory.publishToMarket}
          onUnpublish={inventory.unpublishFromMarket}
          onUpdateQuantity={inventory.updateQuantity}
          onDelete={inventory.deleteItem}
          onRefresh={inventory.refresh}
          isActioning={inventory.actionLoading === selectedItem.id}
        />
      )}
    </div>
  );
}

function EmptyInventory({ onAddInventory }: { onAddInventory: () => void }) {
  return (
    <div
      className="rounded-2xl p-8 text-center"
      style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.8) 0%, rgba(240,247,251,0.8) 100%)', border: '2px dashed #c8dbe6' }}
    >
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
        style={{ background: 'linear-gradient(135deg, #e4eff6 0%, #d8e8f0 100%)' }}
      >
        <CloudOff className="w-7 h-7 text-[#7a9aab]" />
      </div>
      <h3 className="text-[15px] font-bold text-[#1a3a4a] mb-1.5">مستودعك فارغ</h3>
      <p className="text-[12px] text-[#7a9aab] leading-relaxed mb-4 max-w-[240px] mx-auto">
        أضف مخزونك الآن وابدأ ببيع الطبليات عبر الشبكة الوطنية
      </p>
      <button
        onClick={onAddInventory}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[12px] font-bold text-white active:scale-95 transition-transform"
        style={{ background: 'linear-gradient(135deg, #1a4a5e 0%, #2c6f8a 100%)', boxShadow: '0 4px 12px rgba(26,74,94,0.25)' }}
      >
        <Plus className="w-4 h-4" />
        إضافة مخزون
      </button>
    </div>
  );
}

function PurchasesSubTab({
  purchases,
  loading,
  totalAvailable,
  onWithdrawToInventory,
  onRefresh,
  buyerPhone,
}: {
  purchases: BuyerPurchaseItem[];
  loading: boolean;
  totalAvailable: number;
  onWithdrawToInventory: (item: BuyerPurchaseItem, qty: number) => void;
  onRefresh: () => void;
  buyerPhone: string;
}) {
  const [withdrawingId, setWithdrawingId] = useState<string | null>(null);
  const [withdrawQty, setWithdrawQty] = useState(0);
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawError, setWithdrawError] = useState('');
  const [withdrawSuccess, setWithdrawSuccess] = useState('');

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white/60 rounded-2xl p-4 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-[72px] h-[72px] rounded-xl bg-gray-200" />
              <div className="flex-1 space-y-2.5">
                <div className="h-4 bg-gray-200 rounded w-2/3" />
                <div className="h-3 bg-gray-200 rounded w-1/3" />
                <div className="flex gap-2">
                  <div className="h-3 bg-gray-200 rounded w-20" />
                  <div className="h-3 bg-gray-200 rounded w-14" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (purchases.length === 0) {
    return (
      <div
        className="rounded-2xl p-8 text-center"
        style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.8) 0%, rgba(239,246,255,0.8) 100%)', border: '2px dashed #bfdbfe' }}
      >
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)' }}
        >
          <ShoppingBag className="w-7 h-7 text-[#0369a1]" />
        </div>
        <h3 className="text-[15px] font-bold text-[#1a3a4a] mb-1.5">لا توجد مشتريات بعد</h3>
        <p className="text-[12px] text-[#7a9aab] leading-relaxed max-w-[240px] mx-auto">
          عند اكتمال صفقاتك ستظهر مشترياتك هنا ويمكنك سحبها إلى مخزونك للبيع
        </p>
      </div>
    );
  }

  const handleWithdrawStart = (item: BuyerPurchaseItem) => {
    setWithdrawingId(item.id);
    setWithdrawQty(Math.min(100, item.quantity_available));
    setWithdrawError('');
    setWithdrawSuccess('');
  };

  const handleWithdrawConfirm = async (item: BuyerPurchaseItem) => {
    if (withdrawQty <= 0) {
      setWithdrawError('يجب تحديد كمية أكبر من صفر');
      return;
    }
    if (withdrawQty > item.quantity_available) {
      setWithdrawError(`الكمية المتاحة ${item.quantity_available.toLocaleString('ar-SA')} فقط`);
      return;
    }

    setWithdrawing(true);
    setWithdrawError('');

    try {
      const { data, error } = await supabase.rpc('withdraw_buyer_inventory_quantity', {
        p_inventory_id: item.id,
        p_quantity_to_withdraw: withdrawQty,
        p_buyer_phone: buyerPhone,
      });

      if (error) throw error;

      const result = data && typeof data === 'object' ? data : null;
      if (result?.success === false) throw new Error(result.error);

      setWithdrawSuccess(`تم سحب ${withdrawQty.toLocaleString('ar-SA')} طبلية بنجاح`);

      setTimeout(() => {
        setWithdrawingId(null);
        setWithdrawSuccess('');
        onWithdrawToInventory(item, withdrawQty);
        onRefresh();
      }, 800);
    } catch (err: any) {
      setWithdrawError(err.message || 'حدث خطأ أثناء السحب');
    } finally {
      setWithdrawing(false);
    }
  };

  return (
    <div className="space-y-3">
      {totalAvailable > 0 && (
        <div
          className="flex items-center justify-between px-4 py-3 rounded-xl"
          style={{ background: 'linear-gradient(135deg, rgba(3,105,161,0.06) 0%, rgba(3,105,161,0.03) 100%)', border: '1px solid rgba(3,105,161,0.1)' }}
        >
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-[#0369a1]" />
            <span className="text-[12px] font-bold text-[#0369a1]">إجمالي المتاح للسحب</span>
          </div>
          <span className="text-[16px] font-black text-[#0369a1]">
            {totalAvailable.toLocaleString('ar-SA')} <span className="text-[10px] font-normal text-[#0369a1]/60">طبلية</span>
          </span>
        </div>
      )}

      {purchases.map(item => {
        const quality = QUALITY_STYLE[item.quality] || QUALITY_STYLE.B;
        const condition = CONDITION_LABELS[item.condition || 'used'] || item.condition || '-';
        const hasAvailable = item.quantity_available > 0;
        const isWithdrawOpen = withdrawingId === item.id;
        const acquiredDate = new Date(item.acquired_at).toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' });
        const primaryImage = Array.isArray(item.images) && item.images.length > 0
          ? (typeof item.images[0] === 'string' ? item.images[0] : (item.images[0] as any)?.url)
          : null;

        return (
          <div
            key={item.id}
            className="bg-white rounded-2xl overflow-hidden transition-all"
            style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.05), 0 0 1px rgba(0,0,0,0.08)' }}
          >
            <div className="flex gap-3.5 p-3.5">
              <div className="w-[72px] h-[72px] rounded-xl overflow-hidden flex-shrink-0 relative">
                {primaryImage ? (
                  <img src={primaryImage} alt="" className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)' }}
                  >
                    <Package className="w-7 h-7 text-[#93c5fd]" />
                  </div>
                )}
                {Array.isArray(item.images) && item.images.length > 1 && (
                  <div className="absolute bottom-1 left-1 flex items-center gap-0.5 bg-black/50 backdrop-blur-sm rounded px-1.5 py-0.5">
                    <ImageIcon className="w-2.5 h-2.5 text-white" />
                    <span className="text-[8px] font-bold text-white">{item.images.length}</span>
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-[14px] font-bold text-[#1a3a4a] truncate">{item.pallet_type}</h3>
                  <span
                    className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{
                      background: hasAvailable ? '#EFF6FF' : '#F3F4F6',
                      color: hasAvailable ? '#0369a1' : '#9ca3af',
                      border: `1px solid ${hasAvailable ? '#BFDBFE' : '#E5E7EB'}`,
                    }}
                  >
                    <ShoppingBag className="w-3 h-3" />
                    {hasAvailable ? 'متاح للسحب' : 'تم سحب الكل'}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: quality.bg, color: quality.color }}
                  >
                    {quality.label}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-50 text-[#5a7a8a] font-semibold">
                    {condition}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-[11px]">
                  <div className="flex items-center gap-1 text-[#1565C0]">
                    <MapPin className="w-3 h-3" />
                    <span className="font-semibold">{item.city}</span>
                  </div>
                  <span className="text-gray-300">|</span>
                  <div className="flex items-center gap-1 text-[#5a7a8a]">
                    <Ruler className="w-3 h-3" />
                    <span>{item.size}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-3">
                    <span className="text-[13px] font-bold text-[#0369a1]">
                      {(item.quantity_available || 0).toLocaleString('ar-SA')} <span className="text-[10px] font-normal text-[#7a9aab]">متاح</span>
                    </span>
                    {item.quantity !== item.quantity_available && (
                      <span className="text-[10px] text-[#b0c4d0]">
                        من {item.quantity.toLocaleString('ar-SA')}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-[#b0c4d0]">
                    <Calendar className="w-3 h-3" />
                    {acquiredDate}
                  </div>
                </div>
              </div>
            </div>

            {isWithdrawOpen && (
              <div className="px-3.5 pb-3">
                <div className="rounded-xl border border-[#0369a1]/15 p-3" style={{ background: 'linear-gradient(135deg, #f0f7ff 0%, #e8f2ff 100%)' }}>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[12px] font-bold text-[#0369a1]">تحديد كمية السحب</p>
                    <button
                      onClick={() => { setWithdrawingId(null); setWithdrawError(''); }}
                      className="w-7 h-7 rounded-lg bg-white flex items-center justify-center"
                    >
                      <X className="w-3.5 h-3.5 text-gray-400" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex items-center gap-1 flex-1 bg-white rounded-xl border border-[#0369a1]/20 px-2">
                      <button
                        onClick={() => setWithdrawQty(Math.max(1, withdrawQty - 100))}
                        className="w-9 h-9 flex items-center justify-center text-[#0369a1]"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <input
                        type="number"
                        value={withdrawQty}
                        onChange={(e) => setWithdrawQty(Math.max(1, Math.min(item.quantity_available, parseInt(e.target.value, 10) || 0)))}
                        className="flex-1 text-center py-2 text-[15px] font-bold text-[#0369a1] bg-transparent outline-none"
                        min={1}
                        max={item.quantity_available}
                        autoFocus
                      />
                      <button
                        onClick={() => setWithdrawQty(Math.min(item.quantity_available, withdrawQty + 100))}
                        className="w-9 h-9 flex items-center justify-center text-[#0369a1]"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] text-[#7a9aab]">المتاح: {item.quantity_available.toLocaleString('ar-SA')}</span>
                    <div className="flex gap-1.5">
                      {[100, 500, item.quantity_available].map((q, i) => {
                        if (q > item.quantity_available) return null;
                        const label = i === 2 ? 'الكل' : q.toLocaleString('ar-SA');
                        return (
                          <button
                            key={q + '-' + i}
                            onClick={() => setWithdrawQty(q)}
                            className="px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all"
                            style={withdrawQty === q
                              ? { background: '#0369a1', color: 'white' }
                              : { background: 'white', color: '#0369a1', border: '1px solid #BFDBFE' }
                            }
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {withdrawError && (
                    <div className="flex items-center gap-1.5 mb-2 text-[11px] text-red-600 bg-red-50 rounded-lg px-3 py-2">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                      {withdrawError}
                    </div>
                  )}

                  {withdrawSuccess && (
                    <div className="flex items-center gap-1.5 mb-2 text-[11px] text-[#059669] bg-green-50 rounded-lg px-3 py-2">
                      <Check className="w-3.5 h-3.5 flex-shrink-0" />
                      {withdrawSuccess}
                    </div>
                  )}

                  <button
                    onClick={() => handleWithdrawConfirm(item)}
                    disabled={withdrawing || withdrawQty <= 0 || !!withdrawSuccess}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-bold text-white active:scale-[0.98] transition-transform disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #059669, #047857)', boxShadow: '0 3px 10px rgba(5,150,105,0.25)' }}
                  >
                    {withdrawing ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <ArrowUpFromLine className="w-4 h-4" />
                        سحب {withdrawQty.toLocaleString('ar-SA')} طبلية إلى مخزوني
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {hasAvailable && !isWithdrawOpen && (
              <div className="border-t border-gray-100">
                <button
                  onClick={() => handleWithdrawStart(item)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 text-[12px] font-bold text-[#059669] hover:bg-green-50/50 transition-colors active:scale-[0.98]"
                >
                  <ArrowUpFromLine className="w-3.5 h-3.5" />
                  سحب إلى مخزوني
                </button>
              </div>
            )}

            {!hasAvailable && (
              <div className="border-t border-gray-100 px-4 py-2.5">
                <div className="flex items-center justify-center gap-1.5 text-[11px] text-gray-400">
                  <Check className="w-3.5 h-3.5" />
                  تم سحب الكمية بالكامل إلى مخزونك
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
