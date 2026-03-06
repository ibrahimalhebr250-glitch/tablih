import { useState } from 'react';
import { MapPin, Pencil, Trash2, Snowflake, Play, BarChart2, AlertTriangle, X } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import type { CityStats } from '../../../hooks/useAdminDashboard';

interface Props {
  cities: CityStats[];
  loading: boolean;
  onRefresh?: () => void;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  active: { label: 'نشطة', color: '#16a34a', bg: '#f0fdf4', dot: '#16a34a' },
  monitoring: { label: 'مراقبة', color: '#ca8a04', bg: '#fefce8', dot: '#ca8a04' },
  pilot: { label: 'تجريبي', color: '#2563eb', bg: '#eff6ff', dot: '#2563eb' },
  frozen: { label: 'مجمدة', color: '#64748b', bg: '#f8fafc', dot: '#64748b' },
};

function ratio(supply: number, demand: number): string {
  if (demand === 0) return supply > 0 ? '∞' : '—';
  return `${Math.round((supply / demand) * 100)}%`;
}

interface CityCardProps {
  city: CityStats;
  onEdit: (city: CityStats) => void;
  onDelete: (city: CityStats) => void;
  onToggleFreeze: (city: CityStats) => void;
}

function CityCard({ city, onEdit, onDelete, onToggleFreeze }: CityCardProps) {
  const cfg = STATUS_CONFIG[city.status] ?? STATUS_CONFIG.monitoring;
  const r = ratio(city.total_supply, city.total_demand);

  return (
    <div className="rounded-2xl bg-white border border-slate-200/60 p-4 space-y-3 hover:shadow-lg transition-all group">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center group-hover:scale-110 transition-transform">
            <MapPin className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <p className="font-bold text-[14px] text-slate-900">{city.name}</p>
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
              style={{ background: cfg.bg, color: cfg.color }}
            >
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: cfg.dot }} />
              {cfg.label}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {city.status === 'frozen' ? (
            <button
              onClick={() => onToggleFreeze(city)}
              className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-all hover:scale-110 active:scale-95"
              title="تفعيل"
            >
              <Play className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={() => onToggleFreeze(city)}
              className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all hover:scale-110 active:scale-95"
              title="تجميد"
            >
              <Snowflake className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={() => onEdit(city)}
            className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all hover:scale-110 active:scale-95"
            title="تعديل"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(city)}
            className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-all hover:scale-110 active:scale-95"
            title="حذف"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-center">
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-3 border border-slate-200/50">
          <p className="text-[18px] font-black text-slate-900">{city.total_supply.toLocaleString('ar-SA')}</p>
          <p className="text-[10px] text-slate-600 font-semibold">العرض</p>
        </div>
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-3 border border-slate-200/50">
          <p className="text-[18px] font-black text-slate-900">{city.total_demand.toLocaleString('ar-SA')}</p>
          <p className="text-[10px] text-slate-600 font-semibold">الطلب</p>
        </div>
      </div>

      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5">
          <BarChart2 className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-[11px] text-slate-600">نسبة التغطية:</span>
          <span className="text-[11px] font-bold text-slate-900">{r}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-slate-600">صفقات نشطة:</span>
          <span className="text-[11px] font-bold text-blue-600">{city.active_deals}</span>
        </div>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl bg-white border border-[#e2edf5] p-4 space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl bg-gray-100 animate-pulse" />
        <div className="space-y-1.5">
          <div className="h-4 w-20 bg-gray-100 rounded animate-pulse" />
          <div className="h-3 w-12 bg-gray-100 rounded animate-pulse" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="h-14 bg-gray-50 rounded-xl animate-pulse" />
        <div className="h-14 bg-gray-50 rounded-xl animate-pulse" />
      </div>
    </div>
  );
}

function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  type = 'danger',
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  type?: 'danger' | 'warning';
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4" onClick={(e) => e.stopPropagation()} dir="rtl">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            type === 'danger' ? 'bg-red-100' : 'bg-amber-100'
          }`}>
            <AlertTriangle className={`w-5 h-5 ${type === 'danger' ? 'text-red-600' : 'text-amber-600'}`} />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-slate-900">{title}</h3>
            <p className="text-sm text-slate-600 mt-1">{message}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors"
          >
            إلغاء
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`flex-1 px-4 py-2.5 rounded-xl font-bold transition-colors ${
              type === 'danger'
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-amber-600 text-white hover:bg-amber-700'
            }`}
          >
            تأكيد
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MarketOverview({ cities, loading, onRefresh }: Props) {
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    type: 'delete' | 'freeze' | 'unfreeze';
    city: CityStats | null;
  }>({ isOpen: false, type: 'delete', city: null });
  const [actionLoading, setActionLoading] = useState(false);

  const handleEdit = (city: CityStats) => {
    alert(`تعديل المدينة: ${city.name}\nهذه الميزة ستفتح نافذة التعديل الكاملة في قسم السوق`);
  };

  const handleDelete = async () => {
    if (!confirmDialog.city) return;

    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('cities')
        .delete()
        .eq('id', confirmDialog.city.id);

      if (error) throw error;

      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('Error deleting city:', error);
      alert('فشل حذف المدينة. تأكد من عدم وجود بيانات مرتبطة بها.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleFreeze = async () => {
    if (!confirmDialog.city) return;

    setActionLoading(true);
    try {
      const newStatus = confirmDialog.city.status === 'frozen' ? 'active' : 'frozen';
      const { error } = await supabase
        .from('cities')
        .update({ status: newStatus })
        .eq('id', confirmDialog.city.id);

      if (error) throw error;

      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('Error toggling city status:', error);
      alert('فشل تغيير حالة المدينة');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-xs text-slate-600">
            إجمالي المدن: <span className="font-bold text-slate-900">{cities.length}</span>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {loading
          ? Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
          : cities.map(c => (
              <CityCard
                key={c.id}
                city={c}
                onEdit={handleEdit}
                onDelete={(city) => setConfirmDialog({ isOpen: true, type: 'delete', city })}
                onToggleFreeze={(city) =>
                  setConfirmDialog({
                    isOpen: true,
                    type: city.status === 'frozen' ? 'unfreeze' : 'freeze',
                    city,
                  })
                }
              />
            ))
        }
      </div>

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, type: 'delete', city: null })}
        onConfirm={
          confirmDialog.type === 'delete'
            ? handleDelete
            : handleToggleFreeze
        }
        title={
          confirmDialog.type === 'delete'
            ? 'تأكيد الحذف'
            : confirmDialog.type === 'freeze'
            ? 'تأكيد التجميد'
            : 'تأكيد التفعيل'
        }
        message={
          confirmDialog.type === 'delete'
            ? `هل أنت متأكد من حذف المدينة "${confirmDialog.city?.name}"؟ سيتم حذف جميع البيانات المرتبطة بها.`
            : confirmDialog.type === 'freeze'
            ? `هل أنت متأكد من تجميد المدينة "${confirmDialog.city?.name}"؟ لن يتمكن المستخدمون من إنشاء صفقات جديدة فيها.`
            : `هل أنت متأكد من تفعيل المدينة "${confirmDialog.city?.name}"؟ سيتمكن المستخدمون من إنشاء صفقات جديدة فيها.`
        }
        type={confirmDialog.type === 'delete' ? 'danger' : 'warning'}
      />

      {actionLoading && (
        <div className="fixed inset-0 bg-black/20 z-40 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-6 shadow-xl">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      )}
    </div>
  );
}
