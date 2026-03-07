import { Video as LucideIcon } from 'lucide-react';

interface Props {
  title: string;
  count: number;
  subtitle: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  onClick: () => void;
  badge?: {
    text: string;
    color: string;
  };
}

export default function ActivityCard({
  title,
  count,
  subtitle,
  icon: Icon,
  color,
  bgColor,
  onClick,
  badge
}: Props) {
  return (
    <button
      onClick={onClick}
      className="group relative overflow-hidden rounded-2xl bg-white border-2 border-gray-100 p-4 shadow-md hover:shadow-xl active:scale-[0.98] transition-all duration-200"
      dir="rtl"
    >
      <div className="absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full opacity-10 transition-transform group-hover:scale-110 duration-300" style={{ backgroundColor: color }} />

      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 duration-300"
            style={{ backgroundColor: bgColor }}
          >
            <Icon className="w-6 h-6" style={{ color }} />
          </div>

          <div className="text-right">
            <p className="text-[15px] font-black text-gray-900 mb-0.5">{title}</p>
            <p className="text-[11px] text-gray-500">{subtitle}</p>
          </div>
        </div>

        <div className="text-left">
          <p className="text-[24px] font-black" style={{ color }}>{count}</p>
          {badge && (
            <span
              className="inline-block px-2 py-0.5 rounded-md text-[9px] font-bold"
              style={{ backgroundColor: badge.color + '20', color: badge.color }}
            >
              {badge.text}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
