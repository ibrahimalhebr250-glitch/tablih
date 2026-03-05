import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { StaffMember } from '../types/admin';

export interface CustomRole {
  id: string;
  name: string;
  slug: string;
  description: string;
  color: string;
  bg: string;
  can_view: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_settle: boolean;
  can_modify_financials: boolean;
  can_manage_cities: boolean;
  can_manage_users: boolean;
  can_view_analytics: boolean;
  can_manage_staff: boolean;
  is_system: boolean;
  created_at: string;
}

export function useCustomRoles() {
  const [roles, setRoles] = useState<CustomRole[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRoles = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('custom_roles')
      .select('*')
      .order('is_system', { ascending: false })
      .order('created_at', { ascending: true });

    setRoles((data ?? []) as CustomRole[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchRoles(); }, [fetchRoles]);

  const addRole = useCallback(async (data: {
    name: string;
    slug: string;
    description: string;
    color: string;
    bg: string;
    can_view: boolean;
    can_edit: boolean;
    can_delete: boolean;
    can_settle: boolean;
    can_modify_financials: boolean;
    can_manage_cities: boolean;
    can_manage_users: boolean;
    can_view_analytics: boolean;
    can_manage_staff: boolean;
  }) => {
    const { error } = await supabase.from('custom_roles').insert({ ...data, is_system: false });
    if (!error) await fetchRoles();
    return !error;
  }, [fetchRoles]);

  const updateRole = useCallback(async (id: string, data: Partial<CustomRole>) => {
    const { error } = await supabase.from('custom_roles').update(data).eq('id', id);
    if (!error) await fetchRoles();
    return !error;
  }, [fetchRoles]);

  const deleteRole = useCallback(async (id: string) => {
    const { error } = await supabase.from('custom_roles').delete().eq('id', id);
    if (!error) await fetchRoles();
    return !error;
  }, [fetchRoles]);

  return { roles, loading, addRole, updateRole, deleteRole, refetch: fetchRoles };
}

export function useStaffManagement() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStaff = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('admin_roles')
      .select('*')
      .order('created_at', { ascending: false });

    setStaff((data ?? []).map(s => ({
      id: s.id,
      phone: s.phone,
      display_name: s.display_name ?? '',
      email: s.email ?? '',
      role: s.role,
      is_active: s.is_active,
      can_view: s.can_view,
      can_edit: s.can_edit,
      can_delete: s.can_delete,
      can_settle: s.can_settle,
      can_modify_financials: s.can_modify_financials,
      can_manage_cities: s.can_manage_cities,
      can_manage_users: s.can_manage_users,
      can_view_analytics: s.can_view_analytics ?? false,
      can_manage_staff: s.can_manage_staff ?? false,
      created_at: s.created_at,
    })));
    setLoading(false);
  }, []);

  useEffect(() => { fetchStaff(); }, [fetchStaff]);

  const addStaff = useCallback(async (data: {
    phone: string;
    display_name: string;
    email: string;
    role: string;
    permissions: Record<string, boolean>;
  }) => {
    const { error } = await supabase.from('admin_roles').insert({
      phone: data.phone,
      display_name: data.display_name,
      email: data.email,
      role: data.role,
      ...data.permissions,
    });
    if (!error) await fetchStaff();
    return !error;
  }, [fetchStaff]);

  const updateStaff = useCallback(async (id: string, data: {
    display_name?: string;
    email?: string;
    role?: string;
    is_active?: boolean;
    permissions?: Record<string, boolean>;
  }) => {
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (data.display_name !== undefined) update.display_name = data.display_name;
    if (data.email !== undefined) update.email = data.email;
    if (data.role !== undefined) update.role = data.role;
    if (data.is_active !== undefined) update.is_active = data.is_active;
    if (data.permissions) Object.assign(update, data.permissions);
    const { error } = await supabase.from('admin_roles').update(update).eq('id', id);
    if (!error) await fetchStaff();
    return !error;
  }, [fetchStaff]);

  const toggleActive = useCallback(async (id: string, active: boolean) => {
    const { error } = await supabase
      .from('admin_roles')
      .update({ is_active: active, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (!error) await fetchStaff();
    return !error;
  }, [fetchStaff]);

  return { staff, loading, addStaff, updateStaff, toggleActive, refetch: fetchStaff };
}

export function useUserAnalytics() {
  const [data, setData] = useState({
    totalUsers: 0,
    activeSuppliers: 0,
    newUsersThisMonth: 0,
    inactiveUsers: 0,
    topSuppliers: [] as { phone: string; display_name: string; city: string; pallets: number }[],
    cityDistribution: [] as { city: string; count: number; percentage: number }[],
    monthlyGrowth: [] as { month: string; count: number }[],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      const [usersRes, rolesRes, dealsRes] = await Promise.all([
        supabase.from('platform_users').select('phone, city, created_at, last_active, is_suspended, display_name'),
        supabase.from('user_roles').select('phone, role'),
        supabase.from('deals').select('supplier_phone, quantity').not('status', 'eq', 'cancelled'),
      ]);

      const users = usersRes.data ?? [];
      const roles = rolesRes.data ?? [];
      const deals = dealsRes.data ?? [];

      const supplierPhones = new Set(roles.filter(r => r.role === 'supplier').map(r => r.phone));
      const now = Date.now();
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      let activeSuppliers = 0;
      let newThisMonth = 0;
      let inactiveCount = 0;
      const cityMap = new Map<string, number>();
      const monthMap = new Map<string, number>();

      for (const u of users) {
        if (u.created_at && new Date(u.created_at) >= monthStart) newThisMonth++;

        const daysSince = u.last_active ? Math.floor((now - new Date(u.last_active).getTime()) / 86400000) : 999;
        if (daysSince > 30 || u.is_suspended) inactiveCount++;

        if (supplierPhones.has(u.phone) && daysSince <= 30) activeSuppliers++;

        if (u.city) {
          cityMap.set(u.city, (cityMap.get(u.city) ?? 0) + 1);
        }

        if (u.created_at) {
          const d = new Date(u.created_at);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          monthMap.set(key, (monthMap.get(key) ?? 0) + 1);
        }
      }

      const supplierPallets = new Map<string, number>();
      for (const d of deals) {
        supplierPallets.set(d.supplier_phone, (supplierPallets.get(d.supplier_phone) ?? 0) + d.quantity);
      }

      const userMap = new Map(users.map(u => [u.phone, u]));
      const topSuppliers = Array.from(supplierPallets.entries())
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([phone, pallets]) => {
          const u = userMap.get(phone);
          return { phone, display_name: u?.display_name ?? phone, city: u?.city ?? '', pallets };
        });

      const totalUsers = users.length;
      const cityDist = Array.from(cityMap.entries())
        .map(([city, count]) => ({
          city,
          count,
          percentage: totalUsers > 0 ? Math.round((count / totalUsers) * 100) : 0,
        }))
        .sort((a, b) => b.count - a.count);

      const sortedMonths = Array.from(monthMap.entries()).sort(([a], [b]) => a.localeCompare(b)).slice(-12);
      const monthlyGrowth = sortedMonths.map(([month, count]) => ({ month, count }));

      setData({
        totalUsers,
        activeSuppliers,
        newUsersThisMonth: newThisMonth,
        inactiveUsers: inactiveCount,
        topSuppliers,
        cityDistribution: cityDist,
        monthlyGrowth,
      });
      setLoading(false);
    };

    load();
  }, []);

  return { data, loading };
}

export function useAuditLog() {
  const [logs, setLogs] = useState<{
    id: string;
    admin_phone: string;
    action: string;
    entity_type: string;
    created_at: string;
  }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('audit_log')
        .select('id, admin_phone, action, entity_type, created_at')
        .order('created_at', { ascending: false })
        .limit(50);

      setLogs(data ?? []);
      setLoading(false);
    };
    load();
  }, []);

  return { logs, loading };
}
