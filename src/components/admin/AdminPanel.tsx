import { useState } from 'react';
import AdminSidebar from './AdminSidebar';
import DashboardSection from './sections/DashboardSection';
import MarketSection from './sections/MarketSection';
import DealsSection from './sections/DealsSection';
import FinanceSection from './sections/FinanceSection';
import UsersSection from './sections/UsersSection';
import SettingsSection from './sections/SettingsSection';
import type { AdminSection } from '../../types/admin';

interface Props {
  onClose: () => void;
}

export default function AdminPanel({ onClose }: Props) {
  const [section, setSection] = useState<AdminSection>('dashboard');

  return (
    <div className="fixed inset-0 z-50 flex flex-col lg:flex-row" style={{ background: '#f4f9fc' }}>

      <div className="flex-shrink-0 lg:h-full lg:w-56 xl:w-64 overflow-hidden">
        <AdminSidebar active={section} onChange={setSection} onClose={onClose} />
      </div>

      <div
        className="flex-1 min-w-0 h-full overflow-y-auto"
        style={{ scrollbarWidth: 'thin', scrollbarColor: '#c5d8e4 transparent' }}
      >
        {section === 'dashboard' && <DashboardSection onNavigate={(s) => setSection(s as AdminSection)} />}
        {section === 'market'    && <MarketSection />}
        {section === 'deals'     && <DealsSection />}
        {section === 'finance'   && <FinanceSection />}
        {section === 'users'     && <UsersSection />}
        {section === 'settings'  && <SettingsSection />}
      </div>
    </div>
  );
}
