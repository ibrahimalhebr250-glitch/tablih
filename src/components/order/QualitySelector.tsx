import { Sparkles, ShieldCheck, AlertTriangle, Recycle } from 'lucide-react';
import type { DynamicQualityGrade } from '../../hooks/useDynamicOrderBuilder';

interface Props {
  qualityGrades: DynamicQualityGrade[];
  selected: string | null;
  onSelect: (code: string) => void;
}

const GRADE_ICONS: Record<string, React.ReactNode> = {
  'A': <Sparkles className="w-4 h-4" />,
  'B': <ShieldCheck className="w-4 h-4" />,
  'C': <AlertTriangle className="w-4 h-4" />,
  'Scrap': <Recycle className="w-4 h-4" />,
};

export default function QualitySelector({ qualityGrades, selected, onSelect }: Props) {
  if (qualityGrades.length === 0) {
    return (
      <div className="text-center py-4 text-gray-500 text-sm">
        لا توجد درجات جودة متاحة
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-[13px] font-bold text-[#1a4a5e] mb-3 uppercase tracking-wide">
        الجودة
      </h3>
      <div className="grid grid-cols-2 gap-2.5">
        {qualityGrades.map((grade) => {
          const isSelected = selected === grade.code;
          const colorHex = grade.color_hex || '#2196F3';
          const bgColor = grade.bg_color || '#EBF5FF';
          const borderColor = grade.border_color || grade.color_hex || '#2196F3';
          const badgeColor = grade.badge_color || grade.color_hex || '#2196F3';
          const icon = GRADE_ICONS[grade.code];

          return (
            <button
              key={grade.id}
              onClick={() => onSelect(grade.code)}
              className="relative flex flex-col items-start p-3.5 rounded-2xl border-2 transition-all duration-200 text-right active:scale-[0.98]"
              style={{
                borderColor: isSelected ? borderColor : '#E5E7EB',
                backgroundColor: isSelected ? bgColor : '#FFFFFF',
              }}
            >
              {isSelected && (
                <span
                  className="absolute top-2 left-2 w-4 h-4 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: colorHex }}
                >
                  <svg viewBox="0 0 10 10" className="w-2.5 h-2.5" fill="none">
                    <path d="M2 5.5L4 7.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </span>
              )}

              <div className="flex items-center gap-1.5 mb-1.5">
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold text-white"
                  style={{ backgroundColor: isSelected ? badgeColor : '#9CA3AF' }}
                >
                  {icon}
                  {grade.code}
                </span>
              </div>

              <span
                className="text-[13px] font-bold leading-tight"
                style={{ color: isSelected ? colorHex : '#1a4a5e' }}
              >
                {grade.name_ar}
              </span>

              {grade.description_ar && (
                <span className="text-[11px] text-[#a0b5c0] mt-0.5 text-right leading-tight line-clamp-2">
                  {grade.description_ar}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
