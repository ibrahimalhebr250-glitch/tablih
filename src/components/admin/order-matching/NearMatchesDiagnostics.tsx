import { AlertCircle, ArrowLeftRight, Search } from 'lucide-react';
import { useState } from 'react';
import type { NearMatch } from '../../../hooks/useOrderMatching';

interface Props {
  data: NearMatch[];
  loading: boolean;
}

const SCORE_COLORS: Record<string, { bg: string; text: string; bar: string }> = {
  high: { bg: 'bg-emerald-50', text: 'text-emerald-700', bar: 'bg-emerald-500' },
  medium: { bg: 'bg-amber-50', text: 'text-amber-700', bar: 'bg-amber-500' },
  low: { bg: 'bg-red-50', text: 'text-red-700', bar: 'bg-red-500' },
};

function getScoreColor(score: number) {
  if (score >= 75) return SCORE_COLORS.high;
  if (score >= 50) return SCORE_COLORS.medium;
  return SCORE_COLORS.low;
}

function getBlockerIcon(factor: string) {
  switch (factor) {
    case 'نوع الطبلية': return '📦';
    case 'المقاس': return '📏';
    case 'الجودة': return '⭐';
    case 'المدينة': return '📍';
    case 'الكمية': return '🔢';
    default: return '⚠️';
  }
}

export default function NearMatchesDiagnostics({ data, loading }: Props) {
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = data.filter((nm) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      nm.request_id?.toLowerCase().includes(q) ||
      nm.batch_ref?.toLowerCase().includes(q) ||
      nm.order_phone?.includes(q) ||
      nm.batch_phone?.includes(q) ||
      nm.primary_blocker?.toLowerCase().includes(q)
    );
  });

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-slate-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 mx-auto bg-green-50 rounded-2xl flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-green-500" />
        </div>
        <h3 className="text-lg font-bold text-slate-800">لا توجد تطابقات قريبة معلقة</h3>
        <p className="text-sm text-slate-500 mt-2">كل الطلبات والعروض تمت مطابقتها بنجاح أو لا توجد تقاربات</p>
      </div>
    );
  }

  const blockerSummary: Record<string, number> = {};
  data.forEach((nm) => {
    if (nm.primary_blocker) {
      blockerSummary[nm.primary_blocker] = (blockerSummary[nm.primary_blocker] || 0) + 1;
    }
  });

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Object.entries(blockerSummary)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 4)
          .map(([blocker, count]) => (
            <div key={blocker} className="bg-red-50/60 border border-red-100 rounded-xl p-3">
              <p className="text-lg font-black text-red-700">{count}</p>
              <p className="text-[11px] text-red-600/80 mt-0.5 leading-tight">{blocker}</p>
            </div>
          ))}
      </div>

      <div className="relative">
        <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="بحث برقم الطلب، رقم العرض، أو رقم الهاتف..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pr-10 pl-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
        />
      </div>

      <div className="space-y-3">
        {filtered.map((nm) => {
          const key = `${nm.order_id}-${nm.batch_id}`;
          const isExpanded = expandedId === key;
          const scoreColor = getScoreColor(nm.match_score);

          return (
            <div
              key={key}
              className="bg-white border border-slate-200/60 rounded-xl overflow-hidden transition-all hover:shadow-md"
            >
              <button
                onClick={() => setExpandedId(isExpanded ? null : key)}
                className="w-full text-right p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`flex-shrink-0 w-12 h-12 rounded-xl ${scoreColor.bg} flex items-center justify-center`}>
                      <span className={`text-base font-black ${scoreColor.text}`}>{nm.match_score}%</span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-800">{nm.request_id}</span>
                        <ArrowLeftRight className="w-3 h-3 text-slate-400 flex-shrink-0" />
                        <span className="text-xs font-bold text-slate-800">{nm.batch_ref}</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-50 text-[10px] font-bold text-red-600">
                          <AlertCircle className="w-3 h-3" />
                          {nm.primary_blocker}
                        </span>
                      </div>
                    </div>
                  </div>
                  <svg
                    className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {isExpanded && (
                <div className="border-t border-slate-100 p-4 space-y-4 bg-slate-50/50">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-white rounded-lg border border-slate-200/60 p-3">
                      <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-2">الطلب</p>
                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between"><span className="text-slate-500">النوع</span><span className="font-bold text-slate-800">{nm.order_pallet_type}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">المقاس</span><span className="font-bold text-slate-800">{nm.order_size}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">الجودة</span><span className="font-bold text-slate-800">{nm.order_quality}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">المدينة</span><span className="font-bold text-slate-800">{nm.order_city}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">الكمية</span><span className="font-bold text-slate-800">{nm.order_quantity}</span></div>
                      </div>
                    </div>
                    <div className="bg-white rounded-lg border border-slate-200/60 p-3">
                      <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-2">العرض</p>
                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between"><span className="text-slate-500">النوع</span><span className="font-bold text-slate-800">{nm.batch_pallet_type}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">المقاس</span><span className="font-bold text-slate-800">{nm.batch_size}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">الجودة</span><span className="font-bold text-slate-800">{nm.batch_quality}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">المدينة</span><span className="font-bold text-slate-800">{nm.batch_city}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">المتاح</span><span className="font-bold text-slate-800">{nm.batch_available}</span></div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">تفصيل التقييم</p>
                    <div className="space-y-2">
                      {[
                        { label: 'نوع الطبلية', score: nm.score_type, weight: 30 },
                        { label: 'المقاس', score: nm.score_size, weight: 25 },
                        { label: 'الجودة', score: nm.score_quality, weight: 20 },
                        { label: 'المدينة', score: nm.score_city, weight: 15 },
                        { label: 'الكمية', score: nm.score_quantity, weight: 10 },
                      ].map((f) => {
                        const fColor = getScoreColor(f.score);
                        return (
                          <div key={f.label} className="flex items-center gap-2">
                            <span className="text-[11px] text-slate-600 w-24 flex-shrink-0">{f.label} ({f.weight}%)</span>
                            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${fColor.bar} transition-all`} style={{ width: `${f.score}%` }} />
                            </div>
                            <span className={`text-[11px] font-bold w-10 text-left ${fColor.text}`}>{f.score}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {nm.blockers && nm.blockers.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-red-500 uppercase tracking-wider mb-2">موانع التطابق الكامل</p>
                      <div className="space-y-2">
                        {nm.blockers.map((b, i) => (
                          <div key={i} className="flex items-start gap-2 bg-red-50/60 border border-red-100 rounded-lg p-2.5">
                            <span className="text-base flex-shrink-0">{getBlockerIcon(b.factor)}</span>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-red-700">{b.factor}</p>
                              <div className="flex items-center gap-1 mt-0.5 text-[11px]">
                                <span className="text-blue-600">الطلب: {b.order_val}</span>
                                <span className="text-slate-400">|</span>
                                <span className="text-emerald-600">العرض: {b.batch_val}</span>
                                {b.score > 0 && <span className="text-slate-400">| تقييم: {b.score}%</span>}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && search && (
        <div className="text-center py-8">
          <p className="text-sm text-slate-500">لا توجد نتائج مطابقة لـ "{search}"</p>
        </div>
      )}
    </div>
  );
}
