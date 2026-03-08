import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Activity, Package, ShoppingCart, ArrowRight, Sparkles,
  CheckCircle2, Clock, AlertCircle, Zap, MapPin, Tag
} from 'lucide-react';

interface LiveMatch {
  id: string;
  order_id: string;
  batch_id: string;
  match_score: number;
  match_status: 'pending' | 'matched' | 'failed';
  pallet_type: string;
  size: string;
  quality: string;
  quantity: number;
  city: string;
  buyer_phone: string;
  supplier_phone: string;
  created_at: string;
  processing_time_ms: number;
}

interface LiveMatchingMonitorProps {
  phone?: string;
  isAdmin?: boolean;
}

export default function LiveMatchingMonitor({ phone, isAdmin }: LiveMatchingMonitorProps) {
  const [liveMatches, setLiveMatches] = useState<LiveMatch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLiveMatches();

    const channel = supabase
      .channel('live-matching')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'matching_analytics' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setLiveMatches((prev) => [payload.new as LiveMatch, ...prev].slice(0, 20));
          }
        }
      )
      .subscribe();

    const interval = setInterval(loadLiveMatches, 10000);

    return () => {
      channel.unsubscribe();
      clearInterval(interval);
    };
  }, [phone, isAdmin]);

  const loadLiveMatches = async () => {
    try {
      let query = supabase
        .from('matching_analytics')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (!isAdmin && phone) {
        query = query.or(`buyer_phone.eq.${phone},supplier_phone.eq.${phone}`);
      }

      const { data, error } = await query;
      if (error) throw error;
      setLiveMatches(data || []);
    } catch (err) {
      console.error('Error loading live matches:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-2xl p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-4" />
            <div className="h-3 bg-gray-200 rounded w-3/4" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-200">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center">
            <Activity className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div>
            <h2 className="text-xl font-black text-gray-900">المراقبة الحية</h2>
            <p className="text-sm text-gray-600">تتبع المطابقات الفورية لحظة بلحظة</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-sm font-bold text-green-700">متصل • تحديث تلقائي كل 10 ثواني</span>
        </div>
      </div>

      {liveMatches.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">لا توجد مطابقات حية حالياً</h3>
          <p className="text-sm text-gray-600">
            سيتم عرض المطابقات الجديدة تلقائياً عند حدوثها
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {liveMatches.map((match) => {
            const statusConfig = {
              matched: { bg: '#D1FAE5', color: '#059669', icon: CheckCircle2, label: 'مطابقة ناجحة' },
              pending: { bg: '#FEF3C7', color: '#D97706', icon: Clock, label: 'قيد المعالجة' },
              failed: { bg: '#FEE2E2', color: '#DC2626', icon: AlertCircle, label: 'فشلت' },
            }[match.match_status];

            const StatusIcon = statusConfig.icon;

            return (
              <div
                key={match.id}
                className="bg-white rounded-2xl p-5 border-2 transition-all hover:shadow-lg"
                style={{ borderColor: statusConfig.color }}
              >
                <div className="flex items-start gap-4">
                  <div
                    className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ background: statusConfig.bg }}
                  >
                    <StatusIcon className="w-6 h-6" style={{ color: statusConfig.color }} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className="text-xs font-bold px-2 py-1 rounded-full"
                        style={{ background: statusConfig.bg, color: statusConfig.color }}
                      >
                        {statusConfig.label}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(match.created_at).toLocaleTimeString('ar-SA')}
                      </span>
                    </div>

                    <h4 className="text-lg font-bold text-gray-900 mb-3">
                      {match.pallet_type} • {match.quality} • {match.size}
                    </h4>

                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Package className="w-4 h-4" />
                        <span>{match.quantity} طبلية</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="w-4 h-4" />
                        <span>{match.city}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 pt-3 border-t border-gray-100">
                      <div className="flex items-center gap-2">
                        <ShoppingCart className="w-4 h-4 text-blue-600" />
                        <span className="text-xs text-gray-600">مشتري</span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-gray-400" />
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-green-600" />
                        <span className="text-xs text-gray-600">مورد</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex-shrink-0 text-left">
                    <div className="mb-2">
                      <span
                        className="text-2xl font-black"
                        style={{ color: statusConfig.color }}
                      >
                        {Math.round(match.match_score)}
                      </span>
                      <span className="text-sm text-gray-500">%</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Zap className="w-3 h-3" />
                      <span>{match.processing_time_ms}ms</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
