import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { getAdminEmail } from '../utils/adminAuth';

export interface City {
  id: string;
  name: string;
  status: string;
  custom_fee_override: number | null;
  minimum_quantity: number;
  matching_enabled: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CityStats {
  id: string;
  total_supply: number;
  total_demand: number;
  active_deals: number;
  inventory_count: number;
  request_count: number;
}

export interface InventoryBatch {
  id: string;
  batch_id: string;
  phone: string | null;
  pallet_type: string;
  size: string;
  quality: string;
  quantity: number;
  available_quantity: number;
  quantity_reserved: number;
  quantity_total: number;
  min_price: number;
  city: string;
  status: string;
  is_frozen: boolean;
  hide_from_matching: boolean;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderRequest {
  id: string;
  request_id: string;
  phone: string | null;
  pallet_type: string;
  size: string;
  quality: string;
  quantity: number;
  city: string;
  status: string;
  order_source: string | null;
  accept_close_quality: boolean;
  accept_close_city: boolean;
  accept_partial_delivery: boolean;
  created_at: string;
  updated_at: string;
}

export function useCities() {
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data, error: err } = await supabase
      .from('cities')
      .select('*')
      .order('name');
    if (err) setError(err.message);
    else setCities(data as City[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const updateCity = async (id: string, updates: Partial<City>) => {
    const adminEmail = getAdminEmail();
    if (!adminEmail) return { message: 'غير مصرح لك بهذا الإجراء' };
    const { data, error: err } = await supabase.rpc('admin_update_city_v2', {
      p_admin_email: adminEmail,
      p_city_id: id,
      p_name: updates.name ?? null,
      p_status: updates.status ?? null,
      p_minimum_quantity: updates.minimum_quantity ?? null,
      p_matching_enabled: updates.matching_enabled ?? null,
    });
    if (err) return err;
    if (data && !data.success) return { message: data.error || 'فشل تعديل المدينة' };
    await fetch();
    return null;
  };

  const deleteCity = async (id: string) => {
    const adminEmail = getAdminEmail();
    if (!adminEmail) {
      return { message: 'غير مصرح لك بهذا الإجراء' };
    }

    const { data, error: err } = await supabase.rpc('admin_delete_city', {
      p_admin_email: adminEmail,
      p_city_id: id
    });

    if (err) return err;
    if (data && !data.success) {
      return { message: data.error || 'فشل حذف المدينة' };
    }

    await fetch();
    return null;
  };

  const addCity = async (name: string, status: string = 'active') => {
    const adminEmail = getAdminEmail();
    if (!adminEmail) return { message: 'غير مصرح لك بهذا الإجراء' };
    const { data, error: err } = await supabase.rpc('admin_add_city', {
      p_admin_email: adminEmail,
      p_name: name,
      p_status: status,
      p_minimum_quantity: 1,
      p_matching_enabled: true,
    });
    if (err) return { message: err.message };
    if (data && !data.success) return { message: data.error || 'فشل إضافة المدينة' };
    await fetch();
    return null;
  };

  const freezeCity = async (id: string) => {
    return updateCity(id, { status: 'frozen' });
  };

  const activateCity = async (id: string) => {
    return updateCity(id, { status: 'active' });
  };

  const getCityStats = async (cityName: string): Promise<CityStats | null> => {
    const [invRes, ordRes, dealRes] = await Promise.all([
      supabase.from('inventory_batches').select('id, available_quantity').eq('city', cityName).eq('status', 'available'),
      supabase.from('orders').select('id, quantity').eq('city', cityName).in('status', ['pending', 'processing']),
      supabase.from('deals').select('id').eq('city', cityName).not('status', 'in', '("cancelled","delivered")'),
    ]);
    const supply = (invRes.data ?? []).reduce((s, r) => s + (r.available_quantity ?? 0), 0);
    const demand = (ordRes.data ?? []).reduce((s, r) => s + (r.quantity ?? 0), 0);
    return {
      id: cityName,
      total_supply: supply,
      total_demand: demand,
      active_deals: dealRes.data?.length ?? 0,
      inventory_count: invRes.data?.length ?? 0,
      request_count: ordRes.data?.length ?? 0,
    };
  };

  const deleteCities = async (ids: string[]) => {
    const adminEmail = getAdminEmail();
    if (!adminEmail) return { message: 'غير مصرح لك بهذا الإجراء' };
    const errors: string[] = [];
    for (const id of ids) {
      const { data, error: err } = await supabase.rpc('admin_delete_city', {
        p_admin_email: adminEmail,
        p_city_id: id
      });
      if (err) errors.push(err.message);
      else if (data && !data.success) errors.push(data.error || 'فشل حذف المدينة');
    }
    await fetch();
    return errors.length > 0 ? { message: errors[0] } : null;
  };

  return { cities, loading, error, refetch: fetch, addCity, updateCity, deleteCity, deleteCities, freezeCity, activateCity, getCityStats };
}

export function useInventory() {
  const [batches, setBatches] = useState<InventoryBatch[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('inventory_batches')
      .select('*')
      .order('created_at', { ascending: false });
    setBatches((data ?? []) as InventoryBatch[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const updateBatch = async (id: string, updates: Partial<InventoryBatch>) => {
    const { error } = await supabase.from('inventory_batches').update(updates).eq('id', id);
    if (!error) await fetch();
    return error;
  };

  const deleteBatch = async (id: string) => {
    const adminEmail = getAdminEmail();
    if (!adminEmail) {
      return { message: 'غير مصرح لك بهذا الإجراء' };
    }

    const { data, error } = await supabase.rpc('admin_delete_inventory_batch', {
      p_admin_email: adminEmail,
      p_batch_id: id
    });

    if (error) return error;
    if (data && !data.success) {
      return { message: data.error || 'فشل حذف دفعة المخزون' };
    }

    await fetch();
    return null;
  };

  const freezeBatch = async (id: string) => {
    return updateBatch(id, { is_frozen: true, hide_from_matching: true, status: 'frozen' });
  };

  const unfreezeBatch = async (id: string) => {
    return updateBatch(id, { is_frozen: false, hide_from_matching: false, status: 'active' });
  };

  return { batches, loading, refetch: fetch, updateBatch, deleteBatch, freezeBatch, unfreezeBatch };
}

export function useOrders() {
  const [orders, setOrders] = useState<OrderRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });
    setOrders((data ?? []) as OrderRequest[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const updateOrder = async (id: string, updates: Partial<OrderRequest>) => {
    const { error } = await supabase.from('orders').update(updates).eq('id', id);
    if (!error) await fetch();
    return error;
  };

  const deleteOrder = async (id: string) => {
    const adminEmail = getAdminEmail();
    if (!adminEmail) {
      return { message: 'غير مصرح لك بهذا الإجراء' };
    }

    const { data, error } = await supabase.rpc('admin_delete_order', {
      p_admin_email: adminEmail,
      p_order_id: id
    });

    if (error) return error;
    if (data && !data.success) {
      return { message: data.error || 'فشل حذف الطلب' };
    }

    await fetch();
    return null;
  };

  return { orders, loading, refetch: fetch, updateOrder, deleteOrder };
}
