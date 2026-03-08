import { useState, useEffect } from 'react';
import {
  Warehouse,
  ShoppingBag,
  Plus,
  Eye,
  EyeOff,
  Clock,
  Package,
  CloudOff,
  Store,
  ArrowUpFromLine,
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';

type SubTab = 'inventory' | 'purchases';

interface InventoryBatch {
  id: string;
  batch_id: string;
  pallet_type: string;
  size: string;
  quality: string;
  quantity: number;
  available_quantity: number;
  price_per_pallet: number;
  city: string;
  status: string;
  pallet_condition: string;
  created_at: string;
  inventory_source: string;
}

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

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: typeof Eye }> = {
  active: { label: 'منشور', color: '#059669', bg: '#ECFDF5', icon: Eye },
  draft: { label: 'غير منشور', color: '#6b7280', bg: '#F3F4F6', icon: EyeOff },
  reserved: { label: 'قيد الصفقة', color: '#b45309', bg: '#FFFBEB', icon: Clock },
};

export default function CloudWarehouseTab({ phone, onAddInventory }: Props) {
  const [subTab, setSubTab] = useState<SubTab>('inventory');
  const [inventory, setInventory] = useState<InventoryBatch[]>([]);
  const [purchases, setPurchases] = useState<BuyerPurchase[]>([]);
  const [loadingInv, setLoadingInv] = useState(true);
  const [loadingPurch, setLoadingPurch] = useState(true);

  useEffect(() => {
    const fetchInventory = async () => {
      setLoadingInv(true);
      const { data } = await supabase
        .from('inventory_batches')
        .select('*')
        .eq('phone', phone)
        .order('created_at', { ascending: false });
      setInventory(data || []);
      setLoadingInv(false);
    };
    fetchInventory();
  }, [phone]);

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

  const activeCount = inventory.filter(b => b.status === 'active').length;
  const draftCount = inventory.filter(b => b.status === 'draft').length;
  const reservedCount = inventory.filter(b => b.status === 'reserved' || b.status === 'pending_supplier').length;

  return (
    <div className="space-y-4" dir="rtl">
      {/* Sub-tab Toggle */}
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
          {inventory.length > 0 && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
              subTab === 'inventory' ? 'bg-[#1a4a5e] text-white' : 'bg-gray-200 text-gray-500'
            }`}>
              {inventory.length}
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
        <InventorySubTab
          inventory={inventory}
          loading={loadingInv}
          activeCount={activeCount}
          draftCount={draftCount}
          reservedCount={reservedCount}
          onAddInventory={onAddInventory}
        />
      ) : (
        <PurchasesSubTab
          purchases={purchases}
          loading={loadingPurch}
        />
      )}
    </div>
  );
}

function InventorySubTab({
  inventory,
  loading,
  activeCount,
  draftCount,
  reservedCount,
  onAddInventory,
}: {
  inventory: InventoryBatch[];
  loading: boolean;
  activeCount: number;
  draftCount: number;
  reservedCount: number;
  onAddInventory: () => void;
}) {
  const [filter, setFilter] = useState<'all' | 'active' | 'draft' | 'reserved'>('all');

  const filtered = filter === 'all'
    ? inventory
    : inventory.filter(b => {
        if (filter === 'reserved') return b.status === 'reserved' || b.status === 'pending_supplier';
        return b.status === filter;
      });

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

  return (
    <div className="space-y-3">
      {/* Status Filters */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: 'all' as const, label: 'الكل', count: inventory.length },
          { key: 'active' as const, label: 'منشور', count: activeCount, color: '#059669' },
          { key: 'draft' as const, label: 'غير منشور', count: draftCount, color: '#6b7280' },
          { key: 'reserved' as const, label: 'قيد الصفقة', count: reservedCount, color: '#b45309' },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
              filter === f.key
                ? 'bg-white text-[#1a3a4a] shadow-sm border border-gray-200'
                : 'text-[#7a9aab] hover:bg-white/50'
            }`}
          >
            {f.color && <span className="w-1.5 h-1.5 rounded-full" style={{ background: f.color }} />}
            {f.label}
            <span className="text-[10px] opacity-60">({f.count})</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyInventory onAddInventory={onAddInventory} />
      ) : (
        <div className="space-y-2">
          {filtered.map(batch => (
            <InventoryCard key={batch.id} batch={batch} />
          ))}
        </div>
      )}

      {/* Add Inventory Button */}
      <button
        onClick={onAddInventory}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-[13px] font-bold text-white active:scale-[0.98] transition-transform"
        style={{ background: 'linear-gradient(135deg, #1a4a5e 0%, #2c6f8a 100%)', boxShadow: '0 4px 14px rgba(26,74,94,0.25)' }}
      >
        <Plus className="w-4 h-4" />
        إضافة مخزون جديد
      </button>
    </div>
  );
}

function InventoryCard({ batch }: { batch: InventoryBatch }) {
  const statusConf = STATUS_CONFIG[batch.status] || STATUS_CONFIG.draft;
  const StatusIcon = statusConf.icon;

  return (
    <div
      className="bg-white rounded-2xl p-4 transition-all active:scale-[0.99]"
      style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.04)' }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #f0f7fb 0%, #e4eff6 100%)', border: '1px solid #d8e8f0' }}
        >
          <Package className="w-5 h-5 text-[#1a4a5e]" />
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
            <p className="text-[13px] font-bold text-[#1a3a4a] truncate">{batch.pallet_type} - {batch.size}</p>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[#7a9aab]">{batch.city}</span>
            <div className="flex items-center gap-3">
              <span className="text-[12px] font-bold text-[#1a4a5e]">
                {(batch.available_quantity || batch.quantity || 0).toLocaleString('ar-SA')} طبلية
              </span>
              {batch.price_per_pallet > 0 && (
                <span className="text-[11px] text-[#059669] font-bold">
                  {batch.price_per_pallet.toLocaleString('ar-SA')} ر.س
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
            <div className="flex items-center gap-2">
              {batch.status === 'draft' && (
                <button className="flex items-center gap-1 text-[10px] font-bold text-[#0369a1] bg-[#EFF6FF] px-2.5 py-1 rounded-lg">
                  <Store className="w-3 h-3" />
                  نشر في السوق
                </button>
              )}
            </div>
            <span className="text-[9px] text-[#b0c4d0]" dir="ltr">{batch.batch_id}</span>
          </div>
        </div>
      </div>
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
