import { useState, useMemo } from 'react';
import { Eye, Pencil, Trash2 } from 'lucide-react';
import { useOrders } from '../../../../hooks/useMarket';
import type { OrderRequest } from '../../../../hooks/useMarket';
import TableControls from '../shared/TableControls';
import ConfirmDialog from '../shared/ConfirmDialog';

const PAGE_SIZE = 10;

const STATUS_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'معلق', color: '#ca8a04', bg: '#fefce8' },
  processing: { label: 'قيد المعالجة', color: '#2563eb', bg: '#eff6ff' },
  matched: { label: 'تمت المطابقة', color: '#16a34a', bg: '#f0fdf4' },
  cancelled: { label: 'ملغى', color: '#dc2626', bg: '#fef2f2' },
  fulfilled: { label: 'مكتمل', color: '#64748b', bg: '#f1f5f9' },
};

const CITIES = ['الرياض','جدة','مكة المكرمة','المدينة المنورة','الدمام','الخبر','الأحساء','بريدة','تبوك','نجران','ابها','جازان','ينبع','حائل','القصيف','القطيف','الجبيل','خميس مشيط','الطائف','الخرج'];

type SubView = { mode: 'list' } | { mode: 'view'; order: OrderRequest } | { mode: 'edit'; order: OrderRequest };

function RequestViewPage({ order, onBack }: { order: OrderRequest; onBack: () => void }) {
  const badge = STATUS_BADGE[order.status ?? 'pending'] ?? STATUS_BADGE.pending;
  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-xl bg-[#f0f6fa] text-[#4a7a94] hover:bg-[#e2edf5] transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </button>
        <div>
          <h3 className="text-[17px] font-black text-[#1a2f3e]">{order.request_id}</h3>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold" style={{ background: badge.bg, color: badge.color }}>{badge.label}</span>
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-[#e2edf5] p-5 space-y-3">
        <p className="text-[13px] font-bold text-[#4a7a94]">تفاصيل الطلب</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-[13px]">
          <div><span className="text-[#7a9aab]">المدينة: </span><span className="font-bold text-[#1a2f3e]">{order.city}</span></div>
          <div><span className="text-[#7a9aab]">الكمية: </span><span className="font-bold text-[#1a2f3e]">{order.quantity} طبلية</span></div>
          <div><span className="text-[#7a9aab]">المقاس: </span><span className="font-bold text-[#1a2f3e]">{order.size}</span></div>
          <div><span className="text-[#7a9aab]">النوع: </span><span className="font-bold text-[#1a2f3e]">{order.pallet_type}</span></div>
          <div><span className="text-[#7a9aab]">الجودة: </span><span className="font-bold text-[#1a2f3e]">{order.quality}</span></div>
          <div><span className="text-[#7a9aab]">الهاتف: </span><span className="font-bold text-[#1a2f3e]">{order.phone ?? '—'}</span></div>
        </div>
        <div className="pt-3 border-t border-[#f0f6fa] grid grid-cols-3 gap-3 text-[13px]">
          <div><span className="text-[#7a9aab]">قبول جودة مقاربة: </span><span className="font-bold" style={{ color: order.accept_close_quality ? '#16a34a' : '#dc2626' }}>{order.accept_close_quality ? 'نعم' : 'لا'}</span></div>
          <div><span className="text-[#7a9aab]">قبول مدينة مقاربة: </span><span className="font-bold" style={{ color: order.accept_close_city ? '#16a34a' : '#dc2626' }}>{order.accept_close_city ? 'نعم' : 'لا'}</span></div>
          <div><span className="text-[#7a9aab]">قبول تسليم جزئي: </span><span className="font-bold" style={{ color: order.accept_partial_delivery ? '#16a34a' : '#dc2626' }}>{order.accept_partial_delivery ? 'نعم' : 'لا'}</span></div>
        </div>
        <div className="pt-2 text-[11px] text-[#7a9aab]">تاريخ الإنشاء: {new Date(order.created_at).toLocaleString('ar-SA')}</div>
      </div>
    </div>
  );
}

function RequestEditPage({ order, onSave, onBack }: { order: OrderRequest; onSave: (id: string, u: Partial<OrderRequest>) => Promise<unknown>; onBack: () => void }) {
  const [status, setStatus] = useState(order.status ?? 'pending');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const inputClass = "w-full px-3 py-2 text-[13px] bg-white border border-[#e2edf5] rounded-xl text-[#1a2f3e] focus:outline-none focus:border-[#2563eb] transition-colors";

  const handle = async () => {
    setSaving(true);
    await onSave(order.id, { status });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-xl bg-[#f0f6fa] text-[#4a7a94] hover:bg-[#e2edf5] transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </button>
        <h3 className="text-[17px] font-black text-[#1a2f3e]">تعديل: {order.request_id}</h3>
      </div>
      <div className="bg-white rounded-2xl border border-[#e2edf5] p-5 space-y-4">
        <div className="bg-[#fefce8] border border-[#fde68a] rounded-xl px-4 py-3 text-[12px] text-[#ca8a04] font-semibold">
          المواصفات الأساسية للطلب لا يمكن تعديلها. يمكن تعديل الحالة فقط.
        </div>
        <div className="space-y-1.5">
          <label className="text-[12px] font-bold text-[#4a7a94]">الحالة</label>
          <select value={status} onChange={e => setStatus(e.target.value)} className={inputClass}>
            <option value="pending">معلق</option>
            <option value="processing">قيد المعالجة</option>
            <option value="matched">تمت المطابقة</option>
            <option value="cancelled">ملغى</option>
            <option value="fulfilled">مكتمل</option>
          </select>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={onBack} className="px-4 py-2 text-[13px] font-bold text-[#4a7a94] bg-[#f0f6fa] rounded-xl hover:bg-[#e2edf5] transition-colors">إلغاء</button>
        <button
          onClick={handle}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2 text-[13px] font-bold text-white rounded-xl transition-all disabled:opacity-60"
          style={{ background: saved ? '#16a34a' : '#2563eb' }}
        >
          {saving ? 'جارٍ الحفظ...' : saved ? 'تم الحفظ' : 'حفظ'}
        </button>
      </div>
    </div>
  );
}

export default function RequestsTab() {
  const { orders, loading, updateOrder, deleteOrder } = useOrders();
  const [view, setView] = useState<SubView>({ mode: 'list' });
  const [search, setSearch] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState<OrderRequest | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return orders.filter(o => {
      const matchSearch = o.request_id.includes(search) || (o.phone ?? '').includes(search) || o.city.includes(search);
      const matchCity = !cityFilter || o.city === cityFilter;
      const matchStatus = !statusFilter || o.status === statusFilter;
      return matchSearch && matchCity && matchStatus;
    });
  }, [orders, search, cityFilter, statusFilter]);

  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  if (view.mode === 'view') return <RequestViewPage order={view.order} onBack={() => setView({ mode: 'list' })} />;
  if (view.mode === 'edit') return <RequestEditPage order={view.order} onSave={updateOrder} onBack={() => setView({ mode: 'list' })} />;

  return (
    <div className="space-y-4" dir="rtl">
      {confirmDelete && (
        <ConfirmDialog
          title="حذف الطلب"
          message={`هل أنت متأكد من حذف "${confirmDelete.request_id}"؟`}
          confirmLabel="حذف"
          danger
          onConfirm={async () => {
            const error = await deleteOrder(confirmDelete.id);
            if (error) {
              setDeleteError(error.message || 'فشل حذف الطلب');
            } else {
              setConfirmDelete(null);
            }
          }}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      {deleteError && (
        <div className="bg-[#fef2f2] border border-[#fecaca] rounded-xl p-4 flex items-start justify-between" dir="rtl">
          <p className="text-[13px] text-[#dc2626] font-semibold">{deleteError}</p>
          <button onClick={() => { setDeleteError(null); setConfirmDelete(null); }} className="text-[#dc2626] hover:text-[#991b1b]">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
          </button>
        </div>
      )}

      <TableControls
        search={search}
        onSearch={v => { setSearch(v); setPage(0); }}
        searchPlaceholder="بحث بمعرف الطلب أو الهاتف..."
        filters={[
          {
            label: 'المدينة',
            value: cityFilter,
            onChange: v => { setCityFilter(v); setPage(0); },
            options: CITIES.map(c => ({ value: c, label: c })),
          },
          {
            label: 'الحالة',
            value: statusFilter,
            onChange: v => { setStatusFilter(v); setPage(0); },
            options: [
              { value: 'pending', label: 'معلق' },
              { value: 'processing', label: 'قيد المعالجة' },
              { value: 'matched', label: 'تمت المطابقة' },
              { value: 'cancelled', label: 'ملغى' },
              { value: 'fulfilled', label: 'مكتمل' },
            ],
          },
        ]}
        total={filtered.length}
        page={page}
        pageSize={PAGE_SIZE}
        onPage={setPage}
      />

      <div className="bg-white rounded-2xl border border-[#e2edf5] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[#f0f6fa] bg-[#f7fbfd]">
                <th className="px-4 py-3 text-right font-bold text-[#4a7a94]">معرف الطلب</th>
                <th className="px-4 py-3 text-right font-bold text-[#4a7a94]">الهاتف</th>
                <th className="px-4 py-3 text-right font-bold text-[#4a7a94]">المدينة</th>
                <th className="px-4 py-3 text-right font-bold text-[#4a7a94]">المقاس</th>
                <th className="px-4 py-3 text-right font-bold text-[#4a7a94]">الكمية</th>
                <th className="px-4 py-3 text-right font-bold text-[#4a7a94]">الحالة</th>
                <th className="px-4 py-3 text-right font-bold text-[#4a7a94]">تاريخ الإنشاء</th>
                <th className="px-4 py-3 text-right font-bold text-[#4a7a94]">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0f6fa]">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>{Array.from({ length: 8 }).map((__, j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse w-16" /></td>)}</tr>
                ))
              ) : paginated.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-[#7a9aab]">لا توجد نتائج</td></tr>
              ) : (
                paginated.map(o => {
                  const badge = STATUS_BADGE[o.status ?? 'pending'] ?? STATUS_BADGE.pending;
                  return (
                    <tr key={o.id} className="hover:bg-[#f7fbfd] transition-colors">
                      <td className="px-4 py-3 font-bold text-[#1a2f3e]">{o.request_id}</td>
                      <td className="px-4 py-3 text-[#4a7a94]">{o.phone ?? '—'}</td>
                      <td className="px-4 py-3 text-[#4a7a94]">{o.city}</td>
                      <td className="px-4 py-3 text-[#4a7a94]">{o.size}</td>
                      <td className="px-4 py-3 text-[#1a2f3e] font-bold">{o.quantity}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold" style={{ background: badge.bg, color: badge.color }}>{badge.label}</span>
                      </td>
                      <td className="px-4 py-3 text-[#7a9aab]">{new Date(o.created_at).toLocaleDateString('ar-SA')}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => setView({ mode: 'view', order: o })} className="p-1.5 rounded-lg bg-[#eff6ff] text-[#2563eb] hover:brightness-95 transition-all" title="عرض"><Eye className="w-3.5 h-3.5" /></button>
                          <button onClick={() => setView({ mode: 'edit', order: o })} className="p-1.5 rounded-lg bg-[#fefce8] text-[#ca8a04] hover:brightness-95 transition-all" title="تعديل"><Pencil className="w-3.5 h-3.5" /></button>
                          <button onClick={() => setConfirmDelete(o)} className="p-1.5 rounded-lg bg-[#fef2f2] text-[#dc2626] hover:brightness-95 transition-all" title="حذف"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {!loading && (
          <div className="px-4 py-2 border-t border-[#f0f6fa] text-[11px] text-[#7a9aab]">{filtered.length} طلب إجمالاً</div>
        )}
      </div>
    </div>
  );
}
