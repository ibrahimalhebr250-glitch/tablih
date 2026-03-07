import { useState } from 'react';
import { Bell, BellDot, X, Check, Sparkles, TrendingUp, AlertCircle, Package } from 'lucide-react';
import { useSmartNotifications } from '../../hooks/useSmartNotifications';

interface NotificationCenterProps {
  phone?: string;
}

export default function NotificationCenter({ phone }: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
  } = useSmartNotifications(phone);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return { bg: '#FEE2E2', color: '#DC2626', icon: AlertCircle };
      case 'medium':
        return { bg: '#DBEAFE', color: '#2563EB', icon: TrendingUp };
      case 'low':
        return { bg: '#F3F4F6', color: '#6B7280', icon: Package };
      default:
        return { bg: '#F3F4F6', color: '#6B7280', icon: Package };
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'match_found':
        return Sparkles;
      case 'better_match':
        return TrendingUp;
      case 'inventory_alert':
        return Package;
      case 'score_update':
        return TrendingUp;
      default:
        return Bell;
    }
  };

  if (!phone) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center transition-all hover:bg-gray-50 hover:border-gray-300"
      >
        {unreadCount > 0 ? (
          <>
            <BellDot className="w-5 h-5 text-blue-600" />
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          </>
        ) : (
          <Bell className="w-5 h-5 text-gray-600" />
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute left-0 sm:right-0 sm:left-auto top-full mt-2 w-[90vw] sm:w-96 max-h-[70vh] bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-4 duration-200">
            <div className="sticky top-0 bg-white border-b border-gray-100 p-4 z-10">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Bell className="w-4 h-4 text-blue-600" />
                  </div>
                  <h3 className="font-bold text-gray-900">Notifications</h3>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-red-100 text-red-600">
                      {unreadCount}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-all"
                >
                  <X className="w-4 h-4 text-gray-600" />
                </button>
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllAsRead()}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  <Check className="w-3 h-3" />
                  Mark all as read
                </button>
              )}
            </div>

            <div className="overflow-y-auto max-h-[calc(70vh-80px)]">
              {loading && (
                <div className="p-8 text-center">
                  <div className="w-8 h-8 rounded-full border-2 border-blue-200 border-t-blue-600 animate-spin mx-auto" />
                </div>
              )}

              {!loading && notifications.length === 0 && (
                <div className="p-8 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
                    <Bell className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-sm font-semibold text-gray-900 mb-1">No Notifications</p>
                  <p className="text-xs text-gray-500">You're all caught up!</p>
                </div>
              )}

              {!loading && notifications.map((notification) => {
                const priorityConfig = getPriorityColor(notification.priority);
                const TypeIcon = getTypeIcon(notification.notification_type);
                const PriorityIcon = priorityConfig.icon;

                return (
                  <button
                    key={notification.id}
                    onClick={() => {
                      if (!notification.is_read) {
                        markAsRead(notification.id);
                      }
                    }}
                    className={`w-full p-4 text-left transition-all hover:bg-gray-50 border-b border-gray-50 ${
                      !notification.is_read ? 'bg-blue-50/50' : ''
                    }`}
                  >
                    <div className="flex gap-3">
                      <div
                        className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{ background: priorityConfig.bg }}
                      >
                        <TypeIcon className="w-5 h-5" style={{ color: priorityConfig.color }} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h4 className="text-sm font-bold text-gray-900">
                            {notification.title}
                          </h4>
                          {!notification.is_read && (
                            <div className="w-2 h-2 rounded-full bg-blue-600 flex-shrink-0 mt-1.5" />
                          )}
                        </div>

                        <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                          {notification.message}
                        </p>

                        <div className="flex items-center gap-3 text-[10px] text-gray-500">
                          {notification.match_score && (
                            <div className="flex items-center gap-1">
                              <TrendingUp className="w-3 h-3" />
                              <span className="font-semibold">
                                {Math.round(notification.match_score)}% Match
                              </span>
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <PriorityIcon className="w-3 h-3" />
                            <span className="capitalize">{notification.priority}</span>
                          </div>
                          <span>
                            {new Date(notification.created_at).toLocaleDateString('ar-SA', {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
