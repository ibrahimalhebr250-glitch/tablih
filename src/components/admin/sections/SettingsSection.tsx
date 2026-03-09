import { useState } from 'react';
import { Settings, Clock, Globe, Image } from 'lucide-react';
import EnhancedGeneralSettings from '../settings/EnhancedGeneralSettings';
import SessionSettings from '../settings/SessionSettings';
import LanguageSettings from '../settings/LanguageSettings';
import HeroSlidesSettings from '../settings/HeroSlidesSettings';

type Tab = 'general' | 'sessions' | 'languages' | 'hero';

export default function SettingsSection() {
  const [activeTab, setActiveTab] = useState<Tab>('general');

  const tabs = [
    { id: 'general' as Tab, label: 'الإعدادات العامة', icon: Settings },
    { id: 'hero' as Tab, label: 'البانر الرئيسي', icon: Image },
    { id: 'languages' as Tab, label: 'اللغات المتعددة', icon: Globe },
    { id: 'sessions' as Tab, label: 'إدارة الجلسات', icon: Clock },
  ];

  return (
    <div className="p-5 space-y-5" dir="rtl">
      <div>
        <h2 className="text-xl font-bold text-[#1a2f3e] mb-1">الإعدادات</h2>
        <p className="text-sm text-[#7a9aab]">إدارة سلوك المنصة ديناميكياً — تؤثر التغييرات فوراً على تجربة المستخدم</p>
      </div>

      <div className="flex gap-2 border-b border-[#e2edf5] overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-[13px] font-semibold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-[#1a4a5e] text-[#1a4a5e]'
                : 'border-transparent text-[#7a9aab] hover:text-[#4a7a94]'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'general' && <EnhancedGeneralSettings />}
      {activeTab === 'hero' && <HeroSlidesSettings />}
      {activeTab === 'languages' && <LanguageSettings />}
      {activeTab === 'sessions' && <SessionSettings />}
    </div>
  );
}
