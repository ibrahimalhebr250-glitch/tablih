import EnhancedGeneralSettings from '../settings/EnhancedGeneralSettings';

export default function SettingsSection() {
  return (
    <div className="p-5 space-y-5" dir="rtl">
      <div>
        <h2 className="text-xl font-bold text-[#1a2f3e] mb-1">الإعدادات</h2>
        <p className="text-sm text-[#7a9aab]">إدارة سلوك المنصة ديناميكياً — تؤثر التغييرات فوراً على تجربة المستخدم</p>
      </div>

      <EnhancedGeneralSettings />
    </div>
  );
}
