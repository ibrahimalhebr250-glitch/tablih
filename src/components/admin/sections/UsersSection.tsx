import { useState } from 'react';
import { Users, BarChart3, UserCog, Shield } from 'lucide-react';
import type { UsersTab } from '../../../types/admin';
import UsersList from '../users/UsersList';
import UserAnalytics from '../users/UserAnalytics';
import StaffManagement from '../users/StaffManagement';
import RolesPermissions from '../users/RolesPermissions';

const tabs: { id: UsersTab; label: string; icon: typeof Users }[] = [
  { id: 'users', label: 'المستخدمون', icon: Users },
  { id: 'analytics', label: 'تحليل المستخدمين', icon: BarChart3 },
  { id: 'staff', label: 'الموظفون', icon: UserCog },
  { id: 'roles', label: 'الصلاحيات', icon: Shield },
];

export default function UsersSection() {
  const [activeTab, setActiveTab] = useState<UsersTab>('users');

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <div>
        <h2 className="text-xl font-bold text-[#1a2f3e] mb-1">إدارة المستخدمين</h2>
        <p className="text-sm text-[#7a9aab]">التحكم بحسابات المستخدمين وتحليل النشاط وإدارة الموظفين</p>
      </div>

      <div className="flex items-center gap-1 bg-[#f0f6fa] rounded-xl p-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-[12px] font-bold whitespace-nowrap transition-all flex-shrink-0 ${
              activeTab === id
                ? 'bg-white text-[#1a4a5e] shadow-sm'
                : 'text-[#7a9aab] hover:text-[#4a7a94]'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'users' && <UsersList />}
      {activeTab === 'analytics' && <UserAnalytics />}
      {activeTab === 'staff' && <StaffManagement />}
      {activeTab === 'roles' && <RolesPermissions />}
    </div>
  );
}
