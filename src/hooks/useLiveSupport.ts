import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface SupportTicket {
  id: string;
  ticket_number: string;
  user_phone: string;
  user_name: string;
  subject: string;
  category: 'technical' | 'billing' | 'general' | 'account' | 'order' | 'inventory' | 'deal';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  unread_messages?: number;
}

export interface SupportMessage {
  id: string;
  ticket_id: string;
  sender_type: 'user' | 'support';
  sender_id: string;
  sender_name: string;
  message: string;
  attachments: any[];
  is_read: boolean;
  created_at: string;
}

export function useLiveSupport(userPhone?: string) {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [currentTicket, setCurrentTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUserTickets = async () => {
    if (!userPhone) return;

    try {
      const { data, error: err } = await supabase.rpc('get_user_tickets', {
        p_user_phone: userPhone
      });

      if (err) throw err;
      setTickets(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل تحميل التذاكر');
    }
  };

  const fetchTicketMessages = async (ticketId: string) => {
    try {
      const { data, error: err } = await supabase.rpc('get_ticket_messages', {
        p_ticket_id: ticketId
      });

      if (err) throw err;
      setMessages(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل تحميل الرسائل');
    }
  };

  const createTicket = async (
    subject: string,
    category: string,
    initialMessage: string,
    priority: string = 'medium'
  ) => {
    if (!userPhone) {
      return { success: false, error: 'يجب تسجيل الدخول أولاً' };
    }

    try {
      const { data: profileData } = await supabase
        .from('users')
        .select('name')
        .eq('phone', userPhone)
        .single();

      const userName = profileData?.name || 'مستخدم';

      const { data, error: err } = await supabase.rpc('create_support_ticket', {
        p_user_phone: userPhone,
        p_user_name: userName,
        p_subject: subject,
        p_category: category,
        p_initial_message: initialMessage,
        p_priority: priority
      });

      if (err) throw err;

      await fetchUserTickets();
      return { success: true, data };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'فشل إنشاء التذكرة';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  const sendMessage = async (
    ticketId: string,
    message: string,
    attachments: any[] = []
  ) => {
    if (!userPhone) {
      return { success: false, error: 'يجب تسجيل الدخول أولاً' };
    }

    try {
      const { data: profileData } = await supabase
        .from('users')
        .select('name')
        .eq('phone', userPhone)
        .single();

      const userName = profileData?.name || 'مستخدم';

      const { data, error: err } = await supabase.rpc('send_support_message', {
        p_ticket_id: ticketId,
        p_sender_type: 'user',
        p_sender_id: userPhone,
        p_sender_name: userName,
        p_message: message,
        p_attachments: attachments
      });

      if (err) throw err;

      await fetchTicketMessages(ticketId);
      return { success: true, data };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'فشل إرسال الرسالة';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  const closeTicket = async (ticketId: string) => {
    try {
      const { data, error: err } = await supabase.rpc('update_ticket_status', {
        p_ticket_id: ticketId,
        p_status: 'closed'
      });

      if (err) throw err;

      await fetchUserTickets();
      return { success: true, data };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'فشل إغلاق التذكرة';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  const rateTicket = async (
    ticketId: string,
    rating: number,
    feedback?: string
  ) => {
    if (!userPhone) {
      return { success: false, error: 'يجب تسجيل الدخول أولاً' };
    }

    try {
      const { data, error: err } = await supabase.rpc('rate_support_ticket', {
        p_ticket_id: ticketId,
        p_user_phone: userPhone,
        p_rating: rating,
        p_feedback: feedback || null
      });

      if (err) throw err;

      return { success: true, data };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'فشل تقييم التذكرة';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  const selectTicket = async (ticket: SupportTicket) => {
    setCurrentTicket(ticket);
    await fetchTicketMessages(ticket.id);
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchUserTickets();
      setLoading(false);
    };

    if (userPhone) {
      init();

      const ticketsChannel = supabase
        .channel('support_tickets_changes')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'support_tickets',
          filter: `user_phone=eq.${userPhone}`
        }, () => {
          fetchUserTickets();
        })
        .subscribe();

      return () => {
        ticketsChannel.unsubscribe();
      };
    }
  }, [userPhone]);

  useEffect(() => {
    if (currentTicket) {
      const messagesChannel = supabase
        .channel(`support_messages_${currentTicket.id}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'support_messages',
          filter: `ticket_id=eq.${currentTicket.id}`
        }, () => {
          fetchTicketMessages(currentTicket.id);
        })
        .subscribe();

      return () => {
        messagesChannel.unsubscribe();
      };
    }
  }, [currentTicket]);

  return {
    tickets,
    currentTicket,
    messages,
    loading,
    error,
    createTicket,
    sendMessage,
    closeTicket,
    rateTicket,
    selectTicket,
    refresh: fetchUserTickets
  };
}
