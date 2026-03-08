import { useState, useRef, useEffect, lazy, Suspense } from 'react';
import { useSession } from './hooks/useSession';
import Header from './components/Header';
import HeroSection from './components/HeroSection';
import BottomNavigation from './components/BottomNavigation';
import TopNavigation from './components/shared/TopNavigation';
import DesktopSidebar from './components/desktop/DesktopSidebar';
import DesktopRightPanel from './components/desktop/DesktopRightPanel';
import type { AdminStaffData } from './components/admin/AdminLoginSheet';

const OrderBuilder = lazy(() => import('./components/order/OrderBuilder'));
const InventoryBuilder = lazy(() => import('./components/inventory/InventoryBuilder'));
const OperationalDashboard = lazy(() => import('./components/dashboard/OperationalDashboard'));
const PhoneRegistration = lazy(() => import('./components/account/PhoneRegistration'));
const LoginPage = lazy(() => import('./components/account/LoginPage'));
const SupplierDealsPage = lazy(() => import('./components/deals/supplier/SupplierDealsPage'));
const BuyerDealsPage = lazy(() => import('./components/deals/buyer/BuyerDealsPage'));
const AdminPanel = lazy(() => import('./components/admin/AdminPanel'));
const AdminLoginSheet = lazy(() => import('./components/admin/AdminLoginSheet'));
const SupplierInventory = lazy(() => import('./components/inventory/SupplierInventory'));
const MarketSection = lazy(() => import('./components/market/MarketSection'));
const AccountPage = lazy(() => import('./components/account/AccountPage'));

type ModalView = 'none' | 'orderBuilder' | 'inventoryBuilder' | 'registration' | 'login' | 'supplierDeals' | 'buyerDeals' | 'admin' | 'adminLogin' | 'supplierInventory' | 'account';
type MainView = 'marketplace' | 'dashboard';

const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(180deg, #d6e4f0 0%, #e0ecf6 50%, #d6e4f0 100%)' }}>
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

function App() {
  const { session, loading, register, login, updateProfile, activateRole, logout } = useSession();
  const [modal, setModal] = useState<ModalView>('none');
  const [mainView, setMainView] = useState<MainView>('marketplace');
  const pendingAfterAuth = useRef<ModalView | null>(null);
  const dashboardRefresh = useRef<(() => void) | null>(null);
  const [authError, setAuthError] = useState('');
  const [loginError, setLoginError] = useState('');
  const [freshLogin, setFreshLogin] = useState(false);
  const pendingSession = useRef<import('./types/session').AppSession | null>(null);
  const [isDetailSheetOpen, setIsDetailSheetOpen] = useState(false);
  const [adminStaff, setAdminStaff] = useState<AdminStaffData | null>(null);
  const [inventoryPrefill, setInventoryPrefill] = useState<{ pallet_type?: string; size?: string; quality?: string; quantity?: number; city?: string } | undefined>();
  const [inventorySource, setInventorySource] = useState<'supplier_added' | 'purchase_transfer'>('supplier_added');

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
    return <LoadingFallback />;
  }

  const openInventory = (prefill?: { pallet_type?: string; size?: string; quality?: string; quantity?: number; city?: string }, source?: 'supplier_added' | 'purchase_transfer') => {
    setInventoryPrefill(prefill);
    setInventorySource(source || 'supplier_added');
    setModal('inventoryBuilder');
  };
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

    if (!next || next === 'none') {
      setModal('none');
      setFreshLogin(true);
      setMainView('marketplace');
    } else {
      setModal(next);
    }
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

    if (!next || next === 'none') {
      setModal('none');
      setFreshLogin(true);
      setMainView('marketplace');
    } else {
      setModal(next);
    }
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

  const handleNavigation = (view: 'marketplace' | 'orders' | 'inventory' | 'deals' | 'account') => {
    setModal('none');
    if (view === 'marketplace') {
      setMainView('marketplace');
    } else if (view === 'orders') {
      setMainView('dashboard');
    } else if (view === 'inventory') {
      setMainView('dashboard');
      setTimeout(() => setModal('supplierInventory'), 100);
    } else if (view === 'deals') {
      setMainView('dashboard');
      setTimeout(() => setModal('buyerDeals'), 100);
    } else if (view === 'account') {
      setModal('account');
    }
  };

  const getCurrentNavView = (): 'marketplace' | 'orders' | 'inventory' | 'deals' | 'account' => {
    if (modal === 'account') return 'account';
    if (mainView === 'marketplace') return 'marketplace';
    if (modal === 'supplierInventory') return 'inventory';
    if (modal === 'buyerDeals' || modal === 'supplierDeals') return 'deals';
    return 'orders';
  };

  const handleLogout = async () => {
    await logout();
    setMainView('marketplace');
    setModal('none');
    setFreshLogin(false);
    pendingSession.current = null;
  };

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #bbd0df 0%, #cbdeef 40%, #dbe8f3 70%, #c3d9e8 100%)' }}>

      {/* ── Desktop Layout ── */}
      <div
        className="hidden lg:flex h-screen overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0e2233 0%, #112a3d 40%, #0e2233 100%)' }}
      >
        {session ? (
          <>
            <div className="w-64 xl:w-72 flex-shrink-0 h-screen overflow-hidden">
              <DesktopSidebar
                session={session}
                onOpenAccount={() => setModal('account')}
                onCreateOrder={openOrder}
                onAddInventory={openInventory}
                onOpenAdmin={() => adminStaff ? setModal('admin') : setModal('adminLogin')}
              />
            </div>

            <div
              className="flex-1 flex flex-col min-w-0 h-screen rounded-l-3xl overflow-hidden"
              style={{
                background: 'linear-gradient(160deg, #bccad6 0%, #c8d5e2 40%, #d0dfe8 70%, #c3d1e0 100%)',
                boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.6)',
              }}
            >
              <TopNavigation
                session={session}
                currentView={getCurrentNavView()}
                onNavigate={handleNavigation}
                onLogout={handleLogout}
              />
              <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#b8d0e0 transparent' }}>
                <Suspense fallback={<LoadingFallback />}>
                  <div key={mainView} className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                    {mainView === 'marketplace' ? (
                      <div className="pb-10">
                        <HeroSection desktop />
                        <MarketSection
                          onCreateOrder={openOrder}
                          onAddInventory={openInventory}
                          isAuthenticated={true}
                          onShowAuth={() => openAuth('none')}
                          onDetailSheetChange={setIsDetailSheetOpen}
                          onGoToDeals={() => setModal('buyerDeals')}
                        />
                      </div>
                    ) : (
                      <OperationalDashboard
                        session={session}
                        onAddInventory={openInventory}
                        onCreateOrder={openOrder}
                        onOpenSupplierDeals={() => setModal('supplierDeals')}
                        onOpenBuyerDeals={() => setModal('buyerDeals')}
                        refreshRef={dashboardRefresh}
                      />
                    )}
                  </div>
                </Suspense>
              </div>
            </div>

            <div className="w-64 xl:w-72 flex-shrink-0 h-screen overflow-hidden">
              <DesktopRightPanel
                session={session}
                onLogin={() => openAuth('none')}
                onOpenAdmin={() => adminStaff ? setModal('admin') : setModal('adminLogin')}
              />
            </div>
          </>
        ) : (
          <>
            <div className="w-64 xl:w-72 flex-shrink-0 h-screen overflow-hidden">
              <DesktopSidebar
                session={session}
                onOpenAccount={() => openAuth('none')}
                onCreateOrder={openOrder}
                onAddInventory={openInventory}
                onOpenAdmin={() => adminStaff ? setModal('admin') : setModal('adminLogin')}
              />
            </div>

            <div
              className="flex-1 flex flex-col min-w-0 h-screen rounded-l-3xl overflow-hidden"
              style={{
                background: 'linear-gradient(160deg, #bccad6 0%, #c8d5e2 40%, #d0dfe8 70%, #c3d1e0 100%)',
                boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.6)',
              }}
            >
              <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#b8d0e0 transparent' }}>
                <Suspense fallback={<LoadingFallback />}>
                  <div className="pb-10">
                    <HeroSection desktop />
                    <MarketSection
                      onCreateOrder={openOrder}
                      onAddInventory={openInventory}
                      isAuthenticated={false}
                      onShowAuth={() => openAuth('none')}
                      onDetailSheetChange={setIsDetailSheetOpen}
                      onGoToDeals={() => openAuth('none')}
                    />
                  </div>
                </Suspense>
              </div>
            </div>

            <div className="w-64 xl:w-72 flex-shrink-0 h-screen overflow-hidden">
              <DesktopRightPanel
                session={session}
                onLogin={() => openAuth('none')}
                onOpenAdmin={() => adminStaff ? setModal('admin') : setModal('adminLogin')}
              />
            </div>
          </>
        )}
      </div>

      {/* ── Mobile Layout ── */}
      <div className="lg:hidden min-h-screen" style={{ background: 'linear-gradient(180deg, #c3d1e0 0%, #cdd9e6 30%, #d5e1ea 50%, #cdd9e6 70%, #c3d1e0 100%)' }}>
        {session ? (
          <>
            <TopNavigation
              session={session}
              currentView={getCurrentNavView()}
              onNavigate={handleNavigation}
              onLogout={handleLogout}
            />
            <div className="overflow-y-auto" style={{ height: 'calc(100vh - 56px)' }}>
              <Suspense fallback={<LoadingFallback />}>
                <div key={mainView} className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                  {mainView === 'marketplace' ? (
                    <>
                      <HeroSection />
                      <MarketSection
                        onCreateOrder={openOrder}
                        onAddInventory={openInventory}
                        isAuthenticated={true}
                        onShowAuth={() => openAuth('none')}
                        onDetailSheetChange={setIsDetailSheetOpen}
                        onGoToDeals={() => setModal('buyerDeals')}
                      />
                    </>
                  ) : (
                    <OperationalDashboard
                      session={session}
                      onAddInventory={openInventory}
                      onCreateOrder={openOrder}
                      onOpenSupplierDeals={() => setModal('supplierDeals')}
                      onOpenBuyerDeals={() => setModal('buyerDeals')}
                      refreshRef={dashboardRefresh}
                    />
                  )}
                </div>
              </Suspense>
            </div>
          </>
        ) : (
          <>
            <Header
              session={session}
              onOpenAdmin={() => adminStaff ? setModal('admin') : setModal('adminLogin')}
              onOpenSupplierDeals={() => setModal('supplierDeals')}
              onOpenBuyerDeals={() => setModal('buyerDeals')}
              onOpenSupplierInventory={() => setModal('supplierInventory')}
              onOpenPurchasedInventory={() => setModal('account')}
              onOpenDashboard={() => setMainView('dashboard')}
              onLogout={handleLogout}
            />
            <div className="overflow-y-auto" style={{ height: 'calc(100vh - 65px)' }}>
              <Suspense fallback={<LoadingFallback />}>
                <HeroSection />
                <MarketSection
                  onCreateOrder={openOrder}
                  onAddInventory={openInventory}
                  isAuthenticated={false}
                  onShowAuth={() => openAuth('none')}
                  onDetailSheetChange={setIsDetailSheetOpen}
                  onGoToDeals={() => openAuth('none')}
                />
              </Suspense>
              {!isDetailSheetOpen && (
                <BottomNavigation
                  onAddInventory={openInventory}
                  onCreateOrder={openOrder}
                  onOpenAccount={() => openAuth('none')}
                />
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Shared Modals ── */}
      <Suspense fallback={null}>
        {modal === 'orderBuilder' && (
          <OrderBuilder
            onClose={() => { setModal('none'); setAuthError(''); dashboardRefresh.current?.(); }}
            phone={session?.profile.phone}
            authError={authError}
            onRegisterComplete={async (data) => { await handleInlineRegister(data); await activateRole('buyer'); }}
            onLoginComplete={async (phone, pin) => { await handleInlineLogin(phone, pin); await activateRole('buyer'); }}
            onOpenDeals={() => { setModal('buyerDeals'); dashboardRefresh.current?.(); }}
            onOpenAccount={() => {
              setModal('none');
              dashboardRefresh.current?.();
            }}
          />
        )}

        {modal === 'inventoryBuilder' && (
          <InventoryBuilder
            onClose={() => { setModal('none'); setAuthError(''); setInventoryPrefill(undefined); setInventorySource('supplier_added'); dashboardRefresh.current?.(); }}
            phone={session?.profile.phone}
            onDepositComplete={() => activateRole('supplier')}
            authError={authError}
            onRegisterComplete={async (data) => { await handleInlineRegister(data); await activateRole('supplier'); }}
            onLoginComplete={async (phone, pin) => { await handleInlineLogin(phone, pin); await activateRole('supplier'); }}
            prefillOpportunity={inventoryPrefill}
            inventorySource={inventorySource}
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

        {modal === 'account' && session && (
          <AccountPage
            session={session}
            onClose={() => { setModal('none'); }}
            onAddInventory={openInventory}
            onCreateOrder={() => setModal('orderBuilder')}
            onLogout={handleLogout}
          />
        )}
      </Suspense>

    </div>
  );
}

export default App;
