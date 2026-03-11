import { useState } from 'react';
import { Bell, X } from 'lucide-react';

interface Props {
  phone?: string;
}

export default function NotificationCenter({ phone }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  if (!phone) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center transition-all hover:bg-gray-50 hover:border-gray-300"
      >
        <Bell className="w-5 h-5 text-gray-600" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 sm:right-0 sm:left-auto top-full mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-4 duration-200" style={{ width: 'min(90vw, 384px)', maxWidth: 'calc(100vw - 16px)' }}>
            <div className="sticky top-0 bg-white border-b border-gray-100 p-4 z-10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Bell className="w-4 h-4 text-blue-600" />
                </div>
                <h3 className="font-bold text-gray-900">الإشعارات</h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-all"
              >
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>
            <div className="p-8 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
                <Bell className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-sm font-semibold text-gray-900 mb-1">لا توجد إشعارات</p>
              <p className="text-xs text-gray-500">ستظهر هنا إشعاراتك عند وجودها</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
