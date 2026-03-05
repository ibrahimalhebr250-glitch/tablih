import { Delete } from 'lucide-react';

interface Props {
  pin: string[];
  onDigit: (digit: string) => void;
  onDelete: () => void;
  color?: 'amber' | 'green' | 'blue';
  label?: string;
  sublabel?: string;
  error?: string;
  loading?: boolean;
  loadingText?: string;
}

const colorMap = {
  amber: {
    dot: 'bg-[#F59E0B]',
    dotEmpty: 'bg-gray-200',
    btnActive: 'bg-[#FFF8E1]',
    spinner: 'border-[#F59E0B]',
  },
  green: {
    dot: 'bg-[#27AE60]',
    dotEmpty: 'bg-gray-200',
    btnActive: 'bg-[#E8F8F0]',
    spinner: 'border-[#27AE60]',
  },
  blue: {
    dot: 'bg-[#2196F3]',
    dotEmpty: 'bg-gray-200',
    btnActive: 'bg-[#EBF5FF]',
    spinner: 'border-[#2196F3]',
  },
};

const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];

export default function PinPad({
  pin,
  onDigit,
  onDelete,
  color = 'amber',
  label,
  sublabel,
  error,
  loading,
  loadingText,
}: Props) {
  const c = colorMap[color];
  const filled = pin.filter((d) => d !== '').length;

  return (
    <div className="flex flex-col items-center w-full select-none">
      {label && (
        <h3 className="text-[15px] font-bold text-[#1a4a5e] text-center mb-0.5">{label}</h3>
      )}
      {sublabel && (
        <p className="text-[11px] text-[#7a9aab] text-center mb-4">{sublabel}</p>
      )}

      <div className="flex justify-center gap-3.5 mb-4">
        {pin.map((d, i) => (
          <div
            key={i}
            className={`w-3.5 h-3.5 rounded-full transition-colors duration-200 ${
              i < filled ? c.dot : c.dotEmpty
            }`}
          />
        ))}
      </div>

      <div className="h-8 flex items-center justify-center mb-3 w-full">
        {error ? (
          <div className="bg-red-50 border border-red-100 rounded-lg px-4 py-1.5 w-full">
            <p className="text-[11px] text-red-500 text-center">{error}</p>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center gap-2">
            <div className={`w-4 h-4 border-2 border-t-transparent rounded-full animate-spin ${c.spinner}`} />
            <span className="text-[11px] text-[#7a9aab]">{loadingText || 'جاري التحقق...'}</span>
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-3 gap-2 w-full max-w-[240px]" style={{ touchAction: 'manipulation' }}>
        {keys.map((key, idx) => {
          if (key === '') {
            return <div key={idx} />;
          }
          if (key === 'del') {
            return (
              <button
                key={idx}
                type="button"
                onPointerDown={(e) => { e.preventDefault(); onDelete(); }}
                className={`h-[50px] rounded-xl bg-gray-100 flex items-center justify-center ${loading ? 'opacity-40 pointer-events-none' : ''}`}
                style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
                disabled={loading}
              >
                <Delete className="w-5 h-5 text-[#5a7a8a]" />
              </button>
            );
          }
          return (
            <button
              key={idx}
              type="button"
              onPointerDown={(e) => { e.preventDefault(); onDigit(key); }}
              className={`h-[50px] rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center text-[20px] font-bold text-[#1a4a5e] active:${c.btnActive} ${loading ? 'opacity-40 pointer-events-none' : ''}`}
              style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
              disabled={loading}
            >
              {key}
            </button>
          );
        })}
      </div>
    </div>
  );
}
