import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { Shield, Plus, Trash2, Clock } from 'lucide-react';
import LoadingSkeleton from '../../shared/LoadingSkeleton';

interface BlacklistEntry {
  id: string;
  buyer_phone?: string;
  supplier_phone?: string;
  reason: string;
  blacklist_type: string;
  is_active: boolean;
  expires_at?: string;
  created_at: string;
}

export default function MatchingBlacklist() {
  const [entries, setEntries] = useState<BlacklistEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEntries();
  }, []);

  const fetchEntries = async () => {
    try {
      const { data, error } = await supabase
        .from('matching_blacklist')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEntries(data || []);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('إزالة من القائمة السوداء؟')) return;
    try {
      await supabase.from('matching_blacklist').delete().eq('id', id);
      fetchEntries();
    } catch (err) {
      console.error('Error:', err);
    }
  };

  if (loading) return <LoadingSkeleton variant="card" count={3} />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-red-600" />
          <div>
            <h3 className="text-lg font-bold">القائمة السوداء</h3>
            <p className="text-xs text-gray-600">منع مطابقات معينة</p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {entries.map((entry) => (
          <div key={entry.id} className="bg-white rounded-xl p-4 border border-gray-100">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-bold px-2 py-1 rounded bg-red-100 text-red-600">
                    {entry.blacklist_type}
                  </span>
                  {entry.is_active && (
                    <span className="text-xs font-bold px-2 py-1 rounded bg-green-100 text-green-600">
                      نشط
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-700">{entry.reason}</p>
                {entry.expires_at && (
                  <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    ينتهي: {new Date(entry.expires_at).toLocaleDateString('ar-SA')}
                  </p>
                )}
              </div>
              <button
                onClick={() => handleDelete(entry.id)}
                className="p-2 rounded-lg bg-red-100 hover:bg-red-200"
              >
                <Trash2 className="w-4 h-4 text-red-600" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
