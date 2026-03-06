import { useState } from 'react';
import { Save, Eye, EyeOff, Edit2, ArrowUp, ArrowDown, Plus, X } from 'lucide-react';
import { useOrderSettings, type FlexibilityOption } from '../../../hooks/useOrderSettings';

export default function FlexibilityOptionsTab() {
  const { flexibilityOptions, loading, error, createFlexibilityOption, updateFlexibilityOption } = useOrderSettings();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<FlexibilityOption>>({});
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newOption, setNewOption] = useState({
    code: '',
    name_ar: '',
    name_en: '',
    description: '',
    sort_order: flexibilityOptions.length + 1,
    affects_matching: true
  });

  const handleStartEdit = (option: FlexibilityOption) => {
    setEditingId(option.id);
    setEditForm(option);
  };

  const handleSave = async () => {
    if (!editingId) return;

    const result = await updateFlexibilityOption(editingId, editForm);
    if (result?.success) {
      setEditingId(null);
      setEditForm({});
      alert('تم حفظ التعديلات بنجاح');
    }
  };

  const handleToggleActive = async (option: FlexibilityOption) => {
    await updateFlexibilityOption(option.id, { is_active: !option.is_active });
  };

  const handleMoveUp = async (option: FlexibilityOption, index: number) => {
    if (index === 0) return;
    const prevOption = flexibilityOptions[index - 1];
    await updateFlexibilityOption(option.id, { sort_order: prevOption.sort_order });
    await updateFlexibilityOption(prevOption.id, { sort_order: option.sort_order });
  };

  const handleMoveDown = async (option: FlexibilityOption, index: number) => {
    if (index === flexibilityOptions.length - 1) return;
    const nextOption = flexibilityOptions[index + 1];
    await updateFlexibilityOption(option.id, { sort_order: nextOption.sort_order });
    await updateFlexibilityOption(nextOption.id, { sort_order: option.sort_order });
  };

  const handleCreateOption = async () => {
    if (!newOption.code || !newOption.name_ar || !newOption.name_en) {
      alert('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    const result = await createFlexibilityOption({
      code: newOption.code,
      name_ar: newOption.name_ar,
      name_en: newOption.name_en,
      description: newOption.description,
      is_active: true,
      sort_order: newOption.sort_order,
      affects_matching: newOption.affects_matching
    });

    if (result?.success) {
      setShowAddDialog(false);
      setNewOption({
        code: '',
        name_ar: '',
        name_en: '',
        description: '',
        sort_order: flexibilityOptions.length + 2,
        affects_matching: true
      });
      alert('تم إضافة خيار المرونة بنجاح');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
        <p className="text-red-700">حدث خطأ: {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex-1">
          <p className="text-sm text-blue-800">
            <strong>ملاحظة:</strong> خيارات المرونة تؤثر مباشرة على نظام المطابقة في المنصة. عند تفعيل خيار مرونة، سيتم استخدامه في خوارزمية المطابقة للعثور على عروض مناسبة للطلب.
          </p>
        </div>
        <button
          onClick={() => setShowAddDialog(true)}
          className="mr-4 flex items-center gap-2 px-4 py-2.5 bg-[#1a4a5e] text-white rounded-xl font-semibold hover:bg-[#152f3d] transition-colors text-sm whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          إضافة مرونة جديدة
        </button>
      </div>

      {flexibilityOptions.map((option, index) => {
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
                  <label className="block text-sm font-semibold text-gray-700 mb-2">الوصف</label>
                  <textarea
                    value={editForm.description || ''}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
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
                    <p className="text-sm text-gray-600">{option.description}</p>
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
                      onClick={() => handleMoveUp(option, index)}
                      disabled={index === 0}
                      className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-30"
                    >
                      <ArrowUp className="w-4 h-4 text-gray-600" />
                    </button>

                    <button
                      onClick={() => handleMoveDown(option, index)}
                      disabled={index === flexibilityOptions.length - 1}
                      className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-30"
                    >
                      <ArrowDown className="w-4 h-4 text-gray-600" />
                    </button>

                    <button
                      onClick={() => handleStartEdit(option)}
                      className="p-2 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4 text-blue-600" />
                    </button>
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>الكود: <span className="font-mono font-semibold">{option.code}</span></span>
                    <span>•</span>
                    <span>الترتيب: {option.sort_order}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {showAddDialog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">إضافة خيار مرونة جديد</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">الكود (بالإنجليزية)</label>
                <input
                  type="text"
                  value={newOption.code}
                  onChange={(e) => setNewOption({...newOption, code: e.target.value})}
                  placeholder="مثال: accept_late_delivery"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">الاسم بالعربية</label>
                <input
                  type="text"
                  value={newOption.name_ar}
                  onChange={(e) => setNewOption({...newOption, name_ar: e.target.value})}
                  placeholder="مثال: أقبل التوصيل المتأخر"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">الاسم بالإنجليزية</label>
                <input
                  type="text"
                  value={newOption.name_en}
                  onChange={(e) => setNewOption({...newOption, name_en: e.target.value})}
                  placeholder="مثال: Accept Late Delivery"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">الوصف</label>
                <textarea
                  value={newOption.description}
                  onChange={(e) => setNewOption({...newOption, description: e.target.value})}
                  placeholder="وصف مختصر لخيار المرونة"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl"
                  rows={3}
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="newAffectsMatching"
                  checked={newOption.affects_matching}
                  onChange={(e) => setNewOption({...newOption, affects_matching: e.target.checked})}
                  className="w-5 h-5 rounded border-gray-300"
                />
                <label htmlFor="newAffectsMatching" className="text-sm font-semibold text-gray-700">
                  يؤثر على نظام المطابقة
                </label>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleCreateOption}
                className="flex-1 px-4 py-2.5 bg-[#1a4a5e] text-white rounded-xl font-semibold hover:bg-[#152f3d] transition-colors"
              >
                إضافة
              </button>
              <button
                onClick={() => setShowAddDialog(false)}
                className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
