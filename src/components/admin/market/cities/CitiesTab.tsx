import { useState, useMemo } from 'react';
import { useCities } from '../../../../hooks/useMarket';
import type { City } from '../../../../hooks/useMarket';
import TableControls from '../shared/TableControls';
import RowActions from '../shared/RowActions';
import ConfirmDialog from '../shared/ConfirmDialog';
import CityViewPage from './CityViewPage';
import CityEditPage from './CityEditPage';

const PAGE_SIZE = 10;

const STATUS_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  active: { label: 'نشطة', color: '#16a34a', bg: '#f0fdf4' },
  frozen: { label: 'مجمدة', color: '#64748b', bg: '#f1f5f9' },
  monitoring: { label: 'مراقبة', color: '#ca8a04', bg: '#fefce8' },
  pilot: { label: 'تجريبي', color: '#2563eb', bg: '#eff6ff' },
};

type View = { mode: 'list' } | { mode: 'view'; city: City } | { mode: 'edit'; city: City };

export default function CitiesTab() {
  const { cities, loading, updateCity, deleteCity, freezeCity, activateCity, getCityStats } = useCities();
  const [view, setView] = useState<View>({ mode: 'list' });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState<City | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return cities.filter(c => {
      const matchSearch = c.name.includes(search);
      const matchStatus = !statusFilter || c.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [cities, search, statusFilter]);

  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  if (view.mode === 'view') {
    return (
      <CityViewPage
        city={view.city}
        getStats={getCityStats}
        onBack={() => setView({ mode: 'list' })}
      />
    );
  }

  if (view.mode === 'edit') {
    return (
      <CityEditPage
        city={view.city}
        onSave={updateCity}
        onBack={() => setView({ mode: 'list' })}
      />
    );
  }

  return (
    <div className="space-y-4" dir="rtl">
      {confirmDelete && (
        <ConfirmDialog
          title="حذف المدينة"
          message={`هل أنت متأكد من حذف "${confirmDelete.name}"؟ لا يمكن التراجع.`}
          confirmLabel="حذف"
          danger
          onConfirm={async () => {
            const error = await deleteCity(confirmDelete.id);
            if (error) {
              setDeleteError(error.message || 'فشل حذف المدينة');
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
        searchPlaceholder="بحث عن مدينة..."
        filters={[
          {
            label: 'الحالة',
            value: statusFilter,
            onChange: v => { setStatusFilter(v); setPage(0); },
            options: [
              { value: 'active', label: 'نشطة' },
              { value: 'frozen', label: 'مجمدة' },
              { value: 'monitoring', label: 'مراقبة' },
              { value: 'pilot', label: 'تجريبي' },
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
                <th className="px-4 py-3 text-right font-bold text-[#4a7a94]">المدينة</th>
                <th className="px-4 py-3 text-right font-bold text-[#4a7a94]">الحالة</th>
                <th className="px-4 py-3 text-right font-bold text-[#4a7a94]">الرسوم</th>
                <th className="px-4 py-3 text-right font-bold text-[#4a7a94]">الحد الأدنى</th>
                <th className="px-4 py-3 text-right font-bold text-[#4a7a94]">المطابقة</th>
                <th className="px-4 py-3 text-right font-bold text-[#4a7a94]">تاريخ الإنشاء</th>
                <th className="px-4 py-3 text-right font-bold text-[#4a7a94]">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0f6fa]">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-gray-100 rounded animate-pulse" style={{ width: j === 0 ? '80px' : '60px' }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : paginated.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-[#7a9aab]">لا توجد نتائج</td></tr>
              ) : (
                paginated.map(city => {
                  const badge = STATUS_BADGE[city.status] ?? STATUS_BADGE.monitoring;
                  return (
                    <tr key={city.id} className="hover:bg-[#f7fbfd] transition-colors">
                      <td className="px-4 py-3 font-bold text-[#1a2f3e]">{city.name}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold" style={{ background: badge.bg, color: badge.color }}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#4a7a94]">{city.custom_fee_override != null ? `${city.custom_fee_override}%` : '—'}</td>
                      <td className="px-4 py-3 text-[#4a7a94]">{city.minimum_quantity}</td>
                      <td className="px-4 py-3">
                        <span className="text-[11px] font-bold" style={{ color: city.matching_enabled ? '#16a34a' : '#dc2626' }}>
                          {city.matching_enabled ? 'مفعلة' : 'متوقفة'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#7a9aab]">{new Date(city.created_at).toLocaleDateString('ar-SA')}</td>
                      <td className="px-4 py-3">
                        <RowActions actions={[
                          { type: 'view', onClick: () => setView({ mode: 'view', city }) },
                          { type: 'edit', onClick: () => setView({ mode: 'edit', city }) },
                          city.status === 'frozen'
                            ? { type: 'activate', onClick: () => activateCity(city.id) }
                            : { type: 'freeze', onClick: () => freezeCity(city.id) },
                          { type: 'delete', onClick: () => setConfirmDelete(city) },
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
            {filtered.length} مدينة إجمالاً
          </div>
        )}
      </div>
    </div>
  );
}
