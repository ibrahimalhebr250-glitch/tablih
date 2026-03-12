import { useState } from 'react';
import {
  ArrowRight,
  Settings,
  Warehouse,
  ShoppingCart,
  Camera,
  Pencil,
  LogOut,
  X,
  Handshake,
  Cloud,
  DollarSign,
  ShoppingBag,
} from 'lucide-react';
import type { AppSession } from '../../types/session';
import { useTranslation } from '../../lib/i18n';
import { getTrustConfig } from '../shared/TrustRatingBadge';
import AccountSummaryCards from './AccountSummaryCards';
import SettingsTab from './tabs/SettingsTab';
import AccountEditSheet from './AccountEditSheet';
import CloudWarehouseTab from './tabs/CloudWarehouseTab';
import CommissionsTab from './tabs/CommissionsTab';
import SaleRequestsTab from './tabs/SaleRequestsTab';
import { useAccountData } from '../../hooks/useAccountData';
import { useSupplierSaleRequests, useBuyerSaleRequests } from '../../hooks/useSaleRequests';

type AccountTab = 'warehouse' | 'commissions' | 'settings' | 'sale_requests';

interface Props {
  session: AppSession;
  onClose: () => void;
  onLogout: () => void;
  initialTab?: AccountTab;
  saleRequestsView?: 'supplier' | 'buyer';
}

export default function AccountPage({ session, onClose, onLogout, initialTab, saleRequestsView }: Props) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<AccountTab>(initialTab ?? 'warehouse');
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [showEditSheet, setShowEditSheet] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [localSession, setLocalSession] = useState(session);

  const phone = session.profile.phone;
  const {
    loading,
    inventory,
    publishedInventory,
    unpublishedInventory,
    reservedInventory,
    purchases,
    marketCardDeals,
    commissions,
    pendingCommissions,
    totalPendingCommission,
    getCounterpartyName,
    refresh,
  } = useAccountData(phone);

  const { requests: supplierSaleReqs } = useSupplierSaleRequests(phone);
  const { requests: buyerSaleReqs } = useBuyerSaleRequests(phone);
  const pendingSaleRequests = supplierSaleReqs.filter(r => r.status === 'pending_supplier').length;
  const activeBuyerRequests = buyerSaleReqs.filter(r => !['completed', 'failed', 'rejected'].includes(r.status)).length;
  const saleRequestsBadge = pendingSaleRequests + activeBuyerRequests;

  const isCompany = localSession.profile.user_type === 'company';
  const displayName = isCompany
    ? (localSession.profile.company_name || t('account.defaultUser'))
    : (localSession.profile.display_name || t('account.defaultUser'));
  const initials = displayName.trim().split(/\s+/).slice(0, 2).map((w: string) => w[0]).join('').toUpperCase();
  const trustConfig = getTrustConfig(3);
  const TrustIcon = trustConfig.icon;

  const stats = {
    inventory: inventory.reduce((s, b) => s + (b.quantity_available ?? b.quantity ?? 0), 0),
    purchases: purchases.reduce((s, p) => s + p.quantity, 0),
    activeDeals: marketCardDeals.filter(d => !['completed', 'cancelled'].includes(d.status)).length,
    orders: marketCardDeals.filter(d => !['completed', 'cancelled'].includes(d.status)).length,
  };

  const TAB_CONFIG: { key: AccountTab; label: string; icon: typeof Settings; badge?: number }[] = [
    { key: 'warehouse', label: 'مستودعي', icon: Cloud },
    { key: 'sale_requests', label: 'بيع و شراء', icon: ShoppingBag, badge: saleRequestsBadge || undefined },
    { key: 'commissions', label: 'العمولات', icon: DollarSign, badge: pendingCommissions.length || undefined },
    { key: 'settings', label: t('account.settings'), icon: Settings },
  ];

  const handleEditSaved = (updates: { display_name?: string; company_name?: string; city?: string; activity_type?: string; profile_image_url?: string | null }) => {
    if (updates.profile_image_url !== undefined) setProfileImageUrl(updates.profile_image_url);
    setLocalSession(prev => ({
      ...prev,
      profile: {
        ...prev.profile,
        display_name: updates.display_name ?? prev.profile.display_name,
        company_name: updates.company_name ?? prev.profile.company_name,
        city: updates.city ?? prev.profile.city,
        activity_type: updates.activity_type ?? prev.profile.activity_type,
      },
    }));
  };

  const renderTab = () => {
    switch (activeTab) {
      case 'warehouse':
        return (
          <CloudWarehouseTab
            inventory={inventory}
            publishedInventory={publishedInventory}
            unpublishedInventory={unpublishedInventory}
            reservedInventory={reservedInventory}
            purchases={purchases}
            loading={loading}
          />
        );
      case 'sale_requests':
        return <SaleRequestsTab phone={phone} initialView={saleRequestsView} />;
      case 'commissions':
        return (
          <CommissionsTab
            commissions={commissions}
            pendingCommissions={pendingCommissions}
            totalPendingCommission={totalPendingCommission}
            loading={loading}
          />
        );
      case 'settings':
        return <SettingsTab session={localSession} onLogout={onLogout} onEditProfile={() => setShowEditSheet(true)} />;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col md:flex-row"
      style={{ background: 'linear-gradient(180deg, #e8eff5 0%, #dce6ef 50%, #d0dce8 100%)' }}
    >
      {showEditSheet && (
        <AccountEditSheet session={localSession} profileImageUrl={profileImageUrl} onClose={() => setShowEditSheet(false)} onSaved={handleEditSaved} />
      )}

      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center px-6" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }} onClick={() => setShowLogoutConfirm(false)}>
          <div className="w-full max-w-sm rounded-3xl p-6 space-y-4" style={{ background: 'white', boxShadow: '0 24px 60px rgba(0,0,0,0.3)' }} onClick={(e) => e.stopPropagation()} dir="rtl">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: '#FEF2F2' }}>
                <LogOut className="w-8 h-8 text-[#dc2626]" />
              </div>
              <h3 className="text-[17px] font-black text-[#1a3a4a]">{t('account.logoutConfirm')}</h3>
              <p className="text-[13px] text-[#7a9aab] leading-relaxed">{t('account.logoutConfirmDesc')}</p>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setShowLogoutConfirm(false)} className="flex-1 py-3 rounded-2xl text-[13px] font-bold text-[#4a6a7e]" style={{ background: '#f0f6fa', border: '1px solid #e2edf5' }}>{t('common.cancel')}</button>
              <button onClick={onLogout} className="flex-1 py-3 rounded-2xl text-[13px] font-bold text-white" style={{ background: 'linear-gradient(135deg, #dc2626, #ef4444)', boxShadow: '0 4px 12px rgba(220,38,38,0.3)' }}>{t('account.logout')}</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Desktop Left Sidebar ─── */}
      <aside
        className="hidden md:flex flex-col flex-shrink-0 overflow-y-auto"
        style={{ width: 280, background: 'linear-gradient(180deg, #0f2535 0%, #1a4a5e 60%, #1e5c75 100%)', borderLeft: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="relative overflow-hidden px-5 pt-6 pb-5 flex-shrink-0">
          <div className="absolute top-0 right-0 w-40 h-40 rounded-full opacity-10 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.2) 0%, transparent 70%)', transform: 'translate(30%, -30%)' }} />

          <div className="flex justify-end mb-4">
            <button onClick={onClose} className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors border border-white/10">
              <X className="w-4 h-4 text-white/70" />
            </button>
          </div>

          <div className="flex flex-col items-center text-center gap-3" dir="rtl">
            <div className="relative">
              <button onClick={() => setShowEditSheet(true)} className="w-20 h-20 rounded-2xl overflow-hidden flex items-center justify-center active:scale-95 transition-transform" style={{ background: profileImageUrl ? 'transparent' : 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)', border: '3px solid rgba(255,255,255,0.2)', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
                {profileImageUrl ? <img src={profileImageUrl} alt="" className="w-full h-full object-cover" /> : <span className="text-[26px] font-black text-white">{initials}</span>}
              </button>
              <button onClick={() => setShowEditSheet(true)} className="absolute -bottom-1 -right-1 w-7 h-7 rounded-lg flex items-center justify-center border-2 border-[#1a4a5e] active:scale-95 transition-transform" style={{ background: 'linear-gradient(135deg, #0ea5e9, #0284c7)', boxShadow: '0 2px 8px rgba(14,165,233,0.3)' }}>
                <Camera className="w-3.5 h-3.5 text-white" />
              </button>
              <div className="absolute -top-1 -left-1 w-6 h-6 rounded-lg flex items-center justify-center border-2 border-[#1a4a5e]" style={{ background: trustConfig.color, boxShadow: '0 2px 6px rgba(0,0,0,0.2)' }}>
                <TrustIcon className="w-3 h-3 text-white" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-center gap-2 mb-0.5">
                <h2 className="text-[17px] font-bold text-white">{displayName}</h2>
                <button onClick={() => setShowEditSheet(true)} className="w-6 h-6 rounded-md bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
                  <Pencil className="w-3 h-3 text-white/60" />
                </button>
              </div>
              <p className="text-[11px] text-white/40" dir="ltr">{localSession.profile.phone}</p>
              <div className="flex items-center justify-center gap-2 mt-2 flex-wrap">
                {localSession.roles.includes('supplier') && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg" style={{ background: 'rgba(34,197,94,0.2)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.3)' }}>
                    <Warehouse className="w-3 h-3 inline-block ml-1" />{t('account.supplier')}
                  </span>
                )}
                {localSession.roles.includes('buyer') && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg" style={{ background: 'rgba(59,130,246,0.2)', color: '#93c5fd', border: '1px solid rgba(59,130,246,0.3)' }}>
                    <ShoppingCart className="w-3 h-3 inline-block ml-1" />{t('account.buyer')}
                  </span>
                )}
                {localSession.profile.city && (
                  <span className="text-[10px] text-white/30">{localSession.profile.city}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 pb-4 flex-shrink-0">
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'مخزوني', value: stats.inventory, unit: 'طبلية', color: '#22c55e' },
              { label: 'مشترياتي', value: stats.purchases, unit: 'طبلية', color: '#60a5fa' },
              { label: 'صفقات نشطة', value: stats.activeDeals, unit: '', color: '#34d399' },
              { label: 'طلبات تفاوض', value: stats.orders, unit: '', color: '#fbbf24' },
            ].map(s => (
              <div key={s.label} className="rounded-xl p-2.5" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <p className="text-[10px] text-white/40 mb-0.5">{s.label}</p>
                <p className="text-[18px] font-black" style={{ color: s.color }}>{s.value.toLocaleString()}<span className="text-[10px] font-normal text-white/30 mr-1">{s.unit}</span></p>
              </div>
            ))}
          </div>
        </div>

        <nav className="flex-1 px-3 pb-4 space-y-1" dir="rtl">
          {TAB_CONFIG.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-[13px] font-bold transition-all ${isActive ? 'text-white' : 'text-white/50 hover:text-white/80 hover:bg-white/5'}`}
                style={isActive ? { background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.12)' } : undefined}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1 text-right">{tab.label}</span>
                {tab.badge != null && tab.badge > 0 && (
                  <span className="text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: isActive ? 'rgba(255,255,255,0.25)' : '#2563eb', color: 'white' }}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="px-3 pb-5 flex-shrink-0">
          <button onClick={() => setShowLogoutConfirm(true)} className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-[13px] font-bold text-red-300/70 hover:text-red-300 hover:bg-red-500/10 transition-all" dir="rtl">
            <LogOut className="w-4 h-4" />
            {t('account.logout')}
          </button>
        </div>
      </aside>

      {/* ─── Main content area ─── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <header className="flex-shrink-0 relative overflow-hidden md:hidden" style={{ background: 'linear-gradient(135deg, #0f2535 0%, #1a4a5e 50%, #1e5c75 100%)' }}>
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-40 h-40 rounded-full" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.2) 0%, transparent 70%)', transform: 'translate(30%, -30%)' }} />
            <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%)', transform: 'translate(-20%, 40%)' }} />
          </div>
          <div className="relative px-4 pt-4 pb-5" dir="rtl">
            <div className="flex items-center justify-between mb-5">
              <button onClick={onClose} className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center active:scale-95 transition-transform backdrop-blur-sm border border-white/10">
                <ArrowRight className="w-5 h-5 text-white" />
              </button>
              <div className="flex items-center gap-2">
                <button onClick={refresh} className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center active:scale-95 border border-white/10">
                  <Handshake className="w-4 h-4 text-white/60" />
                </button>
                <h1 className="text-[16px] font-bold text-white">{t('navigation.myAccount')}</h1>
              </div>
              <button onClick={() => setShowLogoutConfirm(true)} className="w-10 h-10 rounded-xl flex items-center justify-center active:scale-95 transition-transform backdrop-blur-sm border border-red-400/30" style={{ background: 'rgba(220,38,38,0.15)' }}>
                <LogOut className="w-4 h-4 text-red-300" />
              </button>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <button onClick={() => setShowEditSheet(true)} className="w-[68px] h-[68px] rounded-2xl overflow-hidden flex-shrink-0 flex items-center justify-center active:scale-95 transition-transform" style={{ background: profileImageUrl ? 'transparent' : 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)', border: '3px solid rgba(255,255,255,0.25)', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
                  {profileImageUrl ? <img src={profileImageUrl} alt="" className="w-full h-full object-cover" /> : <span className="text-[22px] font-black text-white">{initials}</span>}
                </button>
                <button onClick={() => setShowEditSheet(true)} className="absolute -bottom-1 -left-1 w-7 h-7 rounded-lg flex items-center justify-center border-2 border-[#1a4a5e] active:scale-95 transition-transform" style={{ background: 'linear-gradient(135deg, #0ea5e9, #0284c7)', boxShadow: '0 2px 8px rgba(14,165,233,0.3)' }}>
                  <Camera className="w-3.5 h-3.5 text-white" />
                </button>
                <div className="absolute -top-1 -right-1 w-6 h-6 rounded-lg flex items-center justify-center border-2 border-[#1a4a5e]" style={{ background: trustConfig.color, boxShadow: '0 2px 6px rgba(0,0,0,0.2)' }}>
                  <TrustIcon className="w-3 h-3 text-white" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <button onClick={() => setShowEditSheet(true)} className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center active:scale-90 transition-transform border border-white/10 flex-shrink-0">
                    <Pencil className="w-3.5 h-3.5 text-white/70" />
                  </button>
                  <h2 className="text-[18px] font-bold text-white truncate">{displayName}</h2>
                </div>
                <p className="text-[12px] text-white/50 mt-0.5" dir="ltr">{localSession.profile.phone}</p>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {localSession.roles.includes('supplier') && (
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg" style={{ background: 'rgba(34,197,94,0.2)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.3)' }}>
                      <Warehouse className="w-3 h-3 inline-block ml-1" />{t('account.supplier')}
                    </span>
                  )}
                  {localSession.roles.includes('buyer') && (
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg" style={{ background: 'rgba(59,130,246,0.2)', color: '#93c5fd', border: '1px solid rgba(59,130,246,0.3)' }}>
                      <ShoppingCart className="w-3 h-3 inline-block ml-1" />{t('account.buyer')}
                    </span>
                  )}
                  {localSession.profile.city && <span className="text-[10px] text-white/40">{localSession.profile.city}</span>}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Desktop top bar */}
        <div className="hidden md:flex items-center justify-between px-6 py-4 flex-shrink-0 border-b" style={{ background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(12px)', borderColor: 'rgba(255,255,255,0.8)' }} dir="rtl">
          <div>
            <h1 className="text-[18px] font-black text-[#1a3a4a]">{TAB_CONFIG.find(t => t.key === activeTab)?.label}</h1>
            <p className="text-[11px] text-[#7a9aab] mt-0.5">{displayName} — {localSession.profile.phone}</p>
          </div>
          <div className="flex items-center gap-2">
            {stats.activeDeals > 0 && (
              <span className="text-[11px] font-bold px-3 py-1 rounded-full" style={{ background: 'rgba(5,150,105,0.1)', color: '#059669', border: '1px solid rgba(5,150,105,0.2)' }}>
                {stats.activeDeals} صفقة نشطة
              </span>
            )}
            {pendingCommissions.length > 0 && (
              <span className="text-[11px] font-bold px-3 py-1 rounded-full" style={{ background: 'rgba(180,83,9,0.1)', color: '#b45309', border: '1px solid rgba(180,83,9,0.2)' }}>
                {pendingCommissions.length} عمولة معلقة
              </span>
            )}
          </div>
        </div>

        {/* Mobile: Summary Cards */}
        <div className="flex-shrink-0 -mt-1 md:hidden">
          <AccountSummaryCards stats={stats} />
        </div>

        {/* Mobile: Tab Navigation */}
        <div className="flex-shrink-0 px-3 pt-3 pb-1 md:hidden">
          <div className="flex gap-1 p-1 rounded-2xl overflow-x-auto no-scrollbar" style={{ background: 'rgba(255,255,255,0.7)', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', border: '1px solid rgba(255,255,255,0.9)' }} dir="rtl">
            {TAB_CONFIG.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex-shrink-0 relative flex items-center justify-center gap-1 py-2 px-2.5 rounded-xl text-[11px] font-bold transition-all ${isActive ? 'text-white shadow-lg' : 'text-[#5a7a8a] hover:text-[#1a4a5e] hover:bg-white/50'}`}
                  style={isActive ? { background: 'linear-gradient(135deg, #1a4a5e 0%, #2c6f8a 100%)', boxShadow: '0 4px 12px rgba(26,74,94,0.3)' } : undefined}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                  {tab.badge != null && tab.badge > 0 && (
                    <span className="absolute -top-0.5 -left-0.5 text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center bg-[#2563eb] text-white">
                      {tab.badge > 9 ? '9+' : tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto px-4 md:px-6 pt-3 pb-6" style={{ scrollbarWidth: 'thin', scrollbarColor: '#b8d0e0 transparent' }}>
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-200 max-w-4xl mx-auto" key={activeTab}>
            {renderTab()}
          </div>
        </div>
      </div>
    </div>
  );
}
