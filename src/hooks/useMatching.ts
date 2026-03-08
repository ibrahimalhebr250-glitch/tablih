import { useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { OrderFormData, MatchResult } from '../types/order';
import { getPlatformSettingsOnce } from './usePlatformSettings';

const QUALITY_ORDER: Record<string, number> = { A: 4, B: 3, C: 2, Scrap: 1 };

function isQualityMatch(
  batchQuality: string,
  requestQuality: string,
  qualityMatchingSetting: string,
  acceptClose: boolean
): boolean {
  if (batchQuality === requestQuality) return true;
  const bq = QUALITY_ORDER[batchQuality] ?? 0;
  const rq = QUALITY_ORDER[requestQuality] ?? 0;
  if (qualityMatchingSetting === 'exact') return false;
  if (qualityMatchingSetting === 'allow_lower' || acceptClose) {
    return Math.abs(bq - rq) === 1;
  }
  return false;
}

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
        const platformSettings = await getPlatformSettingsOnce();
        const matchSettings = platformSettings.matching_engine;

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
            status: 'pending',
            order_source: 'manual_order',
          })
          .select('id, request_id')
          .maybeSingle();

        if (insertError) throw insertError;

        const { data: existingUser } = await supabase
          .from('platform_users')
          .select('id')
          .eq('phone', phone)
          .maybeSingle();
        if (existingUser) {
          await supabase
            .from('user_roles')
            .upsert({ user_id: existingUser.id, phone, role: 'buyer' }, { onConflict: 'phone,role', ignoreDuplicates: true });
        }

        const { data: batches } = await supabase
          .from('inventory_batches')
          .select('id, pallet_type, size, quality, city, available_quantity, phone')
          .eq('status', 'active')
          .eq('publish_to_market', true)
          .eq('hide_from_matching', false)
          .gt('available_quantity', 0)
          .eq('pallet_type', form.palletType ?? '')
          .eq('size', form.size ?? '')
          .neq('phone', phone);

        type BatchRow = {
          id: string;
          pallet_type: string;
          size: string;
          quality: string;
          city: string;
          available_quantity: number;
          phone: string | null;
        };

        let matchedBatch: BatchRow | null = null;

        const trustSettings = platformSettings.trust_settings;
        let trustMap: Record<string, number> = {};
        if (trustSettings.prioritize_trust && batches && batches.length > 0) {
          const supplierPhones = (batches as BatchRow[])
            .map(b => b.phone)
            .filter((p): p is string => !!p);
          if (supplierPhones.length > 0) {
            const { data: profiles } = await supabase
              .from('platform_users')
              .select('phone, trust_rating')
              .in('phone', [...new Set(supplierPhones)]);
            for (const p of profiles ?? []) {
              trustMap[p.phone] = p.trust_rating ?? 3;
            }
          }
        }

        if (batches && batches.length > 0) {
          const level = matchSettings.matching_level;

          const effectiveQualityMatching = level === 'strict'
            ? 'exact'
            : level === 'open'
            ? 'allow_lower'
            : matchSettings.quality_matching;

          const effectiveCityMatching = level === 'strict'
            ? 'same_city'
            : level === 'open'
            ? 'all_cities'
            : matchSettings.city_matching;

          const filtered = (batches as BatchRow[]).filter((b) => {
            const qualityOk = isQualityMatch(
              b.quality,
              form.quality ?? '',
              effectiveQualityMatching,
              form.acceptCloseQuality
            );

            let cityOk = false;
            if (effectiveCityMatching === 'all_cities') {
              cityOk = true;
            } else if (effectiveCityMatching === 'same_region' || form.acceptCloseCity) {
              cityOk = true;
            } else {
              cityOk = b.city === form.city;
            }

            const notSelf = !b.phone || b.phone !== phone;
            return qualityOk && cityOk && notSelf;
          });

          filtered.sort((a, b) => {
            if (trustSettings.prioritize_trust) {
              const aTrust = a.phone ? (trustMap[a.phone] ?? 3) : 0;
              const bTrust = b.phone ? (trustMap[b.phone] ?? 3) : 0;
              const aHighTrust = aTrust >= trustSettings.min_trust_for_priority ? 1 : 0;
              const bHighTrust = bTrust >= trustSettings.min_trust_for_priority ? 1 : 0;
              if (bHighTrust !== aHighTrust) return bHighTrust - aHighTrust;
              if (aHighTrust && bHighTrust && bTrust !== aTrust) return bTrust - aTrust;
            }
            const aCityExact = a.city === form.city ? 1 : 0;
            const bCityExact = b.city === form.city ? 1 : 0;
            if (bCityExact !== aCityExact) return bCityExact - aCityExact;
            return b.available_quantity - a.available_quantity;
          });

          if (filtered.length > 0) {
            matchedBatch = filtered[0];
          }
        }

        if (matchedBatch) {
          const canPartial = matchSettings.allow_partial || form.acceptPartialDelivery;
          const matchedQty = canPartial
            ? Math.min(form.quantity, matchedBatch.available_quantity)
            : matchedBatch.available_quantity >= form.quantity
            ? form.quantity
            : null;

          if (matchedQty && matchedQty > 0) {
            const supplierPhone = matchedBatch.phone ?? '';

            if (supplierPhone && supplierPhone === phone) {
              const result: MatchResult = { found: false };
              setMatchResult(result);
              if (savedOrder) {
                await supabase
                  .from('orders')
                  .update({ status: 'unmatched', updated_at: new Date().toISOString() })
                  .eq('id', savedOrder.id);
                onDone(savedOrder.id, savedOrder.request_id);
              }
              return;
            }

            const { data: dealResult, error: dealError } = await supabase.rpc(
              'create_deal_with_reservation',
              {
                p_order_id: savedOrder?.id ?? null,
                p_inventory_batch_id: matchedBatch.id,
                p_buyer_phone: phone,
                p_supplier_phone: supplierPhone,
                p_pallet_type: matchedBatch.pallet_type,
                p_size: matchedBatch.size,
                p_quality: matchedBatch.quality,
                p_city: matchedBatch.city,
                p_quantity: matchedQty,
                p_final_price: 0,
                p_request_id: savedOrder?.request_id ?? '',
              }
            );

            if (dealError || !dealResult?.success) {
              const result: MatchResult = { found: false };
              setMatchResult(result);
              if (savedOrder) {
                await supabase
                  .from('orders')
                  .update({ status: 'unmatched', updated_at: new Date().toISOString() })
                  .eq('id', savedOrder.id);
                onDone(savedOrder.id, savedOrder.request_id);
              }
              return;
            }

            const result: MatchResult = {
              found: true,
              matchedQuantity: matchedQty,
              supplierCity: matchedBatch.city,
              supplierPhone: supplierPhone,
              dealId: dealResult.deal_id,
              dealRef: dealResult.deal_ref,
              reservationExpiresAt: dealResult.expires_at,
            };
            setMatchResult(result);

            if (savedOrder) {
              await supabase
                .from('orders')
                .update({
                  status: 'matched',
                  matched_quantity: matchedQty,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', savedOrder.id);
              onDone(savedOrder.id, savedOrder.request_id);
            }
            return;
          }
        }

        const result: MatchResult = { found: false };
        setMatchResult(result);

        if (savedOrder) {
          await supabase
            .from('orders')
            .update({ status: 'unmatched', updated_at: new Date().toISOString() })
            .eq('id', savedOrder.id);
          onDone(savedOrder.id, savedOrder.request_id);
        }
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
