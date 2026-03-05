import { useState, useMemo } from 'react';
import { useInventory } from '../../../../hooks/useMarket';
import type { InventoryBatch } from '../../../../hooks/useMarket';
import TableControls from '../shared/TableControls';
import RowActions from '../shared/RowActions';
import ConfirmDialog from '../shared/ConfirmDialog';
import InventoryViewPage from './InventoryViewPage';
import InventoryEditPage from './InventoryEditPage';

const PAGE_SIZE = 10;

const STATUS_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  active: { label: 'نشط', color: '#16a34a', bg: '#f0fdf4' },
  available: { label: 'متاح', color: '#2563eb', bg: '#eff6ff' },
  frozen: { label: 'مجمد', color: '#64748b', bg: '#f1f5f9' },
  depleted: { label: 'مستنفد', color: '#dc2626', bg: '#fef2f2' },
  draft: { label: 'مسودة', color: '#ca8a04', bg: '#fefce8' },
};

const CITIES = ['الرياض','جدة','مكة المكرمة','المدينة المنورة','الدمام','الخبر','الأحساء','بريدة','تبوك','نجران','ابها','جازان','ينبع','حائل','القصيف','القطيف','الجبيل','خميس مشيط','الطائف','الخرج'];

type View = { mode: 'list' } | { mode: 'view'; batch: InventoryBatch } | { mode: 'edit'; batch: InventoryBatch };

export default function InventoryTab() {
  const { batches, loading, updateBatch, deleteBatch, freezeBatch, unfreezeBatch } = useInventory();
  const [view, setView] = useState<View>({ mode: 'list' });
  const [search, setSearch] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState<InventoryBatch | null>(null);

  const filtered = useMemo(() => {
    return batches.filter(b => {
      const matchSearch = b.batch_id.includes(search) || (b.phone ?? '').includes(search) || b.city.includes(search);
      const matchCity = !cityFilter || b.city === cityFilter;
      const matchStatus = !statusFilter || b.status === statusFilter;
      return matchSearch && matchCity && matchStatus;
    });
  }, [batches, search, cityFilter, statusFilter]);

  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  if (view.mode === 'view') {
    return <InventoryViewPage batch={view.batch} onBack={() => setView({ mode: 'list' })} />;
  }

  if (view.mode === 'edit') {
    return <InventoryEditPage batch={view.batch} onSave={updateBatch} onBack={() => setView({ mode: 'list' })} />;
  }

  return (
    <div className="space-y-4" dir="rtl">
      {confirmDelete && (
        <ConfirmDialog
          title="حذف الدفعة"
          message={`هل أنت متأكد من حذف "${confirmDelete.batch_id}"؟`}
          confirmLabel="حذف"
          danger
          onConfirm={async () => { await deleteBatch(confirmDelete.id); setConfirmDelete(null); }}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      <TableControls
        search={search}
        onSearch={v => { setSearch(v); setPage(0); }}
        searchPlaceholder="بحث بمعرف الدفعة أو الهاتف..."
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
              { value: 'active', label: 'نشط' },
              { value: 'available', label: 'متاح' },
              { value: 'frozen', label: 'مجمد' },
              { value: 'depleted', label: 'مستنفد' },
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
                <th className="px-4 py-3 text-right font-bold text-[#4a7a94]">معرف الدفعة</th>
                <th className="px-4 py-3 text-right font-bold text-[#4a7a94]">المدينة</th>
                <th className="px-4 py-3 text-right font-bold text-[#4a7a94]">المقاس</th>
                <th className="px-4 py-3 text-right font-bold text-[#4a7a94]">إجمالي</th>
                <th className="px-4 py-3 text-right font-bold text-[#4a7a94]">متاح</th>
                <th className="px-4 py-3 text-right font-bold text-[#4a7a94]">محجوز</th>
                <th className="px-4 py-3 text-right font-bold text-[#4a7a94]">السعر</th>
                <th className="px-4 py-3 text-right font-bold text-[#4a7a94]">الحالة</th>
                <th className="px-4 py-3 text-right font-bold text-[#4a7a94]">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0f6fa]">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 9 }).map((__, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse w-16" /></td>
                    ))}
                  </tr>
                ))
              ) : paginated.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-10 text-center text-[#7a9aab]">لا توجد نتائج</td></tr>
              ) : (
                paginated.map(b => {
                  const badge = STATUS_BADGE[b.status ?? 'active'] ?? STATUS_BADGE.active;
                  return (
                    <tr key={b.id} className="hover:bg-[#f7fbfd] transition-colors">
                      <td className="px-4 py-3 font-bold text-[#1a2f3e]">{b.batch_id}</td>
                      <td className="px-4 py-3 text-[#4a7a94]">{b.city}</td>
                      <td className="px-4 py-3 text-[#4a7a94]">{b.size}</td>
                      <td className="px-4 py-3 text-[#1a2f3e]">{(b.quantity_total || b.quantity).toLocaleString('ar-SA')}</td>
                      <td className="px-4 py-3 text-[#16a34a] font-bold">{b.available_quantity.toLocaleString('ar-SA')}</td>
                      <td className="px-4 py-3 text-[#ca8a04]">{(b.quantity_reserved || b.reserved_quantity).toLocaleString('ar-SA')}</td>
                      <td className="px-4 py-3 text-[#1a2f3e]">{b.min_price} ر.س</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold" style={{ background: badge.bg, color: badge.color }}>
                          {b.is_frozen && '❄ '}{badge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <RowActions actions={[
                          { type: 'view', onClick: () => setView({ mode: 'view', batch: b }) },
                          { type: 'edit', onClick: () => setView({ mode: 'edit', batch: b }) },
                          b.is_frozen
                            ? { type: 'activate', onClick: () => unfreezeBatch(b.id) }
                            : { type: 'freeze', onClick: () => freezeBatch(b.id) },
                          { type: 'delete', onClick: () => setConfirmDelete(b) },
                        ]} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {!loading && (
          <div className="px-4 py-2 border-t border-[#f0f6fa] text-[11px] text-[#7a9aab]">
            {filtered.length} دفعة إجمالاً
          </div>
        )}
      </div>
    </div>
  );
}
