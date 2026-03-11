import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface VisitorPeriodStats {
  last24h: number;
  last48h: number;
  last72h: number;
  last7d: number;
  last14d: number;
  last30d: number;
  total: number;
  avgDaily: number;
  peakDay: { date: string; count: number } | null;
  lastUpdated: string;
}

export interface VisitorDailyPoint {
  date: string;
  count: number;
  label: string;
}

export function useVisitorStats() {
  const [stats, setStats] = useState<VisitorPeriodStats | null>(null);
  const [dailyChart, setDailyChart] = useState<VisitorDailyPoint[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from('platform_visitor_logs')
      .select('visitor_id, visit_date, created_at')
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: false });

    const { count: totalCount } = await supabase
      .from('platform_visitor_logs')
      .select('visitor_id', { count: 'exact', head: true });

    if (error) {
      setLoading(false);
      return;
    }

    const now = Date.now();
    const h = (hours: number) => new Date(now - hours * 3600 * 1000).toISOString();
    const d = (days: number) => new Date(now - days * 86400 * 1000).toISOString();

    const uniqueIn = (cutoff: string) =>
      new Set(data.filter(r => r.created_at >= cutoff).map(r => r.visitor_id)).size;

    const last24h = uniqueIn(h(24));
    const last48h = uniqueIn(h(48));
    const last72h = uniqueIn(h(72));
    const last7d = uniqueIn(d(7));
    const last14d = uniqueIn(d(14));
    const last30d = uniqueIn(d(30));

    const byDay: Record<string, Set<string>> = {};
    data.forEach(r => {
      const day = r.visit_date as string;
      if (!byDay[day]) byDay[day] = new Set();
      byDay[day].add(r.visitor_id);
    });

    const chartPoints: VisitorDailyPoint[] = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const key = date.toISOString().slice(0, 10);
      const count = byDay[key]?.size ?? 0;
      const label = date.toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' });
      chartPoints.push({ date: key, count, label });
    }

    const days = Object.entries(byDay);
    let peakDay: { date: string; count: number } | null = null;
    days.forEach(([date, visitors]) => {
      if (!peakDay || visitors.size > peakDay.count) {
        peakDay = { date, count: visitors.size };
      }
    });

    const activeDays = days.filter(([, v]) => v.size > 0).length;
    const avgDaily = activeDays > 0 ? Math.round(last30d / activeDays) : 0;

    setStats({
      last24h,
      last48h,
      last72h,
      last7d,
      last14d,
      last30d,
      total: totalCount ?? 0,
      avgDaily,
      peakDay,
      lastUpdated: new Date().toLocaleTimeString('ar-SA'),
    });
    setDailyChart(chartPoints);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, [load]);

  return { stats, dailyChart, loading, refetch: load };
}
