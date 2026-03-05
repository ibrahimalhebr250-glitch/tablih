import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface FieldConfig {
  show: boolean;
  required: boolean;
}

export interface RequestFieldsConfig {
  pallet_type: FieldConfig;
  size: FieldConfig;
  quality: FieldConfig;
  quantity: FieldConfig;
  city: FieldConfig;
}

export interface InventoryFieldsConfig {
  pallet_type: FieldConfig;
  size: FieldConfig;
  quality: FieldConfig;
  quantity: FieldConfig;
  city: FieldConfig;
  description: FieldConfig;
}

export interface PlatformSettings {
  request_creation: {
    min_quantity: number;
    max_quantity: number;
    expiry_days: number;
    allowed_types: ('standard' | 'urgent' | 'recurring')[];
    fields_config: RequestFieldsConfig;
    notify_top_suppliers: number;
  };
  inventory_submission: {
    min_quantity: number;
    max_quantity: number;
    approval_mode: 'auto_publish' | 'require_approval';
    description_enabled: boolean;
    fields_config: InventoryFieldsConfig;
  };
  inventory_images: {
    enabled: boolean;
    max_images: number;
    max_size_mb: number;
    allowed_formats: string[];
  };
  matching_engine: {
    matching_level: 'strict' | 'flexible' | 'open';
    city_matching: 'same_city' | 'same_region' | 'all_cities';
    quality_matching: 'exact' | 'allow_lower';
    allow_partial: boolean;
    allow_aggregation: boolean;
    auto_expand_hours: number;
  };
  trust_settings: {
    prioritize_trust: boolean;
    min_trust_for_priority: number;
  };
}

const DEFAULT_SETTINGS: PlatformSettings = {
  request_creation: {
    min_quantity: 50,
    max_quantity: 5000,
    expiry_days: 7,
    allowed_types: ['standard', 'urgent', 'recurring'],
    fields_config: {
      pallet_type: { show: true, required: true },
      size: { show: true, required: true },
      quality: { show: true, required: true },
      quantity: { show: true, required: true },
      city: { show: true, required: true },
    },
    notify_top_suppliers: 10,
  },
  inventory_submission: {
    min_quantity: 10,
    max_quantity: 10000,
    approval_mode: 'auto_publish',
    description_enabled: true,
    fields_config: {
      pallet_type: { show: true, required: true },
      size: { show: true, required: true },
      quality: { show: true, required: true },
      quantity: { show: true, required: true },
      city: { show: true, required: true },
      description: { show: true, required: false },
    },
  },
  inventory_images: {
    enabled: true,
    max_images: 5,
    max_size_mb: 5,
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
  },
  matching_engine: {
    matching_level: 'flexible',
    city_matching: 'same_city',
    quality_matching: 'allow_lower',
    allow_partial: true,
    allow_aggregation: false,
    auto_expand_hours: 24,
  },
  trust_settings: {
    prioritize_trust: true,
    min_trust_for_priority: 4,
  },
};

function buildSettings(rows: { group_key: string; setting_key: string; setting_value: unknown }[]): PlatformSettings {
  const result = structuredClone(DEFAULT_SETTINGS) as PlatformSettings;
  for (const row of rows) {
    const g = row.group_key as keyof PlatformSettings;
    const k = row.setting_key;
    if (result[g] && k in (result[g] as object)) {
      (result[g] as Record<string, unknown>)[k] = row.setting_value;
    }
  }
  return result;
}

export function usePlatformSettings() {
  const [settings, setSettings] = useState<PlatformSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('platform_settings')
      .select('group_key, setting_key, setting_value');
    if (data && data.length > 0) {
      setSettings(buildSettings(data));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSetting = useCallback(async (
    groupKey: keyof PlatformSettings,
    settingKey: string,
    value: unknown
  ): Promise<boolean> => {
    const { error } = await supabase
      .from('platform_settings')
      .upsert(
        { group_key: groupKey, setting_key: settingKey, setting_value: value },
        { onConflict: 'group_key,setting_key' }
      );
    if (error) return false;
    setSettings((prev) => ({
      ...prev,
      [groupKey]: {
        ...(prev[groupKey] as object),
        [settingKey]: value,
      },
    }));
    return true;
  }, []);

  return { settings, loading, fetchSettings, updateSetting };
}

let _cachedSettings: PlatformSettings | null = null;
let _cacheTime = 0;
const CACHE_TTL = 60_000;

export async function getPlatformSettingsOnce(): Promise<PlatformSettings> {
  if (_cachedSettings && Date.now() - _cacheTime < CACHE_TTL) {
    return _cachedSettings;
  }
  const { data } = await supabase
    .from('platform_settings')
    .select('group_key, setting_key, setting_value');
  const built = data && data.length > 0 ? buildSettings(data) : DEFAULT_SETTINGS;
  _cachedSettings = built;
  _cacheTime = Date.now();
  return built;
}
