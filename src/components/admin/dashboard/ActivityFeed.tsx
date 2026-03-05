import { Activity, Handshake, CheckCircle, Send, Package, MapPin, UserX, RefreshCw } from 'lucide-react';
import type { ActivityItem } from '../../../hooks/useAdminDashboard';

interface Props {
  activity: ActivityItem[];
  loading: boolean;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'الآن';
  if (mins < 60) return `منذ ${mins} د`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `منذ ${hrs} س`;
  return `منذ ${Math.floor(hrs / 24)} ي`;
}

const ACTION_CONFIG: Record<string, { icon: typeof Activity; color: string; bg: string; label: string }> = {
  deal_created: { icon: Handshake, color: '#2563eb', bg: '#eff6ff', label: 'صفقة جديدة' },
  payment_confirmed: { icon: CheckCircle, color: '#16a34a', bg: '#f0fdf4', label: 'تأكيد دفع' },
  settlement_executed: { icon: Send, color: '#7c3aed', bg: '#f5f3ff', label: 'تسوية منفذة' },
  inventory_added: { icon: Package, color: '#ca8a04', bg: '#fefce8', label: 'مخزون مضاف' },
  city_activated: { icon: MapPin, color: '#16a34a', bg: '#f0fdf4', label: 'مدينة مفعلة' },
  city_frozen: { icon: MapPin, color: '#64748b', bg: '#f8fafc', label: 'مدينة مجمدة' },
  user_deleted: { icon: UserX, color: '#dc2626', bg: '#fef2f2', label: 'مستخدم محذوف' },
  user_suspended: { icon: UserX, color: '#dc2626', bg: '#fef2f2', label: 'مستخدم موقوف' },
  deal_status_changed: { icon: RefreshCw, color: '#ca8a04', bg: '#fefce8', label: 'تغيير حالة صفقة' },
};

function fallbackConfig(action: string) {
  return ACTION_CONFIG[action] ?? {
    icon: Activity,
    color: '#4a7a94',
    bg: '#f0f6fa',
    label: action.replace(/_/g, ' '),
  };
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 py-3">
      <div className="w-8 h-8 rounded-xl bg-gray-100 animate-pulse flex-shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3.5 w-32 bg-gray-100 rounded animate-pulse" />
        <div className="h-3 w-20 bg-gray-100 rounded animate-pulse" />
      </div>
      <div className="h-3 w-12 bg-gray-100 rounded animate-pulse" />
    </div>
  );
}

export default function ActivityFeed({ activity, loading }: Props) {
  return (
    <div className="space-y-3">
      <p className="text-[13px] font-bold text-[#4a7a94] uppercase tracking-wide">سجل النشاط الأخير</p>
      <div className="bg-white rounded-2xl border border-[#e2edf5] divide-y divide-[#f0f6fa]">
        {loading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="px-4">
              <SkeletonRow />
            </div>
          ))
        ) : activity.length === 0 ? (
          <div className="py-10 text-center text-[#7a9aab] text-sm">لا يوجد نشاط حتى الآن</div>
        ) : (
          activity.map(item => {
            const cfg = fallbackConfig(item.action);
            const Icon = cfg.icon;
            return (
              <div key={item.id} className="flex items-center gap-3 px-4 py-3 hover:bg-[#f7fbfd] transition-colors">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: cfg.bg }}
                >
                  <Icon className="w-4 h-4" style={{ color: cfg.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-[#1a2f3e] truncate">{cfg.label}</p>
                  <p className="text-[11px] text-[#7a9aab] truncate">
                    {item.entity_type} · {item.entity_id?.slice(0, 8)}
                    {item.admin_phone ? ` · ${item.admin_phone}` : ''}
                  </p>
                </div>
                <span className="text-[10px] text-[#7a9aab] flex-shrink-0">{timeAgo(item.created_at)}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
