import { BarChart3, Clock, TrendingUp, AlertTriangle } from 'lucide-react';
import type { WhatsAppStats, WhatsAppTemplate } from '../../../hooks/useWhatsAppTemplates';

const DAY_NAMES = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

const STAGE_LABELS: Record<string, string> = {
  inventory_reserved: 'محجوزة',
  execution_in_progress: 'جاري التنفيذ',
  in_delivery: 'في التسليم',
  completed: 'مكتملة',
  cancelled: 'ملغاة',
  unknown: 'غير محدد',
};

const STAGE_COLORS: Record<string, string> = {
  inventory_reserved: '#F59E0B',
  execution_in_progress: '#0369A1',
  in_delivery: '#059669',
  completed: '#16A34A',
  cancelled: '#DC2626',
  unknown: '#9CA3AF',
};

interface Props {
  stats: WhatsAppStats | null;
  templates: WhatsAppTemplate[];
  onRefreshTemplateStats: () => Promise<void>;
}

function HourlyHeatmap({ data }: { data: { hour: number; count: number }[] }) {
  if (!data || data.length === 0) return (
    <div className="flex items-center justify-center h-24 text-[#9ab0bf] text-xs">لا بيانات كافية بعد</div>
  );

  const maxCount = Math.max(...data.map(d => d.count), 1);
  const hours = Array.from({ length: 24 }, (_, i) => {
    const found = data.find(d => d.hour === i);
    return { hour: i, count: found?.count ?? 0 };
  });

  const getBarColor = (count: number) => {
    const ratio = count / maxCount;
    if (ratio === 0) return '#F3F4F6';
    if (ratio < 0.25) return '#BBF7D0';
    if (ratio < 0.5) return '#4ADE80';
    if (ratio < 0.75) return '#22C55E';
    return '#16A34A';
  };

  const getHourLabel = (h: number) => {
    if (h === 0) return '12ص';
    if (h === 12) return '12م';
    if (h < 12) return `${h}ص`;
    return `${h - 12}م`;
  };

  return (
    <div>
      <div className="flex items-end gap-0.5 h-20">
        {hours.map(({ hour, count }) => (
          <div
            key={hour}
            className="flex-1 rounded-t-sm transition-all group relative"
            style={{ height: `${Math.max((count / maxCount) * 100, count > 0 ? 8 : 3)}%`, background: getBarColor(count) }}
            title={`${getHourLabel(hour)}: ${count} تواصل`}
          >
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-[#0f2535] text-white text-[9px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
              {getHourLabel(hour)}: {count}
            </div>
          </div>
        ))}
      </div>
      <div className="flex mt-1">
        {[0, 6, 12, 18, 23].map(h => (
          <div
            key={h}
            className="text-[9px] text-[#9ab0bf]"
            style={{ marginRight: h === 0 ? '0' : undefined, marginLeft: h === 23 ? '0' : undefined, position: 'absolute', right: `${((23 - h) / 23) * 100}%` }}
          >
            {getHourLabel(h)}
          </div>
        ))}
      </div>
      <div className="flex justify-between text-[9px] text-[#9ab0bf] mt-1 px-0.5">
        <span>12ص (منتصف الليل)</span>
        <span>12م (الظهر)</span>
        <span>11م (الليل)</span>
      </div>
    </div>
  );
}

function DayHeatmap({ data }: { data: { day: number; count: number }[] }) {
  if (!data || data.length === 0) return (
    <div className="flex items-center justify-center h-16 text-[#9ab0bf] text-xs">لا بيانات كافية بعد</div>
  );

  const days = Array.from({ length: 7 }, (_, i) => {
    const found = data.find(d => d.day === i);
    return { day: i, count: found?.count ?? 0 };
  });
  const maxCount = Math.max(...days.map(d => d.count), 1);

  return (
    <div className="grid grid-cols-7 gap-1.5">
      {days.map(({ day, count }) => {
        const ratio = count / maxCount;
        const bg = ratio === 0 ? '#F3F4F6' : ratio < 0.33 ? '#BBF7D0' : ratio < 0.66 ? '#4ADE80' : '#16A34A';
        return (
          <div key={day} className="text-center">
            <div
              className="h-12 rounded-xl flex items-center justify-center transition-all"
              style={{ background: bg }}
              title={`${DAY_NAMES[day]}: ${count} تواصل`}
            >
              <span className="text-[10px] font-bold" style={{ color: ratio > 0.33 ? 'white' : '#9CA3AF' }}>
                {count}
              </span>
            </div>
            <p className="text-[9px] text-[#9ab0bf] mt-1">{DAY_NAMES[day].slice(0, 3)}</p>
          </div>
        );
      })}
    </div>
  );
}

function StageChart({ byStage }: { byStage: Record<string, number> | null }) {
  if (!byStage) return (
    <div className="flex items-center justify-center h-24 text-[#9ab0bf] text-xs">لا بيانات كافية بعد</div>
  );

  const entries = Object.entries(byStage).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((sum, [, v]) => sum + v, 0);

  return (
    <div className="space-y-2">
      {entries.map(([stage, count]) => {
        const color = STAGE_COLORS[stage] ?? '#9CA3AF';
        const label = STAGE_LABELS[stage] ?? stage;
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        return (
          <div key={stage}>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-bold" style={{ color }}>{label}</span>
              <span className="text-[#7a9aab]">{count} ({pct}%)</span>
            </div>
            <div className="h-2 rounded-full bg-gray-100">
              <div
                className="h-2 rounded-full transition-all"
                style={{ width: `${pct}%`, background: color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TemplatePerformanceCard({ template }: { template: WhatsAppTemplate }) {
  const hasData = template.deal_completion_rate !== null;
  const rate = template.deal_completion_rate ?? 0;
  const rateColor = rate >= 80 ? '#16A34A' : rate >= 60 ? '#D97706' : '#DC2626';

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm" dir="rtl">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-[#0f2535] truncate">{template.name}</p>
          <p className="text-[11px] text-[#7a9aab]">{template.usage_count.toLocaleString('ar-SA')} استخدام</p>
        </div>
        {hasData && (
          <div
            className="mr-3 w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: `${rateColor}15` }}
          >
            <span className="text-sm font-black" style={{ color: rateColor }}>{rate}%</span>
          </div>
        )}
      </div>

      {hasData ? (
        <div className="space-y-2">
          <div>
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="text-[#7a9aab]">معدل إتمام الصفقات</span>
              <span className="font-bold" style={{ color: rateColor }}>{rate}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-gray-100">
              <div className="h-1.5 rounded-full transition-all" style={{ width: `${rate}%`, background: rateColor }} />
            </div>
          </div>
          {template.avg_deal_completion_hours && (
            <div className="flex items-center gap-1.5 text-[11px] text-[#7a9aab]">
              <Clock className="w-3 h-3" />
              <span>متوسط وقت الإتمام: <strong className="text-[#1a2f3e]">{template.avg_deal_completion_hours} ساعة</strong></span>
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2 py-2 bg-gray-50 rounded-xl px-3">
          <AlertTriangle className="w-3.5 h-3.5 text-[#9ab0bf]" />
          <span className="text-[11px] text-[#9ab0bf]">
            {template.usage_count < 3 ? 'يحتاج +3 استخدامات لعرض البيانات' : 'بيانات غير كافية بعد'}
          </span>
        </div>
      )}
    </div>
  );
}

export default function WhatsAppAnalytics({ stats, templates, onRefreshTemplateStats }: Props) {
  if (!stats) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <BarChart3 className="w-14 h-14 text-gray-200 mx-auto mb-3" />
          <p className="text-[#7a9aab] font-medium">لا توجد إحصائيات بعد</p>
          <p className="text-xs text-[#9ab0bf] mt-1">ستظهر البيانات بعد أول تواصل واتساب</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8" dir="rtl">
      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: 'إجمالي التواصل', value: stats.total_contacts, color: '#25D366' },
          { label: 'اليوم', value: stats.contacts_today, color: '#0369A1' },
          { label: 'هذا الأسبوع', value: stats.contacts_this_week, color: '#059669' },
          { label: 'هذا الشهر', value: stats.contacts_this_month, color: '#D97706' },
          { label: 'تواصل مكرر', value: stats.duplicate_contacts, color: '#DC2626' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm text-center">
            <p className="text-2xl font-black" style={{ color }}>{value}</p>
            <p className="text-[11px] text-[#7a9aab] mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Role ratio */}
      {stats.total_contacts > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h3 className="text-sm font-bold text-[#0f2535] mb-4">نسبة التواصل - مشترين مقابل موردين</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-center">
              <p className="text-3xl font-black text-blue-700">{stats.by_role.buyer_initiated}</p>
              <p className="text-xs font-bold text-blue-600 mt-1">من مشترين</p>
              <p className="text-[10px] text-blue-400">{Math.round((stats.by_role.buyer_initiated / stats.total_contacts) * 100)}%</p>
            </div>
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-center">
              <p className="text-3xl font-black text-emerald-700">{stats.by_role.supplier_initiated}</p>
              <p className="text-xs font-bold text-emerald-600 mt-1">من موردين</p>
              <p className="text-[10px] text-emerald-400">{Math.round((stats.by_role.supplier_initiated / stats.total_contacts) * 100)}%</p>
            </div>
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

      {/* Stage breakdown */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-[#0369A1]" />
          <h3 className="text-sm font-bold text-[#0f2535]">التواصل حسب مرحلة الصفقة</h3>
        </div>
        <StageChart byStage={stats.by_stage} />
      </div>

      {/* Hourly heatmap */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-4 h-4 text-[#D97706]" />
          <h3 className="text-sm font-bold text-[#0f2535]">أوقات التواصل - توزيع ساعي (آخر 30 يوم)</h3>
        </div>
        <HourlyHeatmap data={stats.hourly_distribution ?? []} />
      </div>

      {/* Day heatmap */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-4 h-4 text-[#059669]" />
          <h3 className="text-sm font-bold text-[#0f2535]">أيام الأسبوع الأكثر نشاطاً (آخر 30 يوم)</h3>
        </div>
        <DayHeatmap data={stats.daily_distribution ?? []} />
      </div>

      {/* Top deals */}
      {stats.top_deals && stats.top_deals.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h3 className="text-sm font-bold text-[#0f2535] mb-3">أكثر الصفقات تواصلاً</h3>
          <div className="space-y-2">
            {stats.top_deals.map((deal, i) => (
              <div key={deal.deal_ref} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <div className="w-7 h-7 rounded-lg bg-[#0f2535] text-white text-xs font-black flex items-center justify-center flex-shrink-0">{i + 1}</div>
                <span className="text-xs font-mono font-bold text-[#0f2535] flex-1" dir="ltr">{deal.deal_ref}</span>
                <div className="flex items-center gap-1.5 bg-[#25D366]/10 px-2.5 py-1 rounded-lg">
                  <span className="text-xs font-bold text-[#1a9e5c]">{deal.contact_count} تواصل</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Template performance */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-[#0f2535]">أداء القوالب</h3>
          <button
            onClick={onRefreshTemplateStats}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0f2535] text-white text-xs font-bold hover:bg-[#1a3a4f] transition-colors"
          >
            <TrendingUp className="w-3 h-3" />
            تحديث الأداء
          </button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {templates.filter(t => t.usage_count > 0).map(template => (
            <TemplatePerformanceCard key={template.id} template={template} />
          ))}
          {templates.filter(t => t.usage_count > 0).length === 0 && (
            <div className="col-span-2 text-center py-8 text-[#9ab0bf] text-sm">
              لا يوجد استخدام للقوالب بعد
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
