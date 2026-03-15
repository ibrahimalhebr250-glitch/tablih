import { useSession } from './hooks/useSession';
import Marketplace from './pages/Marketplace';

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

  if (loading) return <LoadingScreen />;

  return <Marketplace />;
}

export default App;
