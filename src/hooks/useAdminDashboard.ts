import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export type TimeFilter = 'today' | 'week' | 'month';

export interface PlatformStats {
  total_users: number;
  total_suppliers: number;
  total_buyers: number;
  active_inventory: number;
  published_to_market: number;
  active_orders: number;
  unmatched_orders: number;
  active_deals: number;
  completed_deals: number;
  cancelled_deals: number;
  total_deals: number;
  pallets_traded: number;
  total_pallets_in_platform: number;
  negotiation_requests: number;
  orders_from_market: number;
}

export interface CityStats {
  id: string;
  name: string;
  status: string;
  total_supply: number;
  total_demand: number;
  active_deals: number;
}

export interface DealCard {
  id: string;
  deal_ref: string;
  city: string;
  quantity: number;
  buyer_price: number;
  created_at: string;
  status: string;
}

export interface DealFlow {
  pending_supplier: DealCard[];
  awaiting_buyer: DealCard[];
  execution_in_progress: DealCard[];
  completed: DealCard[];
  cancelled: DealCard[];
}

export interface FinancialSnapshot {
  total_gmv: number;
  platform_revenue: number;
  outstanding_fees: number;
  avg_deal_value: number;
}

export interface ActivityItem {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  created_at: string;
  admin_phone: string;
}

export interface DailyActivity {
  date: string;
  deals: number;
  orders: number;
  inventory: number;
}

function getDateFilter(filter: TimeFilter): string {
  const now = new Date();
  if (filter === 'today') {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  }
  if (filter === 'week') {
    const start = new Date(now);
    start.setDate(now.getDate() - 7);
    return start.toISOString();
  }
  const start = new Date(now);
  start.setDate(now.getDate() - 30);
  return start.toISOString();
}

export function useAdminDashboard(filter: TimeFilter) {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [cities, setCities] = useState<CityStats[]>([]);
  const [dealFlow, setDealFlow] = useState<DealFlow | null>(null);
  const [financial, setFinancial] = useState<FinancialSnapshot | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [dailyActivity, setDailyActivity] = useState<DailyActivity[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const since = getDateFilter(filter);

    try {
      const [
        usersRes,
        inventoryRes,
        ordersRes,
        dealsRes,
        negotiationsRes,
        citiesRes,
        activityRes,
      ] = await Promise.all([
        supabase.from('platform_users').select('id, user_type, created_at'),
        supabase.from('inventory_batches').select('id, city, available_quantity, quantity, status, publish_to_market, inventory_source, supplier_phone, created_at'),
        supabase.from('orders').select('id, city, quantity, status, order_source, phone, created_at, match_count'),
        supabase.from('deals').select('id, deal_ref, city, quantity, buyer_price, supplier_price, platform_fee, final_price, status, created_at, reserved_at, completed_at'),
        supabase.from('negotiation_requests').select('id, status, created_at'),
        supabase.from('cities').select('id, name, status').order('name'),
        supabase.from('audit_log')
          .select('id, action, entity_type, entity_id, created_at, admin_phone')
          .order('created_at', { ascending: false })
          .limit(30),
      ]);

      const users = usersRes.data ?? [];
      const inventory = inventoryRes.data ?? [];
      const orders = ordersRes.data ?? [];
      const deals = dealsRes.data ?? [];
      const negotiations = negotiationsRes.data ?? [];

      const filteredDeals = deals.filter(d => d.created_at >= since);
      const filteredOrders = orders.filter(o => o.created_at >= since);

      const supplierPhones = new Set(inventory.map(i => i.supplier_phone).filter(Boolean));
      const buyerPhones = new Set(orders.map(o => o.phone).filter(Boolean));

      const platformStats: PlatformStats = {
        total_users: users.length,
        total_suppliers: supplierPhones.size || users.filter(u => u.user_type === 'supplier' || u.user_type === 'both').length,
        total_buyers: buyerPhones.size || users.filter(u => u.user_type === 'buyer' || u.user_type === 'both').length,
        active_inventory: inventory.filter(i => i.status === 'active').length,
        published_to_market: inventory.filter(i => i.publish_to_market === true).length,
        active_orders: orders.filter(o => !['cancelled', 'fulfilled'].includes(o.status)).length,
        unmatched_orders: orders.filter(o => o.status === 'unmatched').length,
        active_deals: deals.filter(d => !['cancelled', 'completed'].includes(d.status)).length,
        completed_deals: deals.filter(d => d.status === 'completed').length,
        cancelled_deals: deals.filter(d => d.status === 'cancelled').length,
        total_deals: deals.length,
        pallets_traded: deals.filter(d => d.status === 'completed').reduce((s, d) => s + (d.quantity ?? 0), 0),
        total_pallets_in_platform: inventory.reduce((s, i) => s + (i.quantity ?? 0), 0),
        negotiation_requests: negotiations.length,
        orders_from_market: orders.filter(o => o.order_source === 'market').length,
      };
      setStats(platformStats);

      const completedDeals = filteredDeals.filter(d => d.status === 'completed');
      const totalGmv = completedDeals.reduce((s, d) => s + ((d.buyer_price ?? d.final_price ?? 0) * (d.quantity ?? 0)), 0);
      const platformRevenue = filteredDeals.reduce((s, d) => s + (d.platform_fee ?? 0), 0);
      const outstandingFees = deals
        .filter(d => d.platform_fee && !['completed', 'cancelled'].includes(d.status))
        .reduce((s, d) => s + (d.platform_fee ?? 0), 0);

      setFinancial({
        total_gmv: totalGmv,
        platform_revenue: platformRevenue,
        outstanding_fees: outstandingFees,
        avg_deal_value: completedDeals.length > 0
          ? totalGmv / completedDeals.length
          : 0,
      });

      if (citiesRes.data) {
        const cityRows = citiesRes.data;
        const cityStats: CityStats[] = cityRows.map(c => ({
          id: c.id,
          name: c.name,
          status: c.status,
          total_supply: inventory
            .filter(i => i.city === c.name && i.status === 'active')
            .reduce((s, i) => s + (i.available_quantity ?? 0), 0),
          total_demand: orders
            .filter(o => o.city === c.name && ['unmatched', 'pending', 'partially_matched'].includes(o.status))
            .reduce((s, o) => s + (o.quantity ?? 0), 0),
          active_deals: deals
            .filter(d => d.city === c.name && !['cancelled', 'completed'].includes(d.status))
            .length,
        }));
        setCities(cityStats);
      }

      const allDeals = (deals as DealCard[]);
      setDealFlow({
        pending_supplier: allDeals.filter(d => d.status === 'pending_supplier' || d.status === 'matched').slice(0, 5),
        awaiting_buyer: allDeals.filter(d => d.status === 'awaiting_buyer').slice(0, 5),
        execution_in_progress: allDeals.filter(d => d.status === 'execution_in_progress' || d.status === 'in_delivery' || d.status === 'inventory_reserved').slice(0, 5),
        completed: allDeals.filter(d => d.status === 'completed').slice(0, 5),
        cancelled: allDeals.filter(d => d.status === 'cancelled').slice(0, 5),
      });

      setActivity((activityRes.data as ActivityItem[]) ?? []);

      const last14Days: DailyActivity[] = [];
      for (let i = 13; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        last14Days.push({
          date: dateStr,
          deals: deals.filter(dl => dl.created_at?.startsWith(dateStr)).length,
          orders: orders.filter(o => o.created_at?.startsWith(dateStr)).length,
          inventory: inventory.filter(inv => inv.created_at?.startsWith(dateStr)).length,
        });
      }
      setDailyActivity(last14Days);

    } catch (err) {
      console.error('Dashboard fetch error:', err);
    }

    setLoading(false);
  }, [filter]);

  useEffect(() => {
    fetchAll();

    const channel = supabase
      .channel('admin-dashboard-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deals' }, () => fetchAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_batches' }, () => fetchAll())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAll]);

  return { stats, cities, dealFlow, financial, activity, dailyActivity, loading, refetch: fetchAll };
}
