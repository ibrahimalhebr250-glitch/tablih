import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export type InventoryStatus = 'active' | 'draft' | 'reserved' | 'pending_supplier' | 'paused' | 'sold';
export type InventoryFilter = 'all' | 'published' | 'unpublished' | 'in_deal';

export interface MyInventoryItem {
  id: string;
  batch_id: string;
  pallet_type: string;
  size: string;
  quality: string;
  pallet_condition: string;
  quantity: number;
  available_quantity: number;
  price_per_pallet: number;
  city: string;
  status: InventoryStatus;
  description: string;
  publish_to_market: boolean;
  created_at: string;
  primary_image_url: string | null;
  image_urls: string[];
}

interface BatchImage {
  batch_id: string;
  url: string;
  is_primary: boolean;
  sort_order: number;
}

function mapStatus(item: { status: string; publish_to_market: boolean }): 'published' | 'unpublished' | 'in_deal' {
  if (item.status === 'reserved' || item.status === 'pending_supplier') return 'in_deal';
  if (item.status === 'active' && item.publish_to_market) return 'published';
  return 'unpublished';
}

export function useMyInventory(phone: string) {
  const [items, setItems] = useState<MyInventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchInventory = useCallback(async () => {
    setLoading(true);
    const { data: batches } = await supabase
      .from('inventory_batches')
      .select('id, batch_id, pallet_type, size, quality, pallet_condition, quantity, available_quantity, price_per_pallet, city, status, description, publish_to_market, created_at')
      .eq('phone', phone)
      .order('created_at', { ascending: false });

    if (!batches || batches.length === 0) {
      setItems([]);
      setLoading(false);
      return;
    }

    const batchIds = batches.map((b: any) => b.id);
    const { data: images } = await supabase
      .from('inventory_images')
      .select('batch_id, url, is_primary, sort_order')
      .in('batch_id', batchIds)
      .order('sort_order', { ascending: true });

    const imagesByBatch: Record<string, { urls: string[]; primary: string | null }> = {};
    const sorted = [...(images ?? [])].sort((a: any, b: any) => {
      if (a.is_primary && !b.is_primary) return -1;
      if (!a.is_primary && b.is_primary) return 1;
      return (a.sort_order ?? 0) - (b.sort_order ?? 0);
    }) as BatchImage[];

    for (const img of sorted) {
      if (!imagesByBatch[img.batch_id]) {
        imagesByBatch[img.batch_id] = { urls: [], primary: null };
      }
      imagesByBatch[img.batch_id].urls.push(img.url);
      if (img.is_primary) {
        imagesByBatch[img.batch_id].primary = img.url;
      }
    }

    const mapped: MyInventoryItem[] = (batches as any[]).map((b) => ({
      id: b.id,
      batch_id: b.batch_id,
      pallet_type: b.pallet_type,
      size: b.size,
      quality: b.quality,
      pallet_condition: b.pallet_condition || 'used',
      quantity: b.quantity,
      available_quantity: b.available_quantity ?? b.quantity,
      price_per_pallet: b.price_per_pallet || 0,
      city: b.city,
      status: b.status as InventoryStatus,
      description: b.description || '',
      publish_to_market: b.publish_to_market ?? true,
      created_at: b.created_at,
      primary_image_url: imagesByBatch[b.id]?.primary || imagesByBatch[b.id]?.urls[0] || null,
      image_urls: imagesByBatch[b.id]?.urls || [],
    }));

    setItems(mapped);
    setLoading(false);
  }, [phone]);

  useEffect(() => {
    fetchInventory();

    const channel = supabase
      .channel('my_inventory_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_batches', filter: `phone=eq.${phone}` }, () => {
        fetchInventory();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchInventory, phone]);

  const getFilteredItems = useCallback((filter: InventoryFilter) => {
    if (filter === 'all') return items;
    return items.filter(item => mapStatus(item) === filter);
  }, [items]);

  const getCounts = useCallback(() => {
    let published = 0;
    let unpublished = 0;
    let inDeal = 0;
    for (const item of items) {
      const s = mapStatus(item);
      if (s === 'published') published++;
      else if (s === 'unpublished') unpublished++;
      else if (s === 'in_deal') inDeal++;
    }
    return { all: items.length, published, unpublished, in_deal: inDeal };
  }, [items]);

  const publishToMarket = useCallback(async (id: string) => {
    setActionLoading(id);
    await supabase
      .from('inventory_batches')
      .update({ status: 'active', publish_to_market: true })
      .eq('id', id);
    await fetchInventory();
    setActionLoading(null);
  }, [fetchInventory]);

  const unpublishFromMarket = useCallback(async (id: string) => {
    setActionLoading(id);
    await supabase
      .from('inventory_batches')
      .update({ publish_to_market: false })
      .eq('id', id);
    await fetchInventory();
    setActionLoading(null);
  }, [fetchInventory]);

  const updateQuantity = useCallback(async (id: string, newQty: number) => {
    if (newQty < 1) return;
    setActionLoading(id);
    await supabase
      .from('inventory_batches')
      .update({ quantity: newQty, available_quantity: newQty, quantity_available: newQty })
      .eq('id', id);
    await fetchInventory();
    setActionLoading(null);
  }, [fetchInventory]);

  const deleteItem = useCallback(async (id: string) => {
    setActionLoading(id);
    await supabase.from('inventory_batches').delete().eq('id', id);
    await fetchInventory();
    setActionLoading(null);
  }, [fetchInventory]);

  const updateDescription = useCallback(async (id: string, desc: string) => {
    setActionLoading(id);
    await supabase
      .from('inventory_batches')
      .update({ description: desc })
      .eq('id', id);
    await fetchInventory();
    setActionLoading(null);
  }, [fetchInventory]);

  const updatePrice = useCallback(async (id: string, price: number) => {
    setActionLoading(id);
    await supabase
      .from('inventory_batches')
      .update({ price_per_pallet: price })
      .eq('id', id);
    await fetchInventory();
    setActionLoading(null);
  }, [fetchInventory]);

  return {
    items,
    loading,
    actionLoading,
    getFilteredItems,
    getCounts,
    publishToMarket,
    unpublishFromMarket,
    updateQuantity,
    deleteItem,
    updateDescription,
    updatePrice,
    refresh: fetchInventory,
  };
}
