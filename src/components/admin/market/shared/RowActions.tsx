import { Eye, Pencil, Snowflake, Play, Trash2 } from 'lucide-react';

interface Action {
  type: 'view' | 'edit' | 'freeze' | 'activate' | 'delete';
  onClick: () => void;
  disabled?: boolean;
}

interface Props {
  actions: Action[];
}

const CONFIG = {
  view: { icon: Eye, color: '#2563eb', bg: '#eff6ff', hover: '#dbeafe', label: 'عرض' },
  edit: { icon: Pencil, color: '#ca8a04', bg: '#fefce8', hover: '#fde68a', label: 'تعديل' },
  freeze: { icon: Snowflake, color: '#64748b', bg: '#f1f5f9', hover: '#e2e8f0', label: 'تجميد' },
  activate: { icon: Play, color: '#16a34a', bg: '#f0fdf4', hover: '#dcfce7', label: 'تفعيل' },
  delete: { icon: Trash2, color: '#dc2626', bg: '#fef2f2', hover: '#fee2e2', label: 'حذف' },
};

export default function RowActions({ actions }: Props) {
  return (
    <div className="flex items-center gap-1">
      {actions.map(({ type, onClick, disabled }) => {
        const { icon: Icon, color, bg, label } = CONFIG[type];
        return (
          <button
            key={type}
            onClick={onClick}
            disabled={disabled}
            title={label}
            className="p-1.5 rounded-lg transition-colors disabled:opacity-40"
            style={{ background: bg, color }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(0.95)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.filter = ''; }}
          >
            <Icon className="w-3.5 h-3.5" />
          </button>
        );
      })}
    </div>
  );
}
