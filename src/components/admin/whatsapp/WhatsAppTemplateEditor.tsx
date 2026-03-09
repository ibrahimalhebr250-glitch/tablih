import { useState } from 'react';
import { X, Save, Eye, Info } from 'lucide-react';
import type { WhatsAppTemplate } from '../../../hooks/useWhatsAppTemplates';
import { buildMessageFromTemplate } from '../../../hooks/useWhatsAppTemplates';

interface Props {
  template?: WhatsAppTemplate | null;
  onSave: (data: Partial<WhatsAppTemplate>) => Promise<void>;
  onClose: () => void;
}

const DEMO_VARIABLES: Record<string, string> = {
  deal_ref: 'DEAL-2024-0001',
  pallet_type: 'خشب',
  size: '120×80',
  quality: 'A',
  quantity: '50',
  city: 'الرياض',
  price: '45',
  buyer_name: 'محمد الأحمد',
  supplier_name: 'شركة الطبليات',
};

export default function WhatsAppTemplateEditor({ template, onSave, onClose }: Props) {
  const [name, setName] = useState(template?.name ?? '');
  const [senderRole, setSenderRole] = useState<'buyer' | 'supplier' | 'both'>(template?.sender_role ?? 'buyer');
  const [templateText, setTemplateText] = useState(template?.template_text ?? '');
  const [description, setDescription] = useState(template?.description ?? '');
  const [isActive, setIsActive] = useState(template?.is_active ?? true);
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);

  const preview = buildMessageFromTemplate(templateText, DEMO_VARIABLES);

  const handleSave = async () => {
    if (!name.trim() || !templateText.trim()) return;
    setSaving(true);
    await onSave({
      id: template?.id,
      name,
      sender_role: senderRole,
      template_text: templateText,
      description,
      is_active: isActive,
    });
    setSaving(false);
    onClose();
  };

  const insertVariable = (variable: string) => {
    setTemplateText(prev => prev + `{{${variable}}}`);
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl" dir="rtl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-[#0f2535]">
              {template ? 'تعديل القالب' : 'قالب جديد'}
            </h2>
            <p className="text-xs text-[#7a9aab]">تخصيص رسالة واتساب</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Name */}
          <div>
            <label className="block text-sm font-bold text-[#1a2f3e] mb-1.5">اسم القالب</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a9e5c]/30 focus:border-[#1a9e5c]"
              placeholder="مثال: قالب المشتري الرسمي"
            />
          </div>

          {/* Sender Role */}
          <div>
            <label className="block text-sm font-bold text-[#1a2f3e] mb-1.5">يُستخدم من قِبل</label>
            <div className="flex gap-2">
              {(['buyer', 'supplier', 'both'] as const).map(role => (
                <button
                  key={role}
                  onClick={() => setSenderRole(role)}
                  className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all border ${
                    senderRole === role
                      ? role === 'buyer' ? 'bg-blue-600 text-white border-blue-600' : role === 'supplier' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-[#0f2535] text-white border-[#0f2535]'
                      : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  {role === 'buyer' ? 'المشتري' : role === 'supplier' ? 'المورد' : 'الطرفين'}
                </button>
              ))}
            </div>
          </div>

          {/* Variables helper */}
          <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
            <div className="flex items-center gap-2 mb-2">
              <Info className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-bold text-blue-700">المتغيرات المتاحة - اضغط لإدراجها</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {Object.keys(DEMO_VARIABLES).map(variable => (
                <button
                  key={variable}
                  onClick={() => insertVariable(variable)}
                  className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-white text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors"
                >
                  {`{{${variable}}}`}
                </button>
              ))}
            </div>
          </div>

          {/* Template Text */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-bold text-[#1a2f3e]">نص القالب</label>
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="flex items-center gap-1.5 text-xs text-[#1a9e5c] font-bold hover:underline"
              >
                <Eye className="w-3.5 h-3.5" />
                {showPreview ? 'إخفاء المعاينة' : 'معاينة'}
              </button>
            </div>
            {!showPreview ? (
              <textarea
                value={templateText}
                onChange={e => setTemplateText(e.target.value)}
                rows={10}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#1a9e5c]/30 focus:border-[#1a9e5c] resize-none"
                placeholder="اكتب نص القالب هنا..."
                dir="rtl"
              />
            ) : (
              <div
                className="w-full border border-green-200 rounded-xl px-4 py-3 text-sm bg-green-50 whitespace-pre-wrap"
                style={{ minHeight: '240px', fontFamily: 'system-ui' }}
                dir="rtl"
              >
                {preview}
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-bold text-[#1a2f3e] mb-1.5">وصف القالب (اختياري)</label>
            <input
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a9e5c]/30 focus:border-[#1a9e5c]"
              placeholder="وصف مختصر لاستخدام القالب"
            />
          </div>

          {/* Active toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <div>
              <p className="text-sm font-bold text-[#1a2f3e]">تفعيل القالب</p>
              <p className="text-xs text-[#7a9aab]">يظهر للمستخدمين عند الضغط على واتساب</p>
            </div>
            <button
              onClick={() => setIsActive(!isActive)}
              className={`w-12 h-6 rounded-full transition-colors relative ${isActive ? 'bg-[#1a9e5c]' : 'bg-gray-300'}`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${isActive ? 'right-1' : 'left-1'}`} />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving || !name.trim() || !templateText.trim()}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-[#0f2535] text-white font-bold text-sm hover:bg-[#1a3a4f] disabled:opacity-50 transition-colors"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? 'جاري الحفظ...' : 'حفظ القالب'}
          </button>
          <button
            onClick={onClose}
            className="px-6 py-3 rounded-xl border border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50 transition-colors"
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}
