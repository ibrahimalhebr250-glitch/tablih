import { useState, useMemo } from 'react';
import { Plus, X, MapPin, Check, Trash2 } from 'lucide-react';
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

function AddCityDialog({ onAdd, onClose }: {
  onAdd: (name: string, status: string) => Promise<{ message: string } | null>;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [status, setStatus] = useState('active');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) { setError('أدخل اسم المدينة'); return; }
    setLoading(true);
    setError('');
    const err = await onAdd(name.trim(), status);
    setLoading(false);
    if (err) { setError(err.message); return; }
    setSuccess(true);
    setTimeout(onClose, 1200);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: 'white' }}
        onClick={e => e.stopPropagation()}
        dir="rtl"
      >
        <div className="px-6 py-4 flex items-center justify-between border-b border-[#e2edf5]" style={{ background: 'linear-gradient(135deg, #1a3a4a, #2c5f7c)' }}>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors">
            <X className="w-4 h-4 text-white" />
          </button>
          <div className="flex items-center gap-3">
            <div>
              <p className="text-[15px] font-black text-white">إضافة مدينة جديدة</p>
              <p className="text-[11px] text-white/60">ستظهر فوراً في واجهة المخزون والطلبات</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>

        {success ? (
          <div className="px-6 py-8 flex flex-col items-center gap-3 text-center">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: '#f0fdf4', border: '2px solid #bbf7d0' }}>
              <Check className="w-7 h-7 text-green-600" />
            </div>
            <p className="text-[15px] font-black text-[#1a3a4a]">تمت إضافة المدينة بنجاح</p>
            <p className="text-[12px] text-[#7a9aab]">ستظهر الآن في قسمي إضافة مخزون وإنشاء طلب</p>
          </div>
        ) : (
          <div className="px-6 py-5 space-y-4">
            <div className="rounded-xl p-3 flex items-start gap-2.5" style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
              <MapPin className="w-3.5 h-3.5 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-[11px] text-blue-700 leading-relaxed">
                أي مدينة تضيفها ستظهر فوراً في <span className="font-black">واجهة إضافة مخزون</span> و<span className="font-black">واجهة إنشاء طلب</span> للمستخدمين.
              </p>
            </div>

            <div>
              <label className="block text-[13px] font-bold text-[#1a3a4a] mb-2">اسم المدينة</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                placeholder="مثال: الرياض"
                autoFocus
                className="w-full rounded-xl px-4 py-3 text-[14px] text-[#1a3a4a] outline-none"
                style={{ background: '#f8fbfd', border: '1.5px solid #e2edf5' }}
              />
            </div>

            <div>
              <label className="block text-[13px] font-bold text-[#1a3a4a] mb-2">الحالة</label>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(STATUS_BADGE).map(([key, badge]) => (
                  <button
                    key={key}
                    onClick={() => setStatus(key)}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-[12px] font-bold transition-all"
                    style={{
                      background: status === key ? badge.bg : '#f8fbfd',
                      border: status === key ? `2px solid ${badge.color}` : '1.5px solid #e2edf5',
                      color: status === key ? badge.color : '#7a9aab',
                    }}
                  >
                    {status === key && (
                      <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: badge.color }}>
                        <Check className="w-2.5 h-2.5 text-white" />
                      </div>
                    )}
                    {badge.label}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="rounded-xl px-4 py-3" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
                <p className="text-[12px] text-red-600 font-semibold">{error}</p>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl text-[13px] font-bold text-[#4a6a7e]"
                style={{ background: '#f0f6fa', border: '1px solid #e2edf5' }}
              >
                إلغاء
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading || !name.trim()}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-black text-white disabled:opacity-60 transition-all"
                style={{ background: 'linear-gradient(135deg, #1a3a4a, #2c5f7c)', boxShadow: '0 4px 14px rgba(26,58,74,0.25)' }}
              >
                {loading ? (
                  <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                {loading ? 'جاري الإضافة...' : 'إضافة المدينة'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CitiesTab() {
  const { cities, loading, addCity, updateCity, deleteCity, deleteCities, freezeCity, activateCity, getCityStats } = useCities();
  const [view, setView] = useState<View>({ mode: 'list' });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState<City | null>(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  const filtered = useMemo(() => {
    return cities.filter(c => {
      const matchSearch = c.name.includes(search);
      const matchStatus = !statusFilter || c.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [cities, search, statusFilter]);

  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const allPageSelected = paginated.length > 0 && paginated.every(c => selected.has(c.id));
  const somePageSelected = paginated.some(c => selected.has(c.id));
  const selectedCount = selected.size;

  const toggleAll = () => {
    if (allPageSelected) {
      setSelected(prev => {
        const next = new Set(prev);
        paginated.forEach(c => next.delete(c.id));
        return next;
      });
    } else {
      setSelected(prev => {
        const next = new Set(prev);
        paginated.forEach(c => next.add(c.id));
        return next;
      });
    }
  };

  const toggleOne = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkDelete = async () => {
    setBulkLoading(true);
    const err = await deleteCities(Array.from(selected));
    setBulkLoading(false);
    setConfirmBulkDelete(false);
    if (err) {
      setDeleteError(err.message);
    } else {
      setSelected(new Set());
    }
  };

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
      {showAddDialog && (
        <AddCityDialog
          onAdd={addCity}
          onClose={() => setShowAddDialog(false)}
        />
      )}

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
              setSelected(prev => { const n = new Set(prev); n.delete(confirmDelete.id); return n; });
              setConfirmDelete(null);
            }
          }}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      {confirmBulkDelete && (
        <ConfirmDialog
          title="حذف المدن المحددة"
          message={`هل أنت متأكد من حذف ${selectedCount} ${selectedCount === 1 ? 'مدينة' : 'مدن'}؟ لا يمكن التراجع عن هذا الإجراء.`}
          confirmLabel={bulkLoading ? 'جاري الحذف...' : `حذف ${selectedCount} مدن`}
          danger
          onConfirm={handleBulkDelete}
          onCancel={() => setConfirmBulkDelete(false)}
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

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="rounded-xl px-4 py-2.5 flex items-center gap-2.5" style={{ background: 'linear-gradient(135deg, #EFF6FF, #DBEAFE)', border: '1px solid #BFDBFE' }}>
          <MapPin className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
          <p className="text-[11px] text-blue-700 leading-relaxed">
            إضافة أو حذف مدينة يُحدّث <span className="font-black">إضافة مخزون</span> و<span className="font-black">إنشاء طلب</span> فوراً
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedCount > 0 && (
            <button
              onClick={() => setConfirmBulkDelete(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-black text-white transition-all hover:opacity-90 active:scale-95"
              style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)', boxShadow: '0 4px 12px rgba(220,38,38,0.3)' }}
            >
              <Trash2 className="w-4 h-4" />
              حذف المحدد ({selectedCount})
            </button>
          )}
          <button
            onClick={() => setShowAddDialog(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-black text-white transition-all hover:opacity-90 active:scale-95"
            style={{ background: 'linear-gradient(135deg, #1a3a4a, #2c5f7c)', boxShadow: '0 4px 12px rgba(26,58,74,0.25)' }}
          >
            <Plus className="w-4 h-4" />
            إضافة مدينة
          </button>
        </div>
      </div>

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
        {selectedCount > 0 && (
          <div className="px-4 py-2.5 flex items-center justify-between" style={{ background: '#FEF2F2', borderBottom: '1px solid #FECACA' }}>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: '#dc2626' }}>
                <Check className="w-3 h-3 text-white" />
              </div>
              <span className="text-[12px] font-bold text-[#dc2626]">
                تم تحديد {selectedCount} {selectedCount === 1 ? 'مدينة' : 'مدن'}
              </span>
            </div>
            <button
              onClick={() => setSelected(new Set())}
              className="text-[11px] font-semibold text-[#dc2626] hover:text-[#991b1b] transition-colors"
            >
              إلغاء التحديد
            </button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[#f0f6fa] bg-[#f7fbfd]">
                <th className="px-4 py-3 w-10">
                  <button
                    onClick={toggleAll}
                    className="w-5 h-5 rounded flex items-center justify-center transition-all border-2"
                    style={{
                      background: allPageSelected ? '#1a3a4a' : somePageSelected ? '#e2edf5' : 'white',
                      borderColor: allPageSelected ? '#1a3a4a' : somePageSelected ? '#1a3a4a' : '#c8d9e5',
                    }}
                    title="تحديد الكل"
                  >
                    {allPageSelected && <Check className="w-3 h-3 text-white" />}
                    {!allPageSelected && somePageSelected && (
                      <div className="w-2 h-0.5 rounded-full" style={{ background: '#1a3a4a' }} />
                    )}
                  </button>
                </th>
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
                    {Array.from({ length: 8 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-gray-100 rounded animate-pulse" style={{ width: j === 0 ? '20px' : j === 1 ? '80px' : '60px' }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: '#f0f6fa' }}>
                        <MapPin className="w-6 h-6 text-[#b0c8d8]" />
                      </div>
                      <p className="text-[13px] text-[#7a9aab] font-semibold">لا توجد مدن</p>
                      <button
                        onClick={() => setShowAddDialog(true)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-bold text-white"
                        style={{ background: 'linear-gradient(135deg, #1a3a4a, #2c5f7c)' }}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        إضافة مدينة
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                paginated.map(city => {
                  const badge = STATUS_BADGE[city.status] ?? STATUS_BADGE.monitoring;
                  const isSelected = selected.has(city.id);
                  return (
                    <tr
                      key={city.id}
                      className="transition-colors"
                      style={{ background: isSelected ? '#fef9f9' : undefined }}
                    >
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleOne(city.id)}
                          className="w-5 h-5 rounded flex items-center justify-center transition-all border-2"
                          style={{
                            background: isSelected ? '#dc2626' : 'white',
                            borderColor: isSelected ? '#dc2626' : '#c8d9e5',
                          }}
                        >
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </button>
                      </td>
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
          <div className="px-4 py-2 border-t border-[#f0f6fa] flex items-center justify-between">
            <span className="text-[11px] text-[#7a9aab]">{filtered.length} مدينة إجمالاً</span>
            <span className="text-[11px] text-[#7a9aab]">
              {cities.filter(c => c.status === 'active').length} نشطة — {cities.filter(c => c.status === 'frozen').length} مجمدة
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
