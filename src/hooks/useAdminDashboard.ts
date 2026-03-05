import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export type TimeFilter = 'today' | 'week' | 'month';

export interface ExecutiveMetrics {
  gmv: number;
  platform_revenue: number;
  supplier_liabilities: number;
  active_deals: number;
  awaiting_payment: number;
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
  awaiting_payment: DealCard[];
  paid: DealCard[];
  preparing: DealCard[];
  delivered: DealCard[];
  settlement_pending: DealCard[];
}

export interface FinancialSnapshot {
  payments_today: number;
  settlements_today: number;
  net_balance: number;
  outstanding_liabilities: number;
}

export interface ActivityItem {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  created_at: string;
  admin_phone: string;
}

function getDateFilter(filter: TimeFilter): string {
  const now = new Date();
  if (filter === 'today') {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return start.toISOString();
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
  const [metrics, setMetrics] = useState<ExecutiveMetrics | null>(null);
  const [cities, setCities] = useState<CityStats[]>([]);
  const [dealFlow, setDealFlow] = useState<DealFlow | null>(null);
  const [financial, setFinancial] = useState<FinancialSnapshot | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const since = getDateFilter(filter);
    const today = getDateFilter('today');

    const [metricsRes, citiesRes, dealsRes, financialRes, activityRes] = await Promise.all([
      supabase.rpc('admin_get_executive_metrics', { since_date: since }),
      supabase.from('cities').select('id, name, status').order('name'),
      supabase.from('deals')
        .select('id, deal_ref, city, quantity, buyer_price, created_at, status')
        .not('status', 'eq', 'cancelled')
        .order('created_at', { ascending: false })
        .limit(100),
      supabase.rpc('admin_get_financial_snapshot', { today_start: today }),
      supabase.from('audit_log')
        .select('id, action, entity_type, entity_id, created_at, admin_phone')
        .order('created_at', { ascending: false })
        .limit(20),
    ]);

    if (metricsRes.data) {
      setMetrics(metricsRes.data as ExecutiveMetrics);
    } else {
      const fallback = await supabase
        .from('deals')
        .select('id, final_price, buyer_price, platform_fee, status, created_at')
        .gte('created_at', since);

      const rows = fallback.data ?? [];
      const gmv = rows.reduce((s, r) => s + (r.buyer_price ?? 0) * ((r as { quantity?: number }).quantity ?? 1), 0);
      const revenue = rows.reduce((s, r) => s + (r.platform_fee ?? 0), 0);

      const liabRes = await supabase
        .from('supplier_liabilities')
        .select('amount_owed')
        .in('status', ['pending', 'partial']);
      const liabilities = (liabRes.data ?? []).reduce((s, r) => s + (r.amount_owed ?? 0), 0);

      const activeDealsRes = await supabase
        .from('deals')
        .select('id', { count: 'exact', head: true })
        .not('status', 'in', '("cancelled","delivered")');

      const awaitingRes = await supabase
        .from('deals')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'awaiting_payment');

      setMetrics({
        gmv,
        platform_revenue: revenue,
        supplier_liabilities: liabilities,
        active_deals: activeDealsRes.count ?? 0,
        awaiting_payment: awaitingRes.count ?? 0,
      });
    }

    if (citiesRes.data) {
      const cityRows = citiesRes.data;
      const inventoryRes = await supabase
        .from('inventory_batches')
        .select('city, available_quantity, status');
      const ordersRes = await supabase
        .from('orders')
        .select('city, quantity, status');
      const dealsForCityRes = await supabase
        .from('deals')
        .select('city, status')
        .not('status', 'in', '("cancelled","delivered")');

      const inv = inventoryRes.data ?? [];
      const ords = ordersRes.data ?? [];
      const dls = dealsForCityRes.data ?? [];

      const stats: CityStats[] = cityRows.map(c => ({
        id: c.id,
        name: c.name,
        status: c.status,
        total_supply: inv.filter(i => i.city === c.name && i.status === 'available').reduce((s, i) => s + (i.available_quantity ?? 0), 0),
        total_demand: ords.filter(o => o.city === c.name && ['pending', 'processing'].includes(o.status)).reduce((s, o) => s + (o.quantity ?? 0), 0),
        active_deals: dls.filter(d => d.city === c.name).length,
      }));
      setCities(stats);
    }

    if (dealsRes.data) {
      const all = dealsRes.data as DealCard[];
      setDealFlow({
        awaiting_payment: all.filter(d => d.status === 'awaiting_payment').slice(0, 5),
        paid: all.filter(d => d.status === 'paid').slice(0, 5),
        preparing: all.filter(d => d.status === 'preparing').slice(0, 5),
        delivered: all.filter(d => d.status === 'delivered').slice(0, 5),
        settlement_pending: all.filter(d => d.status === 'settlement_pending').slice(0, 5),
      });
    }

    if (financialRes.data) {
      setFinancial(financialRes.data as FinancialSnapshot);
    } else {
      const paymentsRes = await supabase
        .from('ledger_entries')
        .select('amount')
        .eq('entry_type', 'payment_received')
        .gte('created_at', today);
      const settlementsRes = await supabase
        .from('ledger_entries')
        .select('amount')
        .eq('entry_type', 'settlement_paid')
        .gte('created_at', today);
      const liabRes2 = await supabase
        .from('supplier_liabilities')
        .select('amount_owed')
        .in('status', ['pending', 'partial']);

      const paymentsToday = (paymentsRes.data ?? []).reduce((s, r) => s + (r.amount ?? 0), 0);
      const settlementsToday = (settlementsRes.data ?? []).reduce((s, r) => s + (r.amount ?? 0), 0);
      const liabilities = (liabRes2.data ?? []).reduce((s, r) => s + (r.amount_owed ?? 0), 0);

      setFinancial({
        payments_today: paymentsToday,
        settlements_today: settlementsToday,
        net_balance: paymentsToday - settlementsToday,
        outstanding_liabilities: liabilities,
      });
    }

    setActivity((activityRes.data as ActivityItem[]) ?? []);
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return { metrics, cities, dealFlow, financial, activity, loading, refetch: fetchAll };
}
