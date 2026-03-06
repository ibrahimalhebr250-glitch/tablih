import { useState } from 'react';
import { Package, Settings, Layers, Award, Clipboard, Activity } from 'lucide-react';
import type { InventoryTab } from '../../../types/admin';

interface Props {
  adminEmail: string;
}

export default function InventorySection({ adminEmail }: Props) {
  const [activeTab, setActiveTab] = useState<InventoryTab>('published');

  const tabs: { id: InventoryTab; label: string; icon: typeof Package; badge?: number }[] = [
    { id: 'published', label: 'المخزونات المنشورة', icon: Package },
    { id: 'drafts', label: 'غير المكتملة', icon: Clipboard },
    { id: 'settings', label: 'إعدادات عامة', icon: Settings },
    { id: 'types', label: 'أنواع الطبليات', icon: Package },
    { id: 'sizes', label: 'المقاسات', icon: Layers },
    { id: 'quality', label: 'درجات الجودة', icon: Award },
    { id: 'conditions', label: 'حالة الطبلية', icon: Clipboard },
    { id: 'operations', label: 'سجل العمليات', icon: Activity },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-slate-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">إدارة المخزون</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              التحكم الكامل في نظام إضافة المخزون
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex-shrink-0 border-b border-slate-200 bg-white px-6">
        <div className="flex gap-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {tabs.map(({ id, label, icon: Icon, badge }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`
                  flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap
                  border-b-2 transition-colors relative
                  ${isActive
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
                {badge !== undefined && badge > 0 && (
                  <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto bg-slate-50">
        <div className="p-6">
          {activeTab === 'published' && (
            <div className="bg-white rounded-lg border border-slate-200 p-8 text-center">
              <Package className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">المخزونات المنشورة</h3>
              <p className="text-slate-600">
                عرض وإدارة جميع المخزونات النشطة في السوق
              </p>
            </div>
          )}
          {activeTab === 'drafts' && (
            <div className="bg-white rounded-lg border border-slate-200 p-8 text-center">
              <Clipboard className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">المخزونات غير المكتملة</h3>
              <p className="text-slate-600">
                عرض المخزونات التي بدأ الموردون إضافتها ولم يكملوها
              </p>
            </div>
          )}
          {activeTab === 'settings' && (
            <div className="bg-white rounded-lg border border-slate-200 p-8 text-center">
              <Settings className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">الإعدادات العامة</h3>
              <p className="text-slate-600">
                التحكم في حدود الكميات، الأسعار، الصور، والوصف
              </p>
            </div>
          )}
          {activeTab === 'types' && (
            <div className="bg-white rounded-lg border border-slate-200 p-8 text-center">
              <Package className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">أنواع الطبليات</h3>
              <p className="text-slate-600">
                إضافة وتعديل أنواع الطبليات (خشبية، بلاستيكية، معدنية)
              </p>
            </div>
          )}
          {activeTab === 'sizes' && (
            <div className="bg-white rounded-lg border border-slate-200 p-8 text-center">
              <Layers className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">المقاسات</h3>
              <p className="text-slate-600">
                إضافة وتعديل مقاسات الطبليات مع الأبعاد والوزن
              </p>
            </div>
          )}
          {activeTab === 'quality' && (
            <div className="bg-white rounded-lg border border-slate-200 p-8 text-center">
              <Award className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">درجات الجودة</h3>
              <p className="text-slate-600">
                إضافة وتعديل درجات الجودة (A، B، C، Scrap)
              </p>
            </div>
          )}
          {activeTab === 'conditions' && (
            <div className="bg-white rounded-lg border border-slate-200 p-8 text-center">
              <Clipboard className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">حالة الطبلية</h3>
              <p className="text-slate-600">
                إضافة وتعديل حالات الطبلية (جديدة، مستعملة، قابلة للإصلاح)
              </p>
            </div>
          )}
          {activeTab === 'operations' && (
            <div className="bg-white rounded-lg border border-slate-200 p-8 text-center">
              <Activity className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">سجل العمليات</h3>
              <p className="text-slate-600">
                عرض سجل كامل لجميع العمليات على المخزون
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
