import { useState, useCallback } from 'react';
import type {
  InventoryFormData,
  PalletType,
  PalletSize,
  PalletQuality,
  PalletCondition,
  InventoryStep,
  InventoryWizardStep,
} from '../types/inventory';
import type { InventoryFieldsConfig } from './usePlatformSettings';

const initialForm: InventoryFormData = {
  palletType: null,
  size: null,
  quality: null,
  condition: 'used',
  quantity: 1000,
  pricePerPallet: 0,
  city: '',
  description: '',
  activateImmediately: true,
};

interface PrefillData {
  palletType?: PalletType | null;
  size?: PalletSize | null;
  quality?: PalletQuality | null;
  quantity?: number;
  city?: string;
}

export function useInventoryBuilder(initialPhone?: string, prefill?: PrefillData, _fieldsConfig?: InventoryFieldsConfig) {
  const prefilled: InventoryFormData = {
    ...initialForm,
    ...(prefill?.palletType ? { palletType: prefill.palletType } : {}),
    ...(prefill?.size ? { size: prefill.size } : {}),
    ...(prefill?.quality ? { quality: prefill.quality } : {}),
    ...(prefill?.quantity ? { quantity: prefill.quantity } : {}),
    ...(prefill?.city ? { city: prefill.city } : {}),
  };

  const [step, setStep] = useState<InventoryStep>('form');
  const [wizardStep, setWizardStep] = useState<InventoryWizardStep>(1);
  const [form, setForm] = useState<InventoryFormData>(prefilled);
  const [phone, setPhone] = useState(initialPhone ?? '');
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [batchRef, setBatchRef] = useState<string | null>(null);
  const [matchFound, setMatchFound] = useState(false);
  const [matchableQty, setMatchableQty] = useState(0);

  const setPalletType = useCallback((v: PalletType) => {
    setForm((p) => ({ ...p, palletType: v }));
  }, []);

  const setSize = useCallback((v: PalletSize) => {
    setForm((p) => ({ ...p, size: v }));
  }, []);

  const setQuality = useCallback((v: PalletQuality) => {
    setForm((p) => ({ ...p, quality: v }));
  }, []);

  const setCondition = useCallback((v: PalletCondition) => {
    setForm((p) => ({ ...p, condition: v }));
  }, []);

  const setQuantity = useCallback((v: number) => {
    setForm((p) => ({ ...p, quantity: Math.max(1, v) }));
  }, []);

  const setPricePerPallet = useCallback((v: number) => {
    setForm((p) => ({ ...p, pricePerPallet: Math.max(0, v) }));
  }, []);

  const setCity = useCallback((v: string) => {
    setForm((p) => ({ ...p, city: v }));
  }, []);

  const setDescription = useCallback((v: string) => {
    setForm((p) => ({ ...p, description: v }));
  }, []);

  const setActivateImmediately = useCallback((v: boolean) => {
    setForm((p) => ({ ...p, activateImmediately: v }));
  }, []);

  const isStep1Complete = Boolean(form.palletType && form.size && form.quality);
  const isStep2Complete = Boolean(form.quantity > 0 && form.city);
  const isStep3Complete = true;
  const isFormComplete = isStep1Complete && isStep2Complete;

  const canAdvance = (s: InventoryWizardStep): boolean => {
    if (s === 1) return isStep1Complete;
    if (s === 2) return isStep2Complete;
    if (s === 3) return isStep3Complete;
    return false;
  };

  const nextStep = useCallback(() => {
    setWizardStep((s) => (s < 4 ? ((s + 1) as InventoryWizardStep) : s));
  }, []);

  const prevStep = useCallback(() => {
    setWizardStep((s) => (s > 1 ? ((s - 1) as InventoryWizardStep) : s));
  }, []);

  const goToStep = useCallback((s: InventoryWizardStep) => {
    setWizardStep(s);
  }, []);

  const reset = useCallback(() => {
    setStep('form');
    setWizardStep(1);
    setForm(prefilled);
    setPhone(initialPhone ?? '');
    setBatchId(null);
    setBatchRef(null);
    setMatchFound(false);
    setMatchableQty(0);
  }, [initialPhone]);

  return {
    step,
    setStep,
    wizardStep,
    setWizardStep,
    form,
    phone,
    setPhone,
    supplierId,
    setSupplierId,
    batchId,
    setBatchId,
    batchRef,
    setBatchRef,
    matchFound,
    setMatchFound,
    matchableQty,
    setMatchableQty,
    isFormComplete,
    isStep1Complete,
    isStep2Complete,
    isStep3Complete,
    canAdvance,
    nextStep,
    prevStep,
    goToStep,
    setPalletType,
    setSize,
    setQuality,
    setCondition,
    setQuantity,
    setPricePerPallet,
    setCity,
    setDescription,
    setActivateImmediately,
    reset,
  };
}
