import { useState } from 'react';
import { Shield, Check, X, Loader2, Clock, Plus, Trash2 } from 'lucide-react';
import { useCustomRoles, useStaffManagement, useAuditLog, type CustomRole } from '../../../hooks/useStaffManagement';
import ConfirmDialog from '../market/shared/ConfirmDialog';

const PERMISSIONS = [
  { key: 'can_view', label: 'عرض البيانات' },
  { key: 'can_edit', label: 'تعديل البيانات' },
  { key: 'can_delete', label: 'حذف البيانات' },
  { key: 'can_settle', label: 'تحصيل العمولات' },
  { key: 'can_modify_financials', label: 'لوحة المالية' },
  { key: 'can_manage_cities', label: 'إدارة المدن' },
  { key: 'can_manage_users', label: 'إدارة المستخدمين' },
  { key: 'can_view_analytics', label: 'إحصائيات السوق' },
  { key: 'can_manage_staff', label: 'إدارة الموظفين' },
];

const COLOR_PRESETS = [
  { color: '#dc2626', bg: '#fef2f2' },
  { color: '#B8860B', bg: '#FFFBEB' },
  { color: '#0369A1', bg: '#E0F2FE' },
  { color: '#16a34a', bg: '#f0fdf4' },
  { color: '#7c3aed', bg: '#f5f3ff' },
  { color: '#64748b', bg: '#f1f5f9' },
  { color: '#0d9488', bg: '#f0fdfa' },
  { color: '#c2410c', bg: '#fff7ed' },
];

function formatDateTime(dateStr: string) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return `${d.toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' })} ${d.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}`;
}

export default function RolesPermissions() {
  const { roles, loading: rolesLoading, addRole, deleteRole } = useCustomRoles();
  const { staff, loading: staffLoading } = useStaffManagement();
  const { logs, loading: logsLoading } = useAuditLog();
  const [showAddForm, setShowAddForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CustomRole | null>(null);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    await deleteRole(deleteTarget.id);
    setDeleteTarget(null);
  };

  if (rolesLoading || staffLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-7 h-7 text-[#1a4a5e] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#EBF5FF] flex items-center justify-center">
            <Shield className="w-4 h-4 text-[#1a4a5e]" />
          </div>
          <div>
            <h3 className="text-[14px] font-bold text-[#1a2f3e]">الأدوار والصلاحيات</h3>
            <p className="text-[11px] text-[#7a9aab]">{roles.length} دور - نظام التحكم بالوصول حسب الدور</p>
          </div>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-bold text-white bg-[#1a4a5e] hover:bg-[#163d4e] transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          إضافة دور
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {roles.map(role => {
          const staffCount = staff.filter(s => s.role === role.slug && s.is_active).length;
          return (
            <div key={role.id} className="bg-white rounded-2xl border border-[#e2edf5] overflow-hidden hover:shadow-sm transition-shadow">
              <div className="p-4 border-b border-[#f0f4f7]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: role.bg, color: role.color }}>
                    {role.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-[#7a9aab]">{staffCount} موظف</span>
                    {!role.is_system && (
                      <button
                        onClick={() => setDeleteTarget(role)}
                        className="w-6 h-6 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center transition-colors"
                      >
                        <Trash2 className="w-3 h-3 text-red-500" />
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-[11px] text-[#7a9aab] leading-relaxed">{role.description}</p>
                {role.is_system && (
                  <span className="inline-block mt-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#f0f6fa] text-[#7a9aab]">دور أساسي</span>
                )}
              </div>
              <div className="p-3 space-y-1">
                {PERMISSIONS.map(perm => {
                  const hasAccess = (role as Record<string, unknown>)[perm.key] === true;
                  return (
                    <div key={perm.key} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-[#f8fafb]">
                      <span className="text-[11px] text-[#4a7a94]">{perm.label}</span>
                      {hasAccess ? (
                        <div className="w-5 h-5 rounded-full bg-emerald-50 flex items-center justify-center">
                          <Check className="w-3 h-3 text-emerald-600" />
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-gray-50 flex items-center justify-center">
                          <X className="w-3 h-3 text-gray-300" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <AuditLogSection logs={logs} loading={logsLoading} />

      {showAddForm && (
        <AddRoleForm
          onClose={() => setShowAddForm(false)}
          onSave={async (data) => {
            const ok = await addRole(data);
            if (ok) setShowAddForm(false);
            return ok;
          }}
          existingSlugs={roles.map(r => r.slug)}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="حذف الدور"
          message={`هل أنت متأكد من حذف دور "${deleteTarget.name}"؟ لن يمكن التراجع عن هذا الإجراء.`}
          confirmLabel="حذف"
          danger
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

function AuditLogSection({ logs, loading }: {
  logs: { id: string; admin_phone: string; action: string; entity_type: string; created_at: string }[];
  loading: boolean;
}) {
  return (
    <div className="bg-white rounded-2xl border border-[#e2edf5] overflow-hidden">
      <div className="flex items-center gap-2.5 p-5 border-b border-[#e2edf5]">
        <div className="w-9 h-9 rounded-xl bg-[#f1f5f9] flex items-center justify-center">
          <Clock className="w-4 h-4 text-[#64748b]" />
        </div>
        <div>
          <h4 className="text-[14px] font-bold text-[#1a2f3e]">سجل الإجراءات الإدارية</h4>
          <p className="text-[11px] text-[#7a9aab]">آخر 50 إجراء مسجل في المنصة</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-5 h-5 text-[#1a4a5e] animate-spin" />
        </div>
      ) : logs.length === 0 ? (
        <p className="text-center text-[13px] text-[#7a9aab] py-10">لا توجد إجراءات مسجلة بعد</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#f8fafb]">
                <th className="px-5 py-2.5 text-right text-[11px] font-semibold text-[#4a7a94]">المشرف</th>
                <th className="px-3 py-2.5 text-right text-[11px] font-semibold text-[#4a7a94]">الإجراء</th>
                <th className="px-3 py-2.5 text-right text-[11px] font-semibold text-[#4a7a94]">النوع</th>
                <th className="px-5 py-2.5 text-right text-[11px] font-semibold text-[#4a7a94]">التاريخ والوقت</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id} className="border-t border-[#f0f4f7] hover:bg-[#f7fbfd] transition-colors">
                  <td className="px-5 py-3 text-[12px] font-semibold text-[#1a2f3e]">{log.admin_phone}</td>
                  <td className="px-3 py-3 text-[12px] text-[#4a7a94]">{log.action}</td>
                  <td className="px-3 py-3">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#f0f6fa] text-[#4a7a94]">
                      {log.entity_type}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-[11px] text-[#7a9aab]">{formatDateTime(log.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function AddRoleForm({ onClose, onSave, existingSlugs }: {
  onClose: () => void;
  onSave: (data: {
    name: string; slug: string; description: string; color: string; bg: string;
    can_view: boolean; can_edit: boolean; can_delete: boolean; can_settle: boolean;
    can_modify_financials: boolean; can_manage_cities: boolean; can_manage_users: boolean;
    can_view_analytics: boolean; can_manage_staff: boolean;
  }) => Promise<boolean>;
  existingSlugs: string[];
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [colorIdx, setColorIdx] = useState(0);
  const [perms, setPerms] = useState<Record<string, boolean>>({
    can_view: true, can_edit: false, can_delete: false, can_settle: false,
    can_modify_financials: false, can_manage_cities: false, can_manage_users: false,
    can_view_analytics: false, can_manage_staff: false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const togglePerm = (key: string) => {
    setPerms(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const generateSlug = (n: string) => {
    return n.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_\u0600-\u06FF]/g, '') || `role_${Date.now()}`;
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('يرجى إدخال اسم الدور');
      return;
    }
    const slug = generateSlug(name);
    if (existingSlugs.includes(slug)) {
      setError('هذا الدور موجود بالفعل');
      return;
    }
    setError('');
    setSaving(true);
    const preset = COLOR_PRESETS[colorIdx];
    await onSave({
      name: name.trim(),
      slug,
      description: description.trim(),
      color: preset.color,
      bg: preset.bg,
      ...perms,
    });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6" dir="rtl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-[15px] font-bold text-[#1a2f3e]">إضافة دور جديد</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="space-y-5">
          <div>
            <label className="text-[12px] font-bold text-[#4a7a94] block mb-1.5">اسم الدور</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="مثال: مدير المبيعات"
              className="w-full px-3 py-2.5 text-[13px] bg-white border border-[#e2edf5] rounded-xl text-[#1a2f3e] placeholder-[#b0c4ce] focus:outline-none focus:border-[#1a4a5e] transition-colors"
            />
          </div>

          <div>
            <label className="text-[12px] font-bold text-[#4a7a94] block mb-1.5">الوصف</label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="وصف مختصر لصلاحيات هذا الدور"
              className="w-full px-3 py-2.5 text-[13px] bg-white border border-[#e2edf5] rounded-xl text-[#1a2f3e] placeholder-[#b0c4ce] focus:outline-none focus:border-[#1a4a5e] transition-colors"
            />
          </div>

          <div>
            <label className="text-[12px] font-bold text-[#4a7a94] block mb-2">لون الشارة</label>
            <div className="flex items-center gap-2 flex-wrap">
              {COLOR_PRESETS.map((preset, i) => (
                <button
                  key={i}
                  onClick={() => setColorIdx(i)}
                  className={`w-8 h-8 rounded-lg border-2 transition-all flex items-center justify-center ${
                    colorIdx === i ? 'border-[#1a4a5e] scale-110' : 'border-transparent'
                  }`}
                  style={{ background: preset.bg }}
                >
                  <div className="w-3.5 h-3.5 rounded-full" style={{ background: preset.color }} />
                </button>
              ))}
            </div>
            {name && (
              <div className="mt-2">
                <span
                  className="text-[11px] font-bold px-2.5 py-1 rounded-full inline-block"
                  style={{ background: COLOR_PRESETS[colorIdx].bg, color: COLOR_PRESETS[colorIdx].color }}
                >
                  {name}
                </span>
              </div>
            )}
          </div>

          <div>
            <label className="text-[12px] font-bold text-[#4a7a94] block mb-2">الصلاحيات</label>
            <div className="bg-[#f8fafb] rounded-xl border border-[#e2edf5] divide-y divide-[#e2edf5]">
              {PERMISSIONS.map(perm => (
                <button
                  key={perm.key}
                  onClick={() => togglePerm(perm.key)}
                  className="w-full flex items-center justify-between py-3 px-4 hover:bg-[#f0f6fa] transition-colors"
                >
                  <span className="text-[12px] text-[#1a2f3e]">{perm.label}</span>
                  <div className={`w-9 h-5 rounded-full transition-colors flex items-center ${
                    perms[perm.key] ? 'bg-emerald-500 justify-end' : 'bg-gray-200 justify-start'
                  }`}>
                    <div className={`w-4 h-4 rounded-full bg-white shadow-sm mx-0.5 transition-transform`} />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-[12px] text-red-600 font-semibold">{error}</p>
          )}

          <button
            onClick={handleSubmit}
            disabled={saving || !name.trim()}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-bold text-white bg-[#1a4a5e] hover:bg-[#163d4e] disabled:opacity-50 transition-colors"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            إضافة الدور
          </button>
        </div>
      </div>
    </div>
  );
}
