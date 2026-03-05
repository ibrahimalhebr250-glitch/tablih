import { Search } from 'lucide-react';

interface FilterOption {
  value: string;
  label: string;
}

interface Props {
  search: string;
  onSearch: (v: string) => void;
  searchPlaceholder?: string;
  filters?: { label: string; value: string; options: FilterOption[]; onChange: (v: string) => void }[];
  total: number;
  page: number;
  pageSize: number;
  onPage: (p: number) => void;
}

export default function TableControls({ search, onSearch, searchPlaceholder, filters, total, page, pageSize, onPage }: Props) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
      <div className="relative flex-1 min-w-0">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7a9aab]" />
        <input
          type="text"
          value={search}
          onChange={e => onSearch(e.target.value)}
          placeholder={searchPlaceholder ?? 'بحث...'}
          className="w-full pr-9 pl-3 py-2 text-[13px] bg-white border border-[#e2edf5] rounded-xl text-[#1a2f3e] placeholder-[#7a9aab] focus:outline-none focus:border-[#2563eb] transition-colors"
        />
      </div>

      {filters?.map(f => (
        <select
          key={f.label}
          value={f.value}
          onChange={e => f.onChange(e.target.value)}
          className="px-3 py-2 text-[13px] bg-white border border-[#e2edf5] rounded-xl text-[#1a2f3e] focus:outline-none focus:border-[#2563eb] transition-colors min-w-[120px]"
        >
          <option value="">{f.label}: الكل</option>
          {f.options.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      ))}

      {total > pageSize && (
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => onPage(Math.max(0, page - 1))}
            disabled={page === 0}
            className="px-2.5 py-1.5 text-[12px] font-bold text-[#4a7a94] bg-[#f0f6fa] rounded-lg disabled:opacity-40 hover:bg-[#e2edf5] transition-colors"
          >
            &gt;
          </button>
          <span className="text-[11px] text-[#7a9aab] px-1">{page + 1} / {totalPages}</span>
          <button
            onClick={() => onPage(Math.min(totalPages - 1, page + 1))}
            disabled={page >= totalPages - 1}
            className="px-2.5 py-1.5 text-[12px] font-bold text-[#4a7a94] bg-[#f0f6fa] rounded-lg disabled:opacity-40 hover:bg-[#e2edf5] transition-colors"
          >
            &lt;
          </button>
        </div>
      )}
    </div>
  );
}
