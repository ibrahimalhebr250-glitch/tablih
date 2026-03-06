import { useState } from 'react';
import { Save, Eye, EyeOff, CreditCard as Edit2 } from 'lucide-react';
import type { FlexibilityOption } from '../../../hooks/useAdminOrders';

interface Props {
  options: FlexibilityOption[];
  onUpdate: (optionId: string, updates: Partial<FlexibilityOption>) => Promise<{ success: boolean; error?: string }>;
}

export default function FlexibilityOptionsTab({ options, onUpdate }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<FlexibilityOption>>({});

  const handleStartEdit = (option: FlexibilityOption) => {
    setEditingId(option.id);
    setEditForm(option);
  };

  const handleSave = async () => {
    if (!editingId) return;

    const result = await onUpdate(editingId, editForm);
    if (result.success) {
      setEditingId(null);
      setEditForm({});
    }
  };

  const handleToggleActive = async (option: FlexibilityOption) => {
    await onUpdate(option.id, { is_active: !option.is_active });
  };

  return (
    <div className="space-y-4">
      {options.map((option) => {
        const isEditing = editingId === option.id;

        return (
          <div key={option.id} className="bg-white rounded-2xl border border-gray-200 p-6">
            {isEditing ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">الاسم بالعربية</label>
                    <input
                      type="text"
                      value={editForm.name_ar || ''}
                      onChange={(e) => setEditForm({ ...editForm, name_ar: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">الاسم بالإنجليزية</label>
                    <input
                      type="text"
                      value={editForm.name_en || ''}
                      onChange={(e) => setEditForm({ ...editForm, name_en: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">الوصف بالعربية</label>
                  <textarea
                    value={editForm.description_ar || ''}
                    onChange={(e) => setEditForm({ ...editForm, description_ar: e.target.value })}
                    rows={2}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">الوصف بالإنجليزية</label>
                  <textarea
                    value={editForm.description_en || ''}
                    onChange={(e) => setEditForm({ ...editForm, description_en: e.target.value })}
                    rows={2}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl resize-none"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={`affects-${option.id}`}
                    checked={editForm.affects_matching || false}
                    onChange={(e) => setEditForm({ ...editForm, affects_matching: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <label htmlFor={`affects-${option.id}`} className="text-sm text-gray-700">
                    يؤثر على نظام المطابقة
                  </label>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleSave}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#1a4a5e] text-white rounded-xl font-semibold hover:bg-[#152f3d] transition-colors"
                  >
                    <Save className="w-4 h-4" />
                    حفظ التعديلات
                  </button>
                  <button
                    onClick={() => {
                      setEditingId(null);
                      setEditForm({});
                    }}
                    className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1">{option.name_ar}</h4>
                    <p className="text-sm text-gray-600">{option.description_ar}</p>
                    {option.affects_matching && (
                      <span className="inline-block mt-2 px-2 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full">
                        يؤثر على المطابقة
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleActive(option)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                        option.is_active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {option.is_active ? (
                        <><Eye className="w-3.5 h-3.5 inline ml-1" />مفعّل</>
                      ) : (
                        <><EyeOff className="w-3.5 h-3.5 inline ml-1" />مخفي</>
                      )}
                    </button>

                    <button
                      onClick={() => handleStartEdit(option)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>الكود: <span className="font-mono font-semibold">{option.code}</span></span>
                    <span>•</span>
                    <span>الترتيب: {option.display_order}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
