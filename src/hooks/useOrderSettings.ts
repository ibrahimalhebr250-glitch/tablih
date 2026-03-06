import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface OrderType {
  code: string;
  name_ar: string;
  name_en: string;
  icon: string;
  color: string;
  bg_color: string;
  border_color: string;
  is_active: boolean;
  display_order: number;
}

export interface FlexibilityOption {
  code: string;
  name_ar: string;
  description_ar: string;
  is_active: boolean;
  display_order: number;
}

export interface QuantitySettings {
  min_quantity: number;
  max_quantity: number;
  quantity_step: number;
  quick_quantities: number[];
}

export interface PalletType {
  name_ar: string;
  is_active: boolean;
  display_order: number;
}

export interface PalletSize {
  label: string;
  width_cm: number;
  length_cm: number;
  is_active: boolean;
  display_order: number;
}

export interface QualityGrade {
  code: string;
  name_ar: string;
  description: string;
  color: string;
  is_active: boolean;
  display_order: number;
}

export function useOrderSettings() {
  const [orderTypes, setOrderTypes] = useState<OrderType[]>([]);
  const [flexibilityOptions, setFlexibilityOptions] = useState<FlexibilityOption[]>([]);
  const [quantitySettings, setQuantitySettings] = useState<QuantitySettings | null>(null);
  const [palletTypes, setPalletTypes] = useState<PalletType[]>([]);
  const [palletSizes, setPalletSizes] = useState<PalletSize[]>([]);
  const [qualityGrades, setQualityGrades] = useState<QualityGrade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);

    try {
      const [
        { data: orderTypesData },
        { data: flexOptionsData },
        { data: qtySettingsData },
        { data: palletTypesData },
        { data: palletSizesData },
        { data: qualityGradesData }
      ] = await Promise.all([
        supabase
          .from('order_types')
          .select('*')
          .eq('is_active', true)
          .order('display_order'),
        supabase
          .from('order_flexibility_options')
          .select('*')
          .eq('is_active', true)
          .order('display_order'),
        supabase
          .from('order_quantity_settings')
          .select('*')
          .maybeSingle(),
        supabase
          .from('inventory_pallet_types')
          .select('*')
          .eq('is_active', true)
          .order('display_order'),
        supabase
          .from('inventory_pallet_sizes')
          .select('*')
          .eq('is_active', true)
          .order('display_order'),
        supabase
          .from('inventory_quality_grades')
          .select('*')
          .eq('is_active', true)
          .order('display_order')
      ]);

      setOrderTypes(orderTypesData || []);
      setFlexibilityOptions(flexOptionsData || []);
      setQuantitySettings(qtySettingsData);
      setPalletTypes(palletTypesData || []);
      setPalletSizes(palletSizesData || []);
      setQualityGrades(qualityGradesData || []);
    } catch (error) {
      console.error('Error loading order settings:', error);
    } finally {
      setLoading(false);
    }
  };

  return {
    orderTypes,
    flexibilityOptions,
    quantitySettings,
    palletTypes,
    palletSizes,
    qualityGrades,
    loading,
    refresh: loadSettings
  };
}
