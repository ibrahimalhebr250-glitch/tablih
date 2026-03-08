import { useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { OrderFormData, MatchResult } from '../types/order';

export function useMatching() {
  const [isLoading, setIsLoading] = useState(false);
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runningRef = useRef(false);

  const runMatching = useCallback(
    async (
      form: OrderFormData,
      phone: string,
      onDone: (orderId: string, requestId: string) => void
    ) => {
      if (runningRef.current) return;
      runningRef.current = true;
      setIsLoading(true);
      setError(null);

      try {
        const { data: savedOrder, error: insertError } = await supabase
          .from('orders')
          .insert({
            pallet_type: form.palletType,
            size: form.size,
            quality: form.quality,
            quantity: form.quantity,
            city: form.city,
            pallet_condition: form.condition || 'new',
            accept_close_quality: form.acceptCloseQuality,
            accept_close_city: form.acceptCloseCity,
            accept_partial_delivery: form.acceptPartialDelivery,
            phone,
            status: 'unmatched',
            order_source: 'manual_order',
          })
          .select('id, request_id')
          .maybeSingle();

        if (insertError) throw insertError;
        if (!savedOrder) throw new Error('Failed to create order');

        const { data: existingUser } = await supabase
          .from('platform_users')
          .select('id')
          .eq('phone', phone)
          .maybeSingle();
        if (existingUser) {
          await supabase
            .from('user_roles')
            .upsert(
              { user_id: existingUser.id, phone, role: 'buyer' },
              { onConflict: 'phone,role', ignoreDuplicates: true }
            );
        }

        await new Promise((r) => setTimeout(r, 2000));

        const { data: updatedOrder } = await supabase
          .from('orders')
          .select('id, request_id, status, matched_quantity')
          .eq('id', savedOrder.id)
          .maybeSingle();

        if (
          updatedOrder &&
          (updatedOrder.status === 'matched' || updatedOrder.status === 'partially_matched')
        ) {
          const { data: deals } = await supabase
            .from('deals')
            .select('id, deal_ref, quantity, supplier_phone, city, reservation_expires_at')
            .eq('order_id', savedOrder.id)
            .not('status', 'eq', 'cancelled')
            .order('created_at', { ascending: false })
            .limit(1);

          if (deals && deals.length > 0) {
            const deal = deals[0];
            const result: MatchResult = {
              found: true,
              matchedQuantity: deal.quantity,
              supplierCity: deal.city,
              supplierPhone: deal.supplier_phone,
              dealId: deal.id,
              dealRef: deal.deal_ref,
              reservationExpiresAt: deal.reservation_expires_at,
            };
            setMatchResult(result);
            onDone(savedOrder.id, savedOrder.request_id);
            return;
          }
        }

        let retries = 0;
        const maxRetries = 3;
        while (retries < maxRetries) {
          await new Promise((r) => setTimeout(r, 1500));
          retries++;

          const { data: recheckOrder } = await supabase
            .from('orders')
            .select('id, status, matched_quantity')
            .eq('id', savedOrder.id)
            .maybeSingle();

          if (
            recheckOrder &&
            (recheckOrder.status === 'matched' || recheckOrder.status === 'partially_matched')
          ) {
            const { data: deals } = await supabase
              .from('deals')
              .select('id, deal_ref, quantity, supplier_phone, city, reservation_expires_at')
              .eq('order_id', savedOrder.id)
              .not('status', 'eq', 'cancelled')
              .order('created_at', { ascending: false })
              .limit(1);

            if (deals && deals.length > 0) {
              const deal = deals[0];
              const result: MatchResult = {
                found: true,
                matchedQuantity: deal.quantity,
                supplierCity: deal.city,
                supplierPhone: deal.supplier_phone,
                dealId: deal.id,
                dealRef: deal.deal_ref,
                reservationExpiresAt: deal.reservation_expires_at,
              };
              setMatchResult(result);
              onDone(savedOrder.id, savedOrder.request_id);
              return;
            }
          }
        }

        setMatchResult({ found: false });
        onDone(savedOrder.id, savedOrder.request_id);
      } catch (err) {
        setError('حدث خطأ أثناء المطابقة. يرجى المحاولة مرة أخرى.');
        console.error(err);
      } finally {
        setIsLoading(false);
        runningRef.current = false;
      }
    },
    []
  );

  return { isLoading, matchResult, error, runMatching };
}
