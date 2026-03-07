import { Video as LucideIcon } from 'lucide-react';

interface Props {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  gradient: string;
  onClick: () => void;
}

export default function QuickActionButton({
  title,
  subtitle,
  icon: Icon,
  gradient,
  onClick
}: Props) {
  return (
    <button
      onClick={onClick}
      className={`group relative overflow-hidden rounded-2xl p-5 shadow-lg hover:shadow-2xl active:scale-[0.97] transition-all duration-200 ${gradient}`}
      dir="rtl"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <div className="absolute -left-4 -bottom-4 w-24 h-24 bg-white/10 rounded-full blur-2xl" />

      <div className="relative z-10 flex items-center justify-between">
        <div className="w-12 h-12 rounded-xl bg-white/30 backdrop-blur-xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 group-hover:rotate-6 duration-300">
          <Icon className="w-6 h-6 text-white" />
        </div>

        <div className="text-right flex-1 mr-4">
          <p className="text-[16px] font-black text-white mb-1">{title}</p>
          <p className="text-[11px] text-white/80">{subtitle}</p>
        </div>
      </div>

      <div className="absolute top-2 left-2 w-2 h-2 bg-white/60 rounded-full animate-ping" />
      <div className="absolute top-2 left-2 w-2 h-2 bg-white rounded-full" />
    </button>
  );
}
