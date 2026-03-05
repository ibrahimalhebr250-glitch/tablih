import { Shield, ShieldCheck, ShieldAlert, Star } from 'lucide-react';

interface Props {
  rating: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  variant?: 'badge' | 'inline' | 'detailed';
}

const TRUST_CONFIG: Record<number, { label: string; color: string; bg: string; border: string; icon: typeof Shield }> = {
  1: { label: 'يحتاج متابعة', color: '#DC2626', bg: '#FEF2F2', border: '#FECACA', icon: ShieldAlert },
  2: { label: 'جديد', color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', icon: Shield },
  3: { label: 'معتاد', color: '#0369A1', bg: '#E0F2FE', border: '#BAE6FD', icon: Shield },
  4: { label: 'موثوق', color: '#059669', bg: '#ECFDF5', border: '#A7F3D0', icon: ShieldCheck },
  5: { label: 'متميّز', color: '#0F766E', bg: '#F0FDFA', border: '#99F6E4', icon: ShieldCheck },
};

export function getTrustConfig(rating: number) {
  return TRUST_CONFIG[Math.max(1, Math.min(5, rating))] ?? TRUST_CONFIG[3];
}

export default function TrustRatingBadge({ rating, size = 'sm', showLabel = true, variant = 'badge' }: Props) {
  const config = getTrustConfig(rating);
  const Icon = config.icon;
  const clampedRating = Math.max(1, Math.min(5, rating));

  if (variant === 'inline') {
    const iconSize = size === 'lg' ? 'w-4 h-4' : size === 'md' ? 'w-3.5 h-3.5' : 'w-3 h-3';
    return (
      <div className="flex items-center gap-1">
        <Icon className={iconSize} style={{ color: config.color }} />
        {showLabel && (
          <span
            className={`font-bold ${size === 'lg' ? 'text-[12px]' : size === 'md' ? 'text-[11px]' : 'text-[10px]'}`}
            style={{ color: config.color }}
          >
            {config.label}
          </span>
        )}
      </div>
    );
  }

  if (variant === 'detailed') {
    return (
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-2xl border"
        style={{ background: config.bg, borderColor: config.border }}
        dir="rtl"
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${config.color}15` }}
        >
          <Icon className="w-5 h-5" style={{ color: config.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[13px] font-bold" style={{ color: config.color }}>
              {config.label}
            </span>
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star
                  key={i}
                  className="w-3 h-3"
                  style={{
                    color: i <= clampedRating ? config.color : '#e5e7eb',
                    fill: i <= clampedRating ? config.color : 'none',
                  }}
                />
              ))}
            </div>
          </div>
          <p className="text-[10px] text-gray-500">
            تقييم المنصة بناءً على سجل التعاملات
          </p>
        </div>
      </div>
    );
  }

  const starSize = size === 'lg' ? 'w-3.5 h-3.5' : size === 'md' ? 'w-3 h-3' : 'w-2.5 h-2.5';

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={starSize}
          style={{
            color: i <= clampedRating ? config.color : '#d1d5db',
            fill: i <= clampedRating ? config.color : 'none',
          }}
        />
      ))}
    </div>
  );
}
