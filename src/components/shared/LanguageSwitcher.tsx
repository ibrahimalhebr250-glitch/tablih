import { useState, useEffect } from 'react';
import { i18n, type Language } from '../../lib/i18n';

interface Props {
  className?: string;
}

export default function LanguageSwitcher({ className = '' }: Props) {
  const [currentLang, setCurrentLang] = useState<Language>(i18n.getLanguage());

  useEffect(() => {
    const unsubscribe = i18n.subscribe(() => {
      setCurrentLang(i18n.getLanguage());
    });
    return unsubscribe;
  }, []);

  const toggle = () => {
    i18n.setLanguage(currentLang === 'ar' ? 'en' : 'ar');
  };

  return (
    <button
      onClick={toggle}
      className={`flex items-center gap-0 rounded-xl overflow-hidden border-2 transition-all active:scale-95 ${className}`}
      style={{
        borderColor: '#cbd5e1',
        background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
        boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
        height: '36px',
      }}
      aria-label="Switch language"
    >
      <span
        className="px-2.5 py-1 text-[11px] font-black transition-all"
        style={{
          background: currentLang === 'ar' ? 'linear-gradient(135deg, #1a4a5e, #2c6f8a)' : 'transparent',
          color: currentLang === 'ar' ? '#ffffff' : '#94a3b8',
        }}
      >
        AR
      </span>
      <span
        className="w-px self-stretch"
        style={{ background: '#cbd5e1' }}
      />
      <span
        className="px-2.5 py-1 text-[11px] font-black transition-all"
        style={{
          background: currentLang === 'en' ? 'linear-gradient(135deg, #1a4a5e, #2c6f8a)' : 'transparent',
          color: currentLang === 'en' ? '#ffffff' : '#94a3b8',
        }}
      >
        EN
      </span>
    </button>
  );
}
