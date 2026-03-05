import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Deal } from '../types/deal';

const DEAL_COLUMNS = 'id, deal_ref, request_id, order_id, inventory_batch_id, buyer_phone, supplier_phone, pallet_type, size, quality, city, quantity, final_price, supplier_price, platform_fee, platform_fee_per_pallet, buyer_price, status, supplier_confirmed_at, buyer_confirmed_at, reserved_at, delivery_started_at, delivery_failed_at, completed_at, cancelled_at, cancel_reason, is_suspended, admin_notes, created_at, updated_at';

export function useSupplierDeals(phone: string) {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchDeals = useCallback(async () => {
    if (!phone) { setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from('deals')
      .select(DEAL_COLUMNS)
      .eq('supplier_phone', phone)
      .order('created_at', { ascending: false });
    setDeals((data as Deal[]) ?? []);
    setLoading(false);
  }, [phone]);

  useEffect(() => {
    fetchDeals();

    const dealsChannel = supabase
      .channel('supplier-deals')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'deals',
        filter: `supplier_phone=eq.${phone}`,
      }, () => {
        fetchDeals();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(dealsChannel);
    };
  }, [fetchDeals, phone]);

  const newRequests   = deals.filter(d => d.status === 'matched' || d.status === 'pending_supplier');
  const reservedDeals = deals.filter(d => d.status === 'supplier_confirmed' || d.status === 'awaiting_buyer' || d.status === 'inventory_reserved');
  const inDelivery    = deals.filter(d => d.status === 'in_delivery');
  const endedDeals    = deals.filter(d => d.status === 'completed' || d.status === 'cancelled');

  const confirmDeal = useCallback(async (dealId: string) => {
    setActionLoading(dealId);
    const { data, error } = await supabase.rpc('supplier_confirm_deal_v4', {
      p_deal_id: dealId,
      p_supplier_phone: phone,
    });
    setActionLoading(null);
    if (error) return { success: false, error: error.message };
    if (!data?.success) return { success: false, error: data?.error ?? 'فشلت العملية' };
    await fetchDeals();
    return { success: true };
  }, [phone, fetchDeals]);

  const startDelivery = useCallback(async (dealId: string) => {
    setActionLoading(dealId);
    const { data, error } = await supabase.rpc('supplier_start_delivery_v4', {
      p_deal_id: dealId,
      p_supplier_phone: phone,
    });
    setActionLoading(null);
    if (error) return { success: false, error: error.message };
    if (!data?.success) return { success: false, error: data?.error ?? 'فشلت العملية' };
    await fetchDeals();
    return { success: true };
  }, [phone, fetchDeals]);

  const confirmDelivery = useCallback(async (dealId: string) => {
    setActionLoading(dealId);
    const { data, error } = await supabase.rpc('supplier_confirm_delivery_v4', {
      p_deal_id: dealId,
      p_supplier_phone: phone,
    });
    setActionLoading(null);
    if (error) return { success: false, error: error.message };
    if (!data?.success) return { success: false, error: data?.error ?? 'فشلت العملية' };
    await fetchDeals();
    return { success: true };
  }, [phone, fetchDeals]);

  const failDelivery = useCallback(async (dealId: string) => {
    setActionLoading(dealId);
    const { data, error } = await supabase.rpc('supplier_fail_delivery_v4', {
      p_deal_id: dealId,
      p_supplier_phone: phone,
    });
    setActionLoading(null);
    if (error) return { success: false, error: error.message };
    if (!data?.success) return { success: false, error: data?.error ?? 'فشلت العملية' };
    await fetchDeals();
    return { success: true };
  }, [phone, fetchDeals]);

  const markNotSold = useCallback(async (dealId: string) => {
    setActionLoading(dealId);
    const { data, error } = await supabase.rpc('supplier_cancel_deal_v4', {
      p_deal_id: dealId,
      p_supplier_phone: phone,
    });
    setActionLoading(null);
    if (error) return { success: false, error: error.message };
    if (!data?.success) return { success: false, error: data?.error ?? 'فشلت العملية' };
    await fetchDeals();
    return { success: true };
  }, [phone, fetchDeals]);

  const getBuyerInfo = useCallback(async (buyerPhone: string) => {
    const { data } = await supabase
      .from('platform_users')
      .select('display_name, company_name, phone')
      .eq('phone', buyerPhone)
      .maybeSingle();
    return data;
  }, []);

  return {
    deals,
    newRequests,
    reservedDeals,
    inDelivery,
    endedDeals,
    loading,
    actionLoading,
    confirmDeal,
    startDelivery,
    confirmDelivery,
    failDelivery,
    markNotSold,
    getBuyerInfo,
    refresh: fetchDeals,
  };
}
