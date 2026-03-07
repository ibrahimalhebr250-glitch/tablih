import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { Activity, TrendingUp, CheckCircle2 } from 'lucide-react';
import LoadingSkeleton from '../../shared/LoadingSkeleton';

export default function MatchingPatterns() {
  const [patterns, setPatterns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPatterns();
  }, []);

  const fetchPatterns = async () => {
    try {
      const { data, error } = await supabase.rpc('analyze_matching_patterns');
      if (error) throw error;
      setPatterns(data || []);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSkeleton variant="card" count={3} />;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Activity className="w-6 h-6 text-purple-600" />
        <div>
          <h3 className="text-lg font-bold">الأنماط المكتشفة</h3>
          <p className="text-xs text-gray-600">تحليل ذكي للسلوك</p>
        </div>
      </div>

      {patterns.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center border border-gray-100">
          <Activity className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-sm text-gray-600">بيانات غير كافية لتحليل الأنماط حتى الآن</p>
        </div>
      ) : (
        <div className="space-y-3">
          {patterns.map((pattern, idx) => (
            <div key={idx} className="bg-white rounded-xl p-6 border border-gray-100">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-bold text-gray-900">نمط نجاح</h4>
                    <span className="text-xs font-bold px-2 py-1 rounded bg-green-100 text-green-600">
                      ثقة {Math.round(pattern.confidence_score)}%
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 mb-2">{pattern.pattern_description}</p>
                  <p className="text-xs text-gray-600 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    {pattern.occurrences} تكرار
                  </p>
                  <div className="mt-3 p-3 rounded-lg bg-blue-50 border border-blue-100">
                    <p className="text-xs font-semibold text-blue-900">{pattern.recommendation}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
