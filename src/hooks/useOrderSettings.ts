import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface OrderType {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  description: string;
  icon: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface FlexibilityOption {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  description: string;
  is_active: boolean;
  sort_order: number;
  affects_matching: boolean;
  matching_rule: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface QuantitySettings {
  id: string;
  min_quantity: number;
  max_quantity: number;
  quantity_step: number;
  quick_quantities: number[];
  updated_at: string;
}

export interface SummarySettings {
  id: string;
  is_enabled: boolean;
  show_total: boolean;
  show_location: boolean;
  complete_button_text: string;
  updated_at: string;
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
  const [summarySettings, setSummarySettings] = useState<SummarySettings | null>(null);
  const [palletTypes, setPalletTypes] = useState<PalletType[]>([]);
  const [palletSizes, setPalletSizes] = useState<PalletSize[]>([]);
  const [qualityGrades, setQualityGrades] = useState<QualityGrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();

    const orderTypesChannel = supabase
      .channel('order_type_settings_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_type_settings' }, loadSettings)
      .subscribe();

    const flexibilityChannel = supabase
      .channel('flexibility_options_settings_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'flexibility_options_settings' }, loadSettings)
      .subscribe();

    const quantityChannel = supabase
      .channel('order_quantity_settings_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_quantity_settings' }, loadSettings)
      .subscribe();

    const summaryChannel = supabase
      .channel('order_summary_settings_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_summary_settings' }, loadSettings)
      .subscribe();

    return () => {
      orderTypesChannel.unsubscribe();
      flexibilityChannel.unsubscribe();
      quantityChannel.unsubscribe();
      summaryChannel.unsubscribe();
    };
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    setError(null);

    try {
      const [
        { data: orderTypesData, error: orderTypesError },
        { data: flexOptionsData, error: flexOptionsError },
        { data: qtySettingsData, error: qtySettingsError },
        { data: summarySettingsData, error: summarySettingsError },
        { data: palletTypesData },
        { data: palletSizesData },
        { data: qualityGradesData }
      ] = await Promise.all([
        supabase
          .from('order_type_settings')
          .select('*')
          .order('sort_order'),
        supabase
          .from('flexibility_options_settings')
          .select('*')
          .order('sort_order'),
        supabase
          .from('order_quantity_settings')
          .select('*')
          .maybeSingle(),
        supabase
          .from('order_summary_settings')
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

      if (orderTypesError) throw orderTypesError;
      if (flexOptionsError) throw flexOptionsError;
      if (qtySettingsError) throw qtySettingsError;
      if (summarySettingsError) throw summarySettingsError;

      setOrderTypes(orderTypesData || []);
      setFlexibilityOptions(flexOptionsData || []);
      setQuantitySettings(qtySettingsData);
      setSummarySettings(summarySettingsData);
      setPalletTypes(palletTypesData || []);
      setPalletSizes(palletSizesData || []);
      setQualityGrades(qualityGradesData || []);
    } catch (error: any) {
      console.error('Error loading order settings:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const createOrderType = async (data: Omit<OrderType, 'id' | 'created_at' | 'updated_at'>) => {
    const { error } = await supabase
      .from('order_type_settings')
      .insert([data]);

    if (error) {
      console.error('Error creating order type:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  };

  const updateOrderType = async (id: string, updates: Partial<OrderType>) => {
    const { error } = await supabase
      .from('order_type_settings')
      .update(updates)
      .eq('id', id);

    if (error) {
      console.error('Error updating order type:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  };

  const deleteOrderType = async (id: string) => {
    const { error } = await supabase
      .from('order_type_settings')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting order type:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  };

  const updateQuantitySettings = async (updates: Partial<QuantitySettings>) => {
    if (!quantitySettings) return { success: false, error: 'No settings found' };

    const { error } = await supabase
      .from('order_quantity_settings')
      .update(updates)
      .eq('id', quantitySettings.id);

    if (error) {
      console.error('Error updating quantity settings:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  };

  const createFlexibilityOption = async (data: Omit<FlexibilityOption, 'id' | 'created_at' | 'updated_at' | 'matching_rule'>) => {
    const { error } = await supabase
      .from('flexibility_options_settings')
      .insert([{ ...data, matching_rule: {} }]);

    if (error) {
      console.error('Error creating flexibility option:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  };

  const updateFlexibilityOption = async (id: string, updates: Partial<FlexibilityOption>) => {
    const { error } = await supabase
      .from('flexibility_options_settings')
      .update(updates)
      .eq('id', id);

    if (error) {
      console.error('Error updating flexibility option:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  };

  const updateSummarySettings = async (updates: Partial<SummarySettings>) => {
    if (!summarySettings) return { success: false, error: 'No settings found' };

    const { error } = await supabase
      .from('order_summary_settings')
      .update(updates)
      .eq('id', summarySettings.id);

    if (error) {
      console.error('Error updating summary settings:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  };

  return {
    orderTypes,
    flexibilityOptions,
    quantitySettings,
    summarySettings,
    palletTypes,
    palletSizes,
    qualityGrades,
    loading,
    error,
    createOrderType,
    updateOrderType,
    deleteOrderType,
    updateQuantitySettings,
    createFlexibilityOption,
    updateFlexibilityOption,
    updateSummarySettings,
    refresh: loadSettings
  };
}
