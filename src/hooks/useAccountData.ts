import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Deal } from '../types/deal';

export interface InventoryBatch {
  id: string;
  batch_id: string;
  pallet_type: string;
  size: string;
  quality: string;
  pallet_condition: string | null;
  city: string;
  quantity: number;
  quantity_available: number;
  price_per_pallet: number | null;
  publish_to_market: boolean;
  status: string;
  inventory_source: string | null;
  created_at: string;
}

export interface BuyerInventoryItem {
  id: string;
  buyer_phone: string;
  pallet_type: string;
  size: string;
  quality: string;
  city: string;
  quantity: number;
  quantity_available: number;
  unit_price: number;
  total_paid: number;
  original_supplier_phone: string;
  inventory_source: string | null;
  original_deal_id: string | null;
  acquired_at: string;
  created_at: string;
}

export interface CommissionRecord {
  id: string;
  deal_id: string | null;
  deal_ref: string | null;
  deal_reference: string | null;
  supplier_phone: string;
  buyer_phone: string;
  quantity: number;
  commission_per_unit: number;
  total_commission: number;
  status: string;
  created_at: string;
  pallet_type?: string;
  city?: string;
}

export interface NegotiationRequest {
  id: string;
  inventory_batch_id: string;
  supplier_phone: string;
  buyer_phone: string;
  requested_quantity: number;
  offer_price_per_pallet: number | null;
  status: string;
  created_at: string;
  pallet_type?: string;
  size?: string;
  quality?: string;
  city?: string;
  batch_id?: string;
}

export function useAccountData(phone: string) {
  const [inventory, setInventory] = useState<InventoryBatch[]>([]);
  const [purchases, setPurchases] = useState<BuyerInventoryItem[]>([]);
  const [allDeals, setAllDeals] = useState<Deal[]>([]);
  const [commissions, setCommissions] = useState<CommissionRecord[]>([]);
  const [negotiationRequests, setNegotiationRequests] = useState<NegotiationRequest[]>([]);
  const [counterparties, setCounterparties] = useState<Record<string, { display_name: string; company_name: string }>>({});
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!phone) { setLoading(false); return; }
    setLoading(true);

    const [invRes, purchasesRes, dealsRes, commRes, negRes] = await Promise.all([
      supabase
        .from('inventory_batches')
        .select('id, batch_id, pallet_type, size, quality, pallet_condition, city, quantity, quantity_available, price_per_pallet, publish_to_market, status, inventory_source, created_at')
        .eq('phone', phone)
        .order('created_at', { ascending: false }),

      supabase
        .from('buyer_inventory')
        .select('id, buyer_phone, pallet_type, size, quality, city, quantity, quantity_available, unit_price, total_paid, original_supplier_phone, inventory_source, original_deal_id, acquired_at, created_at')
        .eq('buyer_phone', phone)
        .order('created_at', { ascending: false }),

      supabase
        .from('deals')
        .select('id, deal_ref, request_id, order_id, inventory_batch_id, buyer_phone, supplier_phone, pallet_type, size, quality, city, quantity, final_price, supplier_price, platform_fee, platform_fee_per_pallet, buyer_price, status, source, supplier_confirmed_at, buyer_confirmed_at, reserved_at, delivery_started_at, delivery_failed_at, completed_at, cancelled_at, cancel_reason, is_suspended, admin_notes, created_at, updated_at')
        .or(`buyer_phone.eq.${phone},supplier_phone.eq.${phone}`)
        .order('created_at', { ascending: false }),

      supabase
        .from('commission_settlements')
        .select('id, deal_id, deal_reference, supplier_phone, buyer_phone, pallet_count, commission_amount, total_commission, status, created_at')
        .eq('supplier_phone', phone)
        .order('created_at', { ascending: false }),

      supabase
        .from('negotiation_requests')
        .select('id, inventory_batch_id, supplier_phone, buyer_phone, requested_quantity, offer_price_per_pallet, pallet_type, size, quality, city, status, created_at')
        .eq('buyer_phone', phone)
        .eq('status', 'pending')
        .order('created_at', { ascending: false }),
    ]);

    const fetchedDeals: Deal[] = (dealsRes.data as Deal[]) ?? [];
    setInventory((invRes.data as InventoryBatch[]) ?? []);
    setPurchases((purchasesRes.data as BuyerInventoryItem[]) ?? []);
    setAllDeals(fetchedDeals);
    const rawComm = (commRes.data ?? []) as Record<string, unknown>[];
    const mappedComm: CommissionRecord[] = rawComm.map(r => ({
      id: r.id as string,
      deal_id: (r.deal_id as string | null) ?? null,
      deal_ref: null,
      deal_reference: (r.deal_reference as string | null) ?? null,
      supplier_phone: r.supplier_phone as string,
      buyer_phone: (r.buyer_phone as string) ?? '',
      quantity: Number(r.pallet_count) || 0,
      commission_per_unit: Number(r.commission_amount) || 0,
      total_commission: Number(r.total_commission) || Number(r.commission_amount) || 0,
      status: r.status as string,
      created_at: r.created_at as string,
    }));
    setCommissions(mappedComm);

    const negData = (negRes.data ?? []) as NegotiationRequest[];
    setNegotiationRequests(negData);

    const phones = new Set<string>();
    for (const d of fetchedDeals) {
      if (d.buyer_phone && d.buyer_phone !== phone) phones.add(d.buyer_phone);
      if (d.supplier_phone && d.supplier_phone !== phone) phones.add(d.supplier_phone);
    }
    for (const n of negData) {
      if (n.supplier_phone && n.supplier_phone !== phone) phones.add(n.supplier_phone);
    }

    if (phones.size > 0) {
      const { data: users } = await supabase
        .from('platform_users')
        .select('phone, display_name, company_name')
        .in('phone', [...phones]);
      const map: Record<string, { display_name: string; company_name: string }> = {};
      for (const u of users ?? []) {
        map[u.phone] = { display_name: u.display_name ?? '', company_name: u.company_name ?? '' };
      }
      setCounterparties(map);
    }

    setLoading(false);
  }, [phone]);

  useEffect(() => {
    fetchAll();

    const dealsChannel = supabase
      .channel(`account-deals-${phone}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deals', filter: `buyer_phone=eq.${phone}` }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deals', filter: `supplier_phone=eq.${phone}` }, fetchAll)
      .subscribe();

    const invChannel = supabase
      .channel(`account-inv-${phone}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_batches', filter: `phone=eq.${phone}` }, fetchAll)
      .subscribe();

    const negChannel = supabase
      .channel(`account-neg-${phone}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'negotiation_requests', filter: `buyer_phone=eq.${phone}` }, fetchAll)
      .subscribe();

    return () => {
      supabase.removeChannel(dealsChannel);
      supabase.removeChannel(invChannel);
      supabase.removeChannel(negChannel);
    };
  }, [fetchAll, phone]);

  const getCounterpartyName = useCallback((p: string) => {
    const info = counterparties[p];
    if (!info) return p;
    return info.company_name || info.display_name || p;
  }, [counterparties]);

  const isActiveBatch = (b: InventoryBatch) => b.status === 'active' || b.status === 'draft';
  const publishedInventory = inventory.filter(b => b.publish_to_market && isActiveBatch(b) && (b.quantity_available ?? b.quantity) > 0);
  const unpublishedInventory = inventory.filter(b => !b.publish_to_market && isActiveBatch(b));
  const reservedInventory = inventory.filter(b => {
    const reserved = (b.quantity ?? 0) - (b.quantity_available ?? b.quantity ?? 0);
    return reserved > 0;
  });

  const marketCardDeals = allDeals.filter(d => d.source === 'supply_card' || d.source === 'demand_card');
  const pendingCommissions = commissions.filter(c => c.status === 'pending');
  const totalPendingCommission = pendingCommissions.reduce((sum, c) => sum + (c.total_commission ?? 0), 0);

  const acceptNegotiation = useCallback(async (requestId: string, quantity: number) => {
    const { data, error } = await supabase.rpc('accept_negotiation_and_create_deal', {
      p_request_id: requestId,
      p_buyer_phone: phone,
      p_quantity: quantity,
    });
    if (error) return { success: false, error: error.message };
    const result = data as { success: boolean; error?: string; deal_ref?: string } | null;
    if (!result?.success) return { success: false, error: result?.error ?? 'فشلت العملية' };
    await fetchAll();
    return { success: true, deal_ref: result.deal_ref };
  }, [phone, fetchAll]);

  const rejectNegotiation = useCallback(async (requestId: string) => {
    const { error } = await supabase
      .from('negotiation_requests')
      .update({ status: 'rejected', updated_at: new Date().toISOString() })
      .eq('id', requestId)
      .eq('buyer_phone', phone);
    if (error) return { success: false, error: error.message };
    await fetchAll();
    return { success: true };
  }, [phone, fetchAll]);

  return {
    loading,
    inventory,
    publishedInventory,
    unpublishedInventory,
    reservedInventory,
    purchases,
    marketCardDeals,
    commissions,
    pendingCommissions,
    totalPendingCommission,
    negotiationRequests,
    getCounterpartyName,
    acceptNegotiation,
    rejectNegotiation,
    refresh: fetchAll,
  };
}
