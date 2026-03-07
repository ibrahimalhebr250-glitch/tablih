import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Info, AlertCircle, CheckCircle2, Clock } from 'lucide-react';

interface ExpandableCardProps {
  title: string;
  summary: React.ReactNode;
  details: React.ReactNode;
  icon?: React.ReactNode;
  color?: string;
  defaultExpanded?: boolean;
  badge?: {
    label: string;
    color: string;
  };
  status?: 'info' | 'warning' | 'success' | 'pending';
}

export default function ExpandableCard({
  title,
  summary,
  details,
  icon,
  color = '#1a4a5e',
  defaultExpanded = false,
  badge,
  status,
}: ExpandableCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [contentHeight, setContentHeight] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight);
    }
  }, [details, isExpanded]);

  const statusIcons = {
    info: Info,
    warning: AlertCircle,
    success: CheckCircle2,
    pending: Clock,
  };

  const statusColors = {
    info: '#0369A1',
    warning: '#D97706',
    success: '#059669',
    pending: '#7C3AED',
  };

  const StatusIcon = status ? statusIcons[status] : null;
  const statusColor = status ? statusColors[status] : color;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden transition-all duration-300 hover:shadow-lg">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center gap-4 transition-all hover:bg-gray-50 active:bg-gray-100"
      >
        {icon && (
          <div
            className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ background: `${color}15` }}
          >
            <div style={{ color }}>
              {icon}
            </div>
          </div>
        )}

        {StatusIcon && (
          <div
            className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ background: `${statusColor}15` }}
          >
            <StatusIcon className="w-5 h-5" style={{ color: statusColor }} />
          </div>
        )}

        <div className="flex-1 text-left">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-gray-900">{title}</h3>
            {badge && (
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: `${badge.color}20`, color: badge.color }}
              >
                {badge.label}
              </span>
            )}
          </div>
          <div className="text-sm text-gray-600">
            {summary}
          </div>
        </div>

        <div
          className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 ${
            isExpanded ? 'rotate-180 bg-gray-100' : 'rotate-0 bg-gray-50'
          }`}
        >
          <ChevronDown className="w-4 h-4 text-gray-600" />
        </div>
      </button>

      <div
        className="overflow-hidden transition-all duration-300 ease-out"
        style={{ maxHeight: isExpanded ? `${contentHeight}px` : '0px' }}
      >
        <div ref={contentRef} className="p-4 pt-0 border-t border-gray-50">
          <div
            className="p-4 rounded-xl animate-in fade-in slide-in-from-top-2 duration-300"
            style={{ background: `${color}05` }}
          >
            {details}
          </div>
        </div>
      </div>
    </div>
  );
}

export function AccordionGroup({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      {children}
    </div>
  );
}

export function InfoPanel({
  title,
  items,
  color = '#1a4a5e',
}: {
  title: string;
  items: Array<{ label: string; value: React.ReactNode; icon?: React.ReactNode }>;
  color?: string;
}) {
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-bold text-gray-700 mb-3">{title}</h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {items.map((item, idx) => (
          <div
            key={idx}
            className="flex items-start gap-3 p-3 rounded-lg bg-white border border-gray-100"
          >
            {item.icon && (
              <div
                className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: `${color}15` }}
              >
                <div style={{ color }} className="w-4 h-4">
                  {item.icon}
                </div>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-500 mb-0.5">{item.label}</p>
              <p className="text-sm font-bold text-gray-900 truncate">{item.value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function StepProgress({
  steps,
  currentStep,
  color = '#1a4a5e',
}: {
  steps: Array<{ label: string; description?: string }>;
  currentStep: number;
  color?: string;
}) {
  return (
    <div className="space-y-4">
      {steps.map((step, idx) => {
        const isCompleted = idx < currentStep;
        const isCurrent = idx === currentStep;
        const isPending = idx > currentStep;

        return (
          <div key={idx} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm transition-all ${
                  isCompleted
                    ? 'text-white shadow-lg'
                    : isCurrent
                    ? 'text-white shadow-lg animate-pulse'
                    : 'bg-gray-100 text-gray-400'
                }`}
                style={
                  isCompleted || isCurrent
                    ? { background: `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)` }
                    : {}
                }
              >
                {isCompleted ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <span>{idx + 1}</span>
                )}
              </div>
              {idx < steps.length - 1 && (
                <div
                  className={`w-0.5 h-12 ${
                    isCompleted ? 'bg-gradient-to-b' : 'bg-gray-200'
                  }`}
                  style={
                    isCompleted
                      ? { backgroundImage: `linear-gradient(to bottom, ${color}, ${color}dd)` }
                      : {}
                  }
                />
              )}
            </div>
            <div className="flex-1 pb-4">
              <h4
                className={`text-sm font-bold mb-1 ${
                  isCurrent ? 'text-gray-900' : isPending ? 'text-gray-400' : 'text-gray-700'
                }`}
              >
                {step.label}
              </h4>
              {step.description && (
                <p className="text-xs text-gray-500">{step.description}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
