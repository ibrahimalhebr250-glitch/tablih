import { useState, useCallback } from 'react';
import { LayoutDashboard, Receipt, BarChart3 } from 'lucide-react';
import type { FinanceTab } from '../../../types/admin';
import EnhancedFinancialOverview from '../finance/EnhancedFinancialOverview';
import EnhancedCommissionCollection from '../finance/EnhancedCommissionCollection';
import SupplierFinancialProfile from '../finance/SupplierFinancialProfile';
import EnhancedMarketStatistics from '../finance/EnhancedMarketStatistics';

const navItems: { id: FinanceTab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'نظرة عامة', icon: LayoutDashboard },
  { id: 'commissions', label: 'تحصيل العمولات', icon: Receipt },
  { id: 'market_stats', label: 'إحصائيات السوق', icon: BarChart3 },
];

export default function FinanceSection() {
  const [activeTab, setActiveTab] = useState<FinanceTab>('dashboard');
  const [selectedSupplier, setSelectedSupplier] = useState<string | null>(null);

  const handleViewSupplier = useCallback((phone: string) => {
    setSelectedSupplier(phone);
    setActiveTab('supplier_profile');
  }, []);

  const handleBackFromProfile = useCallback(() => {
    setSelectedSupplier(null);
    setActiveTab('commissions');
  }, []);

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div>
        <h2 className="text-xl font-bold text-[#1a2f3e] mb-1">المالية</h2>
        <p className="text-sm text-[#7a9aab]">تتبع العمولات وتسويات الموردين وإحصائيات السوق</p>
      </div>

      {activeTab !== 'supplier_profile' && (
        <div className="flex gap-1.5 border-b border-[#e2edf5] overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-[12px] font-semibold rounded-t-xl transition-all border-b-2 whitespace-nowrap ${
                activeTab === id
                  ? 'text-[#1a4a5e] border-[#1a4a5e] bg-white'
                  : 'text-[#7a9aab] border-transparent hover:text-[#1a4a5e]'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      )}

      {activeTab === 'dashboard' && <EnhancedFinancialOverview />}

      {activeTab === 'commissions' && <EnhancedCommissionCollection onViewSupplier={handleViewSupplier} />}

      {activeTab === 'supplier_profile' && selectedSupplier && (
        <SupplierFinancialProfile phone={selectedSupplier} onBack={handleBackFromProfile} />
      )}

      {activeTab === 'market_stats' && (
        <EnhancedMarketStatistics onViewSupplier={handleViewSupplier} />
      )}
    </div>
  );
}
