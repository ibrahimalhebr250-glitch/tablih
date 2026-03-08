import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface AccountOrder {
  id: string;
  request_id: string;
  pallet_type: string;
  size: string;
  quality: string;
  quantity: number;
  city: string;
  pallet_condition: string;
  status: string;
  matched_quantity: number | null;
  matched_price: number | null;
  accept_close_quality: boolean;
  accept_close_city: boolean;
  accept_partial_delivery: boolean;
  created_at: string;
  updated_at: string;
  deal_id?: string;
  deal_ref?: string;
  deal_status?: string;
}

const ORDER_COLUMNS = 'id, request_id, pallet_type, size, quality, quantity, city, pallet_condition, status, matched_quantity, matched_price, accept_close_quality, accept_close_city, accept_partial_delivery, created_at, updated_at';

const ACTIVE_STATUSES = ['pending', 'unmatched'];
const MATCHED_STATUSES = ['partially_matched', 'matched'];
const COMPLETED_STATUSES = ['fulfilled', 'cancelled'];

export function useAccountOrders(phone: string) {
  const [orders, setOrders] = useState<AccountOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    if (!phone) { setLoading(false); return; }
    setLoading(true);

    const { data: ordersData } = await supabase
      .from('orders')
      .select(ORDER_COLUMNS)
      .eq('phone', phone)
      .order('created_at', { ascending: false });

    const rawOrders = ordersData ?? [];

    const orderIds = rawOrders.map(o => o.id);
    let dealMap: Record<string, { deal_id: string; deal_ref: string; deal_status: string }> = {};

    if (orderIds.length > 0) {
      const { data: dealsData } = await supabase
        .from('deals')
        .select('id, deal_ref, status, order_id')
        .in('order_id', orderIds)
        .order('created_at', { ascending: false });

      if (dealsData) {
        for (const d of dealsData) {
          if (d.order_id && !dealMap[d.order_id]) {
            dealMap[d.order_id] = { deal_id: d.id, deal_ref: d.deal_ref, deal_status: d.status };
          }
        }
      }
    }

    const enriched: AccountOrder[] = rawOrders.map(o => ({
      ...o,
      ...(dealMap[o.id] || {}),
    }));

    setOrders(enriched);
    setLoading(false);
  }, [phone]);

  useEffect(() => {
    fetchOrders();

    const channel = supabase
      .channel('account-orders')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'orders',
      }, (payload: any) => {
        const row = payload.new || payload.old;
        if (row?.phone === phone) {
          fetchOrders();
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchOrders, phone]);

  const activeOrders = orders.filter(o => ACTIVE_STATUSES.includes(o.status));
  const matchedOrders = orders.filter(o => MATCHED_STATUSES.includes(o.status));
  const completedOrders = orders.filter(o => COMPLETED_STATUSES.includes(o.status));

  const canEdit = useCallback((order: AccountOrder) => {
    return order.status === 'pending' || order.status === 'unmatched';
  }, []);

  const canCancel = useCallback((order: AccountOrder) => {
    return order.status === 'pending' || order.status === 'unmatched';
  }, []);

  const updateOrder = useCallback(async (
    orderId: string,
    data: { pallet_type?: string; size?: string; quality?: string; quantity?: number; city?: string }
  ) => {
    setActionLoading(orderId);
    const { error } = await supabase
      .from('orders')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', orderId)
      .eq('phone', phone);
    setActionLoading(null);

    if (error) return { success: false, error: error.message };
    await fetchOrders();
    return { success: true };
  }, [phone, fetchOrders]);

  const cancelOrder = useCallback(async (orderId: string) => {
    setActionLoading(orderId);
    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('id', orderId)
      .eq('phone', phone);
    setActionLoading(null);

    if (error) return { success: false, error: error.message };
    await fetchOrders();
    return { success: true };
  }, [phone, fetchOrders]);

  return {
    orders,
    activeOrders,
    matchedOrders,
    completedOrders,
    loading,
    actionLoading,
    canEdit,
    canCancel,
    updateOrder,
    cancelOrder,
    refresh: fetchOrders,
  };
}
