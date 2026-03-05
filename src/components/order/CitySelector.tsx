import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, MapPin, Search } from 'lucide-react';
import { SAUDI_CITIES } from '../../types/order';

interface Props {
  selected: string;
  onSelect: (city: string) => void;
}

export default function CitySelector({ selected, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = SAUDI_CITIES.filter((c) => c.includes(search));

  useEffect(() => {
    if (open && inputRef.current) {
      const timer = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, [open]);

  return (
    <div>
      <h3 className="text-[13px] font-bold text-[#1a4a5e] mb-3 uppercase tracking-wide">
        المدينة
      </h3>

      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-between px-4 py-3.5 bg-white rounded-2xl border-2 border-gray-100 shadow-sm"
      >
        <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
        <div className="flex items-center gap-2">
          {selected ? (
            <>
              <span className="text-[14px] font-bold text-[#1a4a5e]">{selected}</span>
              <MapPin className="w-4 h-4 text-[#2196F3]" />
            </>
          ) : (
            <span className="text-[13px] text-[#a0b5c0]">اختر المدينة</span>
          )}
        </div>
      </button>

      {open && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex flex-col justify-end"
          style={{
            background: 'rgba(0,0,0,0.45)',
            overflow: 'hidden',
            touchAction: 'none',
          }}
          onClick={() => { setOpen(false); setSearch(''); }}
        >
          <div
            className="bg-white rounded-t-3xl flex flex-col overflow-hidden"
            style={{ maxHeight: '70dvh' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-center pt-3 pb-2 flex-shrink-0">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>

            <div className="px-4 pb-3 flex-shrink-0">
              <h4 className="text-[15px] font-bold text-[#1a4a5e] text-center mb-3">اختر المدينة</h4>
              <div className="relative">
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="ابحث..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pr-4 pl-9 py-2.5 rounded-xl border border-gray-200 text-[13px] text-right outline-none bg-gray-50"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              </div>
            </div>

            <div
              className="overflow-y-auto overflow-x-hidden px-4 pb-6"
              style={{ touchAction: 'pan-y', overscrollBehavior: 'contain' }}
            >
              {filtered.map((city) => (
                <button
                  key={city}
                  onClick={() => {
                    onSelect(city);
                    setOpen(false);
                    setSearch('');
                  }}
                  className={`w-full flex items-center justify-between py-3.5 border-b border-gray-50 text-right ${
                    selected === city ? 'text-[#2196F3]' : 'text-[#1a4a5e]'
                  }`}
                >
                  <span className="text-[13px] font-bold">{city}</span>
                  {selected === city && (
                    <div className="w-5 h-5 bg-[#2196F3] rounded-full flex items-center justify-center">
                      <svg viewBox="0 0 10 10" className="w-3 h-3" fill="none">
                        <path d="M2 5.5L4 7.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
