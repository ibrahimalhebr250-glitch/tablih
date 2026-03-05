import { useState, useEffect } from 'react';
import {
  ArrowRight, User, Phone, MapPin, Briefcase, LogOut,
  Check, Building2, CircleUser as UserCircle, Handshake,
  ShoppingBag, Pencil, X, ChevronLeft, Bell, Shield,
  LayoutDashboard, Settings, AlertTriangle, Sparkles,
  Trash2, Clock, CheckCircle2, AlertCircle, ChevronDown,
  ClipboardList, Plus, Send, Radar, Star,
} from 'lucide-react';
import type { AppSession } from '../../types/session';
import { SAUDI_CITIES, PALLET_TYPES, PALLET_SIZES, QUALITY_LABELS } from '../../types/inventory';
import type { PalletQuality } from '../../types/inventory';
import { useDashboard } from '../../hooks/useDashboard';
import { supabase } from '../../lib/supabase';
import { getTrustConfig } from '../shared/TrustRatingBadge';

interface Props {
  session: AppSession;
  freshLogin?: boolean;
  onClose: () => void;
  onLogout: () => void;
  onUpdateProfile: (updates: { company_name?: string; display_name?: string; city?: string; activity_type?: string }) => Promise<void>;
  onOpenSupplierDeals?: () => void;
  onOpenBuyerDeals?: () => void;
  onOpenSupplierInventory?: () => void;
  onExplore?: () => void;
}

const ACTIVITY_TYPES = [
  'توزيع وتوريد',
  'تصنيع وإنتاج',
  'تجزئة وبيع',
  'لوجستيات ونقل',
  'تصدير واستيراد',
  'أخرى',
];

const ORDER_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: typeof Clock }> = {
  pending:   { label: 'قيد الانتظار', color: '#F59E0B', bg: '#FFFBEB', icon: Clock },
  matched:   { label: 'تمت المطابقة', color: '#27AE60', bg: '#E8F8F0', icon: CheckCircle2 },
  unmatched: { label: 'يتتبع المخزون', color: '#0369A1', bg: '#E0F2FE', icon: Radar },
  executed:  { label: 'منفّذ', color: '#6B7280', bg: '#F3F4F6', icon: CheckCircle2 },
};

const QUALITY_COLORS: Record<string, { dot: string; text: string; bg: string }> = {
  A:     { dot: '#27AE60', text: '#27AE60', bg: '#E8F8F0' },
  B:     { dot: '#2196F3', text: '#2196F3', bg: '#EBF5FF' },
  C:     { dot: '#F59E0B', text: '#92400E', bg: '#FFFBEB' },
  Scrap: { dot: '#9CA3AF', text: '#6B7280', bg: '#F3F4F6' },
};

const QUALITY_KEYS: PalletQuality[] = ['A', 'B', 'C', 'Scrap'];

function OrderEditSheet({ order, onClose, onSave }: {
  order: { id: string; request_id: string; pallet_type: string; size: string; quality: string; quantity: number; city: string };
  onClose: () => void;
  onSave: (data: { pallet_type?: string; size?: string; quality?: string; quantity?: number; city?: string }) => Promise<void>;
}) {
  const [palletType, setPalletType] = useState(order.pallet_type);
  const [size, setSize] = useState(order.size);
  const [quality, setQuality] = useState<PalletQuality>(order.quality as PalletQuality);
  const [quantity, setQuantity] = useState(order.quantity.toString());
  const [city, setCity] = useState(order.city);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [cityOpen, setCityOpen] = useState(false);

  const handleSave = async () => {
    const qty = Number(quantity);
    if (!palletType || !size || !quality || !city || isNaN(qty) || qty <= 0) return;
    setSaving(true);
    await onSave({ pallet_type: palletType, size, quality, quantity: qty, city });
    setSaving(false);
    setSaved(true);
    setTimeout(() => { setSaved(false); onClose(); }, 800);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:w-[480px] max-h-[92vh] flex flex-col bg-white sm:rounded-3xl rounded-t-3xl overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
            <X className="w-4 h-4 text-gray-500" />
          </button>
          <div className="text-right">
            <p className="text-[14px] font-bold text-[#1a4a5e]">تعديل الطلب</p>
            <p className="text-[11px] text-[#7a9aab] font-mono">{order.request_id}</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5" dir="rtl">
          <div>
            <p className="text-[12px] font-bold text-[#1a4a5e] mb-2">نوع الطبلية</p>
            <div className="grid grid-cols-3 gap-2">
              {PALLET_TYPES.map(({ value }) => (
                <button
                  key={value}
                  onClick={() => setPalletType(value)}
                  className="py-2.5 rounded-xl text-[12px] font-bold border-2 transition-all"
                  style={{
                    background: palletType === value ? '#2196F3' : 'white',
                    borderColor: palletType === value ? '#2196F3' : '#e5e7eb',
                    color: palletType === value ? 'white' : '#374151',
                  }}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[12px] font-bold text-[#1a4a5e] mb-2">المقاس</p>
            <div className="flex flex-wrap gap-2">
              {PALLET_SIZES.map((s) => (
                <button
                  key={s}
                  onClick={() => setSize(s)}
                  className="px-3 py-2 rounded-xl text-[12px] font-bold border-2 transition-all"
                  style={{
                    background: size === s ? '#2196F3' : 'white',
                    borderColor: size === s ? '#2196F3' : '#e5e7eb',
                    color: size === s ? 'white' : '#374151',
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[12px] font-bold text-[#1a4a5e] mb-2">الدرجة</p>
            <div className="grid grid-cols-4 gap-2">
              {QUALITY_KEYS.map((q) => {
                const qc = QUALITY_COLORS[q];
                const isSelected = quality === q;
                return (
                  <button
                    key={q}
                    onClick={() => setQuality(q)}
                    className="py-2.5 rounded-xl text-[11px] font-bold border-2 transition-all"
                    style={{
                      background: isSelected ? qc.bg : 'white',
                      borderColor: isSelected ? qc.dot : '#e5e7eb',
                      color: isSelected ? qc.text : '#6b7280',
                    }}
                  >
                    {QUALITY_LABELS[q].ar}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-bold text-[#1a4a5e] mb-2">الكمية (طبلية)</label>
            <div className="relative">
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="أدخل الكمية"
                min={1}
                className="w-full pr-4 pl-16 py-3.5 rounded-xl border-2 border-gray-200 bg-gray-50 focus:border-[#2196F3] focus:bg-white text-[18px] font-bold text-[#1a4a5e] text-right outline-none transition-colors"
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[13px] font-bold text-[#7a9aab]">طبلية</span>
            </div>
          </div>

          <div>
            <p className="text-[12px] font-bold text-[#1a4a5e] mb-2">المدينة</p>
            <button
              onClick={() => setCityOpen(!cityOpen)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 border-gray-200 bg-gray-50 text-right"
            >
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${cityOpen ? 'rotate-180' : ''}`} />
              <span className="text-[13px] font-bold text-[#1a4a5e]">{city || 'اختر المدينة'}</span>
            </button>
            {cityOpen && (
              <div className="mt-1 border-2 border-gray-200 rounded-xl overflow-hidden max-h-44 overflow-y-auto">
                {SAUDI_CITIES.map((c) => (
                  <button
                    key={c}
                    onClick={() => { setCity(c); setCityOpen(false); }}
                    className="w-full text-right px-4 py-2.5 text-[12px] font-bold transition-colors hover:bg-gray-50"
                    style={{ color: city === c ? '#2196F3' : '#374151', background: city === c ? '#EBF5FF' : 'white' }}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex-shrink-0 p-5 pt-3 border-t border-gray-100">
          <button
            onClick={handleSave}
            disabled={saving || !palletType || !size || !quality || !city || !quantity || Number(quantity) <= 0}
            className="w-full py-3.5 rounded-2xl text-[14px] font-bold text-white flex items-center justify-center gap-2 active:scale-[0.97] transition-all disabled:opacity-50"
            style={{
              background: saved
                ? 'linear-gradient(135deg, #27AE60, #1E8449)'
                : 'linear-gradient(135deg, #2196F3, #1565C0)',
              boxShadow: saved ? '0 4px 14px rgba(39,174,96,0.3)' : '0 4px 14px rgba(33,150,243,0.3)',
            }}
          >
            {saved ? (
              <><Check className="w-4 h-4" /><span>تم الحفظ</span></>
            ) : saving ? (
              <span>جارٍ الحفظ...</span>
            ) : (
              <><Pencil className="w-4 h-4" /><span>حفظ التعديلات</span></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function AvatarInitials({ name, isCompany }: { name: string; isCompany: boolean }) {
  const initials = name
    ? name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('')
    : isCompany ? 'ش' : 'م';

  return (
    <div
      className="relative flex items-center justify-center select-none"
      style={{
        width: 72,
        height: 72,
        borderRadius: 20,
        background: isCompany
          ? 'linear-gradient(135deg, #0f2535, #1a4a5e)'
          : 'linear-gradient(135deg, #1a6640, #27AE60)',
        boxShadow: isCompany
          ? '0 8px 28px rgba(15,37,53,0.40)'
          : '0 8px 28px rgba(39,174,96,0.38)',
      }}
    >
      <span className="text-[24px] font-black text-white tracking-tighter leading-none">{initials}</span>
      <div
        className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center border-2 border-white"
        style={{ background: isCompany ? '#2196F3' : '#16a34a' }}
      >
        {isCompany
          ? <Building2 className="w-2.5 h-2.5 text-white" />
          : <UserCircle className="w-2.5 h-2.5 text-white" />
        }
      </div>
    </div>
  );
}

function EditableField({
  label, value, placeholder, icon, iconBg, iconColor, editing, type = 'text',
  onChange, options,
}: {
  label: string; value: string; placeholder: string;
  icon: React.ReactNode; iconBg: string; iconColor: string;
  editing: boolean; type?: string;
  onChange: (v: string) => void;
  options?: string[];
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5" dir="rtl">
      <div
        className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: iconBg }}
      >
        <span style={{ color: iconColor }}>{icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-[#9ab0bf] mb-0.5">{label}</p>
        {editing ? (
          options ? (
            <select
              value={value}
              onChange={e => onChange(e.target.value)}
              className="w-full text-right text-[13px] font-semibold text-[#1a2f3e] bg-[#f0f7fc] border border-[#c8dfe9] rounded-lg px-2 py-1.5 outline-none focus:border-[#2196F3] transition-colors"
            >
              <option value="">{placeholder}</option>
              {options.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          ) : (
            <input
              value={value}
              onChange={e => onChange(e.target.value)}
              placeholder={placeholder}
              className="w-full text-right text-[13px] font-semibold text-[#1a2f3e] bg-[#f0f7fc] border border-[#c8dfe9] rounded-lg px-2 py-1.5 outline-none focus:border-[#2196F3] transition-colors"
            />
          )
        ) : (
          <p className="text-[13px] font-semibold text-[#1a2f3e] truncate">
            {value || <span className="text-[#b8cdd8] font-normal">{placeholder}</span>}
          </p>
        )}
      </div>
    </div>
  );
}

type TabView = 'home' | 'profile';

export default function AccountPage({ session, freshLogin = false, onClose, onLogout, onUpdateProfile, onOpenSupplierDeals, onOpenBuyerDeals, onOpenSupplierInventory, onExplore }: Props) {
  const [activeTab, setActiveTab] = useState<TabView>('home');
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(session.profile.display_name ?? '');
  const [companyName, setCompanyName] = useState(session.profile.company_name ?? '');
  const [city, setCity] = useState(session.profile.city ?? '');
  const [activityType, setActivityType] = useState(session.profile.activity_type ?? '');
  const [saving, setSaving] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showWelcome, setShowWelcome] = useState(freshLogin);

  const [trustRating, setTrustRating] = useState<number>(3);
  const [completedDeals, setCompletedDeals] = useState<number>(0);

  useEffect(() => {
    const phone = session.profile.phone;
    supabase
      .from('platform_users')
      .select('trust_rating')
      .eq('phone', phone)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.trust_rating) setTrustRating(data.trust_rating);
      });

    Promise.all([
      supabase.from('deals').select('id', { count: 'exact', head: true }).eq('supplier_phone', phone).eq('status', 'completed'),
      supabase.from('deals').select('id', { count: 'exact', head: true }).eq('buyer_phone', phone).eq('status', 'completed'),
    ]).then(([s, b]) => {
      setCompletedDeals((s.count ?? 0) + (b.count ?? 0));
    });
  }, [session.profile.phone]);

  const { orders, loading: ordersLoading, refresh: refreshOrders, updateOrder, } = useDashboard(session.profile.phone);
  const [editingOrder, setEditingOrder] = useState<typeof orders[0] | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDeleteOrder = async (orderId: string) => {
    setDeletingId(orderId);
    await supabase.from('orders').delete().eq('id', orderId).eq('phone', session.profile.phone);
    setDeletingId(null);
    setConfirmDeleteId(null);
    refreshOrders();
  };

  useEffect(() => {
    if (freshLogin) {
      const t = setTimeout(() => setShowWelcome(false), 3500);
      return () => clearTimeout(t);
    }
  }, [freshLogin]);

  const isCompany = session.profile.user_type === 'company';
  const profileName = isCompany ? (companyName || displayName) : displayName;
  const isSupplier = session.roles.includes('supplier');
  const isBuyer = session.roles.includes('buyer');

  const handleSave = async () => {
    setSaving(true);
    await onUpdateProfile({ display_name: displayName, company_name: companyName, city, activity_type: activityType });
    setSaving(false);
    setEditing(false);
  };

  const handleCancel = () => {
    setDisplayName(session.profile.display_name ?? '');
    setCompanyName(session.profile.company_name ?? '');
    setCity(session.profile.city ?? '');
    setActivityType(session.profile.activity_type ?? '');
    setEditing(false);
  };

  const handleExplore = () => {
    onExplore?.();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end lg:items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-md" onClick={onClose} />

      <div
        className="relative w-full lg:w-[500px] lg:rounded-3xl overflow-hidden flex flex-col slide-up"
        style={{
          background: '#f0f6fa',
          boxShadow: '0 40px 100px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.15)',
          maxHeight: '92vh',
        }}
      >
        {/* Header */}
        <div
          className="relative flex-shrink-0 px-5 pt-5 pb-0 overflow-hidden"
          style={{ background: 'linear-gradient(160deg, #0a1e2e 0%, #0f3048 55%, #14496e 100%)' }}
        >
          <div className="absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage: 'radial-gradient(circle at 20% 50%, #fff 0%, transparent 50%), radial-gradient(circle at 80% 20%, #fff 0%, transparent 40%)',
            }}
          />

          <div className="relative flex items-center justify-between mb-4">
            <div className="w-9 h-9" />
            <h2 className="text-[15px] font-bold text-white">حسابي</h2>
            <button
              onClick={onClose}
              className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center transition-colors"
            >
              <ArrowRight className="w-4 h-4 text-white" />
            </button>
          </div>

          {/* Profile identity row */}
          <div className="relative flex items-center gap-4 pb-5" dir="rtl">
            <AvatarInitials name={profileName} isCompany={isCompany} />
            <div className="flex-1 min-w-0">
              <h3 className="text-[17px] font-black text-white leading-tight truncate">
                {profileName || <span className="text-white/40 font-normal text-[14px]">لم يُحدد الاسم</span>}
              </h3>
              <p className="text-[12px] text-white/50 mt-0.5 font-mono">{session.profile.phone}</p>
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                <span
                  className="text-[9px] font-bold px-2 py-0.5 rounded-full border"
                  style={{
                    background: isCompany ? 'rgba(33,150,243,0.15)' : 'rgba(39,174,96,0.15)',
                    color: isCompany ? '#7ec8fa' : '#6ee8a0',
                    borderColor: isCompany ? 'rgba(33,150,243,0.25)' : 'rgba(39,174,96,0.25)',
                  }}
                >
                  {isCompany ? 'حساب شركة' : 'حساب فردي'}
                </span>
                {isSupplier && (
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full border"
                    style={{ background: 'rgba(39,174,96,0.15)', color: '#6ee8a0', borderColor: 'rgba(39,174,96,0.25)' }}>
                    مورّد
                  </span>
                )}
                {isBuyer && (
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full border"
                    style={{ background: 'rgba(33,150,243,0.15)', color: '#7ec8fa', borderColor: 'rgba(33,150,243,0.25)' }}>
                    مشتري
                  </span>
                )}
              </div>
            </div>
          </div>

          <div
            className="relative mx-0 mb-1 rounded-xl px-4 py-3 flex items-center justify-between"
            style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(8px)' }}
            dir="rtl"
          >
            <div className="flex items-center gap-2">
              {(() => {
                const tc = getTrustConfig(trustRating);
                const Icon = tc.icon;
                return (
                  <>
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ background: `${tc.color}20` }}
                    >
                      <Icon className="w-4 h-4" style={{ color: tc.color }} />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold" style={{ color: tc.color }}>{tc.label}</p>
                      <div className="flex items-center gap-0.5 mt-0.5">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <Star
                            key={i}
                            className="w-2.5 h-2.5"
                            style={{
                              color: i <= trustRating ? tc.color : 'rgba(255,255,255,0.15)',
                              fill: i <= trustRating ? tc.color : 'none',
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
            {completedDeals > 0 && (
              <div className="flex items-center gap-1.5">
                <Handshake className="w-3.5 h-3.5 text-white/40" />
                <span className="text-[12px] font-bold text-white/70">{completedDeals}</span>
                <span className="text-[10px] text-white/40">صفقة مكتملة</span>
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="relative flex gap-1 pb-0" dir="rtl">
            <button
              onClick={() => setActiveTab('home')}
              className="flex items-center gap-1.5 px-4 py-2.5 text-[12px] font-bold transition-all relative"
              style={{
                color: activeTab === 'home' ? '#fff' : 'rgba(255,255,255,0.45)',
              }}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              الرئيسية
              {activeTab === 'home' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white rounded-t-full" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('profile')}
              className="flex items-center gap-1.5 px-4 py-2.5 text-[12px] font-bold transition-all relative"
              style={{
                color: activeTab === 'profile' ? '#fff' : 'rgba(255,255,255,0.45)',
              }}
            >
              <Settings className="w-3.5 h-3.5" />
              الإعدادات
              {activeTab === 'profile' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white rounded-t-full" />
              )}
            </button>
          </div>

          <div
            className="absolute bottom-0 left-0 right-0 h-5"
            style={{ background: '#f0f6fa', borderRadius: '20px 20px 0 0' }}
          />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 pt-3 pb-6 space-y-3" style={{ scrollbarWidth: 'thin', scrollbarColor: '#b8d0e0 transparent' }}>

          {/* ── HOME TAB ── */}
          {activeTab === 'home' && (
            <>
              {/* Welcome banner — shown only after fresh login */}
              {showWelcome && (
                <div
                  className="relative overflow-hidden rounded-2xl px-4 py-4"
                  dir="rtl"
                  style={{
                    background: 'linear-gradient(135deg, #0f2535 0%, #1a4a5e 60%, #1e6080 100%)',
                    animation: 'fadeIn 0.4s ease-out',
                  }}
                >
                  <div className="absolute inset-0 opacity-[0.08]"
                    style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, #fff 0%, transparent 55%)' }} />
                  <div className="relative flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: 'rgba(255,255,255,0.12)' }}
                    >
                      <Sparkles className="w-5 h-5 text-[#7ec8fa]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-black text-white leading-snug">
                        {(() => {
                          const h = new Date().getHours();
                          const name = (session.profile.company_name || session.profile.display_name || '').split(' ')[0];
                          const greeting = h < 12 ? 'صباح الخير' : h < 17 ? 'مساء الخير' : 'مساء النور';
                          return name ? `${greeting}، ${name}` : greeting;
                        })()}
                      </p>
                      <p className="text-[11px] text-white/50 mt-0.5">أهلاً بك في شبكة الطبليات</p>
                    </div>
                    <button
                      onClick={() => setShowWelcome(false)}
                      className="w-6 h-6 flex items-center justify-center flex-shrink-0 opacity-40 hover:opacity-70 transition-opacity"
                    >
                      <X className="w-3.5 h-3.5 text-white" />
                    </button>
                  </div>
                  <div
                    className="absolute bottom-0 right-0 h-0.5 rounded-full bg-white/20"
                    style={{
                      animation: 'shrinkBar 3.5s linear forwards',
                      width: '100%',
                      transformOrigin: 'right',
                    }}
                  />
                </div>
              )}

              {/* Supplier section */}
              {isSupplier && (
                <div className="space-y-2.5" dir="rtl">
                  <p className="text-[11px] font-bold text-[#7a9aab] px-1">مورّد</p>
                  {onOpenSupplierInventory && (
                    <button
                      onClick={() => { onClose(); onOpenSupplierInventory(); }}
                      className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-white border border-[#e4f0f5] shadow-sm active:scale-[0.97] transition-all hover:border-[#1565C0]/40 hover:shadow-md"
                    >
                      <div className="flex-1 text-right">
                        <p className="text-[13px] font-bold text-[#1a2f3e]">مخزوني</p>
                        <p className="text-[10px] text-[#9ab0bf] mt-0.5">إدارة المخزون المعروض في السوق</p>
                      </div>
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: 'linear-gradient(135deg, #E3F2FD, #BBDEFB)' }}>
                        <ClipboardList className="w-4 h-4 text-[#1565C0]" />
                      </div>
                      <ChevronLeft className="w-4 h-4 text-[#c0d5e0] flex-shrink-0" />
                    </button>
                  )}
                  {onOpenSupplierDeals && (
                    <button
                      onClick={() => { onClose(); onOpenSupplierDeals(); }}
                      className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-white border border-[#e4f0f5] shadow-sm active:scale-[0.97] transition-all hover:border-[#27AE60]/40 hover:shadow-md"
                    >
                      <div className="flex-1 text-right">
                        <p className="text-[13px] font-bold text-[#1a2f3e]">صفقاتي</p>
                        <p className="text-[10px] text-[#9ab0bf] mt-0.5">تتبع وإدارة صفقات التوريد</p>
                      </div>
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: 'linear-gradient(135deg, #E8F8F0, #d4f0e2)' }}>
                        <Handshake className="w-4 h-4 text-[#27AE60]" />
                      </div>
                      <ChevronLeft className="w-4 h-4 text-[#c0d5e0] flex-shrink-0" />
                    </button>
                  )}
                </div>
              )}

              {/* Buyer orders inline */}
              {(isBuyer || orders.length > 0) && (
                <div className="space-y-2.5" dir="rtl">
                  <div className="flex items-center justify-between px-1">
                    <button
                      onClick={() => { onClose(); onOpenBuyerDeals?.(); }}
                      className="flex items-center gap-1 text-[11px] font-bold text-[#2196F3]"
                    >
                      <span>عرض الصفقات</span>
                      <ChevronLeft className="w-3 h-3" />
                    </button>
                    <div className="flex items-center gap-1.5">
                      <ClipboardList className="w-3.5 h-3.5 text-[#1a4a5e]" />
                      <p className="text-[11px] font-bold text-[#7a9aab]">طلباتي كمشتري</p>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-[#e4f0f5] shadow-sm overflow-hidden">
                    {ordersLoading ? (
                      <div className="space-y-2 p-3">
                        {[1, 2].map((i) => (
                          <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
                        ))}
                      </div>
                    ) : orders.length === 0 ? (
                      <div className="py-8 flex flex-col items-center gap-2">
                        <ShoppingBag className="w-7 h-7 text-gray-300" />
                        <p className="text-[11px] text-[#a0b5c0]">لا توجد طلبات بعد</p>
                        <button
                          onClick={() => { onClose(); }}
                          className="mt-1 px-3 py-1.5 rounded-xl bg-[#2196F3] text-white text-[11px] font-bold flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" />
                          طلب جديد
                        </button>
                      </div>
                    ) : (
                      <div className="divide-y divide-[#f5f9fc]">
                        {orders.slice(0, 5).map((order) => {
                          const cfg = ORDER_STATUS_CONFIG[order.status] ?? ORDER_STATUS_CONFIG.pending;
                          const canEdit = order.status === 'pending' || order.status === 'unmatched';
                          return (
                            <div key={order.id} className="px-4 py-3">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                  {confirmDeleteId === order.id ? (
                                    <div className="flex gap-1">
                                      <button
                                        disabled={deletingId === order.id}
                                        onClick={() => handleDeleteOrder(order.id)}
                                        className="text-[10px] font-bold px-2 py-1 rounded-lg bg-red-500 text-white active:opacity-70 disabled:opacity-40"
                                      >
                                        {deletingId === order.id ? '...' : 'حذف'}
                                      </button>
                                      <button
                                        onClick={() => setConfirmDeleteId(null)}
                                        className="text-[10px] font-bold px-2 py-1 rounded-lg bg-gray-100 text-gray-500 active:opacity-70"
                                      >
                                        إلغاء
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="flex gap-1.5">
                                      {canEdit && (
                                        <button
                                          onClick={() => setEditingOrder(order)}
                                          className="p-1.5 rounded-lg bg-[#EBF5FF] border border-[#BFDBFE] active:scale-90 transition-transform"
                                          title="تعديل"
                                        >
                                          <Pencil className="w-3 h-3 text-[#2196F3]" />
                                        </button>
                                      )}
                                      <button
                                        onClick={() => setConfirmDeleteId(order.id)}
                                        className="p-1.5 rounded-lg bg-red-50 border border-red-100 active:scale-90 transition-transform"
                                        title="حذف"
                                      >
                                        <Trash2 className="w-3 h-3 text-red-400" />
                                      </button>
                                    </div>
                                  )}
                                </div>
                                <div className="text-right flex-1 min-w-0">
                                  <div className="flex items-center justify-end gap-2 mb-0.5">
                                    <span
                                      className="text-[9px] font-bold px-1.5 py-0.5 rounded-md"
                                      style={{ background: cfg.bg, color: cfg.color }}
                                    >
                                      {cfg.label}
                                    </span>
                                    <span className="text-[12px] font-bold text-[#1a4a5e] truncate">
                                      {order.pallet_type} – {order.size}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-end gap-3 flex-wrap">
                                    {order.deal_ref && (
                                      <span className="text-[9px] font-mono font-bold text-[#2196F3] bg-[#EBF5FF] px-1.5 py-0.5 rounded">
                                        {order.deal_ref}
                                      </span>
                                    )}
                                    <span className="text-[10px] text-[#7a9aab]">{order.city}</span>
                                    <span className="text-[10px] text-[#7a9aab]">{order.quantity.toLocaleString('ar-SA')} طبلية</span>
                                  </div>
                                  {order.status === 'matched' && order.matched_quantity && order.matched_price && (
                                    <div className="flex items-center justify-end gap-2 mt-1">
                                      <span className="text-[9px] text-[#27AE60] font-bold">
                                        {order.matched_quantity.toLocaleString('ar-SA')} طبلية @ {order.matched_price} ر.س
                                      </span>
                                    </div>
                                  )}
                                  {order.status === 'matched' && order.deal_ref && (
                                    <div className="mt-1.5 rounded-lg overflow-hidden border" style={{
                                      borderColor: order.deal_status === 'awaiting_buyer' ? '#BFDBFE' : order.deal_status === 'inventory_reserved' || order.deal_status === 'in_delivery' ? '#86EFAC' : '#FDE68A',
                                      background: order.deal_status === 'awaiting_buyer' ? '#EFF6FF' : order.deal_status === 'inventory_reserved' || order.deal_status === 'in_delivery' ? '#F0FDF4' : '#FFFBEB',
                                    }}>
                                      <div className="flex items-center justify-between px-2 py-1.5">
                                        <div className="flex items-center gap-1">
                                          {order.deal_status === 'matched' && (
                                            <>
                                              <div className="w-1 h-1 rounded-full bg-[#F59E0B] animate-pulse" />
                                              <span className="text-[8px] font-bold text-[#92400E]">بانتظار المورد</span>
                                            </>
                                          )}
                                          {order.deal_status === 'awaiting_buyer' && (
                                            <>
                                              <div className="w-1 h-1 rounded-full bg-[#2563eb] animate-pulse" />
                                              <span className="text-[8px] font-bold text-[#1E40AF]">المورد وافق</span>
                                            </>
                                          )}
                                          {(order.deal_status === 'inventory_reserved' || order.deal_status === 'in_delivery') && (
                                            <>
                                              <div className="w-1 h-1 rounded-full bg-[#16a34a]" />
                                              <span className="text-[8px] font-bold text-[#166534]">جارية</span>
                                            </>
                                          )}
                                        </div>
                                        <span className="text-[8px] font-mono text-[#9ab0bf]">{order.deal_ref}</span>
                                      </div>
                                      {(order.deal_status === 'awaiting_buyer' || order.deal_status === 'inventory_reserved' || order.deal_status === 'in_delivery') && (
                                        <button
                                          onClick={(e) => { e.stopPropagation(); onClose(); onOpenBuyerDeals?.(); }}
                                          className="w-full flex items-center justify-center gap-1 py-1.5 text-[9px] font-bold active:opacity-70"
                                          style={{
                                            borderTop: '1px solid',
                                            borderColor: order.deal_status === 'awaiting_buyer' ? '#BFDBFE' : '#BBF7D0',
                                            color: order.deal_status === 'awaiting_buyer' ? '#1E40AF' : '#166534',
                                          }}
                                        >
                                          <Handshake className="w-3 h-3" />
                                          <span>{order.deal_status === 'awaiting_buyer' ? 'أكّد في صفقاتي' : 'تابع في صفقاتي'}</span>
                                        </button>
                                      )}
                                    </div>
                                  )}
                                  {order.status === 'unmatched' && (
                                    <div className="mt-1.5 flex items-center gap-1.5 justify-end">
                                      <span className="text-[9px] text-[#0369A1] font-bold">يتتبع المخزون تلقائياً</span>
                                      <Radar className="w-3 h-3 text-[#0369A1] animate-pulse" />
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        {orders.length > 5 && (
                          <button
                            onClick={() => { onClose(); onOpenBuyerDeals?.(); }}
                            className="w-full py-3 text-center text-[11px] font-bold text-[#2196F3] hover:bg-[#f0f8ff] transition-colors"
                          >
                            عرض جميع الطلبات ({orders.length})
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Explore platform */}
              <div dir="rtl">
                <p className="text-[11px] font-bold text-[#7a9aab] px-1 mb-2">استكشاف</p>
                <button
                  onClick={handleExplore}
                  className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-white border border-[#e8f0f5] shadow-sm hover:shadow-md hover:border-[#1a4a5e]/20 active:scale-[0.98] transition-all"
                >
                  <div className="flex-1 text-right">
                    <p className="text-[13px] font-bold text-[#1a2f3e]">استكشف المنصة</p>
                    <p className="text-[10px] text-[#9ab0bf] mt-0.5">تصفح الفرص والسوق</p>
                  </div>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, #e8f0f5, #d8e8f2)' }}>
                    <LayoutDashboard className="w-4 h-4 text-[#1a4a5e]" />
                  </div>
                  <ChevronLeft className="w-4 h-4 text-[#c0d5e0] flex-shrink-0" />
                </button>
              </div>

              {/* Logout button - prominent */}
              <div dir="rtl" className="pt-2">
                <p className="text-[11px] font-bold text-[#7a9aab] px-1 mb-2">الجلسة</p>
                {!showLogoutConfirm ? (
                  <button
                    onClick={() => setShowLogoutConfirm(true)}
                    className="w-full flex items-center gap-3 px-4 py-4 rounded-2xl border-2 transition-all active:scale-[0.98] hover:shadow-md"
                    style={{ background: '#FEF2F2', borderColor: '#FCA5A5', color: '#DC2626' }}
                  >
                    <LogOut className="w-5 h-5 flex-shrink-0" />
                    <div className="flex-1 text-right">
                      <p className="text-[14px] font-bold">تسجيل الخروج</p>
                      <p className="text-[10px] opacity-60 mt-0.5">إنهاء الجلسة الحالية</p>
                    </div>
                    <ChevronLeft className="w-4 h-4 opacity-40" style={{ transform: 'rotate(180deg)' }} />
                  </button>
                ) : (
                  <div
                    className="w-full rounded-2xl border-2 overflow-hidden"
                    style={{ background: '#FEF2F2', borderColor: '#FCA5A5' }}
                  >
                    <div className="flex items-center gap-3 px-4 py-3.5 border-b border-red-100" dir="rtl">
                      <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
                      <div className="flex-1 text-right">
                        <p className="text-[13px] font-bold text-red-700">تأكيد تسجيل الخروج</p>
                        <p className="text-[10px] text-red-400 mt-0.5">هل أنت متأكد من إنهاء الجلسة؟</p>
                      </div>
                    </div>
                    <div className="flex gap-2 p-3">
                      <button
                        onClick={onLogout}
                        className="flex-1 py-2.5 rounded-xl text-[13px] font-bold text-white transition-all active:scale-[0.97]"
                        style={{ background: 'linear-gradient(135deg, #DC2626, #b91c1c)' }}
                      >
                        نعم، خروج
                      </button>
                      <button
                        onClick={() => setShowLogoutConfirm(false)}
                        className="flex-1 py-2.5 rounded-xl text-[13px] font-bold transition-all active:scale-[0.97]"
                        style={{ background: '#fff', color: '#64748b', border: '1px solid #e2e8f0' }}
                      >
                        إلغاء
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── PROFILE / SETTINGS TAB ── */}
          {activeTab === 'profile' && (
            <>
              <div className="bg-white rounded-2xl border border-[#e8f0f5] shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-[#f0f6fa]" dir="rtl">
                  <h4 className="text-[13px] font-bold text-[#1a4a5e]">معلومات الحساب</h4>
                  {editing ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleCancel}
                        className="w-7 h-7 rounded-lg flex items-center justify-center bg-[#fef2f2] border border-red-100"
                      >
                        <X className="w-3.5 h-3.5 text-red-500" />
                      </button>
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold text-white transition-all disabled:opacity-60"
                        style={{ background: 'linear-gradient(135deg, #27AE60, #1e9652)' }}
                      >
                        {saving
                          ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          : <Check className="w-3 h-3" />
                        }
                        حفظ
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setEditing(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold"
                      style={{ background: '#EBF5FF', color: '#2196F3' }}
                    >
                      <Pencil className="w-3 h-3" />
                      تعديل
                    </button>
                  )}
                </div>

                <div className="divide-y divide-[#f5f9fc]">
                  <EditableField
                    label={isCompany ? 'اسم المسؤول' : 'الاسم الكامل'}
                    value={displayName}
                    placeholder="أدخل اسمك"
                    icon={<User className="w-4 h-4" />}
                    iconBg="#EBF5FF"
                    iconColor="#2196F3"
                    editing={editing}
                    onChange={setDisplayName}
                  />

                  {isCompany && (
                    <EditableField
                      label="اسم الشركة / المنشأة"
                      value={companyName}
                      placeholder="اسم الشركة"
                      icon={<Building2 className="w-4 h-4" />}
                      iconBg="#EBF5FF"
                      iconColor="#2196F3"
                      editing={editing}
                      onChange={setCompanyName}
                    />
                  )}

                  <div className="flex items-center gap-3 px-4 py-3.5" dir="rtl">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#E8F8F0' }}>
                      <Phone className="w-4 h-4 text-[#27AE60]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-[#9ab0bf] mb-0.5">رقم الجوال</p>
                      <p className="text-[13px] font-semibold text-[#1a2f3e] font-mono">{session.profile.phone}</p>
                    </div>
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#E8F8F0] text-[#27AE60]">مؤكد</span>
                  </div>

                  <EditableField
                    label="المدينة"
                    value={city}
                    placeholder="اختر المدينة"
                    icon={<MapPin className="w-4 h-4" />}
                    iconBg="#FFF8E1"
                    iconColor="#F59E0B"
                    editing={editing}
                    onChange={setCity}
                    options={SAUDI_CITIES}
                  />

                  <EditableField
                    label="نوع النشاط التجاري"
                    value={activityType}
                    placeholder="اختر النشاط"
                    icon={<Briefcase className="w-4 h-4" />}
                    iconBg="#F0F4F8"
                    iconColor="#4a7a94"
                    editing={editing}
                    onChange={setActivityType}
                    options={ACTIVITY_TYPES}
                  />
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-[#e8f0f5] shadow-sm overflow-hidden" dir="rtl">
                <button className="w-full flex items-center gap-3 px-4 py-3.5 border-b border-[#f5f9fc] hover:bg-[#f8fbfd] transition-colors active:bg-[#f0f6fa]">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#FFF8E1' }}>
                    <Bell className="w-4 h-4 text-[#F59E0B]" />
                  </div>
                  <div className="flex-1 text-right">
                    <p className="text-[13px] font-semibold text-[#1a2f3e]">الإشعارات والتنبيهات</p>
                    <p className="text-[10px] text-[#9ab0bf]">إدارة تفضيلات الإشعارات</p>
                  </div>
                  <ChevronLeft className="w-4 h-4 text-[#c0d5e0] flex-shrink-0" />
                </button>
                <button className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-[#f8fbfd] transition-colors active:bg-[#f0f6fa]">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#F0F4F8' }}>
                    <Shield className="w-4 h-4 text-[#4a7a94]" />
                  </div>
                  <div className="flex-1 text-right">
                    <p className="text-[13px] font-semibold text-[#1a2f3e]">الشروط والخصوصية</p>
                    <p className="text-[10px] text-[#9ab0bf]">سياسة الاستخدام والبيانات</p>
                  </div>
                  <ChevronLeft className="w-4 h-4 text-[#c0d5e0] flex-shrink-0" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {editingOrder && (
        <OrderEditSheet
          order={editingOrder}
          onClose={() => setEditingOrder(null)}
          onSave={async (data) => { await updateOrder(editingOrder.id, data); refreshOrders(); }}
        />
      )}
    </div>
  );
}
