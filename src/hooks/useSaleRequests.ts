import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { sessionManager } from '../lib/sessionManager';

export interface SaleRequest {
  id: string;
  inventory_batch_id: string;
  supplier_phone: string;
  buyer_phone: string;
  requested_quantity: number;
  city: string;
  pallet_type: string;
  size: string;
  quality: string;
  price_per_pallet: number;
  status: 'pending_supplier' | 'accepted' | 'rejected' | 'in_contact' | 'completed' | 'failed';
  commission_per_pallet: number;
  supplier_agreed_commission: boolean;
  created_at: string;
  updated_at: string;
  image_urls?: string[];
  buyer_display_name?: string;
  buyer_company_name?: string;
}

export function useBuyerSaleRequests(buyerPhone: string | null) {
  const [requests, setRequests] = useState<SaleRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!buyerPhone) { setLoading(false); return; }
    setLoading(true);
    const token = sessionManager.getSessionToken();
    if (!token) { setLoading(false); return; }
    const { data } = await supabase.rpc('get_buyer_sale_requests', { p_session_token: token });
    if (data?.success) setRequests((data.data as SaleRequest[]) ?? []);
    setLoading(false);
  }, [buyerPhone]);

  useEffect(() => {
    fetch();
    if (!buyerPhone) return;
    const channel = supabase
      .channel(`buyer-sale-requests-${buyerPhone}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sale_requests', filter: `buyer_phone=eq.${buyerPhone}` }, fetch)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetch, buyerPhone]);

  return { requests, loading, refetch: fetch };
}

export function useSupplierSaleRequests(supplierPhone: string | null) {
  const [requests, setRequests] = useState<SaleRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!supplierPhone) { setLoading(false); return; }
    setLoading(true);
    const token = sessionManager.getSessionToken();
    if (!token) { setLoading(false); return; }
    const { data } = await supabase.rpc('get_supplier_sale_requests', { p_session_token: token });
    if (data?.success) setRequests((data.data as SaleRequest[]) ?? []);
    setLoading(false);
  }, [supplierPhone]);

  useEffect(() => {
    fetch();
    if (!supplierPhone) return;
    const channel = supabase
      .channel(`supplier-sale-requests-${supplierPhone}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sale_requests', filter: `supplier_phone=eq.${supplierPhone}` }, fetch)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetch, supplierPhone]);

  const accept = async (requestId: string) => {
    const token = sessionManager.getSessionToken();
    if (!token) return { success: false, error: 'جلسة غير صالحة' };
    const { data } = await supabase.rpc('supplier_accept_sale_request', {
      p_session_token: token,
      p_request_id: requestId,
    });
    if (data?.success) await fetch();
    return data ?? { success: false, error: 'خطأ غير معروف' };
  };

  const reject = async (requestId: string) => {
    const token = sessionManager.getSessionToken();
    if (!token) return { success: false, error: 'جلسة غير صالحة' };
    const { data } = await supabase.rpc('supplier_reject_sale_request', {
      p_session_token: token,
      p_request_id: requestId,
    });
    if (data?.success) await fetch();
    return data ?? { success: false, error: 'خطأ غير معروف' };
  };

  const startContact = async (requestId: string) => {
    const token = sessionManager.getSessionToken();
    if (!token) return { success: false, error: 'جلسة غير صالحة' };
    const { data } = await supabase.rpc('supplier_start_contact', {
      p_session_token: token,
      p_request_id: requestId,
    });
    if (data?.success) await fetch();
    return data ?? { success: false, error: 'خطأ غير معروف' };
  };

  const completeDelivery = async (requestId: string) => {
    const token = sessionManager.getSessionToken();
    if (!token) return { success: false, error: 'جلسة غير صالحة' };
    const { data } = await supabase.rpc('supplier_complete_sale_request', {
      p_session_token: token,
      p_request_id: requestId,
    });
    if (data?.success) await fetch();
    return data ?? { success: false, error: 'خطأ غير معروف' };
  };

  const failDelivery = async (requestId: string) => {
    const token = sessionManager.getSessionToken();
    if (!token) return { success: false, error: 'جلسة غير صالحة' };
    const { data } = await supabase.rpc('supplier_fail_sale_request', {
      p_session_token: token,
      p_request_id: requestId,
    });
    if (data?.success) await fetch();
    return data ?? { success: false, error: 'خطأ غير معروف' };
  };

  return { requests, loading, refetch: fetch, accept, reject, startContact, completeDelivery, failDelivery };
}
