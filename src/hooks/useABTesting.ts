import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface ABTestExperiment {
  id: string;
  experiment_name: string;
  experiment_key: string;
  variant_a_name: string;
  variant_b_name: string;
  variant_a_weight: number;
  variant_b_weight: number;
  is_active: boolean;
  start_date: string;
  end_date: string | null;
}

export interface ABTestResults {
  variant_a: {
    total_users: number;
    converted_users: number;
    conversion_rate: number;
    total_value: number;
    avg_value: number;
  };
  variant_b: {
    total_users: number;
    converted_users: number;
    conversion_rate: number;
    total_value: number;
    avg_value: number;
  };
}

export function useABTesting(userPhone?: string) {
  const [experiments, setExperiments] = useState<ABTestExperiment[]>([]);
  const [assignments, setAssignments] = useState<Map<string, 'A' | 'B'>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchExperiments = async () => {
      try {
        const { data, error } = await supabase
          .from('ab_test_experiments')
          .select('*')
          .eq('is_active', true);

        if (error) throw error;
        setExperiments(data || []);
      } catch (err) {
        console.error('Error fetching experiments:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchExperiments();
  }, []);

  const getVariant = async (experimentKey: string): Promise<'A' | 'B'> => {
    if (!userPhone) return 'A';

    if (assignments.has(experimentKey)) {
      return assignments.get(experimentKey)!;
    }

    try {
      const { data, error } = await supabase.rpc('assign_ab_test_variant', {
        p_experiment_key: experimentKey,
        p_user_phone: userPhone
      });

      if (error) throw error;

      const variant = data as 'A' | 'B';
      setAssignments(new Map(assignments.set(experimentKey, variant)));
      return variant;
    } catch (err) {
      console.error('Error assigning variant:', err);
      return 'A';
    }
  };

  const trackConversion = async (
    experimentKey: string,
    conversionEvent: string,
    conversionValue: number = 0
  ) => {
    if (!userPhone) return;

    try {
      await supabase.rpc('track_ab_test_conversion', {
        p_experiment_key: experimentKey,
        p_user_phone: userPhone,
        p_conversion_event: conversionEvent,
        p_conversion_value: conversionValue
      });
    } catch (err) {
      console.error('Error tracking conversion:', err);
    }
  };

  const createExperiment = async (
    name: string,
    key: string,
    variantAName: string = 'Control',
    variantBName: string = 'Test',
    weightA: number = 50,
    weightB: number = 50
  ) => {
    try {
      const { data, error } = await supabase.rpc('create_ab_test', {
        p_experiment_name: name,
        p_experiment_key: key,
        p_variant_a_name: variantAName,
        p_variant_b_name: variantBName,
        p_variant_a_weight: weightA,
        p_variant_b_weight: weightB
      });

      if (error) throw error;
      return { success: true, data };
    } catch (err) {
      console.error('Error creating experiment:', err);
      return { success: false, error: err };
    }
  };

  const getExperimentResults = async (experimentKey: string): Promise<ABTestResults | null> => {
    try {
      const { data, error } = await supabase.rpc('get_ab_test_results', {
        p_experiment_key: experimentKey
      });

      if (error) throw error;
      return data as ABTestResults;
    } catch (err) {
      console.error('Error getting experiment results:', err);
      return null;
    }
  };

  return {
    experiments,
    loading,
    getVariant,
    trackConversion,
    createExperiment,
    getExperimentResults
  };
}
