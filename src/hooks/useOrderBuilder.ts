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

  const phoneRef = useRef(phone);
  useEffect(() => { phoneRef.current = phone; }, [phone]);

  const logOperation = useCallback(async (action: string, details?: any) => {
    const currentPhone = phoneRef.current;
    if (!currentPhone) return;

    try {
      await supabase
        .from('order_operations_log')
        .insert([{
          phone: currentPhone,
          action,
          details,
          timestamp: new Date().toISOString()
        }]);
    } catch (err) {
      console.error('Failed to log operation:', err);
    }
  }, []);

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

  const handleCompleteOrder = useCallback(() => {
    if (!isAuthenticated) {
      setStep('auth');
      logOperation('start_auth', {});
    } else {
      setStep('matching');
      logOperation('start_matching', {});
    }
  }, [isAuthenticated, logOperation]);

  const handleAuthComplete = useCallback((userPhone: string) => {
    setPhone(userPhone);
    setIsAuthenticated(true);
    setStep('matching');
    logOperation('auth_complete', { phone: userPhone });
  }, [logOperation]);

  const handleMatchingDone = useCallback((orderId: string, requestId: string) => {
    setSavedOrderId(orderId);
    setSavedRequestId(requestId);
    setStep('result');
    logOperation('matching_complete', { orderId, requestId });
  }, [logOperation]);

  const reset = useCallback(() => {
    setStep('form');
    setForm(startForm);
    setPhone(prefilledPhone ?? '');
    setSavedOrderId(null);
    setSavedRequestId(null);
  }, [prefilledPhone]);

  return {
    step,
    form,
    phone,
    isAuthenticated,
    savedOrderId,
    savedRequestId,
    isFormComplete,
    setPalletType,
    setSize,
    setQuality,
    setQuantity,
    setCity,
    setCondition,
    setFlexibility,
    handleCompleteOrder,
    handleAuthComplete,
    handleMatchingDone,
    setStep,
    reset,
  };
}
