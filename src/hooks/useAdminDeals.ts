import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export type AdminDealFilter =
  | 'all'
  | 'pending_supplier'
  | 'awaiting_buyer'
  | 'active_deals'
  | 'stalled_deals'
  | 'completed_deals'
  | 'cancelled_deals';

export interface AdminDealMetrics {
  pending_supplier: number;
  awaiting_buyer: number;
  active_deals: number;
  stalled_deals: number;
  completed_deals: number;
  cancelled_deals: number;
  volume_today: number;
  total_deals: number;
}

export interface AdminDealRow {
  id: string;
  deal_ref: string;
  buyer_phone: string;
  supplier_phone: string;
  buyer_name: string;
  supplier_name: string;
  city: string;
  size: string;
  pallet_type: string;
  quality: string;
  quantity: number;
  supplier_price: number | null;
  platform_fee: number | null;
  final_price: number;
  status: string;
  is_suspended: boolean;
  created_at: string;
  reserved_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  admin_notes: string | null;
  execution_deadline: string | null;
  execution_hours: number | null;
}

function statusesForFilter(filter: AdminDealFilter): string[] {
  switch (filter) {
    case 'pending_supplier':  return ['pending_supplier', 'matched'];
    case 'awaiting_buyer':    return ['awaiting_buyer'];
    case 'active_deals':      return ['execution_in_progress', 'in_delivery', 'inventory_reserved'];
    case 'stalled_deals':     return ['execution_in_progress', 'in_delivery', 'inventory_reserved'];
    case 'completed_deals':   return ['completed'];
    case 'cancelled_deals':   return ['cancelled'];
    default:                  return [];
  }
}

export function useAdminDeals() {
  const [metrics, setMetrics] = useState<AdminDealMetrics | null>(null);
  const [deals, setDeals] = useState<AdminDealRow[]>([]);
  const [activeFilter, setActiveFilter] = useState<AdminDealFilter>('all');
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [loadingDeals, setLoadingDeals] = useState(false);
  const [actionBusy, setActionBusy] = useState<Record<string, boolean>>({});

  const fetchMetrics = useCallback(async () => {
    setLoadingMetrics(true);

    const { data: allDeals } = await supabase
      .from('deals')
      .select('id, status, quantity, reserved_at, completed_at, created_at');

    const rows = allDeals ?? [];
    const threshold = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const activeStatuses = ['execution_in_progress', 'in_delivery', 'inventory_reserved'];
    const stalled = rows.filter(r =>
      activeStatuses.includes(r.status) &&
      r.reserved_at && r.reserved_at < threshold
    );

    setMetrics({
      pending_supplier: rows.filter(r => r.status === 'pending_supplier' || r.status === 'matched').length,
      awaiting_buyer: rows.filter(r => r.status === 'awaiting_buyer').length,
      active_deals: rows.filter(r => activeStatuses.includes(r.status)).length,
      stalled_deals: stalled.length,
      completed_deals: rows.filter(r => r.status === 'completed').length,
      cancelled_deals: rows.filter(r => r.status === 'cancelled').length,
      volume_today: rows
        .filter(r => r.status === 'completed' && r.completed_at && r.completed_at >= todayStart.toISOString())
        .reduce((s, r) => s + (r.quantity ?? 0), 0),
      total_deals: rows.length,
    });
    setLoadingMetrics(false);
  }, []);

  const enrichWithNames = async (rows: AdminDealRow[]): Promise<AdminDealRow[]> => {
    const phones = [...new Set([
      ...rows.map(r => r.buyer_phone).filter(Boolean),
      ...rows.map(r => r.supplier_phone).filter(Boolean),
    ])];
    if (phones.length === 0) return rows;

    const { data: users } = await supabase
      .from('platform_users')
      .select('phone, display_name, company_name')
      .in('phone', phones);

    const nameMap: Record<string, string> = {};
    for (const u of users ?? []) {
      nameMap[u.phone] = u.company_name || u.display_name || u.phone;
    }

    return rows.map(r => ({
      ...r,
      buyer_name: nameMap[r.buyer_phone] ?? r.buyer_phone,
      supplier_name: nameMap[r.supplier_phone] ?? r.supplier_phone,
    }));
  };

  const fetchDeals = useCallback(async (filter: AdminDealFilter) => {
    setLoadingDeals(true);
    const statuses = statusesForFilter(filter);

    let query = supabase
      .from('deals')
      .select('id, deal_ref, buyer_phone, supplier_phone, city, size, pallet_type, quality, quantity, supplier_price, platform_fee, final_price, status, is_suspended, created_at, reserved_at, completed_at, cancelled_at, cancel_reason, admin_notes, execution_deadline, execution_hours')
      .order('created_at', { ascending: false })
      .limit(200);

    if (statuses.length > 0) {
      query = query.in('status', statuses);
    }

    const { data } = await query;
    const rows: AdminDealRow[] = (data ?? []).map(r => ({
      ...r,
      buyer_name: r.buyer_phone,
      supplier_name: r.supplier_phone,
      is_suspended: r.is_suspended ?? false,
    }));

    let enriched = await enrichWithNames(rows);

    if (filter === 'stalled_deals') {
      const thresh = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
      enriched = enriched.filter(r => r.reserved_at && r.reserved_at < thresh);
    }

    setDeals(enriched);
    setLoadingDeals(false);
  }, []);

  const selectFilter = useCallback((filter: AdminDealFilter) => {
    setActiveFilter(filter);
    fetchDeals(filter);
  }, [fetchDeals]);

  useEffect(() => {
    fetchMetrics();
    fetchDeals('all');

    const channel = supabase
      .channel('admin-deals-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deals' }, () => {
        fetchMetrics();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchMetrics, fetchDeals]);

  const withBusy = async (dealId: string, fn: () => Promise<void>) => {
    setActionBusy(prev => ({ ...prev, [dealId]: true }));
    await fn();
    setActionBusy(prev => ({ ...prev, [dealId]: false }));
  };

  const freezeDeal = useCallback(async (dealId: string) => {
    await withBusy(dealId, async () => {
      await supabase.rpc('admin_freeze_deal_v4', { p_deal_id: dealId });
      await Promise.all([fetchMetrics(), fetchDeals(activeFilter)]);
    });
  }, [activeFilter, fetchMetrics, fetchDeals]);

  const cancelDeal = useCallback(async (dealId: string, reason = 'إلغاء من الإدارة') => {
    await withBusy(dealId, async () => {
      await supabase.rpc('admin_cancel_deal_v4', { p_deal_id: dealId, p_reason: reason });
      await Promise.all([fetchMetrics(), fetchDeals(activeFilter)]);
    });
  }, [activeFilter, fetchMetrics, fetchDeals]);

  const deleteDeal = useCallback(async (dealId: string) => {
    await withBusy(dealId, async () => {
      await supabase.rpc('admin_delete_deal_v4', { p_deal_id: dealId });
      await Promise.all([fetchMetrics(), fetchDeals(activeFilter)]);
    });
  }, [activeFilter, fetchMetrics, fetchDeals]);

  const sendReminder = useCallback(async (dealId: string) => {
    await withBusy(dealId, async () => {
      await supabase.rpc('admin_send_stall_reminder_v4', { p_deal_id: dealId });
    });
  }, []);

  const sendBatchReminders = useCallback(async () => {
    const stalledDeals = deals.filter(d =>
      ['execution_in_progress', 'in_delivery', 'inventory_reserved'].includes(d.status) &&
      d.reserved_at &&
      new Date(d.reserved_at).getTime() < Date.now() - 3 * 24 * 60 * 60 * 1000
    );
    for (const d of stalledDeals) {
      await supabase.rpc('admin_send_stall_reminder_v4', { p_deal_id: d.id });
    }
    fetchMetrics();
  }, [deals, fetchMetrics]);

  const refresh = useCallback(() => {
    fetchMetrics();
    fetchDeals(activeFilter);
  }, [fetchMetrics, fetchDeals, activeFilter]);

  return {
    metrics, deals, activeFilter,
    loadingMetrics, loadingDeals, actionBusy,
    selectFilter, freezeDeal, cancelDeal, deleteDeal,
    sendReminder, sendBatchReminders, refresh,
  };
}
