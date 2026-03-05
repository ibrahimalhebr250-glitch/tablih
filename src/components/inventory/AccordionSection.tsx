import { ChevronDown } from 'lucide-react';
import type { ReactNode } from 'react';

interface Props {
  label: string;
  summary?: string;
  isOpen: boolean;
  isComplete: boolean;
  onToggle: () => void;
  children: ReactNode;
  stepNumber: number;
}

export default function AccordionSection({
  label,
  summary,
  isOpen,
  isComplete,
  onToggle,
  children,
  stepNumber,
}: Props) {
  return (
    <div
      className={`rounded-2xl overflow-hidden transition-all duration-300 ${
        isOpen
          ? 'bg-white shadow-md border border-blue-100'
          : isComplete
          ? 'bg-white shadow-sm border border-gray-100'
          : 'bg-white/60 shadow-sm border border-gray-100'
      }`}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3.5"
      >
        <div className="flex items-center gap-2.5">
          <ChevronDown
            className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
          {isComplete && !isOpen && summary && (
            <span className="text-[12px] text-[#2196F3] font-semibold bg-[#EBF5FF] px-2.5 py-0.5 rounded-full">
              {summary}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2.5">
          <span className={`text-[14px] font-bold ${isOpen ? 'text-[#1a4a5e]' : isComplete ? 'text-[#1a4a5e]' : 'text-[#a0b5c0]'}`}>
            {label}
          </span>
          <div
            className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 transition-colors ${
              isComplete
                ? 'bg-[#27AE60] text-white'
                : isOpen
                ? 'bg-[#2196F3] text-white'
                : 'bg-gray-100 text-[#a0b5c0]'
            }`}
          >
            {isComplete ? (
              <svg viewBox="0 0 10 10" className="w-3 h-3" fill="none">
                <path d="M2 5.5L4 7.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            ) : (
              stepNumber
            )}
          </div>
        </div>
      </button>

      <div
        className={`transition-all duration-300 overflow-hidden ${
          isOpen ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-4 pb-4">{children}</div>
      </div>
    </div>
  );
}
