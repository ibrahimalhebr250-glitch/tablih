import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Deal } from '../types/deal';

const DEAL_COLUMNS = 'id, deal_ref, request_id, order_id, inventory_batch_id, buyer_phone, supplier_phone, pallet_type, size, quality, city, quantity, final_price, supplier_price, platform_fee, platform_fee_per_pallet, buyer_price, status, source, supplier_confirmed_at, buyer_confirmed_at, reserved_at, delivery_started_at, delivery_failed_at, completed_at, cancelled_at, cancel_reason, is_suspended, admin_notes, created_at, updated_at';

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
      .channel(`supplier-deals-${phone}`)
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

  const now = Date.now();
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

  const newRequests   = deals.filter(d => {
    if (d.status === 'pending_supplier') return true;
    if (d.status === 'matched' && d.source !== 'demand_offer') return true;
    return false;
  });
  const platformDeals = deals.filter(d => d.status === 'matched' && d.source === 'demand_offer');
  const reservedDeals = deals.filter(d => d.status === 'supplier_confirmed' || d.status === 'awaiting_buyer' || d.status === 'inventory_reserved');
  const inDelivery    = deals.filter(d => d.status === 'in_delivery' || d.status === 'execution_in_progress');
  const endedDeals    = deals.filter(d => {
    if (d.status === 'cancelled') return true;
    if (d.status === 'completed' && d.completed_at) {
      const completedTime = new Date(d.completed_at).getTime();
      return now - completedTime < TWENTY_FOUR_HOURS;
    }
    return false;
  });

  const confirmDeal = useCallback(async (dealId: string) => {
    setActionLoading(dealId);
    const { data, error } = await supabase.rpc('supplier_confirm_deal_v4', {
      p_deal_id: dealId,
      p_supplier_phone: phone,
    });
    if (error) { setActionLoading(null); return { success: false, error: error.message }; }
    if (!data?.success) { setActionLoading(null); return { success: false, error: data?.error ?? 'فشلت العملية' }; }
    if (data?.next_step === 'confirm_delivery') {
      const { data: d2, error: e2 } = await supabase.rpc('supplier_confirm_delivery_v4', {
        p_deal_id: dealId,
        p_supplier_phone: phone,
      });
      setActionLoading(null);
      if (e2) return { success: false, error: e2.message };
      if (!d2?.success) return { success: false, error: d2?.error ?? 'فشل تأكيد التسليم' };
      await fetchDeals();
      return { success: true };
    }
    setActionLoading(null);
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

  const startDeliveryWithPledge = useCallback(async (dealId: string) => {
    setActionLoading(dealId);
    const { data, error } = await supabase.rpc('supplier_start_delivery_with_pledge', {
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

  const acceptSupplyCardDeal = useCallback(async (dealId: string) => {
    setActionLoading(dealId);
    const { data, error } = await supabase.rpc('supplier_accept_deal_with_pledge', {
      p_deal_id: dealId,
      p_supplier_phone: phone,
    });
    setActionLoading(null);
    if (error) return { success: false, error: error.message };
    if (!data?.success) return { success: false, error: data?.error ?? 'فشلت العملية' };
    await fetchDeals();
    return { success: true };
  }, [phone, fetchDeals]);

  const rejectSupplyCardDeal = useCallback(async (dealId: string) => {
    setActionLoading(dealId);
    const { data, error } = await supabase.rpc('supplier_reject_deal_from_card', {
      p_deal_id: dealId,
      p_supplier_phone: phone,
    });
    setActionLoading(null);
    if (error) return { success: false, error: error.message };
    if (!data?.success) return { success: false, error: data?.error ?? 'فشلت العملية' };
    await fetchDeals();
    return { success: true };
  }, [phone, fetchDeals]);

  const confirmSupplyCardDelivery = useCallback(async (dealId: string) => {
    setActionLoading(dealId);
    const { data, error } = await supabase.rpc('supplier_confirm_delivery_supply_card', {
      p_deal_id: dealId,
      p_supplier_phone: phone,
    });
    setActionLoading(null);
    if (error) return { success: false, error: error.message };
    if (!data?.success) return { success: false, error: data?.error ?? 'فشلت العملية' };
    await fetchDeals();
    return { success: true };
  }, [phone, fetchDeals]);

  const failSupplyCardDelivery = useCallback(async (dealId: string) => {
    setActionLoading(dealId);
    const { data, error } = await supabase.rpc('supplier_fail_delivery_supply_card', {
      p_deal_id: dealId,
      p_supplier_phone: phone,
    });
    setActionLoading(null);
    if (error) return { success: false, error: error.message };
    if (!data?.success) return { success: false, error: data?.error ?? 'فشلت العملية' };
    await fetchDeals();
    return { success: true };
  }, [phone, fetchDeals]);

  return {
    deals,
    newRequests,
    platformDeals,
    reservedDeals,
    inDelivery,
    endedDeals,
    loading,
    actionLoading,
    confirmDeal,
    startDelivery,
    startDeliveryWithPledge,
    confirmDelivery,
    failDelivery,
    markNotSold,
    getBuyerInfo,
    acceptSupplyCardDeal,
    rejectSupplyCardDeal,
    confirmSupplyCardDelivery,
    failSupplyCardDelivery,
    refresh: fetchDeals,
  };
}
