import { useState } from 'react';
import { Package, ShoppingBag, Cloud, TrendingUp, Lock, Eye, EyeOff, ChevronDown, ChevronUp } from 'lucide-react';
import type { InventoryBatch, BuyerInventoryItem } from '../../../hooks/useAccountData';

interface Props {
  inventory: InventoryBatch[];
  publishedInventory: InventoryBatch[];
  unpublishedInventory: InventoryBatch[];
  reservedInventory: InventoryBatch[];
  purchases: BuyerInventoryItem[];
  loading: boolean;
}

type InvSection = 'published' | 'unpublished' | 'reserved';

function InventoryCard({ batch }: { batch: InventoryBatch }) {
  const reserved = (batch.quantity ?? 0) - (batch.quantity_available ?? batch.quantity ?? 0);
  return (
    <div className="bg-white rounded-2xl border border-[#e2edf5] shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#f0f6fa]" style={{ background: '#f8fbfd' }}>
        <span className="text-[10px] font-mono text-[#9ab0bf]">{batch.batch_id}</span>
        <div className="flex items-center gap-1.5">
          {batch.publish_to_market ? (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 flex items-center gap-1">
              <Eye className="w-2.5 h-2.5" />منشور
            </span>
          ) : (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 flex items-center gap-1">
              <EyeOff className="w-2.5 h-2.5" />غير منشور
            </span>
          )}
        </div>
      </div>
      <div className="p-4 space-y-2" dir="rtl">
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-black text-[#1a2f3e]">{batch.pallet_type}</span>
          <span className="text-[11px] text-[#7a9aab]">نوع الطبلية</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-bold text-[#1a2f3e]">{batch.size} · درجة {batch.quality}</span>
          <span className="text-[11px] text-[#7a9aab]">المقاس والجودة</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-bold text-[#1a2f3e]">{batch.city}</span>
          <span className="text-[11px] text-[#7a9aab]">المدينة</span>
        </div>

        <div className="border-t border-[#f0f6fa] pt-2.5 grid grid-cols-3 gap-2">
          <div className="flex flex-col items-center bg-[#f0fdf4] rounded-xl py-2">
            <span className="text-[14px] font-black text-emerald-700">{(batch.quantity_available ?? batch.quantity ?? 0).toLocaleString()}</span>
            <span className="text-[9px] text-emerald-600 mt-0.5">متاح</span>
          </div>
          {reserved > 0 && (
            <div className="flex flex-col items-center bg-amber-50 rounded-xl py-2">
              <span className="text-[14px] font-black text-amber-700">{reserved.toLocaleString()}</span>
              <span className="text-[9px] text-amber-600 mt-0.5">محجوز</span>
            </div>
          )}
          <div className="flex flex-col items-center bg-[#f0f6ff] rounded-xl py-2">
            <span className="text-[14px] font-black text-blue-700">{(batch.quantity ?? 0).toLocaleString()}</span>
            <span className="text-[9px] text-blue-600 mt-0.5">الإجمالي</span>
          </div>
        </div>

        {batch.price_per_pallet && (
          <div className="flex items-center justify-between bg-[#0f2535] rounded-xl px-3 py-2" dir="rtl">
            <span className="text-[13px] font-black text-white">{batch.price_per_pallet.toLocaleString()} ر.س / طبلية</span>
            <span className="text-[10px] text-white/50">السعر</span>
          </div>
        )}
      </div>
    </div>
  );
}

function PurchaseCard({ item }: { item: BuyerInventoryItem }) {
  const sourceLabel = item.inventory_source === 'purchase_transfer' ? 'شراء مباشر' : item.inventory_source === 'deal_transfer' ? 'صفقة' : 'شراء';
  const dateStr = new Date(item.acquired_at || item.created_at).toLocaleDateString('ar-SA', { day: 'numeric', month: 'short', year: 'numeric' });
  return (
    <div className="bg-white rounded-2xl border border-[#bbf7d0] shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5" style={{ background: 'linear-gradient(135deg, #f0fdf4, #ecfdf5)', borderBottom: '1px solid #bbf7d0' }}>
        <span className="text-[10px] text-emerald-600 font-bold">{sourceLabel}</span>
        <div className="flex items-center gap-1">
          <Cloud className="w-3 h-3 text-emerald-600" />
          <span className="text-[10px] text-emerald-700 font-bold">مستودع سحابي</span>
        </div>
      </div>
      <div className="p-4 space-y-2" dir="rtl">
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-black text-[#1a2f3e]">{item.pallet_type}</span>
          <span className="text-[11px] text-[#7a9aab]">نوع الطبلية</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-bold text-[#1a2f3e]">{item.size} · درجة {item.quality}</span>
          <span className="text-[11px] text-[#7a9aab]">المقاس والجودة</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-bold text-[#1a2f3e]">{item.city}</span>
          <span className="text-[11px] text-[#7a9aab]">المدينة</span>
        </div>
        <div className="border-t border-[#f0f6fa] pt-2.5 grid grid-cols-2 gap-2">
          <div className="flex flex-col items-center bg-emerald-50 rounded-xl py-2">
            <span className="text-[17px] font-black text-emerald-700">{item.quantity.toLocaleString()}</span>
            <span className="text-[9px] text-emerald-600 mt-0.5">إجمالي</span>
          </div>
          <div className="flex flex-col items-center bg-blue-50 rounded-xl py-2">
            <span className="text-[17px] font-black text-blue-700">{(item.quantity_available ?? item.quantity).toLocaleString()}</span>
            <span className="text-[9px] text-blue-600 mt-0.5">متاح</span>
          </div>
        </div>
        {item.unit_price > 0 && (
          <div className="flex items-center justify-between bg-[#0f2535] rounded-xl px-3 py-2">
            <span className="text-[13px] font-black text-white">{item.unit_price.toLocaleString()} ر.س / طبلية</span>
            <span className="text-[10px] text-white/50">سعر الشراء</span>
          </div>
        )}
        <p className="text-[10px] text-[#9ab0bf] text-center">{dateStr}</p>
      </div>
    </div>
  );
}

function SectionHeader({ title, count, icon: Icon, color, expanded, onToggle }: {
  title: string; count: number; icon: typeof Package; color: string; expanded: boolean; onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all active:scale-[0.98]"
      style={{ background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(255,255,255,0.9)', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
      dir="rtl"
    >
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}15` }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
        <div className="text-right">
          <p className="text-[13px] font-black text-[#1a2f3e]">{title}</p>
          <p className="text-[10px] text-[#7a9aab]">{count} {count === 1 ? 'دفعة' : 'دفعات'}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-black px-2.5 py-1 rounded-full" style={{ background: `${color}15`, color }}>
          {count}
        </span>
        {expanded ? <ChevronUp className="w-4 h-4 text-[#7a9aab]" /> : <ChevronDown className="w-4 h-4 text-[#7a9aab]" />}
      </div>
    </button>
  );
}

export default function CloudWarehouseTab({ inventory, publishedInventory, unpublishedInventory, reservedInventory, purchases, loading }: Props) {
  const [activeSection, setActiveSection] = useState<'inventory' | 'purchases'>('inventory');
  const [expandedInvSection, setExpandedInvSection] = useState<InvSection | null>('published');

  const totalInventoryQty = inventory.reduce((s, b) => s + (b.quantity_available ?? b.quantity ?? 0), 0);
  const totalPurchasesQty = purchases.reduce((s, p) => s + p.quantity, 0);

  const toggleInvSection = (section: InvSection) => {
    setExpandedInvSection(prev => prev === section ? null : section);
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-40 bg-white rounded-2xl animate-pulse border border-gray-100" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4" dir="rtl">
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setActiveSection('inventory')}
          className="rounded-2xl p-4 text-right transition-all active:scale-[0.97]"
          style={{
            background: activeSection === 'inventory' ? 'linear-gradient(135deg, #0f2535, #1a4a5e)' : 'rgba(255,255,255,0.8)',
            border: `1.5px solid ${activeSection === 'inventory' ? 'transparent' : 'rgba(255,255,255,0.9)'}`,
            boxShadow: activeSection === 'inventory' ? '0 4px 20px rgba(15,37,53,0.3)' : '0 1px 4px rgba(0,0,0,0.04)',
          }}
        >
          <Package className={`w-5 h-5 mb-2 ${activeSection === 'inventory' ? 'text-emerald-400' : 'text-[#4a7a94]'}`} />
          <p className={`text-[12px] font-bold ${activeSection === 'inventory' ? 'text-white' : 'text-[#1a2f3e]'}`}>مخزوني</p>
          <p className={`text-[20px] font-black ${activeSection === 'inventory' ? 'text-emerald-400' : 'text-[#1a2f3e]'}`}>
            {totalInventoryQty.toLocaleString()}
            <span className={`text-[10px] font-normal mr-1 ${activeSection === 'inventory' ? 'text-white/50' : 'text-[#7a9aab]'}`}>طبلية</span>
          </p>
        </button>

        <button
          onClick={() => setActiveSection('purchases')}
          className="rounded-2xl p-4 text-right transition-all active:scale-[0.97]"
          style={{
            background: activeSection === 'purchases' ? 'linear-gradient(135deg, #059669, #047857)' : 'rgba(255,255,255,0.8)',
            border: `1.5px solid ${activeSection === 'purchases' ? 'transparent' : 'rgba(255,255,255,0.9)'}`,
            boxShadow: activeSection === 'purchases' ? '0 4px 20px rgba(5,150,105,0.3)' : '0 1px 4px rgba(0,0,0,0.04)',
          }}
        >
          <Cloud className={`w-5 h-5 mb-2 ${activeSection === 'purchases' ? 'text-white' : 'text-emerald-600'}`} />
          <p className={`text-[12px] font-bold ${activeSection === 'purchases' ? 'text-white' : 'text-[#1a2f3e]'}`}>مشترياتي</p>
          <p className={`text-[20px] font-black ${activeSection === 'purchases' ? 'text-white' : 'text-[#1a2f3e]'}`}>
            {totalPurchasesQty.toLocaleString()}
            <span className={`text-[10px] font-normal mr-1 ${activeSection === 'purchases' ? 'text-white/70' : 'text-[#7a9aab]'}`}>طبلية</span>
          </p>
        </button>
      </div>

      {activeSection === 'inventory' && (
        <div className="space-y-3">
          <div className="space-y-2">
            <SectionHeader
              title="مخزون منشور في السوق"
              count={publishedInventory.length}
              icon={TrendingUp}
              color="#059669"
              expanded={expandedInvSection === 'published'}
              onToggle={() => toggleInvSection('published')}
            />
            {expandedInvSection === 'published' && (
              <div className="space-y-2 pr-2">
                {publishedInventory.length === 0 ? (
                  <p className="text-center text-[12px] text-[#9ab0bf] py-6">لا يوجد مخزون منشور في السوق</p>
                ) : publishedInventory.map(b => <InventoryCard key={b.id} batch={b} />)}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <SectionHeader
              title="مخزون غير منشور"
              count={unpublishedInventory.length}
              icon={EyeOff}
              color="#6b7280"
              expanded={expandedInvSection === 'unpublished'}
              onToggle={() => toggleInvSection('unpublished')}
            />
            {expandedInvSection === 'unpublished' && (
              <div className="space-y-2 pr-2">
                {unpublishedInventory.length === 0 ? (
                  <p className="text-center text-[12px] text-[#9ab0bf] py-6">لا يوجد مخزون غير منشور</p>
                ) : unpublishedInventory.map(b => <InventoryCard key={b.id} batch={b} />)}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <SectionHeader
              title="مخزون قيد صفقة"
              count={reservedInventory.length}
              icon={Lock}
              color="#d97706"
              expanded={expandedInvSection === 'reserved'}
              onToggle={() => toggleInvSection('reserved')}
            />
            {expandedInvSection === 'reserved' && (
              <div className="space-y-2 pr-2">
                {reservedInventory.length === 0 ? (
                  <p className="text-center text-[12px] text-[#9ab0bf] py-6">لا يوجد مخزون مرتبط بصفقة حالياً</p>
                ) : reservedInventory.map(b => <InventoryCard key={b.id} batch={b} />)}
              </div>
            )}
          </div>

          {inventory.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-16 h-16 rounded-2xl bg-white border border-dashed border-[#d0e6f0] flex items-center justify-center">
                <Package className="w-7 h-7 text-[#c0d5e0]" />
              </div>
              <p className="text-[13px] font-bold text-[#a0b5c0]">لا يوجد مخزون</p>
              <p className="text-[11px] text-[#c0d0da] text-center px-8">أضف مخزونك من خلال زر "إضافة مخزون"</p>
            </div>
          )}
        </div>
      )}

      {activeSection === 'purchases' && (
        <div className="space-y-3">
          {purchases.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-16 h-16 rounded-2xl bg-white border border-dashed border-[#d0e6f0] flex items-center justify-center">
                <ShoppingBag className="w-7 h-7 text-[#c0d5e0]" />
              </div>
              <p className="text-[13px] font-bold text-[#a0b5c0]">لا توجد مشتريات</p>
              <p className="text-[11px] text-[#c0d0da] text-center px-8">ستظهر هنا الطبليات التي اشتريتها عند نجاح صفقاتك</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2.5 px-4 py-3 rounded-2xl" style={{ background: 'linear-gradient(135deg, #f0fdf4, #ecfdf5)', border: '1px solid #bbf7d0' }} dir="rtl">
                <Cloud className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                <div>
                  <p className="text-[12px] font-black text-emerald-800">مستودعك السحابي</p>
                  <p className="text-[10px] text-emerald-600">جميع الطبليات المُشتراة عبر صفقات السوق</p>
                </div>
              </div>
              {purchases.map(p => <PurchaseCard key={p.id} item={p} />)}
            </>
          )}
        </div>
      )}
    </div>
  );
}
