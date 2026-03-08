import { useState, useEffect } from 'react';
import {
  ArrowRight,
  Cloud,
  Handshake,
  ClipboardList,
  Settings,
  Warehouse,
  ShoppingCart,
  Camera,
  Pencil,
  LogOut,
} from 'lucide-react';
import type { AppSession } from '../../types/session';
import { supabase } from '../../lib/supabase';
import { getTrustConfig } from '../shared/TrustRatingBadge';
import AccountSummaryCards from './AccountSummaryCards';
import CloudWarehouseTab from './tabs/CloudWarehouseTab';
import DealsTab from './tabs/DealsTab';
import MyOrdersTab from './tabs/MyOrdersTab';
import SettingsTab from './tabs/SettingsTab';
import AccountEditSheet from './AccountEditSheet';

type AccountTab = 'warehouse' | 'deals' | 'orders' | 'settings';

interface InventoryPrefill {
  pallet_type?: string;
  size?: string;
  quality?: string;
  quantity?: number;
  city?: string;
}

interface Props {
  session: AppSession;
  onClose: () => void;
  onAddInventory: (prefill?: InventoryPrefill, source?: 'supplier_added' | 'purchase_transfer') => void;
  onCreateOrder: () => void;
  onLogout: () => void;
  initialTab?: AccountTab;
}

const TAB_CONFIG: { key: AccountTab; label: string; icon: typeof Cloud }[] = [
  { key: 'warehouse', label: 'مستودعي', icon: Cloud },
  { key: 'deals', label: 'الصفقات', icon: Handshake },
  { key: 'orders', label: 'طلباتي', icon: ClipboardList },
  { key: 'settings', label: 'الإعدادات', icon: Settings },
];

export default function AccountPage({ session, onClose, onAddInventory, onCreateOrder, onLogout, initialTab }: Props) {
  const [activeTab, setActiveTab] = useState<AccountTab>(initialTab || 'warehouse');
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [showEditSheet, setShowEditSheet] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [localSession, setLocalSession] = useState(session);
  const [stats, setStats] = useState({ inventory: 0, purchases: 0, activeDeals: 0, orders: 0 });

  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  const isCompany = localSession.profile.user_type === 'company';
  const displayName = isCompany
    ? (localSession.profile.company_name || 'مستخدم')
    : (localSession.profile.display_name || 'مستخدم');
  const initials = displayName.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  const trustConfig = getTrustConfig(3);
  const TrustIcon = trustConfig.icon;

  useEffect(() => {
    const fetchData = async () => {
      const phone = session.profile.phone;

      const [profileRes, invRes, purchasesRes, dealsRes, ordersRes] = await Promise.all([
        supabase.from('platform_users').select('profile_image_url').eq('phone', phone).maybeSingle(),
        supabase.from('inventory_batches').select('quantity', { count: 'exact' }).eq('phone', phone),
        supabase.from('buyer_inventory').select('id', { count: 'exact' }).eq('buyer_phone', phone),
        supabase.from('deals').select('id', { count: 'exact' }).or(`buyer_phone.eq.${phone},supplier_phone.eq.${phone}`).in('status', ['pending_supplier', 'matched', 'supplier_confirmed', 'awaiting_buyer', 'inventory_reserved', 'in_delivery']),
        supabase.from('orders').select('id', { count: 'exact' }).eq('phone', phone).in('status', ['pending', 'unmatched', 'partially_matched', 'matched']),
      ]);

      if (profileRes.data?.profile_image_url) {
        setProfileImageUrl(profileRes.data.profile_image_url);
      }

      const totalInventory = invRes.data?.reduce((sum, b) => sum + (b.quantity || 0), 0) || 0;

      setStats({
        inventory: totalInventory,
        purchases: purchasesRes.count || 0,
        activeDeals: dealsRes.count || 0,
        orders: ordersRes.count || 0,
      });
    };

    fetchData();
  }, [session.profile.phone]);

  const handleEditSaved = (updates: {
    display_name?: string;
    company_name?: string;
    city?: string;
    activity_type?: string;
    profile_image_url?: string | null;
  }) => {
    if (updates.profile_image_url !== undefined) {
      setProfileImageUrl(updates.profile_image_url);
    }
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
        return <CloudWarehouseTab phone={localSession.profile.phone} onAddInventory={onAddInventory} onAddInventoryWithPrefill={onAddInventory} />;
      case 'deals':
        return <DealsTab phone={localSession.profile.phone} />;
      case 'orders':
        return <MyOrdersTab phone={localSession.profile.phone} onCreateOrder={onCreateOrder} onGoToDeals={() => setActiveTab('deals')} onGoToWarehouse={() => setActiveTab('warehouse')} />;
      case 'settings':
        return <SettingsTab session={localSession} onLogout={onLogout} onEditProfile={() => setShowEditSheet(true)} />;
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'linear-gradient(180deg, #e8eff5 0%, #dce6ef 50%, #d0dce8 100%)' }}>
      {showEditSheet && (
        <AccountEditSheet
          session={localSession}
          profileImageUrl={profileImageUrl}
          onClose={() => setShowEditSheet(false)}
          onSaved={handleEditSaved}
        />
      )}

      {showLogoutConfirm && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center px-6"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
          onClick={() => setShowLogoutConfirm(false)}
        >
          <div
            className="w-full max-w-sm rounded-3xl p-6 space-y-4"
            style={{ background: 'white', boxShadow: '0 24px 60px rgba(0,0,0,0.3)' }}
            onClick={(e) => e.stopPropagation()}
            dir="rtl"
          >
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: '#FEF2F2' }}>
                <LogOut className="w-8 h-8 text-[#dc2626]" />
              </div>
              <h3 className="text-[17px] font-black text-[#1a3a4a]">تسجيل الخروج</h3>
              <p className="text-[13px] text-[#7a9aab] leading-relaxed">
                هل تريد تسجيل الخروج من حسابك؟
              </p>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-3 rounded-2xl text-[13px] font-bold text-[#4a6a7e]"
                style={{ background: '#f0f6fa', border: '1px solid #e2edf5' }}
              >
                إلغاء
              </button>
              <button
                onClick={onLogout}
                className="flex-1 py-3 rounded-2xl text-[13px] font-bold text-white"
                style={{ background: 'linear-gradient(135deg, #dc2626, #ef4444)', boxShadow: '0 4px 12px rgba(220,38,38,0.3)' }}
              >
                تسجيل الخروج
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header
        className="flex-shrink-0 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0f2535 0%, #1a4a5e 50%, #1e5c75 100%)' }}
      >
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-40 h-40 rounded-full" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.2) 0%, transparent 70%)', transform: 'translate(30%, -30%)' }} />
          <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%)', transform: 'translate(-20%, 40%)' }} />
        </div>

        <div className="relative px-4 pt-4 pb-5" dir="rtl">
          <div className="flex items-center justify-between mb-5">
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center active:scale-95 transition-transform backdrop-blur-sm border border-white/10"
            >
              <ArrowRight className="w-5 h-5 text-white" />
            </button>
            <h1 className="text-[16px] font-bold text-white">حسابي</h1>
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="w-10 h-10 rounded-xl flex items-center justify-center active:scale-95 transition-transform backdrop-blur-sm border border-red-400/30"
              style={{ background: 'rgba(220,38,38,0.15)' }}
              title="تسجيل الخروج"
            >
              <LogOut className="w-4 h-4 text-red-300" />
            </button>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <button
                onClick={() => setShowEditSheet(true)}
                className="w-[68px] h-[68px] rounded-2xl overflow-hidden flex-shrink-0 flex items-center justify-center active:scale-95 transition-transform"
                style={{
                  background: profileImageUrl ? 'transparent' : 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                  border: '3px solid rgba(255,255,255,0.25)',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                }}
              >
                {profileImageUrl ? (
                  <img src={profileImageUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[22px] font-black text-white">{initials}</span>
                )}
              </button>
              <button
                onClick={() => setShowEditSheet(true)}
                className="absolute -bottom-1 -left-1 w-7 h-7 rounded-lg flex items-center justify-center border-2 border-[#1a4a5e] active:scale-95 transition-transform"
                style={{ background: 'linear-gradient(135deg, #0ea5e9, #0284c7)', boxShadow: '0 2px 8px rgba(14,165,233,0.3)' }}
              >
                <Camera className="w-3.5 h-3.5 text-white" />
              </button>
              <div
                className="absolute -top-1 -right-1 w-6 h-6 rounded-lg flex items-center justify-center border-2 border-[#1a4a5e]"
                style={{ background: trustConfig.color, boxShadow: '0 2px 6px rgba(0,0,0,0.2)' }}
              >
                <TrustIcon className="w-3 h-3 text-white" />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowEditSheet(true)}
                  className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center active:scale-90 transition-transform border border-white/10 flex-shrink-0"
                >
                  <Pencil className="w-3.5 h-3.5 text-white/70" />
                </button>
                <h2 className="text-[18px] font-bold text-white truncate">{displayName}</h2>
              </div>
              <p className="text-[12px] text-white/50 mt-0.5" dir="ltr">{localSession.profile.phone}</p>
              <div className="flex items-center gap-2 mt-2">
                {localSession.roles.includes('supplier') && (
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg" style={{ background: 'rgba(34,197,94,0.2)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.3)' }}>
                    <Warehouse className="w-3 h-3 inline-block ml-1" />
                    مورّد
                  </span>
                )}
                {localSession.roles.includes('buyer') && (
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg" style={{ background: 'rgba(59,130,246,0.2)', color: '#93c5fd', border: '1px solid rgba(59,130,246,0.3)' }}>
                    <ShoppingCart className="w-3 h-3 inline-block ml-1" />
                    مشتري
                  </span>
                )}
                {localSession.profile.city && (
                  <span className="text-[10px] text-white/40">{localSession.profile.city}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Summary Cards */}
      <div className="flex-shrink-0 -mt-1">
        <AccountSummaryCards stats={stats} />
      </div>

      {/* Tab Navigation */}
      <div className="flex-shrink-0 px-4 pt-3 pb-1">
        <div
          className="flex gap-1 p-1 rounded-2xl"
          style={{ background: 'rgba(255,255,255,0.7)', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', border: '1px solid rgba(255,255,255,0.9)' }}
          dir="rtl"
        >
          {TAB_CONFIG.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[12px] font-bold transition-all ${
                  isActive
                    ? 'text-white shadow-lg'
                    : 'text-[#5a7a8a] hover:text-[#1a4a5e] hover:bg-white/50'
                }`}
                style={isActive ? {
                  background: 'linear-gradient(135deg, #1a4a5e 0%, #2c6f8a 100%)',
                  boxShadow: '0 4px 12px rgba(26,74,94,0.3)',
                } : undefined}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto px-4 pt-3 pb-6" style={{ scrollbarWidth: 'thin', scrollbarColor: '#b8d0e0 transparent' }}>
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-200" key={activeTab}>
          {renderTab()}
        </div>
      </div>
    </div>
  );
}
