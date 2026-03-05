import { useState, useCallback } from 'react';
import type { OrderFormData, PalletType, PalletSize, PalletQuality, BuilderStep } from '../types/order';
import type { RequestFieldsConfig } from './usePlatformSettings';

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

  const setPalletType = useCallback((type: PalletType) => {
    setForm((prev) => ({ ...prev, palletType: type }));
  }, []);

  const setSize = useCallback((size: PalletSize) => {
    setForm((prev) => ({ ...prev, size }));
  }, []);

  const setQuality = useCallback((quality: PalletQuality) => {
    setForm((prev) => ({ ...prev, quality }));
  }, []);

  const setQuantity = useCallback((quantity: number) => {
    setForm((prev) => ({ ...prev, quantity: Math.max(1, quantity) }));
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
    } else {
      setStep('matching');
    }
  }, [isAuthenticated]);

  const handleAuthComplete = useCallback((userPhone: string) => {
    setPhone(userPhone);
    setIsAuthenticated(true);
    setStep('matching');
  }, []);

  const handleMatchingDone = useCallback((orderId: string, requestId: string) => {
    setSavedOrderId(orderId);
    setSavedRequestId(requestId);
    setStep('result');
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
