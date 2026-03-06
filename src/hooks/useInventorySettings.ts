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
  code: string;
  name_ar: string;
  name_en: string;
  description_ar?: string;
  description_en?: string;
  icon: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface PalletSize {
  id: string;
  pallet_type_code: string;
  code: string;
  name_ar: string;
  name_en: string;
  length_cm: number;
  width_cm: number;
  height_cm?: number;
  max_load_kg?: number;
  weight_unit: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface QualityGrade {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  description_ar?: string;
  description_en?: string;
  color_hex: string;
  badge_color: string;
  bg_color: string;
  border_color: string;
  is_active: boolean;
  sort_order: number;
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
        supabase.from('inventory_settings').select('*').maybeSingle(),
        supabase.from('pallet_types_master').select('*').order('sort_order'),
        supabase.from('pallet_sizes_master').select('*').order('sort_order'),
        supabase.from('quality_grades_master').select('*').order('sort_order'),
        supabase.from('inventory_pallet_conditions').select('*').order('display_order'),
        supabase.from('inventory_usage_types').select('*').order('display_order'),
      ]);

      if (settingsRes.error) console.warn('Settings error:', settingsRes.error);
      if (typesRes.error) console.warn('Types error:', typesRes.error);
      if (sizesRes.error) console.warn('Sizes error:', sizesRes.error);
      if (gradesRes.error) console.warn('Grades error:', gradesRes.error);
      if (conditionsRes.error) console.warn('Conditions error:', conditionsRes.error);
      if (usageRes.error) console.warn('Usage error:', usageRes.error);

      setSettings(settingsRes.data || null);
      setPalletTypes((typesRes.data || []).filter((t: PalletType) => t.is_active));
      setPalletSizes((sizesRes.data || []).filter((s: PalletSize) => s.is_active));
      setQualityGrades((gradesRes.data || []).filter((g: QualityGrade) => g.is_active));
      setPalletConditions((conditionsRes.data || []).filter((c: PalletCondition) => c.is_active));
      setUsageTypes((usageRes.data || []).filter((u: UsageType) => u.is_active));
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pallet_types_master' }, fetchSettings)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pallet_sizes_master' }, fetchSettings)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quality_grades_master' }, fetchSettings)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_pallet_conditions' }, fetchSettings)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_usage_types' }, fetchSettings)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getSizesForType = (palletTypeCode: string): PalletSize[] => {
    return palletSizes.filter(size =>
      size.pallet_type_code === palletTypeCode || !size.pallet_type_code
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
