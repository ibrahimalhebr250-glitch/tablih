import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface AdminSupportConversation {
  user_phone: string;
  user_name: string;
  user_type: string;
  last_message: string;
  last_message_at: string;
  unread_count: number;
  total_messages: number;
  has_image: boolean;
}

export interface AdminSupportMessage {
  id: string;
  user_phone: string;
  sender: 'user' | 'admin';
  message: string;
  image_url: string | null;
  is_read: boolean;
  created_at: string;
}

export interface AdminSupportStats {
  total_conversations: number;
  total_messages: number;
  unread_messages: number;
  unanswered_conversations: number;
  messages_today: number;
  messages_this_week: number;
  avg_response_time_hours: number | null;
}

export function useAdminSupport(adminEmail: string) {
  const [conversations, setConversations] = useState<AdminSupportConversation[]>([]);
  const [messages, setMessages] = useState<AdminSupportMessage[]>([]);
  const [stats, setStats] = useState<AdminSupportStats | null>(null);
  const [activePhone, setActivePhone] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'unread' | 'unanswered'>('all');

  const fetchConversations = useCallback(async (searchVal?: string, filterVal?: string) => {
    try {
      const { data, error } = await supabase.rpc('admin_get_support_conversations', {
        p_admin_email: adminEmail,
        p_search: searchVal ?? null,
        p_filter: filterVal ?? 'all',
      });
      if (error) throw error;
      setConversations((data || []) as AdminSupportConversation[]);
    } catch {
      // silently fail
    }
  }, [adminEmail]);

  const fetchMessages = useCallback(async (phone: string) => {
    setMessagesLoading(true);
    try {
      const { data, error } = await supabase.rpc('admin_get_support_messages', {
        p_admin_email: adminEmail,
        p_user_phone: phone,
      });
      if (error) throw error;
      setMessages((data || []) as AdminSupportMessage[]);
      await supabase.rpc('admin_mark_messages_read', {
        p_admin_email: adminEmail,
        p_user_phone: phone,
      });
      setConversations(prev =>
        prev.map(c => c.user_phone === phone ? { ...c, unread_count: 0 } : c)
      );
    } catch {
      setMessages([]);
    } finally {
      setMessagesLoading(false);
    }
  }, [adminEmail]);

  const fetchStats = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('admin_get_support_stats', {
        p_admin_email: adminEmail,
      });
      if (error) throw error;
      setStats(data as AdminSupportStats);
    } catch {
      // silently fail
    }
  }, [adminEmail]);

  const selectConversation = useCallback(async (phone: string) => {
    setActivePhone(phone);
    await fetchMessages(phone);
  }, [fetchMessages]);

  const sendMessage = useCallback(async (message: string, imageUrl?: string) => {
    if (!activePhone || !message.trim()) return { success: false };
    setSending(true);
    try {
      const { data, error } = await supabase.rpc('admin_send_support_message', {
        p_admin_email: adminEmail,
        p_user_phone: activePhone,
        p_message: message.trim(),
        p_image_url: imageUrl ?? null,
      });
      if (error) throw error;
      const result = data as { success: boolean; error?: string };
      if (result.success) {
        await fetchMessages(activePhone);
        await fetchConversations(search, filter);
      }
      return result;
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : 'خطأ' };
    } finally {
      setSending(false);
    }
  }, [activePhone, adminEmail, fetchMessages, fetchConversations, search, filter]);

  const uploadImage = useCallback(async (file: File): Promise<string | null> => {
    try {
      const ext = file.name.split('.').pop();
      const path = `support-admin/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('support-images')
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('support-images').getPublicUrl(path);
      return data.publicUrl;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    Promise.all([
      fetchConversations(),
      fetchStats(),
    ]).finally(() => setLoading(false));
  }, [fetchConversations, fetchStats]);

  useEffect(() => {
    const channel = supabase
      .channel('admin-support-realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'support_messages',
      }, async (payload) => {
        const newMsg = payload.new as AdminSupportMessage;
        if (newMsg.sender === 'user') {
          await fetchConversations(search, filter);
          await fetchStats();
          if (activePhone === newMsg.user_phone) {
            setMessages(prev => [...prev, newMsg]);
            await supabase.rpc('admin_mark_messages_read', {
              p_admin_email: adminEmail,
              p_user_phone: newMsg.user_phone,
            });
          }
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activePhone, adminEmail, fetchConversations, fetchStats, search, filter]);

  const applySearch = useCallback((val: string) => {
    setSearch(val);
    fetchConversations(val, filter);
  }, [fetchConversations, filter]);

  const applyFilter = useCallback((val: 'all' | 'unread' | 'unanswered') => {
    setFilter(val);
    fetchConversations(search, val);
  }, [fetchConversations, search]);

  const totalUnread = conversations.reduce((sum, c) => sum + c.unread_count, 0);

  return {
    conversations,
    messages,
    stats,
    activePhone,
    loading,
    messagesLoading,
    sending,
    search,
    filter,
    totalUnread,
    selectConversation,
    sendMessage,
    uploadImage,
    applySearch,
    applyFilter,
    fetchConversations,
    fetchStats,
  };
}
