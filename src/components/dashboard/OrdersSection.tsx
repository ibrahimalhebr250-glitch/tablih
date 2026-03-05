import { useState } from 'react';
import { ClipboardList, ChevronLeft, Trash2, Clock, CheckCircle2, AlertCircle, Pencil, X, Check, ChevronDown, Send, Handshake, Radar } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { DashboardOrder } from '../../hooks/useDashboard';
import OrderDetailSheet from './OrderDetailSheet';
import { PALLET_TYPES, PALLET_SIZES, QUALITY_LABELS, SAUDI_CITIES } from '../../types/inventory';
import type { PalletQuality } from '../../types/inventory';

interface Props {
  orders: DashboardOrder[];
  loading: boolean;
  phone: string;
  onCreateOrder: () => void;
  onRefresh: () => void;
  onUpdateOrder?: (orderId: string, data: { pallet_type?: string; size?: string; quality?: string; quantity?: number; city?: string }) => Promise<unknown>;
  onOpenBuyerDeals?: () => void;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: typeof Clock }> = {
  pending:   { label: 'قيد الانتظار', color: '#F59E0B', bg: '#FFFBEB', icon: Clock },
  matched:   { label: 'تمت المطابقة', color: '#27AE60', bg: '#E8F8F0', icon: CheckCircle2 },
  unmatched: { label: 'يتتبع المخزون', color: '#0369A1', bg: '#E0F2FE', icon: Radar },
  executed:  { label: 'منفّذ', color: '#6B7280', bg: '#F3F4F6', icon: CheckCircle2 },
};

const QUALITY_COLORS: Record<string, { dot: string; text: string; bg: string }> = {
  A:     { dot: '#27AE60', text: '#27AE60', bg: '#E8F8F0' },
  B:     { dot: '#2196F3', text: '#2196F3', bg: '#EBF5FF' },
  C:     { dot: '#F59E0B', text: '#92400E', bg: '#FFFBEB' },
  Scrap: { dot: '#9CA3AF', text: '#6B7280', bg: '#F3F4F6' },
};

const QUALITY_KEYS: PalletQuality[] = ['A', 'B', 'C', 'Scrap'];

function OrderEditSheet({ order, onClose, onSave }: {
  order: DashboardOrder;
  onClose: () => void;
  onSave: (data: { pallet_type?: string; size?: string; quality?: string; quantity?: number; city?: string }) => Promise<void>;
}) {
  const [palletType, setPalletType] = useState(order.pallet_type);
  const [size, setSize] = useState(order.size);
  const [quality, setQuality] = useState<PalletQuality>(order.quality as PalletQuality);
  const [quantity, setQuantity] = useState(order.quantity.toString());
  const [city, setCity] = useState(order.city);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [cityOpen, setCityOpen] = useState(false);

  const handleSave = async () => {
    const qty = Number(quantity);
    if (!palletType || !size || !quality || !city || isNaN(qty) || qty <= 0) return;
    setSaving(true);
    await onSave({ pallet_type: palletType, size, quality, quantity: qty, city });
    setSaving(false);
    setSaved(true);
    setTimeout(() => { setSaved(false); onClose(); }, 800);
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:w-[480px] max-h-[92vh] flex flex-col bg-white sm:rounded-3xl rounded-t-3xl overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
            <X className="w-4 h-4 text-gray-500" />
          </button>
          <div className="text-right">
            <p className="text-[14px] font-bold text-[#1a4a5e]">تعديل الطلب</p>
            <p className="text-[11px] text-[#7a9aab] font-mono">{order.request_id}</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5" dir="rtl">
          <div>
            <p className="text-[12px] font-bold text-[#1a4a5e] mb-2">نوع الطبلية</p>
            <div className="grid grid-cols-3 gap-2">
              {PALLET_TYPES.map(({ value }) => (
                <button
                  key={value}
                  onClick={() => setPalletType(value)}
                  className="py-2.5 rounded-xl text-[12px] font-bold border-2 transition-all"
                  style={{
                    background: palletType === value ? '#2196F3' : 'white',
                    borderColor: palletType === value ? '#2196F3' : '#e5e7eb',
                    color: palletType === value ? 'white' : '#374151',
                  }}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[12px] font-bold text-[#1a4a5e] mb-2">المقاس</p>
            <div className="flex flex-wrap gap-2">
              {PALLET_SIZES.map((s) => (
                <button
                  key={s}
                  onClick={() => setSize(s)}
                  className="px-3 py-2 rounded-xl text-[12px] font-bold border-2 transition-all"
                  style={{
                    background: size === s ? '#2196F3' : 'white',
                    borderColor: size === s ? '#2196F3' : '#e5e7eb',
                    color: size === s ? 'white' : '#374151',
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[12px] font-bold text-[#1a4a5e] mb-2">الدرجة</p>
            <div className="grid grid-cols-4 gap-2">
              {QUALITY_KEYS.map((q) => {
                const qc = QUALITY_COLORS[q];
                const isSelected = quality === q;
                return (
                  <button
                    key={q}
                    onClick={() => setQuality(q)}
                    className="py-2.5 rounded-xl text-[11px] font-bold border-2 transition-all"
                    style={{
                      background: isSelected ? qc.bg : 'white',
                      borderColor: isSelected ? qc.dot : '#e5e7eb',
                      color: isSelected ? qc.text : '#6b7280',
                    }}
                  >
                    {QUALITY_LABELS[q].ar}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-bold text-[#1a4a5e] mb-2">الكمية (طبلية)</label>
            <div className="relative">
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="أدخل الكمية"
                min={1}
                className="w-full pr-4 pl-16 py-3.5 rounded-xl border-2 border-gray-200 bg-gray-50 focus:border-[#2196F3] focus:bg-white text-[18px] font-bold text-[#1a4a5e] text-right outline-none transition-colors"
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[13px] font-bold text-[#7a9aab]">طبلية</span>
            </div>
          </div>

          <div>
            <p className="text-[12px] font-bold text-[#1a4a5e] mb-2">المدينة</p>
            <button
              onClick={() => setCityOpen(!cityOpen)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 border-gray-200 bg-gray-50 text-right"
            >
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${cityOpen ? 'rotate-180' : ''}`} />
              <span className="text-[13px] font-bold text-[#1a4a5e]">{city || 'اختر المدينة'}</span>
            </button>
            {cityOpen && (
              <div className="mt-1 border-2 border-gray-200 rounded-xl overflow-hidden max-h-44 overflow-y-auto">
                {SAUDI_CITIES.map((c) => (
                  <button
                    key={c}
                    onClick={() => { setCity(c); setCityOpen(false); }}
                    className="w-full text-right px-4 py-2.5 text-[12px] font-bold transition-colors hover:bg-gray-50"
                    style={{ color: city === c ? '#2196F3' : '#374151', background: city === c ? '#EBF5FF' : 'white' }}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex-shrink-0 p-5 pt-3 border-t border-gray-100">
          <button
            onClick={handleSave}
            disabled={saving || !palletType || !size || !quality || !city || !quantity || Number(quantity) <= 0}
            className="w-full py-3.5 rounded-2xl text-[14px] font-bold text-white flex items-center justify-center gap-2 active:scale-[0.97] transition-all disabled:opacity-50"
            style={{
              background: saved
                ? 'linear-gradient(135deg, #27AE60, #1E8449)'
                : 'linear-gradient(135deg, #2196F3, #1565C0)',
              boxShadow: saved ? '0 4px 14px rgba(39,174,96,0.3)' : '0 4px 14px rgba(33,150,243,0.3)',
            }}
          >
            {saved ? (
              <><Check className="w-4 h-4" /><span>تم الحفظ</span></>
            ) : saving ? (
              <span>جارٍ الحفظ...</span>
            ) : (
              <><Pencil className="w-4 h-4" /><span>حفظ التعديلات</span></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function OrdersSection({ orders, loading, phone, onCreateOrder, onRefresh, onUpdateOrder, onOpenBuyerDeals }: Props) {
  const [selectedOrder, setSelectedOrder] = useState<DashboardOrder | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [editingOrder, setEditingOrder] = useState<DashboardOrder | null>(null);

  const handleDelete = async (orderId: string) => {
    setDeletingId(orderId);
    await supabase.from('orders').delete().eq('id', orderId).eq('phone', phone);
    setDeletingId(null);
    setConfirmDeleteId(null);
    onRefresh();
  };

  const grouped = orders.reduce<Record<string, DashboardOrder[]>>((acc, o) => {
    if (!acc[o.status]) acc[o.status] = [];
    acc[o.status].push(o);
    return acc;
  }, {});

  const statusOrder = ['pending', 'matched', 'unmatched', 'executed'];

  return (
    <>
      <div className="mx-4 lg:mx-6 lg:border-l lg:border-gray-100 mt-5">
        <div className="flex items-center justify-between mb-3">
          <button onClick={onCreateOrder} className="flex items-center gap-1 text-[12px] text-[#2196F3] font-bold">
            <span>+ طلب جديد</span>
          </button>
          <div className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-[#1a4a5e]" />
            <h3 className="text-[14px] font-bold text-[#1a4a5e]">طلباتي</h3>
          </div>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-20 bg-white rounded-2xl animate-pulse border border-gray-100" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 py-8 flex flex-col items-center gap-2">
            <ClipboardList className="w-8 h-8 text-gray-300" />
            <p className="text-[12px] text-[#a0b5c0]">لا توجد طلبات بعد</p>
            <button
              onClick={onCreateOrder}
              className="mt-1 px-4 py-2 rounded-xl bg-[#2196F3] text-white text-[12px] font-bold"
            >
              إنشاء أول طلب
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {statusOrder.map((status) => {
              const group = grouped[status];
              if (!group?.length) return null;
              const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
              const Icon = cfg.icon;
              const canEdit = status === 'pending' || status === 'unmatched';
              return (
                <div key={status}>
                  <div className="flex items-center gap-1.5 mb-2 justify-end">
                    <p className="text-[11px] font-bold" style={{ color: cfg.color }}>{cfg.label}</p>
                    <Icon className="w-3.5 h-3.5" style={{ color: cfg.color }} />
                  </div>
                  <div className="space-y-2">
                    {group.map((order) => (
                      <div
                        key={order.id}
                        className="bg-white rounded-2xl border border-gray-100 px-4 py-3 shadow-sm hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex gap-1.5 flex-shrink-0">
                            {canEdit ? (
                              confirmDeleteId === order.id ? (
                                <div className="flex gap-1">
                                  <button
                                    disabled={deletingId === order.id}
                                    onClick={() => handleDelete(order.id)}
                                    className="text-[10px] font-bold px-2 py-1 rounded-lg bg-red-500 text-white active:opacity-70 disabled:opacity-40"
                                  >
                                    {deletingId === order.id ? '...' : 'حذف'}
                                  </button>
                                  <button
                                    onClick={() => setConfirmDeleteId(null)}
                                    className="text-[10px] font-bold px-2 py-1 rounded-lg bg-gray-100 text-gray-500 active:opacity-70"
                                  >
                                    إلغاء
                                  </button>
                                </div>
                              ) : (
                                <div className="flex gap-1.5">
                                  <button
                                    onClick={() => setEditingOrder(order)}
                                    className="p-1.5 rounded-lg bg-[#EBF5FF] border border-[#BFDBFE] active:scale-90 transition-transform"
                                    title="تعديل"
                                  >
                                    <Pencil className="w-3.5 h-3.5 text-[#2196F3]" />
                                  </button>
                                  <button
                                    onClick={() => setConfirmDeleteId(order.id)}
                                    className="p-1.5 rounded-lg bg-red-50 active:scale-90 transition-transform border border-red-100"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                                  </button>
                                </div>
                              )
                            ) : (
                              <button
                                onClick={() => setSelectedOrder(order)}
                                className="p-1.5 rounded-lg bg-gray-100 active:scale-90 transition-transform"
                              >
                                <ChevronLeft className="w-3.5 h-3.5 text-[#2c5f7c]" />
                              </button>
                            )}
                          </div>

                          <div
                            className="text-right flex-1 cursor-pointer"
                            onClick={() => setSelectedOrder(order)}
                          >
                            <div className="flex items-center justify-end gap-2 mb-1">
                              <span className="text-[12px] font-bold text-[#1a4a5e]">
                                {order.pallet_type} – {order.size} – {order.quality}
                              </span>
                            </div>
                            <div className="flex items-center justify-end gap-3">
                              <span className="text-[11px] text-[#7a9aab]">{order.city}</span>
                              <span className="text-[11px] text-[#7a9aab]">
                                {order.quantity.toLocaleString('ar-SA')} طبلية
                              </span>
                            </div>
                            {status === 'matched' && order.matched_quantity && (
                              <div className="mt-1.5 flex items-center justify-end gap-2">
                                <span className="text-[11px] text-[#27AE60] font-bold">
                                  {order.matched_price} ريال/طبلية
                                </span>
                                <span className="text-[11px] text-[#27AE60]">
                                  {order.matched_quantity.toLocaleString('ar-SA')} مطابق
                                </span>
                              </div>
                            )}
                            {status === 'matched' && order.deal_ref && (
                              <div className="mt-2 rounded-xl overflow-hidden border" style={{
                                borderColor: order.deal_status === 'awaiting_buyer' ? '#BFDBFE' : order.deal_status === 'inventory_reserved' || order.deal_status === 'in_delivery' ? '#86EFAC' : '#FDE68A',
                                background: order.deal_status === 'awaiting_buyer' ? '#EFF6FF' : order.deal_status === 'inventory_reserved' || order.deal_status === 'in_delivery' ? '#F0FDF4' : '#FFFBEB',
                              }}>
                                <div className="flex items-center justify-between px-3 py-2">
                                  <div className="flex items-center gap-1.5">
                                    {order.deal_status === 'matched' && (
                                      <>
                                        <div className="w-1.5 h-1.5 rounded-full bg-[#F59E0B] animate-pulse" />
                                        <span className="text-[10px] font-bold text-[#92400E]">بانتظار تأكيد المورد</span>
                                      </>
                                    )}
                                    {order.deal_status === 'awaiting_buyer' && (
                                      <>
                                        <div className="w-1.5 h-1.5 rounded-full bg-[#2563eb] animate-pulse" />
                                        <span className="text-[10px] font-bold text-[#1E40AF]">المورد وافق — أكّد الطلب</span>
                                      </>
                                    )}
                                    {(order.deal_status === 'inventory_reserved' || order.deal_status === 'in_delivery') && (
                                      <>
                                        <div className="w-1.5 h-1.5 rounded-full bg-[#16a34a]" />
                                        <span className="text-[10px] font-bold text-[#166534]">الصفقة جارية</span>
                                      </>
                                    )}
                                  </div>
                                  <span className="text-[9px] font-mono text-[#7a9aab]">{order.deal_ref}</span>
                                </div>
                                {(order.deal_status === 'awaiting_buyer' || order.deal_status === 'inventory_reserved' || order.deal_status === 'in_delivery') && onOpenBuyerDeals && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); onOpenBuyerDeals(); }}
                                    className="w-full flex items-center justify-center gap-2 py-2 text-[11px] font-bold transition-colors active:opacity-70"
                                    style={{
                                      borderTop: '1px solid',
                                      borderColor: order.deal_status === 'awaiting_buyer' ? '#BFDBFE' : '#BBF7D0',
                                      color: order.deal_status === 'awaiting_buyer' ? '#1E40AF' : '#166534',
                                      background: order.deal_status === 'awaiting_buyer' ? 'rgba(37,99,235,0.05)' : 'rgba(22,163,74,0.05)',
                                    }}
                                  >
                                    <Handshake className="w-3.5 h-3.5" />
                                    <span>{order.deal_status === 'awaiting_buyer' ? 'انتقل إلى صفقاتي للتأكيد' : 'تابع في صفقاتي'}</span>
                                  </button>
                                )}
                              </div>
                            )}
                            {status === 'matched' && order.deal_ref && order.deal_status === 'matched' && (
                              <div className="mt-1.5 flex items-center justify-end gap-1.5">
                                <Send className="w-3 h-3 text-[#F59E0B]" />
                                <span className="text-[10px] text-[#92400E] font-bold">تم إرسال طلب تأكيد للمورد</span>
                              </div>
                            )}
                            {status === 'unmatched' && (
                              <div className="mt-2 rounded-xl overflow-hidden border border-[#BAE6FD] bg-[#E0F2FE]">
                                <div className="flex items-center gap-2 px-3 py-2">
                                  <div className="flex-1 min-w-0 text-right">
                                    <p className="text-[10px] font-bold text-[#0369A1]">جارٍ تتبع المخزون تلقائياً</p>
                                    <p className="text-[9px] text-[#0284C7] mt-0.5">سيتم مطابقتك فور إضافة مورد لمخزون مطابق</p>
                                  </div>
                                  <div className="w-6 h-6 rounded-lg bg-[#BAE6FD] flex items-center justify-center flex-shrink-0">
                                    <Radar className="w-3.5 h-3.5 text-[#0369A1] animate-pulse" />
                                  </div>
                                </div>
                              </div>
                            )}
                            <p className="text-[10px] text-[#a0b5c0] mt-1 font-mono">{order.request_id}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectedOrder && (
        <OrderDetailSheet
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
        />
      )}

      {editingOrder && onUpdateOrder && (
        <OrderEditSheet
          order={editingOrder}
          onClose={() => setEditingOrder(null)}
          onSave={async (data) => { await onUpdateOrder(editingOrder.id, data); }}
        />
      )}
    </>
  );
}
