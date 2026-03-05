import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { InventoryFormData, ActiveDemand, ImpactPreview } from '../types/inventory';

function computeImpact(
  form: InventoryFormData,
  demand: ActiveDemand[],
  supplierStock: number
): ImpactPreview {
  const newQty = form.quantity || 0;
  const totalAfterDeposit = supplierStock + newQty;

  const allFieldsFilled =
    !!form.palletType && !!form.size && !!form.quality && !!form.city;

  const matching = allFieldsFilled
    ? demand.filter(
        (d) =>
          d.pallet_type === form.palletType &&
          d.size === form.size &&
          d.quality === form.quality &&
          d.city === form.city
      )
    : [];

  const totalNeeded = matching.reduce((s, d) => s + d.quantity_needed, 0);
  const matchableQty = totalNeeded > 0 ? Math.min(newQty, totalNeeded) : 0;
  const coveragePercent =
    totalNeeded > 0 ? Math.round((matchableQty / totalNeeded) * 100) : 0;

  return {
    totalAfterDeposit,
    matchingDemandCount: matching.length,
    coveragePercent,
    matchableQty,
    hasMatch: matchableQty > 0,
  };
}

export function useInventoryMatch(form: InventoryFormData, phone: string) {
  const [demand, setDemand] = useState<ActiveDemand[]>([]);
  const [allDemands, setAllDemands] = useState<ActiveDemand[]>([]);
  const [supplierStock, setSupplierStock] = useState(0);
  const [impact, setImpact] = useState<ImpactPreview>({
    totalAfterDeposit: 0,
    matchingDemandCount: 0,
    coveragePercent: 0,
    matchableQty: 0,
    hasMatch: false,
  });
  const [loadingDemand, setLoadingDemand] = useState(true);
  const demandRef = useRef<ActiveDemand[]>([]);

  useEffect(() => {
    supabase
      .from('orders')
      .select('id, city, pallet_type, size, quality, quantity')
      .in('status', ['pending', 'unmatched'])
      .then(({ data }) => {
        const list: ActiveDemand[] = (data ?? []).map((o: {
          id: string;
          city: string;
          pallet_type: string;
          size: string;
          quality: string;
          quantity: number;
        }) => ({
          id: o.id,
          city: o.city,
          pallet_type: o.pallet_type,
          size: o.size,
          quality: o.quality,
          quantity_needed: o.quantity,
        }));
        setDemand(list);
        setAllDemands(list);
        demandRef.current = list;
        setLoadingDemand(false);
      });
  }, []);

  useEffect(() => {
    if (!phone) {
      setSupplierStock(0);
      return;
    }
    supabase
      .from('inventory_batches')
      .select('available_quantity')
      .eq('phone', phone)
      .in('status', ['active', 'matched', 'draft'])
      .then(({ data }) => {
        const total = (data ?? []).reduce(
          (s: number, r: { available_quantity: number }) => s + (r.available_quantity ?? 0),
          0
        );
        setSupplierStock(total);
      });
  }, [phone]);

  useEffect(() => {
    setImpact(computeImpact(form, demand, supplierStock));
  }, [form, demand, supplierStock]);

  const runDepositMatch = useCallback(
    async (batchId: string): Promise<{ found: boolean; qty: number; demandId?: string }> => {
      await new Promise((r) => setTimeout(r, 2500));

      const { data: deals } = await supabase
        .from('deals')
        .select('id, quantity, order_id')
        .eq('inventory_batch_id', batchId)
        .not('status', 'eq', 'cancelled');

      if (deals && deals.length > 0) {
        const totalMatched = deals.reduce((s: number, d: { quantity: number }) => s + d.quantity, 0);
        return { found: true, qty: totalMatched, demandId: deals[0].order_id };
      }

      return { found: false, qty: 0 };
    },
    []
  );

  return {
    demand,
    allDemands,
    topDemand: allDemands.length > 0 ? allDemands[0] : null,
    impact,
    supplierStock,
    loadingDemand,
    runDepositMatch,
  };
}
