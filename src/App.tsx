import { useState, useRef, useEffect } from 'react';
import { useSession } from './hooks/useSession';
import Header from './components/Header';
import HeroSection from './components/HeroSection';
import BottomNavigation from './components/BottomNavigation';
import OrderBuilder from './components/order/OrderBuilder';
import InventoryBuilder from './components/inventory/InventoryBuilder';
import OperationalDashboard from './components/dashboard/OperationalDashboard';
import AccountPage from './components/account/AccountPage';
import PhoneRegistration from './components/account/PhoneRegistration';
import LoginPage from './components/account/LoginPage';
import SupplierDealsPage from './components/deals/supplier/SupplierDealsPage';
import BuyerDealsPage from './components/deals/buyer/BuyerDealsPage';
import AdminPanel from './components/admin/AdminPanel';
import AdminLoginSheet, { type AdminStaffData } from './components/admin/AdminLoginSheet';
import SupplierInventory from './components/inventory/SupplierInventory';
import PurchasedInventorySheet from './components/account/PurchasedInventorySheet';
import DesktopSidebar from './components/desktop/DesktopSidebar';
import DesktopRightPanel from './components/desktop/DesktopRightPanel';
import MarketSection from './components/market/MarketSection';

type ModalView = 'none' | 'orderBuilder' | 'inventoryBuilder' | 'account' | 'registration' | 'login' | 'supplierDeals' | 'buyerDeals' | 'admin' | 'adminLogin' | 'supplierInventory' | 'purchasedInventory';

function App() {
  const { session, loading, register, login, updateProfile, activateRole, logout } = useSession();
  const [modal, setModal] = useState<ModalView>('none');
  const pendingAfterAuth = useRef<ModalView | null>(null);
  const dashboardRefresh = useRef<(() => void) | null>(null);
  const [authError, setAuthError] = useState('');
  const [loginError, setLoginError] = useState('');
  const [freshLogin, setFreshLogin] = useState(false);
  const pendingSession = useRef<import('./types/session').AppSession | null>(null);
  const [isDetailSheetOpen, setIsDetailSheetOpen] = useState(false);
  const [adminStaff, setAdminStaff] = useState<AdminStaffData | null>(null);

  useEffect(() => {
    const storedAdminData = sessionStorage.getItem('adminStaffData');
    if (storedAdminData) {
      try {
        setAdminStaff(JSON.parse(storedAdminData));
      } catch (e) {
        sessionStorage.removeItem('adminStaffData');
      }
    }
  }, []);

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'linear-gradient(180deg, #d6e4f0 0%, #e0ecf6 50%, #d6e4f0 100%)' }}
      >
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 bg-[#1a4a5e] rounded-2xl flex items-center justify-center shadow-xl">
            <svg viewBox="0 0 20 20" className="w-8 h-8" fill="none">
              <rect x="2" y="2" width="6.5" height="6.5" rx="1.5" fill="white" />
              <rect x="11.5" y="2" width="6.5" height="6.5" rx="1.5" fill="white" />
              <rect x="2" y="11.5" width="6.5" height="6.5" rx="1.5" fill="white" />
              <rect x="11.5" y="11.5" width="6.5" height="6.5" rx="1.5" fill="white" />
              <line x1="8.5" y1="5.25" x2="11.5" y2="5.25" stroke="white" strokeWidth="1.2" />
              <line x1="5.25" y1="8.5" x2="5.25" y2="11.5" stroke="white" strokeWidth="1.2" />
              <line x1="14.75" y1="8.5" x2="14.75" y2="11.5" stroke="white" strokeWidth="1.2" />
            </svg>
          </div>
          <div className="w-6 h-6 border-2 border-[#1a4a5e] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  const openInventory = () => setModal('inventoryBuilder');
  const openOrder = () => setModal('orderBuilder');

  const handleRegisterComplete = async (data: { phone: string; name: string; userType: 'company' | 'individual'; pin: string }) => {
    setAuthError('');
    const result = await register(data);
    if (!result.success) {
      const msg = result.error || 'حدث خطأ';
      setAuthError(msg);
      throw new Error(msg);
    }

    if (result.session) {
      pendingSession.current = result.session;
      await activateRole('buyer');
    }

    const next = pendingAfterAuth.current;
    pendingAfterAuth.current = null;
    setModal(next && next !== 'none' ? next : 'none');
  };

  const handleLoginComplete = async (phone: string, pin: string) => {
    setLoginError('');
    const result = await login(phone, pin);
    if (!result.success) {
      const msg = result.error || 'حدث خطأ';
      setLoginError(msg);
      throw new Error(msg);
    }

    if (result.session) {
      pendingSession.current = result.session;
      await activateRole('buyer');
    }

    const next = pendingAfterAuth.current;
    pendingAfterAuth.current = null;
    setModal(next && next !== 'none' ? next : 'none');
  };

  const handleInlineRegister = async (data: { phone: string; name: string; userType: 'company' | 'individual'; pin: string }) => {
    const result = await register(data);
    if (!result.success) { setAuthError(result.error || 'حدث خطأ'); throw new Error(result.error); }
  };

  const handleInlineLogin = async (phone: string, pin: string) => {
    const result = await login(phone, pin);
    if (!result.success) { setAuthError(result.error || 'حدث خطأ'); throw new Error(result.error); }
  };

  const openAuth = (afterModal: ModalView = 'none') => {
    pendingAfterAuth.current = afterModal;
    setAuthError('');
    setLoginError('');
    setModal('login');
  };

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #bbd0df 0%, #cbdeef 40%, #dbe8f3 70%, #c3d9e8 100%)' }}>

      {/* ── Desktop Layout ── */}
      <div
        className="hidden lg:flex h-screen overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0e2233 0%, #112a3d 40%, #0e2233 100%)' }}
      >
        {/* Left Sidebar */}
        <div className="w-64 xl:w-72 flex-shrink-0 h-screen overflow-hidden">
          <DesktopSidebar
            session={session}
            onOpenAccount={() => { session ? setModal('account') : openAuth('none'); }}
            onCreateOrder={openOrder}
            onAddInventory={openInventory}
            onOpenAdmin={() => adminStaff ? setModal('admin') : setModal('adminLogin')}
          />
        </div>

        {/* Center Main Content */}
        <div
          className="flex-1 flex flex-col min-w-0 h-screen rounded-l-3xl overflow-hidden"
          style={{
            background: 'linear-gradient(160deg, #bccad6 0%, #c8d5e2 40%, #d0dfe8 70%, #c3d1e0 100%)',
            boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.6)',
          }}
        >
          <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#b8d0e0 transparent' }}>
            {session ? (
              <OperationalDashboard
                session={session}
                onAddInventory={openInventory}
                onCreateOrder={openOrder}
                onOpenSupplierDeals={() => setModal('supplierDeals')}
                onOpenBuyerDeals={() => setModal('buyerDeals')}
                refreshRef={dashboardRefresh}
              />
            ) : (
              <div className="pb-10">
                <HeroSection desktop />
                <MarketSection
                  onCreateOrder={openOrder}
                  onAddInventory={openInventory}
                  isAuthenticated={!!session}
                  onShowAuth={() => openAuth('none')}
                  onDetailSheetChange={setIsDetailSheetOpen}
                />
              </div>
            )}
          </div>
        </div>

        {/* Right Panel */}
        <div className="w-64 xl:w-72 flex-shrink-0 h-screen overflow-hidden">
          <DesktopRightPanel
            session={session}
            onLogin={() => openAuth('none')}
            onOpenAdmin={() => adminStaff ? setModal('admin') : setModal('adminLogin')}
          />
        </div>
      </div>

      {/* ── Mobile Layout ── */}
      <div className="lg:hidden min-h-screen" style={{ background: 'linear-gradient(180deg, #c3d1e0 0%, #cdd9e6 30%, #d5e1ea 50%, #cdd9e6 70%, #c3d1e0 100%)' }}>
        <Header
          session={session}
          onOpenAccount={() => { session ? setModal('account') : openAuth('none'); }}
          onOpenAdmin={() => adminStaff ? setModal('admin') : setModal('adminLogin')}
        />
        <div className="overflow-y-auto" style={{ height: 'calc(100vh - 57px)' }}>
          {session ? (
            <OperationalDashboard
              session={session}
              onAddInventory={openInventory}
              onCreateOrder={openOrder}
              onOpenSupplierDeals={() => setModal('supplierDeals')}
              onOpenBuyerDeals={() => setModal('buyerDeals')}
              refreshRef={dashboardRefresh}
            />
          ) : (
            <>
              <HeroSection />
              <MarketSection
                onCreateOrder={openOrder}
                onAddInventory={openInventory}
                isAuthenticated={!!session}
                onShowAuth={() => openAuth('none')}
                onDetailSheetChange={setIsDetailSheetOpen}
              />
              {!isDetailSheetOpen && (
                <BottomNavigation onAddInventory={openInventory} onCreateOrder={openOrder} />
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Shared Modals ── */}
      {modal === 'orderBuilder' && (
        <OrderBuilder
          onClose={() => { setModal('none'); setAuthError(''); dashboardRefresh.current?.(); }}
          phone={session?.profile.phone}
          authError={authError}
          onRegisterComplete={async (data) => { await handleInlineRegister(data); await activateRole('buyer'); }}
          onLoginComplete={async (phone, pin) => { await handleInlineLogin(phone, pin); await activateRole('buyer'); }}
          onOpenDeals={() => { setModal('buyerDeals'); dashboardRefresh.current?.(); }}
        />
      )}

      {modal === 'inventoryBuilder' && (
        <InventoryBuilder
          onClose={() => { setModal('none'); setAuthError(''); dashboardRefresh.current?.(); }}
          phone={session?.profile.phone}
          onDepositComplete={() => activateRole('supplier')}
          authError={authError}
          onRegisterComplete={async (data) => { await handleInlineRegister(data); await activateRole('supplier'); }}
          onLoginComplete={async (phone, pin) => { await handleInlineLogin(phone, pin); await activateRole('supplier'); }}
        />
      )}

      {modal === 'account' && (session || pendingSession.current) && (
        <AccountPage
          session={(session || pendingSession.current)!}
          freshLogin={freshLogin}
          onClose={() => { setModal('none'); setFreshLogin(false); pendingSession.current = null; }}
          onLogout={async () => { await logout(); setModal('none'); setFreshLogin(false); pendingSession.current = null; }}
          onUpdateProfile={updateProfile}
          onOpenSupplierDeals={() => setModal('supplierDeals')}
          onOpenBuyerDeals={() => setModal('buyerDeals')}
          onOpenSupplierInventory={() => setModal('supplierInventory')}
          onOpenPurchasedInventory={() => setModal('purchasedInventory')}
        />
      )}

      {modal === 'registration' && (
        <PhoneRegistration
          onComplete={handleRegisterComplete}
          onClose={() => { pendingAfterAuth.current = null; setModal('none'); setAuthError(''); }}
          onSwitchToLogin={() => { setModal('login'); setLoginError(''); }}
        />
      )}

      {modal === 'login' && (
        <LoginPage
          externalError={loginError}
          onComplete={handleLoginComplete}
          onClose={() => { pendingAfterAuth.current = null; setModal('none'); setLoginError(''); }}
          onSwitchToRegister={() => { setModal('registration'); setAuthError(''); }}
        />
      )}

      {modal === 'supplierDeals' && session && (
        <SupplierDealsPage
          phone={session.profile.phone}
          onClose={() => { setModal('none'); dashboardRefresh.current?.(); }}
        />
      )}

      {modal === 'buyerDeals' && session && (
        <BuyerDealsPage
          phone={session.profile.phone}
          onClose={() => {
            setModal('none');
            dashboardRefresh.current?.();
          }}
        />
      )}

      {modal === 'adminLogin' && (
        <AdminLoginSheet
          onClose={() => setModal('none')}
          onSuccess={(staffData) => {
            setAdminStaff(staffData);
            sessionStorage.setItem('adminStaffData', JSON.stringify(staffData));
            setModal('admin');
          }}
        />
      )}

      {modal === 'admin' && adminStaff && (
        <AdminPanel
          adminStaff={adminStaff}
          onClose={() => {
            setModal('none');
            setAdminStaff(null);
            sessionStorage.removeItem('adminStaffData');
          }}
        />
      )}

      {modal === 'supplierInventory' && session && (
        <SupplierInventory
          phone={session.profile.phone}
          onClose={() => { setModal('none'); dashboardRefresh.current?.(); }}
          onAddInventory={() => setModal('inventoryBuilder')}
        />
      )}

      {modal === 'purchasedInventory' && session && (
        <PurchasedInventorySheet
          phone={session.profile.phone}
          onClose={() => { setModal('none'); dashboardRefresh.current?.(); }}
        />
      )}

    </div>
  );
}

export default App;
