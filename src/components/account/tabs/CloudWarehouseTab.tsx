import { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { useMyInventory } from '../../../hooks/useMyInventory';
import type { InventoryFilter, MyInventoryItem } from '../../../hooks/useMyInventory';
import InventoryCard from '../inventory/InventoryCard';
import InventoryDetailSheet from '../inventory/InventoryDetailSheet';
import { supabase } from '../../../lib/supabase';

type SubTab = 'inventory' | 'purchases';

interface BuyerPurchase {
  id: string;
  pallet_type: string;
  size: string;
  quality: string;
  quantity: number;
  total_cost: number;
  city: string;
  created_at: string;
  supplier_phone: string;
}

interface Props {
  phone: string;
  onAddInventory: () => void;
}

const FILTER_CONFIG: { key: InventoryFilter; label: string; color: string; icon: typeof Eye }[] = [
  { key: 'all', label: 'الكل', color: '#1a4a5e', icon: Package },
  { key: 'published', label: 'منشور في السوق', color: '#059669', icon: Eye },
  { key: 'unpublished', label: 'غير منشور', color: '#6b7280', icon: EyeOff },
  { key: 'in_deal', label: 'قيد الصفقة', color: '#d97706', icon: Clock },
];

export default function CloudWarehouseTab({ phone, onAddInventory }: Props) {
  const [subTab, setSubTab] = useState<SubTab>('inventory');
  const [purchases, setPurchases] = useState<BuyerPurchase[]>([]);
  const [loadingPurch, setLoadingPurch] = useState(true);

  const inventory = useMyInventory(phone);
  const counts = inventory.getCounts();

  useEffect(() => {
    const fetchPurchases = async () => {
      setLoadingPurch(true);
      const { data } = await supabase
        .from('buyer_inventory')
        .select('*')
        .eq('buyer_phone', phone)
        .order('created_at', { ascending: false });
      setPurchases(data || []);
      setLoadingPurch(false);
    };
    fetchPurchases();
  }, [phone]);

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
          {purchases.length > 0 && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
              subTab === 'purchases' ? 'bg-[#0369a1] text-white' : 'bg-gray-200 text-gray-500'
            }`}>
              {purchases.length}
            </span>
          )}
        </button>
      </div>

      {subTab === 'inventory' ? (
        <MyInventorySection inventory={inventory} counts={counts} onAddInventory={onAddInventory} />
      ) : (
        <PurchasesSubTab purchases={purchases} loading={loadingPurch} />
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
          const Icon = f.icon;
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

function PurchasesSubTab({ purchases, loading }: { purchases: BuyerPurchase[]; loading: boolean }) {
  if (loading) {
    return (
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
          عند اكتمال صفقاتك ستظهر مشترياتك هنا ويمكنك إدارتها
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {purchases.map(purchase => (
        <div
          key={purchase.id}
          className="bg-white rounded-2xl p-4"
          style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.04)' }}
        >
          <div className="flex items-start gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', border: '1px solid #bfdbfe' }}
            >
              <ShoppingBag className="w-5 h-5 text-[#0369a1]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold text-[#1a3a4a]">{purchase.pallet_type} - {purchase.size}</p>
              <div className="flex items-center justify-between mt-1">
                <span className="text-[10px] text-[#7a9aab]">{purchase.city}</span>
                <span className="text-[12px] font-bold text-[#0369a1]">{purchase.quantity.toLocaleString('ar-SA')} طبلية</span>
              </div>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
                <button className="flex items-center gap-1 text-[10px] font-bold text-[#059669] bg-[#ECFDF5] px-2.5 py-1 rounded-lg">
                  <ArrowUpFromLine className="w-3 h-3" />
                  سحب إلى مخزوني
                </button>
                <span className="text-[9px] text-[#b0c4d0]">
                  {new Date(purchase.created_at).toLocaleDateString('ar-SA')}
                </span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
