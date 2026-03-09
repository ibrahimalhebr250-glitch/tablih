import { useState } from 'react';
import { Handshake, Search, Filter, ChevronDown, ChevronUp, Zap, CheckCircle, AlertCircle } from 'lucide-react';
import type { MatchCandidate } from '../../../hooks/useOrderMatching';

interface Props {
  candidates: MatchCandidate[];
  loading: boolean;
  onCreateDeal: (candidateId: string) => Promise<{ success: boolean; deal_ref?: string; error?: string }>;
  onRefresh: () => void;
}

function ScoreBar({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-slate-500 w-14 text-left">{label}</span>
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${value}%`, background: color }} />
      </div>
      <span className="text-[10px] font-bold text-slate-700 w-8 text-right">{value}%</span>
    </div>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 90 ? '#16a34a' : score >= 70 ? '#2563eb' : score >= 50 ? '#d97706' : '#dc2626';
  const bg = score >= 90 ? '#f0fdf4' : score >= 70 ? '#eff6ff' : score >= 50 ? '#fffbeb' : '#fef2f2';
  const border = score >= 90 ? '#bbf7d0' : score >= 70 ? '#bfdbfe' : score >= 50 ? '#fde68a' : '#fecaca';
  return (
    <div
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-black text-sm"
      style={{ color, background: bg, border: `1px solid ${border}` }}
    >
      {score >= 90 && <Zap className="w-3.5 h-3.5" />}
      {score}%
    </div>
  );
}

export default function MatchingBoard({ candidates, loading, onCreateDeal, onRefresh }: Props) {
  const [search, setSearch] = useState('');
  const [minScore, setMinScore] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [creatingId, setCreatingId] = useState<string | null>(null);
  const [resultMsg, setResultMsg] = useState<{ id: string; msg: string; ok: boolean } | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const filtered = candidates.filter((c) => {
    if (c.match_score < minScore) return false;
    if (search) {
      const s = search.toLowerCase();
      return (
        c.order_request_id?.toLowerCase().includes(s) ||
        c.batch_ref?.toLowerCase().includes(s) ||
        c.order_city?.toLowerCase().includes(s) ||
        c.batch_city?.toLowerCase().includes(s) ||
        c.order_pallet_type?.toLowerCase().includes(s)
      );
    }
    return true;
  });

  const handleCreateDeal = async (candidateId: string) => {
    setCreatingId(candidateId);
    setResultMsg(null);
    const result = await onCreateDeal(candidateId);
    if (result.success) {
      setResultMsg({ id: candidateId, msg: `تم إنشاء صفقة ${result.deal_ref}`, ok: true });
      onRefresh();
    } else {
      setResultMsg({ id: candidateId, msg: result.error || 'فشل الإنشاء', ok: false });
    }
    setCreatingId(null);
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200/60 p-4 animate-pulse">
            <div className="flex gap-4">
              <div className="w-16 h-10 bg-slate-100 rounded-lg" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-slate-100 rounded w-1/3" />
                <div className="h-3 bg-slate-50 rounded w-1/2" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث برقم الطلب، المخزون، المدينة..."
            className="w-full pr-10 pl-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <Filter className="w-4 h-4" />
          فلترة
          {showFilters ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {showFilters && (
        <div className="bg-white rounded-xl border border-slate-200/60 p-4">
          <label className="text-xs font-bold text-slate-600 mb-2 block">الحد الأدنى لدرجة التطابق</label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={minScore}
              onChange={(e) => setMinScore(Number(e.target.value))}
              className="flex-1 accent-blue-600"
            />
            <span className="text-sm font-bold text-slate-700 w-12 text-center">{minScore}%</span>
          </div>
          <div className="flex gap-2 mt-3">
            {[0, 50, 70, 90].map((v) => (
              <button
                key={v}
                onClick={() => setMinScore(v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  minScore === v ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {v === 0 ? 'الكل' : `${v}%+`}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">
          {filtered.length} مطابقة محتملة
        </p>
        <div className="flex gap-2 text-[10px]">
          <span className="flex items-center gap-1 text-green-600"><span className="w-2 h-2 rounded-full bg-green-500" /> 90%+ تلقائي</span>
          <span className="flex items-center gap-1 text-blue-600"><span className="w-2 h-2 rounded-full bg-blue-500" /> 70%+ جيد</span>
          <span className="flex items-center gap-1 text-amber-600"><span className="w-2 h-2 rounded-full bg-amber-500" /> 50%+ ممكن</span>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200/60 p-8 text-center">
          <div className="w-14 h-14 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
            <Handshake className="w-7 h-7 text-slate-300" />
          </div>
          <p className="text-sm font-bold text-slate-500">لا توجد مطابقات حالياً</p>
          <p className="text-xs text-slate-400 mt-1">ستظهر المطابقات عند إضافة طلبات أو مخزون جديد</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => {
            const isExpanded = expandedId === c.id;
            return (
              <div
                key={c.id}
                className="bg-white rounded-xl border border-slate-200/60 overflow-hidden hover:shadow-md transition-shadow"
              >
                <button
                  onClick={() => setExpandedId(isExpanded ? null : c.id)}
                  className="w-full p-4 text-right"
                >
                  <div className="flex items-center gap-4">
                    <ScoreBadge score={c.match_score} />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md" dir="ltr">
                          {c.order_request_id}
                        </span>
                        <span className="text-[10px] text-slate-400">x</span>
                        <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md" dir="ltr">
                          {c.batch_ref}
                        </span>
                        {c.auto_matched && (
                          <span className="text-[10px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                            <Zap className="w-2.5 h-2.5" /> تلقائي
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-1.5 text-[11px] text-slate-500">
                        <span>{c.order_pallet_type} - {c.order_size}</span>
                        <span>{c.order_city}</span>
                        <span>{c.order_quantity} طبلية</span>
                      </div>
                    </div>

                    <div className="flex-shrink-0">
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </div>
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-slate-100 p-4 bg-slate-50/50">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-2">الطلب</p>
                        <p className="text-xs text-slate-600"><span className="text-slate-400">النوع:</span> {c.order_pallet_type}</p>
                        <p className="text-xs text-slate-600"><span className="text-slate-400">المقاس:</span> {c.order_size}</p>
                        <p className="text-xs text-slate-600"><span className="text-slate-400">الجودة:</span> {c.order_quality}</p>
                        <p className="text-xs text-slate-600"><span className="text-slate-400">المدينة:</span> {c.order_city}</p>
                        <p className="text-xs text-slate-600"><span className="text-slate-400">الكمية:</span> {c.order_quantity?.toLocaleString('ar-SA')}</p>
                      </div>

                      <div className="space-y-1.5">
                        <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-2">العرض</p>
                        <p className="text-xs text-slate-600"><span className="text-slate-400">النوع:</span> {c.batch_pallet_type}</p>
                        <p className="text-xs text-slate-600"><span className="text-slate-400">المقاس:</span> {c.batch_size}</p>
                        <p className="text-xs text-slate-600"><span className="text-slate-400">الجودة:</span> {c.batch_quality}</p>
                        <p className="text-xs text-slate-600"><span className="text-slate-400">المدينة:</span> {c.batch_city}</p>
                        <p className="text-xs text-slate-600"><span className="text-slate-400">المتاح:</span> {c.batch_available?.toLocaleString('ar-SA')}</p>
                      </div>

                      <div className="space-y-2">
                        <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-2">تحليل التطابق</p>
                        <ScoreBar value={c.score_type} label="النوع" color="#2563eb" />
                        <ScoreBar value={c.score_size} label="المقاس" color="#0891b2" />
                        <ScoreBar value={c.score_quality} label="الجودة" color="#7c3aed" />
                        <ScoreBar value={c.score_city} label="المدينة" color="#16a34a" />
                        <ScoreBar value={c.score_quantity} label="الكمية" color="#d97706" />
                      </div>
                    </div>

                    {resultMsg?.id === c.id && (
                      <div className={`mt-3 flex items-center gap-2 text-xs font-bold px-3 py-2 rounded-lg ${
                        resultMsg.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                      }`}>
                        {resultMsg.ok ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                        {resultMsg.msg}
                      </div>
                    )}

                    {c.status === 'active' && !c.deal_id && (
                      <div className="mt-4 flex justify-end">
                        <button
                          onClick={() => handleCreateDeal(c.id)}
                          disabled={creatingId === c.id}
                          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-l from-blue-600 to-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/25 hover:shadow-lg hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-50 active:scale-95"
                        >
                          <Handshake className="w-4 h-4" />
                          {creatingId === c.id ? 'جارٍ الإنشاء...' : 'إنشاء صفقة يدوياً'}
                        </button>
                      </div>
                    )}

                    {c.deal_id && (
                      <div className="mt-3 flex items-center gap-2 text-xs font-bold text-green-600 bg-green-50 px-3 py-2 rounded-lg">
                        <CheckCircle className="w-4 h-4" />
                        تم إنشاء صفقة لهذه المطابقة
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
