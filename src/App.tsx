import { useSession } from './hooks/useSession';

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

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #bbd0df 0%, #cbdeef 40%, #dbe8f3 70%, #c3d9e8 100%)' }}>
      <div className="text-center px-8">
        <div className="w-16 h-16 bg-[#1a4a5e] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
          <svg viewBox="0 0 20 20" className="w-9 h-9" fill="none">
            <rect x="2" y="2" width="6.5" height="6.5" rx="1.5" fill="white" />
            <rect x="11.5" y="2" width="6.5" height="6.5" rx="1.5" fill="white" />
            <rect x="2" y="11.5" width="6.5" height="6.5" rx="1.5" fill="white" />
            <rect x="11.5" y="11.5" width="6.5" height="6.5" rx="1.5" fill="white" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-[#1a4a5e] mb-2">منصة باليت</h1>
        <p className="text-[#7a9aab] text-sm">جاهز للبناء من جديد</p>
      </div>
    </div>
  );
}

export default App;
