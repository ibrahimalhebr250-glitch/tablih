import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface SupportMessage {
  id: string;
  user_phone: string;
  sender: 'user' | 'admin';
  message: string;
  image_url: string | null;
  is_read: boolean;
  created_at: string;
}

export interface NotificationPrefs {
  deals_notifications: boolean;
  orders_notifications: boolean;
  matching_notifications: boolean;
}

export function useSettings(phone: string) {
  const [supportMessages, setSupportMessages] = useState<SupportMessage[]>([]);
  const [notifPrefs, setNotifPrefs] = useState<NotificationPrefs>({
    deals_notifications: true,
    orders_notifications: true,
    matching_notifications: true,
  });
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [sendingSuggestion, setSendingSuggestion] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  const fetchSupportMessages = useCallback(async () => {
    if (!phone) return;
    setLoadingMessages(true);
    const { data } = await supabase
      .from('support_messages')
      .select('*')
      .eq('user_phone', phone)
      .order('created_at', { ascending: true });
    setSupportMessages(data ?? []);
    setLoadingMessages(false);
  }, [phone]);

  const fetchNotifPrefs = useCallback(async () => {
    if (!phone) return;
    const { data } = await supabase
      .from('user_notification_preferences')
      .select('*')
      .eq('user_phone', phone)
      .maybeSingle();
    if (data) {
      setNotifPrefs({
        deals_notifications: data.deals_notifications,
        orders_notifications: data.orders_notifications,
        matching_notifications: data.matching_notifications,
      });
    }
  }, [phone]);

  useEffect(() => {
    if (!phone) return;
    fetchSupportMessages();
    fetchNotifPrefs();

    const channel = supabase
      .channel(`support-user-${phone}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'support_messages',
        filter: `user_phone=eq.${phone}`,
      }, (payload) => {
        const msg = payload.new as SupportMessage;
        setSupportMessages(prev => {
          if (prev.find(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'support_messages',
        filter: `user_phone=eq.${phone}`,
      }, (payload) => {
        const updated = payload.new as SupportMessage;
        setSupportMessages(prev => prev.map(m => m.id === updated.id ? updated : m));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchSupportMessages, fetchNotifPrefs, phone]);

  const sendSupportMessage = useCallback(async (message: string, imageUrl?: string) => {
    if (!phone || !message.trim()) return { success: false };
    setSendingMessage(true);
    const { error } = await supabase.from('support_messages').insert({
      user_phone: phone,
      sender: 'user',
      message: message.trim(),
      image_url: imageUrl ?? null,
    });
    setSendingMessage(false);
    if (error) return { success: false, error: error.message };
    await fetchSupportMessages();
    return { success: true };
  }, [phone, fetchSupportMessages]);

  const submitSuggestion = useCallback(async (message: string, displayName: string) => {
    if (!phone || !message.trim()) return { success: false };
    setSendingSuggestion(true);
    const { error } = await supabase.from('user_suggestions').insert({
      user_phone: phone,
      display_name: displayName,
      message: message.trim(),
    });
    setSendingSuggestion(false);
    if (error) return { success: false, error: error.message };
    return { success: true };
  }, [phone]);

  const updateNotifPrefs = useCallback(async (prefs: Partial<NotificationPrefs>) => {
    if (!phone) return;
    const newPrefs = { ...notifPrefs, ...prefs };
    setNotifPrefs(newPrefs);
    await supabase
      .from('user_notification_preferences')
      .upsert({ user_phone: phone, ...newPrefs, updated_at: new Date().toISOString() }, { onConflict: 'user_phone' });
  }, [phone, notifPrefs]);

  const updateDisplayName = useCallback(async (displayName: string) => {
    if (!phone || !displayName.trim()) return { success: false };
    setSavingProfile(true);
    const { error } = await supabase
      .from('platform_users')
      .update({ display_name: displayName.trim() })
      .eq('phone', phone);
    setSavingProfile(false);
    if (error) return { success: false, error: error.message };
    return { success: true };
  }, [phone]);

  const updateWhatsApp = useCallback(async (whatsappPhone: string) => {
    if (!phone) return { success: false };
    setSavingProfile(true);
    const { error } = await supabase
      .from('platform_users')
      .update({ whatsapp_phone: whatsappPhone.trim() || null })
      .eq('phone', phone);
    setSavingProfile(false);
    if (error) return { success: false, error: error.message };
    return { success: true };
  }, [phone]);

  const uploadSupportImage = useCallback(async (file: File): Promise<string | null> => {
    const ext = file.name.split('.').pop();
    const path = `support-user/${phone}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from('support-images')
      .upload(path, file, { cacheControl: '3600', upsert: true });
    if (error) return null;
    const { data } = supabase.storage.from('support-images').getPublicUrl(path);
    return data.publicUrl;
  }, [phone]);

  return {
    supportMessages,
    notifPrefs,
    loadingMessages,
    sendingMessage,
    sendingSuggestion,
    savingProfile,
    sendSupportMessage,
    submitSuggestion,
    updateNotifPrefs,
    updateDisplayName,
    updateWhatsApp,
    uploadSupportImage,
    refreshMessages: fetchSupportMessages,
  };
}
