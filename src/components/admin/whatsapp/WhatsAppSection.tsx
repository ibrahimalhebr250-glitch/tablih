import { useState } from 'react';
import {
  MessageCircle, Plus, Pencil, Trash2, BarChart3, Clock,
  Users, TrendingUp, Eye, CheckCircle, XCircle, Search,
  Filter, ChevronDown, RefreshCw, Phone, User, FileText,
  CalendarDays,
} from 'lucide-react';
import { useWhatsAppTemplates } from '../../../hooks/useWhatsAppTemplates';
import type { WhatsAppTemplate, WhatsAppContactLog } from '../../../hooks/useWhatsAppTemplates';
import WhatsAppTemplateEditor from './WhatsAppTemplateEditor';

type TabId = 'templates' | 'logs' | 'stats';

interface Props {
  adminEmail: string;
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: typeof BarChart3; color: string }) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${color}15` }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
      </div>
      <p className="text-2xl font-black text-[#0f2535]">{value}</p>
      <p className="text-xs text-[#7a9aab] font-medium mt-0.5">{label}</p>
    </div>
  );
}

function TemplateCard({
  template,
  onEdit,
  onDelete,
}: {
  template: WhatsAppTemplate;
  onEdit: (t: WhatsAppTemplate) => void;
  onDelete: (id: string) => void;
}) {
  const [showPreview, setShowPreview] = useState(false);

  const roleLabel = template.sender_role === 'buyer' ? 'المشتري' : template.sender_role === 'supplier' ? 'المورد' : 'الطرفين';
  const roleColor = template.sender_role === 'buyer' ? '#1d4ed8' : template.sender_role === 'supplier' ? '#059669' : '#374151';
  const roleBg = template.sender_role === 'buyer' ? '#EFF6FF' : template.sender_role === 'supplier' ? '#ECFDF5' : '#F9FAFB';

  return (
    <div
      className="bg-white rounded-2xl border overflow-hidden shadow-sm"
      style={{ borderColor: template.is_active ? '#e2f5ea' : '#f3f4f6' }}
      dir="rtl"
    >
      <div className="flex items-center justify-between px-5 py-3.5 border-b" style={{ borderColor: template.is_active ? '#e2f5ea' : '#f3f4f6', background: template.is_active ? '#f0faf4' : '#fafafa' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-[#25D366]/15">
            <MessageCircle className="w-4 h-4 text-[#25D366]" />
          </div>
          <div>
            <p className="text-sm font-bold text-[#0f2535]">{template.name}</p>
            {template.is_default && (
              <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">افتراضي</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ color: roleColor, background: roleBg }}>
            {roleLabel}
          </span>
          {template.is_active ? (
            <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
              <CheckCircle className="w-3 h-3" /> مفعّل
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
              <XCircle className="w-3 h-3" /> معطّل
            </span>
          )}
        </div>
      </div>

      <div className="p-5">
        {template.description && (
          <p className="text-xs text-[#7a9aab] mb-3">{template.description}</p>
        )}

        <button
          onClick={() => setShowPreview(!showPreview)}
          className="w-full flex items-center justify-between py-2 px-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors mb-3"
        >
          <div className="flex items-center gap-2">
            <Eye className="w-3.5 h-3.5 text-[#7a9aab]" />
            <span className="text-xs font-bold text-[#7a9aab]">معاينة النص</span>
          </div>
          <ChevronDown className={`w-3.5 h-3.5 text-[#7a9aab] transition-transform ${showPreview ? 'rotate-180' : ''}`} />
        </button>

        {showPreview && (
          <div
            className="bg-[#f0faf4] border border-[#c6e8d4] rounded-xl p-3 mb-3 text-xs whitespace-pre-wrap font-mono text-[#1a3a2a] max-h-32 overflow-y-auto"
            dir="rtl"
          >
            {template.template_text}
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-[11px] text-[#9ab0bf]">
            <TrendingUp className="w-3 h-3" />
            <span>{template.usage_count.toLocaleString('ar-SA')} استخدام</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onEdit(template)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0f2535] text-white text-xs font-bold hover:bg-[#1a3a4f] transition-colors"
            >
              <Pencil className="w-3 h-3" />
              تعديل
            </button>
            {!template.is_default && (
              <button
                onClick={() => onDelete(template.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 text-red-600 text-xs font-bold hover:bg-red-100 transition-colors border border-red-100"
              >
                <Trash2 className="w-3 h-3" />
                حذف
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function LogRow({ log }: { log: WhatsAppContactLog }) {
  const roleColor = log.sender_role === 'buyer' ? '#1d4ed8' : '#059669';
  const roleBg = log.sender_role === 'buyer' ? '#EFF6FF' : '#ECFDF5';

  return (
    <div className="flex items-center gap-4 px-5 py-3.5 border-b border-gray-50 hover:bg-gray-50 transition-colors" dir="rtl">
      <div className="w-9 h-9 rounded-xl bg-[#25D366]/10 flex items-center justify-center flex-shrink-0">
        <MessageCircle className="w-4.5 h-4.5 text-[#25D366]" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ color: roleColor, background: roleBg }}>
            {log.sender_role === 'buyer' ? 'مشتري' : 'مورد'}
          </span>
          {log.deal_ref && (
            <span className="text-[11px] font-mono text-[#7a9aab]" dir="ltr">{log.deal_ref}</span>
          )}
        </div>
        <div className="flex items-center gap-3 text-[11px] text-[#9ab0bf]">
          <div className="flex items-center gap-1">
            <Phone className="w-3 h-3" />
            <span dir="ltr">{log.sender_phone}</span>
          </div>
          <span>←</span>
          <div className="flex items-center gap-1">
            <User className="w-3 h-3" />
            <span dir="ltr">{log.recipient_phone}</span>
          </div>
        </div>
        {log.template_name && (
          <div className="flex items-center gap-1 mt-0.5">
            <FileText className="w-3 h-3 text-[#9ab0bf]" />
            <span className="text-[11px] text-[#9ab0bf]">{log.template_name}</span>
          </div>
        )}
      </div>
      <div className="flex items-center gap-1 text-[11px] text-[#9ab0bf] flex-shrink-0">
        <Clock className="w-3 h-3" />
        <span>{new Date(log.contacted_at).toLocaleString('ar-SA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
      </div>
    </div>
  );
}

export default function WhatsAppSection({ adminEmail }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>('templates');
  const [showEditor, setShowEditor] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<WhatsAppTemplate | null>(null);
  const [searchLogs, setSearchLogs] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  const { templates, logs, stats, loading, logsLoading, saveTemplate, deleteTemplate, fetchLogs, fetchStats, fetchTemplates } = useWhatsAppTemplates(adminEmail);

  const filteredLogs = logs.filter(log => {
    const matchRole = !roleFilter || log.sender_role === roleFilter;
    const matchSearch = !searchLogs ||
      log.sender_phone.includes(searchLogs) ||
      log.recipient_phone.includes(searchLogs) ||
      (log.deal_ref && log.deal_ref.toLowerCase().includes(searchLogs.toLowerCase()));
    return matchRole && matchSearch;
  });

  const handleEdit = (template: WhatsAppTemplate) => {
    setEditingTemplate(template);
    setShowEditor(true);
  };

  const handleNew = () => {
    setEditingTemplate(null);
    setShowEditor(true);
  };

  const handleSave = async (data: Partial<WhatsAppTemplate>) => {
    await saveTemplate(data);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل تريد حذف هذا القالب؟')) return;
    await deleteTemplate(id);
  };

  const handleRefresh = () => {
    if (activeTab === 'logs') fetchLogs({ deal_ref: searchLogs || undefined, sender_role: roleFilter || undefined });
    else if (activeTab === 'stats') fetchStats();
    else fetchTemplates();
  };

  const tabs: { id: TabId; label: string; icon: typeof MessageCircle }[] = [
    { id: 'templates', label: 'القوالب', icon: MessageCircle },
    { id: 'logs', label: 'سجل التواصل', icon: Clock },
    { id: 'stats', label: 'الإحصائيات', icon: BarChart3 },
  ];

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-[#25D366]/30 border-t-[#25D366] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm" style={{ background: '#25D366' }}>
            <MessageCircle className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-[#0f2535]">إدارة واتساب</h1>
            <p className="text-sm text-[#7a9aab]">قوالب الرسائل وتتبع التواصل</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className="p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4 text-[#7a9aab]" />
          </button>
          {activeTab === 'templates' && (
            <button
              onClick={handleNew}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0f2535] text-white font-bold text-sm hover:bg-[#1a3a4f] transition-colors"
            >
              <Plus className="w-4 h-4" />
              قالب جديد
            </button>
          )}
        </div>
      </div>

      {/* Quick stats bar */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="إجمالي التواصل" value={stats.total_contacts} icon={MessageCircle} color="#25D366" />
          <StatCard label="اليوم" value={stats.contacts_today} icon={CalendarDays} color="#0369A1" />
          <StatCard label="هذا الأسبوع" value={stats.contacts_this_week} icon={TrendingUp} color="#059669" />
          <StatCard label="هذا الشهر" value={stats.contacts_this_month} icon={Users} color="#d97706" />
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex border-b border-gray-100">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-bold transition-all border-b-2 ${
                activeTab === id
                  ? 'border-[#25D366] text-[#25D366] bg-[#25D366]/5'
                  : 'border-transparent text-[#7a9aab] hover:text-[#0f2535] hover:bg-gray-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Templates Tab */}
        {activeTab === 'templates' && (
          <div className="p-6">
            {templates.length === 0 ? (
              <div className="text-center py-12">
                <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-[#7a9aab] font-medium">لا توجد قوالب</p>
                <p className="text-xs text-[#9ab0bf] mt-1">أنشئ قالبك الأول للبدء</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {templates.map(template => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Logs Tab */}
        {activeTab === 'logs' && (
          <div>
            {/* Filters */}
            <div className="flex items-center gap-3 p-4 border-b border-gray-100 bg-gray-50">
              <div className="flex-1 relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9ab0bf]" />
                <input
                  value={searchLogs}
                  onChange={e => setSearchLogs(e.target.value)}
                  placeholder="بحث برقم الهاتف أو رقم الصفقة..."
                  className="w-full bg-white border border-gray-200 rounded-xl pr-9 pl-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#25D366]/30"
                />
              </div>
              <div className="relative">
                <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9ab0bf]" />
                <select
                  value={roleFilter}
                  onChange={e => setRoleFilter(e.target.value)}
                  className="bg-white border border-gray-200 rounded-xl pr-9 pl-4 py-2 text-sm focus:outline-none appearance-none text-[#1a2f3e]"
                >
                  <option value="">جميع الأدوار</option>
                  <option value="buyer">المشترين</option>
                  <option value="supplier">الموردين</option>
                </select>
              </div>
              <button
                onClick={() => fetchLogs({ deal_ref: searchLogs || undefined, sender_role: roleFilter || undefined })}
                className="px-4 py-2 rounded-xl bg-[#0f2535] text-white text-sm font-bold hover:bg-[#1a3a4f] transition-colors"
              >
                بحث
              </button>
            </div>

            {logsLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-7 h-7 border-2 border-[#25D366]/30 border-t-[#25D366] rounded-full animate-spin" />
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-[#7a9aab] font-medium">لا توجد سجلات</p>
              </div>
            ) : (
              <div>
                <div className="px-5 py-2.5 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-[#7a9aab]">{filteredLogs.length} سجل تواصل</span>
                </div>
                {filteredLogs.map(log => (
                  <LogRow key={log.id} log={log} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Stats Tab */}
        {activeTab === 'stats' && (
          <div className="p-6 space-y-6">
            {stats ? (
              <>
                {/* Role breakdown */}
                <div>
                  <h3 className="text-sm font-bold text-[#0f2535] mb-4">التواصل حسب الدور</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 text-center">
                      <p className="text-3xl font-black text-blue-700">{stats.by_role.buyer_initiated}</p>
                      <p className="text-xs font-bold text-blue-600 mt-1">تواصل من مشترين</p>
                    </div>
                    <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 text-center">
                      <p className="text-3xl font-black text-emerald-700">{stats.by_role.supplier_initiated}</p>
                      <p className="text-xs font-bold text-emerald-600 mt-1">تواصل من موردين</p>
                    </div>
                  </div>
                </div>

                {/* Role ratio bar */}
                {stats.total_contacts > 0 && (
                  <div>
                    <div className="flex items-center justify-between text-xs font-bold mb-2">
                      <span className="text-blue-600">مشترين {Math.round((stats.by_role.buyer_initiated / stats.total_contacts) * 100)}%</span>
                      <span className="text-emerald-600">موردين {Math.round((stats.by_role.supplier_initiated / stats.total_contacts) * 100)}%</span>
                    </div>
                    <div className="h-3 rounded-full bg-gray-100 overflow-hidden flex">
                      <div
                        className="bg-blue-500 transition-all"
                        style={{ width: `${(stats.by_role.buyer_initiated / stats.total_contacts) * 100}%` }}
                      />
                      <div
                        className="bg-emerald-500 transition-all"
                        style={{ width: `${(stats.by_role.supplier_initiated / stats.total_contacts) * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Top deals */}
                {stats.top_deals && stats.top_deals.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold text-[#0f2535] mb-3">أكثر الصفقات تواصلاً</h3>
                    <div className="space-y-2">
                      {stats.top_deals.map((deal, i) => (
                        <div key={deal.deal_ref} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                          <div className="w-7 h-7 rounded-lg bg-[#0f2535] text-white text-xs font-black flex items-center justify-center flex-shrink-0">
                            {i + 1}
                          </div>
                          <div className="flex-1">
                            <p className="text-xs font-mono font-bold text-[#0f2535]" dir="ltr">{deal.deal_ref}</p>
                          </div>
                          <div className="flex items-center gap-1.5 bg-[#25D366]/10 px-2.5 py-1 rounded-lg">
                            <MessageCircle className="w-3 h-3 text-[#25D366]" />
                            <span className="text-xs font-bold text-[#1a9e5c]">{deal.contact_count}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Template usage */}
                <div>
                  <h3 className="text-sm font-bold text-[#0f2535] mb-3">استخدام القوالب</h3>
                  <div className="space-y-2">
                    {templates.filter(t => t.usage_count > 0).sort((a, b) => b.usage_count - a.usage_count).map(template => (
                      <div key={template.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                        <div className="flex-1">
                          <p className="text-xs font-bold text-[#1a2f3e]">{template.name}</p>
                        </div>
                        <span className="text-xs font-black text-[#0f2535]">{template.usage_count.toLocaleString('ar-SA')}</span>
                      </div>
                    ))}
                    {templates.filter(t => t.usage_count > 0).length === 0 && (
                      <p className="text-xs text-[#9ab0bf] text-center py-4">لا يوجد استخدام بعد</p>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-[#7a9aab]">لا توجد إحصائيات بعد</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Template Editor Modal */}
      {showEditor && (
        <WhatsAppTemplateEditor
          template={editingTemplate}
          onSave={handleSave}
          onClose={() => { setShowEditor(false); setEditingTemplate(null); }}
        />
      )}
    </div>
  );
}
