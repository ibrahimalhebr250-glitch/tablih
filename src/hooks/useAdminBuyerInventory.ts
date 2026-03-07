import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface BuyerInventoryStats {
  total_buyers: number;
  total_items: number;
  total_pallets: number;
  total_value: number;
  available_pallets: number;
  withdrawn_pallets: number;
  by_type: Array<{
    pallet_type: string;
    items_count: number;
    total_pallets: number;
    available_pallets: number;
    total_value: number;
  }>;
  by_city: Array<{
    city: string;
    items_count: number;
    total_pallets: number;
    total_value: number;
  }>;
  top_buyers: Array<{
    buyer_phone: string;
    buyer_name: string;
    items_count: number;
    total_pallets: number;
    total_value: number;
  }>;
}

export interface BuyerInventoryItem {
  id: string;
  buyer_phone: string;
  buyer_name: string;
  original_deal_id: string;
  deal_ref: string;
  pallet_type: string;
  size: string;
  quality: string;
  condition: string;
  quantity: number;
  quantity_available: number;
  unit_price: number;
  total_paid: number;
  original_supplier_phone: string;
  original_supplier_name: string;
  city: string;
  images: string[];
  description: string;
  acquired_at: string;
  created_at: string;
}

export interface ExpiredReservation {
  deal_id: string;
  deal_ref: string;
  status: string;
  buyer_phone: string;
  buyer_name: string;
  supplier_phone: string;
  supplier_name: string;
  pallet_type: string;
  size: string;
  quantity: number;
  city: string;
  reserved_at: string;
  reservation_expires_at: string;
  hours_expired: number;
  is_suspended: boolean;
}

export function useAdminBuyerInventory(adminEmail: string) {
  const [stats, setStats] = useState<BuyerInventoryStats | null>(null);
  const [items, setItems] = useState<BuyerInventoryItem[]>([]);
  const [expiredReservations, setExpiredReservations] = useState<ExpiredReservation[]>([]);

  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingItems, setLoadingItems] = useState(true);
  const [loadingExpired, setLoadingExpired] = useState(false);

  const [selectedBuyer, setSelectedBuyer] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [onlyAvailable, setOnlyAvailable] = useState(false);

  const loadStats = useCallback(async () => {
    if (!adminEmail) return;
    setLoadingStats(true);
    try {
      const { data, error } = await supabase.rpc('admin_get_buyer_inventory_stats', {
        p_admin_email: adminEmail
      });

      if (error) throw error;
      if (data?.success) {
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to load buyer inventory stats:', err);
    } finally {
      setLoadingStats(false);
    }
  }, [adminEmail]);

  const loadItems = useCallback(async () => {
    if (!adminEmail) return;
    setLoadingItems(true);
    try {
      const { data, error } = await supabase.rpc('admin_get_buyer_inventory_list', {
        p_admin_email: adminEmail,
        p_buyer_phone: selectedBuyer,
        p_city: selectedCity,
        p_pallet_type: selectedType,
        p_only_available: onlyAvailable,
        p_limit: 100,
        p_offset: 0
      });

      if (error) throw error;
      setItems(data || []);
    } catch (err) {
      console.error('Failed to load buyer inventory items:', err);
      setItems([]);
    } finally {
      setLoadingItems(false);
    }
  }, [adminEmail, selectedBuyer, selectedCity, selectedType, onlyAvailable]);

  const loadExpiredReservations = useCallback(async () => {
    if (!adminEmail) return;
    setLoadingExpired(true);
    try {
      const { data, error } = await supabase.rpc('admin_get_expired_reservations', {
        p_admin_email: adminEmail
      });

      if (error) throw error;
      setExpiredReservations(data || []);
    } catch (err) {
      console.error('Failed to load expired reservations:', err);
      setExpiredReservations([]);
    } finally {
      setLoadingExpired(false);
    }
  }, [adminEmail]);

  useEffect(() => {
    loadStats();
    loadItems();
  }, [loadStats, loadItems]);

  useEffect(() => {
    if (!adminEmail) return;

    const buyerInventoryChannel = supabase
      .channel('admin-buyer-inventory-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'buyer_inventory'
        },
        () => {
          loadStats();
          loadItems();
        }
      )
      .subscribe();

    const dealsChannel = supabase
      .channel('admin-deals-changes-for-buyer-inventory')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'deals',
          filter: 'status=eq.completed'
        },
        () => {
          loadStats();
          loadItems();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(buyerInventoryChannel);
      supabase.removeChannel(dealsChannel);
    };
  }, [adminEmail, loadStats, loadItems]);

  const refresh = useCallback(() => {
    loadStats();
    loadItems();
  }, [loadStats, loadItems]);

  const clearFilters = useCallback(() => {
    setSelectedBuyer(null);
    setSelectedCity(null);
    setSelectedType(null);
    setOnlyAvailable(false);
  }, []);

  return {
    stats,
    items,
    expiredReservations,
    loadingStats,
    loadingItems,
    loadingExpired,
    selectedBuyer,
    selectedCity,
    selectedType,
    onlyAvailable,
    setSelectedBuyer,
    setSelectedCity,
    setSelectedType,
    setOnlyAvailable,
    clearFilters,
    loadExpiredReservations,
    refresh
  };
}
