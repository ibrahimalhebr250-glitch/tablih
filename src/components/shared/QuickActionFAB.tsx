import { useState, useEffect } from 'react';
import { Plus, X, ShoppingCart, Package, Zap, TrendingUp } from 'lucide-react';

interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  onClick: () => void;
  shortcut?: string;
}

interface QuickActionFABProps {
  actions: QuickAction[];
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
}

export default function QuickActionFAB({ actions, position = 'bottom-right' }: QuickActionFABProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showHint, setShowHint] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowHint(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        actions.forEach(action => {
          if (action.shortcut && e.key.toLowerCase() === action.shortcut.toLowerCase()) {
            e.preventDefault();
            action.onClick();
          }
        });
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [actions]);

  const positionClasses = {
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6',
    'top-right': 'top-6 right-6',
    'top-left': 'top-6 left-6',
  };

  const actionPositions = isOpen
    ? actions.map((_, idx) => ({
        transform: `translateY(-${(idx + 1) * 70}px)`,
        opacity: 1,
      }))
    : actions.map(() => ({ transform: 'translateY(0)', opacity: 0 }));

  return (
    <div className={`fixed ${positionClasses[position]} z-40`}>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      <div className="relative">
        {actions.map((action, idx) => (
          <div
            key={action.id}
            className="absolute bottom-0 right-0 transition-all duration-300 ease-out"
            style={{
              ...actionPositions[idx],
              transitionDelay: isOpen ? `${idx * 50}ms` : '0ms',
              pointerEvents: isOpen ? 'auto' : 'none',
            }}
          >
            <button
              onClick={() => {
                action.onClick();
                setIsOpen(false);
              }}
              className="group flex items-center gap-3 mb-2"
            >
              <span className="bg-white px-3 py-2 rounded-xl shadow-lg text-sm font-semibold text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                {action.label}
                {action.shortcut && (
                  <span className="ml-2 px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono text-gray-500">
                    ⌘{action.shortcut}
                  </span>
                )}
              </span>
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-xl transition-all hover:scale-110 active:scale-95"
                style={{ background: action.color }}
              >
                <div className="text-white">
                  {action.icon}
                </div>
              </div>
            </button>
          </div>
        ))}

        <button
          onClick={() => setIsOpen(!isOpen)}
          className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-[#1a4a5e] to-[#2d6a82] shadow-2xl flex items-center justify-center transition-all hover:scale-105 active:scale-95 z-10"
        >
          <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br from-[#1a4a5e] to-[#2d6a82] transition-all ${isOpen ? 'animate-ping opacity-20' : 'opacity-0'}`} />

          <div className="relative">
            {isOpen ? (
              <X className="w-7 h-7 text-white transition-transform rotate-0" />
            ) : (
              <Plus className="w-7 h-7 text-white transition-transform rotate-0" />
            )}
          </div>

          {showHint && !isOpen && (
            <div className="absolute -top-12 right-0 bg-white px-4 py-2 rounded-xl shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-xs font-semibold text-gray-700">Quick Actions</span>
              </div>
              <div className="absolute -bottom-1 right-6 w-2 h-2 bg-white rotate-45" />
            </div>
          )}
        </button>

        {isOpen && (
          <div className="absolute -top-16 right-0 bg-white px-4 py-2.5 rounded-xl shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-200 whitespace-nowrap">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
              <span className="text-xs font-bold text-gray-700">Quick Actions</span>
            </div>
            <p className="text-[10px] text-gray-500">Use keyboard shortcuts</p>
            <div className="absolute -bottom-1 right-6 w-2 h-2 bg-white rotate-45" />
          </div>
        )}
      </div>
    </div>
  );
}

export function useQuickActions() {
  const [actions, setActions] = useState<QuickAction[]>([]);

  const registerAction = (action: QuickAction) => {
    setActions(prev => [...prev.filter(a => a.id !== action.id), action]);
  };

  const unregisterAction = (id: string) => {
    setActions(prev => prev.filter(a => a.id !== id));
  };

  const clearActions = () => {
    setActions([]);
  };

  return { actions, registerAction, unregisterAction, clearActions };
}
