import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Headphones, Search, MessageCircle, Send, Image as ImageIcon,
  Loader2, RefreshCw, Users, CheckCheck,
  AlertCircle, ChevronLeft, Phone, Lightbulb,
  CheckCircle2, Eye, Circle, MessageSquare
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAdminSupport } from '../../../hooks/useAdminSupport';
import type { AdminSupportConversation, AdminSupportMessage } from '../../../hooks/useAdminSupport';

// ─── Suggestion types ────────────────────────────────────────────────────────
interface Suggestion {
  id: string;
  user_phone: string;
  display_name: string;
  message: string;
  status: 'pending' | 'reviewed' | 'resolved';
  created_at: string;
}

interface SuggestionsStats {
  total: number;
  pending: number;
  reviewed: number;
  resolved: number;
  this_week: number;
  today: number;
}

// ─── Shared helpers ───────────────────────────────────────────────────────────
const USER_TYPE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  supplier: { label: 'مورد', color: '#059669', bg: '#ECFDF5' },
  buyer: { label: 'مشتري', color: '#0369A1', bg: '#EFF6FF' },
  unknown: { label: 'زائر', color: '#6B7280', bg: '#F9FAFB' },
};

function StatCard({ icon: Icon, label, value, color, sub }: {
  icon: typeof Headphones; label: string; value: string | number; color: string; sub?: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${color}18` }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
        <p className="text-xl font-black" style={{ color }}>{value}</p>
      </div>
      <p className="text-xs font-bold text-[#1a2f3e]">{label}</p>
      {sub && <p className="text-[10px] text-[#9ab0bf] mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── Live Chat components ─────────────────────────────────────────────────────
function ConversationItem({ conv, isActive, onClick }: {
  conv: AdminSupportConversation; isActive: boolean; onClick: () => void;
}) {
  const typeInfo = USER_TYPE_LABELS[conv.user_type] ?? USER_TYPE_LABELS['unknown'];
  const timeAgo = (() => {
    const diff = Date.now() - new Date(conv.last_message_at).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'الآن';
    if (mins < 60) return `${mins} د`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} س`;
    return `${Math.floor(hours / 24)} ي`;
  })();

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3.5 border-b border-gray-50 hover:bg-gray-50 transition-colors text-right ${isActive ? 'bg-blue-50/60 border-r-2 border-r-[#0369A1]' : ''}`}
      dir="rtl"
    >
      <div
        className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 text-white font-bold text-sm"
        style={{ background: conv.user_type === 'supplier' ? '#059669' : '#0369A1' }}
      >
        {conv.user_name.charAt(0)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-sm font-bold text-[#0f2535] truncate">{conv.user_name}</span>
          <span className="text-[10px] text-[#9ab0bf] flex-shrink-0 mr-2">{timeAgo}</span>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-[11px] text-[#7a9aab] truncate flex-1">{conv.last_message}</p>
          <div className="flex items-center gap-1.5 mr-2 flex-shrink-0">
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ color: typeInfo.color, background: typeInfo.bg }}>
              {typeInfo.label}
            </span>
            {conv.unread_count > 0 && (
              <span className="w-5 h-5 rounded-full bg-[#0369A1] text-white text-[10px] font-black flex items-center justify-center">
                {conv.unread_count > 9 ? '9+' : conv.unread_count}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

function MessageBubble({ msg }: { msg: AdminSupportMessage }) {
  const isAdmin = msg.sender === 'admin';
  const time = new Date(msg.created_at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className={`flex ${isAdmin ? 'justify-start' : 'justify-end'}`}>
      <div style={{ maxWidth: '78%' }}>
        {isAdmin && (
          <div className="flex items-center gap-1 mb-1">
            <div className="w-4 h-4 rounded-full bg-[#0369A1]/20 flex items-center justify-center">
              <Headphones className="w-2.5 h-2.5 text-[#0369A1]" />
            </div>
            <p className="text-[9px] font-bold text-[#0369A1]">فريق الدعم</p>
          </div>
        )}
        <div
          className="rounded-2xl px-3.5 py-2.5"
          style={{
            background: isAdmin ? 'linear-gradient(135deg, #0369A1, #0284C7)' : 'white',
            border: isAdmin ? 'none' : '1px solid #e2edf5',
            borderRadius: isAdmin ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
          }}
        >
          {msg.image_url && msg.message === 'صورة مرفقة' ? (
            <img src={msg.image_url} alt="مرفق" className="rounded-xl max-w-[200px] max-h-[180px] object-cover" />
          ) : (
            <>
              <p className="text-[12px] leading-relaxed whitespace-pre-wrap" style={{ color: isAdmin ? 'white' : '#1a3a4a' }}>
                {msg.message}
              </p>
              {msg.image_url && (
                <img src={msg.image_url} alt="مرفق" className="rounded-xl mt-2 max-w-[200px] max-h-[180px] object-cover" />
              )}
            </>
          )}
        </div>
        <div className={`flex items-center gap-1 mt-1 ${isAdmin ? 'justify-start' : 'justify-end'}`}>
          <p className="text-[9px] text-[#b0c4d0]">{time}</p>
          {!isAdmin && <CheckCheck className={`w-3 h-3 ${msg.is_read ? 'text-[#0369A1]' : 'text-[#b0c4d0]'}`} />}
        </div>
      </div>
    </div>
  );
}

function ChatPanel({ conv, messages, messagesLoading, sending, onSend, onUploadImage, onBack }: {
  conv: AdminSupportConversation;
  messages: AdminSupportMessage[];
  messagesLoading: boolean;
  sending: boolean;
  onSend: (msg: string, img?: string) => Promise<{ success: boolean; error?: string }>;
  onUploadImage: (file: File) => Promise<string | null>;
  onBack: () => void;
}) {
  const [text, setText] = useState('');
  const [uploading, setUploading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const typeInfo = USER_TYPE_LABELS[conv.user_type] ?? USER_TYPE_LABELS['unknown'];

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleSend = async () => {
    if (!text.trim() || sending) return;
    const val = text;
    setText('');
    await onSend(val);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const url = await onUploadImage(file);
    setUploading(false);
    if (url) await onSend('صورة مرفقة', url);
    if (fileRef.current) fileRef.current.value = '';
  };

  const whatsappLink = `https://wa.me/${conv.user_phone.replace(/^0/, '966').replace('+', '')}`;

  return (
    <div className="flex flex-col h-full" dir="rtl">
      <div className="flex items-center gap-3 px-4 py-3.5 flex-shrink-0 border-b border-gray-100" style={{ background: 'linear-gradient(135deg, #0f2535, #1a3d56)' }}>
        <button onClick={onBack} className="lg:hidden p-2 rounded-xl bg-white/10 text-white">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 text-white font-bold" style={{ background: conv.user_type === 'supplier' ? '#059669' : '#0369A1' }}>
          {conv.user_name.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-white font-bold text-sm truncate">{conv.user_name}</p>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ color: typeInfo.color, background: `${typeInfo.color}25` }}>
              {typeInfo.label}
            </span>
          </div>
          <div className="flex items-center gap-2 text-white/50 text-[10px]">
            <Phone className="w-3 h-3" />
            <span dir="ltr">{conv.user_phone}</span>
            <span>·</span>
            <span>{conv.total_messages} رسالة</span>
          </div>
        </div>
        <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold flex-shrink-0" style={{ background: '#25D366', color: 'white' }}>
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-white">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          واتساب
        </a>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-[#f4f9fc]">
        {messagesLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-5 h-5 animate-spin text-[#7a9aab]" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12">
            <MessageCircle className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-[#7a9aab] font-medium text-sm">لا توجد رسائل بعد</p>
          </div>
        ) : (
          messages.map(msg => <MessageBubble key={msg.id} msg={msg} />)
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex items-end gap-2 px-4 py-3 flex-shrink-0 bg-white border-t border-gray-100" dir="rtl">
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
        <button onClick={() => fileRef.current?.click()} disabled={uploading || sending} className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0 hover:bg-gray-200 transition-colors disabled:opacity-50">
          {uploading ? <Loader2 className="w-4 h-4 animate-spin text-[#7a9aab]" /> : <ImageIcon className="w-4 h-4 text-[#7a9aab]" />}
        </button>
        <textarea
          value={text} onChange={e => setText(e.target.value)} onKeyDown={handleKey}
          placeholder="اكتب ردك على العميل..." rows={1}
          className="flex-1 resize-none rounded-xl border-2 border-gray-200 bg-gray-50 px-3 py-2.5 text-[13px] text-[#1a3a4a] text-right outline-none focus:border-[#0369A1] focus:bg-white transition-colors"
          style={{ maxHeight: 100 }}
        />
        <button onClick={handleSend} disabled={!text.trim() || sending} className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all disabled:opacity-40" style={{ background: text.trim() ? 'linear-gradient(135deg, #0369A1, #0284C7)' : '#E5E7EB' }}>
          {sending ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Send className="w-4 h-4" style={{ color: text.trim() ? 'white' : '#9CA3AF' }} />}
        </button>
      </div>
    </div>
  );
}

// ─── Suggestions Tab ──────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  pending:  { label: 'جديد',     color: '#D97706', bg: '#FEF3C7', icon: Circle },
  reviewed: { label: 'قيد المراجعة', color: '#0369A1', bg: '#EFF6FF', icon: Eye },
  resolved: { label: 'تم الحل',  color: '#059669', bg: '#ECFDF5', icon: CheckCircle2 },
};

function SuggestionCard({ suggestion, onStatusChange, updating }: {
  suggestion: Suggestion;
  onStatusChange: (id: string, status: string) => void;
  updating: boolean;
}) {
  const cfg = STATUS_CONFIG[suggestion.status];
  const StatusIcon = cfg.icon;
  const date = new Date(suggestion.created_at).toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' });

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow" dir="rtl">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0" style={{ background: 'linear-gradient(135deg, #7C3AED, #6D28D9)' }}>
            {suggestion.display_name.charAt(0)}
          </div>
          <div>
            <p className="text-sm font-bold text-[#0f2535]">{suggestion.display_name}</p>
            <p className="text-[10px] text-[#9ab0bf]" dir="ltr">{suggestion.user_phone} · {date}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl flex-shrink-0" style={{ background: cfg.bg }}>
          <StatusIcon className="w-3.5 h-3.5" style={{ color: cfg.color }} />
          <span className="text-[11px] font-bold" style={{ color: cfg.color }}>{cfg.label}</span>
        </div>
      </div>

      <p className="text-[12px] text-[#3a5568] leading-relaxed bg-gray-50 rounded-xl px-3.5 py-3 border border-gray-100 mb-3">
        {suggestion.message}
      </p>

      <div className="flex items-center gap-2">
        {(['pending', 'reviewed', 'resolved'] as const).filter(s => s !== suggestion.status).map(s => {
          const c = STATUS_CONFIG[s];
          const SIcon = c.icon;
          return (
            <button
              key={s}
              onClick={() => onStatusChange(suggestion.id, s)}
              disabled={updating}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-bold transition-all hover:opacity-80 disabled:opacity-40"
              style={{ borderColor: c.color, color: c.color, background: c.bg }}
            >
              {updating ? <Loader2 className="w-3 h-3 animate-spin" /> : <SIcon className="w-3 h-3" />}
              {c.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SuggestionsPanel({ adminEmail }: { adminEmail: string }) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [stats, setStats] = useState<SuggestionsStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'reviewed' | 'resolved'>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchSuggestions = useCallback(async (s?: string, f?: string) => {
    try {
      const { data } = await supabase.rpc('admin_get_suggestions', {
        p_admin_email: adminEmail,
        p_status: f ?? statusFilter,
        p_search: s ?? null,
        p_limit: 100,
        p_offset: 0,
      });
      setSuggestions((data || []) as Suggestion[]);
    } catch { /* noop */ }
  }, [adminEmail, statusFilter]);

  const fetchStats = useCallback(async () => {
    try {
      const { data } = await supabase.rpc('admin_get_suggestions_stats', { p_admin_email: adminEmail });
      setStats(data as SuggestionsStats);
    } catch { /* noop */ }
  }, [adminEmail]);

  useEffect(() => {
    Promise.all([fetchSuggestions(), fetchStats()]).finally(() => setLoading(false));
  }, [fetchSuggestions, fetchStats]);

  const handleStatusChange = async (id: string, status: string) => {
    setUpdatingId(id);
    try {
      await supabase.rpc('admin_update_suggestion_status', {
        p_admin_email: adminEmail,
        p_suggestion_id: id,
        p_status: status,
      });
      setSuggestions(prev => prev.map(s => s.id === id ? { ...s, status: status as Suggestion['status'] } : s));
      await fetchStats();
    } catch { /* noop */ }
    setUpdatingId(null);
  };

  const handleSearch = (val: string) => {
    setSearch(val);
    fetchSuggestions(val, statusFilter);
  };

  const handleFilter = (val: typeof statusFilter) => {
    setStatusFilter(val);
    fetchSuggestions(search, val);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-6 h-6 animate-spin text-[#7a9aab]" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-5" dir="rtl">
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard icon={Lightbulb} label="إجمالي الاقتراحات" value={stats.total} color="#7C3AED" />
          <StatCard icon={Circle} label="جديدة" value={stats.pending} color="#D97706" sub={stats.pending > 0 ? 'تحتاج مراجعة' : ''} />
          <StatCard icon={Eye} label="قيد المراجعة" value={stats.reviewed} color="#0369A1" />
          <StatCard icon={CheckCircle2} label="تم الحل" value={stats.resolved} color="#059669" />
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9ab0bf]" />
          <input
            value={search} onChange={e => handleSearch(e.target.value)}
            placeholder="بحث في الاقتراحات..."
            className="w-full bg-white border border-gray-200 rounded-xl pr-10 pl-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20 focus:border-[#7C3AED]"
          />
        </div>
        <div className="flex gap-1.5">
          {(['all', 'pending', 'reviewed', 'resolved'] as const).map(f => (
            <button
              key={f}
              onClick={() => handleFilter(f)}
              className={`px-3 py-2 rounded-xl text-[11px] font-bold transition-all flex-shrink-0 ${
                statusFilter === f ? 'text-white shadow-sm' : 'bg-white border border-gray-200 text-[#7a9aab] hover:bg-gray-50'
              }`}
              style={statusFilter === f ? {
                background: f === 'all' ? '#374151' : f === 'pending' ? '#D97706' : f === 'reviewed' ? '#0369A1' : '#059669'
              } : {}}
            >
              {f === 'all' ? 'الكل' : STATUS_CONFIG[f].label}
            </button>
          ))}
          <button onClick={() => { fetchSuggestions(); fetchStats(); }} className="p-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50">
            <RefreshCw className="w-4 h-4 text-[#7a9aab]" />
          </button>
        </div>
      </div>

      {suggestions.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <Lightbulb className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-bold text-[#7a9aab]">لا توجد اقتراحات</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {suggestions.map(s => (
            <SuggestionCard
              key={s.id}
              suggestion={s}
              onStatusChange={handleStatusChange}
              updating={updatingId === s.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main SupportSection ──────────────────────────────────────────────────────
interface Props {
  adminEmail: string;
}

export default function SupportSection({ adminEmail }: Props) {
  const [activeTab, setActiveTab] = useState<'chat' | 'suggestions'>('chat');

  const {
    conversations, messages, stats,
    activePhone, loading, messagesLoading, sending,
    search, filter, totalUnread,
    selectConversation, sendMessage, uploadImage,
    applySearch, applyFilter, fetchConversations, fetchStats,
  } = useAdminSupport(adminEmail);

  const [showChat, setShowChat] = useState(false);

  const activeConv = conversations.find(c => c.user_phone === activePhone) ?? null;

  const handleSelect = async (phone: string) => {
    await selectConversation(phone);
    setShowChat(true);
  };

  if (loading && activeTab === 'chat') {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-[#0369A1]/20 border-t-[#0369A1] rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-[#7a9aab]">تحميل مركز الدعم...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" dir="rtl">
      {/* Header */}
      <div className="flex-shrink-0 px-4 lg:px-6 pt-4 lg:pt-5 pb-0 bg-white border-b border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-md" style={{ background: 'linear-gradient(135deg, #0f2535, #1a3d56)' }}>
              <Headphones className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg lg:text-xl font-black text-[#0f2535]">مركز دعم العملاء</h1>
              <p className="text-xs text-[#7a9aab]">إدارة المحادثات والاقتراحات الواردة من المنصة</p>
            </div>
          </div>
          {totalUnread > 0 && activeTab === 'chat' && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 border border-red-100">
              <AlertCircle className="w-3.5 h-3.5 text-red-500" />
              <span className="text-xs font-black text-red-600">{totalUnread} غير مقروء</span>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-sm font-bold border-b-2 transition-all ${
              activeTab === 'chat'
                ? 'text-[#0369A1] border-[#0369A1] bg-blue-50/50'
                : 'text-[#7a9aab] border-transparent hover:text-[#0f2535]'
            }`}
          >
            <MessageCircle className="w-4 h-4" />
            الدردشة المباشرة
            {totalUnread > 0 && (
              <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center">
                {totalUnread > 9 ? '9+' : totalUnread}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('suggestions')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-sm font-bold border-b-2 transition-all ${
              activeTab === 'suggestions'
                ? 'text-[#7C3AED] border-[#7C3AED] bg-[#F5F3FF]/50'
                : 'text-[#7a9aab] border-transparent hover:text-[#0f2535]'
            }`}
          >
            <Lightbulb className="w-4 h-4" />
            الاقتراحات والتحسينات
          </button>
        </div>
      </div>

      {/* Content */}
      {activeTab === 'suggestions' ? (
        <div className="flex-1 overflow-y-auto bg-gray-50">
          <SuggestionsPanel adminEmail={adminEmail} />
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden">
          {/* Stats bar */}
          {stats && (
            <div className="hidden lg:flex absolute top-0 right-0" />
          )}

          {/* Conversations list */}
          <div className={`flex flex-col border-l border-gray-100 bg-white ${showChat && activeConv ? 'hidden lg:flex lg:w-72 xl:w-80' : 'flex w-full lg:w-72 xl:w-80'}`}>
            <div className="p-3 border-b border-gray-100 space-y-2 flex-shrink-0">
              {stats && (
                <div className="grid grid-cols-2 gap-1.5 mb-2">
                  <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
                    <Users className="w-3.5 h-3.5 text-[#0369A1]" />
                    <div>
                      <p className="text-xs font-black text-[#0369A1]">{stats.total_conversations}</p>
                      <p className="text-[9px] text-[#9ab0bf]">محادثة</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
                    <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                    <div>
                      <p className="text-xs font-black text-red-500">{stats.unread_messages}</p>
                      <p className="text-[9px] text-[#9ab0bf]">غير مقروء</p>
                    </div>
                  </div>
                </div>
              )}
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9ab0bf]" />
                <input
                  value={search} onChange={e => applySearch(e.target.value)}
                  placeholder="بحث باسم أو هاتف..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl pr-9 pl-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#0369A1] focus:bg-white"
                />
              </div>
              <div className="flex gap-1.5">
                {(['all', 'unread', 'unanswered'] as const).map(f => (
                  <button key={f} onClick={() => applyFilter(f)} className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-all ${filter === f ? 'bg-[#0369A1] text-white' : 'bg-gray-100 text-[#7a9aab] hover:bg-gray-200'}`}>
                    {f === 'all' ? 'الكل' : f === 'unread' ? 'غير مقروء' : 'بدون رد'}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {conversations.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <MessageSquare className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-sm text-[#7a9aab] font-medium">لا توجد محادثات</p>
                </div>
              ) : (
                conversations.map(conv => (
                  <ConversationItem key={conv.user_phone} conv={conv} isActive={conv.user_phone === activePhone} onClick={() => handleSelect(conv.user_phone)} />
                ))
              )}
            </div>
          </div>

          {/* Chat area */}
          <div className={`flex-1 overflow-hidden ${!showChat || !activeConv ? 'hidden lg:flex lg:items-center lg:justify-center' : 'flex flex-col'}`}>
            {!activeConv ? (
              <div className="text-center px-6">
                <div className="w-20 h-20 rounded-3xl mx-auto mb-4 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #EFF6FF, #DBEAFE)' }}>
                  <Headphones className="w-9 h-9 text-[#0369A1]" />
                </div>
                <p className="text-lg font-black text-[#0f2535] mb-2">الدردشة المباشرة</p>
                <p className="text-sm text-[#7a9aab] leading-relaxed max-w-[280px]">
                  اختر محادثة من القائمة للرد على استفسارات العملاء مباشرة
                </p>
                {totalUnread > 0 && (
                  <div className="mt-4 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 rounded-xl border border-red-100 mx-auto max-w-fit">
                    <AlertCircle className="w-4 h-4 text-red-500" />
                    <span className="text-sm font-bold text-red-600">{totalUnread} رسالة تنتظر الرد</span>
                  </div>
                )}
              </div>
            ) : (
              <ChatPanel
                conv={activeConv} messages={messages} messagesLoading={messagesLoading}
                sending={sending} onSend={sendMessage} onUploadImage={uploadImage}
                onBack={() => setShowChat(false)}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
