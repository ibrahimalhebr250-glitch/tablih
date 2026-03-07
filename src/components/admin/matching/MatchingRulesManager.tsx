import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { Settings, Plus, CreditCard as Edit2, Trash2, Power, PowerOff, Save, X, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react';
import LoadingSkeleton from '../../shared/LoadingSkeleton';

interface MatchingRule {
  id: string;
  rule_name: string;
  rule_type: 'weight_adjustment' | 'score_threshold' | 'priority' | 'exclusion';
  conditions: any;
  actions: any;
  priority: number;
  is_active: boolean;
  created_at: string;
}

export default function MatchingRulesManager() {
  const [rules, setRules] = useState<MatchingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] = useState<MatchingRule | null>(null);
  const [formData, setFormData] = useState({
    rule_name: '',
    rule_type: 'weight_adjustment' as const,
    priority: 0,
    conditions: {
      pallet_type: '',
      quality: '',
      city: '',
    },
    actions: {
      multiplier: 1.0,
      min_score: 0,
      max_score: 100,
    },
  });

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('matching_rules')
        .select('*')
        .order('priority', { ascending: false });

      if (error) throw error;
      setRules(data || []);
    } catch (err) {
      console.error('Error fetching rules:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingRule) {
        const { error } = await supabase
          .from('matching_rules')
          .update({
            rule_name: formData.rule_name,
            rule_type: formData.rule_type,
            priority: formData.priority,
            conditions: formData.conditions,
            actions: formData.actions,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingRule.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('matching_rules').insert({
          rule_name: formData.rule_name,
          rule_type: formData.rule_type,
          priority: formData.priority,
          conditions: formData.conditions,
          actions: formData.actions,
        });

        if (error) throw error;
      }

      setShowForm(false);
      setEditingRule(null);
      resetForm();
      fetchRules();
    } catch (err) {
      console.error('Error saving rule:', err);
    }
  };

  const handleToggleActive = async (rule: MatchingRule) => {
    try {
      const { error } = await supabase
        .from('matching_rules')
        .update({ is_active: !rule.is_active })
        .eq('id', rule.id);

      if (error) throw error;
      fetchRules();
    } catch (err) {
      console.error('Error toggling rule:', err);
    }
  };

  const handleDelete = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this rule?')) return;

    try {
      const { error } = await supabase
        .from('matching_rules')
        .delete()
        .eq('id', ruleId);

      if (error) throw error;
      fetchRules();
    } catch (err) {
      console.error('Error deleting rule:', err);
    }
  };

  const handleEdit = (rule: MatchingRule) => {
    setEditingRule(rule);
    setFormData({
      rule_name: rule.rule_name,
      rule_type: rule.rule_type,
      priority: rule.priority,
      conditions: rule.conditions,
      actions: rule.actions,
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      rule_name: '',
      rule_type: 'weight_adjustment',
      priority: 0,
      conditions: { pallet_type: '', quality: '', city: '' },
      actions: { multiplier: 1.0, min_score: 0, max_score: 100 },
    });
  };

  const getRuleTypeLabel = (type: string) => {
    switch (type) {
      case 'weight_adjustment':
        return 'تعديل الأوزان';
      case 'score_threshold':
        return 'عتبة الدرجة';
      case 'priority':
        return 'قاعدة الأولوية';
      case 'exclusion':
        return 'قاعدة الاستبعاد';
      default:
        return type;
    }
  };

  const getRuleTypeColor = (type: string) => {
    switch (type) {
      case 'weight_adjustment':
        return { bg: '#DBEAFE', color: '#2563EB' };
      case 'score_threshold':
        return { bg: '#FEF3C7', color: '#D97706' };
      case 'priority':
        return { bg: '#D1FAE5', color: '#059669' };
      case 'exclusion':
        return { bg: '#FEE2E2', color: '#DC2626' };
      default:
        return { bg: '#F3F4F6', color: '#6B7280' };
    }
  };

  if (loading) {
    return <LoadingSkeleton variant="card" count={3} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
            <Settings className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">قواعد المطابقة</h3>
            <p className="text-xs text-gray-600">ضبط سلوك الذكاء الاصطناعي</p>
          </div>
        </div>

        <button
          onClick={() => {
            setShowForm(true);
            setEditingRule(null);
            resetForm();
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-all"
        >
          <Plus className="w-4 h-4" />
          إضافة قاعدة
        </button>
      </div>

      {/* Rules List */}
      <div className="space-y-3">
        {rules.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-gray-100">
            <Settings className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-sm text-gray-600">لا توجد قواعد مطابقة مضبوطة</p>
          </div>
        ) : (
          rules.map((rule) => {
            const typeConfig = getRuleTypeColor(rule.rule_type);
            return (
              <div
                key={rule.id}
                className="bg-white rounded-2xl p-6 border border-gray-100"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h4 className="text-lg font-bold text-gray-900">{rule.rule_name}</h4>
                      <span
                        className="text-xs font-bold px-3 py-1 rounded-full"
                        style={{ background: typeConfig.bg, color: typeConfig.color }}
                      >
                        {getRuleTypeLabel(rule.rule_type)}
                      </span>
                      {rule.is_active ? (
                        <span className="text-xs font-bold px-3 py-1 rounded-full bg-green-100 text-green-600">
                          نشط
                        </span>
                      ) : (
                        <span className="text-xs font-bold px-3 py-1 rounded-full bg-gray-100 text-gray-600">
                          معطّل
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600 mb-1">الأولوية:</p>
                        <p className="font-bold text-gray-900">{rule.priority}</p>
                      </div>
                      <div>
                        <p className="text-gray-600 mb-1">الشروط:</p>
                        <p className="font-bold text-gray-900">
                          {Object.keys(rule.conditions).filter(k => rule.conditions[k]).length || 'أي'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleActive(rule)}
                      className={`p-2 rounded-lg transition-all ${
                        rule.is_active
                          ? 'bg-green-100 hover:bg-green-200'
                          : 'bg-gray-100 hover:bg-gray-200'
                      }`}
                    >
                      {rule.is_active ? (
                        <Power className="w-4 h-4 text-green-600" />
                      ) : (
                        <PowerOff className="w-4 h-4 text-gray-600" />
                      )}
                    </button>
                    <button
                      onClick={() => handleEdit(rule)}
                      className="p-2 rounded-lg bg-blue-100 hover:bg-blue-200 transition-all"
                    >
                      <Edit2 className="w-4 h-4 text-blue-600" />
                    </button>
                    <button
                      onClick={() => handleDelete(rule.id)}
                      className="p-2 rounded-lg bg-red-100 hover:bg-red-200 transition-all"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">
                  {editingRule ? 'تعديل القاعدة' : 'إضافة قاعدة جديدة'}
                </h3>
                <button
                  onClick={() => {
                    setShowForm(false);
                    setEditingRule(null);
                    resetForm();
                  }}
                  className="p-2 rounded-lg hover:bg-gray-100"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  اسم القاعدة
                </label>
                <input
                  type="text"
                  value={formData.rule_name}
                  onChange={(e) => setFormData({ ...formData, rule_name: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                  required
                  placeholder="مثال: زيادة أهمية الجودة للطبليات الخشبية"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  نوع القاعدة
                </label>
                <select
                  value={formData.rule_type}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      rule_type: e.target.value as any,
                    })
                  }
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                >
                  <option value="weight_adjustment">تعديل الأوزان</option>
                  <option value="score_threshold">عتبة الدرجة</option>
                  <option value="priority">قاعدة الأولوية</option>
                  <option value="exclusion">قاعدة الاستبعاد</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  الأولوية (الأعلى يُطبق أولاً)
                </label>
                <input
                  type="number"
                  value={formData.priority}
                  onChange={(e) =>
                    setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })
                  }
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                  placeholder="0"
                />
              </div>

              {formData.rule_type === 'weight_adjustment' && (
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    معامل الضرب للدرجة
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.actions.multiplier}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        actions: {
                          ...formData.actions,
                          multiplier: parseFloat(e.target.value) || 1.0,
                        },
                      })
                    }
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                    placeholder="1.0"
                  />
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-all"
                >
                  <Save className="w-4 h-4" />
                  {editingRule ? 'تحديث القاعدة' : 'إنشاء القاعدة'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingRule(null);
                    resetForm();
                  }}
                  className="px-6 py-3 rounded-xl bg-gray-100 text-gray-700 font-bold hover:bg-gray-200 transition-all"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-blue-50 rounded-2xl p-6 border border-blue-100">
        <div className="flex items-start gap-4">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold text-gray-900 mb-2">حول قواعد المطابقة</h4>
            <p className="text-xs text-gray-700 mb-2">
              يتم تطبيق القواعد حسب الأولوية (الأعلى أولاً) لتعديل درجات المطابقة والسلوك:
            </p>
            <ul className="text-xs text-gray-700 space-y-1 list-disc list-inside">
              <li><strong>تعديل الأوزان:</strong> ضرب الدرجات بمعامل</li>
              <li><strong>عتبة الدرجة:</strong> تحديد حدود دنيا/عليا للدرجة</li>
              <li><strong>الأولوية:</strong> تعزيز أنواع معينة من المطابقة</li>
              <li><strong>الاستبعاد:</strong> منع مجموعات معينة</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
