import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface APIKey {
  id: string;
  key: string;
  key_name: string;
  permissions: string[];
  rate_limit: number;
  is_active: boolean;
  last_used: string | null;
  created_at: string;
  expires_at: string | null;
}

export interface Webhook {
  id: string;
  webhook_url: string;
  webhook_name: string;
  events: string[];
  secret_key: string;
  is_active: boolean;
  retry_count: number;
  last_triggered: string | null;
  total_calls: number;
  failed_calls: number;
  created_at: string;
}

export interface WebhookDelivery {
  id: string;
  webhook_id: string;
  event_type: string;
  payload: any;
  status: 'pending' | 'delivered' | 'failed';
  response_code: number | null;
  attempt_count: number;
  delivered_at: string | null;
  created_at: string;
}

export interface APIUsageStats {
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  avg_response_time_ms: number;
}

export function useAPIIntegration(userPhone?: string) {
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [usageStats, setUsageStats] = useState<APIUsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAPIKeys = async () => {
    if (!userPhone) return;

    try {
      const { data, error: err } = await supabase
        .from('api_keys')
        .select('*')
        .eq('user_phone', userPhone)
        .order('created_at', { ascending: false });

      if (err) throw err;
      setApiKeys(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل تحميل مفاتيح API');
    }
  };

  const fetchWebhooks = async () => {
    if (!userPhone) return;

    try {
      const { data, error: err } = await supabase
        .from('webhooks')
        .select('*')
        .eq('user_phone', userPhone)
        .order('created_at', { ascending: false });

      if (err) throw err;
      setWebhooks(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل تحميل Webhooks');
    }
  };

  const fetchUsageStats = async () => {
    if (!userPhone) return;

    try {
      const { data, error: err } = await supabase.rpc('get_api_usage_stats', {
        p_user_phone: userPhone
      });

      if (err) throw err;
      setUsageStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل تحميل إحصائيات الاستخدام');
    }
  };

  const createAPIKey = async (
    keyName: string,
    permissions: string[] = ['read'],
    rateLimit: number = 1000,
    expiresDays?: number
  ) => {
    if (!userPhone) {
      return { success: false, error: 'يجب تسجيل الدخول أولاً' };
    }

    try {
      const { data, error: err } = await supabase.rpc('create_api_key', {
        p_user_phone: userPhone,
        p_key_name: keyName,
        p_permissions: permissions,
        p_rate_limit: rateLimit,
        p_expires_days: expiresDays || null
      });

      if (err) throw err;

      await fetchAPIKeys();
      return { success: true, data };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'فشل إنشاء مفتاح API';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  const toggleAPIKey = async (keyId: string, isActive: boolean) => {
    try {
      const { error: err } = await supabase
        .from('api_keys')
        .update({ is_active: isActive })
        .eq('id', keyId);

      if (err) throw err;

      await fetchAPIKeys();
      return { success: true };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'فشل تحديث المفتاح';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  const deleteAPIKey = async (keyId: string) => {
    try {
      const { error: err } = await supabase
        .from('api_keys')
        .delete()
        .eq('id', keyId);

      if (err) throw err;

      await fetchAPIKeys();
      return { success: true };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'فشل حذف المفتاح';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  const createWebhook = async (
    webhookUrl: string,
    webhookName: string,
    events: string[] = []
  ) => {
    if (!userPhone) {
      return { success: false, error: 'يجب تسجيل الدخول أولاً' };
    }

    try {
      const { data, error: err } = await supabase.rpc('create_webhook', {
        p_user_phone: userPhone,
        p_webhook_url: webhookUrl,
        p_webhook_name: webhookName,
        p_events: events
      });

      if (err) throw err;

      await fetchWebhooks();
      return { success: true, data };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'فشل إنشاء Webhook';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  const toggleWebhook = async (webhookId: string, isActive: boolean) => {
    try {
      const { error: err } = await supabase
        .from('webhooks')
        .update({ is_active: isActive })
        .eq('id', webhookId);

      if (err) throw err;

      await fetchWebhooks();
      return { success: true };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'فشل تحديث Webhook';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  const deleteWebhook = async (webhookId: string) => {
    try {
      const { error: err } = await supabase
        .from('webhooks')
        .delete()
        .eq('id', webhookId);

      if (err) throw err;

      await fetchWebhooks();
      return { success: true };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'فشل حذف Webhook';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  const getWebhookDeliveries = async (webhookId: string) => {
    try {
      const { data, error: err } = await supabase
        .from('webhook_deliveries')
        .select('*')
        .eq('webhook_id', webhookId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (err) throw err;
      setDeliveries(data || []);
      return { success: true, data };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'فشل تحميل سجل التسليم';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  useEffect(() => {
    const init = async () => {
      if (!userPhone) return;

      setLoading(true);
      await Promise.all([
        fetchAPIKeys(),
        fetchWebhooks(),
        fetchUsageStats()
      ]);
      setLoading(false);
    };

    init();

    if (userPhone) {
      const keysChannel = supabase
        .channel('api_keys_changes')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'api_keys',
          filter: `user_phone=eq.${userPhone}`
        }, () => {
          fetchAPIKeys();
        })
        .subscribe();

      const webhooksChannel = supabase
        .channel('webhooks_changes')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'webhooks',
          filter: `user_phone=eq.${userPhone}`
        }, () => {
          fetchWebhooks();
        })
        .subscribe();

      return () => {
        keysChannel.unsubscribe();
        webhooksChannel.unsubscribe();
      };
    }
  }, [userPhone]);

  return {
    apiKeys,
    webhooks,
    deliveries,
    usageStats,
    loading,
    error,
    createAPIKey,
    toggleAPIKey,
    deleteAPIKey,
    createWebhook,
    toggleWebhook,
    deleteWebhook,
    getWebhookDeliveries,
    refresh: async () => {
      await Promise.all([
        fetchAPIKeys(),
        fetchWebhooks(),
        fetchUsageStats()
      ]);
    }
  };
}
