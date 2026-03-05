interface Props {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({ title, message, confirmLabel = 'تأكيد', cancelLabel = 'إلغاء', danger = false, onConfirm, onCancel }: Props) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ background: 'rgba(10,20,28,0.6)' }}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl space-y-4" dir="rtl">
        <h3 className="text-[16px] font-black text-[#1a2f3e]">{title}</h3>
        <p className="text-[13px] text-[#7a9aab]">{message}</p>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-[13px] font-bold text-[#4a7a94] bg-[#f0f6fa] rounded-xl hover:bg-[#e2edf5] transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-[13px] font-bold text-white rounded-xl transition-colors"
            style={{ background: danger ? '#dc2626' : '#2563eb' }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
