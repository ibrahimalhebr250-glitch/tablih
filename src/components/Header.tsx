import { useState, useEffect } from 'react';
import { ShieldCheck, Home, Sparkles, LayoutGrid } from 'lucide-react';
import type { AppSession } from '../types/session';
import { supabase } from '../lib/supabase';
import { useTranslation } from '../lib/i18n';
import LanguageSwitcher from './shared/LanguageSwitcher';

interface Props {
  session: AppSession | null;
  onOpenAdmin: () => void;
  onOpenSupplierDeals?: () => void;
  onOpenBuyerDeals?: () => void;
  onOpenSupplierInventory?: () => void;
  onOpenPurchasedInventory?: () => void;
  onOpenDashboard?: () => void;
  onLogout: () => void;
}

export default function Header({
  session,
  onOpenAdmin,
  onOpenDashboard,
}: Props) {
  const { t, isRTL } = useTranslation();
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.profile.phone) return;

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
      .channel('profile_image_updates')
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
  }, [session?.profile.phone]);

  return (
    <header
      className="flex items-center justify-between px-4 py-3 sticky top-0 z-50 border-b-2 overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
        borderColor: '#e2e8f0',
        boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
        maxWidth: '100vw',
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
        <div className={isRTL ? 'text-right' : 'text-left'}>
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

        {session && (
          <>
            {onOpenDashboard && (
              <button
                onClick={onOpenDashboard}
                className="flex flex-col items-center justify-center w-14 h-14 rounded-2xl active:scale-95 transition-all group relative overflow-hidden"
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
            )}

            <button
              onClick={onOpenAdmin}
              className="flex flex-col items-center justify-center w-14 h-14 rounded-2xl active:scale-95 transition-all group relative overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
                border: '2px solid #f87171',
              }}
              aria-label={t('navigation.admin')}
            >
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity"
                style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)' }}
              />
              <ShieldCheck className="w-6 h-6 text-[#dc2626] relative z-10 group-active:scale-90 transition-transform" />
              <span className="text-[8px] font-bold text-[#dc2626] mt-0.5 relative z-10">{t('navigation.admin')}</span>
            </button>
          </>
        )}
      </div>
    </header>
  );
}
