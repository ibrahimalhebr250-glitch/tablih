import { Users, TrendingUp, Calendar, Clock, RefreshCw, Award } from 'lucide-react';
import { useVisitorStats } from '../../../hooks/useVisitorStats';
import type { VisitorDailyPoint } from '../../../hooks/useVisitorStats';

const PLATFORM_LAUNCH_DATE = '1 مايو 2026';

function MiniBarChart({ data }: { data: VisitorDailyPoint[] }) {
  const max = Math.max(...data.map(d => d.count), 1);
  const last = data.slice(-14);

  return (
    <div className="flex items-end gap-[3px] h-16 w-full" dir="ltr">
      {last.map((point, i) => {
        const heightPct = Math.max((point.count / max) * 100, point.count > 0 ? 4 : 0);
        const isToday = i === last.length - 1;
        return (
          <div
            key={point.date}
            className="flex-1 flex flex-col items-center justify-end group relative"
            title={`${point.label}: ${point.count.toLocaleString('ar-SA')} زائر`}
          >
            <div
              className="w-full rounded-t-sm transition-all duration-300"
              style={{
                height: `${heightPct}%`,
                background: isToday
                  ? 'linear-gradient(180deg, #2563eb, #1d4ed8)'
                  : point.count > 0
                    ? 'linear-gradient(180deg, #60a5fa, #3b82f6)'
                    : '#e5e7eb',
                minHeight: point.count > 0 ? '3px' : '2px',
              }}
            />
            <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-[#1a3a4a] text-white text-[9px] font-bold px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
              {point.count.toLocaleString()}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function FullBarChart({ data }: { data: VisitorDailyPoint[] }) {
  const max = Math.max(...data.map(d => d.count), 1);

  const yTicks = [0, Math.round(max * 0.25), Math.round(max * 0.5), Math.round(max * 0.75), max];

  const showEvery = Math.ceil(data.length / 10);

  return (
    <div className="space-y-2" dir="ltr">
      <div className="flex gap-3">
        <div className="flex flex-col justify-between text-[9px] text-[#94a3b8] pb-5 w-8 text-right flex-shrink-0">
          {[...yTicks].reverse().map((v, i) => (
            <span key={i}>{v}</span>
          ))}
        </div>
        <div className="flex-1 flex flex-col gap-1">
          <div className="flex items-end gap-[3px] h-36 w-full">
            {data.map((point, i) => {
              const heightPct = Math.max((point.count / max) * 100, point.count > 0 ? 2 : 0);
              const isToday = i === data.length - 1;
              return (
                <div
                  key={point.date}
                  className="flex-1 flex items-end group relative cursor-default"
                  style={{ height: '100%' }}
                >
                  <div
                    className="w-full rounded-t-sm transition-all duration-500"
                    style={{
                      height: `${heightPct}%`,
                      background: isToday
                        ? 'linear-gradient(180deg, #2563eb, #1d4ed8)'
                        : 'linear-gradient(180deg, #93c5fd, #3b82f6)',
                      minHeight: point.count > 0 ? '2px' : '1px',
                    }}
                  />
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[#1a3a4a] text-white text-[9px] font-bold px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10 shadow-lg">
                    {point.label}: {point.count.toLocaleString()}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-[3px] h-5 w-full">
            {data.map((point, i) => (
              <div key={point.date} className="flex-1 flex items-center justify-center overflow-hidden">
                {i % showEvery === 0 && (
                  <span className="text-[8px] text-[#94a3b8] truncate" style={{ writingMode: 'vertical-rl' }}>
                    {point.label}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const PERIOD_CARDS = [
  { key: 'last24h' as const, label: 'آخر 24 ساعة', hours: 24, color: '#2563eb', bg: '#EFF6FF', border: '#BFDBFE' },
  { key: 'last48h' as const, label: 'آخر 48 ساعة', hours: 48, color: '#0369a1', bg: '#F0F9FF', border: '#BAE6FD' },
  { key: 'last72h' as const, label: 'آخر 72 ساعة', hours: 72, color: '#0f766e', bg: '#F0FDFA', border: '#99F6E4' },
  { key: 'last7d' as const, label: 'آخر 7 أيام', hours: 168, color: '#16a34a', bg: '#F0FDF4', border: '#BBF7D0' },
  { key: 'last14d' as const, label: 'آخر 14 يوم', hours: 336, color: '#ca8a04', bg: '#FEFCE8', border: '#FDE68A' },
  { key: 'last30d' as const, label: 'آخر 30 يوم', hours: 720, color: '#dc2626', bg: '#FFF7ED', border: '#FED7AA' },
];

export default function VisitorStatsPanel() {
  const { stats, dailyChart, loading, refetch } = useVisitorStats();

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
            <Users className="w-4.5 h-4.5 text-blue-600" style={{ width: '18px', height: '18px' }} />
          </div>
          <div>
            <h3 className="text-[15px] font-black text-[#1a2f3e]">إحصائيات الزوار</h3>
            <p className="text-[11px] text-[#7a9aab]">الزوار الفريدون للمنصة</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {stats && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg" style={{ background: '#f0f6fa', border: '1px solid #e2edf5' }}>
              <Clock className="w-3 h-3 text-[#7a9aab]" />
              <span className="text-[10px] text-[#7a9aab]">آخر تحديث: {stats.lastUpdated}</span>
            </div>
          )}
          <button
            onClick={refetch}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-[#e8f2f8]"
            style={{ background: '#f0f6fa', border: '1px solid #e2edf5' }}
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#4a7a94]" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-20 rounded-2xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {PERIOD_CARDS.map(card => (
            <div
              key={card.key}
              className="rounded-2xl px-4 py-3.5 flex flex-col gap-1"
              style={{ background: card.bg, border: `1.5px solid ${card.border}` }}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold" style={{ color: card.color }}>{card.label}</span>
                <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: `${card.color}15` }}>
                  <Users className="w-3 h-3" style={{ color: card.color }} />
                </div>
              </div>
              <div className="text-[22px] font-black" style={{ color: card.color }}>
                {(stats?.[card.key] ?? 0).toLocaleString('ar-SA')}
              </div>
              <div className="text-[10px] text-[#94a3b8]">زائر فريد</div>
            </div>
          ))}
        </div>
      )}

      {!loading && dailyChart.length > 0 && (
        <div className="rounded-2xl p-5 space-y-3" style={{ background: 'white', border: '1.5px solid #e2edf5', boxShadow: '0 2px 8px rgba(26,58,74,0.06)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <span className="text-[13px] font-black text-[#1a2f3e]">الزوار اليوميون — آخر 30 يوم</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold" style={{ background: '#EFF6FF', color: '#2563eb', border: '1px solid #BFDBFE' }}>
              <span className="w-2 h-2 rounded-full bg-blue-600 flex-shrink-0 inline-block" />
              اليوم الحالي
            </div>
          </div>
          <FullBarChart data={dailyChart} />
          <div className="flex items-center justify-between pt-1 border-t border-[#f0f6fa]">
            <div className="flex items-center gap-1 text-[10px] text-[#94a3b8]">
              <span className="w-3 h-3 rounded-sm inline-block" style={{ background: 'linear-gradient(180deg, #93c5fd, #3b82f6)' }} />
              الأيام السابقة
            </div>
            <div className="flex items-center gap-1 text-[10px] text-[#94a3b8]">
              <span className="w-3 h-3 rounded-sm inline-block" style={{ background: 'linear-gradient(180deg, #2563eb, #1d4ed8)' }} />
              اليوم الحالي
            </div>
          </div>
        </div>
      )}

      {!loading && stats && (
        <div className="rounded-2xl overflow-hidden" style={{ border: '1.5px solid #e2edf5', boxShadow: '0 2px 8px rgba(26,58,74,0.06)' }}>
          <div className="px-5 py-4 flex items-center gap-3" style={{ background: 'linear-gradient(135deg, #1a3a4a, #2c5f7c)' }}>
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <Award className="w-4.5 h-4.5 text-white" style={{ width: '18px', height: '18px' }} />
            </div>
            <div>
              <p className="text-[13px] font-black text-white">إجمالي زوار المنصة منذ الإطلاق</p>
              <p className="text-[11px] text-white/60">منذ {PLATFORM_LAUNCH_DATE}</p>
            </div>
          </div>
          <div className="bg-white px-5 py-4">
            <div className="flex items-end gap-2 mb-4">
              <span className="text-[40px] font-black text-[#1a2f3e] leading-none">
                {stats.total.toLocaleString('ar-SA')}
              </span>
              <span className="text-[15px] font-bold text-[#4a7a94] mb-1">زائر</span>
            </div>
            <div className="grid grid-cols-3 gap-3 pt-3 border-t border-[#f0f6fa]">
              <div className="text-center">
                <div className="text-[11px] text-[#94a3b8] mb-1">متوسط يومي</div>
                <div className="text-[18px] font-black text-[#1a3a4a]">{stats.avgDaily.toLocaleString('ar-SA')}</div>
                <div className="text-[10px] text-[#94a3b8]">زائر/يوم</div>
              </div>
              <div className="text-center border-x border-[#f0f6fa]">
                <div className="text-[11px] text-[#94a3b8] mb-1">أعلى يوم</div>
                {stats.peakDay ? (
                  <>
                    <div className="text-[18px] font-black text-[#16a34a]">{stats.peakDay.count.toLocaleString('ar-SA')}</div>
                    <div className="text-[10px] text-[#94a3b8]">{new Date(stats.peakDay.date).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' })}</div>
                  </>
                ) : (
                  <div className="text-[18px] font-black text-[#1a3a4a]">—</div>
                )}
              </div>
              <div className="text-center">
                <div className="text-[11px] text-[#94a3b8] mb-1">آخر تحديث</div>
                <div className="text-[14px] font-black text-[#1a3a4a]">{stats.lastUpdated}</div>
                <div className="text-[10px] text-[#94a3b8]">كل دقيقة</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {!loading && stats && (
        <div className="rounded-2xl p-4" style={{ background: '#f8fbfd', border: '1px solid #e2edf5' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-[#4a7a94]" />
              <span className="text-[11px] font-black text-[#1a3a4a]">آخر 14 يوم — مخطط مضغوط</span>
            </div>
            <span className="text-[10px] text-[#94a3b8]">اللون الداكن = اليوم</span>
          </div>
          <MiniBarChart data={dailyChart} />
        </div>
      )}
    </div>
  );
}
