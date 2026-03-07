import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface BuyerInventoryItem {
  id: string;
  pallet_type: string;
  size: string;
  quality: string;
  condition: string | null;
  quantity: number;
  quantity_available: number;
  unit_price: number;
  total_paid: number;
  original_supplier_phone: string;
  original_supplier_name: string;
  city: string;
  images: string[] | any[];
  description: string | null;
  acquired_at: string;
  deal_ref: string;
}

export interface BuyerInventorySummary {
  total_items: number;
  total_pallets: number;
  total_value: number;
  available_pallets: number;
  by_type: Array<{
    pallet_type: string;
    items_count: number;
    total_pallets: number;
    available_pallets: number;
  }>;
  by_city: Array<{
    city: string;
    items_count: number;
    total_pallets: number;
  }>;
}

interface Filters {
  palletType?: string;
  city?: string;
  onlyAvailable?: boolean;
}

export function useBuyerInventory(buyerPhone: string) {
  const [items, setItems] = useState<BuyerInventoryItem[]>([]);
  const [summary, setSummary] = useState<BuyerInventorySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSummary = useCallback(async () => {
    try {
      const { data, error: rpcError } = await supabase.rpc('get_buyer_inventory_summary', {
        p_buyer_phone: buyerPhone,
      });

      if (rpcError) throw rpcError;

      const summaryData = data && typeof data === 'object' ? data : null;
      if (!summaryData) {
        setSummary(null);
        return;
      }

      if (summaryData.success === false) throw new Error(summaryData.error);

      setSummary({
        total_items: summaryData.total_items || 0,
        total_pallets: summaryData.total_pallets || 0,
        total_value: summaryData.total_value || 0,
        available_pallets: summaryData.available_pallets || 0,
        by_type: summaryData.by_type || [],
        by_city: summaryData.by_city || [],
      });
    } catch (err) {
      console.error('Error loading buyer inventory summary:', err);
      setError(err instanceof Error ? err.message : 'فشل تحميل ملخص المخزون');
      setSummary(null);
    }
  }, [buyerPhone]);

  const loadItems = useCallback(async (filters: Filters = {}) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc('get_buyer_inventory_items', {
        p_buyer_phone: buyerPhone,
        p_pallet_type: filters.palletType || null,
        p_city: filters.city || null,
        p_only_available: filters.onlyAvailable || false,
      });

      if (rpcError) throw rpcError;

      setItems(data || []);
    } catch (err) {
      console.error('Error loading buyer inventory items:', err);
      setError(err instanceof Error ? err.message : 'فشل تحميل المخزون');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [buyerPhone]);

  const refresh = useCallback(async (filters: Filters = {}) => {
    await Promise.all([
      loadSummary(),
      loadItems(filters),
    ]);
  }, [loadSummary, loadItems]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Subscribe to realtime changes
  useEffect(() => {
    const channel = supabase
      .channel('buyer_inventory_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'buyer_inventory',
          filter: `buyer_phone=eq.${buyerPhone}`,
        },
        () => {
          refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [buyerPhone, refresh]);

  return {
    items,
    summary,
    loading,
    error,
    refresh,
    loadItems,
  };
}
