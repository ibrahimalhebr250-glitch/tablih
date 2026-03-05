import { useEffect, useState } from 'react';
import { CheckCircle, X } from 'lucide-react';

interface ActionToastProps {
  title: string;
  message: string;
  onClose: () => void;
  autoClose?: number;
  variant?: 'success' | 'info';
}

export function ActionToast({ title, message, onClose, autoClose = 5000, variant = 'success' }: ActionToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const show = setTimeout(() => setVisible(true), 30);
    const close = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 350);
    }, autoClose);
    return () => { clearTimeout(show); clearTimeout(close); };
  }, [autoClose, onClose]);

  const colors = variant === 'success'
    ? { bg: 'linear-gradient(135deg, #166534, #15803d)', accent: '#86EFAC', icon: '#4ade80' }
    : { bg: 'linear-gradient(135deg, #1e40af, #1d4ed8)', accent: '#93C5FD', icon: '#60a5fa' };

  return (
    <div
      className="fixed top-5 inset-x-0 z-[999] flex justify-center px-4 pointer-events-none"
      style={{ transition: 'all 0.35s cubic-bezier(0.34,1.56,0.64,1)', opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(-20px)' }}
    >
      <div
        className="pointer-events-auto w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: colors.bg, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}
        dir="rtl"
      >
        <div className="flex items-start gap-3 p-4">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.15)' }}>
            <CheckCircle className="w-5 h-5" style={{ color: colors.icon }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-black text-white leading-tight">{title}</p>
            <p className="text-[11px] text-white/75 mt-0.5 leading-relaxed">{message}</p>
          </div>
          <button
            onClick={() => { setVisible(false); setTimeout(onClose, 350); }}
            className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 active:scale-90 transition-transform"
            style={{ background: 'rgba(255,255,255,0.15)' }}
          >
            <X className="w-3.5 h-3.5 text-white/70" />
          </button>
        </div>
        <div className="h-1 w-full" style={{ background: 'rgba(255,255,255,0.1)' }}>
          <div
            className="h-full rounded-full"
            style={{
              background: colors.accent,
              width: '100%',
              animation: `shrink ${autoClose}ms linear forwards`,
            }}
          />
        </div>
      </div>
    </div>
  );
}

export interface ToastConfig {
  title: string;
  message: string;
  variant?: 'success' | 'info';
}
