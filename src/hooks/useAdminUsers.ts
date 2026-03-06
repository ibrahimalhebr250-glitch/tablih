import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { TrustRating, ActivityLevel } from '../types/admin';

export interface AdminUser {
  id: string;
  phone: string;
  display_name: string;
  company_name: string;
  city: string;
  activity_type: string;
  user_type: string;
  is_suspended: boolean;
  suspension_reason: string | null;
  risk_flag: boolean;
  trust_rating: TrustRating;
  created_at: string;
  last_active: string;
  roles: string[];
  total_orders: number;
  total_inventory: number;
  total_deals: number;
  pallets_sold: number;
  pallets_purchased: number;
  activity_level: ActivityLevel;
  account_status: 'active' | 'suspended' | 'inactive';
}

const PAGE_SIZE = 15;
const INACTIVE_DAYS = 30;

function getActivityLevel(lastActive: string, totalDeals: number): ActivityLevel {
  if (!lastActive) return 'inactive';
  const daysSince = Math.floor((Date.now() - new Date(lastActive).getTime()) / 86400000);
  if (daysSince <= 7 && totalDeals > 0) return 'active';
  if (daysSince <= INACTIVE_DAYS) return 'moderate';
  return 'inactive';
}

function getAccountStatus(user: { is_suspended: boolean; last_active: string }): 'active' | 'suspended' | 'inactive' {
  if (user.is_suspended) return 'suspended';
  if (!user.last_active) return 'inactive';
  const daysSince = Math.floor((Date.now() - new Date(user.last_active).getTime()) / 86400000);
  return daysSince > INACTIVE_DAYS ? 'inactive' : 'active';
}

export function useAdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);

  const fetchUsers = useCallback(async () => {
    setLoading(true);

    let query = supabase
      .from('platform_users')
      .select('id, phone, display_name, company_name, city, activity_type, user_type, is_suspended, suspension_reason, risk_flag, trust_rating, created_at, last_active', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (search.trim()) {
      query = query.or(`display_name.ilike.%${search.trim()}%,company_name.ilike.%${search.trim()}%,phone.ilike.%${search.trim()}%`);
    }

    if (typeFilter) {
      query = query.eq('user_type', typeFilter);
    }

    if (statusFilter === 'active') {
      query = query.eq('is_suspended', false);
    } else if (statusFilter === 'suspended') {
      query = query.eq('is_suspended', true);
    }

    query = query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    const { data: usersData, count } = await query;
    setTotal(count ?? 0);

    if (!usersData || usersData.length === 0) {
      setUsers([]);
      setLoading(false);
      return;
    }

    const phones = usersData.map(u => u.phone);

    const [rolesRes, ordersRes, inventoryRes, dealsRes] = await Promise.all([
      supabase.from('user_roles').select('phone, role').in('phone', phones),
      supabase.from('orders').select('phone, quantity').in('phone', phones),
      supabase.from('inventory_batches').select('supplier_phone').in('supplier_phone', phones),
      supabase.from('deals').select('buyer_phone, supplier_phone, quantity, status').or(`buyer_phone.in.(${phones.join(',')}),supplier_phone.in.(${phones.join(',')})`).not('status', 'eq', 'cancelled'),
    ]);

    const rolesMap: Record<string, string[]> = {};
    (rolesRes.data ?? []).forEach((r: { phone: string; role: string }) => {
      if (!rolesMap[r.phone]) rolesMap[r.phone] = [];
      rolesMap[r.phone].push(r.role);
    });

    const ordersCount: Record<string, number> = {};
    (ordersRes.data ?? []).forEach((o: { phone: string }) => {
      ordersCount[o.phone] = (ordersCount[o.phone] ?? 0) + 1;
    });

    const inventoryCount: Record<string, number> = {};
    (inventoryRes.data ?? []).forEach((i: { supplier_phone: string }) => {
      inventoryCount[i.supplier_phone] = (inventoryCount[i.supplier_phone] ?? 0) + 1;
    });

    const dealsCount: Record<string, number> = {};
    const palletsSold: Record<string, number> = {};
    const palletsPurchased: Record<string, number> = {};
    (dealsRes.data ?? []).forEach((d: { buyer_phone: string; supplier_phone: string; quantity: number }) => {
      if (phones.includes(d.buyer_phone)) {
        dealsCount[d.buyer_phone] = (dealsCount[d.buyer_phone] ?? 0) + 1;
        palletsPurchased[d.buyer_phone] = (palletsPurchased[d.buyer_phone] ?? 0) + d.quantity;
      }
      if (phones.includes(d.supplier_phone)) {
        dealsCount[d.supplier_phone] = (dealsCount[d.supplier_phone] ?? 0) + 1;
        palletsSold[d.supplier_phone] = (palletsSold[d.supplier_phone] ?? 0) + d.quantity;
      }
    });

    let enriched: AdminUser[] = usersData.map(u => {
      const totalDeals = dealsCount[u.phone] ?? 0;
      return {
        ...u,
        trust_rating: (u.trust_rating ?? 3) as TrustRating,
        roles: rolesMap[u.phone] ?? [],
        total_orders: ordersCount[u.phone] ?? 0,
        total_inventory: inventoryCount[u.phone] ?? 0,
        total_deals: totalDeals,
        pallets_sold: palletsSold[u.phone] ?? 0,
        pallets_purchased: palletsPurchased[u.phone] ?? 0,
        activity_level: getActivityLevel(u.last_active, totalDeals),
        account_status: getAccountStatus(u),
      };
    });

    if (roleFilter) {
      enriched = enriched.filter(u => u.roles.includes(roleFilter));
    }

    if (statusFilter === 'inactive') {
      enriched = enriched.filter(u => u.account_status === 'inactive');
    }

    setUsers(enriched);
    setLoading(false);
  }, [search, typeFilter, roleFilter, statusFilter, page]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    setPage(0);
  }, [search, typeFilter, roleFilter, statusFilter]);

  const toggleSuspend = useCallback(async (userId: string, suspend: boolean, reason?: string) => {
    await supabase
      .from('platform_users')
      .update({ is_suspended: suspend, suspension_reason: suspend ? (reason ?? null) : null })
      .eq('id', userId);
    await fetchUsers();
  }, [fetchUsers]);

  const toggleRiskFlag = useCallback(async (userId: string, flag: boolean) => {
    await supabase
      .from('platform_users')
      .update({ risk_flag: flag })
      .eq('id', userId);
    await fetchUsers();
  }, [fetchUsers]);

  const updateTrustRating = useCallback(async (userId: string, rating: TrustRating) => {
    await supabase
      .from('platform_users')
      .update({ trust_rating: rating })
      .eq('id', userId);
    await fetchUsers();
  }, [fetchUsers]);

  const deleteUsers = useCallback(async (userIds: string[], adminEmail: string): Promise<{ success: boolean; error?: string; deletedCount?: number }> => {
    const { data, error } = await supabase.rpc('admin_delete_users', {
      p_admin_email: adminEmail,
      p_user_ids: userIds
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (data && !data.success) {
      return { success: false, error: data.error };
    }

    await fetchUsers();
    return { success: true, deletedCount: data?.deleted_count || 0 };
  }, [fetchUsers]);

  return {
    users,
    loading,
    search,
    setSearch,
    typeFilter,
    setTypeFilter,
    roleFilter,
    setRoleFilter,
    statusFilter,
    setStatusFilter,
    page,
    setPage,
    total,
    pageSize: PAGE_SIZE,
    toggleSuspend,
    toggleRiskFlag,
    updateTrustRating,
    deleteUsers,
    refetch: fetchUsers,
  };
}
