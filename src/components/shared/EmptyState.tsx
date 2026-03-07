import { Package, ShoppingCart, Handshake, Search, Inbox, AlertCircle, TrendingUp, Sparkles } from 'lucide-react';

interface EmptyStateProps {
  variant: 'no-orders' | 'no-inventory' | 'no-deals' | 'no-search' | 'no-data' | 'error';
  title?: string;
  message?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
}

export default function EmptyState({ variant, title, message, action, secondaryAction }: EmptyStateProps) {
  const configs = {
    'no-orders': {
      icon: ShoppingCart,
      color: '#7C3AED',
      bg: 'linear-gradient(135deg, #F3E8FF 0%, #E9D5FF 100%)',
      defaultTitle: 'No Orders Yet',
      defaultMessage: 'Start by creating your first order. We will match you with the best suppliers.',
      illustration: (
        <svg viewBox="0 0 200 200" className="w-full h-full">
          <circle cx="100" cy="100" r="80" fill="#F3E8FF" opacity="0.5" />
          <circle cx="100" cy="100" r="60" fill="#E9D5FF" opacity="0.5" />
          <rect x="60" y="70" width="80" height="60" rx="8" fill="#7C3AED" opacity="0.2" />
          <circle cx="80" cy="110" r="8" fill="#7C3AED" />
          <circle cx="120" cy="110" r="8" fill="#7C3AED" />
        </svg>
      ),
    },
    'no-inventory': {
      icon: Package,
      color: '#DC2626',
      bg: 'linear-gradient(135deg, #FEE2E2 0%, #FECACA 100%)',
      defaultTitle: 'No Inventory Items',
      defaultMessage: 'Add your first pallet to start selling. Upload details, photos, and set your price.',
      illustration: (
        <svg viewBox="0 0 200 200" className="w-full h-full">
          <circle cx="100" cy="100" r="80" fill="#FEE2E2" opacity="0.5" />
          <circle cx="100" cy="100" r="60" fill="#FECACA" opacity="0.5" />
          <rect x="70" y="80" width="60" height="40" rx="4" fill="#DC2626" opacity="0.2" />
          <rect x="70" y="70" width="60" height="10" fill="#DC2626" opacity="0.3" />
        </svg>
      ),
    },
    'no-deals': {
      icon: Handshake,
      color: '#059669',
      bg: 'linear-gradient(135deg, #D1FAE5 0%, #A7F3D0 100%)',
      defaultTitle: 'No Active Deals',
      defaultMessage: 'Once orders are matched with inventory, deals will appear here for confirmation.',
      illustration: (
        <svg viewBox="0 0 200 200" className="w-full h-full">
          <circle cx="100" cy="100" r="80" fill="#D1FAE5" opacity="0.5" />
          <circle cx="100" cy="100" r="60" fill="#A7F3D0" opacity="0.5" />
          <path d="M70 100 L90 120 L130 80" stroke="#059669" strokeWidth="8" fill="none" strokeLinecap="round" opacity="0.3" />
        </svg>
      ),
    },
    'no-search': {
      icon: Search,
      color: '#0369A1',
      bg: 'linear-gradient(135deg, #E0F2FE 0%, #BAE6FD 100%)',
      defaultTitle: 'No Results Found',
      defaultMessage: 'Try adjusting your search or filters to find what you are looking for.',
      illustration: (
        <svg viewBox="0 0 200 200" className="w-full h-full">
          <circle cx="100" cy="100" r="80" fill="#E0F2FE" opacity="0.5" />
          <circle cx="90" cy="90" r="30" stroke="#0369A1" strokeWidth="6" fill="none" opacity="0.3" />
          <line x1="110" y1="110" x2="130" y2="130" stroke="#0369A1" strokeWidth="6" strokeLinecap="round" opacity="0.3" />
        </svg>
      ),
    },
    'no-data': {
      icon: Inbox,
      color: '#6B7280',
      bg: 'linear-gradient(135deg, #F3F4F6 0%, #E5E7EB 100%)',
      defaultTitle: 'No Data Available',
      defaultMessage: 'There is nothing to show here yet. Check back later.',
      illustration: (
        <svg viewBox="0 0 200 200" className="w-full h-full">
          <circle cx="100" cy="100" r="80" fill="#F3F4F6" opacity="0.5" />
          <rect x="70" y="80" width="60" height="40" rx="4" fill="#6B7280" opacity="0.2" />
        </svg>
      ),
    },
    'error': {
      icon: AlertCircle,
      color: '#DC2626',
      bg: 'linear-gradient(135deg, #FEE2E2 0%, #FECACA 100%)',
      defaultTitle: 'Something Went Wrong',
      defaultMessage: 'We encountered an error loading this data. Please try again.',
      illustration: (
        <svg viewBox="0 0 200 200" className="w-full h-full">
          <circle cx="100" cy="100" r="80" fill="#FEE2E2" opacity="0.5" />
          <circle cx="100" cy="100" r="40" stroke="#DC2626" strokeWidth="6" fill="none" opacity="0.3" />
          <line x1="100" y1="80" x2="100" y2="105" stroke="#DC2626" strokeWidth="6" strokeLinecap="round" opacity="0.5" />
          <circle cx="100" cy="120" r="4" fill="#DC2626" opacity="0.5" />
        </svg>
      ),
    },
  };

  const config = configs[variant];
  const Icon = config.icon;

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="relative mb-8">
        <div
          className="absolute inset-0 rounded-full opacity-20 blur-3xl animate-pulse"
          style={{ background: config.color }}
        />
        <div
          className="relative w-40 h-40 rounded-3xl flex items-center justify-center overflow-hidden"
          style={{ background: config.bg }}
        >
          <div className="absolute inset-0 opacity-30">
            {config.illustration}
          </div>
          <div
            className="relative w-20 h-20 rounded-2xl flex items-center justify-center shadow-lg z-10"
            style={{ background: config.color }}
          >
            <Icon className="w-10 h-10 text-white" strokeWidth={2} />
          </div>
        </div>

        <div className="absolute -top-2 -right-2 animate-bounce">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center shadow-lg"
            style={{ background: config.color }}
          >
            <Sparkles className="w-4 h-4 text-white" />
          </div>
        </div>
      </div>

      <div className="text-center space-y-3 mb-8 max-w-md">
        <h3 className="text-2xl font-black text-gray-900">
          {title || config.defaultTitle}
        </h3>
        <p className="text-sm text-gray-600 leading-relaxed">
          {message || config.defaultMessage}
        </p>
      </div>

      {action && (
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={action.onClick}
            className="group flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-white shadow-lg transition-all hover:shadow-xl hover:scale-105 active:scale-95"
            style={{ background: `linear-gradient(135deg, ${config.color} 0%, ${config.color}dd 100%)` }}
          >
            {action.icon}
            {action.label}
            <TrendingUp className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </button>

          {secondaryAction && (
            <button
              onClick={secondaryAction.onClick}
              className="px-6 py-3 rounded-xl font-semibold text-gray-700 bg-white border-2 border-gray-200 hover:border-gray-300 transition-all hover:scale-105 active:scale-95"
            >
              {secondaryAction.label}
            </button>
          )}
        </div>
      )}

      {variant === 'no-search' && (
        <div className="mt-8 flex items-center gap-2 text-xs text-gray-500">
          <Search className="w-3.5 h-3.5" />
          <span>Try using different keywords or remove some filters</span>
        </div>
      )}
    </div>
  );
}

export function MinimalEmptyState({
  icon: Icon = Inbox,
  message = 'No items found',
  color = '#6B7280',
}: {
  icon?: React.ElementType;
  message?: string;
  color?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 animate-in fade-in duration-300">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: `${color}15` }}
      >
        <Icon className="w-8 h-8" style={{ color }} />
      </div>
      <p className="text-sm font-medium text-gray-600">{message}</p>
    </div>
  );
}
