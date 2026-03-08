import { useState } from 'react';
import { Package, MapPin, Eye, EyeOff, Clock, Store, Ban, Trash2, Plus, Minus, Check, X, ChevronLeft, Image as ImageIcon } from 'lucide-react';
import type { MyInventoryItem } from '../../../hooks/useMyInventory';

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

function getDisplayStatus(item: MyInventoryItem): { label: string; color: string; bg: string; borderColor: string } {
  if (item.status === 'reserved' || item.status === 'pending_supplier') {
    return { label: 'قيد الصفقة', color: '#d97706', bg: '#FFFBEB', borderColor: '#FDE68A' };
  }
  if (item.status === 'active' && item.publish_to_market) {
    return { label: 'منشور في السوق', color: '#059669', bg: '#ECFDF5', borderColor: '#A7F3D0' };
  }
  return { label: 'غير منشور', color: '#6b7280', bg: '#F3F4F6', borderColor: '#E5E7EB' };
}

function getStatusIcon(item: MyInventoryItem) {
  if (item.status === 'reserved' || item.status === 'pending_supplier') return Clock;
  if (item.status === 'active' && item.publish_to_market) return Eye;
  return EyeOff;
}

interface Props {
  item: MyInventoryItem;
  onOpen: (item: MyInventoryItem) => void;
  onPublish: (id: string) => void;
  onUnpublish: (id: string) => void;
  onUpdateQuantity: (id: string, qty: number) => void;
  onDelete: (id: string) => void;
  isActioning: boolean;
}

export default function InventoryCard({
  item,
  onOpen,
  onPublish,
  onUnpublish,
  onUpdateQuantity,
  onDelete,
  isActioning,
}: Props) {
  const [showQtyEditor, setShowQtyEditor] = useState(false);
  const [editQty, setEditQty] = useState(item.available_quantity);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const status = getDisplayStatus(item);
  const StatusIcon = getStatusIcon(item);
  const quality = QUALITY_STYLE[item.quality] || QUALITY_STYLE.B;
  const condition = CONDITION_LABELS[item.pallet_condition] || item.pallet_condition;
  const isInDeal = item.status === 'reserved' || item.status === 'pending_supplier';

  const handleQtySave = () => {
    if (editQty > 0 && editQty !== item.available_quantity) {
      onUpdateQuantity(item.id, editQty);
    }
    setShowQtyEditor(false);
  };

  return (
    <div
      className="bg-white rounded-2xl overflow-hidden transition-all"
      style={{
        boxShadow: '0 1px 8px rgba(0,0,0,0.05), 0 0 1px rgba(0,0,0,0.08)',
      }}
    >
      <button
        onClick={() => onOpen(item)}
        className="w-full flex gap-3.5 p-3.5 text-right active:bg-gray-50/50 transition-colors"
        dir="rtl"
      >
        <div className="w-[72px] h-[72px] rounded-xl overflow-hidden flex-shrink-0 relative">
          {item.primary_image_url ? (
            <img
              src={item.primary_image_url}
              alt=""
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #f0f7fb 0%, #e4eff6 100%)' }}
            >
              <Package className="w-7 h-7 text-[#a0bfcf]" />
            </div>
          )}
          {item.image_urls.length > 1 && (
            <div className="absolute bottom-1 left-1 flex items-center gap-0.5 bg-black/50 backdrop-blur-sm rounded px-1.5 py-0.5">
              <ImageIcon className="w-2.5 h-2.5 text-white" />
              <span className="text-[8px] font-bold text-white">{item.image_urls.length}</span>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1.5">
            <h3 className="text-[14px] font-bold text-[#1a3a4a] truncate">
              {item.pallet_type}
            </h3>
            <ChevronLeft className="w-4 h-4 text-gray-300 flex-shrink-0" />
          </div>

          <div className="flex items-center gap-1.5 mb-2">
            <span
              className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border"
              style={{ background: status.bg, color: status.color, borderColor: status.borderColor }}
            >
              <StatusIcon className="w-3 h-3" />
              {status.label}
            </span>
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: quality.bg, color: quality.color }}
            >
              {quality.label}
            </span>
          </div>

          <div className="flex items-center gap-3 text-[11px]">
            <div className="flex items-center gap-1 text-[#1565C0]">
              <MapPin className="w-3 h-3" />
              <span className="font-semibold">{item.city}</span>
            </div>
            <span className="text-gray-300">|</span>
            <span className="text-[#5a7a8a]">{item.size}</span>
            <span className="text-gray-300">|</span>
            <span className="text-[#5a7a8a]">{condition}</span>
          </div>

          <div className="flex items-center justify-between mt-2">
            <span className="text-[13px] font-bold text-[#1a4a5e]">
              {(item.available_quantity || 0).toLocaleString('ar-SA')} <span className="text-[10px] font-normal text-[#7a9aab]">طبلية</span>
            </span>
            {item.price_per_pallet > 0 && (
              <span className="text-[12px] font-bold text-[#059669]">
                {item.price_per_pallet.toLocaleString('ar-SA')} ر.س
              </span>
            )}
          </div>
        </div>
      </button>

      {showQtyEditor && (
        <div className="px-3.5 pb-3 flex items-center gap-2" dir="rtl">
          <div className="flex items-center gap-1 flex-1 bg-gray-50 rounded-xl border border-gray-200 px-2">
            <button
              onClick={() => setEditQty(Math.max(1, editQty - 100))}
              className="w-8 h-8 flex items-center justify-center text-[#1a4a5e]"
            >
              <Minus className="w-4 h-4" />
            </button>
            <input
              type="number"
              value={editQty}
              onChange={(e) => setEditQty(Math.max(1, parseInt(e.target.value, 10) || 0))}
              className="flex-1 text-center py-2 text-[14px] font-bold text-[#1a4a5e] bg-transparent outline-none"
              min={1}
              autoFocus
            />
            <button
              onClick={() => setEditQty(editQty + 100)}
              className="w-8 h-8 flex items-center justify-center text-[#1a4a5e]"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={handleQtySave}
            disabled={isActioning}
            className="w-10 h-10 rounded-xl bg-[#059669] flex items-center justify-center text-white active:scale-95 transition-transform"
          >
            <Check className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowQtyEditor(false)}
            className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500 active:scale-95 transition-transform"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="px-3.5 pb-3" dir="rtl">
          <div className="bg-red-50 rounded-xl p-3 border border-red-100">
            <p className="text-[12px] font-bold text-red-700 mb-2 text-right">هل تريد حذف هذا المخزون؟</p>
            <div className="flex gap-2">
              <button
                onClick={() => { onDelete(item.id); setShowDeleteConfirm(false); }}
                disabled={isActioning}
                className="flex-1 py-2 rounded-lg bg-red-500 text-white text-[12px] font-bold active:scale-95 transition-transform"
              >
                نعم، حذف
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2 rounded-lg bg-white text-gray-600 text-[12px] font-bold border border-gray-200 active:scale-95 transition-transform"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center border-t border-gray-100" dir="rtl">
        {!isInDeal && (
          <>
            {item.status === 'active' && item.publish_to_market ? (
              <button
                onClick={() => onUnpublish(item.id)}
                disabled={isActioning}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-semibold text-amber-600 hover:bg-amber-50 transition-colors border-l border-gray-100"
              >
                <Ban className="w-3.5 h-3.5" />
                إيقاف النشر
              </button>
            ) : (
              <button
                onClick={() => onPublish(item.id)}
                disabled={isActioning}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-semibold text-[#059669] hover:bg-green-50 transition-colors border-l border-gray-100"
              >
                <Store className="w-3.5 h-3.5" />
                نشر في السوق
              </button>
            )}
          </>
        )}

        <button
          onClick={() => { setEditQty(item.available_quantity); setShowQtyEditor(true); }}
          disabled={isInDeal}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-semibold transition-colors border-l border-gray-100 ${
            isInDeal ? 'text-gray-300 cursor-not-allowed' : 'text-[#0369a1] hover:bg-blue-50'
          }`}
        >
          <Plus className="w-3.5 h-3.5" />
          تعديل الكمية
        </button>

        <button
          onClick={() => setShowDeleteConfirm(true)}
          disabled={isInDeal || isActioning}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-semibold transition-colors ${
            isInDeal ? 'text-gray-300 cursor-not-allowed' : 'text-red-400 hover:bg-red-50'
          }`}
        >
          <Trash2 className="w-3.5 h-3.5" />
          حذف
        </button>
      </div>
    </div>
  );
}
