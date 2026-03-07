import { Package, ShoppingCart, Handshake, BarChart3 } from 'lucide-react';

interface SkeletonProps {
  variant?: 'card' | 'list' | 'dashboard' | 'table';
  count?: number;
  icon?: 'package' | 'cart' | 'deal' | 'chart';
  message?: string;
}

export default function LoadingSkeleton({
  variant = 'card',
  count = 3,
  icon = 'package',
  message = 'Loading...'
}: SkeletonProps) {
  const icons = {
    package: Package,
    cart: ShoppingCart,
    deal: Handshake,
    chart: BarChart3,
  };

  const Icon = icons[icon];

  if (variant === 'card') {
    return (
      <div className="space-y-4">
        {Array.from({ length: count }).map((_, idx) => (
          <div
            key={idx}
            className="bg-white rounded-2xl p-4 border border-gray-100 animate-in fade-in duration-300"
            style={{ animationDelay: `${idx * 100}ms` }}
          >
            <div className="flex gap-4">
              <div className="relative w-24 h-24 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
                <div className="absolute inset-0 shimmer" />
              </div>
              <div className="flex-1 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-100 rounded-lg w-3/4 relative overflow-hidden">
                      <div className="absolute inset-0 shimmer" />
                    </div>
                    <div className="h-3 bg-gradient-to-r from-gray-200 to-gray-100 rounded-lg w-1/2 relative overflow-hidden">
                      <div className="absolute inset-0 shimmer" />
                    </div>
                  </div>
                  <div className="w-16 h-6 bg-gradient-to-r from-gray-200 to-gray-100 rounded-full relative overflow-hidden">
                    <div className="absolute inset-0 shimmer" />
                  </div>
                </div>
                <div className="flex gap-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-6 w-16 bg-gradient-to-r from-gray-200 to-gray-100 rounded-full relative overflow-hidden">
                      <div className="absolute inset-0 shimmer" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'list') {
    return (
      <div className="space-y-2">
        {Array.from({ length: count }).map((_, idx) => (
          <div
            key={idx}
            className="bg-white rounded-xl p-4 border border-gray-100 animate-in fade-in duration-300"
            style={{ animationDelay: `${idx * 75}ms` }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-gray-200 to-gray-100 relative overflow-hidden">
                <div className="absolute inset-0 shimmer" />
              </div>
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-gradient-to-r from-gray-200 to-gray-100 rounded-lg w-2/3 relative overflow-hidden">
                  <div className="absolute inset-0 shimmer" />
                </div>
                <div className="h-2 bg-gradient-to-r from-gray-200 to-gray-100 rounded-lg w-1/3 relative overflow-hidden">
                  <div className="absolute inset-0 shimmer" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'dashboard') {
    return (
      <div className="space-y-6 p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div
              key={idx}
              className="bg-white rounded-2xl p-6 border border-gray-100 animate-in fade-in duration-300"
              style={{ animationDelay: `${idx * 100}ms` }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gray-200 to-gray-100 relative overflow-hidden">
                  <div className="absolute inset-0 shimmer" />
                </div>
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gray-200 to-gray-100 relative overflow-hidden">
                  <div className="absolute inset-0 shimmer" />
                </div>
              </div>
              <div className="space-y-3">
                <div className="h-8 bg-gradient-to-r from-gray-200 to-gray-100 rounded-lg w-24 relative overflow-hidden">
                  <div className="absolute inset-0 shimmer" />
                </div>
                <div className="h-3 bg-gradient-to-r from-gray-200 to-gray-100 rounded-lg w-32 relative overflow-hidden">
                  <div className="absolute inset-0 shimmer" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (variant === 'table') {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-100 rounded-lg w-32 relative overflow-hidden">
            <div className="absolute inset-0 shimmer" />
          </div>
        </div>
        {Array.from({ length: count }).map((_, idx) => (
          <div
            key={idx}
            className="p-4 border-b border-gray-50 animate-in fade-in duration-300"
            style={{ animationDelay: `${idx * 50}ms` }}
          >
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gray-200 to-gray-100 relative overflow-hidden">
                <div className="absolute inset-0 shimmer" />
              </div>
              <div className="flex-1 flex items-center gap-8">
                {[40, 30, 25, 20].map((width, i) => (
                  <div
                    key={i}
                    className="h-3 bg-gradient-to-r from-gray-200 to-gray-100 rounded-lg relative overflow-hidden"
                    style={{ width: `${width}%` }}
                  >
                    <div className="absolute inset-0 shimmer" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return null;
}

export function LoadingOverlay({ message = 'Loading...', icon = 'package' }: Pick<SkeletonProps, 'message' | 'icon'>) {
  const icons = {
    package: Package,
    cart: ShoppingCart,
    deal: Handshake,
    chart: BarChart3,
  };

  const Icon = icons[icon];

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 animate-in fade-in duration-500">
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#1a4a5e] to-[#2d6a82] flex items-center justify-center animate-pulse">
          <Icon className="w-10 h-10 text-white" />
        </div>
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#1a4a5e] to-[#2d6a82] animate-ping opacity-20" />
      </div>
      <p className="text-sm font-semibold text-gray-700 mb-2">{message}</p>
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-2 h-2 rounded-full bg-[#1a4a5e]"
            style={{
              animation: 'bounce 1.4s infinite ease-in-out',
              animationDelay: `${i * 0.16}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
