import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface OrderDealInfo {
  deal_id: string;
  deal_ref: string;
  deal_status: string;
  execution_deadline: string | null;
  execution_hours: number | null;
  supplier_phone: string | null;
  buyer_confirmed_at: string | null;
  supplier_confirmed_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  delivery_failed_at: string | null;
}

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
  deal?: OrderDealInfo;
}

const ORDER_COLUMNS = 'id, request_id, pallet_type, size, quality, quantity, city, pallet_condition, status, matched_quantity, matched_price, accept_close_quality, accept_close_city, accept_partial_delivery, created_at, updated_at';
const DEAL_COLUMNS = 'id, deal_ref, status, order_id, supplier_phone, execution_deadline, execution_hours, buyer_confirmed_at, supplier_confirmed_at, completed_at, cancelled_at, cancel_reason, delivery_failed_at';

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
    let dealMap: Record<string, OrderDealInfo> = {};

    if (orderIds.length > 0) {
      const { data: dealsData } = await supabase
        .from('deals')
        .select(DEAL_COLUMNS)
        .in('order_id', orderIds)
        .order('created_at', { ascending: false });

      if (dealsData) {
        for (const d of dealsData) {
          if (d.order_id && !dealMap[d.order_id]) {
            dealMap[d.order_id] = {
              deal_id: d.id,
              deal_ref: d.deal_ref,
              deal_status: d.status,
              execution_deadline: d.execution_deadline,
              execution_hours: d.execution_hours,
              supplier_phone: d.supplier_phone,
              buyer_confirmed_at: d.buyer_confirmed_at,
              supplier_confirmed_at: d.supplier_confirmed_at,
              completed_at: d.completed_at,
              cancelled_at: d.cancelled_at,
              cancel_reason: d.cancel_reason,
              delivery_failed_at: d.delivery_failed_at,
            };
          }
        }
      }
    }

    const enriched: AccountOrder[] = rawOrders.map(o => ({
      ...o,
      deal: dealMap[o.id] ?? undefined,
    }));

    setOrders(enriched);
    setLoading(false);
  }, [phone]);

  useEffect(() => {
    fetchOrders();

    const ordersChannel = supabase
      .channel('account-orders-watch')
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
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'deals',
      }, (payload: any) => {
        const row = payload.new || payload.old;
        if (row?.buyer_phone === phone) {
          fetchOrders();
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(ordersChannel); };
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
