import { useState, useCallback, useEffect, useRef } from 'react';
import type { OrderFormData, PalletType, PalletSize, PalletQuality, BuilderStep } from '../types/order';
import type { RequestFieldsConfig } from './usePlatformSettings';
import { supabase } from '../lib/supabase';

interface PrefillData {
  palletType?: string | null;
  size?: string | null;
  quality?: string | null;
  quantity?: number;
  city?: string;
}

interface SavedOrderResult {
  id: string;
  request_id: string;
}

const initialFormData: OrderFormData = {
  palletType: null,
  size: null,
  quality: null,
  quantity: 1000,
  city: '',
  condition: 'new',
  acceptCloseQuality: false,
  acceptCloseCity: false,
  acceptPartialDelivery: false,
};

export function useOrderBuilder(prefilledPhone?: string, prefill?: PrefillData, fieldsConfig?: RequestFieldsConfig) {
  const startForm: OrderFormData = {
    ...initialFormData,
    ...(prefill?.palletType ? { palletType: prefill.palletType as PalletType } : {}),
    ...(prefill?.size ? { size: prefill.size as PalletSize } : {}),
    ...(prefill?.quality ? { quality: prefill.quality as PalletQuality } : {}),
    ...(prefill?.quantity ? { quantity: prefill.quantity } : {}),
    ...(prefill?.city ? { city: prefill.city } : {}),
  };

  const [step, setStep] = useState<BuilderStep>('form');
  const [form, setForm] = useState<OrderFormData>(startForm);
  const [phone, setPhone] = useState(prefilledPhone ?? '');
  const [isAuthenticated, setIsAuthenticated] = useState(!!prefilledPhone);
  const [savedOrderId, setSavedOrderId] = useState<string | null>(null);
  const [savedRequestId, setSavedRequestId] = useState<string | null>(null);
  const [requestType, setRequestType] = useState<'standard' | 'urgent' | 'recurring'>('standard');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const phoneRef = useRef(phone);
  const formRef = useRef(form);
  const requestTypeRef = useRef(requestType);

  useEffect(() => { phoneRef.current = phone; }, [phone]);
  useEffect(() => { formRef.current = form; }, [form]);
  useEffect(() => { requestTypeRef.current = requestType; }, [requestType]);

  const logOperation = useCallback(async (action: string, details?: Record<string, unknown>) => {
    const currentPhone = phoneRef.current;
    if (!currentPhone) return;
    try {
      await supabase
        .from('order_operations_log')
        .insert([{ phone: currentPhone, action, details, timestamp: new Date().toISOString() }]);
    } catch {
    }
  }, []);

  const saveOrderToDB = useCallback(async (userPhone: string): Promise<SavedOrderResult | null> => {
    const f = formRef.current;
    const rt = requestTypeRef.current;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const { data, error } = await supabase
        .from('orders')
        .insert({
          phone: userPhone,
          pallet_type: f.palletType,
          size: f.size,
          quality: f.quality,
          quantity: f.quantity,
          city: f.city,
          pallet_condition: f.condition || 'new',
          accept_close_quality: f.acceptCloseQuality,
          accept_close_city: f.acceptCloseCity,
          accept_partial_delivery: true,
          status: 'pending',
          order_type_code: rt,
          request_type: rt,
          order_source: 'market_demand_card',
          flexibility_options: {
            accept_close_quality: f.acceptCloseQuality,
            accept_close_city: f.acceptCloseCity,
            accept_partial_delivery: true,
          },
        })
        .select('id, request_id')
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error('فشل في حفظ الطلب');

      setSavedOrderId(data.id);
      setSavedRequestId(data.request_id);
      logOperation('order_saved', { order_id: data.id, request_id: data.request_id });
      return data;
    } catch (err: any) {
      setSubmitError(err?.message || 'حدث خطأ أثناء حفظ الطلب');
      return null;
    } finally {
      setSubmitting(false);
    }
  }, [logOperation]);

  const setPalletType = useCallback((type: PalletType) => {
    setForm((prev) => ({ ...prev, palletType: type }));
    logOperation('change_pallet_type', { type });
  }, [logOperation]);

  const setSize = useCallback((size: PalletSize) => {
    setForm((prev) => ({ ...prev, size }));
    logOperation('change_size', { size });
  }, [logOperation]);

  const setQuality = useCallback((quality: PalletQuality) => {
    setForm((prev) => ({ ...prev, quality }));
    logOperation('change_quality', { quality });
  }, [logOperation]);

  const setQuantity = useCallback((quantity: number) => {
    setForm((prev) => ({ ...prev, quantity: Math.max(1, quantity) }));
    logOperation('change_quantity', { quantity });
  }, [logOperation]);

  const setCity = useCallback((city: string) => {
    setForm((prev) => ({ ...prev, city }));
  }, []);

  const setCondition = useCallback((condition: string) => {
    setForm((prev) => ({ ...prev, condition }));
    logOperation('change_condition', { condition });
  }, [logOperation]);

  const setFlexibility = useCallback(
    (key: 'acceptCloseQuality' | 'acceptCloseCity' | 'acceptPartialDelivery', value: boolean) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const fc = fieldsConfig;
  const isFieldOk = (field: keyof NonNullable<typeof fc>, value: unknown) => {
    if (!fc) return !!value;
    const cfg = fc[field];
    if (!cfg?.show) return true;
    if (!cfg.required) return true;
    return !!value;
  };

  const isFormComplete = Boolean(
    isFieldOk('pallet_type', form.palletType) &&
    isFieldOk('size', form.size) &&
    isFieldOk('quality', form.quality) &&
    isFieldOk('quantity', form.quantity > 0) &&
    isFieldOk('city', form.city)
  );

  const handleCompleteOrder = useCallback(async () => {
    if (!isAuthenticated) {
      setStep('auth');
      logOperation('start_auth', {});
    } else {
      const currentPhone = phoneRef.current;
      const result = await saveOrderToDB(currentPhone);
      if (result) {
        setStep('result');
      }
    }
  }, [isAuthenticated, logOperation, saveOrderToDB]);

  const handleAuthComplete = useCallback(async (userPhone: string) => {
    setPhone(userPhone);
    setIsAuthenticated(true);
    logOperation('auth_complete', { phone: userPhone });
    const result = await saveOrderToDB(userPhone);
    if (result) {
      setStep('result');
    }
  }, [logOperation, saveOrderToDB]);

  const reset = useCallback(() => {
    setStep('form');
    setForm(startForm);
    setPhone(prefilledPhone ?? '');
    setSavedOrderId(null);
    setSavedRequestId(null);
    setSubmitError(null);
  }, [prefilledPhone]);

  return {
    step,
    form,
    phone,
    isAuthenticated,
    savedOrderId,
    savedRequestId,
    isFormComplete,
    submitting,
    submitError,
    requestType,
    setRequestType,
    setPalletType,
    setSize,
    setQuality,
    setQuantity,
    setCity,
    setCondition,
    setFlexibility,
    handleCompleteOrder,
    handleAuthComplete,
    setStep,
    reset,
  };
}
