import { useState, useCallback, useEffect } from 'react';
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
  const [draftId, setDraftId] = useState<string | null>(null);

  useEffect(() => {
    if (phone && form.palletType && step === 'form') {
      saveDraft();
    }
  }, [form, phone, step]);

  const saveDraft = async () => {
    if (!phone) return;

    try {
      const draftData = {
        phone,
        pallet_type: form.palletType,
        size: form.size,
        quality: form.quality,
        quantity: form.quantity,
        city: form.city,
        stage: step,
        data: form
      };

      if (draftId) {
        await supabase
          .from('orders')
          .update({ ...draftData, updated_at: new Date().toISOString() })
          .eq('id', draftId);
      } else {
        const { data, error } = await supabase
          .from('orders')
          .insert([{ ...draftData, status: 'unmatched' }])
          .select('id')
          .single();

        if (!error && data) {
          setDraftId(data.id);
        }
      }
    } catch (err) {
      console.error('Failed to save draft:', err);
    }
  };

  const logOperation = async (action: string, details?: any) => {
    if (!phone) return;

    try {
      await supabase
        .from('order_operations_log')
        .insert([{
          phone,
          order_id: draftId,
          action,
          details,
          timestamp: new Date().toISOString()
        }]);
    } catch (err) {
      console.error('Failed to log operation:', err);
    }
  };

  const setPalletType = useCallback((type: PalletType) => {
    setForm((prev) => ({ ...prev, palletType: type }));
    logOperation('change_pallet_type', { type });
  }, []);

  const setSize = useCallback((size: PalletSize) => {
    setForm((prev) => ({ ...prev, size }));
    logOperation('change_size', { size });
  }, []);

  const setQuality = useCallback((quality: PalletQuality) => {
    setForm((prev) => ({ ...prev, quality }));
    logOperation('change_quality', { quality });
  }, []);

  const setQuantity = useCallback((quantity: number) => {
    setForm((prev) => ({ ...prev, quantity: Math.max(1, quantity) }));
    logOperation('change_quantity', { quantity });
  }, []);

  const setCity = useCallback((city: string) => {
    setForm((prev) => ({ ...prev, city }));
  }, []);

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
      logOperation('start_auth', { form });
    } else {
      setStep('matching');
      logOperation('start_matching', { form });
    }
  }, [isAuthenticated]);

  const handleAuthComplete = useCallback((userPhone: string) => {
    setPhone(userPhone);
    setIsAuthenticated(true);
    setStep('matching');
    logOperation('auth_complete', { phone: userPhone });
  }, []);

  const handleMatchingDone = useCallback((orderId: string, requestId: string) => {
    setSavedOrderId(orderId);
    setSavedRequestId(requestId);
    setStep('result');
    logOperation('matching_complete', { orderId, requestId });
  }, []);

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
    setFlexibility,
    handleCompleteOrder,
    handleAuthComplete,
    handleMatchingDone,
    setStep,
    reset,
  };
}
