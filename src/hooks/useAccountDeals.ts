import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Deal } from '../types/deal';

const DEAL_COLUMNS = 'id, deal_ref, request_id, order_id, inventory_batch_id, buyer_phone, supplier_phone, pallet_type, size, quality, city, quantity, final_price, supplier_price, platform_fee, platform_fee_per_pallet, buyer_price, status, supplier_confirmed_at, buyer_confirmed_at, reserved_at, delivery_started_at, delivery_failed_at, completed_at, cancelled_at, cancel_reason, is_suspended, admin_notes, execution_deadline, execution_hours, created_at, updated_at';

export interface CounterpartyInfo {
  display_name: string;
  company_name: string;
  phone: string;
}

const ACTIVE_STATUSES = ['pending_supplier', 'matched', 'supplier_confirmed', 'awaiting_buyer', 'inventory_reserved', 'in_delivery', 'execution_in_progress'];
const COMPLETED_STATUSES = ['completed'];
const CANCELLED_STATUSES = ['cancelled'];

export function useAccountDeals(phone: string) {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [counterpartyMap, setCounterpartyMap] = useState<Record<string, CounterpartyInfo>>({});
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchDeals = useCallback(async () => {
    if (!phone) { setLoading(false); return; }
    setLoading(true);

    const { data } = await supabase
      .from('deals')
      .select(DEAL_COLUMNS)
      .or(`buyer_phone.eq.${phone},supplier_phone.eq.${phone}`)
      .order('created_at', { ascending: false });

    const fetched: Deal[] = (data as Deal[]) ?? [];
    setDeals(fetched);

    const otherPhones = [...new Set(
      fetched.map(d => d.buyer_phone === phone ? d.supplier_phone : d.buyer_phone).filter(Boolean)
    )];

    if (otherPhones.length > 0) {
      const { data: users } = await supabase
        .from('platform_users')
        .select('phone, display_name, company_name')
        .in('phone', otherPhones);

      if (users) {
        const info: Record<string, CounterpartyInfo> = {};
        for (const u of users) {
          info[u.phone] = { display_name: u.display_name ?? '', company_name: u.company_name ?? '', phone: u.phone };
        }
        setCounterpartyMap(info);
      }
    }

    setLoading(false);
  }, [phone]);

  useEffect(() => {
    fetchDeals();

    const buyerChannel = supabase
      .channel(`account-deals-buyer-${phone}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'deals',
        filter: `buyer_phone=eq.${phone}`,
      }, () => { fetchDeals(); })
      .subscribe();

    const supplierChannel = supabase
      .channel(`account-deals-supplier-${phone}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'deals',
        filter: `supplier_phone=eq.${phone}`,
      }, () => { fetchDeals(); })
      .subscribe();

    return () => {
      supabase.removeChannel(buyerChannel);
      supabase.removeChannel(supplierChannel);
    };
  }, [fetchDeals, phone]);

  const activeDeals = deals.filter(d => ACTIVE_STATUSES.includes(d.status));
  const completedDeals = deals.filter(d => COMPLETED_STATUSES.includes(d.status));
  const cancelledDeals = deals.filter(d => CANCELLED_STATUSES.includes(d.status));

  const getCounterparty = useCallback((deal: Deal): CounterpartyInfo | null => {
    const otherPhone = deal.buyer_phone === phone ? deal.supplier_phone : deal.buyer_phone;
    return counterpartyMap[otherPhone] ?? null;
  }, [counterpartyMap, phone]);

  const isBuyer = useCallback((deal: Deal) => deal.buyer_phone === phone, [phone]);

  const supplierConfirm = useCallback(async (dealId: string) => {
    setActionLoading(dealId);
    const { data, error } = await supabase.rpc('supplier_confirm_deal_v4', { p_deal_id: dealId, p_supplier_phone: phone });
    setActionLoading(null);
    if (error) return { success: false, error: error.message };
    if (!data?.success) return { success: false, error: data?.error ?? 'فشلت العملية' };
    await fetchDeals();
    return { success: true };
  }, [phone, fetchDeals]);

  const buyerConfirm = useCallback(async (dealId: string) => {
    setActionLoading(dealId);
    const { data, error } = await supabase.rpc('buyer_confirm_deal_v4', { p_deal_id: dealId, p_buyer_phone: phone });
    setActionLoading(null);
    if (error) return { success: false, error: error.message };
    if (!data?.success) return { success: false, error: data?.error ?? 'فشلت العملية' };
    await fetchDeals();
    return { success: true };
  }, [phone, fetchDeals]);

  const buyerConfirmWithDeadline = useCallback(async (dealId: string, executionHours: number) => {
    setActionLoading(dealId);
    const { data, error } = await supabase.rpc('buyer_confirm_deal_with_deadline_v4', {
      p_deal_id: dealId,
      p_buyer_phone: phone,
      p_execution_hours: executionHours,
    });
    setActionLoading(null);
    if (error) return { success: false, error: error.message };
    if (!data?.success) return { success: false, error: data?.error ?? 'فشلت العملية' };
    await fetchDeals();
    return { success: true };
  }, [phone, fetchDeals]);

  const startDelivery = useCallback(async (dealId: string) => {
    setActionLoading(dealId);
    const { data, error } = await supabase.rpc('supplier_start_delivery_v4', { p_deal_id: dealId, p_supplier_phone: phone });
    setActionLoading(null);
    if (error) return { success: false, error: error.message };
    if (!data?.success) return { success: false, error: data?.error ?? 'فشلت العملية' };
    await fetchDeals();
    return { success: true };
  }, [phone, fetchDeals]);

  const confirmDelivery = useCallback(async (dealId: string) => {
    setActionLoading(dealId);
    const { data, error } = await supabase.rpc('supplier_confirm_delivery_v4', { p_deal_id: dealId, p_supplier_phone: phone });
    setActionLoading(null);
    if (error) return { success: false, error: error.message };
    if (!data?.success) return { success: false, error: data?.error ?? 'فشلت العملية' };
    await fetchDeals();
    return { success: true };
  }, [phone, fetchDeals]);

  const failDelivery = useCallback(async (dealId: string) => {
    setActionLoading(dealId);
    const { data, error } = await supabase.rpc('supplier_fail_delivery_v4', { p_deal_id: dealId, p_supplier_phone: phone });
    setActionLoading(null);
    if (error) return { success: false, error: error.message };
    if (!data?.success) return { success: false, error: data?.error ?? 'فشلت العملية' };
    await fetchDeals();
    return { success: true };
  }, [phone, fetchDeals]);

  const cancelDeal = useCallback(async (dealId: string) => {
    setActionLoading(dealId);
    const { data, error } = await supabase.rpc('supplier_cancel_deal_v4', { p_deal_id: dealId, p_supplier_phone: phone });
    setActionLoading(null);
    if (error) return { success: false, error: error.message };
    if (!data?.success) return { success: false, error: data?.error ?? 'فشلت العملية' };
    await fetchDeals();
    return { success: true };
  }, [phone, fetchDeals]);

  return {
    deals,
    activeDeals,
    completedDeals,
    cancelledDeals,
    loading,
    actionLoading,
    getCounterparty,
    isBuyer,
    supplierConfirm,
    buyerConfirm,
    buyerConfirmWithDeadline,
    startDelivery,
    confirmDelivery,
    failDelivery,
    cancelDeal,
    refresh: fetchDeals,
  };
}
