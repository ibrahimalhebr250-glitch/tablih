import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface DashboardOrder {
  id: string;
  request_id: string;
  pallet_type: string;
  size: string;
  quality: string;
  quantity: number;
  city: string;
  status: string;
  matched_quantity: number | null;
  matched_price: number | null;
  delivery_days: number | null;
  created_at: string;
  deal_ref?: string;
  deal_status?: string;
}

export interface DashboardBatch {
  id: string;
  batch_id: string;
  pallet_type: string;
  size: string;
  quality: string;
  quantity: number;
  available_quantity: number;
  min_price: number | null;
  city: string;
  status: string;
  matched_quantity: number;
  created_at: string;
}

export interface DashboardDeal {
  id: string;
  request_id: string;
  pallet_type: string;
  size: string;
  quality: string;
  matched_quantity: number;
  matched_price: number;
  delivery_days: number;
  city: string;
  created_at: string;
}

export interface DashboardSummary {
  activeOrders: number;
  activeBatches: number;
  activeDeals: number;
}

export function useDashboard(phone: string) {
  const [orders, setOrders] = useState<DashboardOrder[]>([]);
  const [batches, setBatches] = useState<DashboardBatch[]>([]);
  const [deals, setDeals] = useState<DashboardDeal[]>([]);
  const [summary, setSummary] = useState<DashboardSummary>({ activeOrders: 0, activeBatches: 0, activeDeals: 0 });
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!phone) { setLoading(false); return; }
    setLoading(true);

    const [ordersRes, batchesRes, dealsRes, orderDealsRes] = await Promise.all([
      supabase
        .from('orders')
        .select('id, request_id, pallet_type, size, quality, quantity, city, status, matched_quantity, matched_price, delivery_days, created_at')
        .eq('phone', phone)
        .neq('status', 'fulfilled')
        .order('created_at', { ascending: false }),

      supabase
        .from('inventory_batches')
        .select('id, batch_id, pallet_type, size, quality, quantity, available_quantity, min_price, city, status, matched_quantity, created_at')
        .eq('phone', phone)
        .order('created_at', { ascending: false }),

      supabase
        .from('deals')
        .select('id, deal_ref, pallet_type, size, quality, quantity, final_price, city, status, supplier_phone, buyer_phone, created_at')
        .or(`buyer_phone.eq.${phone},supplier_phone.eq.${phone}`)
        .in('status', ['matched', 'awaiting_buyer', 'inventory_reserved'])
        .order('created_at', { ascending: false }),

      supabase
        .from('deals')
        .select('deal_ref, status, order_id')
        .eq('buyer_phone', phone)
        .not('order_id', 'is', null),
    ]);

    const dealsByOrderId = new Map<string, { deal_ref: string; status: string }>();
    for (const d of (orderDealsRes.data ?? []) as { deal_ref: string; status: string; order_id: string }[]) {
      dealsByOrderId.set(d.order_id, { deal_ref: d.deal_ref, status: d.status });
    }

    const allOrders: DashboardOrder[] = (ordersRes.data ?? []).map((o: DashboardOrder) => {
      const deal = dealsByOrderId.get(o.id);
      return deal ? { ...o, deal_ref: deal.deal_ref, deal_status: deal.status } : o;
    });
    const allBatches: DashboardBatch[] = batchesRes.data ?? [];
    const activeDealsData = dealsRes.data ?? [];
    const pendingDeals: DashboardDeal[] = activeDealsData.map((d: Record<string, unknown>) => ({
      id: d.id as string,
      request_id: d.deal_ref as string,
      pallet_type: d.pallet_type as string,
      size: d.size as string,
      quality: d.quality as string,
      matched_quantity: d.quantity as number,
      matched_price: d.final_price as number,
      delivery_days: 0,
      city: d.city as string,
      created_at: d.created_at as string,
    }));

    const activeOrders = allOrders.filter((o) => o.status === 'pending' || o.status === 'matched' || o.status === 'unmatched');
    const activeBatches = allBatches.filter((b) => b.status === 'active' || b.status === 'matched');

    setOrders(allOrders);
    setBatches(allBatches);
    setDeals(pendingDeals);
    setSummary({
      activeOrders: activeOrders.length,
      activeBatches: activeBatches.length,
      activeDeals: activeDealsData.length,
    });
    setLoading(false);
  }, [phone]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    if (!phone) return;
    const channel = supabase
      .channel(`orders-realtime-${phone}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `phone=eq.${phone}` },
        () => { fetchAll(); }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'deals', filter: `buyer_phone=eq.${phone}` },
        () => { fetchAll(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [phone, fetchAll]);

  const updateBatchPrice = useCallback(async (batchId: string, newPrice: number) => {
    const { error } = await supabase
      .from('inventory_batches')
      .update({ min_price: newPrice })
      .eq('id', batchId);
    if (!error) await fetchAll();
    return error;
  }, [fetchAll]);

  const updateBatch = useCallback(async (batchId: string, data: {
    pallet_type?: string;
    size?: string;
    quality?: string;
    quantity?: number;
    min_price?: number;
    city?: string;
  }) => {
    const updatePayload: Record<string, unknown> = { ...data };
    if (data.quantity !== undefined) {
      const current = batches.find(b => b.id === batchId);
      if (current) {
        const reserved = current.matched_quantity ?? 0;
        updatePayload.available_quantity = Math.max(0, data.quantity - reserved);
        updatePayload.quantity_available = Math.max(0, data.quantity - reserved);
      }
    }
    const { error } = await supabase
      .from('inventory_batches')
      .update(updatePayload)
      .eq('id', batchId);
    if (!error) await fetchAll();
    return error;
  }, [fetchAll, batches]);

  const deleteBatch = useCallback(async (batchId: string, batchPhone: string) => {
    const { error } = await supabase
      .from('inventory_batches')
      .delete()
      .eq('id', batchId)
      .eq('phone', batchPhone);
    if (error) {
      console.error('deleteBatch error:', error);
    } else {
      await fetchAll();
    }
    return error;
  }, [fetchAll]);

  const updateOrder = useCallback(async (orderId: string, data: {
    pallet_type?: string;
    size?: string;
    quality?: string;
    quantity?: number;
    city?: string;
  }) => {
    const { error } = await supabase
      .from('orders')
      .update(data)
      .eq('id', orderId);
    if (!error) await fetchAll();
    return error;
  }, [fetchAll]);

  return { orders, batches, deals, summary, loading, refresh: fetchAll, updateBatchPrice, updateBatch, deleteBatch, updateOrder };
}
