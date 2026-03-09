import { useState } from 'react';
import {
  MessageCircle, Plus, Pencil, Trash2, RefreshCw,
  CheckCircle, XCircle, Eye, ChevronDown, TrendingUp,
  FileText, Clock, Phone, User, BellOff, Users, BarChart3,
  Search, Filter, AlertTriangle,
} from 'lucide-react';
import { useWhatsAppTemplates } from '../../../hooks/useWhatsAppTemplates';
import type { WhatsAppTemplate, WhatsAppContactLog } from '../../../hooks/useWhatsAppTemplates';
import WhatsAppTemplateEditor from './WhatsAppTemplateEditor';
import SilentDealsPanel from './SilentDealsPanel';
import OutreachListPanel from './OutreachListPanel';
import WhatsAppAnalytics from './WhatsAppAnalytics';

type TabId = 'templates' | 'silent' | 'outreach' | 'logs' | 'analytics';

interface Props {
  adminEmail: string;
}

function StatCard({ label, value, sub, color, alert }: { label: string; value: string | number; sub?: string; color: string; alert?: boolean }) {
  return (
    <div
      className="bg-white rounded-2xl p-5 border shadow-sm"
      style={{ borderColor: alert ? '#FECACA' : '#F3F4F6' }}
    >
      <p className="text-2xl font-black" style={{ color }}>{value}</p>
      <p className="text-xs text-[#7a9aab] font-medium mt-0.5">{label}</p>
      {sub && <p className="text-[10px] text-[#9ab0bf] mt-0.5">{sub}</p>}
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

  const rate = template.deal_completion_rate;
  const rateColor = rate !== null ? (rate >= 80 ? '#16A34A' : rate >= 60 ? '#D97706' : '#DC2626') : null;

  return (
    <div
      className="bg-white rounded-2xl border overflow-hidden shadow-sm"
      style={{ borderColor: template.is_active ? '#e2f5ea' : '#f3f4f6' }}
      dir="rtl"
    >
      <div
        className="flex items-center justify-between px-5 py-3.5 border-b"
        style={{ borderColor: template.is_active ? '#e2f5ea' : '#f3f4f6', background: template.is_active ? '#f0faf4' : '#fafafa' }}
      >
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
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ color: roleColor, background: roleBg }}>{roleLabel}</span>
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
        {template.description && <p className="text-xs text-[#7a9aab] mb-3">{template.description}</p>}

        {/* Performance indicators */}
        {(rate !== null || template.avg_deal_completion_hours !== null) && (
          <div className="flex items-center gap-3 mb-3 p-2.5 rounded-xl bg-gray-50">
            {rate !== null && rateColor && (
              <div className="flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5" style={{ color: rateColor }} />
                <span className="text-xs font-bold" style={{ color: rateColor }}>{rate}% إتمام</span>
              </div>
            )}
            {template.avg_deal_completion_hours !== null && (
              <div className="flex items-center gap-1.5 text-[#7a9aab]">
                <Clock className="w-3.5 h-3.5" />
                <span className="text-xs">{template.avg_deal_completion_hours} ساعة وسطي</span>
              </div>
            )}
          </div>
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
          <div className="bg-[#f0faf4] border border-[#c6e8d4] rounded-xl p-3 mb-3 text-xs whitespace-pre-wrap font-mono text-[#1a3a2a] max-h-32 overflow-y-auto" dir="rtl">
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
              <Pencil className="w-3 h-3" />تعديل
            </button>
            {!template.is_default && (
              <button
                onClick={() => onDelete(template.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 text-red-600 text-xs font-bold hover:bg-red-100 transition-colors border border-red-100"
              >
                <Trash2 className="w-3 h-3" />حذف
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
    <div className={`flex items-center gap-4 px-5 py-3.5 border-b border-gray-50 hover:bg-gray-50 transition-colors ${log.is_duplicate ? 'bg-amber-50/50' : ''}`} dir="rtl">
      <div className="w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center" style={{ background: log.is_duplicate ? '#FEF9C3' : '#25D366'/*, opacity: 0.12 */}}>
        <MessageCircle className="w-4 h-4" style={{ color: log.is_duplicate ? '#D97706' : '#25D366' }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ color: roleColor, background: roleBg }}>
            {log.sender_role === 'buyer' ? 'مشتري' : 'مورد'}
          </span>
          {log.deal_ref && <span className="text-[11px] font-mono text-[#7a9aab]" dir="ltr">{log.deal_ref}</span>}
          {log.deal_status_at_contact && (
            <span className="text-[10px] text-[#9ab0bf] bg-gray-100 px-1.5 py-0.5 rounded">{log.deal_status_at_contact}</span>
          )}
          {log.is_duplicate && (
            <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded flex items-center gap-0.5">
              <AlertTriangle className="w-2.5 h-2.5" />مكرر
            </span>
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
          {log.template_name && (
            <>
              <span>·</span>
              <div className="flex items-center gap-1">
                <FileText className="w-3 h-3" />
                <span>{log.template_name}</span>
              </div>
            </>
          )}
        </div>
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

  const {
    templates, logs, stats, silentDeals, reengagementCandidates,
    loading, logsLoading, silentLoading, outreachLoading,
    saveTemplate, deleteTemplate, fetchLogs, fetchTemplates,
    fetchStats, fetchSilentDeals, fetchReengagementCandidates,
    markUserContacted, refreshTemplateStats,
    getNudgeTemplate, getReengagementTemplate,
  } = useWhatsAppTemplates(adminEmail);

  const filteredLogs = logs.filter(log => {
    const matchRole = !roleFilter || log.sender_role === roleFilter;
    const matchSearch = !searchLogs ||
      log.sender_phone.includes(searchLogs) ||
      log.recipient_phone.includes(searchLogs) ||
      (log.deal_ref && log.deal_ref.toLowerCase().includes(searchLogs.toLowerCase()));
    return matchRole && matchSearch;
  });

  const handleRefresh = () => {
    if (activeTab === 'logs') fetchLogs({ deal_ref: searchLogs || undefined, sender_role: roleFilter || undefined });
    else if (activeTab === 'analytics') fetchStats();
    else if (activeTab === 'silent') fetchSilentDeals();
    else if (activeTab === 'outreach') fetchReengagementCandidates();
    else fetchTemplates();
  };

  const tabs: { id: TabId; label: string; icon: typeof MessageCircle; badge?: number }[] = [
    { id: 'templates', label: 'القوالب', icon: FileText },
    { id: 'silent', label: 'الصفقات الصامتة', icon: BellOff, badge: silentDeals.length > 0 ? silentDeals.length : undefined },
    { id: 'outreach', label: 'قائمة المتابعة', icon: Users },
    { id: 'logs', label: 'سجل التواصل', icon: Clock },
    { id: 'analytics', label: 'تحليلات', icon: BarChart3 },
  ];

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-[#25D366]/20 border-t-[#25D366] rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-[#7a9aab]">جاري تحميل نظام واتساب...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto space-y-5" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-md" style={{ background: '#25D366' }}>
            <MessageCircle className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl lg:text-2xl font-black text-[#0f2535]">إدارة واتساب</h1>
            <p className="text-sm text-[#7a9aab]">قوالب ذكية · تتبع التواصل · تحليلات متقدمة</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleRefresh} className="p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors">
            <RefreshCw className="w-4 h-4 text-[#7a9aab]" />
          </button>
          {activeTab === 'templates' && (
            <button
              onClick={() => { setEditingTemplate(null); setShowEditor(true); }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0f2535] text-white font-bold text-sm hover:bg-[#1a3a4f] transition-colors"
            >
              <Plus className="w-4 h-4" />قالب جديد
            </button>
          )}
        </div>
      </div>

      {/* Quick KPIs */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <StatCard label="إجمالي التواصل" value={stats.total_contacts} color="#25D366" />
          <StatCard label="اليوم" value={stats.contacts_today} color="#0369A1" />
          <StatCard label="هذا الأسبوع" value={stats.contacts_this_week} color="#059669" />
          <StatCard
            label="صفقات صامتة"
            value={stats.silent_deals_count}
            color={stats.silent_deals_count > 0 ? '#DC2626' : '#9CA3AF'}
            alert={stats.silent_deals_count > 0}
            sub={stats.silent_deals_count > 0 ? 'تحتاج متابعة' : 'لا شيء'}
          />
          <StatCard
            label="تواصل مكرر"
            value={stats.duplicate_contacts}
            color={stats.duplicate_contacts > 0 ? '#D97706' : '#9CA3AF'}
            sub={stats.duplicate_contacts > 0 ? 'مشتبه به' : 'لا يوجد'}
          />
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex border-b border-gray-100 overflow-x-auto">
          {tabs.map(({ id, label, icon: Icon, badge }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex-shrink-0 flex items-center justify-center gap-1.5 py-3.5 px-4 text-sm font-bold transition-all border-b-2 relative ${
                activeTab === id
                  ? 'border-[#25D366] text-[#25D366] bg-[#25D366]/5'
                  : 'border-transparent text-[#7a9aab] hover:text-[#0f2535] hover:bg-gray-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{label}</span>
              {badge !== undefined && badge > 0 && (
                <span className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center">
                  {badge > 9 ? '9+' : badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Templates Tab */}
        {activeTab === 'templates' && (
          <div className="p-6">
            {templates.length === 0 ? (
              <div className="text-center py-12">
                <MessageCircle className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                <p className="text-[#7a9aab] font-medium">لا توجد قوالب</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {templates.map(template => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    onEdit={t => { setEditingTemplate(t); setShowEditor(true); }}
                    onDelete={async id => {
                      if (!confirm('هل تريد حذف هذا القالب؟')) return;
                      await deleteTemplate(id);
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Silent Deals Tab */}
        {activeTab === 'silent' && (
          <div className="p-6">
            <SilentDealsPanel
              deals={silentDeals}
              loading={silentLoading}
              nudgeTemplate={getNudgeTemplate()}
              onRefresh={fetchSilentDeals}
            />
          </div>
        )}

        {/* Outreach Tab */}
        {activeTab === 'outreach' && (
          <div className="p-6">
            <OutreachListPanel
              candidates={reengagementCandidates}
              loading={outreachLoading}
              reengagementTemplate={getReengagementTemplate()}
              onFetch={fetchReengagementCandidates}
              onMarkContacted={markUserContacted}
            />
          </div>
        )}

        {/* Logs Tab */}
        {activeTab === 'logs' && (
          <div>
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
                <Clock className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                <p className="text-[#7a9aab] font-medium">لا توجد سجلات</p>
              </div>
            ) : (
              <div>
                <div className="px-5 py-2.5 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-[#7a9aab]">{filteredLogs.length} سجل تواصل</span>
                  {filteredLogs.filter(l => l.is_duplicate).length > 0 && (
                    <span className="text-xs font-bold text-amber-600 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      {filteredLogs.filter(l => l.is_duplicate).length} مكرر
                    </span>
                  )}
                </div>
                {filteredLogs.map(log => <LogRow key={log.id} log={log} />)}
              </div>
            )}
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <WhatsAppAnalytics
            stats={stats}
            templates={templates}
            onRefreshTemplateStats={refreshTemplateStats}
          />
        )}
      </div>

      {/* Template Editor Modal */}
      {showEditor && (
        <WhatsAppTemplateEditor
          template={editingTemplate}
          onSave={async data => { await saveTemplate(data); }}
          onClose={() => { setShowEditor(false); setEditingTemplate(null); }}
        />
      )}
    </div>
  );
}
