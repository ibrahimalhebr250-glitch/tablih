import { useEffect, useState } from 'react';
import { Check, CheckCircle2, Sparkles, TrendingUp, Package, ShoppingCart, Handshake } from 'lucide-react';

interface SuccessAnimationProps {
  show: boolean;
  onComplete?: () => void;
  title: string;
  message?: string;
  type?: 'order' | 'inventory' | 'deal' | 'general';
  duration?: number;
}

export default function SuccessAnimation({
  show,
  onComplete,
  title,
  message,
  type = 'general',
  duration = 3000,
}: SuccessAnimationProps) {
  const [stage, setStage] = useState<'entering' | 'showing' | 'exiting'>('entering');

  const icons = {
    order: ShoppingCart,
    inventory: Package,
    deal: Handshake,
    general: CheckCircle2,
  };

  const colors = {
    order: { primary: '#7C3AED', secondary: '#A78BFA', bg: '#F3E8FF' },
    inventory: { primary: '#DC2626', secondary: '#F87171', bg: '#FEE2E2' },
    deal: { primary: '#059669', secondary: '#34D399', bg: '#D1FAE5' },
    general: { primary: '#0369A1', secondary: '#38BDF8', bg: '#E0F2FE' },
  };

  const Icon = icons[type];
  const color = colors[type];

  useEffect(() => {
    if (!show) return;

    setStage('entering');

    const showTimer = setTimeout(() => {
      setStage('showing');
    }, 500);

    const exitTimer = setTimeout(() => {
      setStage('exiting');
    }, duration - 500);

    const completeTimer = setTimeout(() => {
      onComplete?.();
    }, duration);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(exitTimer);
      clearTimeout(completeTimer);
    };
  }, [show, duration, onComplete]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
      <div
        className={`
          relative w-full max-w-sm
          transition-all duration-500 ease-out
          ${stage === 'entering' ? 'opacity-0 scale-90 translate-y-8' : ''}
          ${stage === 'showing' ? 'opacity-100 scale-100 translate-y-0' : ''}
          ${stage === 'exiting' ? 'opacity-0 scale-90 -translate-y-8' : ''}
        `}
      >
        <div className="absolute inset-0 -z-10">
          <div
            className="absolute inset-0 rounded-3xl opacity-20 blur-2xl"
            style={{
              background: `radial-gradient(circle, ${color.primary}, ${color.secondary})`,
              animation: 'pulse-ring 2s ease-out infinite',
            }}
          />
        </div>

        <div className="bg-white rounded-3xl shadow-2xl p-8 border border-gray-100">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="relative">
              <div
                className="absolute inset-0 rounded-2xl blur-xl opacity-30"
                style={{ background: color.primary }}
              />
              <div
                className="relative w-20 h-20 rounded-2xl flex items-center justify-center"
                style={{ background: `linear-gradient(135deg, ${color.primary}, ${color.secondary})` }}
              >
                <Icon className="w-10 h-10 text-white" />
                <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-white shadow-lg flex items-center justify-center animate-in zoom-in duration-300 delay-200">
                  <Check className="w-5 h-5 text-green-500" strokeWidth={3} />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-black text-gray-900">{title}</h3>
              {message && (
                <p className="text-sm text-gray-600">{message}</p>
              )}
            </div>

            <div className="flex gap-2">
              {[...Array(3)].map((_, i) => (
                <Sparkles
                  key={i}
                  className="w-4 h-4 animate-pulse"
                  style={{
                    color: color.primary,
                    animationDelay: `${i * 200}ms`,
                  }}
                />
              ))}
            </div>
          </div>

          <div
            className="absolute inset-x-0 bottom-0 h-1 rounded-b-3xl"
            style={{ background: color.primary }}
          >
            <div
              className="h-full bg-white/50 rounded-b-3xl origin-left"
              style={{
                animation: `shrinkBar ${duration}ms linear forwards`,
              }}
            />
          </div>
        </div>

        <div className="absolute -z-20 inset-0">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-full animate-float"
              style={{
                background: color.secondary,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${i * 0.3}s`,
                animationDuration: `${3 + Math.random() * 2}s`,
                opacity: 0.3,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function QuickSuccessToast({
  show,
  message,
  icon,
  color = '#059669',
}: {
  show: boolean;
  message: string;
  icon?: React.ReactNode;
  color?: string;
}) {
  if (!show) return null;

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="bg-white rounded-2xl shadow-2xl px-6 py-4 flex items-center gap-3 border border-gray-100">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: `${color}20` }}
        >
          {icon || <Check className="w-5 h-5" style={{ color }} />}
        </div>
        <span className="text-sm font-semibold text-gray-900">{message}</span>
      </div>
    </div>
  );
}
