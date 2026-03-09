import { useState, useEffect } from 'react';
import {
  Brain, CheckCircle2, XCircle, Loader2, RefreshCw,
  TrendingUp, Clock, Users, Eye, EyeOff, Trash2
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface LearnedResponse {
  id: string;
  trigger_message: string;
  learned_answer: string;
  times_seen: number;
  confidence: number;
  is_approved: boolean;
  source_conversation: string | null;
  created_at: string;
  updated_at: string;
}

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = pct >= 80 ? '#16A34A' : pct >= 60 ? '#D97706' : '#EF4444';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-[10px] font-black" style={{ color }}>{pct}%</span>
    </div>
  );
}

export default function AILearnedPanel() {
  const [items, setItems] = useState<LearnedResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('pending');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = async () => {
    const { data } = await supabase
      .from('ai_learned_responses')
      .select('*')
      .order('times_seen', { ascending: false })
      .order('confidence', { ascending: false });
    setItems((data ?? []) as LearnedResponse[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase.channel('learned-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ai_learned_responses' }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const approve = async (id: string) => {
    setProcessingId(id);
    await supabase.from('ai_learned_responses').update({
      is_approved: true,
      confidence: 0.80,
      updated_at: new Date().toISOString(),
    }).eq('id', id);
    setProcessingId(null);
    load();
  };

  const reject = async (id: string) => {
    setProcessingId(id);
    await supabase.from('ai_learned_responses').delete().eq('id', id);
    setProcessingId(null);
    load();
  };

  const revokeApproval = async (id: string) => {
    setProcessingId(id);
    await supabase.from('ai_learned_responses').update({
      is_approved: false,
      updated_at: new Date().toISOString(),
    }).eq('id', id);
    setProcessingId(null);
    load();
  };

  const filtered = items.filter(item => {
    if (filter === 'pending') return !item.is_approved;
    if (filter === 'approved') return item.is_approved;
    return true;
  });

  const pendingCount = items.filter(i => !i.is_approved).length;
  const approvedCount = items.filter(i => i.is_approved).length;

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0f2535] to-[#1a3d56] flex items-center justify-center">
            <Brain className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="font-black text-[#0f2535] text-sm">ما تعلمه الذكاء الاصطناعي</p>
            <p className="text-[10px] text-[#7a9aab]">من ردود فريق الدعم البشري</p>
          </div>
        </div>
        <button onClick={load} className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
          <RefreshCw className="w-3.5 h-3.5 text-[#7a9aab]" />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white rounded-2xl p-3 border border-gray-100 shadow-sm text-center">
          <p className="text-xl font-black text-[#0369A1]">{items.length}</p>
          <p className="text-[10px] font-bold text-[#1a2f3e] mt-0.5">إجمالي</p>
        </div>
        <div className="bg-white rounded-2xl p-3 border border-gray-100 shadow-sm text-center">
          <p className="text-xl font-black text-[#D97706]">{pendingCount}</p>
          <p className="text-[10px] font-bold text-[#1a2f3e] mt-0.5">تنتظر مراجعة</p>
        </div>
        <div className="bg-white rounded-2xl p-3 border border-gray-100 shadow-sm text-center">
          <p className="text-xl font-black text-green-600">{approvedCount}</p>
          <p className="text-[10px] font-bold text-[#1a2f3e] mt-0.5">مُعتمدة</p>
        </div>
      </div>

      {pendingCount > 0 && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-3.5">
          <Clock className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-amber-800">يوجد {pendingCount} ردود تعلّمها النظام تنتظر موافقتك</p>
            <p className="text-[11px] text-amber-600 mt-0.5">راجعها وأقرّ الصحيحة منها لتُستخدم تلقائياً في الردود</p>
          </div>
        </div>
      )}

      <div className="flex gap-1.5 bg-gray-100 p-1 rounded-xl w-fit">
        {([['all', 'الكل', items.length], ['pending', 'تنتظر مراجعة', pendingCount], ['approved', 'مُعتمدة', approvedCount]] as const).map(([val, label, count]) => (
          <button
            key={val}
            onClick={() => setFilter(val)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === val ? 'bg-white text-[#0f2535] shadow-sm' : 'text-[#7a9aab]'}`}
          >
            {label}
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${filter === val ? 'bg-[#0369A1] text-white' : 'bg-gray-200 text-[#7a9aab]'}`}>
              {count}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32"><Loader2 className="w-5 h-5 animate-spin text-[#7a9aab]" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
          <Brain className="w-10 h-10 text-gray-200 mx-auto mb-2" />
          <p className="text-sm font-bold text-[#7a9aab]">لا توجد بيانات</p>
          <p className="text-[11px] text-[#9ab0bf] mt-1">سيتعلم النظام من ردود فريق الدعم تلقائياً</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(item => (
            <div key={item.id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${item.is_approved ? 'border-green-100' : 'border-gray-100'}`}>
              <div className="p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${item.is_approved ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>
                      {item.is_approved ? 'مُعتمد' : 'قيد المراجعة'}
                    </span>
                    <div className="flex items-center gap-1">
                      <Users className="w-3 h-3 text-[#9ab0bf]" />
                      <span className="text-[10px] text-[#9ab0bf]">رأيته {item.times_seen} مرة</span>
                    </div>
                    <span className="text-[10px] text-[#9ab0bf]">
                      {new Date(item.created_at).toLocaleDateString('ar-SA')}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {!item.is_approved ? (
                      <>
                        <button
                          onClick={() => approve(item.id)}
                          disabled={processingId === item.id}
                          className="flex items-center gap-1 px-2 py-1.5 rounded-xl text-[11px] font-bold text-white bg-green-500 hover:bg-green-600 transition-colors disabled:opacity-50"
                        >
                          {processingId === item.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                          اعتماد
                        </button>
                        <button
                          onClick={() => reject(item.id)}
                          disabled={processingId === item.id}
                          className="flex items-center gap-1 px-2 py-1.5 rounded-xl text-[11px] font-bold text-red-500 bg-red-50 hover:bg-red-100 transition-colors disabled:opacity-50"
                        >
                          {processingId === item.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
                          رفض
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => revokeApproval(item.id)}
                        disabled={processingId === item.id}
                        className="flex items-center gap-1 px-2 py-1.5 rounded-xl text-[11px] font-bold text-[#7a9aab] bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-50"
                      >
                        {processingId === item.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <EyeOff className="w-3 h-3" />}
                        إلغاء
                      </button>
                    )}
                    <button
                      onClick={() => reject(item.id)}
                      disabled={processingId === item.id}
                      className="w-7 h-7 rounded-xl bg-gray-100 hover:bg-red-50 flex items-center justify-center transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="w-3 h-3 text-red-400" />
                    </button>
                  </div>
                </div>

                <div className="mb-2">
                  <p className="text-[10px] font-bold text-[#7a9aab] mb-1">مستوى الثقة</p>
                  <ConfidenceBar value={item.confidence} />
                </div>

                <div className="space-y-2">
                  <div className="bg-gray-50 rounded-xl p-2.5">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Users className="w-3 h-3 text-[#7a9aab]" />
                      <p className="text-[10px] font-bold text-[#7a9aab]">رسالة العميل</p>
                    </div>
                    <p className="text-[12px] text-[#1a2f3e]">{item.trigger_message}</p>
                  </div>
                  <div className="bg-blue-50 rounded-xl p-2.5">
                    <div className="flex items-center gap-1.5 mb-1">
                      <TrendingUp className="w-3 h-3 text-[#0369A1]" />
                      <p className="text-[10px] font-bold text-[#0369A1]">رد الفريق المتعلَّم</p>
                    </div>
                    <p className={`text-[12px] text-[#1a3a4a] leading-relaxed ${expandedId !== item.id ? 'line-clamp-2' : 'whitespace-pre-wrap'}`}>
                      {item.learned_answer}
                    </p>
                    {item.learned_answer.length > 100 && (
                      <button
                        onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                        className="text-[10px] text-[#0369A1] font-bold mt-1 flex items-center gap-1"
                      >
                        {expandedId === item.id ? <><EyeOff className="w-3 h-3" />طي</> : <><Eye className="w-3 h-3" />عرض الكامل</>}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
