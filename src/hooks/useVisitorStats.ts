import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

export interface VisitorPeriodStats {
  last24h: number;
  last48h: number;
  last72h: number;
  last7d: number;
  last14d: number;
  last30d: number;
  last30m: number;
  last1h: number;
  total: number;
  totalSessions: number;
  identified: number;
  avgDaily: number;
  peakDay: { date: string; count: number } | null;
  lastUpdated: string;
}

export interface VisitorDailyPoint {
  date: string;
  count: number;
  sessions: number;
  label: string;
}

export function useVisitorStats() {
  const [stats, setStats] = useState<VisitorPeriodStats | null>(null);
  const [dailyChart, setDailyChart] = useState<VisitorDailyPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const load = useCallback(async () => {
    const [statsResult, dailyResult] = await Promise.all([
      supabase.rpc('admin_get_visitor_stats'),
      supabase.rpc('admin_get_daily_visitors', { days_back: 30 }),
    ]);

    if (statsResult.error || !statsResult.data) {
      setLoading(false);
      return;
    }

    const s = statsResult.data as Record<string, number>;

    const dailyRows: Array<{ day: string; unique_visitors: number; total_sessions: number }> =
      dailyResult.data ?? [];

    const byDay: Record<string, { visitors: number; sessions: number }> = {};
    dailyRows.forEach(row => {
      byDay[row.day] = { visitors: Number(row.unique_visitors), sessions: Number(row.total_sessions) };
    });

    const chartPoints: VisitorDailyPoint[] = [];
    let peakDay: { date: string; count: number } | null = null;
    let totalVisitorsInPeriod = 0;
    let activeDays = 0;

    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const key = date.toISOString().slice(0, 10);
      const count = byDay[key]?.visitors ?? 0;
      const sessions = byDay[key]?.sessions ?? 0;
      const label = date.toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' });
      chartPoints.push({ date: key, count, sessions, label });
      if (count > 0) {
        activeDays++;
        totalVisitorsInPeriod += count;
        if (!peakDay || count > peakDay.count) {
          peakDay = { date: key, count };
        }
      }
    }

    const avgDaily = activeDays > 0 ? Math.round(totalVisitorsInPeriod / activeDays) : 0;

    setStats({
      last24h: s.last24h ?? 0,
      last48h: s.last48h ?? 0,
      last72h: s.last72h ?? 0,
      last7d: s.last7d ?? 0,
      last14d: s.last14d ?? 0,
      last30d: s.last30d ?? 0,
      last30m: s.last30m ?? 0,
      last1h: s.last1h ?? 0,
      total: s.total_unique ?? 0,
      totalSessions: s.total_sessions ?? 0,
      identified: s.total_identified ?? 0,
      avgDaily,
      peakDay,
      lastUpdated: new Date().toLocaleTimeString('ar-SA'),
    });
    setDailyChart(chartPoints);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();

    channelRef.current = supabase
      .channel('visitor_stats_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'visitor_sessions' }, () => {
        load();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'visitor_sessions' }, () => {
        load();
      })
      .subscribe();

    const interval = setInterval(load, 60000);

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      clearInterval(interval);
    };
  }, [load]);

  return { stats, dailyChart, loading, refetch: load };
}
