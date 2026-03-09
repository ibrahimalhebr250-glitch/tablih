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
  deal_completion_rate: number | null;
  avg_deal_completion_hours: number | null;
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
  deal_status_at_contact: string | null;
  is_duplicate: boolean;
}

export interface SilentDeal {
  deal_id: string;
  deal_ref: string;
  status: string;
  pallet_type: string;
  size: string;
  quality: string;
  quantity: number;
  city: string;
  supplier_phone: string;
  buyer_phone: string;
  supplier_name: string;
  buyer_name: string;
  hours_since_reserved: number;
  final_price: number;
}

export interface ReengagementCandidate {
  user_id: string;
  phone: string;
  display_name: string | null;
  company_name: string | null;
  user_type: string;
  city: string | null;
  total_deals: number;
  last_deal_at: string | null;
  last_admin_contacted_at: string | null;
  days_inactive: number;
  trust_rating: number | null;
}

export interface WhatsAppStats {
  total_contacts: number;
  contacts_today: number;
  contacts_this_week: number;
  contacts_this_month: number;
  duplicate_contacts: number;
  by_role: { buyer_initiated: number; supplier_initiated: number };
  by_stage: Record<string, number> | null;
  hourly_distribution: { hour: number; count: number }[] | null;
  daily_distribution: { day: number; count: number }[] | null;
  top_deals: { deal_ref: string; contact_count: number }[] | null;
  silent_deals_count: number;
}

export function useWhatsAppTemplates(adminEmail?: string) {
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [logs, setLogs] = useState<WhatsAppContactLog[]>([]);
  const [stats, setStats] = useState<WhatsAppStats | null>(null);
  const [silentDeals, setSilentDeals] = useState<SilentDeal[]>([]);
  const [reengagementCandidates, setReengagementCandidates] = useState<ReengagementCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(false);
  const [silentLoading, setSilentLoading] = useState(false);
  const [outreachLoading, setOutreachLoading] = useState(false);
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

  const fetchSilentDeals = useCallback(async (hoursThreshold = 24) => {
    setSilentLoading(true);
    try {
      const { data, error: err } = await supabase.rpc('get_silent_deals', {
        p_hours_threshold: hoursThreshold,
      });
      if (err) throw err;
      setSilentDeals((data || []) as SilentDeal[]);
    } catch {
      setSilentDeals([]);
    } finally {
      setSilentLoading(false);
    }
  }, []);

  const fetchReengagementCandidates = useCallback(async (params?: {
    inactive_days?: number;
    city?: string;
    user_type?: string;
    min_deals?: number;
  }) => {
    setOutreachLoading(true);
    try {
      const { data, error: err } = await supabase.rpc('get_reengagement_candidates', {
        p_inactive_days: params?.inactive_days ?? 14,
        p_city: params?.city ?? null,
        p_user_type: params?.user_type ?? null,
        p_min_deals: params?.min_deals ?? 1,
        p_limit: 50,
      });
      if (err) throw err;
      setReengagementCandidates((data || []) as ReengagementCandidate[]);
    } catch {
      setReengagementCandidates([]);
    } finally {
      setOutreachLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.all([
      fetchTemplates(),
      fetchStats(),
      fetchLogs(),
      fetchSilentDeals(),
    ]).finally(() => setLoading(false));
  }, [fetchTemplates, fetchStats, fetchLogs, fetchSilentDeals]);

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

  const markUserContacted = useCallback(async (phone: string) => {
    if (!adminEmail) return;
    await supabase.rpc('mark_admin_contacted_user', {
      p_admin_email: adminEmail,
      p_phone: phone,
    });
    await fetchReengagementCandidates();
  }, [adminEmail, fetchReengagementCandidates]);

  const refreshTemplateStats = useCallback(async () => {
    await supabase.rpc('refresh_template_performance_stats');
    await fetchTemplates();
  }, [fetchTemplates]);

  const getTemplateForRole = useCallback((role: 'buyer' | 'supplier'): WhatsAppTemplate | null => {
    return templates.find(t => t.is_active && t.is_default && (t.sender_role === role || t.sender_role === 'both')) ?? null;
  }, [templates]);

  const getNudgeTemplate = useCallback((): WhatsAppTemplate | null => {
    return templates.find(t => t.is_active && t.name === 'قالب المتابعة للصفقة الصامتة') ?? null;
  }, [templates]);

  const getReengagementTemplate = useCallback((): WhatsAppTemplate | null => {
    return templates.find(t => t.is_active && t.name === 'قالب إعادة الاستهداف - العودة للمنصة') ?? null;
  }, [templates]);

  return {
    templates,
    logs,
    stats,
    silentDeals,
    reengagementCandidates,
    loading,
    logsLoading,
    silentLoading,
    outreachLoading,
    error,
    saveTemplate,
    deleteTemplate,
    fetchLogs,
    fetchTemplates,
    fetchStats,
    fetchSilentDeals,
    fetchReengagementCandidates,
    markUserContacted,
    refreshTemplateStats,
    getTemplateForRole,
    getNudgeTemplate,
    getReengagementTemplate,
  };
}

export async function logWhatsAppContact(params: {
  deal_id?: string;
  deal_ref?: string;
  deal_status?: string;
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
      deal_status_at_contact: params.deal_status ?? null,
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
    // silently fail
  }
}

export function buildMessageFromTemplate(template: string, variables: Record<string, string>): string {
  let result = template;
  Object.entries(variables).forEach(([key, value]) => {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
  });
  return result;
}

export function buildAdminNudgeLink(phone: string, template: string, deal: SilentDeal): string {
  const cleanPhone = phone.replace(/^0/, '966').replace('+', '');
  const message = template
    .replace(/{{deal_ref}}/g, deal.deal_ref)
    .replace(/{{pallet_type}}/g, deal.pallet_type)
    .replace(/{{size}}/g, deal.size)
    .replace(/{{quality}}/g, deal.quality)
    .replace(/{{quantity}}/g, String(deal.quantity))
    .replace(/{{city}}/g, deal.city)
    .replace(/{{price}}/g, String(deal.final_price));
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

export function buildReengagementLink(phone: string, template: string): string {
  const cleanPhone = phone.replace(/^0/, '966').replace('+', '');
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(template)}`;
}
