import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

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
    const { error: err } = await supabase.from('cities').update(updates).eq('id', id);
    if (!err) await fetch();
    return err;
  };

  const deleteCity = async (id: string) => {
    const { error: err } = await supabase.from('cities').delete().eq('id', id);
    if (!err) await fetch();
    return err;
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

  return { cities, loading, error, refetch: fetch, updateCity, deleteCity, freezeCity, activateCity, getCityStats };
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
    const { error } = await supabase.from('inventory_batches').delete().eq('id', id);
    if (!error) await fetch();
    return error;
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
    const { error } = await supabase.from('orders').delete().eq('id', id);
    if (!error) await fetch();
    return error;
  };

  return { orders, loading, refetch: fetch, updateOrder, deleteOrder };
}
