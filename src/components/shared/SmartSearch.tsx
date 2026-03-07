import { useState, useEffect, useRef } from 'react';
import { Search, X, Filter, TrendingUp } from 'lucide-react';

interface SmartSearchProps {
  placeholder?: string;
  onSearch: (query: string) => void;
  suggestions?: string[];
  popularSearches?: string[];
  accentColor?: string;
}

export default function SmartSearch({
  placeholder = 'Search...',
  onSearch,
  suggestions = [],
  popularSearches = [],
  accentColor = '#1a4a5e',
}: SmartSearchProps) {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredSuggestions = suggestions.filter(s =>
    s.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 5);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
        setIsFocused(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const debounce = setTimeout(() => {
      onSearch(query);
    }, 300);

    return () => clearTimeout(debounce);
  }, [query, onSearch]);

  const handleClear = () => {
    setQuery('');
    onSearch('');
    inputRef.current?.focus();
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    onSearch(suggestion);
    setShowSuggestions(false);
    setIsFocused(false);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div
        className={`relative flex items-center gap-2 bg-white rounded-2xl transition-all duration-300 ${
          isFocused ? 'shadow-lg' : 'shadow-sm'
        }`}
        style={{
          border: isFocused ? `2px solid ${accentColor}` : '2px solid transparent',
        }}
      >
        <Search
          className="absolute left-4 w-4 h-4 transition-colors duration-300"
          style={{ color: isFocused ? accentColor : '#9CA3AF' }}
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            setIsFocused(true);
            setShowSuggestions(true);
          }}
          placeholder={placeholder}
          className="w-full pl-11 pr-4 py-3 text-sm bg-transparent outline-none placeholder:text-gray-400"
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-4 p-1 rounded-full hover:bg-gray-100 transition-all active:scale-95"
          >
            <X className="w-3.5 h-3.5 text-gray-400" />
          </button>
        )}
      </div>

      {showSuggestions && (isFocused || query) && (
        <div className="absolute top-full mt-2 w-full bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          {query && filteredSuggestions.length > 0 && (
            <div className="p-2">
              <div className="px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Suggestions
              </div>
              {filteredSuggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-all text-left group"
                >
                  <Search className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600" />
                  <span className="text-sm text-gray-700 group-hover:text-gray-900">
                    {suggestion}
                  </span>
                </button>
              ))}
            </div>
          )}

          {!query && popularSearches.length > 0 && (
            <div className="p-2">
              <div className="px-3 py-2 flex items-center gap-2">
                <TrendingUp className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Popular Searches
                </span>
              </div>
              {popularSearches.slice(0, 5).map((search, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSuggestionClick(search)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-all text-left group"
                >
                  <div
                    className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold"
                    style={{ background: `${accentColor}15`, color: accentColor }}
                  >
                    {idx + 1}
                  </div>
                  <span className="text-sm text-gray-700 group-hover:text-gray-900">
                    {search}
                  </span>
                </button>
              ))}
            </div>
          )}

          {query && filteredSuggestions.length === 0 && (
            <div className="p-6 text-center">
              <div className="w-12 h-12 mx-auto rounded-full bg-gray-100 flex items-center justify-center mb-3">
                <Search className="w-5 h-5 text-gray-400" />
              </div>
              <p className="text-sm text-gray-500">No suggestions found</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
