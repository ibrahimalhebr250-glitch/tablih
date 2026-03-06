import { CheckCircle, Send, Package, Users, Star, FileText, Settings, ArrowLeft, Zap } from 'lucide-react';

interface Props {
  onNavigate: (section: string) => void;
}

const actions = [
  {
    label: 'إدارة الصفقات',
    desc: 'عرض وإدارة جميع الصفقات',
    icon: CheckCircle,
    color: '#16a34a',
    bg: 'from-green-50 to-green-100',
    section: 'deals',
    highlight: true,
  },
  {
    label: 'المالية والتسويات',
    desc: 'المدفوعات والمستحقات',
    icon: Send,
    color: '#7c3aed',
    bg: 'from-purple-50 to-purple-100',
    section: 'finance',
    highlight: true,
  },
  {
    label: 'السوق والمخزون',
    desc: 'المدن والعروض والطلبات',
    icon: Package,
    color: '#ca8a04',
    bg: 'from-amber-50 to-amber-100',
    section: 'market',
    highlight: false,
  },
  {
    label: 'المستخدمين',
    desc: 'إدارة الحسابات والصلاحيات',
    icon: Users,
    color: '#2563eb',
    bg: 'from-blue-50 to-blue-100',
    section: 'users',
    highlight: false,
  },
  {
    label: 'التقييمات',
    desc: 'مراجعة تقييمات المستخدمين',
    icon: Star,
    color: '#f59e0b',
    bg: 'from-orange-50 to-orange-100',
    section: 'ratings',
    highlight: false,
  },
  {
    label: 'التقارير',
    desc: 'التقارير والإحصائيات',
    icon: FileText,
    color: '#64748b',
    bg: 'from-slate-50 to-slate-100',
    section: 'finance',
    highlight: false,
  },
  {
    label: 'الإعدادات',
    desc: 'إعدادات المنصة العامة',
    icon: Settings,
    color: '#6b7280',
    bg: 'from-gray-50 to-gray-100',
    section: 'settings',
    highlight: false,
  },
];

export default function QuickActionsPanel({ onNavigate }: Props) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Zap className="w-5 h-5 text-amber-500" />
        <div>
          <p className="text-sm font-black text-slate-900">إجراءات سريعة</p>
          <p className="text-xs text-slate-500">الوصول السريع للأقسام الرئيسية</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">
        {actions.map(({ label, desc, icon: Icon, color, bg, section, highlight }) => (
          <button
            key={label}
            onClick={() => onNavigate(section)}
            className={`group relative rounded-2xl p-4 transition-all hover:shadow-xl hover:-translate-y-1 active:scale-[0.97] flex flex-col gap-3 text-right bg-gradient-to-br ${bg} border border-white/60 overflow-hidden ${
              highlight ? 'lg:col-span-2' : ''
            }`}
          >
            <div className="absolute inset-0 bg-white/40 opacity-0 group-hover:opacity-100 transition-opacity" />

            <div className="relative flex items-center justify-between">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm transition-transform group-hover:scale-110 group-hover:rotate-6"
                style={{ background: `${color}20` }}
              >
                <Icon className="w-5 h-5" style={{ color }} />
              </div>
              <ArrowLeft className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-all group-hover:-translate-x-1" />
            </div>

            <div className="relative">
              <p className="text-sm font-black text-slate-900 mb-0.5 leading-tight">{label}</p>
              <p className="text-xs text-slate-600 leading-tight">{desc}</p>
            </div>

            {highlight && (
              <div className="absolute top-2 left-2">
                <div className="px-2 py-0.5 bg-white/80 rounded-full text-xs font-bold" style={{ color }}>
                  مهم
                </div>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
