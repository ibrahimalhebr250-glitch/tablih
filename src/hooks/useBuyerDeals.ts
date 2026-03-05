import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Deal } from '../types/deal';

const DEAL_COLUMNS = 'id, deal_ref, request_id, order_id, inventory_batch_id, buyer_phone, supplier_phone, pallet_type, size, quality, city, quantity, final_price, supplier_price, platform_fee, platform_fee_per_pallet, buyer_price, status, supplier_confirmed_at, buyer_confirmed_at, reserved_at, delivery_started_at, delivery_failed_at, completed_at, cancelled_at, cancel_reason, is_suspended, admin_notes, created_at, updated_at';

export interface SupplierInfo {
  display_name: string;
  company_name: string;
  phone: string;
}

export function useBuyerDeals(phone: string) {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [supplierInfo, setSupplierInfo] = useState<Record<string, SupplierInfo>>({});
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchDeals = useCallback(async () => {
    if (!phone) { setLoading(false); return; }
    setLoading(true);

    const { data } = await supabase
      .from('deals')
      .select(DEAL_COLUMNS)
      .eq('buyer_phone', phone)
      .order('created_at', { ascending: false });

    const fetchedDeals: Deal[] = (data as Deal[]) ?? [];
    setDeals(fetchedDeals);

    const supplierPhones = [...new Set(fetchedDeals.map(d => d.supplier_phone).filter(Boolean))];
    if (supplierPhones.length > 0) {
      const { data: users } = await supabase
        .from('platform_users')
        .select('phone, display_name, company_name')
        .in('phone', supplierPhones);

      if (users) {
        const info: Record<string, SupplierInfo> = {};
        for (const u of users) {
          info[u.phone] = { display_name: u.display_name ?? '', company_name: u.company_name ?? '', phone: u.phone };
        }
        setSupplierInfo(info);
      }
    }

    setLoading(false);
  }, [phone]);

  useEffect(() => {
    fetchDeals();

    const dealsChannel = supabase
      .channel('buyer-deals')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'deals',
        filter: `buyer_phone=eq.${phone}`,
      }, () => {
        fetchDeals();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(dealsChannel);
    };
  }, [fetchDeals, phone]);

  const awaitingDeals = deals.filter(d => d.status === 'awaiting_buyer' || d.status === 'pending_supplier' || d.status === 'matched' || d.status === 'supplier_confirmed');
  const activeDeals = deals.filter(d => d.status === 'inventory_reserved' || d.status === 'in_delivery');
  const endedDeals = deals.filter(d => d.status === 'completed' || d.status === 'cancelled');

  const confirmPurchase = useCallback(async (dealId: string) => {
    setActionLoading(dealId);
    const { data, error } = await supabase.rpc('buyer_confirm_deal_v4', {
      p_deal_id: dealId,
      p_buyer_phone: phone,
    });
    setActionLoading(null);
    if (error) return { success: false, error: error.message };
    if (!data?.success) return { success: false, error: data?.error ?? 'فشلت العملية' };
    await fetchDeals();
    return { success: true };
  }, [phone, fetchDeals]);

  const getSupplierInfo = useCallback((supplierPhone: string): SupplierInfo | null => {
    return supplierInfo[supplierPhone] ?? null;
  }, [supplierInfo]);

  return {
    deals,
    awaitingDeals,
    activeDeals,
    endedDeals,
    loading,
    actionLoading,
    confirmPurchase,
    getSupplierInfo,
    refresh: fetchDeals,
  };
}
