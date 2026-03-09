import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface WhatsAppTemplate {
  id: string;
  name: string;
  sender_role: 'buyer' | 'supplier' | 'both';
  template_text: string;
  is_active: boolean;
  is_default: boolean;
  description: string;
  variables: string[];
  usage_count: number;
  created_at: string;
  updated_at: string;
}

export interface WhatsAppContactLog {
  id: string;
  deal_id: string | null;
  deal_ref: string | null;
  sender_phone: string;
  sender_role: 'buyer' | 'supplier';
  recipient_phone: string;
  template_id: string | null;
  template_name: string | null;
  message_preview: string | null;
  context_data: Record<string, unknown>;
  contacted_at: string;
}

export interface WhatsAppStats {
  total_contacts: number;
  contacts_today: number;
  contacts_this_week: number;
  contacts_this_month: number;
  by_role: {
    buyer_initiated: number;
    supplier_initiated: number;
  };
  top_deals: { deal_ref: string; contact_count: number }[] | null;
}

export function useWhatsAppTemplates(adminEmail?: string) {
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [logs, setLogs] = useState<WhatsAppContactLog[]>([]);
  const [stats, setStats] = useState<WhatsAppStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTemplates = useCallback(async () => {
    try {
      const { data, error: err } = await supabase
        .from('whatsapp_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (err) throw err;
      setTemplates((data || []) as WhatsAppTemplate[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطأ في تحميل القوالب');
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const { data, error: err } = await supabase.rpc('get_whatsapp_stats');
      if (err) throw err;
      setStats(data as WhatsAppStats);
    } catch {
      // silently fail
    }
  }, []);

  const fetchLogs = useCallback(async (filters?: {
    sender_role?: string;
    deal_ref?: string;
    date_from?: string;
    date_to?: string;
    limit?: number;
    offset?: number;
  }) => {
    setLogsLoading(true);
    try {
      const { data, error: err } = await supabase.rpc('get_whatsapp_contact_logs', {
        p_limit: filters?.limit ?? 50,
        p_offset: filters?.offset ?? 0,
        p_sender_role: filters?.sender_role ?? null,
        p_deal_ref: filters?.deal_ref ?? null,
        p_date_from: filters?.date_from ?? null,
        p_date_to: filters?.date_to ?? null,
      });
      if (err) throw err;
      setLogs((data || []) as WhatsAppContactLog[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطأ في تحميل السجلات');
    } finally {
      setLogsLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.all([fetchTemplates(), fetchStats(), fetchLogs()]).finally(() => setLoading(false));
  }, [fetchTemplates, fetchStats, fetchLogs]);

  const saveTemplate = useCallback(async (template: Partial<WhatsAppTemplate> & { id?: string }) => {
    if (!adminEmail) return { success: false, error: 'غير مصرح' };

    const { data, error: err } = await supabase.rpc('admin_upsert_whatsapp_template', {
      p_admin_email: adminEmail,
      p_id: template.id ?? null,
      p_name: template.name ?? null,
      p_sender_role: template.sender_role ?? null,
      p_template_text: template.template_text ?? null,
      p_is_active: template.is_active ?? true,
      p_description: template.description ?? '',
    });

    if (err) return { success: false, error: err.message };
    await fetchTemplates();
    return data as { success: boolean; error?: string; id?: string };
  }, [adminEmail, fetchTemplates]);

  const deleteTemplate = useCallback(async (id: string) => {
    if (!adminEmail) return { success: false, error: 'غير مصرح' };

    const { data, error: err } = await supabase.rpc('admin_delete_whatsapp_template', {
      p_admin_email: adminEmail,
      p_id: id,
    });

    if (err) return { success: false, error: err.message };
    await fetchTemplates();
    return data as { success: boolean; error?: string };
  }, [adminEmail, fetchTemplates]);

  const getTemplateForRole = useCallback((role: 'buyer' | 'supplier'): WhatsAppTemplate | null => {
    return templates.find(t => t.is_active && t.is_default && (t.sender_role === role || t.sender_role === 'both')) ?? null;
  }, [templates]);

  return {
    templates,
    logs,
    stats,
    loading,
    logsLoading,
    error,
    saveTemplate,
    deleteTemplate,
    fetchLogs,
    fetchTemplates,
    fetchStats,
    getTemplateForRole,
  };
}

export async function logWhatsAppContact(params: {
  deal_id?: string;
  deal_ref?: string;
  sender_phone: string;
  sender_role: 'buyer' | 'supplier';
  recipient_phone: string;
  template_id?: string;
  message_preview?: string;
  context_data?: Record<string, unknown>;
}) {
  try {
    await supabase.from('whatsapp_contact_logs').insert({
      deal_id: params.deal_id ?? null,
      deal_ref: params.deal_ref ?? null,
      sender_phone: params.sender_phone,
      sender_role: params.sender_role,
      recipient_phone: params.recipient_phone,
      template_id: params.template_id ?? null,
      message_preview: params.message_preview ?? null,
      context_data: params.context_data ?? {},
    });

    if (params.template_id) {
      await supabase.rpc('increment_whatsapp_template_usage', { p_template_id: params.template_id });
    }
  } catch {
    // silently fail - don't block the user
  }
}

export function buildMessageFromTemplate(template: string, variables: Record<string, string>): string {
  let result = template;
  Object.entries(variables).forEach(([key, value]) => {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
  });
  return result;
}
