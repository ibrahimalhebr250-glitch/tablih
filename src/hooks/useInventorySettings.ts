import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface InventorySettings {
  id: string;
  min_quantity: number;
  max_quantity: number;
  quantity_step: number;
  min_price: number;
  max_price: number;
  price_step: number;
  allow_negotiation: boolean;
  max_images: number;
  max_image_size_mb: number;
  allowed_formats: string[];
  max_description_length: number;
  description_required: boolean;
  require_approval: boolean;
  auto_match_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface PalletType {
  id: string;
  name_ar: string;
  name_en: string;
  icon: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface PalletSize {
  id: string;
  pallet_type_id: string;
  length: number;
  width: number;
  max_weight_kg: number;
  name_ar: string;
  name_en: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface QualityGrade {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  color: string;
  description: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface PalletCondition {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  icon: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface UsageType {
  id: string;
  name_ar: string;
  name_en: string;
  icon: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export function useInventorySettings() {
  const [settings, setSettings] = useState<InventorySettings | null>(null);
  const [palletTypes, setPalletTypes] = useState<PalletType[]>([]);
  const [palletSizes, setPalletSizes] = useState<PalletSize[]>([]);
  const [qualityGrades, setQualityGrades] = useState<QualityGrade[]>([]);
  const [palletConditions, setPalletConditions] = useState<PalletCondition[]>([]);
  const [usageTypes, setUsageTypes] = useState<UsageType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);

      const [
        settingsRes,
        typesRes,
        sizesRes,
        gradesRes,
        conditionsRes,
        usageRes
      ] = await Promise.all([
        supabase.from('inventory_settings').select('*').single(),
        supabase.from('inventory_pallet_types').select('*').eq('is_active', true).order('display_order'),
        supabase.from('inventory_pallet_sizes').select('*').eq('is_active', true).order('display_order'),
        supabase.from('inventory_quality_grades').select('*').eq('is_active', true).order('display_order'),
        supabase.from('inventory_pallet_conditions').select('*').eq('is_active', true).order('display_order'),
        supabase.from('inventory_usage_types').select('*').eq('is_active', true).order('display_order'),
      ]);

      if (settingsRes.error) throw settingsRes.error;
      if (typesRes.error) throw typesRes.error;
      if (sizesRes.error) throw sizesRes.error;
      if (gradesRes.error) throw gradesRes.error;
      if (conditionsRes.error) throw conditionsRes.error;
      if (usageRes.error) throw usageRes.error;

      setSettings(settingsRes.data);
      setPalletTypes(typesRes.data || []);
      setPalletSizes(sizesRes.data || []);
      setQualityGrades(gradesRes.data || []);
      setPalletConditions(conditionsRes.data || []);
      setUsageTypes(usageRes.data || []);
    } catch (err) {
      console.error('Error fetching inventory settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();

    const channel = supabase
      .channel('inventory_settings_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_settings' }, fetchSettings)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_pallet_types' }, fetchSettings)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_pallet_sizes' }, fetchSettings)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_quality_grades' }, fetchSettings)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_pallet_conditions' }, fetchSettings)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_usage_types' }, fetchSettings)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getSizesForType = (palletTypeId: string): PalletSize[] => {
    return palletSizes.filter(size =>
      size.pallet_type_id === palletTypeId || size.pallet_type_id === null
    );
  };

  return {
    settings,
    palletTypes,
    palletSizes,
    qualityGrades,
    palletConditions,
    usageTypes,
    loading,
    error,
    refetch: fetchSettings,
    getSizesForType,
  };
}
