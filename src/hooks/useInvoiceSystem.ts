import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface Invoice {
  id: string;
  invoice_number: string;
  deal_id: string;
  buyer_phone: string;
  supplier_phone: string;
  invoice_type: 'buyer_invoice' | 'supplier_invoice' | 'commission_invoice';
  invoice_date: string;
  due_date: string;
  subtotal: number;
  platform_fee: number;
  tax_amount: number;
  total_amount: number;
  currency: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  payment_date: string | null;
  invoice_items: any[];
  notes: string | null;
  pdf_url: string | null;
  sent_at: string | null;
  sent_to_email: string | null;
}

export interface InvoiceSettings {
  id: string;
  company_name: string;
  company_address: string;
  company_phone: string | null;
  company_email: string | null;
  tax_number: string | null;
  auto_generate: boolean;
  auto_send: boolean;
  payment_terms_days: number;
  invoice_prefix: string;
  invoice_footer: string;
}

export function useInvoiceSystem() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [settings, setSettings] = useState<InvoiceSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInvoices = async (status?: string, type?: string) => {
    try {
      const { data, error: err } = await supabase.rpc('admin_get_invoices', {
        p_status: status || null,
        p_invoice_type: type || null,
        p_limit: 100
      });

      if (err) throw err;
      setInvoices(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل تحميل الفواتير');
    }
  };

  const fetchSettings = async () => {
    try {
      const { data, error: err } = await supabase
        .from('invoice_settings')
        .select('*')
        .limit(1)
        .single();

      if (err) throw err;
      setSettings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل تحميل إعدادات الفواتير');
    }
  };

  const createInvoice = async (dealId: string, invoiceType: 'buyer_invoice' | 'supplier_invoice') => {
    try {
      const { data, error: err } = await supabase.rpc('create_invoice_for_deal', {
        p_deal_id: dealId,
        p_invoice_type: invoiceType
      });

      if (err) throw err;

      await fetchInvoices();
      return { success: true, data };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'فشل إنشاء الفاتورة';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  const getInvoiceById = async (invoiceId: string) => {
    try {
      const { data, error: err } = await supabase.rpc('get_invoice_by_id', {
        p_invoice_id: invoiceId
      });

      if (err) throw err;
      return { success: true, data };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'فشل تحميل الفاتورة';
      return { success: false, error: errorMsg };
    }
  };

  const updateInvoiceStatus = async (
    invoiceId: string,
    status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled',
    paymentDate?: string
  ) => {
    try {
      const { data, error: err } = await supabase.rpc('admin_update_invoice_status', {
        p_invoice_id: invoiceId,
        p_status: status,
        p_payment_date: paymentDate || null
      });

      if (err) throw err;

      await fetchInvoices();
      return { success: true, data };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'فشل تحديث حالة الفاتورة';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  const markAsPaid = async (invoiceId: string, paymentDate?: string) => {
    try {
      const { data, error: err } = await supabase.rpc('mark_invoice_as_paid', {
        p_invoice_id: invoiceId,
        p_payment_date: paymentDate || new Date().toISOString()
      });

      if (err) throw err;

      await fetchInvoices();
      return { success: true, data };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'فشل تحديد الفاتورة كمدفوعة';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  const updateSettings = async (newSettings: Partial<InvoiceSettings>) => {
    try {
      const { data, error: err } = await supabase.rpc('admin_configure_invoice_settings', {
        p_company_name: newSettings.company_name || null,
        p_company_address: newSettings.company_address || null,
        p_company_phone: newSettings.company_phone || null,
        p_company_email: newSettings.company_email || null,
        p_tax_number: newSettings.tax_number || null,
        p_auto_generate: newSettings.auto_generate ?? null,
        p_auto_send: newSettings.auto_send ?? null,
        p_payment_terms_days: newSettings.payment_terms_days || null,
        p_invoice_prefix: newSettings.invoice_prefix || null,
        p_invoice_footer: newSettings.invoice_footer || null
      });

      if (err) throw err;

      await fetchSettings();
      return { success: true, data };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'فشل تحديث الإعدادات';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchInvoices(), fetchSettings()]);
      setLoading(false);
    };

    init();

    const invoicesChannel = supabase
      .channel('invoices_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, () => {
        fetchInvoices();
      })
      .subscribe();

    const settingsChannel = supabase
      .channel('invoice_settings_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoice_settings' }, () => {
        fetchSettings();
      })
      .subscribe();

    return () => {
      invoicesChannel.unsubscribe();
      settingsChannel.unsubscribe();
    };
  }, []);

  return {
    invoices,
    settings,
    loading,
    error,
    createInvoice,
    getInvoiceById,
    updateInvoiceStatus,
    markAsPaid,
    updateSettings,
    refresh: async () => {
      await Promise.all([fetchInvoices(), fetchSettings()]);
    }
  };
}
