import React, { useState } from 'react';
import { Globe, Check, Languages, BookOpen, MessageSquare } from 'lucide-react';
import { i18n } from '../../../lib/i18n';

export default function LanguageSettings() {
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language);
  const [showSuccess, setShowSuccess] = useState(false);

  const languages = [
    {
      code: 'ar',
      name: 'العربية',
      nativeName: 'العربية',
      flag: '🇸🇦',
      direction: 'rtl',
      status: 'active',
      coverage: 100
    },
    {
      code: 'en',
      name: 'English',
      nativeName: 'English',
      flag: '🇬🇧',
      direction: 'ltr',
      status: 'active',
      coverage: 100
    },
    {
      code: 'fr',
      name: 'French',
      nativeName: 'Français',
      flag: '🇫🇷',
      direction: 'ltr',
      status: 'coming_soon',
      coverage: 0
    },
    {
      code: 'de',
      name: 'German',
      nativeName: 'Deutsch',
      flag: '🇩🇪',
      direction: 'ltr',
      status: 'coming_soon',
      coverage: 0
    }
  ];

  const handleLanguageChange = (langCode: string) => {
    i18n.setLanguage(langCode);
    setCurrentLanguage(langCode);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);

    document.documentElement.dir = languages.find(l => l.code === langCode)?.direction || 'rtl';
  };

  const stats = {
    totalLanguages: languages.filter(l => l.status === 'active').length,
    totalStrings: 1250,
    translatedStrings: languages.filter(l => l.status === 'active').length * 1250,
    coverageRate: 100
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-blue-600 rounded-xl">
            <Globe className="w-8 h-8 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900 mb-2">إعدادات اللغات المتعددة</h3>
            <p className="text-gray-600">
              المنصة تدعم حالياً لغتين كاملتين مع إمكانية إضافة المزيد من اللغات في المستقبل
            </p>
          </div>
        </div>
      </div>

      {showSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
          <Check className="w-6 h-6 text-green-600" />
          <div>
            <div className="font-medium text-green-900">تم تغيير اللغة بنجاح</div>
            <div className="text-sm text-green-700">جميع النصوص تم تحديثها</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <Languages className="w-8 h-8 text-blue-600" />
            <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">
              فعّالة
            </span>
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-2">
            {stats.totalLanguages}
          </div>
          <div className="text-sm text-gray-600">لغة متاحة</div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <BookOpen className="w-8 h-8 text-green-600" />
            <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">
              النصوص
            </span>
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-2">
            {stats.totalStrings.toLocaleString()}
          </div>
          <div className="text-sm text-gray-600">نص قابل للترجمة</div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <MessageSquare className="w-8 h-8 text-purple-600" />
            <span className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-bold rounded-full">
              مترجمة
            </span>
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-2">
            {stats.translatedStrings.toLocaleString()}
          </div>
          <div className="text-sm text-gray-600">ترجمة مكتملة</div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <Check className="w-8 h-8 text-orange-600" />
            <span className="px-3 py-1 bg-orange-100 text-orange-700 text-xs font-bold rounded-full">
              التغطية
            </span>
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-2">
            {stats.coverageRate}%
          </div>
          <div className="text-sm text-gray-600">نسبة الاكتمال</div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-bold text-gray-900">اللغات المتاحة</h3>
          <p className="text-sm text-gray-600 mt-1">اختر اللغة الافتراضية للمنصة</p>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {languages.map((lang) => (
              <div
                key={lang.code}
                className={`relative rounded-xl border-2 p-6 transition-all cursor-pointer ${
                  currentLanguage === lang.code
                    ? 'border-blue-600 bg-blue-50'
                    : lang.status === 'active'
                    ? 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                    : 'border-gray-200 opacity-50 cursor-not-allowed'
                }`}
                onClick={() => lang.status === 'active' && handleLanguageChange(lang.code)}
              >
                {currentLanguage === lang.code && (
                  <div className="absolute top-4 left-4 p-1 bg-blue-600 rounded-full">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                )}

                <div className="flex items-start gap-4">
                  <div className="text-5xl">{lang.flag}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="text-lg font-bold text-gray-900">
                        {lang.nativeName}
                      </h4>
                      {lang.status === 'active' ? (
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                          فعّالة
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                          قريباً
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 mb-3">{lang.name}</div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">نسبة الترجمة</span>
                        <span className="font-medium text-gray-900">{lang.coverage}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            lang.coverage === 100 ? 'bg-green-500' : 'bg-blue-500'
                          }`}
                          style={{ width: `${lang.coverage}%` }}
                        />
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                      <span className="px-2 py-1 bg-gray-100 rounded">
                        {lang.direction === 'rtl' ? 'RTL' : 'LTR'}
                      </span>
                      <span>•</span>
                      <span>{stats.totalStrings.toLocaleString()} نص</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">الميزات المتاحة</h3>
        <div className="space-y-3">
          {[
            {
              title: 'تبديل فوري',
              description: 'التبديل بين اللغات دون إعادة تحميل الصفحة',
              status: 'active'
            },
            {
              title: 'RTL/LTR تلقائي',
              description: 'تغيير اتجاه النص تلقائياً حسب اللغة المختارة',
              status: 'active'
            },
            {
              title: 'حفظ التفضيل',
              description: 'حفظ اختيار اللغة تلقائياً في المتصفح',
              status: 'active'
            },
            {
              title: 'ترجمة شاملة',
              description: 'جميع نصوص المنصة مترجمة بالكامل',
              status: 'active'
            },
            {
              title: 'دعم لغات إضافية',
              description: 'إمكانية إضافة لغات جديدة بسهولة',
              status: 'planned'
            }
          ].map((feature, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg"
            >
              <div className={`p-2 rounded-lg ${
                feature.status === 'active' ? 'bg-green-100' : 'bg-gray-200'
              }`}>
                {feature.status === 'active' ? (
                  <Check className="w-5 h-5 text-green-600" />
                ) : (
                  <Globe className="w-5 h-5 text-gray-600" />
                )}
              </div>
              <div className="flex-1">
                <div className="font-medium text-gray-900">{feature.title}</div>
                <div className="text-sm text-gray-600">{feature.description}</div>
              </div>
              <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                feature.status === 'active'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {feature.status === 'active' ? 'فعّالة' : 'قريباً'}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <Globe className="w-6 h-6 text-blue-600 mt-1" />
          <div>
            <h4 className="font-bold text-gray-900 mb-2">ملاحظة هامة</h4>
            <div className="text-sm text-gray-700 space-y-2">
              <p>• تغيير اللغة يؤثر على جميع المستخدمين في المنصة</p>
              <p>• يمكن للمستخدمين تغيير اللغة من أيقونة العالم في الأعلى</p>
              <p>• جميع الترجمات محفوظة محلياً لسرعة التحميل</p>
              <p>• يتم حفظ اختيار المستخدم تلقائياً في المتصفح</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">كيفية الاستخدام</h3>
        <div className="space-y-4">
          <div>
            <div className="font-medium text-gray-900 mb-2">1. تغيير اللغة الافتراضية</div>
            <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg font-mono" dir="ltr">
              انقر على أي لغة فعّالة لتغيير اللغة الافتراضية
            </div>
          </div>

          <div>
            <div className="font-medium text-gray-900 mb-2">2. للمستخدمين</div>
            <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
              يمكن للمستخدمين تغيير اللغة من أيقونة 🌍 في أعلى الصفحة
            </div>
          </div>

          <div>
            <div className="font-medium text-gray-900 mb-2">3. للمطورين</div>
            <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg font-mono" dir="ltr">
              import {'{'} i18n {'}'} from './lib/i18n';<br/>
              i18n.setLanguage('en'); // English<br/>
              const text = i18n.t('common.welcome');
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
