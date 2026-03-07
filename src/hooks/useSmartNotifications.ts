import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

interface SmartNotification {
  id: string;
  notification_type: 'match_found' | 'better_match' | 'score_update' | 'inventory_alert';
  title: string;
  message: string;
  priority: 'high' | 'medium' | 'low';
  related_order_id?: string;
  related_batch_id?: string;
  match_score?: number;
  metadata: any;
  is_read: boolean;
  created_at: string;
  order_details?: {
    id: string;
    pallet_type: string;
    size: string;
    quality: string;
    quantity: number;
    city: string;
    status: string;
  };
  batch_details?: {
    id: string;
    pallet_type: string;
    size: string;
    quality: string;
    available_quantity: number;
    city: string;
    price_per_pallet: number;
  };
}

export function useSmartNotifications(phone?: string) {
  const [notifications, setNotifications] = useState<SmartNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    if (!phone) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase.rpc('get_user_notifications', {
        p_phone: phone,
        p_limit: 50,
        p_unread_only: false,
      });

      if (error) throw error;

      setNotifications(data || []);
      setUnreadCount(data?.filter((n: SmartNotification) => !n.is_read).length || 0);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [phone]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Realtime subscription
  useEffect(() => {
    if (!phone) return;

    const channel = supabase
      .channel('smart-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'smart_notifications',
          filter: `user_phone=eq.${phone}`,
        },
        (payload) => {
          const newNotification = payload.new as SmartNotification;
          setNotifications((prev) => [newNotification, ...prev]);
          setUnreadCount((prev) => prev + 1);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'smart_notifications',
          filter: `user_phone=eq.${phone}`,
        },
        (payload) => {
          const updated = payload.new as SmartNotification;
          setNotifications((prev) =>
            prev.map((n) => (n.id === updated.id ? updated : n))
          );
          if (updated.is_read) {
            setUnreadCount((prev) => Math.max(0, prev - 1));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [phone]);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const { error } = await supabase.rpc('mark_notification_read', {
        p_notification_id: notificationId,
      });

      if (error) throw error;

      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, is_read: true } : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      const unreadIds = notifications
        .filter((n) => !n.is_read)
        .map((n) => n.id);

      await Promise.all(
        unreadIds.map((id) =>
          supabase.rpc('mark_notification_read', {
            p_notification_id: id,
          })
        )
      );

      setNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true }))
      );
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  }, [notifications]);

  const getHighPriorityNotifications = useCallback(() => {
    return notifications.filter((n) => n.priority === 'high' && !n.is_read);
  }, [notifications]);

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    getHighPriorityNotifications,
    refresh: fetchNotifications,
  };
}
