import { useState, useEffect } from 'react';
import { Home, Sparkles, LayoutGrid } from 'lucide-react';
import type { AppSession } from '../../types/session';
import { getTrustConfig } from './TrustRatingBadge';
import { supabase } from '../../lib/supabase';
import { useTranslation } from '../../lib/i18n';
import LanguageSwitcher from './LanguageSwitcher';

interface Props {
  session: AppSession;
  currentView: 'marketplace' | 'orders' | 'inventory' | 'deals' | 'account';
  onNavigate: (view: 'marketplace' | 'orders' | 'inventory' | 'deals' | 'account') => void;
  onLogout: () => void;
}

export default function TopNavigation({ session, currentView, onNavigate }: Props) {
  const { t, isRTL } = useTranslation();
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);

  const isCompany = session.profile.user_type === 'company';

  const displayName = isCompany
    ? (session.profile.company_name || (isRTL ? 'مستخدم' : 'User'))
    : (session.profile.display_name || (isRTL ? 'مستخدم' : 'User'));

  const initials = displayName.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('');
  const trustConfig = getTrustConfig(3);
  const TrustIcon = trustConfig.icon;

  useEffect(() => {
    const fetchProfileImage = async () => {
      const { data } = await supabase
        .from('platform_users')
        .select('profile_image_url')
        .eq('phone', session.profile.phone)
        .maybeSingle();

      if (data?.profile_image_url) {
        setProfileImageUrl(data.profile_image_url);
      }
    };

    fetchProfileImage();

    const channel = supabase
      .channel('topnav_profile_image_updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'platform_users',
          filter: `phone=eq.${session.profile.phone}`,
        },
        (payload: any) => {
          if (payload.new?.profile_image_url !== undefined) {
            setProfileImageUrl(payload.new.profile_image_url);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session.profile.phone]);

  return (
    <header
      className="flex items-center justify-between px-4 py-3 sticky top-0 z-50 border-b-2"
      style={{
        background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
        borderColor: '#e2e8f0',
        boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
        direction: isRTL ? 'rtl' : 'ltr',
      }}
    >
      {/* Logo Section */}
      <div className="flex items-center gap-3">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{
            background: 'linear-gradient(135deg, #0f2535 0%, #1a4a5e 50%, #2c6f8a 100%)',
            boxShadow: '0 6px 20px rgba(15,37,53,0.25)',
          }}
        >
          <LayoutGrid className="w-5 h-5 text-white" />
        </div>
        <div className={`hidden sm:block ${isRTL ? 'text-right' : 'text-left'}`}>
          <div className="flex items-center gap-1.5">
            <span className="text-[17px] font-black text-[#0a1f2e] tracking-tight">
              {isRTL ? 'شبكة الطبليات' : 'Pallet Network'}
            </span>
            <Sparkles className="w-4 h-4 text-[#F59E0B]" />
          </div>
          <p className="text-[9px] text-[#64748b] font-medium">{t('marketplace.subtitle')}</p>
        </div>
      </div>

      {/* Navigation Icons */}
      <div className="flex items-center gap-2">
        <LanguageSwitcher />

        {/* Home Button */}
        <button
          onClick={() => onNavigate('marketplace')}
          className={`flex flex-col items-center justify-center w-14 h-14 rounded-2xl active:scale-95 transition-all group relative overflow-hidden ${
            currentView === 'marketplace' ? 'ring-2 ring-offset-2 ring-[#2563eb]' : ''
          }`}
          style={{
            background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
            border: '2px solid #93c5fd',
          }}
          aria-label={t('navigation.home')}
        >
          <div
            className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity"
            style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}
          />
          <Home className="w-6 h-6 text-[#2563eb] relative z-10 group-active:scale-90 transition-transform" />
          <span className="text-[8px] font-bold text-[#2563eb] mt-0.5 relative z-10">{t('navigation.home')}</span>
        </button>

        {/* Account Button */}
        <button
          onClick={() => onNavigate('account')}
          className={`flex flex-col items-center justify-center w-14 h-14 rounded-2xl active:scale-95 transition-all group relative overflow-hidden ${
            currentView === 'account' ? 'ring-2 ring-offset-2 ring-[#1a4a5e]' : ''
          }`}
          style={{
            background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
            border: '2px solid #cbd5e1',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          }}
          aria-label={t('navigation.myAccount')}
        >
          <div
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ background: 'linear-gradient(135deg, #e4eff6 0%, #d0dfe8 100%)' }}
          />
          <div className="relative">
            {profileImageUrl ? (
              <div
                className="w-9 h-9 rounded-xl overflow-hidden relative z-10 group-active:scale-90 transition-transform"
                style={{ border: '2.5px solid white', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
              >
                <img
                  src={profileImageUrl}
                  alt={t('navigation.myAccount')}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center relative z-10 group-active:scale-90 transition-transform"
                style={{
                  background: 'linear-gradient(135deg, #1a4a5e 0%, #2c6f8a 100%)',
                  border: '2.5px solid white',
                  boxShadow: '0 2px 8px rgba(26, 74, 94, 0.25)',
                }}
              >
                <span className="text-[11px] font-black text-white">{initials}</span>
              </div>
            )}
            <div
              className="absolute -bottom-1 -right-1 w-5 h-5 rounded-lg flex items-center justify-center border-2 border-white z-20"
              style={{ background: trustConfig.color, boxShadow: '0 2px 6px rgba(0,0,0,0.15)' }}
            >
              <TrustIcon className="w-2.5 h-2.5 text-white" />
            </div>
          </div>
          <span
            className="text-[8px] font-bold mt-0.5 relative z-10 transition-colors group-hover:text-[#1a4a5e]"
            style={{ color: '#64748b' }}
          >
            {t('navigation.myAccount')}
          </span>
        </button>
      </div>
    </header>
  );
}
