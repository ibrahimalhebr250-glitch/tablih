import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type {
  FinanceMetrics,
  SupplierCommission,
  SettledCommission,
  SupplierFinanceProfile,
  SupplierDealRow,
  CityPalletStat,
  TopSupplier,
  SizeDistribution,
  MarketSummary,
  SettlementMethod,
} from '../types/admin';

const OVERDUE_DAYS = 7;

export function useFinanceMetrics() {
  const [metrics, setMetrics] = useState<FinanceMetrics>({
    total_pallets: 0,
    total_commission: 0,
    settled_commission: 0,
    outstanding_commission: 0,
  });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.rpc('get_finance_dashboard_metrics');
    if (data) {
      setMetrics({
        total_pallets: Number(data.total_pallets) || 0,
        total_commission: Number(data.total_commission) || 0,
        settled_commission: Number(data.settled_commission) || 0,
        outstanding_commission: Number(data.outstanding_commission) || 0,
      });
    }
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { metrics, loading, refresh };
}

export function useCommissions() {
  const [due, setDue] = useState<SupplierCommission[]>([]);
  const [overdue, setOverdue] = useState<SupplierCommission[]>([]);
  const [settled, setSettled] = useState<SettledCommission[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);

    const { data: deals } = await supabase
      .from('deals')
      .select('id, deal_ref, supplier_phone, city, quantity, platform_fee_per_pallet, completed_at, created_at, status')
      .not('status', 'eq', 'cancelled');

    const { data: settlements } = await supabase
      .from('commission_settlements')
      .select('*')
      .eq('status', 'settled');

    const { data: users } = await supabase
      .from('platform_users')
      .select('phone, display_name, city');

    const settledDealIds = new Set((settlements || []).map(s => s.deal_id));
    const userMap = new Map((users || []).map(u => [u.phone, u]));

    const supplierMap = new Map<string, {
      phone: string;
      pallets: number;
      commission: number;
      lastDate: string;
      dealIds: string[];
      completedAt: string | null;
    }>();

    for (const deal of deals || []) {
      const fee = Number(deal.platform_fee_per_pallet) || 1;
      const comm = deal.quantity * fee;
      const existing = supplierMap.get(deal.supplier_phone);

      if (settledDealIds.has(deal.id)) continue;

      if (existing) {
        existing.pallets += deal.quantity;
        existing.commission += comm;
        existing.dealIds.push(deal.id);
        const d = deal.completed_at || deal.created_at;
        if (d > existing.lastDate) existing.lastDate = d;
        if (deal.completed_at && (!existing.completedAt || deal.completed_at < existing.completedAt)) {
          existing.completedAt = deal.completed_at;
        }
      } else {
        supplierMap.set(deal.supplier_phone, {
          phone: deal.supplier_phone,
          pallets: deal.quantity,
          commission: comm,
          lastDate: deal.completed_at || deal.created_at,
          dealIds: [deal.id],
          completedAt: deal.completed_at || null,
        });
      }
    }

    const now = Date.now();
    const dueList: SupplierCommission[] = [];
    const overdueList: SupplierCommission[] = [];

    for (const s of supplierMap.values()) {
      if (s.commission <= 0) continue;
      const user = userMap.get(s.phone);
      const daysSince = s.completedAt
        ? Math.floor((now - new Date(s.completedAt).getTime()) / 86400000)
        : 0;

      const item: SupplierCommission = {
        supplier_phone: s.phone,
        display_name: user?.display_name || s.phone,
        city: user?.city || '',
        total_pallets: s.pallets,
        commission_amount: s.commission,
        last_deal_date: s.lastDate,
        days_overdue: Math.max(0, daysSince - OVERDUE_DAYS),
        deal_ids: s.dealIds,
      };

      if (daysSince > OVERDUE_DAYS) {
        overdueList.push(item);
      } else {
        dueList.push(item);
      }
    }

    overdueList.sort((a, b) => b.days_overdue - a.days_overdue);
    dueList.sort((a, b) => b.commission_amount - a.commission_amount);

    const settledList: SettledCommission[] = (settlements || []).map(s => {
      const user = userMap.get(s.supplier_phone);
      return {
        id: s.id,
        supplier_phone: s.supplier_phone,
        display_name: user?.display_name || s.supplier_phone,
        city: user?.city || '',
        pallet_count: s.pallet_count,
        commission_amount: Number(s.commission_amount),
        settlement_method: s.settlement_method as SettlementMethod,
        settled_by: s.settled_by,
        settled_at: s.settled_at,
      };
    });

    setDue(dueList);
    setOverdue(overdueList);
    setSettled(settledList);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { due, overdue, settled, loading, refresh };
}

export function useSupplierFinanceProfile(phone: string | null) {
  const [profile, setProfile] = useState<SupplierFinanceProfile | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!phone) { setProfile(null); return; }

    const load = async () => {
      setLoading(true);

      const [{ data: user }, { data: deals }, { data: settlements }] = await Promise.all([
        supabase.from('platform_users').select('phone, display_name, city').eq('phone', phone).maybeSingle(),
        supabase.from('deals').select('id, deal_ref, city, quantity, platform_fee_per_pallet, final_price, completed_at, created_at, status').eq('supplier_phone', phone).not('status', 'eq', 'cancelled').order('created_at', { ascending: false }),
        supabase.from('commission_settlements').select('deal_id').eq('supplier_phone', phone).eq('status', 'settled'),
      ]);

      const settledDealIds = new Set((settlements || []).map(s => s.deal_id));
      const dealRows: SupplierDealRow[] = (deals || []).map(d => ({
        id: d.id,
        deal_ref: d.deal_ref,
        city: d.city,
        quantity: d.quantity,
        commission: d.quantity * (Number(d.platform_fee_per_pallet) || 1),
        date: d.completed_at || d.created_at,
        status: settledDealIds.has(d.id) ? 'settled' as const : 'pending' as const,
      }));

      const totalPallets = dealRows.reduce((s, d) => s + d.quantity, 0);
      const totalSales = (deals || []).reduce((s, d) => s + Number(d.final_price || 0), 0);
      const totalCommission = dealRows.reduce((s, d) => s + d.commission, 0);

      setProfile({
        phone,
        display_name: user?.display_name || phone,
        city: user?.city || '',
        total_pallets: totalPallets,
        total_sales: totalSales,
        total_commission: totalCommission,
        deals: dealRows,
      });
      setLoading(false);
    };

    load();
  }, [phone]);

  return { profile, loading };
}

export function useMarketStats() {
  const [citySales, setCitySales] = useState<CityPalletStat[]>([]);
  const [topSuppliers, setTopSuppliers] = useState<TopSupplier[]>([]);
  const [sizeDistribution, setSizeDistribution] = useState<SizeDistribution[]>([]);
  const [summary, setSummary] = useState<MarketSummary>({
    totalPallets: 0, totalSalesVolume: 0, totalDeals: 0,
    activeCities: 0, activeSuppliers: 0, avgDealSize: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      const { data: deals } = await supabase
        .from('deals')
        .select('city, supplier_phone, quantity, size, platform_fee_per_pallet, final_price')
        .not('status', 'eq', 'cancelled');

      const { data: users } = await supabase
        .from('platform_users')
        .select('phone, display_name, city');

      const userMap = new Map((users || []).map(u => [u.phone, u]));

      const cityMap = new Map<string, { pallets: number; sales: number }>();
      const supplierMap = new Map<string, { pallets: number; sales: number; commission: number }>();
      const sizeMap = new Map<string, { count: number; sales: number }>();
      let totalPallets = 0;
      let totalSales = 0;
      const allDeals = deals || [];

      for (const d of allDeals) {
        const qty = d.quantity;
        const price = Number(d.final_price) || 0;
        const dealSales = qty * price;
        totalPallets += qty;
        totalSales += dealSales;
        const fee = Number(d.platform_fee_per_pallet) || 1;

        const cityEntry = cityMap.get(d.city);
        if (cityEntry) {
          cityEntry.pallets += qty;
          cityEntry.sales += dealSales;
        } else {
          cityMap.set(d.city, { pallets: qty, sales: dealSales });
        }

        const supEntry = supplierMap.get(d.supplier_phone);
        if (supEntry) {
          supEntry.pallets += qty;
          supEntry.sales += dealSales;
          supEntry.commission += qty * fee;
        } else {
          supplierMap.set(d.supplier_phone, { pallets: qty, sales: dealSales, commission: qty * fee });
        }

        const sizeEntry = sizeMap.get(d.size);
        if (sizeEntry) {
          sizeEntry.count += qty;
          sizeEntry.sales += dealSales;
        } else {
          sizeMap.set(d.size, { count: qty, sales: dealSales });
        }
      }

      const cityStats: CityPalletStat[] = Array.from(cityMap.entries())
        .map(([city, data]) => ({
          city,
          pallets: data.pallets,
          salesVolume: data.sales,
          percentage: totalPallets > 0 ? Math.round((data.pallets / totalPallets) * 100) : 0,
        }))
        .sort((a, b) => b.pallets - a.pallets)
        .slice(0, 10);

      const topSup: TopSupplier[] = Array.from(supplierMap.entries())
        .map(([phone, data]) => {
          const user = userMap.get(phone);
          return {
            phone,
            display_name: user?.display_name || phone,
            city: user?.city || '',
            pallets: data.pallets,
            salesVolume: data.sales,
            commission: data.commission,
          };
        })
        .sort((a, b) => b.pallets - a.pallets)
        .slice(0, 10);

      const sizeDist: SizeDistribution[] = Array.from(sizeMap.entries())
        .map(([size, data]) => ({
          size,
          count: data.count,
          salesVolume: data.sales,
          percentage: totalPallets > 0 ? Math.round((data.count / totalPallets) * 100) : 0,
        }))
        .sort((a, b) => b.count - a.count);

      setSummary({
        totalPallets,
        totalSalesVolume: totalSales,
        totalDeals: allDeals.length,
        activeCities: cityMap.size,
        activeSuppliers: supplierMap.size,
        avgDealSize: allDeals.length > 0 ? Math.round(totalPallets / allDeals.length) : 0,
      });
      setCitySales(cityStats);
      setTopSuppliers(topSup);
      setSizeDistribution(sizeDist);
      setLoading(false);
    };

    load();
  }, []);

  return { citySales, topSuppliers, sizeDistribution, summary, loading };
}

export async function settleCommission(
  dealIds: string[],
  method: SettlementMethod,
  staff: string
): Promise<{ success: boolean; error?: string }> {
  for (const dealId of dealIds) {
    const { data } = await supabase.rpc('settle_supplier_commission', {
      p_deal_id: dealId,
      p_method: method,
      p_staff: staff,
    });

    if (data && !data.success) {
      return { success: false, error: data.error };
    }
  }
  return { success: true };
}

export async function updatePlatformFee(fee: number): Promise<boolean> {
  const { error } = await supabase
    .from('admin_settings')
    .update({ platform_fee_per_unit: fee, updated_at: new Date().toISOString() })
    .not('id', 'is', null);
  return !error;
}

export async function getPlatformFee(): Promise<number> {
  const { data } = await supabase
    .from('admin_settings')
    .select('platform_fee_per_unit')
    .maybeSingle();
  return Number(data?.platform_fee_per_unit) || 1;
}
