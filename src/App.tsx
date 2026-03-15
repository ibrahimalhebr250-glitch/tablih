import { useState } from 'react';
import { useSession } from './hooks/useSession';
import Marketplace from './pages/Marketplace';
import ListingDetails from './pages/ListingDetails';
import SupplierRequests from './pages/SupplierRequests';
import SupplyRequestsMarketplace from './pages/SupplyRequestsMarketplace';
import BuyerOffers from './pages/BuyerOffers';

type Page =
  | { name: 'marketplace' }
  | { name: 'listing-details'; listingId: string }
  | { name: 'supplier-requests' }
  | { name: 'supply-requests' }
  | { name: 'buyer-offers'; requestId: string };

const LoadingScreen = () => (
  <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(180deg, #d6e4f0 0%, #e0ecf6 50%, #d6e4f0 100%)' }}>
    <div className="flex flex-col items-center gap-4">
      <div className="w-14 h-14 bg-[#1a4a5e] rounded-2xl flex items-center justify-center shadow-xl">
        <svg viewBox="0 0 20 20" className="w-8 h-8" fill="none">
          <rect x="2" y="2" width="6.5" height="6.5" rx="1.5" fill="white" />
          <rect x="11.5" y="2" width="6.5" height="6.5" rx="1.5" fill="white" />
          <rect x="2" y="11.5" width="6.5" height="6.5" rx="1.5" fill="white" />
          <rect x="11.5" y="11.5" width="6.5" height="6.5" rx="1.5" fill="white" />
        </svg>
      </div>
      <div className="w-6 h-6 border-2 border-[#1a4a5e] border-t-transparent rounded-full animate-spin" />
    </div>
  </div>
);

function App() {
  const { loading } = useSession();
  const [page, setPage] = useState<Page>({ name: 'marketplace' });

  if (loading) return <LoadingScreen />;

  if (page.name === 'listing-details') {
    return (
      <ListingDetails
        listingId={page.listingId}
        onBack={() => setPage({ name: 'marketplace' })}
      />
    );
  }

  if (page.name === 'supplier-requests') {
    return (
      <SupplierRequests
        onBack={() => setPage({ name: 'marketplace' })}
      />
    );
  }

  if (page.name === 'supply-requests') {
    return (
      <SupplyRequestsMarketplace
        onBack={() => setPage({ name: 'marketplace' })}
        onMakeOffer={(_requestId) => { }}
      />
    );
  }

  if (page.name === 'buyer-offers') {
    return (
      <BuyerOffers
        requestId={page.requestId}
        onBack={() => setPage({ name: 'marketplace' })}
      />
    );
  }

  return (
    <Marketplace
      onSelectListing={(id) => setPage({ name: 'listing-details', listingId: id })}
      onOpenSupplierDashboard={() => setPage({ name: 'supplier-requests' })}
      onOpenSupplyRequests={() => setPage({ name: 'supply-requests' })}
    />
  );
}

export default App;
