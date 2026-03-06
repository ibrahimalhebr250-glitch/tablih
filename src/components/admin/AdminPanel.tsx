import { useState, useMemo } from 'react';
import AdminSidebar from './AdminSidebar';
import DashboardSection from './sections/DashboardSection';
import InventorySection from './sections/InventorySection';
import MarketSection from './sections/MarketSection';
import DealsSection from './sections/DealsSection';
import FinanceSection from './sections/FinanceSection';
import UsersSection from './sections/UsersSection';
import RatingsSection from './sections/RatingsSection';
import { CommentsModeration } from './sections/CommentsModeration';
import SettingsSection from './sections/SettingsSection';
import type { AdminSection } from '../../types/admin';
import type { AdminStaffData } from './AdminLoginSheet';

interface Props {
  adminStaff: AdminStaffData;
  onClose: () => void;
}

export default function AdminPanel({ adminStaff, onClose }: Props) {
  const availableSections = useMemo(() => {
    const sections: AdminSection[] = [];
    const perms = adminStaff.permissions;

    if (perms.dashboard?.can_view) sections.push('dashboard');
    if (perms.market?.can_view) sections.push('inventory');
    if (perms.market?.can_view) sections.push('market');
    if (perms.deals?.can_view) sections.push('deals');
    if (perms.finance?.can_view) sections.push('finance');
    if (perms.users?.can_view) sections.push('users');
    if (perms.ratings?.can_view) sections.push('ratings');
    if (perms.comments?.can_view) sections.push('comments');
    if (perms.settings?.can_view) sections.push('settings');

    return sections;
  }, [adminStaff.permissions]);

  const defaultSection = availableSections.length > 0 ? availableSections[0] : 'dashboard';
  const [section, setSection] = useState<AdminSection>(defaultSection);

  const canViewSection = (sectionName: AdminSection) => {
    return availableSections.includes(sectionName);
  };

  const handleSectionChange = (newSection: AdminSection) => {
    if (canViewSection(newSection)) {
      setSection(newSection);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col lg:flex-row" style={{ background: '#f4f9fc' }}>

      <div className="flex-shrink-0 lg:h-full lg:w-56 xl:w-64 overflow-hidden">
        <AdminSidebar
          active={section}
          onChange={handleSectionChange}
          onClose={onClose}
          adminStaff={adminStaff}
          availableSections={availableSections}
        />
      </div>

      <div
        className="flex-1 min-w-0 h-full overflow-y-auto"
        style={{ scrollbarWidth: 'thin', scrollbarColor: '#c5d8e4 transparent' }}
      >
        {section === 'dashboard' && canViewSection('dashboard') && <DashboardSection onNavigate={handleSectionChange} />}
        {section === 'inventory' && canViewSection('inventory') && <InventorySection adminEmail={adminStaff.email} />}
        {section === 'market' && canViewSection('market') && <MarketSection />}
        {section === 'deals' && canViewSection('deals') && <DealsSection />}
        {section === 'finance' && canViewSection('finance') && <FinanceSection />}
        {section === 'users' && canViewSection('users') && <UsersSection />}
        {section === 'ratings' && canViewSection('ratings') && (
          <div className="p-6 max-w-7xl mx-auto">
            <RatingsSection />
          </div>
        )}
        {section === 'comments' && canViewSection('comments') && (
          <div className="p-6 max-w-7xl mx-auto">
            <CommentsModeration />
          </div>
        )}
        {section === 'settings' && canViewSection('settings') && <SettingsSection />}
      </div>
    </div>
  );
}
