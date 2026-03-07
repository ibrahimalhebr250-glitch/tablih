import { useState, useEffect } from 'react';
import { ShieldCheck, Home, ShoppingCart, Warehouse, Handshake, User, Sparkles, LayoutGrid } from 'lucide-react';
import type { AppSession } from '../types/session';
import { getTrustConfig } from './shared/TrustRatingBadge';
import { supabase } from '../lib/supabase';

interface Props {
  session: AppSession | null;
  onOpenAccount: () => void;
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
  onOpenAccount,
  onOpenAdmin,
  onOpenSupplierDeals,
  onOpenBuyerDeals,
  onOpenSupplierInventory,
  onOpenPurchasedInventory,
  onOpenDashboard,
  onLogout
}: Props) {
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);

  const isSupplier = session?.roles.includes('supplier');
  const isBuyer = session?.roles.includes('buyer');
  const isCompany = session?.profile.user_type === 'company';

  const displayName = isCompany
    ? (session?.profile.company_name || 'مستخدم')
    : (session?.profile.display_name || 'مستخدم');

  const initials = displayName.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('');
  const trustConfig = session ? getTrustConfig(session.profile.trust_rating || 3) : null;
  const TrustIcon = trustConfig?.icon;

  // جلب الصورة الشخصية
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

    // الاستماع للتحديثات في الوقت الفعلي
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
      className="flex items-center justify-between px-4 py-3 sticky top-0 z-50 border-b-2"
      style={{
        background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
        borderColor: '#e2e8f0',
        boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
      }}
      dir="rtl"
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
        <div className="text-right">
          <div className="flex items-center gap-1.5">
            <span className="text-[17px] font-black text-[#0a1f2e] tracking-tight">شبكة الطبليات</span>
            <Sparkles className="w-4 h-4 text-[#F59E0B]" />
          </div>
          <p className="text-[9px] text-[#64748b] font-medium">منصة توريد الطبليات</p>
        </div>
      </div>

      {/* Navigation Icons */}
      {session && (
        <div className="flex items-center gap-2">
          {/* Home Button */}
          {onOpenDashboard && (
            <button
              onClick={onOpenDashboard}
              className="flex flex-col items-center justify-center w-14 h-14 rounded-2xl active:scale-95 transition-all group relative overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
                border: '2px solid #93c5fd',
              }}
              aria-label="الرئيسية"
            >
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity"
                style={{
                  background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                }}
              />
              <Home className="w-6 h-6 text-[#2563eb] relative z-10 group-active:scale-90 transition-transform" />
              <span className="text-[8px] font-bold text-[#2563eb] mt-0.5 relative z-10">الرئيسية</span>
            </button>
          )}

          {/* Buyer Deals / Cart */}
          {isBuyer && onOpenBuyerDeals && (
            <button
              onClick={onOpenBuyerDeals}
              className="flex flex-col items-center justify-center w-14 h-14 rounded-2xl active:scale-95 transition-all group relative overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                border: '2px solid #fbbf24',
              }}
              aria-label="طلباتي"
            >
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity"
                style={{
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                }}
              />
              <ShoppingCart className="w-6 h-6 text-[#f59e0b] relative z-10 group-active:scale-90 transition-transform" />
              <span className="text-[8px] font-bold text-[#f59e0b] mt-0.5 relative z-10">طلباتي</span>
            </button>
          )}

          {/* Supplier Inventory / Cloud Warehouse */}
          {isSupplier && onOpenSupplierInventory && (
            <button
              onClick={onOpenSupplierInventory}
              className="flex flex-col items-center justify-center w-14 h-14 rounded-2xl active:scale-95 transition-all group relative overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)',
                border: '2px solid #6ee7b7',
              }}
              aria-label="مستودعي السحابي"
            >
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity"
                style={{
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                }}
              />
              <Warehouse className="w-6 h-6 text-[#10b981] relative z-10 group-active:scale-90 transition-transform" />
              <span className="text-[8px] font-bold text-[#10b981] mt-0.5 relative z-10">المستودع</span>
            </button>
          )}

          {/* Buyer Purchased Inventory */}
          {isBuyer && onOpenPurchasedInventory && (
            <button
              onClick={onOpenPurchasedInventory}
              className="flex flex-col items-center justify-center w-14 h-14 rounded-2xl active:scale-95 transition-all group relative overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)',
                border: '2px solid #6ee7b7',
              }}
              aria-label="مشترياتي"
            >
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity"
                style={{
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                }}
              />
              <Warehouse className="w-6 h-6 text-[#10b981] relative z-10 group-active:scale-90 transition-transform" />
              <span className="text-[8px] font-bold text-[#10b981] mt-0.5 relative z-10">مشترياتي</span>
            </button>
          )}

          {/* Supplier Deals */}
          {isSupplier && onOpenSupplierDeals && (
            <button
              onClick={onOpenSupplierDeals}
              className="flex flex-col items-center justify-center w-14 h-14 rounded-2xl active:scale-95 transition-all group relative overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)',
                border: '2px solid #a5b4fc',
              }}
              aria-label="صفقاتي"
            >
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity"
                style={{
                  background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                }}
              />
              <Handshake className="w-6 h-6 text-[#6366f1] relative z-10 group-active:scale-90 transition-transform" />
              <span className="text-[8px] font-bold text-[#6366f1] mt-0.5 relative z-10">الصفقات</span>
            </button>
          )}

          {/* Account Button */}
          <button
            onClick={onOpenAccount}
            className="flex flex-col items-center justify-center w-14 h-14 rounded-2xl active:scale-95 transition-all group relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
              border: '2px solid #cbd5e1',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            }}
            aria-label="حسابي"
          >
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
              style={{
                background: 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)',
              }}
            />
            {session && trustConfig && TrustIcon ? (
              <div className="relative">
                {profileImageUrl ? (
                  <div
                    className="w-9 h-9 rounded-xl overflow-hidden relative z-10 group-active:scale-90 transition-transform"
                    style={{
                      border: '2.5px solid white',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    }}
                  >
                    <img
                      src={profileImageUrl}
                      alt="الصورة الشخصية"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center relative z-10 group-active:scale-90 transition-transform"
                    style={{
                      background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                      border: '2.5px solid white',
                      boxShadow: '0 2px 8px rgba(99, 102, 241, 0.25)',
                    }}
                  >
                    <span className="text-[11px] font-black text-white">{initials}</span>
                  </div>
                )}
                <div
                  className="absolute -bottom-1 -right-1 w-5 h-5 rounded-lg flex items-center justify-center border-2 border-white z-20"
                  style={{
                    background: trustConfig.color,
                    boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                  }}
                >
                  <TrustIcon className="w-2.5 h-2.5 text-white" />
                </div>
              </div>
            ) : (
              <User className="w-6 h-6 text-[#64748b] relative z-10 group-active:scale-90 transition-transform" />
            )}
            <span
              className="text-[8px] font-bold mt-0.5 relative z-10 transition-colors group-hover:text-[#6366f1]"
              style={{ color: '#64748b' }}
            >
              حسابي
            </span>
          </button>

          {/* Admin Button */}
          <button
            onClick={onOpenAdmin}
            className="flex flex-col items-center justify-center w-14 h-14 rounded-2xl active:scale-95 transition-all group relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
              border: '2px solid #f87171',
            }}
            aria-label="الإدارة"
          >
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity"
              style={{
                background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
              }}
            />
            <ShieldCheck className="w-6 h-6 text-[#dc2626] relative z-10 group-active:scale-90 transition-transform" />
            <span className="text-[8px] font-bold text-[#dc2626] mt-0.5 relative z-10">الإدارة</span>
          </button>
        </div>
      )}
    </header>
  );
}
