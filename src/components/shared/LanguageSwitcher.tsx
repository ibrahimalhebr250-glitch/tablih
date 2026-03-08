import { useState, useEffect } from 'react';
import { Globe } from 'lucide-react';
import { i18n, type Language } from '../../lib/i18n';

interface LanguageSwitcherProps {
  variant?: 'default' | 'compact' | 'icon-only';
  className?: string;
}

export default function LanguageSwitcher({ variant = 'default', className = '' }: LanguageSwitcherProps) {
  const [currentLang, setCurrentLang] = useState<Language>(i18n.getLanguage());
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = i18n.subscribe((lang) => {
      setCurrentLang(lang);
    });

    return unsubscribe;
  }, []);

  const handleLanguageChange = (lang: Language) => {
    i18n.setLanguage(lang);
    setIsOpen(false);
  };

  const languages = [
    { code: 'ar' as Language, name: 'العربية', flag: '🇸🇦' },
    { code: 'en' as Language, name: 'English', flag: '🇬🇧' },
  ];

  const currentLanguage = languages.find(l => l.code === currentLang);

  if (variant === 'icon-only') {
    return (
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`p-2 rounded-lg bg-white/80 backdrop-blur-sm border border-gray-200 hover:bg-white transition-all ${className}`}
          aria-label="Change language"
        >
          <Globe className="w-5 h-5 text-gray-600" />
        </button>

        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            <div className="absolute top-full mt-2 right-0 z-50 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden min-w-[160px]">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => handleLanguageChange(lang.code)}
                  className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors ${
                    currentLang === lang.code ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                  }`}
                >
                  <span className="text-xl">{lang.flag}</span>
                  <span className="text-sm font-medium">{lang.name}</span>
                  {currentLang === lang.code && (
                    <span className="mr-auto text-blue-600">✓</span>
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`px-3 py-2 rounded-lg bg-white/80 backdrop-blur-sm border border-gray-200 hover:bg-white transition-all flex items-center gap-2 ${className}`}
        >
          <span className="text-lg">{currentLanguage?.flag}</span>
          <span className="text-sm font-medium text-gray-700">{currentLanguage?.code.toUpperCase()}</span>
        </button>

        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            <div className="absolute top-full mt-2 right-0 z-50 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden min-w-[160px]">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => handleLanguageChange(lang.code)}
                  className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors ${
                    currentLang === lang.code ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                  }`}
                >
                  <span className="text-xl">{lang.flag}</span>
                  <span className="text-sm font-medium">{lang.name}</span>
                  {currentLang === lang.code && (
                    <span className="mr-auto text-blue-600">✓</span>
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-white/90 to-white/80 backdrop-blur-sm border border-gray-200/80 hover:border-gray-300 transition-all flex items-center gap-3 shadow-sm hover:shadow-md"
      >
        <div className="flex items-center gap-3 flex-1">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-sm">
            <Globe className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 text-right">
            <div className="text-sm text-gray-500">اللغة / Language</div>
            <div className="text-base font-semibold text-gray-800 flex items-center gap-2">
              <span className="text-xl">{currentLanguage?.flag}</span>
              {currentLanguage?.name}
            </div>
          </div>
        </div>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full mt-2 left-0 right-0 z-50 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleLanguageChange(lang.code)}
                className={`w-full px-4 py-4 flex items-center gap-3 hover:bg-gray-50 transition-colors ${
                  currentLang === lang.code ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                }`}
              >
                <span className="text-2xl">{lang.flag}</span>
                <div className="flex-1 text-right">
                  <div className="text-base font-medium">{lang.name}</div>
                  <div className="text-xs text-gray-500">{lang.code.toUpperCase()}</div>
                </div>
                {currentLang === lang.code && (
                  <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
