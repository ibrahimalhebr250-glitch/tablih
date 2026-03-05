import { useState } from 'react';
import { supabase } from '../lib/supabase';

interface CreateDealParams {
  batchId: string;
  buyerPhone: string;
  quantity: number;
}

interface CreateDealResult {
  success: boolean;
  dealId?: string;
  error?: string;
}

export function useCreateDeal() {
  const [loading, setLoading] = useState(false);

  const createDeal = async ({ batchId, buyerPhone, quantity }: CreateDealParams): Promise<CreateDealResult> => {
    setLoading(true);
    try {
      console.log('Creating deal with params:', { batchId, buyerPhone, quantity });

      const { data, error } = await supabase.rpc('create_deal_from_market_negotiation', {
        p_batch_id: batchId,
        p_buyer_phone: buyerPhone,
        p_quantity: quantity,
      });

      console.log('RPC Response:', { data, error });

      if (error) {
        console.error('Error creating deal:', error);
        return { success: false, error: 'حدث خطأ أثناء إنشاء الصفقة' };
      }

      if (!data || !data.success) {
        console.error('Deal creation failed:', data);
        return { success: false, error: data?.error || 'فشل إنشاء الصفقة' };
      }

      console.log('Deal created successfully:', data);
      return { success: true, dealId: data.deal_id };
    } catch (err) {
      console.error('Exception creating deal:', err);
      return { success: false, error: 'حدث خطأ غير متوقع' };
    } finally {
      setLoading(false);
    }
  };

  return { createDeal, loading };
}
