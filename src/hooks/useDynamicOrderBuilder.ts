import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface DynamicOrderType {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  icon?: string;
  color?: string;
  is_active: boolean;
  sort_order: number;
}

export interface DynamicPalletType {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  icon: string;
  is_active: boolean;
  sort_order: number;
}

export interface DynamicPalletSize {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  pallet_type_code: string;
  length_cm: string;
  width_cm: string;
  height_cm?: string;
  max_load_kg?: string;
  is_active: boolean;
  sort_order: number;
}

export interface DynamicQualityGrade {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  description_ar?: string;
  description_en?: string;
  is_active: boolean;
  sort_order: number;
}

export interface DynamicCity {
  id: string;
  name: string;
  status: string;
}

export interface FlexibilityOption {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  description?: string;
  is_active: boolean;
  affects_matching: boolean;
  sort_order: number;
}

export interface QuantitySettings {
  min_quantity: number;
  max_quantity: number;
  step: number;
  default_quantity: number;
}

export function useDynamicOrderBuilder() {
  const [orderTypes, setOrderTypes] = useState<DynamicOrderType[]>([]);
  const [palletTypes, setPalletTypes] = useState<DynamicPalletType[]>([]);
  const [palletSizes, setPalletSizes] = useState<DynamicPalletSize[]>([]);
  const [qualityGrades, setQualityGrades] = useState<DynamicQualityGrade[]>([]);
  const [cities, setCities] = useState<DynamicCity[]>([]);
  const [flexibilityOptions, setFlexibilityOptions] = useState<FlexibilityOption[]>([]);
  const [quantitySettings, setQuantitySettings] = useState<QuantitySettings>({
    min_quantity: 100,
    max_quantity: 10000,
    step: 50,
    default_quantity: 1000
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [
        orderTypesResult,
        palletTypesResult,
        palletSizesResult,
        qualityGradesResult,
        citiesResult,
        flexibilityOptionsResult,
        quantitySettingsResult
      ] = await Promise.all([
        supabase
          .from('order_types_settings')
          .select('*')
          .eq('is_active', true)
          .order('sort_order'),
        supabase
          .from('pallet_types_master')
          .select('*')
          .eq('is_active', true)
          .order('sort_order'),
        supabase
          .from('pallet_sizes_master')
          .select('*')
          .eq('is_active', true)
          .order('sort_order'),
        supabase
          .from('quality_grades_master')
          .select('*')
          .eq('is_active', true)
          .order('sort_order'),
        supabase
          .from('cities')
          .select('*')
          .eq('status', 'active')
          .order('name'),
        supabase
          .from('flexibility_options_settings')
          .select('*')
          .eq('is_active', true)
          .order('sort_order'),
        supabase
          .from('quantity_settings')
          .select('*')
          .single()
      ]);

      if (orderTypesResult.error) throw orderTypesResult.error;
      if (palletTypesResult.error) throw palletTypesResult.error;
      if (palletSizesResult.error) throw palletSizesResult.error;
      if (qualityGradesResult.error) throw qualityGradesResult.error;
      if (citiesResult.error) throw citiesResult.error;
      if (flexibilityOptionsResult.error) throw flexibilityOptionsResult.error;

      setOrderTypes(orderTypesResult.data || []);
      setPalletTypes(palletTypesResult.data || []);
      setPalletSizes(palletSizesResult.data || []);
      setQualityGrades(qualityGradesResult.data || []);
      setCities(citiesResult.data || []);
      setFlexibilityOptions(flexibilityOptionsResult.data || []);

      if (quantitySettingsResult.data) {
        setQuantitySettings({
          min_quantity: quantitySettingsResult.data.min_quantity || 100,
          max_quantity: quantitySettingsResult.data.max_quantity || 10000,
          step: quantitySettingsResult.data.step || 50,
          default_quantity: quantitySettingsResult.data.default_quantity || 1000
        });
      }

    } catch (err) {
      console.error('Error loading dynamic order builder data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const getSizesForPalletType = (palletTypeCode: string) => {
    return palletSizes.filter(size => size.pallet_type_code === palletTypeCode);
  };

  return {
    orderTypes,
    palletTypes,
    palletSizes,
    qualityGrades,
    cities,
    flexibilityOptions,
    quantitySettings,
    loading,
    error,
    getSizesForPalletType,
    refresh: loadAllData
  };
}
