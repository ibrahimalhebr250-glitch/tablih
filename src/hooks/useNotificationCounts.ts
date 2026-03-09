import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface NotificationCounts {
  activeOrders: number;
  activeDeals: number;
  availableInventory: number;
}

export function useNotificationCounts(phone?: string) {
  const [counts, setCounts] = useState<NotificationCounts>({
    activeOrders: 0,
    activeDeals: 0,
    availableInventory: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!phone) {
      setCounts({ activeOrders: 0, activeDeals: 0, availableInventory: 0 });
      setLoading(false);
      return;
    }

    const fetchCounts = async () => {
      try {
        const [ordersRes, dealsRes, inventoryRes] = await Promise.all([
          supabase
            .from('orders')
            .select('id', { count: 'exact', head: true })
            .eq('phone', phone)
            .in('status', ['pending', 'matched', 'unmatched']),

          supabase
            .from('deals')
            .select('id', { count: 'exact', head: true })
            .or(`buyer_phone.eq.${phone},supplier_phone.eq.${phone}`)
            .in('status', ['pending_supplier', 'pending_buyer', 'confirmed', 'in_delivery']),

          supabase
            .from('inventory_batches')
            .select('id', { count: 'exact', head: true })
            .eq('supplier_phone', phone)
            .eq('status', 'available')
            .gt('available_quantity', 0),
        ]);

        setCounts({
          activeOrders: ordersRes.count || 0,
          activeDeals: dealsRes.count || 0,
          availableInventory: inventoryRes.count || 0,
        });
      } catch (error) {
        console.error('Error fetching notification counts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCounts();

    const ordersSubscription = supabase
      .channel(`orders_count_changes_${phone}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `phone=eq.${phone}` }, fetchCounts)
      .subscribe();

    const dealsBuyerSubscription = supabase
      .channel(`deals_count_buyer_${phone}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deals', filter: `buyer_phone=eq.${phone}` }, fetchCounts)
      .subscribe();

    const dealsSupplierSubscription = supabase
      .channel(`deals_count_supplier_${phone}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deals', filter: `supplier_phone=eq.${phone}` }, fetchCounts)
      .subscribe();

    const inventorySubscription = supabase
      .channel(`inventory_count_changes_${phone}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_batches', filter: `supplier_phone=eq.${phone}` }, fetchCounts)
      .subscribe();

    return () => {
      ordersSubscription.unsubscribe();
      dealsBuyerSubscription.unsubscribe();
      dealsSupplierSubscription.unsubscribe();
      inventorySubscription.unsubscribe();
    };
  }, [phone]);

  return { counts, loading };
}
