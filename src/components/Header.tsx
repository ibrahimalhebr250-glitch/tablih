import { User, ShieldCheck, LayoutGrid } from 'lucide-react';
import type { AppSession } from '../types/session';

interface Props {
  session: AppSession | null;
  onOpenAccount: () => void;
  onOpenAdmin: () => void;
}

export default function Header({ session, onOpenAccount, onOpenAdmin }: Props) {
  const initials = session?.profile.company_name
    ? session.profile.company_name.slice(0, 2)
    : '';

  return (
    <header className="flex items-center justify-between px-4 py-2.5 bg-white sticky top-0 z-50 border-b border-gray-100">
      <button
        onClick={onOpenAccount}
        className="relative w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 active:scale-95 transition-transform border"
        style={{
          background: session ? 'linear-gradient(135deg, #1a4a5e, #2c6f8a)' : '#f5f8fa',
          borderColor: session ? '#1a4a5e' : '#e5e9ec',
        }}
        aria-label="حسابي"
      >
        {session && initials ? (
          <span className="text-[12px] font-bold text-white leading-none">{initials}</span>
        ) : (
          <User className={`w-5 h-5 ${session ? 'text-white' : 'text-[#7a9aab]'}`} />
        )}
        {session && (
          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[#22c55e] rounded-full border-2 border-white" />
        )}
      </button>

      <div className="flex items-center gap-2.5">
        <span className="text-[16px] font-bold text-[#1a3a4a]">شبكة الطبليات</span>
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #1a4a5e, #2c6f8a)' }}
        >
          <LayoutGrid className="w-4 h-4 text-white" />
        </div>
      </div>

      <button
        onClick={onOpenAdmin}
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 active:scale-95 transition-all border"
        style={{ background: '#0f2535', borderColor: '#1a4a5e' }}
        aria-label="لوحة التحكم"
      >
        <ShieldCheck className="w-4.5 h-4.5 text-[#e74c3c]" />
      </button>
    </header>
  );
}
