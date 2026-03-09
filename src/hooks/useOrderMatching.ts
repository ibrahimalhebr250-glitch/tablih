import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface MatchCandidate {
  id: string;
  order_id: string;
  batch_id: string;
  match_score: number;
  score_type: number;
  score_size: number;
  score_quality: number;
  score_city: number;
  score_quantity: number;
  auto_matched: boolean;
  deal_id: string | null;
  status: string;
  order_request_id: string;
  order_phone: string;
  order_pallet_type: string;
  order_size: string;
  order_quality: string;
  order_city: string;
  order_quantity: number;
  batch_ref: string;
  batch_phone: string;
  batch_pallet_type: string;
  batch_size: string;
  batch_quality: string;
  batch_city: string;
  batch_available: number;
  created_at: string;
}

export interface MarketOpportunities {
  unmatched_orders: {
    id: string;
    request_id: string;
    pallet_type: string;
    size: string;
    quality: string;
    city: string;
    quantity: number;
    phone: string;
    status: string;
    created_at: string;
    candidate_count: number;
  }[];
  unmatched_inventory: {
    id: string;
    batch_ref: string;
    pallet_type: string;
    size: string;
    quality: string;
    city: string;
    available_quantity: number;
    phone: string;
    status: string;
    created_at: string;
    candidate_count: number;
  }[];
}

export interface MarketAnalysis {
  size_demand: { size: string; order_count: number; total_qty: number }[];
  city_activity: { city: string; orders: number; inventory: number; deals: number }[];
  daily_stats: { day: string; matches: number; deals: number; avg_score: number }[];
  quality_demand: { quality: string; count: number; total_qty: number }[];
  type_demand: { pallet_type: string; count: number; total_qty: number }[];
  supply_demand_gap: { city: string; demand_qty: number; supply_qty: number; gap: number }[];
}

export interface NearMatch {
  order_id: string;
  request_id: string;
  order_phone: string;
  order_pallet_type: string;
  order_size: string;
  order_quality: string;
  order_city: string;
  order_quantity: number;
  batch_id: string;
  batch_ref: string;
  batch_phone: string;
  batch_pallet_type: string;
  batch_size: string;
  batch_quality: string;
  batch_city: string;
  batch_available: number;
  match_score: number;
  score_type: number;
  score_size: number;
  score_quality: number;
  score_city: number;
  score_quantity: number;
  norm_order_type: string;
  norm_batch_type: string;
  norm_order_size: string;
  norm_batch_size: string;
  norm_order_quality: string;
  norm_batch_quality: string;
  same_owner: boolean;
  primary_blocker: string;
  blockers: { factor: string; order_val: string; batch_val: string; norm_order?: string; norm_batch?: string; score: number }[];
}

export function useOrderMatching() {
  const [candidates, setCandidates] = useState<MatchCandidate[]>([]);
  const [opportunities, setOpportunities] = useState<MarketOpportunities | null>(null);
  const [analysis, setAnalysis] = useState<MarketAnalysis | null>(null);
  const [nearMatches, setNearMatches] = useState<NearMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'board' | 'opportunities' | 'analysis' | 'near_matches'>('board');

  const fetchCandidates = useCallback(async (status = 'active', minScore = 0) => {
    const { data, error } = await supabase.rpc('om_get_candidates_board', {
      p_status: status,
      p_min_score: minScore,
      p_limit: 100,
    });
    if (!error && data) {
      setCandidates(data as MatchCandidate[]);
    }
  }, []);

  const fetchOpportunities = useCallback(async () => {
    const { data, error } = await supabase.rpc('om_get_market_opportunities');
    if (!error && data) {
      setOpportunities(data as MarketOpportunities);
    }
  }, []);

  const fetchAnalysis = useCallback(async () => {
    const { data, error } = await supabase.rpc('om_get_market_analysis');
    if (!error && data) {
      setAnalysis(data as MarketAnalysis);
    }
  }, []);

  const fetchNearMatches = useCallback(async () => {
    const { data, error } = await supabase.rpc('om_get_near_matches', { p_limit: 50 });
    if (!error && data) {
      setNearMatches(data as NearMatch[]);
    }
  }, []);

  const createDealFromCandidate = useCallback(async (candidateId: string) => {
    const { data, error } = await supabase.rpc('om_admin_create_deal_from_candidate', {
      p_candidate_id: candidateId,
    });
    if (error) return { success: false, error: error.message };
    return data as { success: boolean; deal_id?: string; deal_ref?: string; quantity?: number; error?: string };
  }, []);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchCandidates(), fetchOpportunities(), fetchAnalysis(), fetchNearMatches()]);
    setLoading(false);
  }, [fetchCandidates, fetchOpportunities, fetchAnalysis, fetchNearMatches]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  useEffect(() => {
    const channel = supabase
      .channel('order-matching-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matching_candidates' }, () => {
        fetchCandidates();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchOpportunities();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_batches' }, () => {
        fetchOpportunities();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchCandidates, fetchOpportunities]);

  return {
    candidates,
    opportunities,
    analysis,
    nearMatches,
    loading,
    activeTab,
    setActiveTab,
    fetchCandidates,
    fetchOpportunities,
    fetchAnalysis,
    fetchNearMatches,
    createDealFromCandidate,
    refreshAll,
  };
}
