import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Deal } from '../types/deal';

export interface InventoryBatch {
  id: string;
  batch_ref: string;
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
  source: string | null;
  deal_id: string | null;
  created_at: string;
}

export interface CommissionRecord {
  id: string;
  deal_id: string;
  deal_ref: string | null;
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
  batch_ref?: string;
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
        .select('id, batch_ref, pallet_type, size, quality, pallet_condition, city, quantity, quantity_available, price_per_pallet, publish_to_market, status, inventory_source, created_at')
        .eq('phone', phone)
        .order('created_at', { ascending: false }),

      supabase
        .from('buyer_inventory')
        .select('id, buyer_phone, pallet_type, size, quality, city, quantity, source, deal_id, created_at')
        .eq('buyer_phone', phone)
        .order('created_at', { ascending: false }),

      supabase
        .from('deals')
        .select('id, deal_ref, request_id, order_id, inventory_batch_id, buyer_phone, supplier_phone, pallet_type, size, quality, city, quantity, final_price, supplier_price, platform_fee, platform_fee_per_pallet, buyer_price, status, source, supplier_confirmed_at, buyer_confirmed_at, reserved_at, delivery_started_at, delivery_failed_at, completed_at, cancelled_at, cancel_reason, is_suspended, admin_notes, created_at, updated_at')
        .or(`buyer_phone.eq.${phone},supplier_phone.eq.${phone}`)
        .order('created_at', { ascending: false }),

      supabase
        .from('commission_settlements')
        .select('id, deal_id, deal_ref, supplier_phone, buyer_phone, quantity, commission_per_unit, total_commission, status, created_at')
        .eq('supplier_phone', phone)
        .order('created_at', { ascending: false }),

      supabase
        .from('negotiation_requests')
        .select('id, inventory_batch_id, supplier_phone, buyer_phone, requested_quantity, offer_price_per_pallet, status, created_at')
        .eq('supplier_phone', phone)
        .eq('status', 'pending')
        .order('created_at', { ascending: false }),
    ]);

    const fetchedDeals: Deal[] = (dealsRes.data as Deal[]) ?? [];
    setInventory((invRes.data as InventoryBatch[]) ?? []);
    setPurchases((purchasesRes.data as BuyerInventoryItem[]) ?? []);
    setAllDeals(fetchedDeals);
    setCommissions((commRes.data as CommissionRecord[]) ?? []);

    const negData = (negRes.data ?? []) as NegotiationRequest[];

    if (negData.length > 0) {
      const batchIds = [...new Set(negData.map(n => n.inventory_batch_id).filter(Boolean))];
      const { data: batches } = await supabase
        .from('inventory_batches')
        .select('id, batch_ref, pallet_type, size, quality, city')
        .in('id', batchIds);

      const batchMap: Record<string, { batch_ref: string; pallet_type: string; size: string; quality: string; city: string }> = {};
      for (const b of batches ?? []) {
        batchMap[b.id] = b;
      }

      const enriched = negData.map(n => ({
        ...n,
        batch_ref: batchMap[n.inventory_batch_id]?.batch_ref,
        pallet_type: batchMap[n.inventory_batch_id]?.pallet_type,
        size: batchMap[n.inventory_batch_id]?.size,
        quality: batchMap[n.inventory_batch_id]?.quality,
        city: batchMap[n.inventory_batch_id]?.city,
      }));
      setNegotiationRequests(enriched);
    } else {
      setNegotiationRequests([]);
    }

    const phones = new Set<string>();
    for (const d of fetchedDeals) {
      if (d.buyer_phone && d.buyer_phone !== phone) phones.add(d.buyer_phone);
      if (d.supplier_phone && d.supplier_phone !== phone) phones.add(d.supplier_phone);
    }
    for (const n of negData) {
      if (n.buyer_phone) phones.add(n.buyer_phone);
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

    return () => {
      supabase.removeChannel(dealsChannel);
      supabase.removeChannel(invChannel);
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

  const acceptNegotiation = useCallback(async (requestId: string, batchId: string, quantity: number, buyerPhone: string) => {
    const { data, error } = await supabase.rpc('accept_negotiation_and_create_deal', {
      p_request_id: requestId,
      p_supplier_phone: phone,
      p_batch_id: batchId,
      p_quantity: quantity,
      p_buyer_phone: buyerPhone,
    });
    if (error) return { success: false, error: error.message };
    if (!data?.success) return { success: false, error: data?.error ?? 'فشلت العملية' };
    await fetchAll();
    return { success: true };
  }, [phone, fetchAll]);

  const rejectNegotiation = useCallback(async (requestId: string) => {
    const { error } = await supabase
      .from('negotiation_requests')
      .update({ status: 'rejected' })
      .eq('id', requestId)
      .eq('supplier_phone', phone);
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
    allDeals,
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
