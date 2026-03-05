import { useState } from 'react';
import {
  User, Building2, Phone, MapPin, Briefcase, ShieldCheck, Ban,
  CheckCircle2, ChevronLeft, Clock, Handshake, ShoppingBag, Package,
  AlertTriangle, X, Star, MessageCircle, TrendingUp,
} from 'lucide-react';
import { useAdminUsers, type AdminUser } from '../../../hooks/useAdminUsers';
import type { TrustRating } from '../../../types/admin';
import TableControls from '../market/shared/TableControls';
import ConfirmDialog from '../market/shared/ConfirmDialog';

function formatDate(dateStr: string) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' });
}

const TRUST_LABELS: Record<number, { label: string; color: string; bg: string }> = {
  5: { label: 'مورد موثوق', color: '#16a34a', bg: '#f0fdf4' },
  4: { label: 'مورد جيد', color: '#0d7c3e', bg: '#ecfdf5' },
  3: { label: 'مورد عادي', color: '#B8860B', bg: '#FFFBEB' },
  2: { label: 'مورد جديد', color: '#0369A1', bg: '#E0F2FE' },
  1: { label: 'يحتاج مراقبة', color: '#dc2626', bg: '#fef2f2' },
};

function TrustBadge({ rating }: { rating: TrustRating }) {
  const config = TRUST_LABELS[rating] ?? TRUST_LABELS[3];
  return (
    <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: config.bg, color: config.color }}>
      <span className="flex">
        {Array.from({ length: rating }).map((_, i) => (
          <Star key={i} className="w-2.5 h-2.5 fill-current" />
        ))}
      </span>
    </span>
  );
}

function AccountStatusBadge({ status }: { status: string }) {
  const config = status === 'active'
    ? { label: 'نشط', color: '#16a34a', bg: '#f0fdf4' }
    : status === 'suspended'
      ? { label: 'معلّق', color: '#dc2626', bg: '#fef2f2' }
      : { label: 'غير نشط', color: '#64748b', bg: '#f1f5f9' };

  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: config.bg, color: config.color }}>
      {config.label}
    </span>
  );
}

function ActivityTypeBadge({ roles }: { roles: string[] }) {
  const hasSup = roles.includes('supplier');
  const hasBuy = roles.includes('buyer');
  if (hasSup && hasBuy) return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FFFBEB] text-[#B8860B]">مورد + مشتري</span>;
  if (hasSup) return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#f0fdf4] text-[#16a34a]">مورد</span>;
  if (hasBuy) return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#eff6ff] text-[#2563eb]">مشتري</span>;
  return <span className="text-[10px] text-[#a0b5c0]">-</span>;
}

function whatsappUrl(phone: string) {
  const cleaned = phone.replace(/\D/g, '');
  return `https://wa.me/${cleaned}`;
}

export default function UsersList() {
  const {
    users, loading, search, setSearch,
    typeFilter, setTypeFilter,
    roleFilter, setRoleFilter,
    statusFilter, setStatusFilter,
    page, setPage, total, pageSize,
    toggleSuspend, toggleRiskFlag, updateTrustRating,
  } = useAdminUsers();

  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ user: AdminUser; action: 'suspend' | 'unsuspend' } | null>(null);

  const handleSuspendConfirm = async () => {
    if (!confirmAction) return;
    await toggleSuspend(confirmAction.user.id, confirmAction.action === 'suspend');
    setConfirmAction(null);
    setSelectedUser(null);
  };

  return (
    <div className="space-y-4">
      <TableControls
        search={search}
        onSearch={setSearch}
        searchPlaceholder="بحث بالاسم أو رقم الجوال..."
        filters={[
          {
            label: 'النوع',
            value: typeFilter,
            options: [
              { value: 'individual', label: 'فرد' },
              { value: 'company', label: 'شركة' },
            ],
            onChange: setTypeFilter,
          },
          {
            label: 'الدور',
            value: roleFilter,
            options: [
              { value: 'supplier', label: 'مورّد' },
              { value: 'buyer', label: 'مشتري' },
            ],
            onChange: setRoleFilter,
          },
          {
            label: 'الحالة',
            value: statusFilter,
            options: [
              { value: 'active', label: 'نشط' },
              { value: 'suspended', label: 'معلّق' },
              { value: 'inactive', label: 'غير نشط' },
            ],
            onChange: setStatusFilter,
          },
        ]}
        total={total}
        page={page}
        pageSize={pageSize}
        onPage={setPage}
      />

      <div className="rounded-xl border border-[#e2edf5] overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#f0f6fa]">
                {['الاسم', 'رقم الجوال', 'المدينة', 'نوع النشاط', 'التقييم', 'تاريخ التسجيل', 'الحالة'].map(col => (
                  <th key={col} className="px-4 py-3 text-right text-[11px] font-bold text-[#4a7a94] whitespace-nowrap">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-t border-[#edf4f9]">
                    {Array.from({ length: 7 }).map((__, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded w-20 animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <User className="w-8 h-8 text-gray-300" />
                      <p className="text-[13px] text-[#7a9aab]">لا يوجد مستخدمون</p>
                    </div>
                  </td>
                </tr>
              ) : (
                users.map(u => (
                  <tr
                    key={u.id}
                    onClick={() => setSelectedUser(u)}
                    className="border-t border-[#edf4f9] hover:bg-[#f7fbfd] cursor-pointer transition-colors group"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: u.user_type === 'company' ? '#eff6ff' : '#f0fdf4' }}>
                          {u.user_type === 'company'
                            ? <Building2 className="w-3.5 h-3.5 text-[#2563eb]" />
                            : <User className="w-3.5 h-3.5 text-[#16a34a]" />
                          }
                        </div>
                        <div className="min-w-0">
                          <p className="text-[12px] font-bold text-[#1a2f3e] truncate max-w-[140px]">
                            {u.user_type === 'company' ? (u.company_name || u.display_name) : u.display_name || '-'}
                          </p>
                          {u.risk_flag && <span className="text-[9px] font-bold text-amber-600">مخاطر</span>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[12px] text-[#1a2f3e] font-medium whitespace-nowrap" dir="ltr">{u.phone}</td>
                    <td className="px-4 py-3 text-[12px] text-[#4a7a94]">{u.city || '-'}</td>
                    <td className="px-4 py-3"><ActivityTypeBadge roles={u.roles} /></td>
                    <td className="px-4 py-3"><TrustBadge rating={u.trust_rating} /></td>
                    <td className="px-4 py-3 text-[11px] text-[#4a7a94] whitespace-nowrap">{formatDate(u.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <AccountStatusBadge status={u.account_status} />
                        <ChevronLeft className="w-3.5 h-3.5 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedUser && (
        <UserDetailPanel
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onToggleSuspend={(suspend) => {
            setConfirmAction({ user: selectedUser, action: suspend ? 'suspend' : 'unsuspend' });
          }}
          onToggleRisk={async (flag) => {
            await toggleRiskFlag(selectedUser.id, flag);
            setSelectedUser(prev => prev ? { ...prev, risk_flag: flag } : null);
          }}
          onUpdateTrust={async (rating) => {
            await updateTrustRating(selectedUser.id, rating);
            setSelectedUser(prev => prev ? { ...prev, trust_rating: rating } : null);
          }}
        />
      )}

      {confirmAction && (
        <ConfirmDialog
          title={confirmAction.action === 'suspend' ? 'تعليق الحساب' : 'إلغاء التعليق'}
          message={
            confirmAction.action === 'suspend'
              ? `هل أنت متأكد من تعليق حساب "${confirmAction.user.display_name || confirmAction.user.phone}"؟`
              : `هل أنت متأكد من إلغاء تعليق حساب "${confirmAction.user.display_name || confirmAction.user.phone}"؟`
          }
          confirmLabel={confirmAction.action === 'suspend' ? 'تعليق' : 'إلغاء التعليق'}
          danger={confirmAction.action === 'suspend'}
          onConfirm={handleSuspendConfirm}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </div>
  );
}

function UserDetailPanel({ user, onClose, onToggleSuspend, onToggleRisk, onUpdateTrust }: {
  user: AdminUser;
  onClose: () => void;
  onToggleSuspend: (suspend: boolean) => void;
  onToggleRisk: (flag: boolean) => void;
  onUpdateTrust: (rating: TrustRating) => void;
}) {
  const isCompany = user.user_type === 'company';

  const activityLabel = user.activity_level === 'active' ? 'نشط' : user.activity_level === 'moderate' ? 'نشاط متوسط' : 'غير نشط';
  const activityColor = user.activity_level === 'active' ? '#16a34a' : user.activity_level === 'moderate' ? '#B8860B' : '#64748b';

  return (
    <div className="fixed inset-0 z-[80] flex justify-start">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white h-full overflow-y-auto shadow-2xl" dir="rtl">
        <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between">
          <h3 className="text-[15px] font-black text-[#1a2f3e]">الملف الشخصي</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div className="bg-gradient-to-bl from-[#f0f6fa] to-white rounded-2xl p-5 flex flex-col items-center gap-3 border border-gray-100">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-md" style={{ background: isCompany ? '#1a4a5e' : '#16a34a' }}>
              {isCompany ? <Building2 className="w-7 h-7 text-white" /> : <User className="w-7 h-7 text-white" />}
            </div>
            <div className="text-center">
              <p className="text-[16px] font-black text-[#1a2f3e]">
                {isCompany ? (user.company_name || user.display_name) : user.display_name || '-'}
              </p>
              <p className="text-[12px] text-[#7a9aab] mt-0.5">{user.phone}</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-center">
              <AccountStatusBadge status={user.account_status} />
              <ActivityTypeBadge roles={user.roles} />
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${activityColor}15`, color: activityColor }}>
                <TrendingUp className="w-2.5 h-2.5 inline mr-0.5" />
                {activityLabel}
              </span>
              {user.risk_flag && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600">مخاطر</span>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-50">
              <h4 className="text-[12px] font-bold text-[#4a7a94]">المعلومات الأساسية</h4>
            </div>
            <div className="divide-y divide-gray-50">
              <InfoRow icon={<User className="w-3.5 h-3.5" />} label="الاسم" value={user.display_name || '-'} />
              {isCompany && <InfoRow icon={<Building2 className="w-3.5 h-3.5" />} label="الشركة" value={user.company_name || '-'} />}
              <InfoRow icon={<Phone className="w-3.5 h-3.5" />} label="الجوال" value={user.phone} />
              <InfoRow icon={<MapPin className="w-3.5 h-3.5" />} label="المدينة" value={user.city || '-'} />
              <InfoRow icon={<Briefcase className="w-3.5 h-3.5" />} label="النشاط" value={user.activity_type || '-'} />
              <InfoRow icon={<Clock className="w-3.5 h-3.5" />} label="تاريخ التسجيل" value={formatDate(user.created_at)} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <StatCard icon={<Handshake className="w-4 h-4 text-[#B8860B]" />} label="الصفقات" value={user.total_deals} bg="#FFFBEB" />
            <StatCard icon={<Package className="w-4 h-4 text-[#16a34a]" />} label="طبليات مباعة" value={user.pallets_sold} bg="#f0fdf4" />
            <StatCard icon={<ShoppingBag className="w-4 h-4 text-[#2563eb]" />} label="طبليات مشتراة" value={user.pallets_purchased} bg="#eff6ff" />
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <h4 className="text-[12px] font-bold text-[#4a7a94] mb-3">تقييم الثقة</h4>
            <div className="flex items-center gap-2">
              {([1, 2, 3, 4, 5] as TrustRating[]).map(r => (
                <button
                  key={r}
                  onClick={() => onUpdateTrust(r)}
                  className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl border transition-all ${
                    user.trust_rating >= r
                      ? 'border-[#B8860B] bg-[#FFFBEB]'
                      : 'border-gray-100 bg-gray-50 hover:border-gray-200'
                  }`}
                >
                  <Star className={`w-4 h-4 ${user.trust_rating >= r ? 'text-[#B8860B] fill-[#B8860B]' : 'text-gray-300'}`} />
                  <span className="text-[9px] font-bold text-[#7a9aab]">{r}</span>
                </button>
              ))}
            </div>
            <p className="text-[11px] text-center mt-2 font-semibold" style={{ color: TRUST_LABELS[user.trust_rating]?.color }}>
              {TRUST_LABELS[user.trust_rating]?.label}
            </p>
          </div>

          {user.is_suspended && user.suspension_reason && (
            <div className="bg-red-50 border border-red-100 rounded-xl p-3">
              <p className="text-[11px] font-bold text-red-700 mb-1">سبب التعليق</p>
              <p className="text-[12px] text-red-600">{user.suspension_reason}</p>
            </div>
          )}

          <div className="space-y-2 pt-2">
            <a
              href={whatsappUrl(user.phone)}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-bold text-[#16a34a] bg-[#f0fdf4] border border-[#bbf7d0] hover:bg-[#dcfce7] transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              تواصل واتساب
            </a>

            {user.is_suspended ? (
              <button
                onClick={() => onToggleSuspend(false)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 hover:bg-emerald-100 transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" />
                تفعيل الحساب
              </button>
            ) : (
              <button
                onClick={() => onToggleSuspend(true)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-bold text-red-600 bg-red-50 border border-red-100 hover:bg-red-100 transition-colors"
              >
                <Ban className="w-4 h-4" />
                تعليق الحساب
              </button>
            )}

            <button
              onClick={() => onToggleRisk(!user.risk_flag)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-bold transition-colors"
              style={{
                color: user.risk_flag ? '#16a34a' : '#ca8a04',
                background: user.risk_flag ? '#f0fdf4' : '#fefce8',
                border: `1px solid ${user.risk_flag ? '#bbf7d0' : '#fde68a'}`,
              }}
            >
              {user.risk_flag ? <ShieldCheck className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
              {user.risk_flag ? 'إزالة علامة المخاطر' : 'تعليم كمخاطر'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="w-7 h-7 bg-[#f0f6fa] rounded-lg flex items-center justify-center flex-shrink-0 text-[#4a7a94]">{icon}</div>
      <div className="flex-1 flex items-center justify-between min-w-0">
        <p className="text-[12px] text-[#7a9aab]">{label}</p>
        <p className="text-[12px] font-medium text-[#1a2f3e] truncate mr-3">{value}</p>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, bg }: { icon: React.ReactNode; label: string; value: number; bg: string }) {
  return (
    <div className="rounded-xl border border-gray-100 p-3 flex flex-col items-center gap-1.5" style={{ background: bg }}>
      {icon}
      <p className="text-[18px] font-black text-[#1a2f3e]">{value.toLocaleString('ar-SA')}</p>
      <p className="text-[10px] text-[#7a9aab]">{label}</p>
    </div>
  );
}
