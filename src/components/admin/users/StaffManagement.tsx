import { useState } from 'react';
import { UserCog, Plus, Loader2, X, Check } from 'lucide-react';
import { useStaffManagement, useCustomRoles, type CustomRole } from '../../../hooks/useStaffManagement';
import type { StaffMember } from '../../../types/admin';
import ConfirmDialog from '../market/shared/ConfirmDialog';

function formatDate(dateStr: string) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' });
}

function getRoleBadge(roleSlug: string, roles: CustomRole[]) {
  const found = roles.find(r => r.slug === roleSlug);
  if (found) return { label: found.name, color: found.color, bg: found.bg };
  return { label: roleSlug, color: '#64748b', bg: '#f1f5f9' };
}

function getPermissionsFromRole(roleSlug: string, roles: CustomRole[]): Record<string, boolean> {
  const found = roles.find(r => r.slug === roleSlug);
  if (!found) return { can_view: true, can_edit: false, can_delete: false, can_settle: false, can_modify_financials: false, can_manage_cities: false, can_manage_users: false, can_view_analytics: false, can_manage_staff: false };
  return {
    can_view: found.can_view,
    can_edit: found.can_edit,
    can_delete: found.can_delete,
    can_settle: found.can_settle,
    can_modify_financials: found.can_modify_financials,
    can_manage_cities: found.can_manage_cities,
    can_manage_users: found.can_manage_users,
    can_view_analytics: found.can_view_analytics,
    can_manage_staff: found.can_manage_staff,
  };
}

export default function StaffManagement() {
  const { staff, loading, addStaff, updateStaff, toggleActive } = useStaffManagement();
  const { roles, loading: rolesLoading } = useCustomRoles();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ member: StaffMember; action: 'activate' | 'deactivate' } | null>(null);

  const handleConfirm = async () => {
    if (!confirmAction) return;
    await toggleActive(confirmAction.member.id, confirmAction.action === 'activate');
    setConfirmAction(null);
  };

  if (loading || rolesLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-7 h-7 text-[#1a4a5e] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#EBF5FF] flex items-center justify-center">
            <UserCog className="w-4 h-4 text-[#1a4a5e]" />
          </div>
          <div>
            <h3 className="text-[14px] font-bold text-[#1a2f3e]">إدارة الموظفين</h3>
            <p className="text-[11px] text-[#7a9aab]">{staff.length} موظف</p>
          </div>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-bold text-white bg-[#1a4a5e] hover:bg-[#163d4e] transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          إضافة موظف
        </button>
      </div>

      <div className="rounded-xl border border-[#e2edf5] overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#f0f6fa]">
                {['الاسم', 'البريد الإلكتروني', 'الهاتف', 'الدور', 'الحالة', 'تاريخ الإضافة', 'إجراء'].map(col => (
                  <th key={col} className="px-4 py-3 text-right text-[11px] font-bold text-[#4a7a94] whitespace-nowrap">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {staff.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <p className="text-[13px] text-[#7a9aab]">لا يوجد موظفين بعد</p>
                  </td>
                </tr>
              ) : (
                staff.map(s => {
                  const badge = getRoleBadge(s.role, roles);
                  return (
                    <tr key={s.id} className="border-t border-[#edf4f9] hover:bg-[#f7fbfd] transition-colors">
                      <td className="px-4 py-3 text-[13px] font-semibold text-[#1a2f3e]">{s.display_name || '-'}</td>
                      <td className="px-4 py-3 text-[12px] text-[#4a7a94]" dir="ltr">{s.email || '-'}</td>
                      <td className="px-4 py-3 text-[12px] text-[#4a7a94]" dir="ltr">{s.phone}</td>
                      <td className="px-4 py-3">
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{ background: badge.bg, color: badge.color }}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          s.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {s.is_active ? 'نشط' : 'معطّل'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[11px] text-[#4a7a94]">{formatDate(s.created_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setEditingId(s.id)}
                            className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-[#1a4a5e] bg-[#EBF5FF] hover:bg-[#d6ebf7] transition-colors"
                          >
                            تعديل
                          </button>
                          <button
                            onClick={() => setConfirmAction({
                              member: s,
                              action: s.is_active ? 'deactivate' : 'activate',
                            })}
                            className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-colors ${
                              s.is_active
                                ? 'text-red-600 bg-red-50 hover:bg-red-100'
                                : 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100'
                            }`}
                          >
                            {s.is_active ? 'تعطيل' : 'تفعيل'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAddForm && (
        <AddStaffForm
          roles={roles}
          onClose={() => setShowAddForm(false)}
          onSave={async (data) => {
            const permissions = getPermissionsFromRole(data.role, roles);
            const ok = await addStaff({ ...data, permissions });
            if (ok) setShowAddForm(false);
            return ok;
          }}
        />
      )}

      {editingId && (
        <EditStaffForm
          member={staff.find(s => s.id === editingId)!}
          roles={roles}
          onClose={() => setEditingId(null)}
          onSave={async (data) => {
            const permissions = getPermissionsFromRole(data.role, roles);
            const ok = await updateStaff(editingId, { ...data, permissions });
            if (ok) setEditingId(null);
            return ok;
          }}
        />
      )}

      {confirmAction && (
        <ConfirmDialog
          title={confirmAction.action === 'deactivate' ? 'تعطيل الموظف' : 'تفعيل الموظف'}
          message={
            confirmAction.action === 'deactivate'
              ? `هل أنت متأكد من تعطيل حساب "${confirmAction.member.display_name}"؟`
              : `هل أنت متأكد من تفعيل حساب "${confirmAction.member.display_name}"؟`
          }
          confirmLabel={confirmAction.action === 'deactivate' ? 'تعطيل' : 'تفعيل'}
          danger={confirmAction.action === 'deactivate'}
          onConfirm={handleConfirm}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </div>
  );
}

function AddStaffForm({ roles, onClose, onSave }: {
  roles: CustomRole[];
  onClose: () => void;
  onSave: (data: { phone: string; display_name: string; email: string; role: string }) => Promise<boolean>;
}) {
  const [phone, setPhone] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState(roles[0]?.slug ?? '');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!phone.trim() || !displayName.trim() || !role) return;
    setSaving(true);
    await onSave({ phone: phone.trim(), display_name: displayName.trim(), email: email.trim(), role });
    setSaving(false);
  };

  return (
    <FormOverlay title="إضافة موظف جديد" onClose={onClose}>
      <div className="space-y-4">
        <FormField label="الاسم" value={displayName} onChange={setDisplayName} placeholder="اسم الموظف" />
        <FormField label="رقم الهاتف" value={phone} onChange={setPhone} placeholder="05xxxxxxxx" dir="ltr" />
        <FormField label="البريد الإلكتروني" value={email} onChange={setEmail} placeholder="email@example.com" dir="ltr" />
        <div>
          <label className="text-[12px] font-bold text-[#4a7a94] block mb-1.5">الدور</label>
          <select
            value={role}
            onChange={e => setRole(e.target.value)}
            className="w-full px-3 py-2.5 text-[13px] bg-white border border-[#e2edf5] rounded-xl text-[#1a2f3e] focus:outline-none focus:border-[#1a4a5e] transition-colors"
          >
            {roles.map(r => (
              <option key={r.slug} value={r.slug}>{r.name}</option>
            ))}
          </select>
        </div>
        <button
          onClick={handleSubmit}
          disabled={saving || !phone.trim() || !displayName.trim() || !role}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-bold text-white bg-[#1a4a5e] hover:bg-[#163d4e] disabled:opacity-50 transition-colors"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          إضافة الموظف
        </button>
      </div>
    </FormOverlay>
  );
}

function EditStaffForm({ member, roles, onClose, onSave }: {
  member: StaffMember;
  roles: CustomRole[];
  onClose: () => void;
  onSave: (data: { display_name: string; email: string; role: string }) => Promise<boolean>;
}) {
  const [displayName, setDisplayName] = useState(member.display_name);
  const [email, setEmail] = useState(member.email);
  const [role, setRole] = useState(member.role);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!displayName.trim()) return;
    setSaving(true);
    await onSave({ display_name: displayName.trim(), email: email.trim(), role });
    setSaving(false);
  };

  return (
    <FormOverlay title="تعديل بيانات الموظف" onClose={onClose}>
      <div className="space-y-4">
        <FormField label="الاسم" value={displayName} onChange={setDisplayName} placeholder="اسم الموظف" />
        <FormField label="البريد الإلكتروني" value={email} onChange={setEmail} placeholder="email@example.com" dir="ltr" />
        <div>
          <label className="text-[12px] font-bold text-[#4a7a94] block mb-1.5">الدور</label>
          <select
            value={role}
            onChange={e => setRole(e.target.value)}
            className="w-full px-3 py-2.5 text-[13px] bg-white border border-[#e2edf5] rounded-xl text-[#1a2f3e] focus:outline-none focus:border-[#1a4a5e] transition-colors"
          >
            {roles.map(r => (
              <option key={r.slug} value={r.slug}>{r.name}</option>
            ))}
          </select>
        </div>
        <button
          onClick={handleSubmit}
          disabled={saving || !displayName.trim()}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-bold text-white bg-[#1a4a5e] hover:bg-[#163d4e] disabled:opacity-50 transition-colors"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          حفظ التعديلات
        </button>
      </div>
    </FormOverlay>
  );
}

function FormOverlay({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" dir="rtl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-[15px] font-bold text-[#1a2f3e]">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function FormField({ label, value, onChange, placeholder, dir }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  dir?: string;
}) {
  return (
    <div>
      <label className="text-[12px] font-bold text-[#4a7a94] block mb-1.5">{label}</label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        dir={dir}
        className="w-full px-3 py-2.5 text-[13px] bg-white border border-[#e2edf5] rounded-xl text-[#1a2f3e] placeholder-[#b0c4ce] focus:outline-none focus:border-[#1a4a5e] transition-colors"
      />
    </div>
  );
}
